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
const { aplicarHeaders } = require("./_seguranca");
const mp = require("./_mercadopago");
const { processarPagamentoAprovado } = require("./_pedidos");

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

module.exports = async (req, res) => {
  aplicarHeaders(res);
  // O Mercado Pago às vezes faz um GET de teste.
  if (req.method === "GET") { res.status(200).json({ ok: true }); return; }
  if (req.method !== "POST") { res.status(405).end(); return; }

  // Sempre respondemos 200 para o MP não reenviar infinitamente.
  if (!mp.configurado()) { res.status(200).json({ ok: true }); return; }

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
    const pagamento = await mp.consultarPagamento(paymentId);
    if (!pagamento) { res.status(200).json({ ok: true }); return; }

    // Dinheiro na conta: marca o pedido como pago, dá baixa no estoque
    // e avisa o cliente (api/_pedidos.js).
    if (pagamento.status === "approved") {
      try {
        await processarPagamentoAprovado(pagamento, req);
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
