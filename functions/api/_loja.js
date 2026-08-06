/* ============================================================
   BOOKVERSE — DADOS DA LOJA NO SERVIDOR
   ------------------------------------------------------------
   O js/config.js fica no navegador; o servidor precisa saber as
   mesmas coisas (nome, WhatsApp, Instagram) para assinar os
   avisos. Os valores abaixo são os padrões — dá para trocar sem
   mexer no código criando o arquivo functions/.env:

     LOJA_NOME=BookVerse
     LOJA_CIDADE=Juazeirinho
     LOJA_WHATSAPP=5514982241492
     LOJA_INSTAGRAM=mybookverse.pb
     LOJA_SITE=https://bookverse.com.br

   MODELOS DO WHATSAPP: são os nomes cadastrados no Gerenciador do
   WhatsApp (Meta). Os padrões seguem a convenção documentada no
   README; para usar outros nomes, defina no functions/.env:

     WHATSAPP_MODELO_PAGO=meu_modelo_de_pagamento
     WHATSAPP_IDIOMA=pt_BR

   Arquivos com "_" no início NÃO viram rotas (functions/index.js).
   ============================================================ */

const PADRAO = {
  nome: "BookVerse",
  cidade: "Juazeirinho",
  whatsapp: "5514982241492",
  instagram: "mybookverse.pb",
  assinatura: "Livros que viajam até você"
};

/* Endereço público do site. Preferimos o host da própria requisição
   (funciona em qualquer domínio, inclusive no emulador). */
function siteDaRequisicao(req) {
  const env = String(process.env.LOJA_SITE || "").trim();
  if (env) return env.replace(/\/+$/, "");
  const host = (req && (req.headers["x-forwarded-host"] || req.headers.host)) || "";
  if (!host) return "";
  const proto = /^localhost|^127\./.test(host) ? "http" : "https";
  return `${proto}://${host}`;
}

function dadosLoja(req) {
  return {
    nome: String(process.env.LOJA_NOME || PADRAO.nome),
    cidade: String(process.env.LOJA_CIDADE || PADRAO.cidade),
    whatsapp: String(process.env.LOJA_WHATSAPP || PADRAO.whatsapp),
    instagram: String(process.env.LOJA_INSTAGRAM || PADRAO.instagram),
    assinatura: String(process.env.LOJA_ASSINATURA || PADRAO.assinatura),
    site: siteDaRequisicao(req)
  };
}

/* Nome do modelo (template) aprovado na Meta para cada aviso. */
const MODELOS_PADRAO = {
  recebido: "pedido_recebido",
  pago: "pedido_pago",
  enviado: "pedido_enviado",
  entregue: "pedido_entregue",
  cancelado: "pedido_cancelado",
  novidades: "novidades"
};

function modeloWhatsapp(evento) {
  const chave = "WHATSAPP_MODELO_" + String(evento || "").toUpperCase();
  const env = String(process.env[chave] || "").trim();
  if (env) return env === "-" ? "" : env;   // "-" = mandar texto livre, sem modelo
  return MODELOS_PADRAO[evento] || "";
}

function idiomaWhatsapp() {
  return String(process.env.WHATSAPP_IDIOMA || "pt_BR").trim() || "pt_BR";
}

module.exports = { dadosLoja, siteDaRequisicao, modeloWhatsapp, idiomaWhatsapp, MODELOS_PADRAO };
