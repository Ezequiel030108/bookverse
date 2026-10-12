/* ============================================================
   Testes das REGRAS DO BANCO (firestore.rules)
   ------------------------------------------------------------
   Confere, no emulador, o que o NAVEGADOR consegue ou não fazer.
   O mais importante: um cliente não consegue criar pedido, mudar
   status ou valor, nem mexer no estoque.
   ============================================================ */

const { test, before, after, beforeEach } = require("node:test");
const fs = require("fs");
const path = require("path");
const { initializeTestEnvironment, assertFails, assertSucceeds } = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, collectionGroup, getDocs } = require("firebase/firestore");
const { RAIZ, PROJETO, HOST_FIRESTORE } = require("./ajuda");

let env;
const [host, porta] = HOST_FIRESTORE.split(":");

const ADMIN = { email: "cauantista@gmail.com", email_verified: true };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJETO,
    firestore: { host, port: Number(porta), rules: fs.readFileSync(path.join(RAIZ, "firestore.rules"), "utf8") }
  });
});
after(async () => { if (env) await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  // Dados que existiriam na loja: um pedido do cliente "ana", criado pelo servidor.
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/ana"), { nome: "Ana" });
    await setDoc(doc(db, "users/ana/pedidos/BV1"), { codigo: "BV1", status: "pendente", total: 50, emailEnviado: false });
    await setDoc(doc(db, "users/bia/pedidos/BV2"), { codigo: "BV2", status: "pago", total: 30 });
    await setDoc(doc(db, "disponibilidade/livro-a"), { estado: "reservado", qtd: 1, ate: Date.now() + 60000, uid: "ana" });
    await setDoc(doc(db, "catalogo/livro-b"), { titulo: "Livro B", preco: "R$ 20,00", estoque: 1 });
  });
});

const ana = () => env.authenticatedContext("ana", { email: "ana@teste.com", email_verified: true }).firestore();
const admin = () => env.authenticatedContext("admin-uid", ADMIN).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

test("cliente lê e grava o próprio perfil e carrinho", async () => {
  await assertSucceeds(getDoc(doc(ana(), "users/ana")));
  await assertSucceeds(setDoc(doc(ana(), "users/ana"), { carrinho: [{ id: "x", qty: 1 }] }, { merge: true }));
});

test("cliente não lê o perfil nem os pedidos de outra pessoa", async () => {
  await assertFails(getDoc(doc(ana(), "users/bia")));
  await assertFails(getDoc(doc(ana(), "users/bia/pedidos/BV2")));
  await assertFails(getDocs(collectionGroup(ana(), "pedidos")));
});

test("cliente lê os próprios pedidos", async () => {
  await assertSucceeds(getDoc(doc(ana(), "users/ana/pedidos/BV1")));
  await assertSucceeds(getDocs(collection(ana(), "users/ana/pedidos")));
});

test("cliente NÃO cria pedido pelo navegador (quem cria é o servidor)", async () => {
  await assertFails(setDoc(doc(ana(), "users/ana/pedidos/BV9"), { codigo: "BV9", status: "pago", total: 0.01 }));
});

test("cliente NÃO muda status nem valor do pedido", async () => {
  await assertFails(updateDoc(doc(ana(), "users/ana/pedidos/BV1"), { status: "pago" }));
  await assertFails(updateDoc(doc(ana(), "users/ana/pedidos/BV1"), { total: 0.01 }));
  await assertFails(updateDoc(doc(ana(), "users/ana/pedidos/BV1"), { emailEnviado: true, status: "pago" }));
  await assertFails(updateDoc(doc(ana(), "users/ana/pedidos/BV1"), { pagamentoId: "123" }));
});

test("cliente só marca que o e-mail do pedido saiu", async () => {
  await assertSucceeds(updateDoc(doc(ana(), "users/ana/pedidos/BV1"), { emailEnviado: true }));
  // É assim que o site grava (Auth.atualizarPedido usa set com merge).
  await assertSucceeds(setDoc(doc(ana(), "users/ana/pedidos/BV1"), { emailEnviado: true }, { merge: true }));
});

test("cliente apaga os próprios dados (apagar conta)", async () => {
  await assertSucceeds(deleteDoc(doc(ana(), "users/ana/pedidos/BV1")));
  await assertSucceeds(deleteDoc(doc(ana(), "users/ana")));
});

test("cliente NÃO reserva nem vende livro pelo navegador", async () => {
  await assertFails(setDoc(doc(ana(), "disponibilidade/livro-c"), { estado: "reservado", qtd: 1, ate: Date.now() + 1000, uid: "ana" }));
  await assertFails(setDoc(doc(ana(), "disponibilidade/livro-a"), { estado: "vendido", uid: "ana" }));
  await assertFails(deleteDoc(doc(ana(), "disponibilidade/livro-a")));
});

test("cliente NÃO mexe no catálogo", async () => {
  await assertFails(setDoc(doc(ana(), "catalogo/livro-b"), { preco: "R$ 0,01" }, { merge: true }));
});

test("qualquer visitante lê o catálogo e a disponibilidade", async () => {
  await assertSucceeds(getDoc(doc(anonimo(), "catalogo/livro-b")));
  await assertSucceeds(getDocs(collection(anonimo(), "disponibilidade")));
});

test("visitante sem login não lê nada de clientes", async () => {
  await assertFails(getDoc(doc(anonimo(), "users/ana")));
  await assertFails(getDoc(doc(anonimo(), "users/ana/pedidos/BV1")));
});

test("admin vê e atualiza os pedidos de todos (painel da loja)", async () => {
  await assertSucceeds(getDocs(collectionGroup(admin(), "pedidos")));
  await assertSucceeds(setDoc(doc(admin(), "users/bia/pedidos/BV2"), { status: "entregue" }, { merge: true }));
});

test("admin mexe no estoque e no catálogo", async () => {
  await assertSucceeds(setDoc(doc(admin(), "disponibilidade/livro-b"), { estado: "vendido", qtd: 1 }));
  await assertSucceeds(deleteDoc(doc(admin(), "disponibilidade/livro-a")));
  await assertSucceeds(setDoc(doc(admin(), "catalogo/livro-c"), { titulo: "Livro C" }));
});

test("e-mail de admin NÃO verificado não vale como admin", async () => {
  const falso = env.authenticatedContext("impostor", { email: ADMIN.email, email_verified: false }).firestore();
  await assertFails(getDocs(collectionGroup(falso, "pedidos")));
  await assertFails(setDoc(doc(falso, "catalogo/livro-b"), { preco: "R$ 1,00" }, { merge: true }));
});

test("coleções do servidor ficam fechadas para o navegador", async () => {
  await assertFails(getDoc(doc(admin(), "campanhas/qualquer")));
  await assertFails(setDoc(doc(ana(), "campanhas/qualquer"), { x: 1 }));
});
