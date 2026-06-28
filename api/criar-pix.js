/* ============================================================
   BOOKVERSE — API: CRIAR COBRANÇA PIX (Mercado Pago)
   ------------------------------------------------------------
   Cria um pagamento Pix no Mercado Pago e devolve o QR Code e o
   "Pix Copia e Cola" para o checkout mostrar ao cliente.

   Guardamos os dados do pedido (o corpo do e-mail) dentro da
   própria cobrança (metadata). Assim, quando o pagamento for
   confirmado, o servidor (api/webhook-mp.js) tem tudo o que
   precisa para te enviar o e-mail — SÓ depois que o dinheiro cai.

   Variáveis de ambiente (configure na Vercel, NÃO no código):
     - MP_ACCESS_TOKEN  → Access Token do Mercado Pago (secreto)
   ============================================================ */

const MP_API = "https://api.mercadopago.com";

function lerBody(req) {
  let b = req.body;
  if (typeof b === "string") {
    try { b = JSON.parse(b); } catch (e) { b = {}; }
  }
  return b || {};
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    res.status(500).json({ error: "MP_ACCESS_TOKEN não configurado na Vercel." });
    return;
  }

  try {
    const body = lerBody(req);
    const valor = Number(body.valor);
    const codigo = String(body.codigo || "").trim();
    const descricao = String(body.descricao || "Pedido").slice(0, 250);
    const pagador = body.pagador || {};
    const emailPedido = body.emailPedido || null; // corpo do e-mail (sem access_key)

    if (!valor || valor <= 0 || !codigo) {
      res.status(400).json({ error: "Dados do pedido inválidos." });
      return;
    }

    // URL pública para o Mercado Pago avisar quando o Pix cair.
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const notificationUrl = `https://${host}/api/webhook-mp`;

    const pagamento = {
      transaction_amount: Math.round(valor * 100) / 100,
      description: descricao,
      payment_method_id: "pix",
      external_reference: codigo,
      notification_url: notificationUrl,
      payer: {
        email: pagador.email || "sem-email@bookverse.app",
        first_name: pagador.nome || undefined
      },
      // Guardado como string para o Mercado Pago não mexer nas chaves.
      metadata: emailPedido ? { pedido_json: JSON.stringify(emailPedido) } : {}
    };

    const r = await fetch(`${MP_API}/v1/payments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": codigo
      },
      body: JSON.stringify(pagamento)
    });

    const data = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: "Falha ao criar o Pix no Mercado Pago.", detalhe: data });
      return;
    }

    const tx = (data.point_of_interaction && data.point_of_interaction.transaction_data) || {};
    res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: tx.qr_code || "",
      qr_code_base64: tx.qr_code_base64 || "",
      ticket_url: tx.ticket_url || ""
    });
  } catch (e) {
    res.status(500).json({ error: "Erro interno ao gerar o Pix." });
  }
};
