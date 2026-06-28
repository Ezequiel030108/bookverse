/* ============================================================
   BOOKVERSE — API: STATUS DO PIX (Mercado Pago)
   ------------------------------------------------------------
   O checkout chama isto de tempos em tempos ("já caiu?") para
   mostrar "Pagamento confirmado!" sozinho assim que o cliente
   paga, sem precisar recarregar a página.

   Uso: GET /api/status-pix?id=<id_do_pagamento>

   Variáveis de ambiente (na Vercel):
     - MP_ACCESS_TOKEN  → Access Token do Mercado Pago (secreto)
   ============================================================ */

const MP_API = "https://api.mercadopago.com";

module.exports = async (req, res) => {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    res.status(500).json({ error: "MP_ACCESS_TOKEN não configurado." });
    return;
  }

  const id = (req.query && (req.query.id || req.query["id"])) || "";
  if (!id) {
    res.status(400).json({ error: "Parâmetro 'id' ausente." });
    return;
  }

  try {
    const r = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(id)}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: "Falha ao consultar o pagamento." });
      return;
    }
    res.status(200).json({
      id: data.id,
      status: data.status,             // pending | approved | rejected | cancelled ...
      status_detail: data.status_detail
    });
  } catch (e) {
    res.status(500).json({ error: "Erro ao consultar o status." });
  }
};
