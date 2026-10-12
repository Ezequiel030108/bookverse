/* ============================================================
   BOOKVERSE — PEDIDOS NO SERVIDOR (criação e confirmação)
   ------------------------------------------------------------
   POR QUE O PEDIDO NASCE AQUI E NÃO NO NAVEGADOR
   Antes, o navegador do cliente calculava o total, escolhia o
   valor do Pix e gravava o pedido — inclusive o status "pago" —
   direto no banco. Com as ferramentas do navegador dava para
   pagar R$ 0,01 por um pedido inteiro, e ele aparecia como PAGO.

   Agora o navegador só diz O QUE quer comprar (ids e quantidades,
   entrega, presente, contato). O servidor:
     1. confere quem está comprando (login);
     2. calcula preço, promoção, frete e presente com os próprios
        arquivos do site (_site.js) — a MESMA conta da vitrine;
     3. confere o estoque e reserva os livros numa transação (dois
        clientes nunca levam a última unidade ao mesmo tempo);
     4. cria a cobrança com o valor que ELE calculou;
     5. grava o pedido.
   O status só muda pelo servidor (webhook do Mercado Pago ou a
   consulta do status) ou pelo painel dos administradores.

   Arquivos com "_" no início NÃO viram rotas (functions/index.js).
   ============================================================ */

const crypto = require("crypto");
const admin = require("firebase-admin");
const dados = require("./_dados");
const { idLivro } = require("./_catalogo");
const { carregarLoja } = require("./_site");
const { dadosLoja } = require("./_loja");
const { enviarAvisoPedido } = require("./_notificar");

const RESERVA_MS = 30 * 60 * 1000;      // o livro fica separado por 30 min
const MAX_LINHAS = 30;                  // livros diferentes num pedido
const MAX_UNIDADES = 20;                // unidades de um mesmo livro
const JANELA_ABERTOS_MS = 30 * 60 * 1000;
const LIMITE_ABERTOS = 5;               // pedidos sem pagar ao mesmo tempo
const ORIGENS = { meta: "Instagram / Facebook (catálogo do Meta)" };

/* Erro com status HTTP e dados extras para a resposta. */
class ErroPedido extends Error {
  constructor(status, mensagem, extra) {
    super(mensagem);
    this.status = status;
    this.extra = extra || {};
  }
}

function texto(v, max) { return String(v == null ? "" : v).trim().slice(0, max); }
function centavos(v) { return Math.round((Number(v) || 0) * 100) / 100; }
function agoraMs() { return Date.now(); }

/* ---------- 1) O que o cliente quer comprar ---------- */
function lerItens(lista) {
  if (!Array.isArray(lista) || !lista.length) throw new ErroPedido(400, "O carrinho está vazio.");
  const porId = new Map();
  lista.forEach(item => {
    const id = texto(item && item.id, 150);
    const qty = Math.floor(Number(item && item.qty) || 0);
    // O id vira caminho no banco: só letras, números, ponto, hífen e _.
    if (!/^[A-Za-z0-9._-]+$/.test(id) || qty < 1) throw new ErroPedido(400, "Há um item inválido no carrinho.");
    porId.set(id, Math.min(MAX_UNIDADES, (porId.get(id) || 0) + qty));
  });
  if (porId.size > MAX_LINHAS) throw new ErroPedido(400, "O carrinho tem livros demais para um pedido só.");
  return Array.from(porId, ([id, qty]) => ({ id, qty }));
}

/* WhatsApp brasileiro: mesma regra do checkout (com ou sem +55). */
function whatsappNacional(v) {
  let d = String(v || "").replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.indexOf("55") === 0) d = d.slice(2);
  return d;
}

function lerCliente(c) {
  c = c || {};
  let instagram = texto(c.instagram, 60).replace(/^@+/, "");
  if (instagram) instagram = "@" + instagram;
  const cliente = {
    nome: texto(c.nome, 120),
    email: texto(c.email, 160),
    telefone: texto(c.telefone, 40),
    instagram
  };
  if (!cliente.nome) throw new ErroPedido(400, "Informe seu nome.");
  if (!/^[1-9][0-9]9\d{8}$/.test(whatsappNacional(cliente.telefone))) {
    throw new ErroPedido(400, "Informe um WhatsApp válido, com DDD.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email)) {
    throw new ErroPedido(400, "Informe um e-mail válido.");
  }
  cliente.whatsappLink = "https://wa.me/55" + whatsappNacional(cliente.telefone);
  return cliente;
}

/* ---------- 2) Os livros, como a loja os mostra ----------
   js/livros.js + as edições/cadastros do painel (coleção "catalogo"),
   lidos agora — o preço vale o que está no banco neste momento. */
async function livrosDoPedido(loja, itens) {
  const ocultos = new Set((loja.ocultos || []).map(id => String(id || "").trim()));
  const estaticos = new Map((loja.livros || []).map(l => [idLivro(l), l]));
  const db = dados.banco();
  const snaps = await db.getAll(...itens.map(i => db.collection("catalogo").doc(i.id)));
  const faltando = [];
  const linhas = itens.map((item, n) => {
    const base = estaticos.get(item.id);
    const doc = snaps[n] && snaps[n].exists ? snaps[n].data() : null;
    const livro = doc ? Object.assign({}, base || {}, doc, { id: item.id }) : base;
    if (!livro || ocultos.has(item.id)) { faltando.push(item.id); return null; }
    return { id: item.id, qty: item.qty, livro };
  });
  if (faltando.length) {
    throw new ErroPedido(409, "Algum livro do carrinho não está mais na loja. Atualize a página.", { indisponiveis: faltando });
  }
  return linhas;
}

/* ---------- 3) A conta (a mesma da vitrine) ---------- */
function calcularTotais(loja, linhas, entregaId, comPresente) {
  const totalItens = linhas.reduce((s, l) => s + l.qty, 0);
  let subtotal = 0;
  linhas.forEach(l => {
    const unit = loja.precoUnitario(l.livro, totalItens);
    if (!(unit > 0)) throw new ErroPedido(409, `O livro "${l.livro.titulo || l.id}" está sem preço na loja.`);
    l.precoUnit = unit;
    l.precoLinha = centavos(unit * l.qty);
    subtotal += l.precoLinha;
  });
  subtotal = centavos(subtotal);

  const cfgFrete = loja.config.frete || {};
  const opcoes = Array.isArray(cfgFrete.opcoes) ? cfgFrete.opcoes : [];
  const entrega = opcoes.find(o => o && o.id === entregaId);
  if (!entrega) throw new ErroPedido(400, "Escolha uma forma de entrega.");
  const limite = Number(cfgFrete.freteGratisAcima) || 0;
  const frete = centavos(entrega.valor > 0 && limite && subtotal >= limite ? 0 : (entrega.valor || 0));
  const presente = comPresente ? centavos((loja.config.presente && loja.config.presente.valor) || 0) : 0;

  return { subtotal, frete, presente, total: centavos(subtotal + frete + presente), entrega, totalItens };
}

/* ---------- 4) Estoque ----------
   Unidades que outra pessoa já tirou da loja: vendidas, ou reservadas
   (Pix em aberto) por OUTRO cliente. A reserva do próprio cliente não
   conta (ele pode refazer o Pix). Registros antigos, sem "qtd",
   bloqueiam o livro inteiro — mesma regra da vitrine. */
function unidadesBloqueadas(d, agora, uid) {
  if (!d) return 0;
  if (d.estado === "vendido") return d.qtd > 0 ? Number(d.qtd) : Infinity;
  if (d.estado === "reservado" && (!d.ate || d.ate > agora) && d.uid !== uid) {
    return d.qtd > 0 ? Number(d.qtd) : Infinity;
  }
  return 0;
}

/* Novo registro de disponibilidade depois de RESERVAR qty unidades.
   null = não mexer. Livro já parcialmente vendido fica como está: um
   registro só não guarda "vendido" e "reservado" ao mesmo tempo, e
   trocar "vendido" por "reservado" apagaria as vendas anteriores. */
function aposReserva(d, qty, uid, ate, agora) {
  if (d && d.estado === "vendido") return null;
  const outraReserva = d && d.estado === "reservado" && d.ate > agora && d.uid !== uid && d.qtd > 0;
  return {
    estado: "reservado",
    qtd: (outraReserva ? Number(d.qtd) : 0) + qty,
    ate: outraReserva ? Math.max(Number(d.ate), ate) : ate,
    uid
  };
}

/* Novo registro depois de VENDER qty unidades (dar baixa). null = não
   mexer: registro antigo, sem "qtd", já tira o livro inteiro da loja. */
function aposBaixa(d, qty, uid) {
  if (d && d.estado === "vendido" && !(d.qtd > 0)) return null;
  const vendidos = (d && d.estado === "vendido" ? Number(d.qtd) : 0) + qty;
  return { estado: "vendido", qtd: vendidos, uid };
}

/* ---------- 5) Limite de pedidos em aberto ----------
   Sem isto, uma conta poderia reservar a loja inteira, gerando Pix
   sem pagar (cada reserva tira o livro da vitrine por 30 min). */
async function conferirLimite(uid) {
  const snap = await dados.banco().collection("users").doc(uid).collection("pedidos")
    .orderBy("criadoEm", "desc").limit(20).get();
  const desde = agoraMs() - JANELA_ABERTOS_MS;
  const abertos = snap.docs.filter(doc => {
    const p = doc.data();
    const t = p.criadoEm && typeof p.criadoEm.toMillis === "function" ? p.criadoEm.toMillis() : 0;
    return t > desde && (p.status === "pendente" || p.status === "aguardando");
  }).length;
  if (abertos >= LIMITE_ABERTOS) {
    throw new ErroPedido(429, "Você já tem vários pedidos esperando pagamento. Pague um deles ou espere alguns minutos para fazer outro.");
  }
}

/* ---------- 6) E-mail do pedido para a loja (Web3Forms) ----------
   Sai do NAVEGADOR (o Web3Forms barra servidores), mas o texto é
   montado aqui, com os valores que o servidor calculou. */
function montarEmailLojista({ codigo, cliente, entrega, endereco, observacoes, origem, presente, presenteMsg, pagamento, linhas, totais, loja }) {
  const nomeLoja = loja.config.nomeLoja || "BookVerse";
  const brl = v => loja.formatarBRL(v);
  const emDinheiro = pagamento === "dinheiro";
  const pagamentoTxt = emDinheiro
    ? "DINHEIRO EM ESPÉCIE na entrega. Pedido APROVADO (receber o valor ao entregar)."
    : `Pix, código ${codigo}.`;
  const itensTxt = linhas.map(l =>
    `${l.qty}x ${l.livro.titulo}${l.livro.condicao ? " [" + (l.livro.condicao === "novo" ? "NOVO" : "USADO") + "]" : ""} (${l.livro.autor}): ${brl(l.precoLinha)}`
  ).join("\n");
  const presenteTxt = presente
    ? `EMBALAR PARA PRESENTE (+ ${brl(totais.presente)})${presenteMsg ? ` (cartão: "${presenteMsg}")` : ""}`
    : "";
  const origemTxt = ORIGENS[origem] || "";
  const enderecoTxt = endereco || "Entrega a combinar (retirada local)";
  const mensagem = [
    `NOVO PEDIDO - ${nomeLoja}`,
    `Código: ${codigo}`,
    ``,
    `Cliente: ${cliente.nome}`,
    `E-mail: ${cliente.email}`,
    `WhatsApp: ${cliente.telefone}  (abrir: ${cliente.whatsappLink})`,
    cliente.instagram ? `Instagram: ${cliente.instagram}` : "",
    ``,
    origemTxt ? `Origem do pedido: ${origemTxt}` : "",
    `Entrega: ${entrega.titulo}`,
    `Endereço: ${enderecoTxt}`,
    presenteTxt,
    ``,
    `Itens:`,
    itensTxt,
    ``,
    `Subtotal: ${brl(totais.subtotal)}`,
    `Frete: ${totais.frete === 0 ? "Grátis" : brl(totais.frete)}`,
    totais.presente ? `Embalar para presente: ${brl(totais.presente)}` : "",
    `Total: ${brl(totais.total)}`,
    observacoes ? `\nObservações: ${observacoes}` : "",
    ``,
    `Pagamento: ${pagamentoTxt}`
  ].join("\n");

  return {
    subject: `Novo pedido ${codigo} - ${nomeLoja}`,
    from_name: `${nomeLoja} (Loja)`,
    replyto: cliente.email || "",
    "Código do pedido": codigo,
    "Cliente": cliente.nome,
    "E-mail do cliente": cliente.email,
    "WhatsApp": cliente.telefone,
    "Abrir no WhatsApp": cliente.whatsappLink,
    "Instagram": cliente.instagram || "—",
    "Origem do pedido": origemTxt || "Site",
    "Entrega": entrega.titulo,
    "Endereço": enderecoTxt,
    "Embalar para presente": presente ? (`SIM (+ ${brl(totais.presente)})` + (presenteMsg ? ` (cartão: "${presenteMsg}")` : "")) : "Não",
    "Forma de pagamento": emDinheiro ? "Dinheiro em espécie (na entrega)" : "Pix",
    "Total": brl(totais.total),
    "message": mensagem
  };
}

/* Pix manual: o "copia e cola" sai da chave da loja (js/config.js), com o
   total do servidor e o código do pedido como identificador. */
function pixManual(loja, codigo, total) {
  const pix = loja.config.pix || {};
  if (!String(pix.chave || "").trim()) throw new ErroPedido(503, "O pagamento por Pix ainda não está configurado na loja.");
  const payload = loja.gerarPix({ chave: pix.chave, nome: pix.nomeRecebedor, cidade: pix.cidade, valor: total, txid: codigo });
  if (!payload) throw new ErroPedido(500, "Não foi possível gerar o código Pix.");
  return payload;
}

/* Código do pedido: a hora em base 36 + 2 caracteres sorteados (dois
   pedidos no mesmo milésimo de segundo nunca ganham o mesmo código). */
function novoCodigo() {
  const sorteio = crypto.randomInt(0, 36 * 36).toString(36).toUpperCase().padStart(2, "0");
  return "BV" + Date.now().toString(36).toUpperCase() + sorteio;
}

/* ---------- Monta o pedido (sem gravar) ----------
   Faz tudo o que não muda nada no banco: confere os dados, os livros,
   o estoque e a conta. Devolve o que é preciso para cobrar e gravar. */
async function prepararPedido({ uid, corpo, loja }) {
  const pagamento = corpo.pagamento === "dinheiro" ? "dinheiro" : "pix";
  const modoPix = String((loja.config.pix && loja.config.pix.modo) || "manual").toLowerCase();
  const pixMercadoPago = pagamento === "pix" && (modoPix === "mercadopago" || modoPix === "mp");

  const itens = lerItens(corpo.itens);
  const cliente = lerCliente(corpo.cliente);
  const presente = corpo.presente === true;
  const presenteMsg = presente ? texto(corpo.presenteMsg, 300) : "";
  const observacoes = texto(corpo.observacoes, 1000);
  const origem = ORIGENS[corpo.origem] ? String(corpo.origem) : "";

  const linhas = await livrosDoPedido(loja, itens);
  const totais = calcularTotais(loja, linhas, texto(corpo.entrega, 60), presente);
  const endereco = totais.entrega.pedeEndereco ? texto(corpo.endereco, 400) : "";
  if (totais.entrega.pedeEndereco && !endereco) throw new ErroPedido(400, "Informe o endereço de entrega.");

  // O total que o cliente viu na tela precisa bater com o do servidor.
  // Se mudou (promoção acabou, preço novo), devolvemos o total certo para
  // ele conferir antes de pagar — nunca cobramos um valor que ele não viu.
  const visto = Number(corpo.totalVisto);
  if (!(Math.abs(visto - totais.total) < 0.01)) {
    throw new ErroPedido(409, `O total do pedido foi atualizado para ${loja.formatarBRL(totais.total)}. Confira e confirme de novo.`, {
      totalAtualizado: totais.total
    });
  }

  await conferirLimite(uid);

  const codigo = novoCodigo();
  // Dinheiro na entrega: o pedido já nasce APROVADO (e o estoque sai na
  // hora). Pix: "pendente" até o pagamento cair (Mercado Pago) ou até o
  // cliente avisar que pagou (Pix manual → "aguardando").
  const status = pagamento === "dinheiro" ? "aprovado" : "pendente";
  const emailBody = montarEmailLojista({
    codigo, cliente, entrega: totais.entrega, endereco, observacoes, origem,
    presente, presenteMsg, pagamento, linhas, totais, loja
  });

  const pedido = {
    codigo,
    status,
    pagamento,
    modoPix: pagamento === "pix" ? (pixMercadoPago ? "mercadopago" : "manual") : "",
    total: totais.total,
    subtotal: totais.subtotal,
    frete: totais.frete,
    presenteValor: totais.presente,
    entrega: totais.entrega.titulo || "",
    endereco,
    cliente,
    presente,
    presenteMsg,
    observacoes,
    origem,
    promocao: loja.promoAtiva() ? loja.nomePromo() : "",
    pagamentoId: "",
    pix: pagamento === "pix" && !pixMercadoPago ? pixManual(loja, codigo, totais.total) : "",
    pixUrl: "",
    emailBody,
    emailEnviado: false,
    estoqueBaixado: pagamento === "dinheiro",
    itens: linhas.map(l => ({
      id: l.id,
      titulo: l.livro.titulo || "",
      autor: l.livro.autor || "",
      qty: l.qty,
      preco: l.precoLinha,
      condicao: l.livro.condicao || ""
    })),
    criadoPeloServidor: true
  };

  return { pedido, linhas, totais, pixMercadoPago };
}

/* ---------- Grava o pedido + reserva (ou baixa) numa transação ----------
   Confere o estoque DE NOVO dentro da transação: se outra pessoa levou
   a última unidade entre a conferência e a gravação, nada é gravado. */
async function gravarPedido({ uid, pedido, linhas }) {
  const db = dados.banco();
  const pedidoRef = db.collection("users").doc(uid).collection("pedidos").doc(pedido.codigo);
  const baixar = pedido.status === "aprovado";
  await db.runTransaction(async tx => {
    const refs = linhas.map(l => db.collection("disponibilidade").doc(l.id));
    const snaps = await tx.getAll(...refs);
    const agora = agoraMs();
    const indisponiveis = [];
    linhas.forEach((l, n) => {
      const d = snaps[n].exists ? snaps[n].data() : null;
      const livres = (Number(l.livro.estoque) || 0) - unidadesBloqueadas(d, agora, uid);
      if (l.qty > livres) indisponiveis.push(l.id);
    });
    if (indisponiveis.length) {
      throw new ErroPedido(409, "Algum livro do carrinho acabou de ser vendido ou reservado por outra pessoa.", { indisponiveis });
    }
    const ate = agora + RESERVA_MS;
    linhas.forEach((l, n) => {
      const d = snaps[n].exists ? snaps[n].data() : null;
      const novo = baixar ? aposBaixa(d, l.qty, uid) : aposReserva(d, l.qty, uid, ate, agora);
      if (novo) tx.set(refs[n], novo);
    });
    tx.create(pedidoRef, Object.assign({}, pedido, {
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      reservadoAte: baixar ? null : ate
    }));
  });
}

/* Pix manual: o cliente avisa que já pagou. O pedido passa de
   "pendente" para "aguardando" (a loja confere no banco e confirma no
   painel). Só o dono do pedido, e só nesse caso. */
async function declararPagamento({ uid, codigo }) {
  const ref = dados.banco().collection("users").doc(uid).collection("pedidos").doc(String(codigo));
  return dados.banco().runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ErroPedido(404, "Pedido não encontrado.");
    const p = snap.data();
    if (p.status === "aguardando") return p;
    if (p.status !== "pendente" || p.modoPix !== "manual") {
      throw new ErroPedido(409, "Este pedido não está esperando a confirmação do Pix.");
    }
    tx.set(ref, { status: "aguardando", declaradoPagoEm: Date.now() }, { merge: true });
    return Object.assign({}, p, { status: "aguardando" });
  });
}

/* Libera as reservas de um pedido que não chegou a ser pago
   (ex.: a cobrança no Mercado Pago falhou depois da gravação). */
async function desfazerPedido({ uid, pedido, linhas }) {
  const db = dados.banco();
  await db.runTransaction(async tx => {
    const refs = linhas.map(l => db.collection("disponibilidade").doc(l.id));
    const snaps = await tx.getAll(...refs);
    snaps.forEach((s, n) => {
      const d = s.exists ? s.data() : null;
      if (!d || d.estado !== "reservado" || d.uid !== uid) return;
      const resto = (Number(d.qtd) || 0) - linhas[n].qty;
      if (resto > 0) tx.set(refs[n], Object.assign({}, d, { qtd: resto }));
      else tx.delete(refs[n]);
    });
    tx.delete(db.collection("users").doc(uid).collection("pedidos").doc(pedido.codigo));
  });
}

/* ---------- Confirmação do pagamento (webhook e consulta) ----------
   Marca o pedido como pago e dá baixa no estoque, uma única vez
   (transação: o webhook e a consulta do checkout podem chegar juntos).
   Devolve { confirmado, jaEstava, divergente }. */
async function confirmarPagamento({ uid, codigo, pagamento }) {
  const db = dados.banco();
  const pedidoRef = db.collection("users").doc(uid).collection("pedidos").doc(codigo);
  return db.runTransaction(async tx => {
    const snap = await tx.get(pedidoRef);
    if (!snap.exists) return { confirmado: false, motivo: "pedido-nao-encontrado" };
    const p = snap.data();

    // Pagou menos do que o pedido? Não confirma sozinho: a loja olha.
    const esperado = centavos(Math.max(Number(p.total) || 0, Number((pagamento.metadata || {}).total_esperado) || 0));
    const pago = centavos(pagamento.transaction_amount);
    if (esperado && pago + 0.009 < esperado) {
      tx.set(pedidoRef, { pagamentoDivergente: true, pagamentoValor: pago, pagamentoId: String(pagamento.id) }, { merge: true });
      return { confirmado: false, divergente: true, esperado, pago };
    }

    const jaPago = ["pago", "enviado", "entregue"].indexOf(p.status) >= 0;
    const itens = (p.itens || []).filter(i => i && i.id && /^[A-Za-z0-9._-]+$/.test(String(i.id)));
    const darBaixa = !p.estoqueBaixado && itens.length > 0;
    const refs = darBaixa ? itens.map(i => db.collection("disponibilidade").doc(String(i.id))) : [];
    const disp = refs.length ? await tx.getAll(...refs) : [];

    if (jaPago && !darBaixa) return { confirmado: true, jaEstava: true };

    const campos = { pagamentoId: String(pagamento.id), pagamentoValor: pago };
    if (!jaPago) { campos.status = "pago"; campos.pagoEm = Date.now(); }
    if (darBaixa) {
      itens.forEach((item, n) => {
        const d = disp[n].exists ? disp[n].data() : null;
        const novo = aposBaixa(d, Math.max(1, Number(item.qty) || 1), uid);
        if (novo) tx.set(refs[n], novo);
      });
      campos.estoqueBaixado = true;
    }
    tx.set(pedidoRef, campos, { merge: true });
    return { confirmado: true, jaEstava: jaPago };
  });
}

/* Acha o pedido de um pagamento do Mercado Pago: pelo uid + código
   guardados na cobrança (o caminho normal) ou procurando o id do
   pagamento em todos os pedidos (precisa do índice de collection
   group em "pagamentoId" — firestore.indexes.json). */
async function acharPedidoDoPagamento(pagamento) {
  const meta = (pagamento && pagamento.metadata) || {};
  const uid = String(meta.uid_cliente || "").trim();
  const codigo = String(meta.codigo_pedido || pagamento.external_reference || "").trim();
  if (uid && codigo) {
    try {
      const pedido = await dados.lerPedido(uid, codigo);
      if (pedido) return { uid, codigo, pedido };
    } catch (e) { /* cai para a busca ampla */ }
  }
  try {
    const achado = await dados.acharPedidoPorPagamento(pagamento.id);
    if (achado && achado._uid) return { uid: achado._uid, codigo: achado.codigo || codigo, pedido: achado };
  } catch (e) {
    console.warn("[pedidos] Busca por pagamentoId falhou (falta o índice de collection group?):", e.message);
  }
  return null;
}

/* O aviso automático deste momento está ligado no js/config.js? */
function avisoLigado(loja, evento) {
  const a = (loja && loja.config && loja.config.avisos) || {};
  if (a.ligado === false) return false;
  return !(a.eventos && a.eventos[evento] === false);
}

/* Pagamento aprovado no Mercado Pago (webhook ou consulta do checkout):
   acha o pedido, confirma (uma vez só) e avisa o cliente — o aviso sai
   só para quem FEZ a confirmação, para não sair duas vezes. */
async function processarPagamentoAprovado(pagamento, req) {
  const achado = await acharPedidoDoPagamento(pagamento);
  if (!achado) {
    console.warn(`[pedidos] Pagamento ${pagamento.id} aprovado, mas o pedido não foi encontrado no banco.`);
    return { confirmado: false, motivo: "pedido-nao-encontrado" };
  }
  const r = await confirmarPagamento({ uid: achado.uid, codigo: achado.codigo, pagamento });
  if (r.divergente) {
    console.error(`[pedidos] Pedido ${achado.codigo}: pagou ${r.pago}, mas o total é ${r.esperado}. Confirmação automática cancelada.`);
  }
  if (r.confirmado && !r.jaEstava) {
    const loja = await carregarLoja().catch(() => null);
    if (avisoLigado(loja, "pago")) {
      const aviso = await enviarAvisoPedido({ uid: achado.uid, codigo: achado.codigo, evento: "pago", loja: dadosLoja(req) })
        .catch(e => ({ ok: false, erro: String(e && e.message || e) }));
      if (!aviso || !aviso.enviado) {
        console.warn(`[pedidos] Pedido ${achado.codigo} confirmado, mas o aviso ao cliente não saiu:`, JSON.stringify(aviso));
      }
    }
  }
  return r;
}

module.exports = {
  processarPagamentoAprovado,
  ErroPedido, prepararPedido, gravarPedido, desfazerPedido, confirmarPagamento, declararPagamento,
  acharPedidoDoPagamento, avisoLigado,
  // expostos para os testes
  lerItens, lerCliente, calcularTotais, unidadesBloqueadas, aposReserva, aposBaixa, montarEmailLojista
};
