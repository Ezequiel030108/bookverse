/* ============================================================
   BOOKVERSE — API: IMAGEM TEMPORÁRIA DE UM STORY
   ------------------------------------------------------------
   O Instagram não recebe a imagem em si: ele exige um ENDEREÇO
   público de onde baixá-la. Ao publicar um story, a arte gerada
   no painel fica guardada por alguns minutos no Firestore e é
   servida aqui (/api/story-img?id=...) só até a publicação
   terminar — depois é apagada. O id é um código aleatório longo,
   impossível de adivinhar.
   ============================================================ */

const { banco } = require("./_instagram");

module.exports = async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");

  const id = String((req.query && req.query.id) || "");
  if (!/^[a-f0-9]{32}$/.test(id)) {
    res.status(404).json({ error: "Não encontrado." });
    return;
  }

  try {
    const snap = await banco().collection("storiesTemp").doc(id).get();
    const bytes = snap.exists ? snap.get("imagem") : null;
    if (!bytes || !bytes.length) {
      res.status(404).json({ error: "Não encontrado." });
      return;
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "image/jpeg");
    res.end(Buffer.from(bytes));
  } catch (e) {
    res.status(500).json({ error: "Falha ao carregar a imagem." });
  }
};
