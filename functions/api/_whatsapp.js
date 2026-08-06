/* ============================================================
   BOOKVERSE — ENVIO DE WHATSAPP PELO NOSSO WHATSAPP BUSINESS
   ------------------------------------------------------------
   Usa a API oficial do WhatsApp Business (WhatsApp Cloud API, da
   Meta). É ela que permite a loja mandar mensagem sozinha, sem
   ninguém digitar nada — do jeito que as lojas grandes fazem.

   Segredos (firebase functions:secrets:set):
     - WHATSAPP_TOKEN     → token permanente do usuário do sistema
     - WHATSAPP_PHONE_ID  → "ID do número de telefone" (Cloud API)

   ⚠️ REGRA DA META que você precisa conhecer:
   quando é a LOJA que começa a conversa (é o nosso caso), a
   mensagem TEM QUE ser um "modelo" (template) aprovado antes pela
   Meta. Texto livre só é permitido dentro das 24h seguintes a uma
   mensagem do cliente. Por isso cada aviso tem um modelo próprio
   — os nomes ficam no js/config.js e o texto para cadastrar está
   no README (seção "📣 Avisos automáticos").

   SEM A API CONFIGURADA A LOJA NÃO FICA NA MÃO: devolvemos um
   link "wa.me" com a mensagem pronta. O painel do admin mostra o
   botão "Avisar pelo WhatsApp" e você envia com um toque, pelo seu
   próprio WhatsApp Business. Quando os segredos forem cadastrados,
   o mesmo aviso passa a sair sozinho.

   Arquivos com "_" no início NÃO viram rotas (functions/index.js).
   ============================================================ */

const GRAPH = "https://graph.facebook.com/v21.0";

/* ------------------------------------------------------------
   Telefone no formato que o WhatsApp entende: só números, com o
   código do país na frente (55 no Brasil).
     "(83) 9 9999-8888"  → "5583999998888"
     "+55 83 99999-8888" → "5583999998888"
   Devolve "" quando o número é curto demais para ser real.
   ------------------------------------------------------------ */
function normalizarTelefone(tel) {
  let d = String(tel || "").replace(/\D/g, "");
  if (!d) return "";
  // Número escrito com o "0" de operadora na frente (0 83 9...).
  if (d.length > 11 && d[0] === "0") d = d.replace(/^0+/, "");
  // Já veio com o código do país.
  if (d.length >= 12 && d.startsWith("55")) return d.slice(0, 13);
  // Celular/fixo brasileiro sem o país: 11 dígitos (DDD + 9 + 8) ou 10.
  if (d.length === 10 || d.length === 11) return "55" + d;
  // Outro país (já com DDI) — deixa passar se tiver tamanho plausível.
  if (d.length >= 11 && d.length <= 15) return d;
  return "";
}

/* Link de envio manual: abre o WhatsApp com a mensagem digitada.
   É o plano B quando a API não está configurada. */
function linkManual(telefone, texto) {
  const num = normalizarTelefone(telefone);
  if (!num) return "";
  return "https://wa.me/" + num + "?text=" + encodeURIComponent(String(texto || "").slice(0, 1500));
}

/* Lê um segredo. No Firebase os segredos precisam EXISTIR para o
   deploy passar, então a convenção do projeto é cadastrar "-"
   quando o recurso deve ficar desligado. */
function segredo(nome) {
  const v = String(process.env[nome] || "").trim();
  return v === "-" ? "" : v;
}

function apiConfigurada() {
  return !!(segredo("WHATSAPP_TOKEN") && segredo("WHATSAPP_PHONE_ID"));
}

/* Chamada crua à Cloud API. Lança em caso de erro. */
async function chamar(corpo) {
  const token = segredo("WHATSAPP_TOKEN");
  const phoneId = segredo("WHATSAPP_PHONE_ID");

  const r = await fetch(`${GRAPH}/${encodeURIComponent(phoneId)}/messages`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(15000)
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    const erro = (dados && dados.error) || {};
    const msg = erro.error_user_msg || erro.message || ("HTTP " + r.status);
    const e = new Error(msg);
    e.codigo = erro.code;
    throw e;
  }
  const id = ((dados.messages || [])[0] || {}).id || "";
  return { id };
}

/* Monta os "components" do modelo: cabeçalho com imagem (opcional),
   corpo com as variáveis {{1}}, {{2}}… e botão com URL dinâmica
   (opcional). */
function componentes(opcoes) {
  const comps = [];
  if (opcoes.imagem) {
    comps.push({
      type: "header",
      parameters: [{ type: "image", image: { link: opcoes.imagem } }]
    });
  }
  const params = (opcoes.parametros || [])
    .map(v => ({ type: "text", text: String(v == null ? "" : v).replace(/\s+/g, " ").slice(0, 900) }));
  if (params.length) comps.push({ type: "body", parameters: params });
  if (opcoes.urlBotao) {
    comps.push({
      type: "button", sub_type: "url", index: "0",
      parameters: [{ type: "text", text: String(opcoes.urlBotao).slice(0, 200) }]
    });
  }
  return comps;
}

/* ------------------------------------------------------------
   enviarWhatsapp({ telefone, modelo, idioma, parametros,
                    imagem, urlBotao, texto })

   - Com a API configurada e um "modelo" informado: envia o modelo
     aprovado (é o que a Meta exige para a loja iniciar a conversa).
   - Com a API configurada e SEM modelo: envia texto livre (só
     chega se o cliente falou com a loja nas últimas 24h).
   - Sem a API: devolve { ok:false, modo:"manual", link } para o
     painel do admin oferecer o envio com um toque.

   NUNCA lança — devolve sempre um objeto com o resultado.
   ------------------------------------------------------------ */
async function enviarWhatsapp(opcoes) {
  const o = opcoes || {};
  const numero = normalizarTelefone(o.telefone);
  const link = linkManual(o.telefone, o.texto);

  if (!numero) return { ok: false, motivo: "Cliente sem WhatsApp cadastrado." };
  if (!apiConfigurada()) {
    return {
      ok: false, modo: "manual", link,
      motivo: "WhatsApp automático desligado (sem WHATSAPP_TOKEN/WHATSAPP_PHONE_ID). Use o botão para enviar pelo seu WhatsApp Business."
    };
  }

  try {
    if (o.modelo) {
      const r = await chamar({
        messaging_product: "whatsapp",
        to: numero,
        type: "template",
        template: {
          name: String(o.modelo),
          language: { code: String(o.idioma || "pt_BR") },
          components: componentes(o)
        }
      });
      return { ok: true, modo: "modelo", modelo: String(o.modelo), id: r.id };
    }

    const r = await chamar({
      messaging_product: "whatsapp",
      to: numero,
      type: "text",
      text: { preview_url: true, body: String(o.texto || "").slice(0, 4000) }
    });
    return { ok: true, modo: "texto", id: r.id };
  } catch (e) {
    // Falhou (modelo não aprovado, janela de 24h fechada, saldo…):
    // devolve o link manual para o aviso não se perder.
    return { ok: false, modo: "manual", link, motivo: (e && e.message) || "Falha ao enviar pelo WhatsApp." };
  }
}

module.exports = { enviarWhatsapp, linkManual, normalizarTelefone, apiConfigurada };
