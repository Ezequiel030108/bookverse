/* ============================================================
   BOOKVERSE — E-MAIL DO PEDIDO PAGO (uso interno do servidor)
   ------------------------------------------------------------
   Monta e envia o e-mail que avisa o lojista quando um Pix do
   Mercado Pago é APROVADO. Este código morava dentro do
   api/webhook-mp.js; virou módulo compartilhado para que DUAS
   rotas possam disparar o aviso:

     - api/webhook-mp.js → quando o Mercado Pago notifica; e
     - api/status-pix.js → quando o checkout (ou a página "Minha
       conta") consulta o status e vê "approved". É a rede de
       segurança para o caso de o webhook falhar ou nunca chegar.

   Sem duplicados: antes de enviar, gravamos no Firestore que o
   pagamento já foi avisado (create() atômico). Não importa quem
   chegue primeiro — webhook ou consulta de status — só o
   primeiro envia; os demais são ignorados em silêncio.

   Envio confirmado de verdade: o Web3Forms responde JSON com
   "success". Se ele recusar (limite do plano, chave errada,
   payload inválido), consideramos FALHA, soltamos a trava e
   deixamos registrado no log — assim a próxima notificação ou
   consulta de status tenta de novo, e o pedido não se perde
   em silêncio.

   Segredo usado (firebase functions:secrets:set):
     - WEB3FORMS_KEY → chave do Web3Forms (envio do e-mail)
   ============================================================ */

const admin = require("firebase-admin");

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

/* Solta a trava quando o envio falha, para a próxima tentativa passar. */
async function soltarTrava(pagamento) {
  await firestore().collection("emails_enviados").doc(String(pagamento.id)).delete().catch(() => {});
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

  const r = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(pedido)
  });

  /* O Web3Forms responde 200 com {success:true} quando aceita. Qualquer
     outra coisa (limite do plano, chave inválida, payload recusado) é
     FALHA de verdade — sinalizamos para soltar a trava e tentar de novo. */
  let corpo = null;
  try { corpo = await r.json(); } catch (e) { /* resposta sem JSON */ }
  if (!r.ok || !corpo || corpo.success !== true) {
    const motivo = (corpo && corpo.message) || `HTTP ${r.status}`;
    throw new Error(`Web3Forms recusou o e-mail do pedido: ${motivo}`);
  }
}

/* Ponto de entrada: dispara o e-mail do pedido UMA vez por pagamento
   aprovado. Seguro de chamar quantas vezes for preciso (webhook e
   status-pix chamam sem se coordenar). Nunca lança erro — falhas vão
   para o Cloud Logging e a trava é solta para a próxima tentativa. */
async function avisarPedidoPago(pagamento) {
  if (!pagamento || pagamento.status !== "approved") return;
  if (!process.env.WEB3FORMS_KEY) return;          // e-mail desligado
  if (!(await reivindicarEnvio(pagamento))) return; // já enviado

  try {
    await enviarEmail(pagamento);
  } catch (e) {
    // O envio falhou depois da trava: solta a trava para que a
    // próxima notificação ou consulta de status tente de novo.
    await soltarTrava(pagamento);
    console.error(`[email-pedido] Falha ao enviar o e-mail do pagamento ${pagamento.id} (pedido ${pagamento.external_reference || "?"}):`, e);
  }
}

module.exports = { avisarPedidoPago };
