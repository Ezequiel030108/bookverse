/* ============================================================
   BOOKVERSE — API: PÁGINA DE COMPARTILHAMENTO DE UM LIVRO
   ------------------------------------------------------------
   O link compartilhado de um livro (bookverse.com.br/livro/<id>)
   cai aqui. Esta página existe só para o WhatsApp/Instagram
   mostrarem a CAPA DO LIVRO, o título e a sinopse na prévia do
   link — visitantes de verdade são redirecionados na hora para
   a loja, já com o livro aberto.
   ============================================================ */

const { acharLivro, idLivro, baseDoRequest } = require("./_catalogo");

function escHtml(t) {
  return String(t == null ? "" : t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* Robôs de prévia de link (WhatsApp, Instagram/Facebook, Telegram etc.).
   Só eles precisam da página com capa e título; gente de verdade não. */
const ROBO_DE_PREVIA =
  /whatsapp|facebookexternalhit|facebot|instagram|twitterbot|telegrambot|discordbot|slackbot|linkedinbot|pinterest|skypeuripreview|snapchat|viber|googlebot|bingbot|applebot|bot\b|crawler|spider|preview/i;

module.exports = async (req, res) => {
  const base = baseDoRequest(req);
  const id = String((req.query && req.query.id) || "").slice(0, 120);
  const urlLoja = "/?livro=" + encodeURIComponent(id);

  if (!id) {
    res.statusCode = 302;
    res.setHeader("Location", "/");
    res.end();
    return;
  }

  // Visitante de verdade: redireciona NA HORA para a loja com o livro
  // aberto, sem esperar nenhuma consulta ao catálogo. A loja mesma
  // resolve o id (inclusive de livros recém-cadastrados pelo admin).
  const ua = String(req.headers["user-agent"] || "");
  if (!ROBO_DE_PREVIA.test(ua)) {
    res.statusCode = 302;
    // "private": o CDN não pode guardar este redirecionamento, senão os
    // robôs deixariam de receber a página de prévia com a capa.
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    res.setHeader("Location", urlLoja);
    res.end();
    return;
  }

  let livro = null;
  try { livro = await acharLivro(base, id); } catch (e) {}

  // Imagem da prévia: a MOLDURA da BookVerse com a foto do livro no
  // meio (gerada por /api/capa). Sem foto (ou livro não achado), a logo.
  const img = String((livro && livro.imagem) || "");
  const ogImage = img
    ? base + "/api/capa?id=" + encodeURIComponent(id)
    : base + "/img/logo.png";

  // Livro não achado (catálogo fora do ar ou recém-cadastrado): a prévia
  // sai genérica da loja, mas o link continua levando ao livro certo.
  const titulo = livro
    ? `${livro.titulo || "Livro"}, de ${livro.autor || "BookVerse"}`
    : "BookVerse";
  const desc = (livro
    ? (livro.sinopse || `Disponível na BookVerse por ${livro.preco || "um precinho especial"}.`)
    : "Livraria em Juazeirinho com entrega. Pague com Pix direto pelo site.").slice(0, 220);

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Cache no CDN: prévias de link são pedidas várias vezes seguidas.
  // Prévia genérica guarda pouco tempo: o livro pode aparecer já já.
  res.setHeader("Cache-Control", livro
    ? "public, s-maxage=600, stale-while-revalidate=3600"
    : "public, s-maxage=60");
  res.end(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(titulo)} · BookVerse</title>
  <meta name="description" content="${escHtml(desc)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="BookVerse">
  <meta property="og:title" content="${escHtml(titulo)}">
  <meta property="og:description" content="${escHtml(desc)}">
  <meta property="og:image" content="${escHtml(ogImage)}">
  <meta property="og:url" content="${escHtml(base + "/livro/" + encodeURIComponent(livro ? idLivro(livro) : id))}">
  <meta property="og:locale" content="pt_BR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="robots" content="noindex">
  <meta http-equiv="refresh" content="0;url=${escHtml(urlLoja)}">
  <script>location.replace(${JSON.stringify(urlLoja)});</script>
</head>
<body>
  <p>Abrindo <strong>${escHtml((livro && livro.titulo) || "o livro")}</strong> na BookVerse…
     <a href="${escHtml(urlLoja)}">Toque aqui se não abrir sozinho</a>.</p>
</body>
</html>`);
};
