/* ============================================================
   BOOKVERSE — API: IDENTIFICAR LIVRO PELA FOTO DA CAPA (IA)
   ------------------------------------------------------------
   Recebe a FOTO da capa de um livro (em base64) e devolve o
   TÍTULO e o AUTOR que a IA conseguiu ler/identificar na imagem.
   Serve para automatizar o cadastro no painel de administração:
   o admin só tira a foto da capa e os campos se preenchem sozinhos.

   Uso: POST /api/identificar-livro
        { imagem: "data:image/jpeg;base64,...." }
   Resposta:
        { titulo, autor, confianca }
          - titulo    -> título do livro lido na capa ("" se não deu)
          - autor     -> autor do livro ("" se não deu)
          - confianca -> 0 a 1 (ou null)

   Usa a MESMA IA das outras funções (cadastre o segredo com
   `firebase functions:secrets:set` — NUNCA no código):

     • GEMINI_API_KEY     → Google Gemini (visão). É GRATUITO.
                            ➜ opção recomendada.
     • ANTHROPIC_API_KEY  → Claude / Anthropic (visão, paga).

   Se as duas estiverem configuradas, o Gemini (gratuito) é usado.
   ============================================================ */

const { aplicarHeaders, exigirAdmin } = require("./_seguranca");

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const GEMINI_MODELO = "gemini-2.5-flash";
const GEMINI_API =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  GEMINI_MODELO + ":generateContent";

function lerBody(req) {
  let b = req.body;
  if (typeof b === "string") {
    try { b = JSON.parse(b); } catch (e) { b = {}; }
  }
  return b || {};
}

/* Instruções de estilo, iguais para qualquer IA. */
const SYSTEM =
  "Você é um bibliotecário que cataloga livros de uma livraria brasileira chamada BookVerse. " +
  "Você recebe a FOTO da capa de um livro e deve identificar o TÍTULO e o AUTOR do livro. " +
  "Leia o texto que aparece na capa; use também seu conhecimento para corrigir o nome oficial da obra e do autor quando a foto estiver ruim, cortada ou com brilho. " +
  "Prefira o título e o autor no idioma que aparece na capa (normalmente português do Brasil). " +
  "Se não conseguir identificar com segurança, devolva string vazia no campo correspondente — NUNCA invente um autor ou título aleatório. " +
  "Ignore subtítulos longos, selos, editoras, preços e frases de propaganda. " +
  "Responda APENAS com um objeto JSON válido, sem texto fora dele, exatamente neste formato: " +
  "{\"titulo\": \"<título do livro>\", \"autor\": \"<nome do autor>\", \"confianca\": <numero de 0 a 1>}.";

const PERGUNTA =
  "Identifique o título e o autor deste livro a partir da foto da capa e responda seguindo as instruções.";

/* Extrai um objeto JSON de uma resposta de texto (tolera cercas ```json). */
function extrairJSON(txt) {
  if (!txt) return null;
  let s = String(txt).trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i >= 0 && j > i) s = s.slice(i, j + 1);
  try { return JSON.parse(s); } catch (e) { return null; }
}

/* Separa uma data URL ("data:image/jpeg;base64,....") em mime + base64 puro.
   Aceita também um base64 solto (assume JPEG). Devolve null se inválido. */
function lerImagem(valor) {
  const s = String(valor || "").trim();
  if (!s) return null;
  const m = s.match(/^data:([\w.+-]+\/[\w.+-]+);base64,(.+)$/i);
  let mime, dados;
  if (m) {
    mime = m[1].toLowerCase();
    dados = m[2];
  } else {
    mime = "image/jpeg";
    dados = s;
  }
  dados = dados.replace(/\s+/g, "");
  if (!/^[a-z0-9+/=]+$/i.test(dados) || dados.length < 32) return null;
  if (mime.indexOf("image/") !== 0) return null;
  return { mime, dados };
}

/* ---------- Google Gemini (gratuito, com visão) ---------- */
async function identificarComGemini(key, img) {
  const r = await fetch(GEMINI_API + "?key=" + encodeURIComponent(key), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{
        role: "user",
        parts: [
          { text: PERGUNTA },
          { inline_data: { mime_type: img.mime, data: img.dados } }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 300,
        // Pede a resposta já em JSON puro.
        responseMimeType: "application/json",
        // Desliga o "pensamento" do 2.5 Flash para responder direto.
        thinkingConfig: { thinkingBudget: 0 }
      }
    })
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error("gemini-falha");
    e.status = r.status === 429 ? 429 : 502;
    throw e;
  }
  if (data.promptFeedback && data.promptFeedback.blockReason) {
    const e = new Error("gemini-bloqueado"); e.refusal = true; throw e;
  }
  const cand = (data.candidates || [])[0];
  const partes = (cand && cand.content && cand.content.parts) || [];
  return partes.filter(p => p && p.text).map(p => p.text).join(" ").trim();
}

/* ---------- Claude / Anthropic (paga, com visão) ---------- */
async function identificarComAnthropic(key, img) {
  const r = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 300,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: PERGUNTA },
          { type: "image", source: { type: "base64", media_type: img.mime, data: img.dados } }
        ]
      }]
    })
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error("anthropic-falha"); e.status = 502; throw e; }
  if (data.stop_reason === "refusal") { const e = new Error("anthropic-recusa"); e.refusal = true; throw e; }
  return (data.content || [])
    .filter(b => b && b.type === "text")
    .map(b => b.text)
    .join(" ")
    .trim();
}

module.exports = async (req, res) => {
  aplicarHeaders(res);
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  // Só admins logados podem identificar (protege a cota da IA).
  if (!(await exigirAdmin(req, res))) return;

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) {
    res.status(500).json({ error: "Identificação indisponível (chave de IA não configurada)." });
    return;
  }

  try {
    const body = lerBody(req);
    const img = lerImagem(body.imagem);
    if (!img) {
      res.status(400).json({ error: "Envie a foto da capa do livro." });
      return;
    }

    // Prefere o Gemini (gratuito) quando configurado; senão usa o Claude.
    const texto = geminiKey
      ? await identificarComGemini(geminiKey, img)
      : await identificarComAnthropic(anthropicKey, img);

    const obj = extrairJSON(texto);
    if (!obj) {
      res.status(502).json({ error: "A IA não conseguiu ler a capa." });
      return;
    }

    const titulo = String(obj.titulo || "").trim().slice(0, 200);
    const autor = String(obj.autor || "").trim().slice(0, 120);
    if (!titulo && !autor) {
      res.status(422).json({ error: "Não consegui identificar o título nem o autor nesta foto. Tente uma imagem mais nítida da capa." });
      return;
    }

    let confianca = Number(obj.confianca);
    confianca = isFinite(confianca) ? Math.max(0, Math.min(1, confianca)) : null;

    res.status(200).json({ titulo, autor, confianca });
  } catch (e) {
    if (e && e.refusal) {
      res.status(502).json({ error: "Não foi possível identificar este livro pela foto." });
      return;
    }
    if (e && e.status === 429) {
      res.status(429).json({ error: "Muitas identificações em pouco tempo. Aguarde um instante e tente de novo." });
      return;
    }
    res.status(e && e.status ? e.status : 500).json({ error: "Não foi possível identificar agora." });
  }
};
