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
let promoEstatica = null;   // a constante PROMOCAO lida do js/livros.js

const TEMPO_CACHE = 5 * 60 * 1000;   // idade máxima do cache em memória
const TEMPO_LIMITE_MS = 4000;        // espera máxima por CADA busca externa

/* 1) js/livros.js do site publicado. Devolve null se a busca falhar
   (null ≠ lista vazia: falha permite cair no cache antigo).
   De quebra, guarda a constante PROMOCAO (para o feed do Google Shopping
   refletir o preço promocional, igual ao que o cliente vê no site). */
async function livrosEstaticos(base) {
  try {
    const r = await fetch(base + "/js/livros.js", { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
    if (!r.ok) return null;
    const codigo = await r.text();
    const fn = new Function("window", codigo +
      "\n;return {" +
      "  livros: (typeof LIVROS !== 'undefined') ? LIVROS : []," +
      "  promocao: (typeof PROMOCAO !== 'undefined') ? PROMOCAO : null" +
      "};");
    const out = fn({}) || {};
    promoEstatica = out.promocao || null;
    return Array.isArray(out.livros) ? out.livros.slice() : null;
  } catch (e) { return null; }
}

/* A promoção declarada no js/livros.js (ou null). Só fica disponível
   depois de uma carga do catálogo — quem precisar dela deve chamar
   carregarLivros() antes. */
function promocaoAtual() { return promoEstatica; }

/* 2) livros/edições do admin (Firestore, leitura pública). */
async function livrosDoAdmin() {
  try {
    const r = await fetch(
      "https://firestore.googleapis.com/v1/projects/" + PROJETO +
      "/databases/(default)/documents/catalogo?pageSize=300",
      { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
    if (!r.ok) return null;
    const data = await r.json();
    return (data.documents || []).map(converterDoc);
  } catch (e) { return null; }
}

/* Lista completa de livros (estáticos + admin), com cache de 5 min.
   As duas buscas correm em paralelo e têm limite de tempo; se alguma
   falhar, a última lista completa continua valendo — assim o link de
   um livro nunca "some" por causa de uma instabilidade momentânea. */
async function carregarLivros(base) {
  if (cache.lista.length && Date.now() - cache.t < TEMPO_CACHE) return cache.lista;

  const [estaticos, extras] = await Promise.all([livrosEstaticos(base), livrosDoAdmin()]);

  // Busca incompleta: melhor servir a lista antiga inteira do que gravar
  // uma pela metade (o livro do link poderia desaparecer da prévia).
  if ((!estaticos || !extras) && cache.lista.length) return cache.lista;

  const lista = (estaticos || []).slice();
  const indice = new Map(lista.map((l, i) => [idLivro(l), i]));
  (extras || []).forEach(l => {
    if (!l || !l.id) return;
    if (indice.has(l.id)) {
      lista[indice.get(l.id)] = Object.assign({}, lista[indice.get(l.id)], l);
    } else {
      lista.push(l);
    }
  });

  if (lista.length && estaticos && extras) cache = { t: Date.now(), lista };
  return lista;
}

async function acharLivro(base, id) {
  if (!id) return null;
  const lista = await carregarLivros(base);
  return lista.find(l => idLivro(l) === id) || null;
}

/* Disponibilidade (reservados/vendidos) — coleção "disponibilidade", a MESMA
   que a loja usa para esconder o que já saiu (leitura pública). O catálogo
   guarda só o estoque de casa; QUEM foi vendido/reservado vive aqui, por id
   do livro. Devolve um mapa id -> unidades bloqueadas (Infinity = doc antigo,
   sem "qtd", que bloqueia o livro inteiro). Mesma regra do site (main.js).
   Em caso de falha devolve mapa vazio: o feed apenas volta ao comportamento
   antigo (filtra só por estoque), nunca quebra. */
async function carregarDisponibilidade() {
  const bloq = new Map();
  try {
    const r = await fetch(
      "https://firestore.googleapis.com/v1/projects/" + PROJETO +
      "/databases/(default)/documents/disponibilidade?pageSize=300",
      { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
    if (!r.ok) return bloq;
    const data = await r.json();
    const agora = Date.now();
    (data.documents || []).forEach(doc => {
      const d = converterDoc(doc);
      let q = 0;
      if (d.estado === "vendido") q = (d.qtd > 0) ? Number(d.qtd) : Infinity;
      else if (d.estado === "reservado" && (!d.ate || d.ate > agora)) q = (d.qtd > 0) ? Number(d.qtd) : Infinity;
      if (q > 0) bloq.set(d.id, q);
    });
  } catch (e) { /* falha: mapa vazio; o feed cai no filtro por estoque. */ }
  return bloq;
}

function baseDoRequest(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  // Atrás do Firebase Hosting o protocolo vem em x-forwarded-proto
  // (no emulador local é "http"; em produção, "https").
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  return proto + "://" + host;
}

module.exports = { slug, idLivro, carregarLivros, carregarDisponibilidade, acharLivro, baseDoRequest, promocaoAtual };
