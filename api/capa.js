/* ============================================================
   BOOKVERSE — API: CAPA DE UM LIVRO (para a prévia do link)
   ------------------------------------------------------------
   Livros cadastrados pelo painel do admin guardam a foto em
   base64 (dentro do Firestore) — e o WhatsApp não entende isso
   na prévia do link. Este endpoint devolve a foto como uma
   imagem de verdade. Capas estáticas apenas redirecionam.
   ============================================================ */

const { acharLivro, baseDoRequest } = require("./_catalogo");

module.exports = async (req, res) => {
  const base = baseDoRequest(req);
  const id = String((req.query && req.query.id) || "").slice(0, 120);

  let livro = null;
  try { livro = await acharLivro(base, id); } catch (e) {}
  const img = String((livro && livro.imagem) || "");

  // Capa estática: só redireciona para o arquivo.
  if (/^img\//.test(img)) {
    res.statusCode = 302;
    res.setHeader("Location", "/" + img.split("/").map(encodeURIComponent).join("/"));
    res.end();
    return;
  }

  // Capa em base64 (cadastrada pelo admin): devolve como imagem.
  const m = img.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  if (m) {
    try {
      const buf = Buffer.from(m[2], "base64");
      res.statusCode = 200;
      res.setHeader("Content-Type", m[1]);
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
      res.end(buf);
      return;
    } catch (e) { /* cai no fallback */ }
  }

  // Sem capa: usa a logo.
  res.statusCode = 302;
  res.setHeader("Location", "/img/logo.png");
  res.end();
};
