/* ============================================================
   BOOKVERSE — CHECKOUT
   ------------------------------------------------------------
   Monta o resumo do pedido, valida os dados do cliente, calcula
   o frete e processa o pagamento pelo PayPal.

   - Se houver um Client ID do PayPal em js/config.js, o pagamento
     é REAL e cai na sua conta PayPal.
   - Se o Client ID estiver vazio, entra em MODO DEMONSTRAÇÃO:
     o pedido é "finalizado" para você testar, mas nada é cobrado.

   Não precisa mexer aqui.
   ============================================================ */

(function () {
  const Precos   = window.Precos;
  const Carrinho = window.Carrinho;
  const CFG      = window.LOJA_CONFIG || {};
  const MOEDA    = (CFG.moeda && CFG.moeda.codigo) || "BRL";

  /* ---------- Referências ---------- */
  const elGrid       = document.getElementById("checkout-grid");
  const elVazio      = document.getElementById("checkout-vazio");
  const elResumoItens= document.getElementById("resumo-itens");
  const elSubtotal   = document.getElementById("resumo-subtotal");
  const elFrete      = document.getElementById("resumo-frete");
  const elTotal      = document.getElementById("resumo-total");
  const elPromo      = document.getElementById("resumo-promo");
  const elEntrega    = document.getElementById("entrega-opcoes");
  const elEndereco   = document.getElementById("endereco-campos");
  const form         = document.getElementById("form-entrega");
  const avisoForm    = document.getElementById("aviso-form");
  const avisoDemo    = document.getElementById("aviso-demo");
  const erroPag      = document.getElementById("pagamento-erro");
  const contPaypal   = document.getElementById("paypal-buttons");
  const contDemo     = document.getElementById("paypal-demo");

  document.getElementById("ano-atual").textContent = new Date().getFullYear();

  /* ---------- Estado ---------- */
  const opcoesFrete = (CFG.frete && CFG.frete.opcoes) || [];
  let freteId = opcoesFrete.length ? opcoesFrete[0].id : null;
  let paypalActions = null;

  function opcaoSelecionada() {
    return opcoesFrete.find(o => o.id === freteId) || opcoesFrete[0] || { valor: 0, pedeEndereco: false };
  }

  /* Frete considerando "frete grátis acima de X". */
  function valorFrete(subtotal) {
    const op = opcaoSelecionada();
    const limite = CFG.frete && CFG.frete.freteGratisAcima;
    if (op.valor > 0 && limite && subtotal >= limite) return 0;
    return op.valor || 0;
  }

  /* ---------- Render do resumo ---------- */
  function render() {
    const dados = Carrinho.resolver();

    if (dados.vazio) {
      elGrid.hidden = true;
      elVazio.hidden = false;
      return;
    }
    elGrid.hidden = false;
    elVazio.hidden = true;

    // Itens
    elResumoItens.innerHTML = dados.itens.map(item => {
      const base = Precos.precoNumerico(item.livro.preco);
      const emPromo = Precos.promoAtiva() && item.precoUnit < base;
      const capa = item.livro.imagem
        ? `<img src="${item.livro.imagem}" alt="" loading="lazy">`
        : `<span class="resumo-capa-fallback">${(item.livro.titulo || "?").charAt(0)}</span>`;
      return `
        <div class="resumo-item">
          <div class="resumo-capa">${capa}<span class="resumo-qtd">${item.qty}</span></div>
          <div class="resumo-item-info">
            <p class="resumo-item-titulo">${item.livro.titulo}</p>
            <p class="resumo-item-autor">${item.livro.autor}</p>
          </div>
          <div class="resumo-item-preco">
            ${emPromo ? `<s>${Precos.formatarBRL(base * item.qty)}</s>` : ""}
            <strong>${Precos.formatarBRL(item.precoLinha)}</strong>
          </div>
        </div>`;
    }).join("");

    // Promoção
    if (Precos.promoAtiva()) {
      elPromo.hidden = false;
      elPromo.innerHTML = `🎉 <strong>${Precos.nomePromo()}:</strong> descontos já aplicados${
        Precos.dataFimPromo() ? " · válido até " + Precos.dataFimPromo() : ""}.`;
    } else {
      elPromo.hidden = true;
    }

    // Totais
    const frete = valorFrete(dados.subtotal);
    const op = opcaoSelecionada();
    elSubtotal.textContent = Precos.formatarBRL(dados.subtotal);
    if (op.valor > 0 && frete === 0) {
      elFrete.innerHTML = `<s class="frete-riscado">${Precos.formatarBRL(op.valor)}</s> <span class="frete-gratis">Grátis</span>`;
    } else if (frete === 0) {
      elFrete.innerHTML = `<span class="frete-gratis">Grátis</span>`;
    } else {
      elFrete.textContent = Precos.formatarBRL(frete);
    }
    elTotal.textContent = Precos.formatarBRL(dados.subtotal + frete);
  }

  /* ---------- Opções de entrega ---------- */
  function montarEntrega() {
    const limite = CFG.frete && CFG.frete.freteGratisAcima;
    elEntrega.innerHTML = opcoesFrete.map(op => {
      const precoTxt = op.valor > 0 ? Precos.formatarBRL(op.valor) : "Grátis";
      return `
        <label class="entrega-opcao ${op.id === freteId ? "selecionada" : ""}" data-id="${op.id}">
          <input type="radio" name="frete" value="${op.id}" ${op.id === freteId ? "checked" : ""}>
          <span class="entrega-radio" aria-hidden="true"></span>
          <span class="entrega-texto">
            <span class="entrega-titulo">${op.titulo}<span class="entrega-preco">${precoTxt}</span></span>
            <span class="entrega-desc">${op.descricao || ""}</span>
          </span>
        </label>`;
    }).join("");

    if (limite) {
      const nota = document.createElement("p");
      nota.className = "entrega-nota";
      nota.innerHTML = `🚚 Frete grátis em compras a partir de ${Precos.formatarBRL(limite)}.`;
      elEntrega.appendChild(nota);
    }

    elEntrega.querySelectorAll('input[name="frete"]').forEach(r => {
      r.addEventListener("change", () => {
        freteId = r.value;
        elEntrega.querySelectorAll(".entrega-opcao").forEach(l =>
          l.classList.toggle("selecionada", l.dataset.id === freteId));
        elEndereco.hidden = !opcaoSelecionada().pedeEndereco;
        render();
        atualizarEstadoPagamento();
      });
    });

    elEndereco.hidden = !opcaoSelecionada().pedeEndereco;
  }

  /* ---------- Validação ---------- */
  function val(id) { const e = document.getElementById(id); return e ? e.value.trim() : ""; }

  function camposObrigatorios() {
    const obrig = ["cli-nome", "cli-email"];
    if (opcaoSelecionada().pedeEndereco) {
      obrig.push("end-cep", "end-rua", "end-numero", "end-bairro", "end-cidade", "end-uf");
    }
    return obrig;
  }
  function emailValido(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function validar(marcar) {
    let ok = true;
    camposObrigatorios().forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const vazio = !el.value.trim();
      const emailRuim = id === "cli-email" && el.value.trim() && !emailValido(el.value.trim());
      const ruim = vazio || emailRuim;
      if (ruim) ok = false;
      if (marcar) el.classList.toggle("invalido", ruim);
    });
    return ok;
  }

  function atualizarEstadoPagamento() {
    const ok = validar(false) && !Carrinho.resolver().vazio;
    if (avisoForm) avisoForm.hidden = ok;
    if (paypalActions) { ok ? paypalActions.enable() : paypalActions.disable(); }
    const btnDemo = document.getElementById("btn-demo");
    if (btnDemo) btnDemo.disabled = !ok;
  }

  form.addEventListener("input", (e) => {
    if (e.target.classList.contains("invalido") && e.target.value.trim()) {
      e.target.classList.remove("invalido");
    }
    atualizarEstadoPagamento();
  });

  /* ---------- Dados do pedido (para o PayPal e o resumo) ---------- */
  function montarPedido() {
    const dados = Carrinho.resolver();
    const frete = valorFrete(dados.subtotal);
    const total = dados.subtotal + frete;
    return { dados, frete, total };
  }

  function dadosCliente() {
    const op = opcaoSelecionada();
    const c = {
      nome: val("cli-nome"), email: val("cli-email"), telefone: val("cli-tel"),
      entrega: op.titulo, observacoes: val("cli-obs")
    };
    if (op.pedeEndereco) {
      c.endereco = [val("end-rua"), val("end-numero"), val("end-compl"), val("end-bairro"),
                    val("end-cidade") + "/" + val("end-uf").toUpperCase(), "CEP " + val("end-cep")]
                    .filter(Boolean).join(", ");
    }
    return c;
  }

  /* ---------- PayPal: criação do pedido ---------- */
  function criarOrderPayload() {
    const { dados, frete, total } = montarPedido();
    return {
      purchase_units: [{
        description: "Pedido " + (CFG.nomeLoja || "BookVerse"),
        amount: {
          currency_code: MOEDA,
          value: total.toFixed(2),
          breakdown: {
            item_total: { currency_code: MOEDA, value: dados.subtotal.toFixed(2) },
            shipping:   { currency_code: MOEDA, value: frete.toFixed(2) }
          }
        },
        items: dados.itens.map(i => ({
          name: String(i.livro.titulo).slice(0, 127),
          description: String(i.livro.autor || "").slice(0, 127),
          quantity: String(i.qty),
          unit_amount: { currency_code: MOEDA, value: i.precoUnit.toFixed(2) },
          category: "PHYSICAL_GOODS"
        }))
      }],
      application_context: {
        brand_name: CFG.nomeLoja || "BookVerse",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW"
      }
    };
  }

  /* ---------- Sucesso ---------- */
  function sucesso(info) {
    const { dados, frete, total } = montarPedido();
    const cliente = dadosCliente();

    // Monta o painel de confirmação ANTES de limpar o carrinho.
    const linhas = dados.itens.map(i =>
      `<li><span>${i.qty}× ${i.livro.titulo}</span><span>${Precos.formatarBRL(i.precoLinha)}</span></li>`).join("");

    const det = document.getElementById("confirmacao-detalhes");
    det.innerHTML = `
      <div class="conf-pedido">
        <p class="conf-rotulo">Código do pedido</p>
        <p class="conf-codigo">${info.orderId || "—"}</p>
      </div>
      <ul class="conf-itens">${linhas}</ul>
      <dl class="conf-totais">
        <div><dt>Subtotal</dt><dd>${Precos.formatarBRL(dados.subtotal)}</dd></div>
        <div><dt>Frete</dt><dd>${frete === 0 ? "Grátis" : Precos.formatarBRL(frete)}</dd></div>
        <div class="conf-total"><dt>Total pago</dt><dd>${Precos.formatarBRL(total)}</dd></div>
      </dl>
      <p class="conf-entrega"><strong>Entrega:</strong> ${cliente.entrega}${cliente.endereco ? " — " + cliente.endereco : ""}</p>`;

    const sub = document.getElementById("confirmacao-sub");
    sub.textContent = `Obrigado, ${cliente.nome || "leitor(a)"}! Recebemos seu pedido e já vamos preparar tudo. 💜`;

    // Link opcional para enviar o comprovante no WhatsApp.
    const elWhats = document.getElementById("confirmacao-whats");
    if (CFG.whatsapp) {
      const msg = `Olá! Acabei de comprar na ${CFG.nomeLoja || "BookVerse"}.%0A%0A` +
        dados.itens.map(i => `• ${i.qty}× ${i.livro.titulo}`).join("%0A") +
        `%0A%0ATotal: ${Precos.formatarBRL(total)}` +
        `%0AEntrega: ${cliente.entrega}` +
        `%0APedido: ${info.orderId || ""}` +
        `%0ANome: ${cliente.nome}`;
      elWhats.href = `https://wa.me/${CFG.whatsapp}?text=${msg}`;
      elWhats.hidden = false;
    }

    Carrinho.limpar();

    document.getElementById("checkout-grid").hidden = true;
    document.getElementById("checkout-vazio").hidden = true;
    const conf = document.getElementById("confirmacao");
    conf.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function mostrarErro(msg) {
    erroPag.hidden = false;
    erroPag.textContent = msg;
  }

  /* ---------- Inicialização do pagamento ---------- */
  const clientId = (CFG.paypal && CFG.paypal.clientId || "").trim();

  function carregarSDK(id) {
    return new Promise((resolve, reject) => {
      if (window.paypal) return resolve(window.paypal);
      const s = document.createElement("script");
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(id)}` +
              `&currency=${MOEDA}&intent=capture&components=buttons&disable-funding=paylater`;
      s.onload = () => window.paypal ? resolve(window.paypal) : reject(new Error("SDK indisponível"));
      s.onerror = () => reject(new Error("Não foi possível carregar o PayPal"));
      document.head.appendChild(s);
    });
  }

  function iniciarPayPalReal() {
    avisoDemo.hidden = true;
    carregarSDK(clientId).then(paypal => {
      paypal.Buttons({
        style: { layout: "vertical", color: "gold", shape: "pill", label: "paypal", height: 48 },
        onInit: function (data, actions) {
          paypalActions = actions;
          atualizarEstadoPagamento();
        },
        onClick: function (data, actions) {
          if (!validar(true)) {
            avisoForm.hidden = false;
            form.scrollIntoView({ behavior: "smooth", block: "center" });
            return actions.reject ? actions.reject() : undefined;
          }
          return actions.resolve ? actions.resolve() : undefined;
        },
        createOrder: function (data, actions) {
          erroPag.hidden = true;
          return actions.order.create(criarOrderPayload());
        },
        onApprove: function (data, actions) {
          return actions.order.capture().then(details => {
            const cap = details && details.purchase_units &&
              details.purchase_units[0].payments &&
              details.purchase_units[0].payments.captures &&
              details.purchase_units[0].payments.captures[0];
            sucesso({ orderId: (cap && cap.id) || details.id });
          });
        },
        onError: function (err) {
          mostrarErro("Houve um problema ao processar o pagamento. Tente novamente ou fale com a gente pelo Instagram.");
          console.error("PayPal:", err);
        }
      }).render("#paypal-buttons").catch(() => {
        mostrarErro("Não foi possível iniciar o pagamento do PayPal. Confira sua conexão e o Client ID em js/config.js.");
      });
    }).catch(() => {
      mostrarErro("Não foi possível carregar o PayPal. Verifique sua conexão com a internet.");
    });
  }

  function iniciarDemo() {
    avisoDemo.hidden = false;
    contPaypal.hidden = true;
    contDemo.hidden = false;
    contDemo.innerHTML = `
      <button type="button" id="btn-demo" class="botao-loja botao-loja-primario botao-loja-bloco" disabled>
        Finalizar pedido (demonstração)
      </button>`;
    const btn = document.getElementById("btn-demo");
    btn.addEventListener("click", () => {
      if (!validar(true)) {
        avisoForm.hidden = false;
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      const id = "DEMO-" + Date.now().toString(36).toUpperCase();
      sucesso({ orderId: id });
    });
    atualizarEstadoPagamento();
  }

  /* ---------- Liga tudo ---------- */
  function init() {
    if (Carrinho.resolver().vazio) { render(); return; }
    montarEntrega();
    render();
    if (clientId) iniciarPayPalReal();
    else iniciarDemo();
    atualizarEstadoPagamento();
  }

  init();
})();
