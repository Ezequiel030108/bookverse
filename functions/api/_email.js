/* ============================================================
   BOOKVERSE — ENVIO DE E-MAIL PARA O CLIENTE
   ------------------------------------------------------------
   O Web3Forms (usado para avisar VOCÊ, lojista) só envia para um
   endereço fixo — o seu. Para escrever para o CLIENTE precisamos
   de um serviço de e-mail de verdade.

   Damos suporte a dois (escolha UM, o que você achar mais fácil):

     • RESEND  → https://resend.com   (3.000 e-mails/mês grátis)
                 firebase functions:secrets:set RESEND_API_KEY

     • BREVO   → https://brevo.com    (300 e-mails/dia grátis)
                 firebase functions:secrets:set BREVO_API_KEY

   O remetente ("de quem vem o e-mail") sai do segredo
   EMAIL_REMETENTE, no formato:  BookVerse <contato@seudominio.com>
   Se ficar vazio, usamos o remetente de teste do Resend
   (onboarding@resend.dev), que só entrega para o e-mail dono da
   conta — serve para testar, não para vender.

   Arquivos com "_" no início NÃO viram rotas (functions/index.js).
   ============================================================ */

/* Remetente padrão: o endereço de testes do Resend. Funciona sem
   configurar domínio nenhum, mas só entrega no e-mail do dono da
   conta Resend. Para valer, verifique seu domínio e preencha o
   segredo EMAIL_REMETENTE. */
const REMETENTE_TESTE = "BookVerse <onboarding@resend.dev>";

/* Lê um segredo. No Firebase os segredos precisam EXISTIR para o
   deploy passar, então a convenção do projeto é cadastrar "-"
   quando o recurso deve ficar desligado (igual ao MP_WEBHOOK_SECRET). */
function segredo(nome) {
  const v = String(process.env[nome] || "").trim();
  return v === "-" ? "" : v;
}

/* Separa "Nome <email@dominio>" em { nome, email }. */
function separarRemetente(texto) {
  const s = String(texto || "").trim();
  const m = s.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return { nome: m[1] || "BookVerse", email: m[2] };
  return { nome: "BookVerse", email: s };
}

function remetente() {
  return segredo("EMAIL_REMETENTE") || REMETENTE_TESTE;
}

/* Qual serviço está configurado (ou null se nenhum). */
function servicoConfigurado() {
  if (segredo("RESEND_API_KEY")) return "resend";
  if (segredo("BREVO_API_KEY")) return "brevo";
  return null;
}

/* E-mail com formato plausível? (checagem simples, só para não
   gastar chamada de API com endereço obviamente inválido) */
function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());
}

/* ---------- Resend ---------- */
async function enviarResend(msg) {
  const chave = segredo("RESEND_API_KEY");
  const corpo = {
    from: remetente(),
    to: [msg.para],
    subject: msg.assunto,
    html: msg.html,
    text: msg.texto
  };
  if (msg.responderPara) corpo.reply_to = msg.responderPara;
  // Cabeçalho de descadastro: o Gmail mostra o botão "Cancelar inscrição"
  // no topo da mensagem. Exigido pelas regras antispam para envios em massa.
  if (msg.linkDescadastro) {
    corpo.headers = {
      "List-Unsubscribe": `<${msg.linkDescadastro}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
    };
  }

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + chave,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(15000)
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error("Resend recusou o envio: " + (dados && dados.message ? dados.message : r.status));
  }
  return { id: dados && dados.id ? dados.id : "" };
}

/* ---------- Brevo (ex-Sendinblue) ---------- */
async function enviarBrevo(msg) {
  const chave = segredo("BREVO_API_KEY");
  const de = separarRemetente(remetente());
  const corpo = {
    sender: { name: de.nome, email: de.email },
    to: [{ email: msg.para, name: msg.paraNome || undefined }],
    subject: msg.assunto,
    htmlContent: msg.html,
    textContent: msg.texto
  };
  if (msg.responderPara) corpo.replyTo = { email: msg.responderPara };
  if (msg.linkDescadastro) {
    corpo.headers = {
      "List-Unsubscribe": `<${msg.linkDescadastro}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
    };
  }

  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": chave,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(15000)
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error("Brevo recusou o envio: " + (dados && dados.message ? dados.message : r.status));
  }
  return { id: dados && dados.messageId ? dados.messageId : "" };
}

/* ------------------------------------------------------------
   enviarEmail({ para, paraNome, assunto, html, texto,
                 responderPara, linkDescadastro })

   Devolve { ok: true, servico, id } ou { ok: false, motivo }.
   NUNCA lança: quem chama decide o que fazer com a falha (um
   aviso que não saiu não pode derrubar o pedido).
   ------------------------------------------------------------ */
async function enviarEmail(msg) {
  const servico = servicoConfigurado();
  if (!servico) return { ok: false, motivo: "E-mail para o cliente desligado (sem RESEND_API_KEY nem BREVO_API_KEY)." };
  if (!emailValido(msg && msg.para)) return { ok: false, motivo: "E-mail do cliente ausente ou inválido." };

  try {
    const r = servico === "resend" ? await enviarResend(msg) : await enviarBrevo(msg);
    return { ok: true, servico, id: r.id || "" };
  } catch (e) {
    return { ok: false, motivo: (e && e.message) || "Falha desconhecida ao enviar o e-mail." };
  }
}

module.exports = { enviarEmail, servicoConfigurado, emailValido, remetente };
