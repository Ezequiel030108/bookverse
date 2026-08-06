/* ============================================================
   BOOKVERSE — API: IMAGEM DA CAMPANHA DE NOVIDADES
   ------------------------------------------------------------
   Quando você escolhe "Enviar uma imagem" no painel Novidades, a
   foto precisa ganhar um ENDEREÇO DE VERDADE (https://...) antes
   de entrar no e-mail.

   POR QUE NÃO DÁ PARA EMBUTIR A FOTO NO E-MAIL: o Gmail (e quase
   todos os outros) BLOQUEIAM imagens em formato "data:base64"
   dentro do e-mail — a foto simplesmente não aparece. Só imagem
   com endereço https funciona. É o mesmo motivo do api/img-livro.js.

   Então este endpoint faz as duas pontas:

     POST /api/imagem-campanha   (só admin)
       { imagem: "data:image/jpeg;base64,..." }
       → { url: "https://.../api/imagem-campanha?id=abc123" }
       Guarda a foto no Firestore (coleção "imagens").

     GET /api/imagem-campanha?id=abc123   (aberto)
       → devolve a foto como arquivo .jpg de verdade, que é o que
         o e-mail do cliente consegue exibir.

   O GET é aberto de propósito: o e-mail chega na caixa de entrada
   de qualquer cliente e precisa carregar a imagem sem login.
   ============================================================ */

const { aplicarHeaders, usuarioDoToken, ehAdmin } = require("./_seguranca");
const { siteDaRequisicao } = require("./_loja");
const dados = require("./_dados");

/* Um documento do Firestore cabe em 1 MB. A foto vai em base64
   (que engorda ~33%), então paramos bem antes disso. O painel já
   encolhe a imagem no navegador antes de enviar. */
const TAMANHO_MAXIMO = 700 * 1024;

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function lerBody(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b || {};
}

function novoId() {
  return "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

module.exports = async (req, res) => {
  aplicarHeaders(res);

  /* ---------- Mostrar a imagem (o e-mail do cliente chama aqui) ---------- */
  if (req.method === "GET") {
    const id = String((req.query && req.query.id) || "").slice(0, 60);
    if (!id) { res.status(400).json({ error: "id é obrigatório." }); return; }

    let doc = null;
    try {
      doc = await dados.banco().collection("imagens").doc(id).get();
    } catch (e) {
      console.error("[imagem-campanha] Falha ao ler a imagem:", e);
      res.status(500).json({ error: "Erro ao buscar a imagem." });
      return;
    }
    if (!doc || !doc.exists) { res.status(404).json({ error: "Imagem não encontrada." }); return; }

    const d = doc.data() || {};
    let buf = null;
    try { buf = Buffer.from(String(d.dados || ""), "base64"); } catch (e) { buf = null; }
    if (!buf || !buf.length) { res.status(404).json({ error: "Imagem inválida." }); return; }

    res.statusCode = 200;
    res.setHeader("Content-Type", TIPOS_ACEITOS.indexOf(d.tipo) >= 0 ? d.tipo : "image/jpeg");
    // A imagem de uma campanha nunca muda depois de enviada: cache longo
    // deixa o e-mail abrir rápido e alivia o servidor.
    res.setHeader("Cache-Control", "public, max-age=604800, s-maxage=604800, immutable");
    res.end(buf);
    return;
  }

  /* ---------- Enviar uma imagem (painel do admin) ---------- */
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido." }); return; }

  const usuario = await usuarioDoToken(req);
  if (!usuario || !ehAdmin(usuario.email)) {
    res.status(401).json({ error: "Só os administradores da loja podem enviar imagens." });
    return;
  }

  const body = lerBody(req);
  const bruto = String(body.imagem || "").trim();
  const m = bruto.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!m) {
    res.status(400).json({ error: "Envie uma imagem válida (JPEG, PNG, WebP ou GIF)." });
    return;
  }

  const tipo = m[1].toLowerCase();
  const base64 = m[2];
  if (TIPOS_ACEITOS.indexOf(tipo) < 0) {
    res.status(400).json({ error: "Formato não aceito. Use JPEG, PNG, WebP ou GIF." });
    return;
  }
  if (base64.length > TAMANHO_MAXIMO) {
    res.status(413).json({ error: "Imagem muito pesada. Escolha uma menor (até cerca de 500 KB)." });
    return;
  }

  try {
    const id = novoId();
    await dados.banco().collection("imagens").doc(id).set({
      dados: base64,
      tipo: tipo,
      bytes: base64.length,
      enviadaPor: usuario.email,
      criadoEm: dados.agora()
    });
    res.status(200).json({ id, url: siteDaRequisicao(req) + "/api/imagem-campanha?id=" + id });
  } catch (e) {
    console.error("[imagem-campanha] Falha ao guardar a imagem:", e);
    res.status(500).json({ error: "Não foi possível guardar a imagem agora." });
  }
};
