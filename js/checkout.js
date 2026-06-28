/* ============================================================
   BOOKVERSE — CHECKOUT (pagamento via Pix)
   ------------------------------------------------------------
   Monta o resumo do pedido, valida os dados do cliente, calcula
   o frete e gera o pagamento por Pix (QR Code + "Pix Copia e
   Cola") com o valor exato do pedido.

   A confirmação do Pix é manual: o cliente paga pelo app do
   banco e o lojista confere o recebimento. Os dados da conta que
   recebe ficam em js/config.js (chave Pix, nome e cidade).

   Não precisa mexer aqui.
   ============================================================ */

(function () {
  const Precos   = window.Precos;
  const Carrinho = window.Carrinho;
  const CFG      = window.LOJA_CONFIG || {};

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
  const avisoConfig  = document.getElementById("aviso-config");
  const erroPag      = document.getElementById("pagamento-erro");
  const btnGerar     = document.getElementById("btn-gerar-pix");
  const pixArea      = document.getElementById("pix-area");

  document.getElementById("ano-atual").textContent = new Date().getFullYear();

  /* ---------- Estado ---------- */
  const opcoesFrete = (CFG.frete && CFG.frete.opcoes) || [];
  let freteId = opcoesFrete.length ? opcoesFrete[0].id : null;
  let codigoPedido = null;

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

  function pixConfigurado() {
    return !!(CFG.pix && String(CFG.pix.chave || "").trim());
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
        resetPix();        // o valor mudou: refazer o Pix
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
    const configurado = pixConfigurado();
    if (avisoConfig) avisoConfig.hidden = configurado;
    if (avisoForm)   avisoForm.hidden = ok || !configurado;
    if (btnGerar)    btnGerar.disabled = !(ok && configurado);

    const { total } = montarPedido();
    const bv = document.getElementById("btn-pix-valor");
    if (bv) bv.textContent = Precos.formatarBRL(total);
  }

  form.addEventListener("input", (e) => {
    if (e.target.classList.contains("invalido") && e.target.value.trim()) {
      e.target.classList.remove("invalido");
    }
    atualizarEstadoPagamento();
  });

  /* ---------- Dados do pedido ---------- */
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

  /* ---------- Pix: gerar / QR / copiar ---------- */
  function resetPix() {
    if (pixArea) pixArea.hidden = true;
    codigoPedido = null;
    if (erroPag) erroPag.hidden = true;
  }

  function renderQR(payload) {
    const el = document.getElementById("pix-qr");
    el.innerHTML = "";
    if (typeof qrcode === "undefined") return;
    const qr = qrcode(0, "M");
    qr.addData(payload, "Byte");
    qr.make();
    const img = document.createElement("img");
    img.src = qr.createDataURL(6, 16);
    img.alt = "QR Code para pagamento via Pix";
    img.className = "pix-qr-img";
    el.appendChild(img);
  }

  function gerarPix() {
    if (!validar(true)) {
      if (avisoForm) avisoForm.hidden = false;
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!pixConfigurado()) return;

    const { total } = montarPedido();
    codigoPedido = "BV" + Date.now().toString(36).toUpperCase();

    const payload = window.Pix.gerarPayload({
      chave: CFG.pix.chave,
      nome:  CFG.pix.nomeRecebedor,
      cidade: CFG.pix.cidade,
      valor: total,
      txid: codigoPedido
    });

    if (!window.Pix.validar(payload)) {
      erroPag.hidden = false;
      erroPag.textContent = "Não foi possível gerar o Pix. Confira a chave Pix em js/config.js.";
      return;
    }
    erroPag.hidden = true;

    document.getElementById("pix-codigo").value = payload;
    document.getElementById("pix-valor-total").textContent = Precos.formatarBRL(total);
    renderQR(payload);
    pixArea.hidden = false;
    pixArea.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function copiarPix() {
    const campo = document.getElementById("pix-codigo");
    const btn = document.getElementById("btn-copiar-pix");
    const texto = campo.value;
    const feedback = () => {
      if (!btn) return;
      const original = btn.textContent;
      btn.textContent = "Copiado!";
      btn.classList.add("copiado");
      setTimeout(() => { btn.textContent = original; btn.classList.remove("copiado"); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(feedback).catch(() => { campo.select(); document.execCommand("copy"); feedback(); });
    } else {
      campo.select(); document.execCommand("copy"); feedback();
    }
  }

  /* ---------- Envio do pedido por e-mail (Web3Forms) ---------- */
  function enviarPedidoEmail() {
    const key = String((CFG.pedidos && CFG.pedidos.web3formsKey) || "").trim();
    if (!key) return Promise.resolve();          // e-mail desligado

    const { dados, frete, total } = montarPedido();
    const cliente = dadosCliente();
    const loja = CFG.nomeLoja || "BookVerse";

    const itensTxt = dados.itens
      .map(i => `${i.qty}x ${i.livro.titulo} (${i.livro.autor}) — ${Precos.formatarBRL(i.precoLinha)}`)
      .join("\n");

    const mensagem = [
      `NOVO PEDIDO — ${loja}`,
      `Código: ${codigoPedido}`,
      ``,
      `Cliente: ${cliente.nome}`,
      `E-mail: ${cliente.email}`,
      `WhatsApp/Telefone: ${cliente.telefone || "(não informado)"}`,
      ``,
      `Entrega: ${cliente.entrega}`,
      `Endereço: ${cliente.endereco || "Entrega a combinar (retirada local)"}`,
      ``,
      `Itens:`,
      itensTxt,
      ``,
      `Subtotal: ${Precos.formatarBRL(dados.subtotal)}`,
      `Frete: ${frete === 0 ? "Grátis" : Precos.formatarBRL(frete)}`,
      `Total: ${Precos.formatarBRL(total)}`,
      cliente.observacoes ? `\nObservações: ${cliente.observacoes}` : "",
      ``,
      `Pagamento: Pix — confira o recebimento no seu banco (código ${codigoPedido}).`
    ].join("\n");

    const body = {
      access_key: key,
      subject: `Novo pedido ${codigoPedido} — ${loja}`,
      from_name: `${loja} — Loja`,
      replyto: cliente.email || "",
      "Código do pedido": codigoPedido,
      "Cliente": cliente.nome,
      "E-mail do cliente": cliente.email,
      "WhatsApp/Telefone": cliente.telefone || "(não informado)",
      "Entrega": cliente.entrega,
      "Endereço": cliente.endereco || "Entrega a combinar (retirada local)",
      "Total": Precos.formatarBRL(total),
      "message": mensagem
    };

    return fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body)
    });
  }

  /* ---------- Confirmação ---------- */
  async function finalizar() {
    const btn = document.getElementById("btn-ja-paguei");
    let original;
    if (btn) { original = btn.textContent; btn.disabled = true; btn.textContent = "Enviando pedido…"; }
    try { await enviarPedidoEmail(); } catch (e) { /* não bloqueia a conclusão do pedido */ }
    if (btn) { btn.disabled = false; btn.textContent = original; }
    sucesso();
  }

  function sucesso() {
    const { dados, frete, total } = montarPedido();
    const cliente = dadosCliente();

    const linhas = dados.itens.map(i =>
      `<li><span>${i.qty}× ${i.livro.titulo}</span><span>${Precos.formatarBRL(i.precoLinha)}</span></li>`).join("");

    const det = document.getElementById("confirmacao-detalhes");
    det.innerHTML = `
      <div class="conf-pedido">
        <p class="conf-rotulo">Código do pedido</p>
        <p class="conf-codigo">${codigoPedido || "—"}</p>
      </div>
      <ul class="conf-itens">${linhas}</ul>
      <dl class="conf-totais">
        <div><dt>Subtotal</dt><dd>${Precos.formatarBRL(dados.subtotal)}</dd></div>
        <div><dt>Frete</dt><dd>${frete === 0 ? "Grátis" : Precos.formatarBRL(frete)}</dd></div>
        <div class="conf-total"><dt>Total do Pix</dt><dd>${Precos.formatarBRL(total)}</dd></div>
      </dl>
      <p class="conf-entrega"><strong>Entrega:</strong> ${cliente.entrega}${cliente.endereco ? " — " + cliente.endereco : ""}</p>
      <p class="conf-aviso">Assim que confirmarmos o seu Pix, preparamos o pedido. Se puder, envie o comprovante pra agilizar 💜</p>`;

    const sub = document.getElementById("confirmacao-sub");
    sub.textContent = `Obrigado, ${cliente.nome || "leitor(a)"}! Recebemos seu pedido.`;

    // Botão para enviar o comprovante (WhatsApp, ou Instagram como alternativa).
    const elWhats = document.getElementById("confirmacao-whats");
    if (elWhats) {
      const resumoMsg = dados.itens.map(i => `• ${i.qty}× ${i.livro.titulo}`).join("%0A");
      const corpo = `Olá! Acabei de pagar via Pix na ${CFG.nomeLoja || "BookVerse"}.%0A%0A` +
        resumoMsg +
        `%0A%0ATotal: ${Precos.formatarBRL(total)}` +
        `%0AEntrega: ${cliente.entrega}` +
        `%0APedido: ${codigoPedido || ""}` +
        `%0ANome: ${cliente.nome}` +
        `%0A%0A(vou anexar o comprovante)`;
      if (CFG.whatsapp) {
        elWhats.href = `https://wa.me/${CFG.whatsapp}?text=${corpo}`;
        elWhats.hidden = false;
      } else if (CFG.instagram) {
        elWhats.href = `https://ig.me/m/${CFG.instagram}`;
        elWhats.hidden = false;
      }
    }

    Carrinho.limpar();

    document.getElementById("checkout-grid").hidden = true;
    document.getElementById("checkout-vazio").hidden = true;
    document.getElementById("confirmacao").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- Liga tudo ---------- */
  if (btnGerar) btnGerar.addEventListener("click", gerarPix);
  const btnCopiar = document.getElementById("btn-copiar-pix");
  if (btnCopiar) btnCopiar.addEventListener("click", copiarPix);
  const btnPaguei = document.getElementById("btn-ja-paguei");
  if (btnPaguei) btnPaguei.addEventListener("click", finalizar);

  function init() {
    if (Carrinho.resolver().vazio) { render(); return; }
    montarEntrega();
    render();
    atualizarEstadoPagamento();
  }

  init();
})();
