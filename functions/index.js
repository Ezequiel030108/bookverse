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

/* As mesmas rotas que existiam na Vercel (/api/<nome>). */
const rotas = {
  "criar-pix": require("./api/criar-pix"),
  "status-pix": require("./api/status-pix"),
  "webhook-mp": require("./api/webhook-mp"),
  "gerar-sinopse": require("./api/gerar-sinopse"),
  "classificar-livro": require("./api/classificar-livro"),
  "capa": require("./api/capa"),
  "livro": require("./api/livro")
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
    secrets: [MP_ACCESS_TOKEN, WEB3FORMS_KEY, MP_WEBHOOK_SECRET, GEMINI_API_KEY]
  },
  async (req, res) => {
    const caminho = String(req.path || "/");

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
