/* ============================================================
   BOOKVERSE — Catálogo no servidor (para compartilhamento)
   ------------------------------------------------------------
   O WhatsApp/Instagram leem o título e a imagem de um link SEM
   executar JavaScript. Então, para o link de um livro mostrar a
   capa dele, o servidor precisa conhecer o catálogo:
     1. js/livros.js do próprio site publicado;
     2. + livros/edições do admin (coleção "catalogo", leitura
        pública no Firestore).
   Arquivos com "_" não viram rotas (functions/index.js).
   ============================================================ */

const PROJETO = process.env.FIREBASE_PROJECT_ID || "bookverse-69878";

function slug(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function idLivro(l) {
  return (l && l.id) || slug(((l && l.titulo) || "") + "-" + ((l && l.autor) || ""));
}

/* Converte um documento do Firestore (REST) num objeto simples. */
function converterDoc(doc) {
  const f = (doc && doc.fields) || {};
  const out = { id: String(doc.name || "").split("/").pop() };
  Object.keys(f).forEach(k => {
    const v = f[k] || {};
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) out[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
  });
  return out;
}

let cache = { t: 0, lista: [] };

/* Lista completa de livros (estáticos + admin), com cache de 5 min. */
async function carregarLivros(base) {
  if (cache.lista.length && Date.now() - cache.t < 5 * 60 * 1000) return cache.lista;
  let lista = [];

  // 1) js/livros.js do site publicado
  try {
    const r = await fetch(base + "/js/livros.js");
    if (r.ok) {
      const codigo = await r.text();
      const fn = new Function("window", codigo + "\n;return (typeof LIVROS !== 'undefined') ? LIVROS : [];");
      const arr = fn({});
      if (Array.isArray(arr)) lista = arr.slice();
    }
  } catch (e) { /* segue só com o Firestore */ }

  // 2) livros/edições do admin (Firestore, leitura pública)
  try {
    const r = await fetch(
      "https://firestore.googleapis.com/v1/projects/" + PROJETO +
      "/databases/(default)/documents/catalogo?pageSize=300");
    if (r.ok) {
      const data = await r.json();
      const extras = (data.documents || []).map(converterDoc);
      const indice = new Map(lista.map((l, i) => [idLivro(l), i]));
      extras.forEach(l => {
        if (!l || !l.id) return;
        if (indice.has(l.id)) {
          lista[indice.get(l.id)] = Object.assign({}, lista[indice.get(l.id)], l);
        } else {
          lista.push(l);
        }
      });
    }
  } catch (e) { /* sem Firestore, usa só os estáticos */ }

  if (lista.length) cache = { t: Date.now(), lista };
  return lista;
}

async function acharLivro(base, id) {
  if (!id) return null;
  const lista = await carregarLivros(base);
  return lista.find(l => idLivro(l) === id) || null;
}

function baseDoRequest(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  // Atrás do Firebase Hosting o protocolo vem em x-forwarded-proto
  // (no emulador local é "http"; em produção, "https").
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  return proto + "://" + host;
}

module.exports = { slug, idLivro, carregarLivros, acharLivro, baseDoRequest };
