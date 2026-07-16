/* ============================================================
   BOOKVERSE — Helpers do Instagram (stories da loja)
   ------------------------------------------------------------
   Fala com a API oficial do Instagram (Meta) e guarda a conexão
   (o token de acesso) no Firestore, num documento que SÓ o
   servidor consegue ler: as regras do Firestore não dão acesso
   a ninguém de fora, e aqui usamos o Admin SDK, que passa por
   cima das regras.

   Arquivos com "_" no início NÃO viram rotas (functions/index.js).
   ============================================================ */

const GRAPH = "https://graph.instagram.com/v23.0";
const GRAPH_RAIZ = "https://graph.instagram.com";

/* Firestore via Admin SDK — inicializado só quando alguma rota do
   Instagram é usada, para as demais APIs não pagarem esse custo. */
let bancoCache = null;
function banco() {
  if (!bancoCache) {
    const admin = require("firebase-admin");
    if (!admin.apps.length) admin.initializeApp();
    bancoCache = admin.firestore();
  }
  return bancoCache;
}

/* Conexão salva: { token, userId, username, salvoEm, renovadoEm } */
const DOC_CONTA = "instagram/conta";

async function lerConta() {
  const snap = await banco().doc(DOC_CONTA).get();
  return snap.exists ? (snap.data() || null) : null;
}
async function salvarConta(dados) {
  await banco().doc(DOC_CONTA).set(dados, { merge: true });
}
async function apagarConta() {
  await banco().doc(DOC_CONTA).delete();
}

/* Chamada à API da Meta. Com "params" vira POST (formulário);
   sem, é um GET simples. Erros viram exceção com os detalhes
   da Meta anexados (e.ig), para traduzirmos depois. */
async function chamarGraph(url, params) {
  const opcoes = params ? {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString()
  } : undefined;
  const r = await fetch(url, opcoes);
  const data = await r.json().catch(() => ({}));
  if (!r.ok || (data && data.error)) {
    const e = new Error("instagram-falha");
    e.ig = (data && data.error) || { code: r.status };
    throw e;
  }
  return data;
}

/* Pergunta à Meta de quem é o token — valida e identifica a conta. */
async function quemSou(token) {
  let data;
  try {
    data = await chamarGraph(GRAPH + "/me?fields=user_id,username&access_token=" + encodeURIComponent(token));
  } catch (e) {
    // Tokens mais antigos não conhecem o campo "user_id".
    data = await chamarGraph(GRAPH + "/me?fields=id,username&access_token=" + encodeURIComponent(token));
  }
  return {
    userId: String(data.user_id || data.id || "me"),
    username: String(data.username || "")
  };
}

/* Renova o token de longa duração (vale 60 dias). A Meta só aceita
   renovar tokens com mais de 24h de vida; renovando a cada story
   publicado, a conexão nunca expira — basta a loja publicar ao
   menos um story a cada 2 meses. Falhar aqui não é grave: tenta
   de novo no próximo story. */
async function renovarTokenSePreciso(conta) {
  const idade = Date.now() - Number(conta.renovadoEm || conta.salvoEm || 0);
  if (idade < 24 * 60 * 60 * 1000) return;
  try {
    const data = await chamarGraph(
      GRAPH_RAIZ + "/refresh_access_token?grant_type=ig_refresh_token&access_token=" +
      encodeURIComponent(conta.token));
    if (data && data.access_token) {
      await salvarConta({ token: data.access_token, renovadoEm: Date.now() });
    }
  } catch (e) { /* sem drama: o token atual continua valendo */ }
}

/* Traduz os erros da Meta em mensagens amigáveis, em português. */
function mensagemErroIG(e) {
  const ig = (e && e.ig) || {};
  const code = Number(ig.code || 0);
  const sub = Number(ig.error_subcode || 0);
  if (code === 190) {
    return "O acesso ao Instagram expirou ou foi revogado. Gere um novo token no painel da Meta e reconecte em Administração → Instagram.";
  }
  if (code === 10 || code === 200 || code === 3) {
    return "O token não tem permissão para publicar. Gere o token com o escopo instagram_business_content_publish (veja o README).";
  }
  if (code === 4 || code === 17 || code === 32 || code === 613 || sub === 2207042) {
    return "Limite de publicações do Instagram atingido (100 por dia). Tente novamente mais tarde.";
  }
  if (sub === 2207026) {
    return "O Instagram recusou a imagem (formato ou tamanho). Tente publicar de novo.";
  }
  if (ig.error_user_msg) return "Instagram: " + ig.error_user_msg;
  if (ig.message) return "Instagram: " + ig.message;
  return "Não foi possível falar com o Instagram agora. Tente novamente.";
}

module.exports = {
  GRAPH, banco,
  lerConta, salvarConta, apagarConta,
  chamarGraph, quemSou, renovarTokenSePreciso, mensagemErroIG
};
