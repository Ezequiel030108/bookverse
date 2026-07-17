/* ============================================================
   BOOKVERSE — FEED DE PRODUTOS PARA O GOOGLE SHOPPING
   ------------------------------------------------------------
   O Google Shopping (Google Merchant Center) não lê a vitrine
   como um cliente: ele precisa de uma LISTA pronta dos produtos,
   num formato próprio (XML). Este arquivo gera essa lista na
   hora, a partir do MESMO catálogo do site:
     • os livros do js/livros.js;
     • + os livros que você adiciona pelo painel admin.

   Por ser gerado sempre na hora, TODO livro novo que você
   cadastrar entra no feed sozinho — e, na próxima vez que o
   Google buscar o feed (uma vez por dia, configurável no
   Merchant Center), ele aparece no Google Shopping. Você não
   precisa mexer aqui nunca.

   Endereço do feed (é o que você cola no Merchant Center):
     https://www.bookverse.com.br/feed.xml

   Para conferir o resultado, é só abrir esse endereço no
   navegador — deve aparecer o XML com todos os livros à venda.
   ============================================================ */

const { carregarLivros, idLivro, baseDoRequest, promocaoAtual } = require("./_catalogo");

/* Escapa os caracteres que quebram um XML (&, <, >, aspas). */
function escXml(t) {
  return String(t == null ? "" : t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/* "R$ 45,00" -> 45 (número). Retorna null se não der para ler. */
function precoNumerico(precoTexto) {
  const n = parseFloat(String(precoTexto).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

/* A promoção está ligada AGORA? (mesma regra do site, mas sem o
   ?promo=teste — o feed é para clientes de verdade). */
function promoAtiva(promo) {
  if (!promo || !promo.inicio || !promo.fim) return false;
  const agora = new Date();
  return (
    agora >= new Date(promo.inicio + "T00:00:00") &&
    agora <= new Date(promo.fim + "T23:59:59")
  );
}

/* Preço promocional de um livro (levando 1 unidade), respeitando o
   descontoMaximo de cada livro. Devolve null se não houver promoção. */
function precoPromocional(livro, base, promo) {
  if (!promoAtiva(promo)) return null;
  const teto = livro.descontoMaximo || 100;
  const pct = Math.min(promo.descontoUm || 0, teto);
  if (!pct) return null;
  const comDesconto = Math.ceil(base * (1 - pct / 100) - 0.5);  // arredonda a favor do cliente
  return comDesconto < base ? comDesconto : null;
}

/* Monta a URL absoluta da imagem do livro.
   - "img/x.jpg"        -> https://site/img/x.jpg
   - "https://.../x.jpg" -> usada como está
   - vazia / data:...    -> null (Google exige uma URL de imagem real) */
function imagemAbsoluta(imagem, base) {
  const src = String(imagem || "").trim();
  if (!src || /^data:/i.test(src)) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return base + "/" + src.replace(/^\/+/, "");
}

/* Condição do produto no padrão do Google: "new" ou "used".
   A loja é de usados; só marca "new" quando o livro diz que é novo. */
function condicaoGoogle(livro) {
  if (livro.condicao === "novo") return "new";
  if (livro.condicao === "usado") return "used";
  if (/\bnovo\b/i.test(String(livro.estado || ""))) return "new";
  return "used";
}

module.exports = async (req, res) => {
  const base = baseDoRequest(req);

  let lista = [];
  try { lista = await carregarLivros(base); } catch (e) { lista = []; }
  const promo = promocaoAtual();

  const itens = [];
  (lista || []).forEach(livro => {
    if (!livro || !livro.titulo) return;

    // Fora do feed: sem estoque (o site também some com ele) e sem preço.
    const estoque = Number(livro.estoque);
    if (!(estoque > 0)) return;
    const preco = precoNumerico(livro.preco);
    if (preco === null || preco <= 0) return;

    // Google exige uma imagem de verdade; sem ela, o livro não vai.
    const imagem = imagemAbsoluta(livro.imagem, base);
    if (!imagem) return;

    const id = idLivro(livro);
    const link = base + "/?livro=" + encodeURIComponent(id);
    const titulo = livro.autor ? `${livro.titulo}, de ${livro.autor}` : livro.titulo;
    const descricao = (livro.sinopse || `${livro.titulo}${livro.autor ? " — " + livro.autor : ""}. Disponível na BookVerse.`).slice(0, 4900);
    const promocional = precoPromocional(livro, preco, promo);

    let item =
      "  <item>\n" +
      `    <g:id>${escXml(id)}</g:id>\n` +
      `    <g:title>${escXml(titulo)}</g:title>\n` +
      `    <g:description>${escXml(descricao)}</g:description>\n` +
      `    <g:link>${escXml(link)}</g:link>\n` +
      `    <g:image_link>${escXml(imagem)}</g:image_link>\n` +
      `    <g:availability>in_stock</g:availability>\n` +
      `    <g:price>${preco.toFixed(2)} BRL</g:price>\n` +
      (promocional !== null ? `    <g:sale_price>${promocional.toFixed(2)} BRL</g:sale_price>\n` : "") +
      `    <g:condition>${condicaoGoogle(livro)}</g:condition>\n` +
      `    <g:google_product_category>784</g:google_product_category>\n` +   // Media > Books
      `    <g:product_type>${escXml("Livros" + (livro.genero ? " > " + livro.genero : ""))}</g:product_type>\n` +
      (livro.autor ? `    <g:brand>${escXml(livro.autor)}</g:brand>\n` : "") +
      // Livro usado normalmente não tem código de barras (ISBN/GTIN):
      // avisamos o Google que não existe, senão ele reprova o item.
      `    <g:identifier_exists>no</g:identifier_exists>\n` +
      "  </item>";
    itens.push(item);
  });

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
    "<channel>\n" +
    "  <title>BookVerse</title>\n" +
    `  <link>${escXml(base + "/")}</link>\n` +
    "  <description>Livraria em Juazeirinho com entrega. Clássicos, mangás, filosofia e mais — pague com Pix direto pelo site.</description>\n" +
    itens.join("\n") +
    "\n</channel>\n</rss>\n";

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  // O Google busca o feed poucas vezes por dia; guardar 1h no CDN
  // alivia o servidor sem atrasar a chegada de livros novos.
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.end(xml);
};
