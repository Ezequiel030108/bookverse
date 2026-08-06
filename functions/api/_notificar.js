/* ============================================================
   BOOKVERSE — DISPARO DE UM AVISO DE PEDIDO
   ------------------------------------------------------------
   Junta as três peças (texto do aviso + e-mail + WhatsApp) num
   único lugar, porque DOIS caminhos diferentes precisam avisar o
   cliente exatamente do mesmo jeito:

     1. o painel da loja / o site  → api/avisar.js
     2. o Mercado Pago, sozinho, quando o Pix cai → api/webhook-mp.js

   Regras que valem para os dois:
     • cada aviso sai UMA vez (fica marcado no campo "avisos" do
       pedido) — a não ser que se peça "forcar";
     • se o cliente desmarcou um canal na conta dele, respeitamos;
     • se o WhatsApp automático não estiver ligado (ou falhar),
       devolvemos um link wa.me pronto para enviar com um toque.

   Arquivos com "_" no início NÃO viram rotas (functions/index.js).
   ============================================================ */

const { montarAvisoPedido, EVENTOS } = require("./_avisos");
const { modeloWhatsapp, idiomaWhatsapp } = require("./_loja");
const { enviarEmail } = require("./_email");
const { enviarWhatsapp, linkManual } = require("./_whatsapp");
const dados = require("./_dados");

/* ------------------------------------------------------------
   enviarAvisoPedido({ uid, codigo, evento, loja, forcar, canais,
                       pedido, cliente })

   "pedido" e "cliente" são opcionais: se quem chamou já leu do
   banco, não lemos de novo. Devolve sempre um objeto — nunca
   lança, para um aviso que não saiu jamais derrubar um pedido.
   ------------------------------------------------------------ */
async function enviarAvisoPedido(opcoes) {
  const o = opcoes || {};
  const uid = String(o.uid || "");
  const codigo = String(o.codigo || "");
  const evento = String(o.evento || "");

  if (!EVENTOS[evento]) return { ok: false, motivo: "Aviso desconhecido." };
  if (!uid || !codigo) return { ok: false, motivo: "Pedido não identificado." };

  const pedido = o.pedido || await dados.lerPedido(uid, codigo);
  if (!pedido) return { ok: false, motivo: "Pedido não encontrado." };

  const cliente = o.cliente || (await dados.lerCliente(uid)) || {};
  const jaEnviados = pedido.avisos || {};
  if (jaEnviados[evento] && !o.forcar) {
    return { ok: true, jaEnviado: true, evento };
  }

  const conteudo = montarAvisoPedido({
    evento, pedido, loja: o.loja || {}, nomeCliente: cliente.nome
  });
  if (!conteudo) return { ok: false, motivo: "Aviso desconhecido." };

  // O contato escrito no pedido vale mais que o cadastro antigo:
  // o cliente pode ter corrigido o telefone na hora da compra.
  const contato = pedido.cliente || {};
  const email = String(contato.email || cliente.email || "").trim();
  const telefone = String(contato.telefone || cliente.telefone || "").trim();

  const canais = Array.isArray(o.canais) && o.canais.length ? o.canais : ["email", "whatsapp"];
  const querEmail = canais.indexOf("email") >= 0 && dados.querReceber(cliente, "email", "pedido");
  const querZap = canais.indexOf("whatsapp") >= 0 && dados.querReceber(cliente, "whatsapp", "pedido");

  const resultado = { ok: true, evento, email: null, whatsapp: null };

  if (querEmail) {
    resultado.email = email
      ? await enviarEmail({
          para: email,
          paraNome: contato.nome || cliente.nome || "",
          assunto: conteudo.assunto,
          html: conteudo.html,
          texto: conteudo.texto,
          responderPara: String(process.env.EMAIL_RESPONDER || "").replace(/^-$/, "")
        })
      : { ok: false, motivo: "Cliente sem e-mail no pedido." };
  }

  if (querZap) {
    resultado.whatsapp = telefone
      ? await enviarWhatsapp({
          telefone,
          modelo: modeloWhatsapp(evento),
          idioma: idiomaWhatsapp(),
          parametros: conteudo.parametros,
          texto: conteudo.whatsapp
        })
      : { ok: false, motivo: "Cliente sem WhatsApp cadastrado." };

    // Plano B: link pronto para o admin mandar com um toque.
    if (!resultado.whatsapp.ok && !resultado.whatsapp.link && telefone) {
      resultado.whatsapp.link = linkManual(telefone, conteudo.whatsapp);
      resultado.whatsapp.modo = "manual";
    }
  }

  const saiuAlgo = !!((resultado.email && resultado.email.ok) ||
                      (resultado.whatsapp && resultado.whatsapp.ok));
  resultado.enviado = saiuAlgo;

  if (saiuAlgo) {
    await dados.atualizarPedido(uid, codigo, {
      avisos: Object.assign({}, jaEnviados, { [evento]: true }),
      avisoUltimo: evento,
      avisoUltimoEm: Date.now()
    }).catch(() => {});
  }

  return resultado;
}

module.exports = { enviarAvisoPedido };
