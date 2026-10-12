/* ============================================================
   BOOKVERSE — PEÇAS COMUNS DOS TESTES
   ------------------------------------------------------------
   Os testes rodam no EMULADOR do Firebase (banco e login de
   mentira, na própria máquina) — nunca tocam a loja de verdade.
   O Mercado Pago também é de mentira (um simulador aqui embaixo)
   e o "site" é a própria pasta do projeto, servida localmente.

   Como rodar (na raiz do projeto):
     npm ci --prefix testes && npm ci --prefix functions
     testes/node_modules/.bin/firebase emulators:exec \
       --project demo-bookverse --only firestore,auth "npm test --prefix testes"
   ============================================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const PROJETO = "demo-bookverse";
const HOST_FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085";
const HOST_AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";

// Ambiente do servidor (functions) apontando para os emuladores.
process.env.GCLOUD_PROJECT = PROJETO;
process.env.FIRESTORE_EMULATOR_HOST = HOST_FIRESTORE;
process.env.FIREBASE_AUTH_EMULATOR_HOST = HOST_AUTH;
process.env.MP_ACCESS_TOKEN = "TESTE-token-mercado-pago";
process.env.TZ = "America/Sao_Paulo";

/* ---------- O site, servido da pasta do projeto ----------
   "site" muda o que é servido, durante os testes, para eles não
   dependerem da data de hoje nem da configuração da loja:
     site.promo   = "ligada"    → 15% em tudo, sempre ativa
                    "desligada" → sem promoção
     site.pixModo = "manual" | "mercadopago" | null (o do js/config.js) */
const site = { promo: "desligada", pixModo: null };

function servirSite() {
  const srv = http.createServer((req, res) => {
    const caminho = decodeURIComponent(req.url.split("?")[0]);
    const arquivo = path.join(RAIZ, path.normalize(caminho).replace(/^(\.\.[/\\])+/, ""));
    if (!arquivo.startsWith(RAIZ) || !fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) {
      res.statusCode = 404; res.end(); return;
    }
    let corpo = fs.readFileSync(arquivo);
    if (caminho === "/js/livros.js") {
      const ligada = site.promo === "ligada";
      corpo = Buffer.from(String(corpo).replace(/const PROMOCAO = \{[\s\S]*?\};/,
        `const PROMOCAO = { nome: "Promoção de Teste", tema: "", inicio: "${ligada ? "2000-01-01" : "1999-01-01"}", fim: "${ligada ? "2999-12-31" : "1999-01-02"}", descontoUm: 15, descontoDupla: 15 };`));
    }
    if (caminho === "/js/config.js" && site.pixModo) {
      corpo = Buffer.from(String(corpo).replace(/modo: "[a-z]+"/, `modo: "${site.pixModo}"`));
    }
    res.end(corpo);
  });
  return new Promise(ok => srv.listen(0, "127.0.0.1", () => {
    process.env.SITE_URL = "http://127.0.0.1:" + srv.address().port;
    ok(srv);
  }));
}

/* ---------- Mercado Pago de mentira ----------
   Guarda as cobranças criadas; o teste decide quando "o Pix cai". */
function simularMercadoPago() {
  const pagamentos = new Map();
  let proximoId = 9000001;
  let falharCriacao = false;
  const srv = http.createServer((req, res) => {
    let corpo = "";
    req.on("data", c => { corpo += c; });
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      if (req.method === "POST" && req.url === "/v1/payments") {
        if (falharCriacao) { res.statusCode = 500; res.end('{"message":"falha simulada"}'); return; }
        const dados = JSON.parse(corpo || "{}");
        const id = String(proximoId++);
        const pg = Object.assign({}, dados, {
          id: Number(id),
          status: "pending",
          point_of_interaction: { transaction_data: { qr_code: "00020126PIXDETESTE" + id, qr_code_base64: "iVBORw0KGgo=", ticket_url: "https://mp.teste/" + id } }
        });
        pagamentos.set(id, pg);
        res.end(JSON.stringify(pg));
        return;
      }
      const m = req.url.match(/^\/v1\/payments\/(\d+)$/);
      if (req.method === "GET" && m && pagamentos.has(m[1])) { res.end(JSON.stringify(pagamentos.get(m[1]))); return; }
      res.statusCode = 404; res.end("{}");
    });
  });
  const mp = {
    pagamentos,
    falharCriacao(sim) { falharCriacao = !!sim; },
    // Simula o Pix caindo (opcionalmente com outro valor).
    aprovar(id, valor) {
      const pg = pagamentos.get(String(id));
      pg.status = "approved";
      if (valor !== undefined) pg.transaction_amount = valor;
      return pg;
    },
    fechar() { srv.close(); }
  };
  return new Promise(ok => srv.listen(0, "127.0.0.1", () => {
    process.env.MP_API_URL = "http://127.0.0.1:" + srv.address().port;
    ok(mp);
  }));
}

/* ---------- Avisos por e-mail: captura em vez de enviar ---------- */
const emailsEnviados = [];
function capturarEmails() {
  process.env.RESEND_API_KEY = "re_teste";
  process.env.EMAIL_REMETENTE = "BookVerse <teste@bookverse.test>";
  const original = global.fetch;
  global.fetch = async (url, opcoes) => {
    if (String(url).includes("api.resend.com")) {
      const corpo = JSON.parse((opcoes && opcoes.body) || "{}");
      emailsEnviados.push(corpo);
      return new Response(JSON.stringify({ id: "email-" + emailsEnviados.length }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return original(url, opcoes);
  };
}

/* ---------- Contas no emulador de login ---------- */
async function criarConta(email, opcoes) {
  const base = `http://${HOST_AUTH}/identitytoolkit.googleapis.com/v1`;
  const r = await fetch(`${base}/accounts:signUp?key=chave-teste`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "senha-de-teste", returnSecureToken: true })
  });
  const conta = await r.json();
  if (!conta.idToken) throw new Error("Não deu para criar a conta de teste: " + JSON.stringify(conta));
  return { uid: conta.localId, email, token: conta.idToken };
}

/* Conta que talvez já exista no emulador (de uma rodada anterior). */
async function entrarOuCriar(email) {
  try { return await criarConta(email); } catch (e) { /* já existe: entra */ }
  const r = await fetch(`http://${HOST_AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=chave-teste`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "senha-de-teste", returnSecureToken: true })
  });
  const c = await r.json();
  if (!c.idToken) throw new Error("Não deu para entrar com a conta de teste: " + JSON.stringify(c));
  return { uid: c.localId, email, token: c.idToken };
}

/* ---------- Banco limpo entre os testes ---------- */
async function limparBanco() {
  await fetch(`http://${HOST_FIRESTORE}/emulator/v1/projects/${PROJETO}/databases/(default)/documents`, { method: "DELETE" });
}

/* ---------- Chamar uma rota da API como o Firebase chamaria ---------- */
function chamar(handler, { metodo, corpo, token, query, headers }) {
  return new Promise((resolve, reject) => {
    const req = {
      method: metodo || "POST",
      body: corpo,
      query: query || {},
      path: "/",
      headers: Object.assign({ host: "www.bookverse.com.br", "x-forwarded-host": "www.bookverse.com.br" },
        token ? { authorization: "Bearer " + token } : {}, headers || {})
    };
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      setHeader() {},
      json(b) { resolve({ status: this.statusCode, corpo: b }); return this; },
      send(b) { resolve({ status: this.statusCode, corpo: b }); return this; },
      end(b) { resolve({ status: this.statusCode, corpo: b }); return this; }
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

/* O banco como o servidor o vê (credencial do projeto). */
function banco() {
  return require(path.join(RAIZ, "functions/api/_dados.js")).banco();
}

function api(nome) {
  return require(path.join(RAIZ, "functions/api", nome + ".js"));
}

module.exports = {
  RAIZ, PROJETO, HOST_FIRESTORE, site, servirSite, simularMercadoPago, capturarEmails, emailsEnviados,
  criarConta, entrarOuCriar, limparBanco, chamar, banco, api
};
