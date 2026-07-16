/* ============================================================
   BOOKVERSE — API: PUBLICAR STORY DE UM LIVRO NO INSTAGRAM
   ------------------------------------------------------------
   Recebe a ARTE do story (imagem JPEG 1080×1920 gerada no painel
   de Administração, com capa, nome e preço do livro) e publica
   no Instagram da loja pela API oficial da Meta, em 3 passos:

     1. guarda a imagem por alguns minutos no Firestore e a serve
        num endereço público (/api/story-img?id=...), porque o
        Instagram baixa a imagem por URL;
     2. cria o "contêiner" do story e espera a Meta processá-lo;
     3. publica o contêiner — o story aparece na conta na hora.

   Uso: POST /api/postar-story  { imagem: "data:image/jpeg;base64,..." }
   Resposta: { ok: true, username }

   Antes é preciso conectar a conta em Administração → Instagram
   (rota /api/instagram). A cada story publicado o token de acesso
   é renovado, então a conexão não expira com o uso normal.
   ============================================================ */

const crypto = require("crypto");
const { aplicarHeaders, exigirAdmin } = require("./_seguranca");
const { baseDoRequest } = require("./_catalogo");
const {
  GRAPH, banco, lerConta, chamarGraph, renovarTokenSePreciso, mensagemErroIG
} = require("./_instagram");

const COLECAO_TEMP = "storiesTemp";

/* Limite prático de um documento do Firestore (1 MiB). A arte do
   story fica bem abaixo disso — o painel comprime antes de enviar. */
const MAX_BASE64 = 1000000;

function lerBody(req) {
  let b = req.body;
  if (typeof b === "string") {
    try { b = JSON.parse(b); } catch (e) { b = {}; }
  }
  return b || {};
}

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

/* Faxina: apaga imagens temporárias com mais de 1 hora (sobras de
   publicações que falharam no meio do caminho). */
async function limparAntigas() {
  const antigas = await banco().collection(COLECAO_TEMP)
    .where("criadoEm", "<", Date.now() - 60 * 60 * 1000)
    .limit(25).get();
  await Promise.all(antigas.docs.map(d => d.ref.delete()));
}

module.exports = async (req, res) => {
  aplicarHeaders(res);
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }
  if (!(await exigirAdmin(req, res))) return;

  // Conta conectada?
  let conta = null;
  try { conta = await lerConta(); } catch (e) {}
  if (!conta || !conta.token) {
    res.status(409).json({ error: "O Instagram ainda não está conectado. Abra Administração → Instagram e cole o token de acesso (passo a passo no README)." });
    return;
  }

  // A arte do story, já desenhada e comprimida pelo painel.
  const m = String(lerBody(req).imagem || "").match(/^data:image\/jpe?g;base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[1].length > MAX_BASE64) {
    res.status(400).json({ error: "Imagem do story inválida ou grande demais. Recarregue a página e tente de novo." });
    return;
  }

  // 1) Deixa a imagem num endereço público temporário para a Meta baixar.
  const id = crypto.randomBytes(16).toString("hex");
  const docTemp = banco().collection(COLECAO_TEMP).doc(id);
  const urlImagem = baseDoRequest(req) + "/api/story-img?id=" + id;
  const alvo = encodeURIComponent(conta.userId || "me");

  try {
    await docTemp.set({ imagem: Buffer.from(m[1], "base64"), criadoEm: Date.now() });

    // 2) Cria o contêiner do story e espera o processamento da Meta.
    const criacao = await chamarGraph(GRAPH + "/" + alvo + "/media", {
      media_type: "STORIES",
      image_url: urlImagem,
      access_token: conta.token
    });

    let pronto = false;
    for (let i = 0; i < 10; i++) {
      const st = await chamarGraph(GRAPH + "/" + encodeURIComponent(criacao.id) +
        "?fields=status_code&access_token=" + encodeURIComponent(conta.token));
      const codigo = String(st.status_code || "");
      if (codigo === "FINISHED" || codigo === "PUBLISHED") { pronto = true; break; }
      if (codigo === "ERROR" || codigo === "EXPIRED") {
        res.status(502).json({ error: "O Instagram não conseguiu processar a imagem do story. Tente novamente." });
        return;
      }
      await esperar(1500);
    }
    if (!pronto) {
      res.status(504).json({ error: "O Instagram demorou demais para processar o story. Tente novamente em instantes." });
      return;
    }

    // 3) Publica de fato — o story aparece na conta na hora.
    await chamarGraph(GRAPH + "/" + alvo + "/media_publish", {
      creation_id: criacao.id,
      access_token: conta.token
    });

    // Mantém a conexão viva: renova o token (60 dias) a cada story.
    await renovarTokenSePreciso(conta);

    res.status(200).json({ ok: true, username: conta.username || "" });
  } catch (e) {
    res.status(502).json({ error: mensagemErroIG(e) });
  } finally {
    docTemp.delete().catch(() => {});
    limparAntigas().catch(() => {});
  }
};
