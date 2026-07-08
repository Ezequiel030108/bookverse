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

module.exports = async (req, res) => {
  const base = baseDoRequest(req);
  const id = String((req.query && req.query.id) || "").slice(0, 120);

  let livro = null;
  try { livro = await acharLivro(base, id); } catch (e) {}

  if (!livro) {
    res.statusCode = 302;
    res.setHeader("Location", "/");
    res.end();
    return;
  }

  const urlLoja = "/?livro=" + encodeURIComponent(id);

  // Imagem da prévia: a MOLDURA da BookVerse com a foto do livro no
  // meio (gerada por /api/capa). Sem foto, vai a logo.
  const img = String(livro.imagem || "");
  const ogImage = img
    ? base + "/api/capa?id=" + encodeURIComponent(id)
    : base + "/img/logo.png";

  const titulo = `${livro.titulo || "Livro"} — ${livro.autor || "BookVerse"}`;
  const desc = (livro.sinopse || `Disponível na BookVerse por ${livro.preco || "um precinho especial"}.`).slice(0, 220);

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Cache no CDN: prévias de link são pedidas várias vezes seguidas.
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
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
  <meta property="og:url" content="${escHtml(base + "/livro/" + encodeURIComponent(idLivro(livro)))}">
  <meta property="og:locale" content="pt_BR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="robots" content="noindex">
  <meta http-equiv="refresh" content="0;url=${escHtml(urlLoja)}">
  <script>location.replace(${JSON.stringify(urlLoja)});</script>
</head>
<body>
  <p>Abrindo <strong>${escHtml(livro.titulo || "o livro")}</strong> na BookVerse…
     <a href="${escHtml(urlLoja)}">Toque aqui se não abrir sozinho</a>.</p>
</body>
</html>`);
};
