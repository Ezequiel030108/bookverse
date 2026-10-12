/* ============================================================
   BOOKVERSE — API: FECHAR UM PEDIDO
   ------------------------------------------------------------
   É aqui que o pedido nasce. O navegador diz O QUE o cliente quer
   comprar; o PREÇO, o total e o valor do Pix são calculados aqui
   (veja api/_pedidos.js para o porquê).

     POST /api/pedido
     Authorization: Bearer <idToken do Firebase>
     {
       "itens": [{ "id": "1984-george-orwell", "qty": 1 }],
       "pagamento": "pix" | "dinheiro",
       "entrega": "combinar",
       "presente": false, "presenteMsg": "",
       "cliente": { "nome": "...", "email": "...", "telefone": "...", "instagram": "" },
       "endereco": "", "observacoes": "", "origem": "",
       "totalVisto": 25
     }
     → { codigo, status, total, ..., qr_code, qr_code_base64, ticket_url,
         pix, emailBody }

   Respostas de erro trazem { error } com a mensagem para o cliente
   e, quando faz sentido, { indisponiveis } (livros que acabaram) ou
   { totalAtualizado } (o total mudou — o cliente confere e confirma).

   Pix manual — o cliente avisa que pagou:
     POST /api/pedido   { "acao": "ja-paguei", "codigo": "BV..." }
   ============================================================ */

const { aplicarHeaders, usuarioDoToken, baseConfiavel } = require("./_seguranca");
const { carregarLoja } = require("./_site");
const { dadosLoja } = require("./_loja");
const { enviarAvisoPedido } = require("./_notificar");
const dados = require("./_dados");
const mp = require("./_mercadopago");
const P = require("./_pedidos");

function lerBody(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b && typeof b === "object" ? b : {};
}

/* "Recebemos seu pedido" para o cliente. Nunca trava a compra: se o
   envio demorar ou falhar, o pedido segue e o painel pode reenviar. */
async function avisarRecebido(uid, codigo, loja, req) {
  if (!P.avisoLigado(loja, "recebido")) return;
  try {
    await Promise.race([
      enviarAvisoPedido({ uid, codigo, evento: "recebido", loja: dadosLoja(req) }),
      new Promise(resolve => setTimeout(resolve, 6000))
    ]);
  } catch (e) {
    console.warn(`[pedido] Aviso "recebido" do pedido ${codigo} não saiu:`, e && e.message);
  }
}

module.exports = async (req, res) => {
  aplicarHeaders(res);
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido." }); return; }

  const usuario = await usuarioDoToken(req);
  if (!usuario) { res.status(401).json({ error: "Entre na sua conta para finalizar o pedido." }); return; }
  const uid = usuario.uid;
  const corpo = lerBody(req);

  try {
    if (corpo.acao === "ja-paguei") {
      const p = await P.declararPagamento({ uid, codigo: String(corpo.codigo || "").slice(0, 40) });
      res.status(200).json({ codigo: p.codigo, status: p.status });
      return;
    }

    const loja = await carregarLoja({ fresco: true });
    const { pedido, linhas, pixMercadoPago } = await P.prepararPedido({ uid, corpo, loja });
    if (pixMercadoPago && !mp.configurado()) {
      throw new P.ErroPedido(503, "O pagamento por Pix está indisponível agora. Tente de novo mais tarde.");
    }

    // 1) Grava o pedido e separa os livros (confere o estoque de novo).
    await P.gravarPedido({ uid, pedido, linhas });

    // 2) Pix pelo Mercado Pago: cobra o valor que o SERVIDOR calculou.
    let cobranca = null;
    if (pixMercadoPago) {
      try {
        cobranca = await mp.criarCobrancaPix({
          codigo: pedido.codigo,
          total: pedido.total,
          descricao: `Pedido ${pedido.codigo} - ${loja.config.nomeLoja || "BookVerse"}`,
          pagador: { email: pedido.cliente.email, nome: pedido.cliente.nome },
          uid,
          notificationUrl: baseConfiavel(req) + "/api/webhook-mp"
        });
      } catch (e) {
        // Sem cobrança, o pedido não vale: devolve os livros para a loja.
        await P.desfazerPedido({ uid, pedido, linhas })
          .catch(err => console.error("[pedido] Não deu para desfazer o pedido " + pedido.codigo + ":", err));
        throw new P.ErroPedido(502, "Não foi possível gerar o Pix agora. Tente novamente em instantes.");
      }
      await dados.atualizarPedido(uid, pedido.codigo, {
        pagamentoId: cobranca.id,
        pix: cobranca.qr_code,
        pixUrl: cobranca.ticket_url
      });
    }

    await avisarRecebido(uid, pedido.codigo, loja, req);

    res.status(200).json({
      codigo: pedido.codigo,
      status: pedido.status,
      total: pedido.total,
      subtotal: pedido.subtotal,
      frete: pedido.frete,
      presente: pedido.presenteValor,
      pagamentoId: cobranca ? cobranca.id : "",
      qr_code: cobranca ? cobranca.qr_code : "",
      qr_code_base64: cobranca ? cobranca.qr_code_base64 : "",
      ticket_url: cobranca ? cobranca.ticket_url : "",
      pix: cobranca ? cobranca.qr_code : pedido.pix,
      emailBody: pedido.emailBody
    });
  } catch (e) {
    if (e instanceof P.ErroPedido) {
      res.status(e.status).json(Object.assign({ error: e.message }, e.extra));
      return;
    }
    console.error("[pedido] Falha ao fechar o pedido:", e);
    res.status(500).json({ error: "Não foi possível concluir o pedido agora. Tente novamente." });
  }
};
