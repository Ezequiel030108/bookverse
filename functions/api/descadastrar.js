/* ============================================================
   BOOKVERSE — API: SAIR DAS NOVIDADES (um clique)
   ------------------------------------------------------------
   É o link "Não quero mais receber novidades" do rodapé dos
   e-mails de campanha. Um clique e pronto — sem login, sem
   formulário, sem "tem certeza?" três vezes.

   Isso não é frescura: é exigência da LGPD e das regras
   antispam do Gmail/Outlook. Loja que não dá saída fácil vai
   parar na caixa de spam de todo mundo.

   O link vem assinado (parâmetro t) com o segredo AVISOS_SECRET,
   então ninguém consegue descadastrar outra pessoa.

   IMPORTANTE: sair das novidades NÃO cancela os avisos de
   pedido — "pagamento confirmado" e "saiu para entrega"
   continuam chegando, porque são parte da compra.

     GET  /api/descadastrar?u=<uid>&t=<assinatura>   (o clique)
     POST /api/descadastrar?u=<uid>&t=<assinatura>   (o botão do Gmail)
   ============================================================ */

const { aplicarHeaders } = require("./_seguranca");
const { tokenDescadastroValido, esc } = require("./_avisos");
const { dadosLoja } = require("./_loja");
const dados = require("./_dados");

/* Página de resposta, no visual da loja. */
function pagina(titulo, mensagem, loja, sucesso) {
  const site = loja.site || "";
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)} · ${esc(loja.nome)}</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#0a0524;background-image:linear-gradient(160deg,#0a0524,#1f1466 70%,#2e1f8a);
       font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
       color:#f3edff;padding:24px;}
  .caixa{max-width:440px;width:100%;background:rgba(30,18,80,.55);border:1px solid rgba(184,158,255,.25);
         border-radius:16px;padding:34px 28px;text-align:center;backdrop-filter:blur(8px);}
  .marca{font-family:Georgia,serif;font-size:24px;font-weight:700;letter-spacing:.5px;margin:0 0 22px;}
  .icone{font-size:40px;line-height:1;margin:0 0 14px;}
  h1{font-size:20px;margin:0 0 12px;line-height:1.35;}
  p{font-size:15px;line-height:1.65;color:rgba(243,237,255,.78);margin:0 0 14px;}
  a.botao{display:inline-block;margin-top:14px;padding:13px 28px;border-radius:999px;
          background:#4a2bb5;color:#fff;text-decoration:none;font-weight:700;font-size:15px;}
</style>
</head><body>
  <main class="caixa">
    <p class="marca">${esc(loja.nome)}</p>
    <p class="icone">${sucesso ? "✅" : "⚠️"}</p>
    <h1>${esc(titulo)}</h1>
    <p>${mensagem}</p>
    ${site ? `<a class="botao" href="${esc(site)}">Voltar para a loja</a>` : ""}
  </main>
</body></html>`;
}

module.exports = async (req, res) => {
  aplicarHeaders(res);
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const loja = dadosLoja(req);
  const q = req.query || {};
  const uid = String(q.u || "").trim();
  const token = String(q.t || "").trim();

  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!uid || !tokenDescadastroValido(uid, token)) {
    res.status(400).send(pagina(
      "Link inválido ou expirado",
      `Não conseguimos confirmar este link. Você pode desligar as novidades ` +
      `direto na sua conta, em <strong>Minha conta → Meus dados → Avisos e novidades</strong>.`,
      loja, false));
    return;
  }

  try {
    await dados.banco().collection("users").doc(uid).set({
      notificacoes: { novidades: false },
      novidadesCanceladoEm: Date.now()
    }, { merge: true });

    res.status(200).send(pagina(
      "Pronto, você saiu das novidades",
      `Não vamos mais te mandar promoções nem avisos de livro novo. ` +
      `Os avisos dos seus <strong>pedidos</strong> continuam chegando normalmente ` +
      `(pagamento confirmado, entrega e por aí vai).<br><br>` +
      `Mudou de ideia? É só voltar em <strong>Minha conta → Meus dados</strong> e marcar de novo.`,
      loja, true));
  } catch (e) {
    console.error("[descadastrar] Falha ao salvar a preferência:", e);
    res.status(500).send(pagina(
      "Não deu certo agora",
      `Tivemos um problema para salvar sua escolha. Tente de novo daqui a pouco ` +
      `ou desligue as novidades em <strong>Minha conta → Meus dados</strong>.`,
      loja, false));
  }
};
