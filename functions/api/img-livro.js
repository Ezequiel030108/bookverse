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
   aponta para cá e a foto é aceita normalmente. A VITRINE também
   mostra as fotos por aqui (veja api/catalogo.js): o navegador só
   baixa a foto do livro que aparece na tela, e ela fica no CDN.
   ============================================================ */

const { acharLivro, livroDoAdmin } = require("./_catalogo");
const { impressaoDigital } = require("./catalogo");

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || "").slice(0, 150);
  if (!id) {
    res.status(400).json({ error: "id é obrigatório." });
    return;
  }

  // Primeiro o livro do painel, lido sozinho (rápido e sempre atual —
  // um livro recém-cadastrado já tem foto). Depois, os do js/livros.js.
  let livro = await livroDoAdmin(id);
  if (!livro || !livro.imagem) {
    try { livro = await acharLivro(id); } catch (e) { livro = null; }
  }

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
    // Endereço com a impressão digital da foto ATUAL (?v=, vindo de
    // /api/catalogo): esta foto nunca muda neste endereço — o navegador e
    // o CDN guardam por 1 ano. Sem ela (o feed do Google, links antigos),
    // 1 dia, como antes.
    const versaoCerta = String(req.query.v || "") === impressaoDigital(src);
    res.setHeader("Cache-Control", versaoCerta
      ? "public, max-age=31536000, s-maxage=31536000, immutable"
      : "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
    res.end(buf);
    return;
  }

  // Já é um endereço/arquivo: apenas redireciona para a foto de verdade.
  // Arquivo do próprio site vira caminho relativo (/img/...): o navegador
  // fica no mesmo domínio em que já está.
  const destino = /^https?:\/\//i.test(src) ? src : "/" + src.replace(/^\/+/, "");
  res.statusCode = 302;
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("Location", destino);
  res.end();
};
