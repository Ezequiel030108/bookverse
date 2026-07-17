/* ============================================================
   BOOKVERSE — API: IMAGEM DO LIVRO COMO ARQUIVO DE VERDADE
   ------------------------------------------------------------
   Livros cadastrados pelo painel admin guardam a foto EMBUTIDA
   no banco (formato "data:image/...;base64,..."). O Google
   Shopping (e qualquer site externo) não consegue usar esse
   formato como endereço de imagem — precisa de uma URL que
   devolva a foto como um arquivo .jpg/.png normal.

   Este endpoint faz exatamente isso:
     GET /api/img-livro?id=<id-do-livro>
   → devolve a foto daquele livro como imagem de verdade.

   Assim, no feed do Google Shopping, o image_link desses livros
   aponta para cá e a foto é aceita normalmente.
   ============================================================ */

const { acharLivro, baseDoRequest } = require("./_catalogo");

module.exports = async (req, res) => {
  const base = baseDoRequest(req);
  const id = String((req.query && req.query.id) || "").slice(0, 120);
  if (!id) {
    res.status(400).json({ error: "id é obrigatório." });
    return;
  }

  let livro = null;
  try { livro = await acharLivro(base, id); } catch (e) { /* segue como não achado */ }

  const src = livro ? String(livro.imagem || "").trim() : "";
  if (!src) {
    res.status(404).json({ error: "Livro sem imagem." });
    return;
  }

  // Foto embutida (data:image/...;base64,...): decodifica e devolve os bytes.
  const m = src.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (m) {
    let buf;
    try { buf = Buffer.from(m[2], "base64"); } catch (e) { buf = null; }
    if (!buf || !buf.length) {
      res.status(404).json({ error: "Imagem inválida." });
      return;
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", m[1]);
    // A foto de um livro praticamente não muda: cache generoso alivia o
    // servidor e faz o Google buscar menos vezes.
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
    res.end(buf);
    return;
  }

  // Já é um endereço/arquivo: apenas redireciona para a foto de verdade.
  const destino = /^https?:\/\//i.test(src) ? src : base + "/" + src.replace(/^\/+/, "");
  res.statusCode = 302;
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("Location", destino);
  res.end();
};
