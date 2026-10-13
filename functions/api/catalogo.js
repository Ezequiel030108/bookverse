/* ============================================================
   BOOKVERSE — API: CATÁLOGO LEVE PARA A VITRINE
   ------------------------------------------------------------
   Os livros cadastrados pelo painel guardam a foto DENTRO do banco
   (base64). Antes, toda visita baixava o catálogo inteiro do
   Firestore com as fotos dentro: ~2 MB, antes de mostrar a maior
   parte da estante (e isso ainda ia parar no armazenamento do
   navegador).

   Aqui sai o mesmo catálogo SEM as fotos (~50 KB): cada foto vira
   um endereço /api/img-livro?id=...&v=<impressão digital da foto>,
   que o navegador só baixa quando o livro aparece na tela e que
   fica guardado no CDN. Trocou a foto no painel? A impressão
   digital muda, o endereço muda e ninguém vê a foto velha.

     GET /api/catalogo  →  { livros: [ ...livros do painel... ] }

   Fica em cache por 1 minuto (no servidor e no CDN): um livro novo
   do painel aparece na loja em até 1 minuto.
   ============================================================ */

const crypto = require("crypto");
const zlib = require("zlib");
const { aplicarHeaders } = require("./_seguranca");
const { livrosDoAdmin } = require("./_catalogo");

const TEMPO_CACHE = 60 * 1000;
let cache = { t: 0, livros: null, comprimido: null };

/* A resposta já comprimida (brotli e gzip), feita UMA vez por minuto,
   junto com o cache — não a cada visita. 62 KB viram ~20 KB. */
function comprimir(livros) {
  const json = Buffer.from(JSON.stringify({ livros }));
  return {
    br: zlib.brotliCompressSync(json, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } }),
    gzip: zlib.gzipSync(json, { level: 9 })
  };
}

/* Impressão digital da foto: muda sempre que a foto muda. */
function impressaoDigital(foto) {
  return crypto.createHash("sha1").update(String(foto)).digest("hex").slice(0, 12);
}

function semFotoEmbutida(livro) {
  const out = Object.assign({}, livro);
  const img = String(livro.imagem || "");
  if (/^data:image\//i.test(img)) {
    const v = impressaoDigital(img);
    out.imagem = "/api/img-livro?id=" + encodeURIComponent(livro.id) + "&v=" + v;
    out.fotoHash = v;   // a vitrine usa para achar cadastros repetidos
  }
  return out;
}

module.exports = async (req, res) => {
  aplicarHeaders(res);
  if (req.method !== "GET") { res.status(405).json({ error: "Método não permitido." }); return; }

  if (!cache.livros || Date.now() - cache.t > TEMPO_CACHE) {
    const lista = await livrosDoAdmin();
    if (lista) {
      const livros = lista.map(semFotoEmbutida);
      cache = { t: Date.now(), livros, comprimido: comprimir(livros) };
    }
  }
  if (!cache.livros) {
    // Sem resposta do banco: a vitrine cai no caminho antigo sozinha.
    res.status(503).json({ error: "Catálogo indisponível agora." });
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
  res.setHeader("Vary", "Accept-Encoding");
  const aceita = String((req.headers && req.headers["accept-encoding"]) || "");
  const tipo = /\bbr\b/.test(aceita) ? "br" : (/\bgzip\b/.test(aceita) ? "gzip" : "");
  if (!tipo) { res.status(200).json({ livros: cache.livros }); return; }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Encoding", tipo);
  res.status(200).end(cache.comprimido[tipo]);
};

module.exports.impressaoDigital = impressaoDigital;
