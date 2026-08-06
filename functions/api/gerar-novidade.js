/* ============================================================
   BOOKVERSE — API: ESCREVER A NOVIDADE COM IA
   ------------------------------------------------------------
   O botão "Escrever com IA" do painel Novidades chama aqui. A
   partir do TÍTULO que o lojista escreveu (e do livro ou da
   categoria que ele escolheu, quando escolheu), a IA devolve o
   corpo da mensagem — que o lojista lê, ajusta e envia.

   Uso: POST /api/gerar-novidade
     {
       titulo:    "Chegaram 12 clássicos novos",     (obrigatório)
       livro:     { titulo, autor, genero, preco, estado, sinopse },
       categoria: "Mangás",
       exemplos:  ["Vidas Secas", "Dom Casmurro"]
     }
   Resposta: { texto }

   Só administradores podem chamar (a cota da IA é da loja).

   Usa o Google Gemini, que é GRATUITO. A chave é a MESMA já usada
   para gerar sinopses:
     firebase functions:secrets:set GEMINI_API_KEY
   (pegue em https://aistudio.google.com/apikey)
   ============================================================ */

const { aplicarHeaders, exigirAdmin } = require("./_seguranca");

const GEMINI_MODELO = "gemini-2.5-flash";
const GEMINI_API =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  GEMINI_MODELO + ":generateContent";

function lerBody(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b || {};
}

/* ------------------------------------------------------------
   AS REGRAS DA IA
   Quer mudar o jeito que a loja fala? É só editar o texto abaixo
   — é português comum. Cada linha é uma instrução.

   As duas primeiras regras existem por um motivo prático: o
   e-mail JÁ imprime "Oi, Ana!" no começo e JÁ assina a loja no
   rodapé. Se a IA escrever isso de novo, o cliente recebe uma
   mensagem com duas saudações e duas assinaturas.
   ------------------------------------------------------------ */
const SYSTEM =
  "Você escreve os avisos de novidade da BookVerse, uma livraria pequena de Juazeirinho (PB) que vende livros novos e usados. " +
  "O texto vai por e-mail e WhatsApp para clientes que JÁ compraram na loja.\n\n" +

  "REGRAS OBRIGATÓRIAS:\n" +
  "1. NÃO comece com saudação (nada de \"Oi\", \"Olá\", \"Bom dia\"). O e-mail já cumprimenta o cliente pelo nome antes do seu texto.\n" +
  "2. NÃO assine no final, NÃO escreva o nome da loja no fim e NÃO se despeça (\"abraços\", \"até logo\"). O rodapé do e-mail já faz isso.\n" +
  "3. NÃO repita o título que o lojista escreveu — ele já aparece grande, logo acima do seu texto.\n" +
  "4. Escreva de 2 a 3 parágrafos CURTOS, separados por UMA LINHA EM BRANCO entre eles. No total, no máximo 90 palavras.\n" +
  "5. NUNCA invente informação: preço, desconto, porcentagem, frete grátis, prazo, quantidade em estoque, data, sorteio, brinde ou promoção. Use SOMENTE os dados que forem informados. Se não houver preço informado, não fale de preço.\n" +
  "6. Termine com um convite leve para conhecer (ex.: \"Dá uma olhada\", \"Passa lá pra ver\"). Nunca use urgência agressiva, caixa alta ou \"COMPRE JÁ\".\n" +
  "7. No máximo UM emoji na mensagem inteira, e só se combinar naturalmente. Pode não usar nenhum.\n" +
  "8. Não use aspas em volta do texto, não use rótulos (\"Mensagem:\"), não use markdown, não use listas com marcador.\n" +
  "9. Responda APENAS com o texto da mensagem, mais nada.\n\n" +

  "TOM: português do Brasil, caloroso e direto, como uma livraria de bairro conversando com um cliente conhecido. " +
  "Nada de linguagem de propaganda (\"imperdível\", \"exclusivo\", \"não perca\", \"aproveite já\"). Fale como gente.\n\n" +

  "EXEMPLO 1 — título \"Chegaram 12 clássicos novos\":\n" +
  "Separamos uma leva nova de clássicos que estava faltando na estante: Machado, Graciliano, Dostoiévski e outros nomes que vocês vivem pedindo.\n\n" +
  "São poucas unidades de cada, quase todos em ótimo estado. Quem chegar primeiro escolhe as melhores capas.\n\n" +
  "Dá uma olhada na estante e me chama se quiser separar algum.\n\n" +

  "EXEMPLO 2 — título \"Vidas Secas voltou pra estante\":\n" +
  "O clássico de Graciliano Ramos está de volta. É aquela leitura curta e seca que fica com a gente por muito tempo — a caminhada da família de Fabiano pelo sertão não sai da cabeça.\n\n" +
  "Passa lá pra ver as fotos e o estado do exemplar.";

/* Monta a pergunta com o contexto que o painel mandou. */
function montarPergunta(dados) {
  const partes = [`O lojista escreveu este título para a novidade: "${dados.titulo}".`];

  if (dados.livro && dados.livro.titulo) {
    const l = dados.livro;
    const ficha = [
      `título: ${l.titulo}`,
      l.autor ? `autor: ${l.autor}` : "",
      l.genero ? `categoria: ${l.genero}` : "",
      l.preco ? `preço: ${l.preco}` : "",
      l.estado ? `estado do exemplar: ${l.estado}` : ""
    ].filter(Boolean).join("; ");
    partes.push(`A novidade é sobre este livro — ${ficha}.`);
    if (l.sinopse) partes.push(`Sinopse do livro (use como base, resuma com suas palavras): ${l.sinopse}`);
  } else if (dados.categoria) {
    partes.push(`A novidade é sobre a categoria "${dados.categoria}" da loja.`);
    if (dados.exemplos && dados.exemplos.length) {
      partes.push(`Alguns livros dessa categoria na loja: ${dados.exemplos.slice(0, 6).join(", ")}.`);
    }
  }

  partes.push("Escreva o corpo da mensagem seguindo todas as regras.");
  return partes.join("\n");
}

async function gerarComGemini(key, pergunta) {
  const r = await fetch(GEMINI_API + "?key=" + encodeURIComponent(key), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: pergunta }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 700,
        // Desliga o "pensamento" do 2.5 Flash: aqui a tarefa é curta e
        // o raciocínio só consumiria o limite de tokens da resposta.
        thinkingConfig: { thinkingBudget: 0 }
      }
    }),
    signal: AbortSignal.timeout(20000)
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

/* Tira os vícios mais comuns caso a IA escorregue nas regras. */
function limpar(texto) {
  let t = String(texto || "").trim();
  t = t.replace(/^```[a-z]*\n?|```$/gi, "").trim();          // blocos de código
  t = t.replace(/^["“”']+|["“”']+$/g, "").trim();             // aspas em volta
  t = t.replace(/^(mensagem|texto|corpo)\s*:\s*/i, "").trim(); // rótulos
  // Saudação teimosa na primeira linha (o e-mail já cumprimenta o cliente
  // pelo nome). Come a frase inteira da saudação — "Oi, tudo bem!" sai
  // todo, não só o "Oi,".
  // (o "não pode vir letra depois" evita comer frases que só COMEÇAM
  //  parecido, tipo "Oitenta livros novos!")
  t = t.replace(/^(oi|olá|ola|e aí|bom dia|boa tarde|boa noite)(?![a-zà-úA-ZÀ-Ú])[^\n!.?]{0,40}([!.?]|\n)\s*/i, "").trim();
  // Assinatura/despedida teimosa na última linha.
  t = t.replace(/\n+\s*(abraços?|até logo|até breve|beijos?|com carinho|equipe bookverse|bookverse)\s*[.!]?\s*$/i, "").trim();
  t = t.replace(/\n{3,}/g, "\n\n");                            // no máx. 1 linha em branco
  return t;
}

module.exports = async (req, res) => {
  aplicarHeaders(res);
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido." }); return; }
  if (!(await exigirAdmin(req, res))) return;

  const body = lerBody(req);
  const titulo = String(body.titulo || "").trim().slice(0, 160);
  if (!titulo) { res.status(400).json({ error: "Escreva o título da novidade primeiro." }); return; }

  const key = String(process.env.GEMINI_API_KEY || "").trim();
  if (!key || key === "-") {
    res.status(503).json({ error: "A IA não está configurada. Cadastre a GEMINI_API_KEY (veja o README)." });
    return;
  }

  const contexto = {
    titulo,
    categoria: String(body.categoria || "").trim().slice(0, 80),
    exemplos: Array.isArray(body.exemplos)
      ? body.exemplos.map(t => String(t || "").slice(0, 90)).filter(Boolean).slice(0, 6)
      : [],
    livro: body.livro && typeof body.livro === "object" ? {
      titulo: String(body.livro.titulo || "").slice(0, 120),
      autor: String(body.livro.autor || "").slice(0, 120),
      genero: String(body.livro.genero || "").slice(0, 80),
      preco: String(body.livro.preco || "").slice(0, 40),
      estado: String(body.livro.estado || "").slice(0, 120),
      sinopse: String(body.livro.sinopse || "").slice(0, 600)
    } : null
  };

  try {
    const texto = limpar(await gerarComGemini(key, montarPergunta(contexto)));
    if (!texto) throw new Error("vazio");
    res.status(200).json({ texto });
  } catch (e) {
    if (e && e.refusal) {
      res.status(422).json({ error: "A IA não quis escrever sobre isso. Tente outro título." });
      return;
    }
    if (e && e.status === 429) {
      res.status(429).json({ error: "A IA atingiu o limite por agora. Tente de novo daqui a pouco." });
      return;
    }
    console.error("[gerar-novidade] Falha ao gerar o texto:", e);
    res.status(502).json({ error: "Não foi possível escrever agora. Tente de novo ou escreva à mão." });
  }
};
