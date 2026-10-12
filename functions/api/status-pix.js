/* ============================================================
   BOOKVERSE — API: STATUS DO PIX (Mercado Pago)
   ------------------------------------------------------------
   O checkout chama isto de tempos em tempos ("já caiu?") para
   mostrar "Pagamento confirmado!" sozinho assim que o cliente
   paga, sem precisar recarregar a página.

   Quando o pagamento aparece como aprovado, o pedido é confirmado
   AQUI MESMO (status "pago" + baixa no estoque + aviso ao cliente),
   igual ao webhook — uma rede de segurança caso o webhook atrase.

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

const { aplicarHeaders } = require("./_seguranca");
const mp = require("./_mercadopago");
const { processarPagamentoAprovado } = require("./_pedidos");

module.exports = async (req, res) => {
  aplicarHeaders(res);
  if (req.method !== "GET") { res.status(405).json({ error: "Método não permitido." }); return; }

  if (!mp.configurado()) {
    res.status(500).json({ error: "Serviço de pagamento indisponível." });
    return;
  }

  const id = String((req.query && req.query.id) || "").trim();
  if (!/^\d{1,20}$/.test(id)) {
    res.status(400).json({ error: "Parâmetro 'id' ausente ou inválido." });
    return;
  }

  try {
    const pagamento = await mp.consultarPagamento(id);
    if (!pagamento) {
      res.status(502).json({ error: "Falha ao consultar o pagamento." });
      return;
    }

    // Caiu? Confirma o pedido AQUI, no servidor (o mesmo que o webhook
    // faz). Se o webhook do Mercado Pago atrasar ou falhar, o pedido vira
    // "pago" assim mesmo — e o navegador nunca precisa gravar o status.
    if (pagamento.status === "approved") {
      try { await processarPagamentoAprovado(pagamento, req); }
      catch (e) { console.error("[status-pix] Falha ao confirmar o pedido:", e); }
    }

    res.status(200).json({
      id: pagamento.id,
      status: pagamento.status,             // pending | approved | rejected | cancelled ...
      status_detail: pagamento.status_detail
    });
  } catch (e) {
    res.status(500).json({ error: "Erro ao consultar o status." });
  }
};
