/* ============================================================
   BOOKVERSE — API: ESTIMAR A "FAMA" DE UM LIVRO (IA)
   ------------------------------------------------------------
   Recebe título, autor e (opcional) sinopse/gênero e devolve um
   número de 0 a 100 dizendo o quão CONHECIDO/famoso o livro é
   para o público brasileiro. A loja usa esse número para ordenar
   as fileiras (estilo Netflix): os mais famosos aparecem primeiro,
   dentro de uma ordem sempre embaralhada.

   Uso: POST /api/classificar-fama
        { titulo, autor, sinopse, genero }
   Resposta:
        { fama: <0-100>, justificativa: "<frase curta>" }

   Usa a MESMA IA da classificação de categoria/sinopse:
     • GEMINI_API_KEY     → Google Gemini (gratuito). Recomendado.
     • ANTHROPIC_API_KEY  → Claude / Anthropic (paga), como reserva.
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

const SYSTEM =
  "Você avalia o quão FAMOSO e reconhecido é um livro para o público leitor brasileiro. " +
  "Dê uma nota de 0 a 100, onde: " +
  "90-100 = clássico ou best-seller que quase todo mundo conhece (ex.: '1984', 'O Pequeno Príncipe', 'Dom Casmurro'); " +
  "70-89 = muito conhecido e popular; " +
  "40-69 = razoavelmente conhecido; " +
  "10-39 = pouco conhecido do grande público; " +
  "0-9 = obscuro ou desconhecido. " +
  "Considere a fama do TÍTULO e do AUTOR e a presença cultural no Brasil. Seja criterioso: nem todo livro é famoso. " +
  "Responda APENAS com um objeto JSON válido, sem texto fora dele, exatamente neste formato: " +
  "{\"fama\": <numero inteiro de 0 a 100>, \"justificativa\": \"<uma frase curta>\"}.";

function montarPergunta(titulo, autor, sinopse, genero) {
  return "Livro a avaliar:\n" +
    "Título: " + titulo + "\n" +
    (autor ? "Autor: " + autor + "\n" : "") +
    (genero ? "Gênero: " + genero + "\n" : "") +
    (sinopse ? "Sinopse: " + sinopse + "\n" : "") +
    "\nDê a nota de fama seguindo as instruções.";
}

function extrairJSON(txt) {
  if (!txt) return null;
  let s = String(txt).trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i >= 0 && j > i) s = s.slice(i, j + 1);
  try { return JSON.parse(s); } catch (e) { return null; }
}

async function chamarGemini(key, pergunta) {
  const r = await fetch(GEMINI_API + "?key=" + encodeURIComponent(key), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: pergunta }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 200,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error("gemini-falha"); e.status = r.status === 429 ? 429 : 502; throw e; }
  if (data.promptFeedback && data.promptFeedback.blockReason) { const e = new Error("bloqueado"); e.refusal = true; throw e; }
  const cand = (data.candidates || [])[0];
  const partes = (cand && cand.content && cand.content.parts) || [];
  return partes.filter(p => p && p.text).map(p => p.text).join(" ").trim();
}

async function chamarAnthropic(key, pergunta) {
  const r = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-opus-4-8", max_tokens: 200, system: SYSTEM,
      messages: [{ role: "user", content: pergunta }]
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error("anthropic-falha"); e.status = 502; throw e; }
  return (data.content || []).filter(b => b && b.type === "text").map(b => b.text).join(" ").trim();
}

module.exports = async (req, res) => {
  aplicarHeaders(res);
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido." }); return; }

  // Só admins logados podem usar a IA (protege a cota).
  if (!(await exigirAdmin(req, res))) return;

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) {
    res.status(500).json({ error: "Avaliação indisponível (chave de IA não configurada)." });
    return;
  }

  try {
    const body = lerBody(req);
    const titulo = String(body.titulo || "").trim().slice(0, 200);
    const autor = String(body.autor || "").trim().slice(0, 120);
    const sinopse = String(body.sinopse || "").trim().slice(0, 1000);
    const genero = String(body.genero || "").trim().slice(0, 80);
    if (!titulo) { res.status(400).json({ error: "Título é obrigatório." }); return; }

    const pergunta = montarPergunta(titulo, autor, sinopse, genero);
    const texto = geminiKey ? await chamarGemini(geminiKey, pergunta)
                            : await chamarAnthropic(anthropicKey, pergunta);

    const obj = extrairJSON(texto);
    let fama = obj ? Number(obj.fama) : NaN;
    if (!isFinite(fama)) { res.status(502).json({ error: "A IA não retornou uma nota válida." }); return; }
    fama = Math.max(0, Math.min(100, Math.round(fama)));
    const justificativa = String((obj && obj.justificativa) || "").trim().slice(0, 240);

    res.status(200).json({ fama, justificativa });
  } catch (e) {
    if (e && e.status === 429) { res.status(429).json({ error: "Muitas avaliações em pouco tempo. Aguarde um instante." }); return; }
    res.status(e && e.status ? e.status : 500).json({ error: "Não foi possível avaliar a fama agora." });
  }
};
