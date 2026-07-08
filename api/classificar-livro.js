/* ============================================================
   BOOKVERSE — API: CLASSIFICAR LIVRO NA CATEGORIA CERTA (IA)
   ------------------------------------------------------------
   Recebe título, autor e (opcional) sinopse de um livro, junto
   com a lista de categorias (gêneros) que já existem na loja, e
   devolve a categoria EXISTENTE que melhor representa o livro.
   Se o livro não se encaixar em nenhuma, sugere CRIAR uma nova.

   Uso: POST /api/classificar-livro
        { titulo, autor, sinopse, categorias: ["...", "..."] }
   Resposta:
        { categoria, nova, confianca, justificativa }
          - categoria     -> nome da categoria escolhida (ou sugerida)
          - nova          -> true quando é uma categoria a ser criada
          - confianca      -> 0 a 1 (ou null)
          - justificativa -> frase curta explicando a escolha

   Usa a MESMA IA da geração de sinopse (configure na Vercel em
   Settings → Environment Variables — NUNCA no código):

     • GEMINI_API_KEY     → Google Gemini. É GRATUITO (sem cartão).
                            ➜ opção recomendada.
     • ANTHROPIC_API_KEY  → Claude / Anthropic (paga).

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
  "Você é um bibliotecário que organiza os livros nas categorias (gêneros) de uma livraria brasileira chamada BookVerse. " +
  "Você recebe os dados de um livro e a lista de categorias que JÁ existem na loja. " +
  "Escolha a categoria EXISTENTE que melhor representa o livro. " +
  "Só sugira uma categoria NOVA quando o livro realmente não se encaixar em nenhuma das existentes. " +
  "Uma categoria nova deve ser ampla (servir para vários livros, não só este), seguir o estilo das atuais " +
  "(use \"&\" para juntar temas afins quando fizer sentido) e estar em português do Brasil. " +
  "Responda APENAS com um objeto JSON válido, sem texto fora dele, exatamente neste formato: " +
  "{\"categoria\": \"<nome da categoria>\", \"nova\": <true|false>, \"confianca\": <numero de 0 a 1>, \"justificativa\": \"<uma frase curta>\"}. " +
  "Quando \"nova\" for false, o campo \"categoria\" DEVE ser idêntico (mesma grafia, acentos e maiúsculas) a uma das categorias existentes.";

function montarPergunta(titulo, autor, sinopse, categorias) {
  return "Categorias existentes na loja:\n- " + categorias.join("\n- ") + "\n\n" +
    "Livro a classificar:\n" +
    "Título: " + titulo + "\n" +
    (autor ? "Autor: " + autor + "\n" : "") +
    (sinopse ? "Sinopse: " + sinopse + "\n" : "") +
    "\nClassifique o livro seguindo as instruções.";
}

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

/* ---------- Google Gemini (gratuito) ---------- */
async function classificarComGemini(key, pergunta) {
  const r = await fetch(GEMINI_API + "?key=" + encodeURIComponent(key), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: pergunta }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 400,
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

/* ---------- Claude / Anthropic (paga) ---------- */
async function classificarComAnthropic(key, pergunta) {
  const r = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: pergunta }]
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

  // Só admins logados podem classificar (protege a cota da IA).
  if (!(await exigirAdmin(req, res))) return;

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) {
    res.status(500).json({ error: "Classificação indisponível (chave de IA não configurada)." });
    return;
  }

  try {
    const body = lerBody(req);
    const titulo = String(body.titulo || "").trim().slice(0, 200);
    const autor = String(body.autor || "").trim().slice(0, 120);
    const sinopse = String(body.sinopse || "").trim().slice(0, 1000);

    let categorias = Array.isArray(body.categorias) ? body.categorias : [];
    categorias = categorias
      .map(c => String(c || "").trim().slice(0, 80))
      .filter(Boolean);
    // Remove duplicadas (preservando a primeira grafia vista) e limita o total.
    const vistas = new Set();
    categorias = categorias.filter(c => {
      const k = c.toLowerCase();
      if (vistas.has(k)) return false;
      vistas.add(k); return true;
    }).slice(0, 40);

    if (!titulo) {
      res.status(400).json({ error: "Título é obrigatório." });
      return;
    }
    if (!categorias.length) {
      res.status(400).json({ error: "Envie a lista de categorias existentes." });
      return;
    }

    const pergunta = montarPergunta(titulo, autor, sinopse, categorias);

    // Prefere o Gemini (gratuito) quando configurado; senão usa o Claude.
    const texto = geminiKey
      ? await classificarComGemini(geminiKey, pergunta)
      : await classificarComAnthropic(anthropicKey, pergunta);

    const obj = extrairJSON(texto);
    if (!obj || !obj.categoria) {
      res.status(502).json({ error: "A IA não retornou uma classificação." });
      return;
    }

    const sugerida = String(obj.categoria).trim().slice(0, 80);
    if (!sugerida) {
      res.status(502).json({ error: "A IA não retornou uma classificação." });
      return;
    }

    // O servidor é a autoridade: é nova só se NÃO existir na lista enviada
    // (comparação sem diferenciar maiúsculas/acentos de capitalização).
    const existente = categorias.find(c => c.toLowerCase() === sugerida.toLowerCase());
    const nova = !existente;
    const categoria = existente || sugerida;   // usa a grafia oficial quando já existe

    let confianca = Number(obj.confianca);
    confianca = isFinite(confianca) ? Math.max(0, Math.min(1, confianca)) : null;
    const justificativa = String(obj.justificativa || "").trim().slice(0, 240);

    res.status(200).json({ categoria, nova, confianca, justificativa });
  } catch (e) {
    if (e && e.refusal) {
      res.status(502).json({ error: "Não foi possível classificar este título." });
      return;
    }
    if (e && e.status === 429) {
      res.status(429).json({ error: "Muitas classificações em pouco tempo. Aguarde um instante e tente de novo." });
      return;
    }
    res.status(e && e.status ? e.status : 500).json({ error: "Não foi possível classificar agora." });
  }
};
