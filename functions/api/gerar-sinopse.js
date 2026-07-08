/* ============================================================
   BOOKVERSE — API: GERAR SINOPSE COM IA
   ------------------------------------------------------------
   Recebe título, autor e gênero de um livro e devolve uma
   sinopse curta em português, no mesmo estilo das sinopses
   escritas à mão do catálogo.

   Uso: POST /api/gerar-sinopse  { titulo, autor, genero }
   Resposta: { sinopse }

   FUNCIONA COM DUAS IAs (escolha UMA, cadastre com
   `firebase functions:secrets:set` — NUNCA no código):

     • GEMINI_API_KEY     → Google Gemini. É GRATUITO (sem cartão).
                            Pegue a chave em https://aistudio.google.com/apikey
                            ➜ esta é a opção recomendada.

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
  "Você escreve sinopses curtas de livros para uma livraria brasileira chamada BookVerse. " +
  "Escreva SEMPRE em português do Brasil, em 2 a 3 frases (no máximo ~60 palavras), em tom envolvente e elegante. " +
  "Descreva o enredo ou o tema central da obra e termine destacando a importância ou o apelo do livro. " +
  "Não use aspas; não comece repetindo o título nem o nome do autor; não invente prêmios, datas ou dados específicos que não sejam de conhecimento comum. " +
  "Responda APENAS com o texto da sinopse, sem rótulos ou comentários.\n\n" +
  "Exemplos do estilo desejado:\n" +
  "- O mais célebre tratado político de todos os tempos. Com frieza e realismo, Maquiavel analisa como o poder é conquistado e mantido, separando a política da moral e inaugurando o pensamento político moderno. Leitura indispensável para compreender as relações de poder.\n" +
  "- Nas charnecas sombrias da Inglaterra, o amor intenso e destrutivo entre Catherine e Heathcliff atravessa gerações, misturando paixão, vingança e obsessão. Um dos maiores clássicos de todos os tempos.";

function montarPergunta(titulo, autor, genero) {
  return `Escreva a sinopse para o livro "${titulo}"` +
    (autor ? `, de ${autor}` : "") +
    (genero ? ` (gênero: ${genero})` : "") + ".";
}

/* ---------- Google Gemini (gratuito) ---------- */
async function gerarComGemini(key, pergunta) {
  const r = await fetch(GEMINI_API + "?key=" + encodeURIComponent(key), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: pergunta }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 600,
        // Desliga o "pensamento" do 2.5 Flash para não consumir o limite
        // de tokens e devolver a sinopse direto.
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
async function gerarComAnthropic(key, pergunta) {
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

  // Só admins logados podem gerar sinopses (protege a cota da IA).
  if (!(await exigirAdmin(req, res))) return;

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) {
    res.status(500).json({ error: "Geração de sinopse indisponível (chave de IA não configurada)." });
    return;
  }

  try {
    const body = lerBody(req);
    const titulo = String(body.titulo || "").trim().slice(0, 200);
    const autor = String(body.autor || "").trim().slice(0, 120);
    const genero = String(body.genero || "").trim().slice(0, 80);
    if (!titulo) {
      res.status(400).json({ error: "Título é obrigatório." });
      return;
    }

    const pergunta = montarPergunta(titulo, autor, genero);

    // Prefere o Gemini (gratuito) quando configurado; senão usa o Claude.
    const sinopse = geminiKey
      ? await gerarComGemini(geminiKey, pergunta)
      : await gerarComAnthropic(anthropicKey, pergunta);

    if (!sinopse) {
      res.status(502).json({ error: "A IA não retornou uma sinopse." });
      return;
    }

    res.status(200).json({ sinopse });
  } catch (e) {
    if (e && e.refusal) {
      res.status(502).json({ error: "Não foi possível gerar a sinopse para este título." });
      return;
    }
    if (e && e.status === 429) {
      res.status(429).json({ error: "Muitas gerações em pouco tempo. Aguarde um instante e tente de novo." });
      return;
    }
    res.status(e && e.status ? e.status : 500).json({ error: "Não foi possível gerar a sinopse agora." });
  }
};
