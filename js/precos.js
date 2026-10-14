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

  /* A promoção está ligada? (mesma regra usada na vitrine)
     É chamada para cada preço da página: o ?promo=teste e as datas são
     lidos uma vez só (e de novo apenas se mudarem). */
  let buscaLida = null, promoTeste = false, datasLidas = null;
  function promoAtiva() {
    if (typeof PROMOCAO === "undefined" || !PROMOCAO) return false;
    try {
      if (location.search !== buscaLida) {
        buscaLida = location.search;
        promoTeste = new URLSearchParams(buscaLida).get("promo") === "teste";
      }
      if (promoTeste) return true;
    } catch (e) { /* sem query string (ex.: no servidor) */ }
    if (!datasLidas || datasLidas.inicio !== PROMOCAO.inicio || datasLidas.fim !== PROMOCAO.fim) {
      datasLidas = {
        inicio: PROMOCAO.inicio, fim: PROMOCAO.fim,
        de: new Date(PROMOCAO.inicio + "T00:00:00").getTime(),
        ate: new Date(PROMOCAO.fim + "T23:59:59").getTime()
      };
    }
    const agora = Date.now();
    return agora >= datasLidas.de && agora <= datasLidas.ate;
  }

  /* "R$ 45,00" -> 45 (número). Retorna null se não der para ler. */
  function precoNumerico(precoTexto) {
    const n = parseFloat(String(precoTexto).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  }

  /* Arredonda para o real cheio SEMPRE a favor do cliente (22,50 -> 22).
     Tem que ser para BAIXO: arredondando para cima, um livro de R$ 14 com
     "10% off" sairia por R$ 13 — só 7% de desconto, menos do que a faixa
     da promoção anuncia. Para baixo, o desconto nunca fica abaixo do
     que foi prometido. */
  function arredondarReal(valor) { return Math.floor(valor); }

  /* O mesmo texto que Intl.NumberFormat("pt-BR", 2 casas) daria, sem
     carregar os dados de idioma do navegador (só isso custava ~75 ms num
     celular simples, a cada abertura da loja). Arredonda pelos dígitos
     que o número mostra (0.015 -> "0,02"), como o Intl. Fora da faixa de
     preços (muito grande, NaN...), devolve null e formatarBRL usa o Intl. */
  function reaisSemIntl(n) {
    if (!Number.isFinite(n) || Math.abs(n) >= 1e13) return null;
    const s = String(Math.abs(n));
    if (/e/i.test(s)) return null;                       // notação científica (ex.: 1e-7)
    const partes = s.split(".");
    const frac = partes[1] || "";
    let centavos = Number(partes[0]) * 100 + Number((frac + "00").slice(0, 2));
    if (frac.length > 2 && frac.charCodeAt(2) >= 53) centavos += 1;   // 3ª casa >= 5: sobe
    const reais = String(Math.floor(centavos / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (n < 0 || Object.is(n, -0) ? "-" : "") + reais + "," + String(centavos % 100).padStart(2, "0");
  }

  /* Formata um número em Reais no padrão brasileiro: 45 -> "R$ 45,00". */
  let formatador = null;
  function formatarBRL(valor) {
    const simbolo = (window.LOJA_CONFIG && window.LOJA_CONFIG.moeda && window.LOJA_CONFIG.moeda.simbolo) || "R$";
    const n = Number(valor);
    let texto = reaisSemIntl(n);
    if (texto === null) {
      if (!formatador) formatador = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      texto = formatador.format(n);
    }
    return simbolo + " " + texto;
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
