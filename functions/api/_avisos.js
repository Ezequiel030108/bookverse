/* ============================================================
   BOOKVERSE — O QUE CADA AVISO DIZ (e-mail + WhatsApp)
   ------------------------------------------------------------
   Este arquivo é o "texto" da loja: monta a mensagem de cada
   momento do pedido (recebido, pago, saiu para entrega, entregue,
   cancelado) e também as campanhas de novidades.

   Cada aviso sai em três formatos, do mesmo conteúdo:
     • html    → o e-mail bonito (o que a maioria vê)
     • texto   → o mesmo e-mail em texto puro (leitores antigos e
                 filtros antispam gostam de encontrar os dois)
     • whatsapp → a versão curta, para o WhatsApp

   Quer mudar as palavras? Mexa aqui — é texto comum, entre
   crases. Não precisa entender o resto do arquivo.

   Arquivos com "_" no início NÃO viram rotas (functions/index.js).
   ============================================================ */

const crypto = require("crypto");

/* ---------- Cores do e-mail (o roxo cósmico da loja) ---------- */
const COR = {
  noite: "#14093a",
  indigo: "#1f1466",
  violeta: "#4a2bb5",
  lavanda: "#b89eff",
  estrela: "#ffd966",
  fundo: "#f2eefb",
  papel: "#ffffff",
  texto: "#241a3d",
  suave: "#5b5175",
  borda: "#e4dcf7",
  verde: "#1f8a5b"
};

/* ---------- Momentos do pedido ---------- */
const EVENTOS = {
  recebido: { rotulo: "Pedido recebido" },
  pago: { rotulo: "Pagamento confirmado" },
  enviado: { rotulo: "Saiu para entrega" },
  entregue: { rotulo: "Pedido entregue" },
  cancelado: { rotulo: "Pedido cancelado" }
};

/* ---------- Utilidades ---------- */
function esc(t) {
  return String(t == null ? "" : t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function brl(v) {
  const n = Number(v);
  if (!isFinite(n)) return "R$ 0,00";
  return "R$ " + n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/* Só o primeiro nome — mais próximo, do jeito que loja boa fala. */
function primeiroNome(nome) {
  const n = String(nome || "").trim().split(/\s+/)[0] || "";
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : "";
}

/* Endereço http(s) confiável (usado em botões e imagens do e-mail). */
function urlSegura(u) {
  const s = String(u || "").trim();
  return /^https?:\/\//i.test(s) ? s : "";
}

/* Lista os itens em uma linha só: "2x Vidas Secas, 1x O Anticristo". */
function itensEmLinha(pedido) {
  const itens = (pedido && pedido.itens) || [];
  if (!itens.length) return "seus livros";
  return itens.map(i => `${i.qty || 1}x ${i.titulo || "livro"}`).join(", ");
}

/* ------------------------------------------------------------
   DESCADASTRO (LGPD / antispam)
   Todo e-mail de novidades precisa de uma saída com um clique. O
   link leva o cliente para /api/descadastrar com uma assinatura
   que só o servidor sabe gerar — assim ninguém descadastra outra
   pessoa. Sem o segredo AVISOS_SECRET, o link vira "Minha conta",
   onde ele desmarca a opção na mão.
   ------------------------------------------------------------ */
function assinarUid(uid) {
  const segredo = String(process.env.AVISOS_SECRET || "").trim();
  if (!segredo || segredo === "-") return "";   // "-" = recurso desligado
  return crypto.createHmac("sha256", segredo).update("descadastro:" + String(uid)).digest("hex").slice(0, 32);
}

function tokenDescadastroValido(uid, token) {
  const esperado = assinarUid(uid);
  if (!esperado) return false;
  const a = Buffer.from(esperado);
  const b = Buffer.from(String(token || ""));
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch (e) { return false; }
}

function linkDescadastro(uid, base) {
  const site = urlSegura(base) || "";
  if (!site) return "";
  const t = assinarUid(uid);
  if (!t) return site + "/conta.html#avisos";
  return site + "/api/descadastrar?u=" + encodeURIComponent(uid) + "&t=" + t;
}

/* ============================================================
   O E-MAIL
   Tabelas e estilo "colado" em cada tag: é feio de ler, mas é o
   único jeito que funciona igual no Gmail, Outlook e iPhone.
   ============================================================ */

function botao(texto, url) {
  const href = urlSegura(url);
  if (!href) return "";
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px auto 6px;">
    <tr><td align="center" bgcolor="${COR.violeta}" style="border-radius:999px;">
      <a href="${esc(href)}" style="display:inline-block;padding:14px 30px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(texto)}</a>
    </td></tr>
  </table>`;
}

/* Selo colorido com o momento do pedido (Pago, Entregue…). */
function selo(texto, cor) {
  return `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${cor};color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:.4px;text-transform:uppercase;">${esc(texto)}</span>`;
}

/* Tabela dos livros do pedido + totais. */
function blocoItens(pedido) {
  const itens = (pedido && pedido.itens) || [];
  if (!itens.length) return "";

  const linhas = itens.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${COR.borda};font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${COR.texto};">
        <strong>${esc(i.titulo || "Livro")}</strong>${i.autor ? `<br><span style="color:${COR.suave};font-size:13px;">${esc(i.autor)}</span>` : ""}
      </td>
      <td align="center" style="padding:10px 8px;border-bottom:1px solid ${COR.borda};font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${COR.suave};white-space:nowrap;">${esc(String(i.qty || 1))}x</td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid ${COR.borda};font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${COR.texto};white-space:nowrap;">${esc(brl(i.preco))}</td>
    </tr>`).join("");

  const total = Number(pedido.total || 0);
  const frete = Number(pedido.frete || 0);
  const presente = Number(pedido.presenteValor || 0);

  const extras = [
    frete > 0 ? ["Entrega", brl(frete)] : ["Entrega", "Grátis"],
    presente > 0 ? ["Embalagem de presente", brl(presente)] : null
  ].filter(Boolean).map(([r, v]) => `
    <tr>
      <td colspan="2" style="padding:4px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COR.suave};">${esc(r)}</td>
      <td align="right" style="padding:4px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COR.suave};white-space:nowrap;">${esc(v)}</td>
    </tr>`).join("");

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 4px;">
    ${linhas}
    ${extras}
    <tr>
      <td colspan="2" style="padding:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;color:${COR.texto};">Total</td>
      <td align="right" style="padding:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:18px;font-weight:bold;color:${COR.indigo};white-space:nowrap;">${esc(brl(total))}</td>
    </tr>
  </table>`;
}

/* O "esqueleto" do e-mail: cabeçalho da loja, miolo e rodapé. */
function moldura(opcoes) {
  const o = opcoes || {};
  const loja = o.loja || {};
  const nomeLoja = loja.nome || "BookVerse";
  const site = urlSegura(loja.site);
  const insta = String(loja.instagram || "").replace(/^@/, "");
  const whats = String(loja.whatsapp || "").replace(/\D/g, "");

  const contatos = [
    site ? `<a href="${esc(site)}" style="color:${COR.lavanda};text-decoration:none;">${esc(site.replace(/^https?:\/\//, ""))}</a>` : "",
    whats ? `<a href="https://wa.me/${esc(whats)}" style="color:${COR.lavanda};text-decoration:none;">WhatsApp</a>` : "",
    insta ? `<a href="https://instagram.com/${esc(insta)}" style="color:${COR.lavanda};text-decoration:none;">@${esc(insta)}</a>` : ""
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");

  const saida = o.linkDescadastro
    ? `<p style="margin:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.55);line-height:1.6;">
         Você recebeu este e-mail porque tem uma conta na ${esc(nomeLoja)}.
         <a href="${esc(o.linkDescadastro)}" style="color:rgba(255,255,255,.75);">Não quero mais receber novidades</a>.
       </p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(o.assunto || nomeLoja)}</title>
</head>
<body style="margin:0;padding:0;background:${COR.fundo};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.previa || "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COR.fundo};padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${COR.papel};border-radius:16px;overflow:hidden;box-shadow:0 6px 22px rgba(31,20,102,.10);">

      <!-- Cabeçalho: o mesmo letreiro "BookVerse" (PNG) usado no topo do site -->
      <tr><td align="center" bgcolor="${COR.indigo}" style="padding:28px 24px;background-image:linear-gradient(135deg,${COR.noite},${COR.violeta});">
        ${site
          ? `<img src="${esc(site)}/img/bookverse-titulo.png" width="230" height="56" alt="${esc(nomeLoja)}" style="display:block;margin:0 auto;width:230px;max-width:65%;height:auto;border:0;">`
          : `<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:bold;letter-spacing:.5px;color:#ffffff;">${esc(nomeLoja)}</p>`}
      </td></tr>

      <!-- Miolo -->
      <tr><td style="padding:32px 30px 34px;">
        ${o.selo || ""}
        <h1 style="margin:${o.selo ? "16px" : "0"} 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.3;color:${COR.texto};">${esc(o.titulo || "")}</h1>
        ${o.corpo || ""}
      </td></tr>

      <!-- Rodapé -->
      <tr><td align="center" bgcolor="${COR.noite}" style="padding:24px 26px 26px;">
        <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#ffffff;font-weight:bold;">${esc(nomeLoja)}${loja.cidade ? " · " + esc(loja.cidade) : ""}</p>
        ${contatos ? `<p style="margin:8px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COR.lavanda};">${contatos}</p>` : ""}
        ${saida}
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

/* Parágrafo do miolo. */
function p(texto, cor) {
  return `<p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${cor || COR.suave};">${texto}</p>`;
}

/* Caixinha de destaque (código do pedido, endereço, código Pix…). */
function caixa(titulo, conteudo) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;background:${COR.fundo};border-radius:12px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${COR.suave};">${esc(titulo)}</p>
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${COR.texto};">${conteudo}</div>
    </td></tr>
  </table>`;
}

/* ============================================================
   AVISO DE PEDIDO
   Devolve { assunto, previa, html, texto, whatsapp, parametros }
   — "parametros" são as variáveis {{1}}, {{2}}… do modelo do
   WhatsApp (a ordem está documentada no README).
   ============================================================ */
function montarAvisoPedido(dados) {
  const d = dados || {};
  const pedido = d.pedido || {};
  const loja = d.loja || {};
  const nomeLoja = loja.nome || "BookVerse";
  const nome = primeiroNome((pedido.cliente && pedido.cliente.nome) || d.nomeCliente) || "tudo bem";
  const codigo = pedido.codigo || "";
  const total = brl(pedido.total);
  const itens = itensEmLinha(pedido);
  const entrega = pedido.entrega || "a combinar";
  const linkPedidos = urlSegura(loja.site) ? urlSegura(loja.site) + "/conta.html#pedidos" : "";
  const emDinheiro = pedido.pagamento === "dinheiro";

  let assunto = "", previa = "", titulo = "", corpo = "", zap = "", tag = "", tagCor = COR.violeta;
  let parametros = [];

  switch (d.evento) {

    /* ---------- 1. Pedido recebido (Pix ainda não caiu) ---------- */
    case "recebido":
      tag = "Pedido recebido"; tagCor = COR.violeta;
      assunto = `Recebemos seu pedido ${codigo} · ${nomeLoja}`;
      previa = `Estamos separando ${itens}. Falta só o pagamento cair.`;
      titulo = `Oi, ${nome}! Recebemos seu pedido 🧾`;
      corpo =
        p(`Seu pedido chegou aqui e já <strong>reservamos os livros</strong> no seu nome. ${emDinheiro
          ? "Você paga em dinheiro na hora da entrega."
          : "Assim que o Pix cair, a gente te avisa na hora."}`) +
        caixa("Código do pedido", `<strong style="font-size:19px;letter-spacing:1px;">${esc(codigo)}</strong>`) +
        blocoItens(pedido) +
        caixa("Entrega", esc(entrega) + (pedido.endereco ? `<br><span style="color:${COR.suave};font-size:14px;">${esc(pedido.endereco)}</span>` : "")) +
        (emDinheiro ? "" : p(`Já pagou? Ótimo — o aviso de confirmação chega em poucos minutos. Se preferir, mande o comprovante no nosso WhatsApp.`)) +
        botao("Acompanhar meu pedido", linkPedidos);
      zap = `Oi, ${nome}! 🧾 Recebemos seu pedido *${codigo}* na ${nomeLoja}: ${itens}. Total ${total}. ` +
        (emDinheiro ? "Você paga na entrega — já combinamos tudo por aqui!" : "Assim que o Pix cair a gente confirma por aqui. 💜");
      parametros = [nome, codigo, total, itens];
      break;

    /* ---------- 2. Pagamento confirmado ---------- */
    case "pago":
      tag = "Pagamento confirmado"; tagCor = COR.verde;
      assunto = `Pagamento confirmado do pedido ${codigo} ✓ · ${nomeLoja}`;
      previa = `Recebemos ${total}. Já estamos preparando ${itens}.`;
      titulo = `${nome}, seu pagamento caiu! ✅`;
      corpo =
        p(`Confirmamos o recebimento de <strong>${esc(total)}</strong>. Obrigado pela confiança! Seus livros já estão sendo separados e embalados com carinho.`) +
        caixa("Código do pedido", `<strong style="font-size:19px;letter-spacing:1px;">${esc(codigo)}</strong>`) +
        blocoItens(pedido) +
        caixa("Entrega", esc(entrega) + (pedido.endereco ? `<br><span style="color:${COR.suave};font-size:14px;">${esc(pedido.endereco)}</span>` : "")) +
        (pedido.presente ? p(`🎁 Seu pedido vai <strong>embalado para presente</strong>${pedido.presenteMsg ? ` com o cartão: “${esc(pedido.presenteMsg)}”` : ""}.`) : "") +
        p(`Avisamos de novo quando o pedido sair para entrega.`) +
        botao("Acompanhar meu pedido", linkPedidos);
      zap = `${nome}, seu pagamento foi confirmado! ✅ Pedido *${codigo}* (${total}) na ${nomeLoja}. ` +
        `Já estamos separando ${itens} e avisamos quando sair para entrega. 📚`;
      parametros = [nome, codigo, total];
      break;

    /* ---------- 3. Saiu para entrega ---------- */
    case "enviado":
      tag = "A caminho"; tagCor = COR.violeta;
      assunto = `Seu pedido ${codigo} saiu para entrega 🚚 · ${nomeLoja}`;
      previa = `${itens} está a caminho.`;
      titulo = `${nome}, seu pedido saiu para entrega! 🚚`;
      corpo =
        p(`Seus livros já estão a caminho. Fique de olho no celular: entramos em contato pelo WhatsApp quando estivermos chegando.`) +
        caixa("Código do pedido", `<strong style="font-size:19px;letter-spacing:1px;">${esc(codigo)}</strong>`) +
        caixa("Forma de entrega", esc(entrega) + (pedido.endereco ? `<br><span style="color:${COR.suave};font-size:14px;">${esc(pedido.endereco)}</span>` : "")) +
        blocoItens(pedido) +
        botao("Acompanhar meu pedido", linkPedidos);
      zap = `${nome}, seu pedido *${codigo}* saiu para entrega! 🚚 ${itens}. ` +
        `Entrega: ${entrega}. Qualquer coisa é só responder esta mensagem. 💜`;
      parametros = [nome, codigo, entrega];
      break;

    /* ---------- 4. Entregue ---------- */
    case "entregue":
      tag = "Entregue"; tagCor = COR.verde;
      assunto = `Pedido ${codigo} entregue ✓ Boa leitura! · ${nomeLoja}`;
      previa = `Esperamos que você ame ${itens}.`;
      titulo = `Entregue, ${nome}! Boa leitura 📚`;
      corpo =
        p(`Seu pedido <strong>${esc(codigo)}</strong> foi entregue. Esperamos que ${esc(itens)} renda ótimas horas de leitura.`) +
        blocoItens(pedido) +
        p(`Gostou do atendimento? Marcar a gente no Instagram com a foto do livro ajuda demais uma livraria pequena a crescer — e a gente sempre reposta. 💜`) +
        p(`Algum problema com o pedido? É só responder este e-mail que resolvemos.`) +
        botao("Ver outros livros", urlSegura(loja.site));
      zap = `${nome}, seu pedido *${codigo}* foi entregue! 📚 Esperamos que você ame ${itens}. ` +
        `Se puder, marque a gente numa foto do livro — ajuda demais! 💜 ${nomeLoja}`;
      parametros = [nome, codigo];
      break;

    /* ---------- 5. Cancelado ---------- */
    case "cancelado":
      tag = "Cancelado"; tagCor = "#b3324a";
      assunto = `Pedido ${codigo} cancelado · ${nomeLoja}`;
      previa = `Seu pedido ${codigo} foi cancelado.`;
      titulo = `${nome}, seu pedido foi cancelado`;
      corpo =
        p(`O pedido <strong>${esc(codigo)}</strong> foi cancelado e os livros voltaram para a estante.`) +
        p(`Se foi engano — ou se você quiser refazer o pedido —, é só responder este e-mail ou falar com a gente no WhatsApp. Resolvemos rapidinho.`) +
        (pedido.pagamento !== "dinheiro" ? p(`Caso você já tenha pago, devolvemos o valor pelo mesmo Pix. Basta avisar.`) : "") +
        botao("Voltar para a loja", urlSegura(loja.site));
      zap = `${nome}, seu pedido *${codigo}* na ${nomeLoja} foi cancelado. ` +
        `Se foi engano ou se quiser refazer, é só responder aqui que a gente resolve. 💜`;
      parametros = [nome, codigo];
      break;

    default:
      return null;
  }

  const html = moldura({
    loja, assunto, previa, titulo,
    selo: selo(tag, tagCor),
    corpo,
    linkDescadastro: ""   // avisos de pedido são obrigatórios, não têm opt-out
  });

  return { assunto, previa, html, texto: htmlParaTexto(titulo, corpo, loja), whatsapp: zap, parametros };
}

/* ============================================================
   CAMPANHA DE NOVIDADES
   O que a loja escreve no painel "Novidades" vira e-mail + WhatsApp.
   ============================================================ */
function montarCampanha(dados) {
  const d = dados || {};
  const loja = d.loja || {};
  const nomeLoja = loja.nome || "BookVerse";
  const nome = primeiroNome(d.nomeCliente);
  const saudacao = nome ? `Oi, ${nome}!` : "Oi!";
  const titulo = String(d.titulo || "Novidades na estante").trim();
  const texto = String(d.texto || "").trim();
  const link = urlSegura(d.link) || urlSegura(loja.site);
  const imagem = urlSegura(d.imagem);
  const rotuloBotao = String(d.rotuloBotao || "Ver na loja").trim() || "Ver na loja";

  // Cada linha em branco vira um parágrafo (o lojista escreve normal).
  const paragrafos = texto.split(/\n{2,}/).filter(Boolean)
    .map(t => p(esc(t).replace(/\n/g, "<br>"), COR.texto)).join("");

  const capa = imagem
    ? `<img src="${esc(imagem)}" alt="" width="540" style="width:100%;max-width:540px;border-radius:12px;margin:0 0 22px;display:block;">`
    : "";

  const corpo =
    p(`<strong>${esc(saudacao)}</strong>`) +
    capa +
    (paragrafos || p("Passamos para contar as novidades da estante.", COR.texto)) +
    botao(rotuloBotao, link);

  const html = moldura({
    loja, assunto: titulo, previa: texto.slice(0, 120), titulo,
    selo: selo("Novidades", COR.violeta),
    corpo,
    linkDescadastro: d.linkDescadastro || ""
  });

  const zap = `${saudacao} 📚 *${titulo}*\n\n${texto}${link ? `\n\n${link}` : ""}\n\n_${nomeLoja}_`;

  return {
    assunto: `${titulo} · ${nomeLoja}`,
    previa: texto.slice(0, 120),
    html,
    texto: htmlParaTexto(titulo, corpo, loja),
    whatsapp: zap,
    parametros: [nome || "tudo bem", titulo, texto.slice(0, 700)]
  };
}

/* ------------------------------------------------------------
   Versão em texto puro do e-mail. Não precisa ser bonita: serve
   para leitores sem HTML e para os filtros antispam verem que a
   mensagem é honesta (tem as duas versões).
   ------------------------------------------------------------ */
function htmlParaTexto(titulo, corpoHtml, loja) {
  const limpo = String(corpoHtml || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|tr|table|div|h1)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const rodape = [
    (loja && loja.nome) || "BookVerse",
    loja && loja.site ? loja.site : "",
    loja && loja.whatsapp ? "WhatsApp: https://wa.me/" + String(loja.whatsapp).replace(/\D/g, "") : ""
  ].filter(Boolean).join(" · ");
  return `${titulo}\n\n${limpo}\n\n—\n${rodape}`;
}

module.exports = {
  EVENTOS, montarAvisoPedido, montarCampanha,
  linkDescadastro, tokenDescadastroValido,
  brl, primeiroNome, itensEmLinha, urlSegura, esc
};
