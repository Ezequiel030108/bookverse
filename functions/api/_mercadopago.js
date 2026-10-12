/* ============================================================
   BOOKVERSE — CONVERSA COM O MERCADO PAGO
   ------------------------------------------------------------
   As duas únicas chamadas que a loja faz ao Mercado Pago, num
   lugar só (antes estavam copiadas em três arquivos):
     • criar a cobrança Pix de um pedido;
     • consultar um pagamento (a fonte da verdade do "já caiu?").

   Segredo (firebase functions:secrets:set MP_ACCESS_TOKEN).
   MP_API_URL só existe para os testes locais (simulador).

   Arquivos com "_" no início NÃO viram rotas (functions/index.js).
   ============================================================ */

function apiBase() {
  return String(process.env.MP_API_URL || "https://api.mercadopago.com").replace(/\/+$/, "");
}

function token() {
  return String(process.env.MP_ACCESS_TOKEN || "").trim();
}

function configurado() {
  return !!token();
}

/* Cria a cobrança Pix. O valor é SEMPRE o que o servidor calculou
   (api/pedido.js) — nunca um número vindo do navegador. */
async function criarCobrancaPix({ codigo, total, descricao, pagador, uid, notificationUrl }) {
  const valor = Math.round(Number(total) * 100) / 100;
  const r = await fetch(apiBase() + "/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token(),
      "Content-Type": "application/json",
      "X-Idempotency-Key": codigo
    },
    body: JSON.stringify({
      transaction_amount: valor,
      description: String(descricao || "Pedido").slice(0, 250),
      payment_method_id: "pix",
      external_reference: codigo,
      notification_url: notificationUrl,
      payer: {
        email: (pagador && pagador.email) || "sem-email@bookverse.app",
        first_name: (pagador && pagador.nome) || undefined
      },
      // O webhook usa estes dados para achar o pedido e conferir o valor.
      metadata: Object.assign(
        { total_esperado: valor, codigo_pedido: codigo },
        uid ? { uid_cliente: uid } : {}
      )
    }),
    signal: AbortSignal.timeout(15000)
  });
  let data = null;
  try { data = await r.json(); } catch (e) { /* resposta sem JSON */ }
  if (!r.ok || !data || !data.id) {
    console.error("[mercadopago] Falha ao criar a cobrança:", r.status, JSON.stringify(data));
    throw new Error("Falha ao criar o Pix no Mercado Pago.");
  }
  const tx = (data.point_of_interaction && data.point_of_interaction.transaction_data) || {};
  return {
    id: String(data.id),
    status: data.status,
    qr_code: tx.qr_code || "",
    qr_code_base64: tx.qr_code_base64 || "",
    ticket_url: tx.ticket_url || ""
  };
}

/* Consulta um pagamento. Devolve null se não existir ou se a
   consulta falhar. */
async function consultarPagamento(id) {
  const limpo = String(id || "").trim();
  if (!/^\d{1,20}$/.test(limpo)) return null;
  const r = await fetch(apiBase() + "/v1/payments/" + limpo, {
    headers: { "Authorization": "Bearer " + token() },
    signal: AbortSignal.timeout(10000)
  });
  if (!r.ok) return null;
  return r.json();
}

module.exports = { configurado, criarCobrancaPix, consultarPagamento };
