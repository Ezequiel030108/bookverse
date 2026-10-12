/* ============================================================
   Testes do PEDIDO NO SERVIDOR (api/pedido, status-pix, webhook)
   ------------------------------------------------------------
   O que mais importa aqui é dinheiro e estoque:
   • o valor cobrado é o que o SERVIDOR calcula, nunca o do navegador;
   • um livro não é vendido duas vezes;
   • o pedido só vira "pago" quando o Mercado Pago diz que caiu, e
     com o valor certo.
   ============================================================ */

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const T = require("./ajuda");

const LIVRO_30 = "1984-george-orwell";                              // R$ 30,00, 1 unidade
const LIVRO_14 = "o-principe-nicolau-maquiavel";                     // R$ 14,00, 1 unidade
const LIVRO_3UN = "os-segredos-da-mente-milionaria-t-harv-eker";     // R$ 30,00, 3 unidades

let siteSrv, mp, ana, bia, adm, pedido, statusPix, webhook, avisar;

function corpoPedido(extra) {
  return Object.assign({
    itens: [{ id: LIVRO_30, qty: 1 }],
    pagamento: "pix",
    entrega: "combinar",
    presente: false,
    presenteMsg: "",
    cliente: { nome: "Ana Teste", email: "ana@teste.com", telefone: "(83) 99999-0000", instagram: "anateste" },
    endereco: "",
    observacoes: "",
    origem: "",
    totalVisto: 25.5
  }, extra || {});
}

async function lerPedido(uid, codigo) {
  const d = await T.banco().collection("users").doc(uid).collection("pedidos").doc(codigo).get();
  return d.exists ? d.data() : null;
}
async function lerDisp(id) {
  const d = await T.banco().collection("disponibilidade").doc(id).get();
  return d.exists ? d.data() : null;
}
async function contarPedidos(uid) {
  return (await T.banco().collection("users").doc(uid).collection("pedidos").get()).size;
}
const emailsDo = evento => T.emailsEnviados.filter(e => {
  const assunto = String(e.subject || "");
  return evento === "pago" ? /Pagamento confirmado/.test(assunto) : /Recebemos seu pedido/.test(assunto);
});

before(async () => {
  siteSrv = await T.servirSite();
  mp = await T.simularMercadoPago();
  T.capturarEmails();
  ana = await T.criarConta("ana" + Date.now() + "@teste.com");
  bia = await T.criarConta("bia" + Date.now() + "@teste.com");
  adm = await T.entrarOuCriar("cauantista@gmail.com");   // e-mail da lista de admins
  pedido = T.api("pedido");
  statusPix = T.api("status-pix");
  webhook = T.api("webhook-mp");
  avisar = T.api("avisar");
});

after(() => { siteSrv.close(); mp.fechar(); });

beforeEach(async () => {
  await T.limparBanco();
  T.emailsEnviados.length = 0;
  mp.falharCriacao(false);
  mp.pagamentos.clear();
  T.site.promo = "desligada";
  T.site.pixModo = null;
});

test("sem login não fecha pedido", async () => {
  const r = await T.chamar(pedido, { corpo: corpoPedido({ totalVisto: 30 }) });
  assert.equal(r.status, 401);
});

test("Pix: o servidor calcula o total e cobra ESSE valor", async () => {
  T.site.promo = "ligada";   // 15%: R$ 30,00 → R$ 25,00 (arredonda para baixo)
  const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 25 }) });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.equal(r.corpo.total, 25);
  assert.ok(r.corpo.qr_code && r.corpo.pagamentoId);

  const cobranca = mp.pagamentos.get(r.corpo.pagamentoId);
  assert.equal(cobranca.transaction_amount, 25);
  assert.equal(cobranca.metadata.total_esperado, 25);
  assert.equal(cobranca.metadata.uid_cliente, ana.uid);
  assert.match(cobranca.notification_url, /^https:\/\/www\.bookverse\.com\.br\/api\/webhook-mp$/);

  const p = await lerPedido(ana.uid, r.corpo.codigo);
  assert.equal(p.status, "pendente");
  assert.equal(p.total, 25);
  assert.equal(p.criadoPeloServidor, true);
  assert.equal(p.pagamentoId, r.corpo.pagamentoId);
  assert.equal(p.itens[0].preco, 25);
  assert.match(p.emailBody.message, /Total: R\$\s?25,00/);

  const d = await lerDisp(LIVRO_30);
  assert.equal(d.estado, "reservado");
  assert.equal(d.qtd, 1);
  assert.equal(d.uid, ana.uid);

  assert.equal(emailsDo("recebido").length, 1, "o cliente recebe o aviso de pedido recebido");
});

test("valor adulterado no navegador: nada é cobrado nem gravado", async () => {
  const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 0.01 }) });
  assert.equal(r.status, 409);
  assert.equal(r.corpo.totalAtualizado, 30);
  assert.equal(mp.pagamentos.size, 0, "nenhuma cobrança criada");
  assert.equal(await contarPedidos(ana.uid), 0);
  assert.equal(await lerDisp(LIVRO_30), null);
});

test("a conta é a da vitrine: promoção, vários livros e presente", async () => {
  T.site.promo = "ligada";   // R$ 30 → 25 e R$ 14 → 11 (11,90 arredonda para baixo)
  const r = await T.chamar(pedido, {
    token: ana.token,
    corpo: corpoPedido({ itens: [{ id: LIVRO_30, qty: 1 }, { id: LIVRO_14, qty: 1 }], presente: true, presenteMsg: "Feliz Dia!", totalVisto: 37.5 })
  });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.deepEqual([r.corpo.subtotal, r.corpo.presente, r.corpo.total], [36, 1.5, 37.5]);
});

test("promoção desligada: preço cheio", async () => {
  const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 30 }) });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.equal(r.corpo.total, 30);
});

test("livro reservado por outra pessoa não pode ser comprado", async () => {
  await T.banco().collection("disponibilidade").doc(LIVRO_30).set({ estado: "reservado", qtd: 1, ate: Date.now() + 600000, uid: bia.uid });
  const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 30 }) });
  assert.equal(r.status, 409);
  assert.deepEqual(r.corpo.indisponiveis, [LIVRO_30]);
  assert.equal(mp.pagamentos.size, 0);
});

test("o próprio cliente pode refazer o Pix do mesmo livro", async () => {
  const a = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 30 }) });
  const b = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 30 }) });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200, JSON.stringify(b.corpo));
});

test("duas pessoas pela ÚLTIMA unidade ao mesmo tempo: só uma leva", async () => {
  const [a, b] = await Promise.all([
    T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 30 }) }),
    T.chamar(pedido, { token: bia.token, corpo: corpoPedido({ totalVisto: 30 }) })
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
});

test("livro com 3 unidades: reservas de clientes diferentes somam", async () => {
  const a = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ itens: [{ id: LIVRO_3UN, qty: 2 }], totalVisto: 60 }) });
  const b = await T.chamar(pedido, { token: bia.token, corpo: corpoPedido({ itens: [{ id: LIVRO_3UN, qty: 1 }], totalVisto: 30 }) });
  const c = await T.chamar(pedido, { token: adm.token, corpo: corpoPedido({ itens: [{ id: LIVRO_3UN, qty: 1 }], totalVisto: 30 }) });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200, JSON.stringify(b.corpo));
  assert.equal(c.status, 409, "a quarta unidade não existe");
  assert.equal((await lerDisp(LIVRO_3UN)).qtd, 3);
});

test("dinheiro na entrega: aprovado na hora e o livro sai da loja", async () => {
  const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ pagamento: "dinheiro", totalVisto: 30 }) });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.equal(r.corpo.status, "aprovado");
  assert.equal(mp.pagamentos.size, 0, "dinheiro não gera cobrança");
  const p = await lerPedido(ana.uid, r.corpo.codigo);
  assert.equal(p.estoqueBaixado, true);
  assert.deepEqual(await lerDisp(LIVRO_30), { estado: "vendido", qtd: 1, uid: ana.uid });
});

test("Mercado Pago fora do ar: o pedido é desfeito e o livro volta", async () => {
  mp.falharCriacao(true);
  const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 30 }) });
  assert.equal(r.status, 502);
  assert.equal(await contarPedidos(ana.uid), 0);
  assert.equal(await lerDisp(LIVRO_30), null);
});

test("o Pix cai: pago, baixa no estoque e aviso UMA vez (consulta + webhook juntos)", async () => {
  const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 30 }) });
  mp.aprovar(r.corpo.pagamentoId);
  T.emailsEnviados.length = 0;
  const consulta = { metodo: "GET", query: { id: r.corpo.pagamentoId } };
  const notificacao = { metodo: "POST", corpo: { type: "payment", data: { id: r.corpo.pagamentoId } } };
  const respostas = await Promise.all([
    T.chamar(statusPix, consulta), T.chamar(webhook, notificacao), T.chamar(statusPix, consulta)
  ]);
  assert.equal(respostas[0].corpo.status, "approved");

  const p = await lerPedido(ana.uid, r.corpo.codigo);
  assert.equal(p.status, "pago");
  assert.equal(p.estoqueBaixado, true);
  assert.equal(p.pagamentoValor, 30);
  assert.deepEqual(await lerDisp(LIVRO_30), { estado: "vendido", qtd: 1, uid: ana.uid }, "baixa de UMA unidade, não três");
  assert.equal(emailsDo("pago").length, 1, "o aviso de pagamento sai uma vez só");
});

test("pagou menos que o total: o pedido NÃO vira pago", async () => {
  const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 30 }) });
  mp.aprovar(r.corpo.pagamentoId, 0.01);
  await T.chamar(statusPix, { metodo: "GET", query: { id: r.corpo.pagamentoId } });
  const p = await lerPedido(ana.uid, r.corpo.codigo);
  assert.equal(p.status, "pendente");
  assert.equal(p.pagamentoDivergente, true);
  assert.equal(p.pagamentoValor, 0.01);
  assert.equal(emailsDo("pago").length, 0);
});

test("limite de pedidos sem pagar por conta (ninguém reserva a loja inteira)", async () => {
  for (let i = 0; i < 5; i++) {
    const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 30 }) });
    assert.equal(r.status, 200, "pedido " + (i + 1));
    await new Promise(ok => setTimeout(ok, 5));   // códigos diferentes
  }
  const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 30 }) });
  assert.equal(r.status, 429);
});

test("livro que não está na loja (ou oculto) não entra no pedido", async () => {
  const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ itens: [{ id: "fnaf-fazbear-fright-s-6-hora-de-acordar-scott-cawhton", qty: 1 }], totalVisto: 10 }) });
  assert.equal(r.status, 409);
  assert.ok(r.corpo.indisponiveis.length === 1);
});

test("carrinho vazio, item inválido e dados faltando são recusados", async () => {
  for (const extra of [
    { itens: [] },
    { itens: [{ id: "../users/x", qty: 1 }] },
    { itens: [{ id: LIVRO_30, qty: 0 }] },
    { cliente: { nome: "", email: "a@b.com", telefone: "83999990000" } },
    { cliente: { nome: "Ana", email: "a@b.com", telefone: "123" } },
    { entrega: "inexistente" },
    { entrega: "domicilio", endereco: "" }
  ]) {
    const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido(Object.assign({ totalVisto: 30 }, extra)) });
    assert.equal(r.status, 400, JSON.stringify(extra));
  }
});

test("Pix manual: o código Pix sai do servidor e o cliente avisa que pagou", async () => {
  T.site.pixModo = "manual";
  const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 30 }) });
  assert.equal(r.status, 200, JSON.stringify(r.corpo));
  assert.equal(mp.pagamentos.size, 0);
  assert.match(r.corpo.pix, /^000201/);
  assert.match(r.corpo.pix, /540530\.00/, "o valor no código Pix é o do servidor");
  assert.equal((await lerPedido(ana.uid, r.corpo.codigo)).status, "pendente");

  const outra = await T.chamar(pedido, { token: bia.token, corpo: { acao: "ja-paguei", codigo: r.corpo.codigo } });
  assert.equal(outra.status, 404, "ninguém declara o pedido de outra pessoa");

  const j = await T.chamar(pedido, { token: ana.token, corpo: { acao: "ja-paguei", codigo: r.corpo.codigo } });
  assert.equal(j.status, 200);
  assert.equal((await lerPedido(ana.uid, r.corpo.codigo)).status, "aguardando");
});

test("avisos: só o painel (admin) dispara; o cliente não usa mais a loja para mandar e-mail", async () => {
  const r = await T.chamar(pedido, { token: ana.token, corpo: corpoPedido({ totalVisto: 30 }) });
  const doCliente = await T.chamar(avisar, { token: ana.token, corpo: { evento: "enviado", uid: ana.uid, codigo: r.corpo.codigo } });
  assert.equal(doCliente.status, 403);
  T.emailsEnviados.length = 0;
  const doAdmin = await T.chamar(avisar, { token: adm.token, corpo: { evento: "enviado", uid: ana.uid, codigo: r.corpo.codigo } });
  assert.equal(doAdmin.status, 200, JSON.stringify(doAdmin.corpo));
  assert.equal(T.emailsEnviados.length, 1);
  assert.equal(T.emailsEnviados[0].to[0], "ana@teste.com");
});
