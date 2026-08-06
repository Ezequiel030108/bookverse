/* ============================================================
   BOOKVERSE — API: CAMPANHA DE NOVIDADES
   ------------------------------------------------------------
   É o "anúncio para a base": livro novo na estante, promoção da
   semana, aviso de reabertura. Manda o mesmo recado por e-mail e
   pelo WhatsApp da loja, para todos os clientes que aceitam
   receber novidades.

   SÓ ADMINISTRADORES podem usar.

   Quantas pessoas vão receber:
     GET /api/campanha
     → { total, comEmail, comWhatsapp }

   Enviar (o painel chama várias vezes, uma por lote):
     POST /api/campanha
     { "titulo": "...", "texto": "...", "link": "...",
       "canais": ["email","whatsapp"], "cursor": "", "teste": false }
     → { enviados, falhas, proximo, ... }

   POR QUE EM LOTES: uma Cloud Function tem 60 segundos para
   responder. Mandar 500 e-mails de uma vez estouraria o tempo —
   então o painel manda um pedaço por vez e mostra o progresso.
   Isso também respeita o limite por segundo dos serviços de
   e-mail e da Meta.

   RESPEITO AO CLIENTE (e à LGPD): quem desmarcou "novidades" na
   conta, ou clicou em "não quero mais receber" no rodapé do
   e-mail, fica de fora automaticamente. Os avisos de PEDIDO não
   passam por aqui — aqueles são obrigatórios e continuam saindo.
   ============================================================ */

const { aplicarHeaders, usuarioDoToken, ehAdmin } = require("./_seguranca");
const { dadosLoja, modeloWhatsapp, idiomaWhatsapp } = require("./_loja");
const { montarCampanha, linkDescadastro } = require("./_avisos");
const { enviarEmail, emailValido } = require("./_email");
const { enviarWhatsapp, normalizarTelefone } = require("./_whatsapp");
const dados = require("./_dados");

const POR_LOTE = 60;        // clientes por chamada (cabe folgado nos 60s)
const EM_PARALELO = 5;      // envios simultâneos — gentil com os serviços

function lerBody(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b || {};
}

/* Executa a lista de tarefas de poucas em poucas. */
async function emGrupos(itens, tamanho, tarefa) {
  const saida = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    const grupo = itens.slice(i, i + tamanho);
    saida.push(...await Promise.all(grupo.map(tarefa)));
  }
  return saida;
}

/* Quem recebe: tem conta, aceita novidades e tem e-mail ou WhatsApp. */
function destinatariosValidos(clientes, canais) {
  const querEmail = canais.indexOf("email") >= 0;
  const querZap = canais.indexOf("whatsapp") >= 0;
  return clientes.filter(c => {
    if (!dados.querReceber(c, "novidades", "novidades")) return false;
    const temEmail = querEmail && dados.querReceber(c, "email", "novidades") && emailValido(c.email);
    const temZap = querZap && dados.querReceber(c, "whatsapp", "novidades") && !!normalizarTelefone(c.telefone);
    return temEmail || temZap;
  });
}

module.exports = async (req, res) => {
  aplicarHeaders(res);

  const usuario = await usuarioDoToken(req);
  if (!usuario || !ehAdmin(usuario.email)) {
    res.status(401).json({ error: "Só os administradores da loja podem enviar novidades." });
    return;
  }

  /* ---------- Quantas pessoas vão receber ---------- */
  if (req.method === "GET") {
    try {
      let cursor = "", total = 0, comEmail = 0, comWhatsapp = 0, paginas = 0;
      do {
        const pagina = await dados.listarClientes(cursor, 300);
        pagina.clientes.forEach(c => {
          if (!dados.querReceber(c, "novidades", "novidades")) return;
          const e = dados.querReceber(c, "email", "novidades") && emailValido(c.email);
          const z = dados.querReceber(c, "whatsapp", "novidades") && !!normalizarTelefone(c.telefone);
          if (e) comEmail++;
          if (z) comWhatsapp++;
          if (e || z) total++;
        });
        cursor = pagina.proximo;
      } while (cursor && ++paginas < 20);     // trava de segurança: até 6.000 contas
      res.status(200).json({ total, comEmail, comWhatsapp });
    } catch (e) {
      console.error("[campanha] Falha ao contar os clientes:", e);
      res.status(500).json({ error: "Não foi possível contar os clientes agora." });
    }
    return;
  }

  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido." }); return; }

  /* ---------- Enviar ---------- */
  const body = lerBody(req);
  const titulo = String(body.titulo || "").trim();
  const texto = String(body.texto || "").trim();
  if (!titulo) { res.status(400).json({ error: "Escreva um título para a novidade." }); return; }
  if (!texto) { res.status(400).json({ error: "Escreva a mensagem da novidade." }); return; }

  const canais = Array.isArray(body.canais) && body.canais.length ? body.canais : ["email"];
  const teste = body.teste === true;
  const cursor = String(body.cursor || "");
  const loja = dadosLoja(req);
  const campanhaId = String(body.campanhaId || "").trim() ||
    ("c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));

  const base = {
    titulo, texto,
    link: String(body.link || "").trim(),
    imagem: String(body.imagem || "").trim(),
    rotuloBotao: String(body.rotuloBotao || "").trim(),
    loja
  };

  try {
    /* Envio de teste: só para o admin que está com o painel aberto. */
    let alvos = [];
    let proximo = "";
    if (teste) {
      const eu = (await dados.lerCliente(usuario.uid)) || {};
      alvos = [Object.assign({}, eu, {
        uid: usuario.uid,
        email: eu.email || usuario.email,
        nome: eu.nome || usuario.nome
      })];
    } else {
      const pagina = await dados.listarClientes(cursor, POR_LOTE);
      alvos = destinatariosValidos(pagina.clientes, canais);
      proximo = pagina.proximo;
    }

    const resultados = await emGrupos(alvos, EM_PARALELO, async (cliente) => {
      const conteudo = montarCampanha(Object.assign({}, base, {
        nomeCliente: cliente.nome,
        linkDescadastro: linkDescadastro(cliente.uid, loja.site)
      }));

      const saida = { uid: cliente.uid, email: null, whatsapp: null };

      if (canais.indexOf("email") >= 0 &&
          (teste || dados.querReceber(cliente, "email", "novidades")) && emailValido(cliente.email)) {
        saida.email = await enviarEmail({
          para: cliente.email,
          paraNome: cliente.nome || "",
          assunto: conteudo.assunto,
          html: conteudo.html,
          texto: conteudo.texto,
          responderPara: process.env.EMAIL_RESPONDER || "",
          linkDescadastro: linkDescadastro(cliente.uid, loja.site)
        });
      }

      if (canais.indexOf("whatsapp") >= 0 &&
          (teste || dados.querReceber(cliente, "whatsapp", "novidades")) && normalizarTelefone(cliente.telefone)) {
        saida.whatsapp = await enviarWhatsapp({
          telefone: cliente.telefone,
          modelo: modeloWhatsapp("novidades"),
          idioma: idiomaWhatsapp(),
          parametros: conteudo.parametros,
          imagem: base.imagem || "",
          texto: conteudo.whatsapp
        });
      }

      return saida;
    });

    const conta = (canal) => resultados.filter(r => r[canal] && r[canal].ok).length;
    const enviados = resultados.filter(r => (r.email && r.email.ok) || (r.whatsapp && r.whatsapp.ok)).length;
    const falhas = resultados
      .filter(r => !((r.email && r.email.ok) || (r.whatsapp && r.whatsapp.ok)))
      .map(r => ({
        uid: r.uid,
        motivo: (r.email && r.email.motivo) || (r.whatsapp && r.whatsapp.motivo) || "sem canal disponível"
      }));

    // Guarda o histórico (aparece no painel e serve de comprovante).
    // Como o envio vem em lotes, os números são SOMADOS a cada chamada.
    if (!teste) {
      await dados.registrarCampanha(campanhaId, {
        titulo, texto, link: base.link, canais, enviadoPor: usuario.email
      }, {
        enviados, porEmail: conta("email"), porWhatsapp: conta("whatsapp"), falhas: falhas.length
      }).catch(() => {});
    }

    res.status(200).json({
      ok: true,
      campanhaId,
      teste,
      alcancados: alvos.length,
      enviados,
      porEmail: conta("email"),
      porWhatsapp: conta("whatsapp"),
      falhas: falhas.slice(0, 10),
      proximo: teste ? "" : proximo
    });
  } catch (e) {
    console.error("[campanha] Falha ao enviar:", e);
    res.status(500).json({ error: "Não foi possível enviar a campanha agora." });
  }
};
