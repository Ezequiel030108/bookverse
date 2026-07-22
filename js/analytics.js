/* ============================================================
   BOOKVERSE — MÉTRICAS (Google Analytics 4 + Google Ads)
   ------------------------------------------------------------
   Liga o site ao Google Analytics (relatórios de visitas, livros
   mais vistos, funil de compra) e ao Google Ads (acompanhamento de
   conversões, conversões otimizadas e público de remarketing). Usa
   o mesmo "gtag.js" do Google para os dois.

   👉 VOCÊ NÃO PRECISA MEXER AQUI. Basta preencher os IDs no bloco
      "analytics" do arquivo js/config.js. Enquanto os IDs ficarem
      vazios, as métricas ficam DESLIGADAS e o site funciona normal
      (nenhum script do Google é carregado).

   Passo a passo para pegar os IDs: veja o arquivo METRICAS.md.
   ============================================================ */
window.Analytics = (function () {

  const CFG = (window.LOJA_CONFIG && window.LOJA_CONFIG.analytics) || {};
  const GA_ID       = String(CFG.measurementId || "").trim();        // GA4: "G-XXXXXXXXXX"
  const ADS_ID      = String(CFG.googleAdsId || "").trim();          // Google Ads: "AW-XXXXXXXXXX"
  const ADS_COMPRA   = String(CFG.conversaoCompraLabel || "").trim();  // Compra:   "AW-XXXXXXXXXX/rótulo"
  const ADS_CONTATO  = String(CFG.conversaoContatoLabel || "").trim(); // Contato:  "AW-XXXXXXXXXX/rótulo"
  const ADS_CARRINHO = String(CFG.conversaoCarrinhoLabel || "").trim();// Add carrinho: "AW-XXXXXXXXXX/rótulo"
  const ADS_CHECKOUT = String(CFG.conversaoCheckoutLabel || "").trim();// Início checkout: "AW-XXXXXXXXXX/rótulo"

  const PIXEL_ID = String(CFG.metaPixelId || "").trim();          // Meta Pixel: "1234567890123456"

  const moeda = (window.LOJA_CONFIG && window.LOJA_CONFIG.moeda && window.LOJA_CONFIG.moeda.codigo) || "BRL";
  const gtagOn  = !!(GA_ID || ADS_ID);   // Google ligado?
  const pixelOn = !!PIXEL_ID;            // Meta (Instagram/Facebook) ligado?
  const ligado  = gtagOn || pixelOn;

  // A fila do gtag existe mesmo desligado, para que window.gtag(...) nunca quebre.
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (!window.gtag) window.gtag = gtag;

  if (gtagOn) {
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

  // Carrega o Meta Pixel (fbq) UMA vez e conta a visita da página.
  if (pixelOn) {
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = "2.0";
      n.queue = []; t = b.createElement(e); t.async = true;
      t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", PIXEL_ID);
    window.fbq("track", "PageView");
  }

  // Dispara um evento no Meta Pixel (só se o pixel estiver ligado).
  function metaEvento(nome, params) {
    if (!pixelOn) return;
    try { window.fbq("track", nome, params || {}); } catch (e) {}
  }
  // Campos de conteúdo (produto) que o Meta usa p/ catálogo e remarketing.
  function metaConteudo(itens, valor) {
    const its = itens || [];
    return {
      content_type: "product",
      content_ids: its.map(function (i) { return String(i.item_id || i.id || ""); }),
      contents: its.map(function (i) { return { id: String(i.item_id || i.id || ""), quantity: i.quantity || 1 }; }),
      value: Number(valor || 0) || 0,
      currency: moeda
    };
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
  // Encurta o id para <=50 chars EXATAMENTE como o feed do catálogo
  // (functions/api/feed.js: idParaFeed), para o content_id do Pixel/GA4 casar
  // 100% com o g:id do produto (taxa de correspondência do catálogo do Meta e
  // remarketing dinâmico do Google).
  function hashCurtoId(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  function idParaCatalogo(id) {
    id = String(id || "");
    if (id.length <= 50) return id;
    const sufixo = "-" + hashCurtoId(id);
    return id.slice(0, 50 - sufixo.length) + sufixo;
  }

  function itemDeLivro(livro, qty, preco) {
    const idBruto = (window.idLivro ? window.idLivro(livro) : "") || livro.id || livro.titulo || "";
    const id = idParaCatalogo(idBruto);
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
  function itensDeLinhas(linhas) {
    return (linhas || []).map(function (l, i) {
      const it = itemDeLivro(l.livro || l, l.qty, l.precoUnit);
      it.index = i;
      return it;
    });
  }

  // Telefone brasileiro no formato internacional E.164 exigido pelas
  // conversões otimizadas do Google (ex.: "+5583999998888").
  function telefoneE164(tel) {
    let d = String(tel || "").replace(/\D/g, "");
    if (!d) return "";
    if ((d.length === 12 || d.length === 13) && d.indexOf("55") === 0) d = d.slice(2);
    return "+55" + d;
  }

  // Monta os dados do cliente para as CONVERSÕES OTIMIZADAS (enhanced
  // conversions). O próprio gtag criptografa (hash SHA-256) esses dados
  // no navegador antes de enviar — o Google recebe só o hash, nunca o
  // e-mail/telefone em texto puro. Isso faz o Google casar mais vendas
  // com os cliques nos anúncios.
  function dadosDoCliente(cliente) {
    if (!cliente) return null;
    const ud = {};
    const email = String(cliente.email || "").trim().toLowerCase();
    const fone = telefoneE164(cliente.telefone);
    if (email) ud.email = email;
    if (fone) ud.phone_number = fone;

    const nome = String(cliente.nome || "").trim();
    if (nome) {
      const partes = nome.split(/\s+/);
      ud.address = {
        first_name: partes[0] || "",
        last_name: partes.length > 1 ? partes.slice(1).join(" ") : ""
      };
    }
    return (email || fone) ? ud : null;
  }

  function evento(nome, params) {
    if (!gtagOn) return;
    try { window.gtag("event", nome, params || {}); } catch (e) {}
  }

  /* ---------- API pública ---------- */
  const API = {
    ligado: ligado,

    // Evento genérico (use se quiser medir algo específico).
    evento: evento,

    // Cliente abriu a página de um livro.
    verItem: function (livro) {
      if (!livro) return;
      const it = itemDeLivro(livro, 1);
      evento("view_item", { currency: moeda, value: it.price, items: [it] });
      metaEvento("ViewContent", Object.assign(metaConteudo([it], it.price), { content_name: it.item_name }));
    },

    // Cliente adicionou um livro ao carrinho.
    adicionarCarrinho: function (livro, qty) {
      if (!livro) return;
      const it = itemDeLivro(livro, qty || 1);
      const valor = it.price * it.quantity;
      evento("add_to_cart", { currency: moeda, value: valor, items: [it] });
      if (ADS_CARRINHO) evento("conversion", { send_to: ADS_CARRINHO, value: valor, currency: moeda });
      metaEvento("AddToCart", metaConteudo([it], valor));
    },

    // Cliente pesquisou algo.
    busca: function (termo) {
      termo = String(termo || "").trim();
      if (termo) { evento("search", { search_term: termo }); metaEvento("Search", { search_string: termo }); }
    },

    // Cliente começou o checkout (abriu a página com itens).
    iniciarCheckout: function (resumo) {
      if (!resumo || resumo.vazio) return;
      const valor = Number(resumo.subtotal || 0) || 0;
      const itens = itensDeLinhas(resumo.itens);
      evento("begin_checkout", { currency: moeda, value: valor, items: itens });
      if (ADS_CHECKOUT) evento("conversion", { send_to: ADS_CHECKOUT, value: valor, currency: moeda });
      metaEvento("InitiateCheckout", Object.assign(metaConteudo(itens, valor), {
        num_items: itens.reduce(function (s, i) { return s + (i.quantity || 1); }, 0)
      }));
    },

    // Cliente clicou para falar pelo WhatsApp / Instagram Direct (lead).
    contato: function (canal) {
      evento("generate_lead", { method: canal || "whatsapp" });
      if (ADS_CONTATO) evento("conversion", { send_to: ADS_CONTATO });
      metaEvento("Lead", { content_name: canal || "whatsapp" });
    },

    // Compra concluída. Dispara o "purchase" do GA4 E a conversão do
    // Google Ads (com conversões otimizadas, se vier o cliente).
    // pedido  = { codigo, total, subtotal, frete, itens: [linhas resolvidas] }.
    // cliente = { nome, email, telefone } (opcional; ativa as conversões otimizadas).
    compra: function (pedido, cliente) {
      if (!pedido) return;
      const valor = Number(pedido.total != null ? pedido.total : pedido.subtotal) || 0;
      const itens = itensDeLinhas(pedido.itens);

      // Conversões otimizadas: informa os dados do cliente ANTES da conversão.
      if (ligado) {
        const ud = dadosDoCliente(cliente);
        if (ud) { try { window.gtag("set", "user_data", ud); } catch (e) {} }
      }

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

      metaEvento("Purchase", metaConteudo(itens, valor));
    }
  };

  // Detecta automaticamente cliques em links de contato (WhatsApp ou
  // Instagram Direct) em qualquer página e conta como "lead". Assim não
  // é preciso instrumentar cada botão individualmente.
  if (ligado && document.addEventListener) {
    document.addEventListener("click", function (e) {
      const alvo = e.target;
      const a = (alvo && alvo.closest) ? alvo.closest("a[href]") : null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (/wa\.me|api\.whatsapp\.com|whatsapp:/i.test(href)) API.contato("whatsapp");
      else if (/ig\.me/i.test(href)) API.contato("instagram");
    }, true);
  }

  return API;
})();
