/* ============================================================
   BOOKVERSE — API: IMAGEM DE COMPARTILHAMENTO DE UM LIVRO
   ------------------------------------------------------------
   Gera a imagem que aparece na prévia do link (WhatsApp etc.):
   a MOLDURA da BookVerse (céu roxo, estrelas, meteoro e a marca)
   com a FOTO DO LIVRO encaixada no meio.

   - A moldura fica em img/og-moldura.jpg (1200×630).
   - A foto vem da capa estática (img/...) ou da foto em base64
     dos livros cadastrados pelo painel do admin (Firestore).
   - Se algo falhar, devolve a foto crua (sem moldura) — a prévia
     continua funcionando.
   ============================================================ */

const { acharLivro, baseDoRequest } = require("./_catalogo");
const jpeg = require("jpeg-js");

/* Posição da "janela" da capa dentro da moldura (definida no design). */
const SLOT = { x: 427, y: 55, w: 347, h: 520, raio: 14 };

let molduraCache = null;   // decodificada uma vez por instância

async function obterMoldura(base) {
  if (molduraCache) return molduraCache;
  const r = await fetch(base + "/img/og-moldura.jpg");
  if (!r.ok) throw new Error("moldura-indisponivel");
  const buf = Buffer.from(await r.arrayBuffer());
  molduraCache = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 128 });
  return molduraCache;
}

/* Bytes JPEG da foto do livro (estática ou base64 do admin). */
async function obterFotoBytes(base, img) {
  if (/^img\/.*\.jpe?g$/i.test(img)) {
    const r = await fetch(base + "/" + img.split("/").map(encodeURIComponent).join("/"));
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  }
  const m = img.match(/^data:image\/jpe?g;base64,(.+)$/i);
  if (m) return Buffer.from(m[1], "base64");
  return null;
}

/* O ponto (x,y) do slot está dentro dos cantos arredondados? */
function dentroDoRaio(x, y) {
  const r = SLOT.raio;
  const dx = x < r ? r - x : (x >= SLOT.w - r ? x - (SLOT.w - r - 1) : 0);
  const dy = y < r ? r - y : (y >= SLOT.h - r ? y - (SLOT.h - r - 1) : 0);
  if (!dx || !dy) return true;
  return dx * dx + dy * dy <= r * r;
}

/* Cola a foto no slot da moldura (preenche o slot, com corte central
   e reamostragem bilinear) e devolve o JPEG final. */
function compor(moldura, foto) {
  const out = Buffer.from(moldura.data);          // RGBA da moldura
  const W = moldura.width;
  const sw = foto.width, sh = foto.height;
  const escala = Math.max(SLOT.w / sw, SLOT.h / sh);
  const cw = SLOT.w / escala, ch = SLOT.h / escala;
  const cx0 = (sw - cw) / 2, cy0 = (sh - ch) / 2;

  for (let y = 0; y < SLOT.h; y++) {
    for (let x = 0; x < SLOT.w; x++) {
      if (!dentroDoRaio(x, y)) continue;          // cantos: moldura aparece
      // bilinear
      let sx = cx0 + (x + 0.5) / escala - 0.5;
      let sy = cy0 + (y + 0.5) / escala - 0.5;
      if (sx < 0) sx = 0; if (sy < 0) sy = 0;
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, sw - 1), y1 = Math.min(y0 + 1, sh - 1);
      const fx = sx - x0, fy = sy - y0;
      const p00 = (y0 * sw + x0) * 4, p10 = (y0 * sw + x1) * 4;
      const p01 = (y1 * sw + x0) * 4, p11 = (y1 * sw + x1) * 4;
      const di = ((SLOT.y + y) * W + (SLOT.x + x)) * 4;
      for (let c = 0; c < 3; c++) {
        const topo  = foto.data[p00 + c] * (1 - fx) + foto.data[p10 + c] * fx;
        const baixo = foto.data[p01 + c] * (1 - fx) + foto.data[p11 + c] * fx;
        out[di + c] = Math.round(topo * (1 - fy) + baixo * fy);
      }
      out[di + 3] = 255;
    }
  }
  return jpeg.encode({ data: out, width: W, height: moldura.height }, 85).data;
}

module.exports = async (req, res) => {
  const base = baseDoRequest(req);
  const id = String((req.query && req.query.id) || "").slice(0, 120);

  let livro = null;
  try { livro = await acharLivro(base, id); } catch (e) {}
  const img = String((livro && livro.imagem) || "");

  // Com moldura: foto do livro encaixada no design da BookVerse.
  try {
    const bytes = await obterFotoBytes(base, img);
    if (bytes) {
      const [moldura, foto] = [await obterMoldura(base), jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 128 })];
      const saida = compor(moldura, foto);
      res.statusCode = 200;
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
      res.end(saida);
      return;
    }
  } catch (e) { /* cai nos planos B abaixo */ }

  // Plano B: foto crua (sem moldura).
  if (/^img\//.test(img)) {
    res.statusCode = 302;
    res.setHeader("Location", "/" + img.split("/").map(encodeURIComponent).join("/"));
    res.end();
    return;
  }
  const m = img.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  if (m) {
    try {
      const buf = Buffer.from(m[2], "base64");
      res.statusCode = 200;
      res.setHeader("Content-Type", m[1]);
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
      res.end(buf);
      return;
    } catch (e) {}
  }

  // Último recurso: a logo.
  res.statusCode = 302;
  res.setHeader("Location", "/img/logo.png");
  res.end();
};
