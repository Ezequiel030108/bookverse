/* ============================================================
   BOOKVERSE — API: WEBHOOK DO MERCADO PAGO
   ------------------------------------------------------------
   É AQUI que a mágica acontece: o Mercado Pago chama esta URL
   quando o status de um pagamento muda. Quando o pagamento está
   "approved" (o dinheiro CAIU), enviamos o e-mail do pedido.

   Ou seja: o e-mail chega no momento em que o Pix entra na conta
   — não antes, e mesmo que o cliente feche o navegador.

   Segurança: não confiamos cegamente no aviso. Sempre
   consultamos o pagamento direto no Mercado Pago (com o token
   secreto) antes de enviar qualquer e-mail. Se você configurar a
   assinatura (MP_WEBHOOK_SECRET), também validamos a origem.

   Sem duplicados: o Mercado Pago pode avisar o MESMO pagamento
   várias vezes (eventos repetidos, reenvios quando a resposta
   demora). Antes de enviar o e-mail, gravamos no Firestore que
   aquele pagamento já foi avisado — só o primeiro aviso passa;
   os repetidos são ignorados em silêncio.

   Segredos (firebase functions:secrets:set):
     - MP_ACCESS_TOKEN    → Access Token do Mercado Pago (secreto)
     - WEB3FORMS_KEY      → sua chave do Web3Forms (envio do e-mail)
     - MP_WEBHOOK_SECRET  → "assinatura secreta" da tela de Webhooks
                            do Mercado Pago. Para DESATIVAR a
                            validação, cadastre apenas o valor "-".
   ============================================================ */

const crypto = require("crypto");
const admin = require("firebase-admin");
const MP_API = "https://api.mercadopago.com";
const { aplicarHeaders } = require("./_seguranca");

function firestore() {
  if (!admin.apps.length) admin.initializeApp();
  return admin.firestore();
}

/* Tenta "reivindicar" o envio do e-mail deste pagamento criando um
   documento cujo ID é o ID do pagamento. O create() do Firestore é
   atômico: só a PRIMEIRA chamada consegue criar; as repetidas falham
   com ALREADY_EXISTS e devolvemos false (e-mail já foi enviado).
   Se o Firestore der qualquer OUTRO erro, devolvemos true mesmo
   assim: entre arriscar um e-mail duplicado e perder o aviso de um
   pedido pago, o duplicado é o mal menor. */
async function reivindicarEnvio(pagamento) {
  try {
    await firestore().collection("emails_enviados").doc(String(pagamento.id)).create({
      pedido: pagamento.external_reference || "",
      valor: pagamento.transaction_amount || null,
      criadoEm: admin.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (e) {
    const codigo = e && e.code;
    if (codigo === 6 || codigo === "already-exists") return false;
    return true;
  }
}

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

async function enviarEmail(pagamento) {
  const key = process.env.WEB3FORMS_KEY;
  if (!key) return; // e-mail desligado

  const meta = pagamento.metadata || {};
  let pedido = null;
  if (meta.pedido_json) {
    try { pedido = JSON.parse(meta.pedido_json); } catch (e) { pedido = null; }
  }
  if (!pedido) {
    // Fallback mínimo caso o pedido não tenha vindo na cobrança.
    const ref = pagamento.external_reference || pagamento.id;
    pedido = {
      subject: `Pagamento confirmado — pedido ${ref}`,
      message:
        `Pagamento Pix APROVADO.\n` +
        `Código: ${pagamento.external_reference || ""}\n` +
        `Valor: R$ ${pagamento.transaction_amount}\n` +
        `ID Mercado Pago: ${pagamento.id}`
    };
  }

  /* Conferência de valor: o total do pedido é calculado no navegador do
     cliente, então NUNCA confiamos só nele. Comparamos com o valor que o
     Mercado Pago diz ter recebido de verdade e avisamos se for diferente. */
  const recebido = Number(pagamento.transaction_amount);
  const esperado = Number(meta.total_esperado);
  const divergente = isFinite(recebido) && isFinite(esperado) &&
    Math.abs(recebido - esperado) > 0.01;

  pedido["Valor recebido (Mercado Pago)"] = "R$ " + (isFinite(recebido) ? recebido.toFixed(2).replace(".", ",") : "?");
  if (pedido.message) {
    pedido.message += `\n\n💰 Valor RECEBIDO no Mercado Pago: R$ ${isFinite(recebido) ? recebido.toFixed(2).replace(".", ",") : "?"}`;
    if (divergente) {
      pedido.message += `\n⚠️ ATENÇÃO: o valor recebido é DIFERENTE do total do pedido (esperado: R$ ${esperado.toFixed(2).replace(".", ",")}). Confira antes de entregar!`;
    }
  }

  pedido.access_key = key;
  const base = pedido.subject || ("pedido " + (pagamento.external_reference || pagamento.id));
  pedido.subject = divergente
    ? `⚠️ VALOR DIVERGENTE — ${base}`
    : `✅ PAGO — ${base}`;

  await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(pedido)
  });
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
      res.status(401).json({ error: "Assinatura inválida." });
      return;
    }

    // Fonte da verdade: consulta o pagamento direto no Mercado Pago.
    const r = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const pagamento = await r.json();
    if (!r.ok) { res.status(200).json({ ok: true }); return; }

    // E-mail UMA vez por pagamento: só o aviso que conseguir "reivindicar"
    // o envio no Firestore manda o e-mail; os repetidos são ignorados.
    if (pagamento.status === "approved" && process.env.WEB3FORMS_KEY && await reivindicarEnvio(pagamento)) {
      try {
        await enviarEmail(pagamento);
      } catch (e) {
        // O envio falhou depois da trava: solta a trava para que um
        // próximo aviso do Mercado Pago possa tentar de novo.
        await firestore().collection("emails_enviados").doc(String(pagamento.id)).delete().catch(() => {});
        throw e;
      }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    // Loga no Cloud Logging, mas responde 200 para evitar reenvios em loop.
    res.status(200).json({ ok: true });
  }
};
