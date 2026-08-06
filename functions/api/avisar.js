/* ============================================================
   BOOKVERSE — API: AVISAR O CLIENTE SOBRE O PEDIDO
   ------------------------------------------------------------
   É o endpoint que manda o e-mail (e o WhatsApp) para o CLIENTE
   em cada momento do pedido:

     recebido  → "recebemos seu pedido"
     pago      → "pagamento confirmado ✓"
     enviado   → "saiu para entrega 🚚"
     entregue  → "entregue, boa leitura 📚"
     cancelado → "seu pedido foi cancelado"

   COMO CHAMAR (o site já faz isso sozinho):
     POST /api/avisar
     Authorization: Bearer <idToken do Firebase>
     { "evento": "pago", "uid": "...", "codigo": "BV12AB34" }

   QUEM PODE CHAMAR:
     • o próprio cliente, para os pedidos DELE;
     • qualquer administrador da loja, para qualquer pedido.

   NÃO MANDA DUAS VEZES: cada aviso enviado fica marcado no
   pedido (campo "avisos"). Chamar de novo não incomoda o cliente
   — a não ser que você peça "forcar": true (o botão "Reenviar"
   do painel).

   Quem monta e envia de verdade é o api/_notificar.js — o mesmo
   motor que o webhook do Mercado Pago usa quando o Pix cai.
   ============================================================ */

const { aplicarHeaders, usuarioDoToken, ehAdmin } = require("./_seguranca");
const { dadosLoja } = require("./_loja");
const { EVENTOS } = require("./_avisos");
const { enviarAvisoPedido } = require("./_notificar");

function lerBody(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b || {};
}

module.exports = async (req, res) => {
  aplicarHeaders(res);
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido." }); return; }

  // 1) Quem está chamando?
  const usuario = await usuarioDoToken(req);
  if (!usuario) { res.status(401).json({ error: "Entre na sua conta para continuar." }); return; }
  const admin = ehAdmin(usuario.email);

  // 2) O que foi pedido?
  const body = lerBody(req);
  const evento = String(body.evento || "").trim();
  const codigo = String(body.codigo || "").trim();
  const uid = String(body.uid || usuario.uid).trim();

  if (!EVENTOS[evento]) { res.status(400).json({ error: "Aviso desconhecido." }); return; }
  if (!codigo) { res.status(400).json({ error: "Informe o código do pedido." }); return; }
  // Cliente comum só avisa sobre os pedidos dele. Reenviar à força
  // também é coisa de administrador.
  if (!admin && uid !== usuario.uid) { res.status(403).json({ error: "Este pedido não é seu." }); return; }

  try {
    const resultado = await enviarAvisoPedido({
      uid, codigo, evento,
      loja: dadosLoja(req),
      forcar: admin && body.forcar === true,
      canais: Array.isArray(body.canais) && body.canais.length ? body.canais : null
    });

    if (!resultado.ok && resultado.motivo === "Pedido não encontrado.") {
      res.status(404).json({ error: resultado.motivo });
      return;
    }
    res.status(200).json(resultado);
  } catch (e) {
    console.error("[avisar] Falha ao avisar o cliente:", e);
    res.status(500).json({ error: "Não foi possível enviar o aviso agora." });
  }
};
