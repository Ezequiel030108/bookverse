/* ============================================================
   BOOKVERSE — API: GERAR SINOPSE COM IA (Claude / Anthropic)
   ------------------------------------------------------------
   Recebe título, autor e gênero de um livro e devolve uma
   sinopse curta em português, no mesmo estilo das sinopses
   escritas à mão do catálogo.

   Uso: POST /api/gerar-sinopse  { titulo, autor, genero }
   Resposta: { sinopse }

   Variável de ambiente (configure na Vercel, NÃO no código):
     - ANTHROPIC_API_KEY  → chave da API da Anthropic (secreta)
   ============================================================ */

const { aplicarHeaders } = require("./_seguranca");
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

function lerBody(req) {
  let b = req.body;
  if (typeof b === "string") {
    try { b = JSON.parse(b); } catch (e) { b = {}; }
  }
  return b || {};
}

module.exports = async (req, res) => {
  aplicarHeaders(res);
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
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

    const system =
      "Você escreve sinopses curtas de livros para uma livraria brasileira chamada BookVerse. " +
      "Escreva SEMPRE em português do Brasil, em 2 a 3 frases (no máximo ~60 palavras), em tom envolvente e elegante. " +
      "Descreva o enredo ou o tema central da obra e termine destacando a importância ou o apelo do livro. " +
      "Não use aspas; não comece repetindo o título nem o nome do autor; não invente prêmios, datas ou dados específicos que não sejam de conhecimento comum. " +
      "Responda APENAS com o texto da sinopse, sem rótulos ou comentários.\n\n" +
      "Exemplos do estilo desejado:\n" +
      "- O mais célebre tratado político de todos os tempos. Com frieza e realismo, Maquiavel analisa como o poder é conquistado e mantido, separando a política da moral e inaugurando o pensamento político moderno. Leitura indispensável para compreender as relações de poder.\n" +
      "- Nas charnecas sombrias da Inglaterra, o amor intenso e destrutivo entre Catherine e Heathcliff atravessa gerações, misturando paixão, vingança e obsessão. Um dos maiores clássicos de todos os tempos.";

    const pergunta =
      `Escreva a sinopse para o livro "${titulo}"` +
      (autor ? `, de ${autor}` : "") +
      (genero ? ` (gênero: ${genero})` : "") + ".";

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
        system: system,
        messages: [{ role: "user", content: pergunta }]
      })
    });

    const data = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: "Falha ao gerar a sinopse." });
      return;
    }
    if (data.stop_reason === "refusal") {
      res.status(502).json({ error: "Não foi possível gerar a sinopse para este título." });
      return;
    }

    const sinopse = (data.content || [])
      .filter(b => b && b.type === "text")
      .map(b => b.text)
      .join(" ")
      .trim();

    if (!sinopse) {
      res.status(502).json({ error: "A IA não retornou uma sinopse." });
      return;
    }

    res.status(200).json({ sinopse });
  } catch (e) {
    res.status(500).json({ error: "Erro ao gerar a sinopse." });
  }
};
