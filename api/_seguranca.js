/* ============================================================
   BOOKVERSE — Helpers de segurança para as APIs serverless
   ------------------------------------------------------------
   Arquivos com "_" no início NÃO viram endpoints na Vercel —
   servem só para reaproveitar código entre as funções.
   ============================================================ */

// Cabeçalhos de segurança aplicados em todas as respostas das APIs.
function aplicarHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
}

module.exports = { aplicarHeaders };
