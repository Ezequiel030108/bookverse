/* ============================================================
   BOOKVERSE — API: WEBHOOK DO MERCADO PAGO
   ------------------------------------------------------------
   O Mercado Pago chama esta URL quando o status de um pagamento
   muda. Aqui apenas validamos e confirmamos o pagamento na fonte
   (consultando o Mercado Pago com o token secreto) e respondemos
   200 para o MP não reenviar em loop.

   DUAS COISAS ACONTECEM QUANDO O PIX CAI:

     1. O PEDIDO VIRA "PAGO" no banco, sozinho. O cliente vê a
        mudança na hora em "Minha conta", mesmo sem tocar em nada.

     2. O CLIENTE RECEBE O AVISO de "pagamento confirmado" (e-mail
        e/ou WhatsApp da loja). É o mesmo aviso do painel — quem
        monta é o api/_notificar.js.

   POR QUE O AVISO AO LOJISTA (Web3Forms) NÃO SAI DAQUI: o
   Web3Forms fica atrás de um desafio anti-bot do Cloudflare que
   barra requisições de servidor — as Cloud Functions saem por IPs
   de datacenter e recebem a página "Just a moment..." (HTTP 403).
   Só o NAVEGADOR do cliente passa. Por isso o aviso ao LOJISTA é
   disparado pelo próprio navegador: no checkout, ao confirmar o
   Pix (js/checkout.js), e como rede de recuperação na página
   "Minha conta" (js/conta.js). Já o aviso ao CLIENTE usa Resend/
   Brevo e a API da Meta, que aceitam chamadas de servidor.

   Segredos (firebase functions:secrets:set):
     - MP_ACCESS_TOKEN    → Access Token do Mercado Pago (secreto)
     - MP_WEBHOOK_SECRET  → "assinatura secreta" da tela de Webhooks
                            do Mercado Pago. Para DESATIVAR a
                            validação, cadastre apenas o valor "-".
     - RESEND_API_KEY / BREVO_API_KEY / WHATSAPP_* → os avisos ao
                            cliente (veja o README).
   ============================================================ */

const crypto = require("crypto");
const MP_API = "https://api.mercadopago.com";
const { aplicarHeaders } = require("./_seguranca");
const { dadosLoja } = require("./_loja");
const { enviarAvisoPedido } = require("./_notificar");
const dados = require("./_dados");

function lerBody(req) {
  let b = req.body;
  if (typeof b === "string") {
    try { b = JSON.parse(b); } catch (e) { b = {}; }
  }
  return b || {};
}

/* Validação da assinatura do Mercado Pago (cabeçalho x-signature). */
function assinaturaValida(req, secret, dataId) {
  const sig = req.headers["x-signature"];
  const reqId = req.headers["x-request-id"];
  if (!sig) return false;

  const partes = {};
  String(sig).split(",").forEach(par => {
    const i = par.indexOf("=");
    if (i > 0) partes[par.slice(0, i).trim()] = par.slice(i + 1).trim();
  });
  const ts = partes.ts, v1 = partes.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${reqId};ts:${ts};`;
  const esperado = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(v1));
  } catch (e) {
    return false;
  }
}

/* ------------------------------------------------------------
   Acha o pedido no banco a partir do pagamento do Mercado Pago.
   Duas tentativas, da mais barata para a mais cara:
     1. pelo uid + código guardados no metadata da cobrança
        (api/criar-pix.js grava os dois);
     2. procurando o pagamentoId em todos os pedidos — precisa do
        índice de "collection group" no campo pagamentoId (o
        README explica; sem ele, esta busca falha em silêncio e a
        opção 1 já resolve o caso normal).
   ------------------------------------------------------------ */
async function acharPedido(pagamento) {
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
    if (achado && achado._uid) {
      return { uid: achado._uid, codigo: achado.codigo || codigo, pedido: achado };
    }
  } catch (e) {
    console.warn("[webhook-mp] Busca por pagamentoId falhou (falta o índice de collection group?):", e.message);
  }

  return null;
}

/* Marca o pedido como pago e avisa o cliente. Tudo em "melhor
   esforço": se algo falhar, o webhook ainda responde 200 e o
   painel da loja continua podendo confirmar na mão. */
async function confirmarPedido(pagamento, req) {
  const achado = await acharPedido(pagamento);
  if (!achado) {
    console.warn(`[webhook-mp] Pagamento ${pagamento.id} aprovado, mas o pedido não foi encontrado no banco (compra sem conta?).`);
    return;
  }
  const { uid, codigo, pedido } = achado;

  // Pagou menos do que devia? Não confirma sozinho — deixa para a
  // loja olhar. (O valor esperado é gravado no metadata da cobrança.)
  const esperado = Number((pagamento.metadata || {}).total_esperado || 0);
  const pago = Number(pagamento.transaction_amount || 0);
  if (esperado && pago && pago + 0.01 < esperado) {
    console.error(`[webhook-mp] Pedido ${codigo}: pagou ${pago} mas o total é ${esperado}. Confirmação automática cancelada.`);
    await dados.atualizarPedido(uid, codigo, { pagamentoDivergente: true, pagamentoValor: pago }).catch(() => {});
    return;
  }

  // Já estava pago/entregue? Então só o aviso interessa (e ele
  // mesmo se protege de repetir).
  if (pedido.status !== "pago" && pedido.status !== "entregue" && pedido.status !== "enviado") {
    await dados.atualizarPedido(uid, codigo, {
      status: "pago",
      pagoEm: Date.now(),
      pagamentoId: String(pagamento.id)
    }).catch(e => console.error("[webhook-mp] Não deu para marcar o pedido como pago:", e));
  }

  const aviso = await enviarAvisoPedido({
    uid, codigo, evento: "pago", loja: dadosLoja(req)
  });
  if (aviso && aviso.jaEnviado) return;
  if (!aviso || !aviso.enviado) {
    console.warn(`[webhook-mp] Pedido ${codigo} confirmado, mas o aviso ao cliente não saiu:`,
      JSON.stringify({ email: aviso && aviso.email, whatsapp: aviso && aviso.whatsapp }));
  }
}

module.exports = async (req, res) => {
  aplicarHeaders(res);
  // O Mercado Pago às vezes faz um GET de teste.
  if (req.method === "GET") { res.status(200).json({ ok: true }); return; }
  if (req.method !== "POST") { res.status(405).end(); return; }

  const token = process.env.MP_ACCESS_TOKEN;
  // Sempre respondemos 200 para o MP não reenviar infinitamente.
  if (!token) { res.status(200).json({ ok: true }); return; }

  try {
    const body = lerBody(req);
    const q = req.query || {};
    const tipo = body.type || q.type || q.topic;
    const paymentId = (body.data && body.data.id) || q["data.id"] || q.id;

    // Só nos interessa notificação de pagamento.
    if (tipo && tipo !== "payment") { res.status(200).json({ ok: true }); return; }
    if (!paymentId) { res.status(200).json({ ok: true }); return; }

    // Valida a origem, se houver segredo configurado.
    // (No Firebase o segredo sempre existe no Secret Manager; o valor "-"
    //  significa "validação desligada".)
    const secret = String(process.env.MP_WEBHOOK_SECRET || "").trim();
    if (secret && secret !== "-" && !assinaturaValida(req, secret, paymentId)) {
      console.error(`[webhook-mp] Assinatura inválida na notificação do pagamento ${paymentId}. Confira o MP_WEBHOOK_SECRET (ou cadastre "-" para desativar a validação).`);
      res.status(401).json({ error: "Assinatura inválida." });
      return;
    }

    // Fonte da verdade: confirma o pagamento direto no Mercado Pago.
    // Nunca confiamos no corpo da notificação — só no que a API diz.
    const r = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!r.ok) { res.status(200).json({ ok: true }); return; }
    const pagamento = await r.json();

    // Dinheiro na conta: marca o pedido como pago e avisa o cliente.
    if (pagamento && pagamento.status === "approved") {
      try {
        await confirmarPedido(pagamento, req);
      } catch (e) {
        // Melhor esforço: o painel da loja sempre pode confirmar na mão.
        console.error("[webhook-mp] Falha ao confirmar o pedido / avisar o cliente:", e);
      }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    // Loga no Cloud Logging, mas responde 200 para evitar reenvios em loop.
    console.error("[webhook-mp] Erro ao processar a notificação:", e);
    res.status(200).json({ ok: true });
  }
};
