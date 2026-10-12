/* ============================================================
   BOOKVERSE — Helpers de segurança para as APIs
   ------------------------------------------------------------
   Arquivos com "_" no início NÃO viram rotas — o roteador
   (functions/index.js) ignora nomes começando com "_". Servem
   só para reaproveitar código entre as funções.
   ============================================================ */

/* ------------------------------------------------------------
   ENDEREÇOS DO SITE — nunca a partir do que a requisição diz.

   Os cabeçalhos Host e X-Forwarded-Host são escritos por QUEM
   CHAMA: qualquer pessoa pode chamar a função direto (pelo
   endereço *.cloudfunctions.net / *.run.app) dizendo que o site
   é "site-do-atacante.com". Por isso:

   • siteInterno(): de onde o SERVIDOR busca arquivos do site
     (js/livros.js, imagens). É SEMPRE o endereço oficial do
     Firebase Hosting — o js/livros.js é executado aqui dentro,
     então buscá-lo de um endereço vindo da requisição deixava
     qualquer um rodar código no servidor (e ler os segredos).
     Só o dono do projeto troca, pelo functions/.env (SITE_URL).

   • baseConfiavel(req): endereço para LINKS (e-mails, feed,
     prévias). Usa o domínio da requisição só se for um domínio
     conhecido da loja; senão, o endereço público oficial.
   ------------------------------------------------------------ */
const PROJETO = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || "bookverse-69878";

function semBarraFinal(url) { return String(url || "").trim().replace(/\/+$/, ""); }

function siteInterno() {
  return semBarraFinal(process.env.SITE_URL || `https://${PROJETO}.web.app`);
}

function sitePublico() {
  return semBarraFinal(process.env.LOJA_SITE || "https://www.bookverse.com.br");
}

function escapeRegex(t) { return String(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/* Domínios que servem a loja: o domínio próprio (e subdomínios), os
   endereços do Firebase Hosting (inclusive os de prévia dos PRs) e o
   emulador local. */
const HOSTS_DA_LOJA = [
  /^([a-z0-9-]+\.)*bookverse\.com\.br$/,
  new RegExp("^" + escapeRegex(PROJETO) + "(--[a-z0-9-]+)?\\.(web\\.app|firebaseapp\\.com)$"),
  /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/
];

function hostDaLoja(host) {
  const h = String(host || "").trim().toLowerCase();
  return !!h && HOSTS_DA_LOJA.some(re => re.test(h));
}

function baseConfiavel(req) {
  const cab = (req && req.headers) || {};
  const host = String(cab["x-forwarded-host"] || cab.host || "").split(",")[0].trim().toLowerCase();
  if (!hostDaLoja(host)) return sitePublico();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return (local ? "http" : "https") + "://" + host;
}

// Cabeçalhos de segurança aplicados em todas as respostas das APIs.
function aplicarHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
}

/* ------------------------------------------------------------
   Verificação de ADMIN para os endpoints de IA.
   O site envia o token de login do Firebase (Authorization:
   Bearer <idToken>); aqui validamos o token direto no Google e
   conferimos se o e-mail é de um administrador. Assim ninguém de
   fora consegue gastar a cota da IA.

   Variáveis de ambiente (opcionais — têm padrão do projeto; no
   Firebase dá para definir no arquivo functions/.env):
     - FIREBASE_API_KEY → chave pública do app web (a mesma do
                          js/config.js)
     - ADMIN_EMAILS     → e-mails de admin separados por vírgula
   ------------------------------------------------------------ */

const FIREBASE_API_KEY_PADRAO = "AIzaSyBkD1A6yvhUJPWhs6qe-EwqzRjXekDh8PU";
const ADMINS_PADRAO = [
  "ezequielfigueiredoaraujobatist@gmail.com",
  "cauantista@gmail.com",
  "marialeticinha22@gmail.com",
  "oficialpaulo6@gmail.com"
];

function listaAdmins() {
  const env = String(process.env.ADMIN_EMAILS || "").trim();
  const lista = env ? env.split(",") : ADMINS_PADRAO;
  return lista.map(e => String(e || "").trim().toLowerCase()).filter(Boolean);
}

/* Valida o idToken no Google e devolve { uid, email, nome }, ou null.
   É a mesma checagem do emailDoToken — só que devolvendo o usuário
   inteiro, porque os avisos precisam saber DE QUEM é o pedido. */
async function usuarioDoToken(req) {
  const m = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const key = process.env.FIREBASE_API_KEY || FIREBASE_API_KEY_PADRAO;
  // Nos testes locais, o login é o do emulador do Firebase.
  const emulador = String(process.env.FIREBASE_AUTH_EMULATOR_HOST || "").trim();
  const base = emulador ? "http://" + emulador + "/identitytoolkit.googleapis.com" : "https://identitytoolkit.googleapis.com";
  try {
    const r = await fetch(
      base + "/v1/accounts:lookup?key=" + encodeURIComponent(key),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken: m[1] })
      }
    );
    if (!r.ok) return null;
    const data = await r.json();
    const u = (data.users || [])[0];
    if (!u || !u.localId) return null;
    return {
      uid: String(u.localId),
      email: u.email ? String(u.email).toLowerCase() : "",
      nome: u.displayName || ""
    };
  } catch (e) {
    return null;
  }
}

/* Valida o idToken no Google e devolve o e-mail, ou null. */
async function emailDoToken(req) {
  const u = await usuarioDoToken(req);
  return u && u.email ? u.email : null;
}

/* O e-mail é de um administrador da loja? */
function ehAdmin(email) {
  const e = String(email || "").trim().toLowerCase();
  return !!e && listaAdmins().indexOf(e) >= 0;
}

/* Garante que quem chama é admin. Se não for, responde 401 e
   devolve false — o endpoint deve simplesmente dar return. */
async function exigirAdmin(req, res) {
  const email = await emailDoToken(req);
  if (ehAdmin(email)) return true;
  res.status(401).json({ error: "Apenas administradores podem usar este recurso. Entre com uma conta de admin." });
  return false;
}

module.exports = {
  aplicarHeaders, exigirAdmin, emailDoToken, usuarioDoToken, ehAdmin, listaAdmins,
  siteInterno, sitePublico, baseConfiavel, hostDaLoja
};
