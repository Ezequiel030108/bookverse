/* ============================================================
   BOOKVERSE — MÉTRICAS (Google Analytics 4 + Google Ads)
   ------------------------------------------------------------
   Liga o site ao Google Analytics (relatórios de visitas, livros
   mais vistos, funil de compra) e ao Google Ads (acompanhamento de
   conversões e público de remarketing). Usa o mesmo "gtag.js" do
   Google para os dois.

   👉 VOCÊ NÃO PRECISA MEXER AQUI. Basta preencher os IDs no bloco
      "analytics" do arquivo js/config.js. Enquanto os IDs ficarem
      vazios, as métricas ficam DESLIGADAS e o site funciona normal
      (nenhum script do Google é carregado).

   Passo a passo para pegar os IDs: veja o arquivo METRICAS.md.
   ============================================================ */
window.Analytics = (function () {

  const CFG = (window.LOJA_CONFIG && window.LOJA_CONFIG.analytics) || {};
  const GA_ID      = String(CFG.measurementId || "").trim();       // GA4: "G-XXXXXXXXXX"
  const ADS_ID     = String(CFG.googleAdsId || "").trim();         // Google Ads: "AW-XXXXXXXXXX"
  const ADS_COMPRA = String(CFG.conversaoCompraLabel || "").trim();// Conversão de compra: "AW-XXXXXXXXXX/rótulo"

  const moeda = (window.LOJA_CONFIG && window.LOJA_CONFIG.moeda && window.LOJA_CONFIG.moeda.codigo) || "BRL";
  const ligado = !!(GA_ID || ADS_ID);

  // A fila do gtag existe mesmo desligado, para que window.gtag(...) nunca quebre.
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (!window.gtag) window.gtag = gtag;

  if (ligado) {
    // Carrega o gtag.js UMA vez (usa o primeiro ID disponível para a tag base).
    const idBase = GA_ID || ADS_ID;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(idBase);
    document.head.appendChild(s);

    window.gtag("js", new Date());
    if (GA_ID)  window.gtag("config", GA_ID);   // GA4 (métricas + page_view automático)
    if (ADS_ID) window.gtag("config", ADS_ID);  // Google Ads (remarketing / conversões)
  }

  /* ---------- Ajudantes ---------- */

  // Preço unitário (número) de um livro, já com a promoção aplicada.
  function precoDe(livro) {
    try {
      if (window.Precos && window.Precos.precoUnitario) {
        return Number(window.Precos.precoUnitario(livro, 1)) || 0;
      }
    } catch (e) {}
    return 0;
  }

  // Transforma um livro em um item no formato de e-commerce do GA4.
  function itemDeLivro(livro, qty, preco) {
    const id = (window.idLivro ? window.idLivro(livro) : "") || livro.id || livro.titulo || "";
    return {
      item_id: String(id),
      item_name: livro.titulo || "",
      item_brand: livro.autor || "",
      item_category: livro.genero || "",
      item_variant: livro.condicao || "",
      price: Number(preco != null ? preco : precoDe(livro)) || 0,
      quantity: qty || 1
    };
  }

  // Linhas resolvidas do carrinho/pedido -> itens do GA4.
  // Cada linha vem como { id, qty, livro, precoUnit, ... }.
  function itensDeLinhas(linhas) {
    return (linhas || []).map(function (l, i) {
      const it = itemDeLivro(l.livro || l, l.qty, l.precoUnit);
      it.index = i;
      return it;
    });
  }

  function evento(nome, params) {
    if (!ligado) return;
    try { window.gtag("event", nome, params || {}); } catch (e) {}
  }

  /* ---------- API pública ---------- */
  return {
    ligado: ligado,

    // Evento genérico (use se quiser medir algo específico).
    evento: evento,

    // Cliente abriu a página de um livro.
    verItem: function (livro) {
      if (!livro) return;
      const it = itemDeLivro(livro, 1);
      evento("view_item", { currency: moeda, value: it.price, items: [it] });
    },

    // Cliente adicionou um livro ao carrinho.
    adicionarCarrinho: function (livro, qty) {
      if (!livro) return;
      const it = itemDeLivro(livro, qty || 1);
      evento("add_to_cart", { currency: moeda, value: it.price * it.quantity, items: [it] });
    },

    // Cliente pesquisou algo.
    busca: function (termo) {
      termo = String(termo || "").trim();
      if (termo) evento("search", { search_term: termo });
    },

    // Cliente começou o checkout (abriu a página com itens).
    iniciarCheckout: function (resumo) {
      if (!resumo || resumo.vazio) return;
      evento("begin_checkout", {
        currency: moeda,
        value: Number(resumo.subtotal || 0) || 0,
        items: itensDeLinhas(resumo.itens)
      });
    },

    // Compra concluída. Dispara o "purchase" do GA4 E a conversão do Google Ads.
    // pedido = { codigo, total, subtotal, frete, itens: [linhas resolvidas] }.
    compra: function (pedido) {
      if (!pedido) return;
      const valor = Number(pedido.total != null ? pedido.total : pedido.subtotal) || 0;
      const itens = itensDeLinhas(pedido.itens);

      evento("purchase", {
        transaction_id: pedido.codigo || "",
        currency: moeda,
        value: valor,
        shipping: Number(pedido.frete || 0) || 0,
        items: itens
      });

      // Conversão específica do Google Ads (só se o rótulo estiver configurado).
      if (ADS_COMPRA) {
        evento("conversion", {
          send_to: ADS_COMPRA,
          transaction_id: pedido.codigo || "",
          value: valor,
          currency: moeda
        });
      }
    }
  };
})();
