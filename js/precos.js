/* ============================================================
   BOOKVERSE — UTILIDADES DE PREÇO E PROMOÇÃO (compartilhadas)
   ------------------------------------------------------------
   Usadas tanto pela vitrine (index) quanto pelo carrinho e pelo
   checkout, para que o preço mostrado seja SEMPRE o mesmo em
   todo o site — inclusive durante a promoção.

   Não precisa mexer aqui. As regras de promoção ficam em
   js/livros.js (a constante PROMOCAO).
   ============================================================ */

window.Precos = (function () {

  /* A promoção está ligada? (mesma regra usada na vitrine) */
  function promoAtiva() {
    if (typeof PROMOCAO === "undefined" || !PROMOCAO) return false;
    try {
      if (new URLSearchParams(location.search).get("promo") === "teste") return true;
    } catch (e) { /* sem query string */ }
    const agora = new Date();
    return (
      agora >= new Date(PROMOCAO.inicio + "T00:00:00") &&
      agora <= new Date(PROMOCAO.fim + "T23:59:59")
    );
  }

  /* "R$ 45,00" -> 45 (número). Retorna null se não der para ler. */
  function precoNumerico(precoTexto) {
    const n = parseFloat(String(precoTexto).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  }

  /* Arredonda para o real cheio, a favor do cliente (22,50 -> 22). */
  function arredondarReal(valor) { return Math.ceil(valor - 0.5); }

  /* Formata um número em Reais no padrão brasileiro: 45 -> "R$ 45,00". */
  function formatarBRL(valor) {
    const simbolo = (window.LOJA_CONFIG && window.LOJA_CONFIG.moeda && window.LOJA_CONFIG.moeda.simbolo) || "R$";
    return simbolo + " " + Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /* Preço unitário JÁ considerando a promoção.
     totalItens = quantidade total de livros no carrinho (para o desconto
     "levando 2 ou mais"). Em telas isoladas (card/modal) passe 1. */
  function precoUnitario(livro, totalItens) {
    const base = precoNumerico(livro.preco);
    if (base === null) return 0;
    if (!promoAtiva()) return base;

    const teto = livro.descontoMaximo || 100;
    const usaDupla = (totalItens || 1) >= 2;
    const pct = Math.min(usaDupla ? PROMOCAO.descontoDupla : PROMOCAO.descontoUm, teto);
    return arredondarReal(base * (1 - pct / 100));
  }

  /* Último dia da promoção por extenso (ex.: "29 de junho"). */
  function dataFimPromo() {
    if (typeof PROMOCAO === "undefined" || !PROMOCAO) return "";
    const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
                   "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const fim = new Date(PROMOCAO.fim + "T12:00:00");
    return fim.getDate() + " de " + meses[fim.getMonth()];
  }

  return {
    promoAtiva,
    precoNumerico,
    arredondarReal,
    formatarBRL,
    precoUnitario,
    dataFimPromo,
    nomePromo: function () { return (typeof PROMOCAO !== "undefined" && PROMOCAO) ? PROMOCAO.nome : ""; }
  };
})();
