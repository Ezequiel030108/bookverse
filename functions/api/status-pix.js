/* ============================================================
   BOOKVERSE — API: STATUS DO PIX (Mercado Pago)
   ------------------------------------------------------------
   O checkout chama isto de tempos em tempos ("já caiu?") para
   mostrar "Pagamento confirmado!" sozinho assim que o cliente
   paga, sem precisar recarregar a página.

   E-MAIL DO PEDIDO: NÃO é enviado daqui. O Web3Forms fica atrás
   de um desafio anti-bot do Cloudflare que barra requisições de
   servidor (as Cloud Functions saem por IPs de datacenter e caem
   na página "Just a moment..."). Só o NAVEGADOR do cliente passa,
   então o aviso ao lojista é disparado pelo próprio navegador —
   no checkout, ao confirmar o Pix (js/checkout.js), e como rede de
   recuperação na página "Minha conta" (js/conta.js). Este endpoint
   apenas informa o status do pagamento.

   Uso: GET /api/status-pix?id=<id_do_pagamento>

   Segredos (firebase functions:secrets:set):
     - MP_ACCESS_TOKEN  → Access Token do Mercado Pago (secreto)
   ============================================================ */

const MP_API = "https://api.mercadopago.com";
const { aplicarHeaders } = require("./_seguranca");

module.exports = async (req, res) => {
  aplicarHeaders(res);
  if (req.method !== "GET") { res.status(405).json({ error: "Método não permitido." }); return; }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    res.status(500).json({ error: "Serviço de pagamento indisponível." });
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
