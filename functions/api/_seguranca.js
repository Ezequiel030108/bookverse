/* ============================================================
   BOOKVERSE — Helpers de segurança para as APIs
   ------------------------------------------------------------
   Arquivos com "_" no início NÃO viram rotas — o roteador
   (functions/index.js) ignora nomes começando com "_". Servem
   só para reaproveitar código entre as funções.
   ============================================================ */

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

/* Valida o idToken no Google e devolve o e-mail, ou null. */
async function emailDoToken(req) {
  const m = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const key = process.env.FIREBASE_API_KEY || FIREBASE_API_KEY_PADRAO;
  try {
    const r = await fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(key),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken: m[1] })
      }
    );
    if (!r.ok) return null;
    const data = await r.json();
    const u = (data.users || [])[0];
    return (u && u.email) ? String(u.email).toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

/* Garante que quem chama é admin. Se não for, responde 401 e
   devolve false — o endpoint deve simplesmente dar return. */
async function exigirAdmin(req, res) {
  const email = await emailDoToken(req);
  if (email && listaAdmins().indexOf(email) >= 0) return true;
  res.status(401).json({ error: "Apenas administradores podem usar este recurso. Entre com uma conta de admin." });
  return false;
}

module.exports = { aplicarHeaders, exigirAdmin, emailDoToken };
