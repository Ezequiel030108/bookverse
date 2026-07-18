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

/* O Google limita o atributo "id" do produto a 50 caracteres. O id do
   site (titulo-autor) às vezes passa disso. Esta função encurta APENAS
   o id que vai no feed, de forma:
     • estável  -> o mesmo livro gera sempre o mesmo id (o Google não
                   trata como "produto novo" a cada busca);
     • única    -> ids longos diferentes não colidem (guardamos um
                   "resumo"/hash curto do id completo no fim).
   O LINK do livro continua usando o id COMPLETO, então o clique abre o
   livro certo na loja. */
const LIMITE_ID_GOOGLE = 50;

function hashCurto(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);   // ~6-7 caracteres [0-9a-z]
}

function idParaFeed(id) {
  if (id.length <= LIMITE_ID_GOOGLE) return id;   // curto: mantém como está
  const sufixo = "-" + hashCurto(id);
  return id.slice(0, LIMITE_ID_GOOGLE - sufixo.length) + sufixo;
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

/* Monta a URL da imagem do livro para o Google (que exige um ENDEREÇO de
   imagem, não a imagem embutida).
   - "img/x.jpg"          -> https://site/img/x.jpg
   - "https://.../x.jpg"  -> usada como está
   - "data:image/...base64" (livro cadastrado pelo painel admin, com a foto
     embutida) -> https://site/api/img-livro?id=<id>, um endereço que devolve
     essa mesma foto como arquivo de imagem (o Google não aceita data URL).
   - vazia                -> null (livro sem foto não entra no feed). */
function linkImagem(livro, id, base) {
  const src = String(livro.imagem || "").trim();
  if (!src) return null;
  if (/^data:image\//i.test(src)) return base + "/api/img-livro?id=" + encodeURIComponent(id);
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

    const id = idLivro(livro);
    const idFeed = idParaFeed(id);   // <= 50 caracteres, exigência do Google
    const link = base + "/?livro=" + encodeURIComponent(id);   // link usa o id COMPLETO

    // Google exige um endereço de imagem; sem foto nenhuma, o livro não vai.
    const imagem = linkImagem(livro, id, base);
    if (!imagem) return;
    const titulo = livro.autor ? `${livro.titulo}, de ${livro.autor}` : livro.titulo;
    const descricao = (livro.sinopse || `${livro.titulo}${livro.autor ? " — " + livro.autor : ""}. Disponível na BookVerse.`).slice(0, 4900);
    const promocional = precoPromocional(livro, preco, promo);

    let item =
      "  <item>\n" +
      `    <g:id>${escXml(idFeed)}</g:id>\n` +
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
  // Cache curto (5 min): o Google busca o feed poucas vezes por dia, mas um
  // cache curto faz um livro recém-cadastrado aparecer quase na hora (e evita
  // aquela confusão de "publiquei mas ainda mostra o antigo").
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.end(xml);
};
