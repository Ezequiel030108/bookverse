/* ============================================================
   BOOKVERSE — PORTA DE ENTRADA DAS APIs (Firebase Functions)
   ------------------------------------------------------------
   No Firebase, o site fica no Hosting e TODAS as rotas dinâmicas
   (/api/* e /livro/<id>) são redirecionadas para cá pelos
   "rewrites" do firebase.json. Este arquivo só direciona cada
   rota para o handler certo na pasta ./api — que é o MESMO
   código que rodava na Vercel, praticamente sem alterações.

   SEGREDOS (equivalem às Environment Variables da Vercel).
   Cadastre uma vez, pelo terminal, na pasta do projeto:

     firebase functions:secrets:set MP_ACCESS_TOKEN
     firebase functions:secrets:set WEB3FORMS_KEY
     firebase functions:secrets:set MP_WEBHOOK_SECRET   (digite "-" p/ desativar a validação)
     firebase functions:secrets:set GEMINI_API_KEY

   AVISOS AO CLIENTE (e-mail + WhatsApp) — cadastre TODOS, mesmo
   os que não for usar: o deploy exige que o segredo exista. Digite
   "-" (um traço) para deixar o recurso DESLIGADO.

     firebase functions:secrets:set RESEND_API_KEY      (e-mail — resend.com)
     firebase functions:secrets:set BREVO_API_KEY       (e-mail — alternativa)
     firebase functions:secrets:set EMAIL_REMETENTE     ("BookVerse <oi@seudominio.com>")
     firebase functions:secrets:set WHATSAPP_TOKEN      (WhatsApp Cloud API)
     firebase functions:secrets:set WHATSAPP_PHONE_ID   (ID do número, na Meta)
     firebase functions:secrets:set AVISOS_SECRET       (frase secreta p/ o link de descadastro)

   Passo a passo com prints: README, seção "📣 Avisos automáticos".

   PROTEÇÃO DE CUSTO: maxInstances limita quantas cópias desta
   função podem rodar ao mesmo tempo — é o freio que impede um
   bug ou ataque de gerar conta surpresa no plano Blaze.
   ============================================================ */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

/* Segredos guardados no Secret Manager do Google (nunca no código). */
const MP_ACCESS_TOKEN = defineSecret("MP_ACCESS_TOKEN");
const WEB3FORMS_KEY = defineSecret("WEB3FORMS_KEY");
const MP_WEBHOOK_SECRET = defineSecret("MP_WEBHOOK_SECRET");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

/* Avisos ao cliente (e-mail + WhatsApp da loja). */
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const BREVO_API_KEY = defineSecret("BREVO_API_KEY");
const EMAIL_REMETENTE = defineSecret("EMAIL_REMETENTE");
const WHATSAPP_TOKEN = defineSecret("WHATSAPP_TOKEN");
const WHATSAPP_PHONE_ID = defineSecret("WHATSAPP_PHONE_ID");
const AVISOS_SECRET = defineSecret("AVISOS_SECRET");

/* As mesmas rotas que existiam na Vercel (/api/<nome>). */
const rotas = {
  "criar-pix": require("./api/criar-pix"),
  "status-pix": require("./api/status-pix"),
  "webhook-mp": require("./api/webhook-mp"),
  "gerar-sinopse": require("./api/gerar-sinopse"),
  "classificar-livro": require("./api/classificar-livro"),
  "identificar-livro": require("./api/identificar-livro"),
  "classificar-fama": require("./api/classificar-fama"),
  "capa": require("./api/capa"),
  "livro": require("./api/livro"),
  "feed": require("./api/feed"),
  "img-livro": require("./api/img-livro"),
  // Avisos ao cliente e campanhas de novidades.
  "avisar": require("./api/avisar"),
  "campanha": require("./api/campanha"),
  "descadastrar": require("./api/descadastrar"),
  "imagem-campanha": require("./api/imagem-campanha"),
  "gerar-novidade": require("./api/gerar-novidade")
};

/* Define req.query de forma confiável. (No Express, req.query é um
   "getter" que re-analisa a URL a cada acesso — mudar o objeto
   retornado se perde. Aqui criamos uma propriedade própria.) */
function definirQuery(req, extras) {
  const q = Object.assign({}, req.query, extras);
  Object.defineProperty(req, "query", {
    value: q, writable: true, configurable: true, enumerable: true
  });
}

exports.api = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60,
    maxInstances: 10,
    secrets: [
      MP_ACCESS_TOKEN, WEB3FORMS_KEY, MP_WEBHOOK_SECRET, GEMINI_API_KEY,
      RESEND_API_KEY, BREVO_API_KEY, EMAIL_REMETENTE,
      WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, AVISOS_SECRET
    ]
  },
  async (req, res) => {
    const caminho = String(req.path || "/");

    // Feed do Google Shopping: /feed.xml → handler "feed".
    if (/^\/feed\.xml\/?$/.test(caminho)) {
      return rotas["feed"](req, res);
    }

    // Feed do Meta (Instagram/Facebook): /feed-meta.xml → o MESMO handler,
    // marcado com destino=meta. A diferença é só um campo a mais
    // (quantity_to_sell_on_facebook), exigido pelas Lojas do Meta.
    if (/^\/feed-meta\.xml\/?$/.test(caminho)) {
      definirQuery(req, { destino: "meta" });
      return rotas["feed"](req, res);
    }

    // Link compartilhado: /livro/<id> → handler "livro" (o id vira ?id=,
    // igual ao rewrite que existia no vercel.json).
    let m = caminho.match(/^\/livro\/([^/]+)\/?$/);
    if (m) {
      let id = m[1];
      try { id = decodeURIComponent(id); } catch (e) { /* usa como veio */ }
      definirQuery(req, { id });
      return rotas["livro"](req, res);
    }

    // Demais rotas: /api/<nome> (nomes com "_" nunca viram rota).
    m = caminho.match(/^\/api\/([a-z0-9-]+)\/?$/i);
    const nome = ((m && m[1]) || "").toLowerCase();
    const handler = nome && nome[0] !== "_" ? rotas[nome] : null;
    if (!handler) {
      res.status(404).json({ error: "Rota não encontrada." });
      return;
    }
    return handler(req, res);
  }
);
