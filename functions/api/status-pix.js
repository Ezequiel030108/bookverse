/* ============================================================
   BOOKVERSE — API: STATUS DO PIX (Mercado Pago)
   ------------------------------------------------------------
   O checkout chama isto de tempos em tempos ("já caiu?") para
   mostrar "Pagamento confirmado!" sozinho assim que o cliente
   paga, sem precisar recarregar a página.

   REDE DE SEGURANÇA DO E-MAIL: se a consulta mostra o pagamento
   "approved", disparamos daqui o mesmo e-mail de pedido que o
   api/webhook-mp.js envia. A trava no Firestore (dentro de
   ./_email-pedido.js) garante que só UM e-mail sai — não importa
   se o webhook ou esta consulta chegou primeiro. Assim, mesmo
   que o webhook do Mercado Pago falhe ou nunca chegue, o aviso
   do pedido pago não se perde: basta o checkout (ou a página
   "Minha conta") consultar o status.

   Uso: GET /api/status-pix?id=<id_do_pagamento>

   Segredos (firebase functions:secrets:set):
     - MP_ACCESS_TOKEN  → Access Token do Mercado Pago (secreto)
     - WEB3FORMS_KEY    → chave do Web3Forms (envio do e-mail)
   ============================================================ */

const MP_API = "https://api.mercadopago.com";
const { aplicarHeaders } = require("./_seguranca");
const { avisarPedidoPago } = require("./_email-pedido");

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

    // Pagamento aprovado → garante o e-mail do pedido (uma vez só;
    // se o webhook já enviou, isto não faz nada). Falhas não derrubam
    // a consulta: ficam no log e a próxima consulta tenta de novo.
    await avisarPedidoPago(data);

    res.status(200).json({
      id: data.id,
      status: data.status,             // pending | approved | rejected | cancelled ...
      status_detail: data.status_detail
    });
  } catch (e) {
    res.status(500).json({ error: "Erro ao consultar o status." });
  }
};
