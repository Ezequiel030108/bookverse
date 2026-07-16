/* ============================================================
   BOOKVERSE — API: CONEXÃO COM O INSTAGRAM (só admins)
   ------------------------------------------------------------
   Gerencia a conta do Instagram usada para publicar os stories
   dos livros (painel Minha conta → Administração → Instagram):

     GET    /api/instagram → estado da conexão { conectado, username }
     POST   /api/instagram → conecta { token } (valida na Meta e salva)
     DELETE /api/instagram → desconecta (apaga o token salvo)

   O token fica guardado no Firestore (doc "instagram/conta"),
   que nenhum cliente consegue ler — só o servidor. Como gerar o
   token: README, seção "📲 Stories dos livros no Instagram".
   ============================================================ */

const { aplicarHeaders, exigirAdmin } = require("./_seguranca");
const { lerConta, salvarConta, apagarConta, quemSou } = require("./_instagram");

function lerBody(req) {
  let b = req.body;
  if (typeof b === "string") {
    try { b = JSON.parse(b); } catch (e) { b = {}; }
  }
  return b || {};
}

module.exports = async (req, res) => {
  aplicarHeaders(res);
  if (!(await exigirAdmin(req, res))) return;

  try {
    if (req.method === "GET") {
      const conta = await lerConta();
      if (!conta || !conta.token) {
        res.status(200).json({ conectado: false });
        return;
      }
      res.status(200).json({
        conectado: true,
        username: conta.username || "",
        desde: conta.salvoEm || null
      });
      return;
    }

    if (req.method === "POST") {
      const token = String(lerBody(req).token || "").trim();
      if (token.length < 20 || token.length > 600 || /\s/.test(token)) {
        res.status(400).json({ error: "Token inválido. Copie o token inteiro gerado no painel da Meta e cole sem espaços." });
        return;
      }
      let eu;
      try {
        eu = await quemSou(token);
      } catch (e) {
        res.status(400).json({ error: "A Meta não aceitou esse token. Confira se ele foi gerado em “API do Instagram com login do Instagram” (token de LONGA duração) e tente de novo — passo a passo no README." });
        return;
      }
      await salvarConta({
        token,
        userId: eu.userId,
        username: eu.username,
        salvoEm: Date.now(),
        renovadoEm: Date.now()
      });
      res.status(200).json({ ok: true, username: eu.username });
      return;
    }

    if (req.method === "DELETE") {
      await apagarConta();
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Método não permitido." });
  } catch (e) {
    res.status(500).json({ error: "Não foi possível acessar a configuração do Instagram agora. Tente novamente." });
  }
};
