/* ============================================================
   BOOKVERSE — ACESSO AO BANCO (Firestore) PELO SERVIDOR
   ------------------------------------------------------------
   No navegador quem manda são as regras do Firestore. Aqui no
   servidor usamos o "firebase-admin", que entra com a credencial
   do próprio projeto e enxerga tudo — por isso todo endpoint que
   usa este arquivo confere ANTES quem está chamando.

   Onde ficam as coisas:
     users/{uid}                    → perfil do cliente
     users/{uid}/pedidos/{codigo}   → cada pedido
     campanhas/{id}                 → histórico das novidades enviadas

   Arquivos com "_" no início NÃO viram rotas (functions/index.js).
   ============================================================ */

const admin = require("firebase-admin");

let bancoCache = null;

function banco() {
  if (bancoCache) return bancoCache;
  if (!admin.apps.length) admin.initializeApp();
  bancoCache = admin.firestore();
  return bancoCache;
}

function agora() {
  return admin.firestore.FieldValue.serverTimestamp();
}

/* ---------- Cliente ---------- */
async function lerCliente(uid) {
  if (!uid) return null;
  const doc = await banco().collection("users").doc(String(uid)).get();
  return doc.exists ? Object.assign({ uid: String(uid) }, doc.data()) : null;
}

/* ---------- Pedido ---------- */
async function lerPedido(uid, codigo) {
  if (!uid || !codigo) return null;
  const doc = await banco().collection("users").doc(String(uid))
    .collection("pedidos").doc(String(codigo)).get();
  return doc.exists ? Object.assign({ _caminho: doc.ref.path }, doc.data()) : null;
}

async function atualizarPedido(uid, codigo, campos) {
  if (!uid || !codigo) return;
  await banco().collection("users").doc(String(uid))
    .collection("pedidos").doc(String(codigo))
    .set(campos || {}, { merge: true });
}

/* Acha o pedido pelo id do pagamento no Mercado Pago. Usado pelo
   webhook quando a cobrança foi criada antes de o pedido existir
   (ou quando o metadata veio sem o uid). Precisa do índice de
   "collection group" no campo pagamentoId — veja o README. */
async function acharPedidoPorPagamento(pagamentoId) {
  if (!pagamentoId) return null;
  const snap = await banco().collectionGroup("pedidos")
    .where("pagamentoId", "==", String(pagamentoId)).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return Object.assign(
    { _caminho: doc.ref.path, _uid: doc.ref.parent.parent ? doc.ref.parent.parent.id : "" },
    doc.data()
  );
}

/* ---------- Lista de clientes (campanhas) ----------
   Paginado pelo id do documento: leve, barato e sem índice extra.
   Devolve { clientes, proximo } — "proximo" é o cursor da próxima
   página (ou "" quando acabou). */
async function listarClientes(cursor, limite) {
  let q = banco().collection("users").orderBy(admin.firestore.FieldPath.documentId());
  if (cursor) q = q.startAfter(String(cursor));
  const snap = await q.limit(Math.max(1, Math.min(Number(limite) || 100, 300))).get();
  const clientes = snap.docs.map(d => Object.assign({ uid: d.id }, d.data()));
  const ultimo = snap.docs.length ? snap.docs[snap.docs.length - 1].id : "";
  return { clientes, proximo: snap.docs.length < (Number(limite) || 100) ? "" : ultimo };
}

/* ---------- Campanhas ----------
   Uma campanha sai em vários lotes, então os totais (enviados, por
   e-mail, por WhatsApp…) são SOMADOS a cada chamada em vez de
   sobrescritos. */
async function registrarCampanha(id, campos, somar) {
  const doc = { atualizadoEm: agora() };
  Object.keys(campos || {}).forEach(k => { doc[k] = campos[k]; });
  Object.keys(somar || {}).forEach(k => {
    doc[k] = admin.firestore.FieldValue.increment(Number(somar[k]) || 0);
  });
  const ref = banco().collection("campanhas").doc(String(id));
  const existe = (await ref.get()).exists;
  if (!existe) doc.criadoEm = agora();
  await ref.set(doc, { merge: true });
}

/* ---------- Preferências de aviso ----------
   Padrão: TUDO ligado. Só fica desligado o que o cliente desmarcar
   (ou o que o descadastro de novidades desligar). */
function querReceber(cliente, canal, tipo) {
  const n = (cliente && cliente.notificacoes) || {};
  if (n[canal] === false) return false;               // desligou o canal inteiro
  if (tipo === "novidades" && n.novidades === false) return false;
  return true;
}

module.exports = {
  banco, agora, lerCliente, lerPedido, atualizarPedido,
  acharPedidoPorPagamento, listarClientes, registrarCampanha, querReceber
};
