/* ============================================================
   BOOKVERSE — CHECKOUT (Pix ou dinheiro na entrega)
   ------------------------------------------------------------
   Monta o resumo do pedido, valida os dados do cliente, calcula
   o frete e finaliza o pagamento de duas formas:

   - Pix: gera QR Code + "Pix Copia e Cola" com o valor exato do
     pedido (manual ou via Mercado Pago, conforme js/config.js).
   - Dinheiro em espécie: o cliente paga na hora da entrega e o
     pedido é APROVADO imediatamente (status "aprovado").

   Não precisa mexer aqui.
   ============================================================ */

(function () {
  const Precos   = window.Precos;
  const Carrinho = window.Carrinho;
  const CFG      = window.LOJA_CONFIG || {};
  const esc      = window.esc || (t => String(t == null ? "" : t));

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
  const elMetodos    = document.getElementById("pagamento-metodos");
  const blocoPix     = document.getElementById("pagamento-pix");
  const blocoDinheiro= document.getElementById("pagamento-dinheiro");
  const btnDinheiro  = document.getElementById("btn-confirmar-dinheiro");

  /* ---------- Estado ---------- */
  const opcoesFrete = (CFG.frete && CFG.frete.opcoes) || [];
  let freteId = opcoesFrete.length ? opcoesFrete[0].id : null;
  let codigoPedido = null;

  // Modo de pagamento: "manual" (Pix gerado no navegador) ou
  // "mercadopago" (cobrança + confirmação automática via backend).
  const modoPix = String((CFG.pix && CFG.pix.modo) || "manual").toLowerCase();
  const usaMercadoPago = modoPix === "mercadopago" || modoPix === "mp";
  let pagamentoId = null;   // id do pagamento no Mercado Pago
  let pollTimer = null;     // checagem automática "já caiu?"
  let contaCarregada = false; // true quando os dados da conta já chegaram
  let pixCopiaCola = "";    // código Pix gerado (guardado no pedido)
  let pixTicketUrl = "";    // link de pagamento do Mercado Pago

  // Forma de pagamento escolhida: "pix" ou "dinheiro" (na entrega).
  let metodoPagamento = "pix";

  // "Comprar agora" = compra direta de UM livro, sem usar o carrinho.
  let compraDireta = null;
  try { compraDireta = JSON.parse(sessionStorage.getItem("bookverse_compra_direta") || "null"); } catch (e) {}

  /* Marca deixada pela página /finalizar: a origem do pedido (carrinho vindo
     da Loja do Instagram/Facebook). Não muda o preço — vai no e-mail e no
     histórico, para a loja saber de onde veio a venda. */
  let origemPedido = "";
  try { origemPedido = String(sessionStorage.getItem("bookverse_origem") || "").trim(); } catch (e) {}

  const ORIGENS = { meta: "Instagram / Facebook (catálogo do Meta)" };
  function origemTexto() { return ORIGENS[origemPedido] || ""; }

  // Fonte dos itens do pedido: a compra direta (1 livro) ou o carrinho.
  function dadosPedido() {
    return compraDireta ? Carrinho.resolverLista([compraDireta], false) : Carrinho.resolver();
  }

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

  /* Taxa de "Embalar para presente" (js/config.js → presente.valor). */
  function valorPresente() {
    return (CFG.presente && CFG.presente.valor) || 0;
  }

  function pixConfigurado() {
    return !!(CFG.pix && String(CFG.pix.chave || "").trim());
  }

  // Só exige conta quando o login está configurado e a opção está ligada.
  function exigeConta() {
    return !!(CFG.pedidos && CFG.pedidos.exigirConta) &&
           !!(window.Auth && window.Auth.configurado);
  }

  /* ---------- Render do resumo ---------- */
  function render() {
    const dados = dadosPedido();

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
      const src = window.Util ? window.Util.imagemSrcSegura(item.livro.imagem) : item.livro.imagem;
      const webp = window.Util ? window.Util.imagemWebp(src) : src;
      const capa = src
        ? `<img src="${esc(webp)}"${webp !== src ? ` data-orig="${esc(src)}"` : ""} alt="" loading="lazy">`
        : `<span class="resumo-capa-fallback">${esc((item.livro.titulo || "?").charAt(0))}</span>`;
      const condicao = item.livro.condicao
        ? ` <span class="ci-condicao">${item.livro.condicao === "novo" ? "Novo" : "Usado"}</span>` : "";
      return `
        <div class="resumo-item">
          <div class="resumo-capa">${capa}<span class="resumo-qtd">${item.qty}</span></div>
          <div class="resumo-item-info">
            <p class="resumo-item-titulo">${esc(item.livro.titulo)}${condicao}</p>
            <p class="resumo-item-autor">${esc(item.livro.autor)}</p>
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
      elPromo.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><path d="M2 12V2h10l10 10-10 10L2 12z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg> <strong>${Precos.nomePromo()}:</strong> descontos já aplicados${
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
    // Sem nenhuma opção paga: escondemos a linha "Frete" (não cobramos frete).
    const elLinhaFrete = document.getElementById("resumo-linha-frete");
    if (elLinhaFrete) elLinhaFrete.hidden = !opcoesFrete.some(o => o.valor > 0);

    // Taxa de embalagem para presente.
    const presente = presenteMarcado() ? valorPresente() : 0;
    const elLinhaPresente = document.getElementById("resumo-linha-presente");
    const elPresente = document.getElementById("resumo-presente");
    if (elLinhaPresente) elLinhaPresente.hidden = !presente;
    if (elPresente) elPresente.textContent = Precos.formatarBRL(presente);

    elTotal.textContent = Precos.formatarBRL(dados.subtotal + frete + presente);
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
      nota.innerHTML = `Frete grátis em compras a partir de ${Precos.formatarBRL(limite)}.`;
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

  /* ---------- Forma de pagamento (Pix ou dinheiro) ---------- */
  function montarMetodosPagamento() {
    if (!elMetodos) return;
    elMetodos.querySelectorAll('input[name="pagamento"]').forEach(r => {
      r.addEventListener("change", () => {
        metodoPagamento = r.value;
        elMetodos.querySelectorAll(".entrega-opcao").forEach(l =>
          l.classList.toggle("selecionada", l.dataset.metodo === metodoPagamento));
        if (blocoPix)      blocoPix.hidden = metodoPagamento !== "pix";
        if (blocoDinheiro) blocoDinheiro.hidden = metodoPagamento !== "dinheiro";
        resetPix();        // trocou de método: descarta o Pix em aberto
        atualizarEstadoPagamento();
      });
    });
  }

  /* ---------- Validação ---------- */
  function val(id) { const e = document.getElementById(id); return e ? e.value.trim() : ""; }

  const CAMPOS_ENDERECO = ["end-cep", "end-rua", "end-numero", "end-bairro", "end-cidade", "end-uf"];

  /* O cliente optou por descrever o endereço com as próprias palavras. */
  function enderecoDescrito() {
    return val("end-modo") === "descricao";
  }

  function camposObrigatorios() {
    const obrig = ["cli-nome", "cli-email", "cli-tel"];
    if (opcaoSelecionada().pedeEndereco) {
      if (enderecoDescrito()) obrig.push("end-descricao");
      else obrig.push.apply(obrig, CAMPOS_ENDERECO);
    }
    return obrig;
  }

  /* O cliente ainda não cadastrou o endereço completo na conta. */
  function enderecoIncompleto() {
    if (enderecoDescrito()) return !val("end-descricao");
    return CAMPOS_ENDERECO.some(id => !val(id));
  }

  /* Compara textos ignorando maiúsculas/acentos ("Juazeirinho" = "juazeirinho"). */
  function normalizarTexto(t) {
    return String(t || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  /* Cidades atendidas pela opção de entrega (config "somenteCidades"). */
  function cidadesDaOpcao() {
    const op = opcaoSelecionada();
    const lista = op.somenteCidades || op.somenteCidade || null;
    if (!lista) return [];
    return (Array.isArray(lista) ? lista : [lista]).filter(Boolean);
  }

  /* true quando a opção restringe a cidade e o endereço do cliente é de outra.
     Endereço descrito em texto livre não tem campo de cidade para conferir —
     nesse caso mostramos só um lembrete (não bloqueia). */
  function cidadeForaDaArea() {
    if (enderecoDescrito()) return false;
    const cidades = cidadesDaOpcao();
    const atual = normalizarTexto(val("end-cidade"));
    if (!cidades.length || !atual) return false;   // vazio = campo faltando, tratado à parte
    return !cidades.some(c => normalizarTexto(c) === atual);
  }
  function emailValido(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  /* WhatsApp brasileiro: aceita com/sem +55; exige celular com DDD (11 dígitos). */
  function soDigitos(v) { return String(v || "").replace(/\D/g, ""); }
  function whatsappNacional(v) {
    let d = soDigitos(v);
    if ((d.length === 12 || d.length === 13) && d.indexOf("55") === 0) d = d.slice(2);
    return d;
  }
  function whatsappValido(v) { return /^[1-9][0-9]9\d{8}$/.test(whatsappNacional(v)); }

  function campoRuim(id) {
    const el = document.getElementById(id);
    if (!el) return false;
    if (id === "cli-email") return !el.value.trim() || !emailValido(el.value.trim());
    if (id === "cli-tel")   return !whatsappValido(el.value);
    if (id === "end-cidade") return !el.value.trim() || cidadeForaDaArea();
    return !el.value.trim();
  }

  function atualizarDicaWhats() {
    const tel = document.getElementById("cli-tel");
    const dica = document.getElementById("dica-whats");
    if (!tel || !dica) return;
    const erro = tel.value.trim().length > 0 && !whatsappValido(tel.value);
    dica.classList.toggle("erro", erro);
    dica.textContent = erro
      ? "Número de WhatsApp inválido. Use DDD + número, ex.: (83) 9 9999-8888."
      : "Com DDD. É o nosso principal contato com você.";
  }

  function validar(marcar) {
    let ok = true;
    camposObrigatorios().forEach(id => {
      const ruim = campoRuim(id);
      if (ruim) ok = false;
      if (marcar) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("invalido", ruim);
      }
    });
    if (marcar) atualizarDicaWhats();
    return ok;
  }

  /* Aviso no bloco de endereço: pede para concluir o cadastro (ou avisa
     que o endereço está fora da área de entrega da opção escolhida). */
  function atualizarAvisoEndereco(carregado) {
    const el = document.getElementById("aviso-endereco");
    if (!el) return;
    let msg = "";
    if (opcaoSelecionada().pedeEndereco && carregado) {
      if (enderecoIncompleto()) {
        msg = `Você ainda não cadastrou seu endereço de entrega. ` +
              `<a href="conta.html#dados">Conclua seu cadastro</a> para usar esta opção, ` +
              `ou escolha outra forma de entrega.`;
      } else if (cidadeForaDaArea()) {
        msg = `Esta opção de entrega está disponível apenas em <strong>${esc(cidadesDaOpcao().join(", "))}</strong>, ` +
              `e seu endereço cadastrado fica em <strong>${esc(val("end-cidade"))}</strong>. ` +
              `<a href="conta.html#dados">Atualize seu endereço</a> ou escolha outra forma de entrega.`;
      } else if (enderecoDescrito() && cidadesDaOpcao().length) {
        // Endereço em texto livre: não dá para conferir a cidade sozinho.
        msg = `Lembrete: esta opção entrega apenas em <strong>${esc(cidadesDaOpcao().join(", "))}</strong>. ` +
              `Confira se o endereço que você descreveu está na área.`;
      }
    }
    el.hidden = !msg;
    if (msg) el.innerHTML = msg;
  }

  /* Texto do aviso geral: diz exatamente o que falta no cadastro. */
  function mensagemAvisoForm() {
    const faltas = [];
    if (campoRuim("cli-nome"))  faltas.push("seu nome");
    if (campoRuim("cli-email")) faltas.push("um e-mail válido");
    if (campoRuim("cli-tel"))   faltas.push("um WhatsApp válido (com DDD)");
    if (opcaoSelecionada().pedeEndereco && enderecoIncompleto()) faltas.push("o endereço de entrega");
    if (faltas.length) {
      return `Para finalizar, conclua seu cadastro na sua <a href="conta.html#dados">conta</a>. Falta: ${faltas.join(", ")}.`;
    }
    if (opcaoSelecionada().pedeEndereco && cidadeForaDaArea()) {
      return `Seu endereço está fora da área desta forma de entrega. Escolha outra opção ou <a href="conta.html#dados">atualize seu endereço</a>.`;
    }
    return `Complete seus dados na sua <a href="conta.html#dados">conta</a> para finalizar o pedido.`;
  }

  function atualizarEstadoPagamento() {
    const ok = validar(false) && !dadosPedido().vazio;
    const configurado = usaMercadoPago || pixConfigurado();
    const carregado = !exigeConta() || contaCarregada;  // espera os dados da conta
    const pagaNaEntrega = metodoPagamento === "dinheiro";
    // Dinheiro na entrega funciona mesmo sem Pix configurado.
    if (avisoConfig) avisoConfig.hidden = configurado || pagaNaEntrega;
    if (avisoForm) {
      avisoForm.hidden = ok || (!configurado && !pagaNaEntrega) || !carregado;
      if (!avisoForm.hidden) avisoForm.innerHTML = mensagemAvisoForm();
    }
    atualizarAvisoEndereco(carregado);
    if (btnGerar)    btnGerar.disabled = !(ok && configurado && carregado);
    if (btnDinheiro) btnDinheiro.disabled = !(ok && carregado);

    const total = totalParaEnviar(montarPedido().total);
    const bv = document.getElementById("btn-pix-valor");
    if (bv) bv.textContent = Precos.formatarBRL(total);
    const bd = document.getElementById("btn-dinheiro-valor");
    if (bd) bd.textContent = Precos.formatarBRL(total);

    if (typeof atualizarCartaoDados === "function") atualizarCartaoDados();
  }

  form.addEventListener("input", (e) => {
    const t = e.target;
    if (t.classList.contains("invalido") && !campoRuim(t.id)) t.classList.remove("invalido");
    if (t.id === "cli-tel") atualizarDicaWhats();
    atualizarEstadoPagamento();
  });

  /* ---------- Dados do pedido ---------- */
  function montarPedido() {
    const dados = dadosPedido();
    const frete = valorFrete(dados.subtotal);
    const presente = presenteMarcado() ? valorPresente() : 0;
    const total = dados.subtotal + frete + presente;
    return { dados, frete, presente, total };
  }

  function presenteMarcado() {
    const el = document.getElementById("cli-presente");
    return !!(el && el.checked);
  }

  function dadosCliente() {
    const op = opcaoSelecionada();
    let instagram = val("cli-instagram").replace(/^@+/, "").trim();
    if (instagram) instagram = "@" + instagram;
    const c = {
      nome: val("cli-nome"), email: val("cli-email"), telefone: val("cli-tel"),
      whatsappLink: "https://wa.me/55" + whatsappNacional(val("cli-tel")),
      instagram: instagram,
      entrega: op.titulo, observacoes: val("cli-obs"),
      presente: presenteMarcado(),
      presenteMsg: presenteMarcado() ? val("cli-presente-msg") : ""
    };
    if (op.pedeEndereco) {
      c.endereco = enderecoDescrito()
        ? val("end-descricao")
        : [val("end-rua"), val("end-numero"), val("end-compl"), val("end-bairro"),
           val("end-cidade") + "/" + val("end-uf").toUpperCase(), "CEP " + val("end-cep")]
           .filter(Boolean).join(", ");
    }
    return c;
  }

  /* ---------- Pix: gerar / QR / copiar ---------- */
  function resetPix() {
    pararPolling();
    if (pixArea) pixArea.hidden = true;
    codigoPedido = null;
    pagamentoId = null;
    pedidoServidor = null;
    const st = document.getElementById("pix-status");
    if (st) st.hidden = true;
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

  function mostrarPixArea() {
    pixArea.hidden = false;
    pixArea.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // QR Code já pronto (imagem PNG), usado no modo Mercado Pago.
  function renderQRImagem(base64) {
    const el = document.getElementById("pix-qr");
    el.innerHTML = "";
    if (!base64) return;
    const img = document.createElement("img");
    img.src = "data:image/png;base64," + base64;
    img.alt = "QR Code para pagamento via Pix";
    img.className = "pix-qr-img";
    el.appendChild(img);
  }

  let gerandoPix = false;   // trava contra clique duplo (evita cobranças duplicadas)
  async function gerarPix() {
    if (gerandoPix) return;
    if (!validar(true)) {
      if (avisoForm) { avisoForm.hidden = false; avisoForm.innerHTML = mensagemAvisoForm(); }
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    gerandoPix = true;
    try {
      return await (usaMercadoPago ? gerarPixMercadoPago() : gerarPixManual());
    } finally {
      gerandoPix = false;
    }
  }

  /* ---------- O pedido é fechado NO SERVIDOR ----------
     O navegador manda só O QUE o cliente quer (livros e quantidades,
     entrega, presente, contato). O preço, o total e o valor do Pix são
     calculados pelo servidor (api/pedido.js), que também separa os
     livros e grava o pedido. Antes era tudo feito aqui — e quem soubesse
     mexer no navegador conseguia mudar o valor do Pix. */
  let pedidoServidor = null;   // resposta do servidor: código e valores oficiais
  let ajusteTotal = null;      // { cliente, servidor }: o servidor corrigiu o total desta tela

  function totalParaEnviar(totalCliente) {
    return ajusteTotal && Math.abs(ajusteTotal.cliente - totalCliente) < 0.01 ? ajusteTotal.servidor : totalCliente;
  }

  async function chamarApiPedido(corpo) {
    const token = window.Auth && window.Auth.idToken ? await window.Auth.idToken() : null;
    if (!token) throw Object.assign(new Error("Entre na sua conta para finalizar o pedido."), { status: 401 });
    const resp = await fetch("/api/pedido", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(corpo)
    });
    let data = null;
    try { data = await resp.json(); } catch (e) { /* resposta sem JSON */ }
    if (!resp.ok) {
      throw Object.assign(new Error((data && data.error) || "Não foi possível concluir o pedido agora. Tente novamente."),
        { status: resp.status, dados: data || {} });
    }
    return data || {};
  }

  async function fecharPedido(pagamento) {
    const { dados, total } = montarPedido();
    const cliente = dadosCliente();
    try {
      const pedido = await chamarApiPedido({
        itens: dados.itens.filter(i => i.id).map(i => ({ id: i.id, qty: i.qty || 1 })),
        pagamento: pagamento,
        entrega: opcaoSelecionada().id,
        presente: presenteMarcado(),
        presenteMsg: cliente.presenteMsg || "",
        cliente: { nome: cliente.nome, email: cliente.email, telefone: cliente.telefone, instagram: cliente.instagram },
        endereco: cliente.endereco || "",
        observacoes: cliente.observacoes || "",
        origem: origemPedido || "",
        totalVisto: totalParaEnviar(total)
      });
      pedidoServidor = pedido;
      ajusteTotal = null;
      codigoPedido = pedido.codigo;
      return pedido;
    } catch (e) {
      // O total mudou (a promoção acabou, um preço foi atualizado): a tela
      // passa a mostrar o valor certo e o próximo toque confirma com ele.
      if (e.status === 409 && e.dados && typeof e.dados.totalAtualizado === "number") {
        ajusteTotal = { cliente: total, servidor: e.dados.totalAtualizado };
      }
      throw e;
    }
  }

  function mostrarErroPedido(e) {
    if (!erroPag) return;
    let msg = e && e.status
      ? e.message
      : "Não foi possível falar com a loja agora. Confira a sua internet e tente de novo.";
    const ids = e && e.dados && Array.isArray(e.dados.indisponiveis) ? e.dados.indisponiveis : [];
    if (ids.length) {
      const titulos = dadosPedido().itens.filter(i => ids.indexOf(i.id) >= 0).map(i => "“" + i.livro.titulo + "”");
      if (titulos.length) msg += " " + titulos.join(", ") + ".";
      msg += " Volte ao carrinho para ajustar o pedido.";
    }
    erroPag.hidden = false;
    erroPag.textContent = msg;
    erroPag.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ----- Pix manual: o código sai da chave da loja, com o total do servidor ----- */
  async function gerarPixManual() {
    if (!pixConfigurado()) return;
    if (erroPag) erroPag.hidden = true;
    let txtBtn;
    if (btnGerar) { txtBtn = btnGerar.innerHTML; btnGerar.disabled = true; btnGerar.textContent = "Gerando Pix…"; }
    try {
      salvarPerfilSeLogado();
      const pedido = await fecharPedido("pix");
      const payload = String(pedido.pix || "");
      if (!payload || !window.Pix.validar(payload)) {
        throw Object.assign(new Error("Não foi possível gerar o Pix. Confira a chave Pix em js/config.js."), { status: 500 });
      }
      pixCopiaCola = payload;
      pixTicketUrl = "";
      document.getElementById("pix-codigo").value = payload;
      document.getElementById("pix-valor-total").textContent = Precos.formatarBRL(pedido.total);
      renderQR(payload);
      mostrarPixArea();
    } catch (e) {
      mostrarErroPedido(e);
    } finally {
      if (btnGerar && txtBtn) btnGerar.innerHTML = txtBtn;
      atualizarEstadoPagamento();
    }
  }

  /* ----- Pix pelo Mercado Pago: cobrança + confirmação automática ----- */
  async function gerarPixMercadoPago() {
    if (erroPag) erroPag.hidden = true;
    let txtBtn;
    if (btnGerar) { txtBtn = btnGerar.innerHTML; btnGerar.disabled = true; btnGerar.textContent = "Gerando Pix…"; }
    try {
      salvarPerfilSeLogado();
      const pedido = await fecharPedido("pix");
      if (!pedido.qr_code) throw Object.assign(new Error("Não foi possível gerar o Pix agora. Tente novamente em instantes."), { status: 502 });
      pagamentoId = pedido.pagamentoId;
      pixCopiaCola = pedido.qr_code;
      pixTicketUrl = pedido.ticket_url || "";
      document.getElementById("pix-codigo").value = pedido.qr_code;
      document.getElementById("pix-valor-total").textContent = Precos.formatarBRL(pedido.total);
      renderQRImagem(pedido.qr_code_base64);
      mostrarPixArea();
      marcarAguardando();
      iniciarPolling();
    } catch (e) {
      mostrarErroPedido(e);
    } finally {
      if (btnGerar && txtBtn) btnGerar.innerHTML = txtBtn;
      atualizarEstadoPagamento();
    }
  }

  function marcarAguardando() {
    const st = document.getElementById("pix-status");
    if (st) {
      st.hidden = false;
      st.className = "pix-status aguardando";
      st.textContent = "Aguardando o pagamento… esta tela confirma sozinha quando o Pix cair.";
    }
    const btn = document.getElementById("btn-ja-paguei");
    if (btn) btn.textContent = "Já paguei, verificar agora";
  }

  let pollInicio = 0;
  const POLL_MAXIMO = 30 * 60 * 1000;   // para de checar após 30 min

  function iniciarPolling() {
    pararPolling();
    pollInicio = Date.now();
    pollTimer = setInterval(() => {
      if (Date.now() - pollInicio > POLL_MAXIMO) {
        pararPolling();
        const st = document.getElementById("pix-status");
        if (st) {
          st.hidden = false;
          st.className = "pix-status aguardando";
          st.textContent = "O código Pix pode ter expirado. Se você ainda não pagou, gere um novo Pix. Se já pagou, toque em \"Já fiz o pagamento\".";
        }
        return;
      }
      checarPagamento(false);
    }, 4000);
  }
  function pararPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  // Consulta o backend se o pagamento já foi aprovado.
  async function checarPagamento(manual) {
    if (!pagamentoId) return false;
    try {
      const r = await fetch("/api/status-pix?id=" + encodeURIComponent(pagamentoId));
      const d = await r.json();
      if (d && d.status === "approved") {
        pararPolling();
        await aoConfirmarPagamento();
        return true;
      }
      if (manual) {
        const st = document.getElementById("pix-status");
        if (st) {
          st.className = "pix-status aguardando";
          st.textContent = "Ainda não identificamos o pagamento. Se você acabou de pagar, aguarde alguns segundos e verifique de novo.";
        }
      }
    } catch (e) { /* silencioso: tenta de novo no próximo ciclo */ }
    return false;
  }

  async function aoConfirmarPagamento() {
    const st = document.getElementById("pix-status");
    if (st) { st.className = "pix-status confirmado"; st.textContent = "Pagamento confirmado ✓"; }
    // O pedido já foi marcado como PAGO pelo servidor (api/status-pix e o
    // webhook do Mercado Pago), que também dá baixa no estoque e avisa o
    // cliente. Daqui só sai o aviso para a LOJA.
    await enviarEmailLoja();
    sucesso(true);
  }

  /* ----- Dinheiro em espécie: paga na entrega, aprovado na hora ----- */
  let confirmandoDinheiro = false;   // trava contra clique duplo
  async function confirmarPedidoDinheiro() {
    if (confirmandoDinheiro) return;
    if (!validar(true)) {
      if (avisoForm) { avisoForm.hidden = false; avisoForm.innerHTML = mensagemAvisoForm(); }
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    confirmandoDinheiro = true;
    let txtBtn;
    if (btnDinheiro) { txtBtn = btnDinheiro.innerHTML; btnDinheiro.disabled = true; btnDinheiro.textContent = "Confirmando pedido…"; }
    try {
      pagamentoId = null;
      pixCopiaCola = "";
      pixTicketUrl = "";
      if (erroPag) erroPag.hidden = true;
      salvarPerfilSeLogado();
      // O servidor aprova o pedido, tira os livros da loja e avisa o cliente.
      await fecharPedido("dinheiro");
      await enviarEmailLoja();
      sucesso(true);
    } catch (e) {
      mostrarErroPedido(e);
    } finally {
      confirmandoDinheiro = false;
      if (btnDinheiro && txtBtn) btnDinheiro.innerHTML = txtBtn;
      atualizarEstadoPagamento();
    }
  }

  /* ----- Conta (Firebase): salvar o perfil, se logado ----- */
  function salvarPerfilSeLogado() {
    if (!window.Auth || !window.Auth.usuario || !window.Auth.usuario()) return Promise.resolve();
    const op = opcaoSelecionada();
    const perfil = {
      nome: val("cli-nome"),
      email: val("cli-email"),
      telefone: val("cli-tel"),
      instagram: val("cli-instagram").replace(/^@+/, "")
    };
    if (op.pedeEndereco) {
      perfil.endereco = enderecoDescrito()
        ? { modo: "descricao", descricao: val("end-descricao") }
        : {
            modo: "campos",
            cep: val("end-cep"), rua: val("end-rua"), numero: val("end-numero"),
            complemento: val("end-compl"), bairro: val("end-bairro"),
            cidade: val("end-cidade"), uf: val("end-uf").toUpperCase()
          };
    }
    return window.Auth.salvarPerfil(perfil).catch(() => {});
  }

  /* O e-mail do pedido para a LOJA já saiu: marca no pedido, para a
     página "Minha conta" não reenviar. É o único campo do pedido que o
     navegador pode mudar (regras do Firestore). */
  function marcarEmailEnviado() {
    if (!codigoPedido || !(window.Auth && window.Auth.usuario && window.Auth.usuario())) return;
    window.Auth.atualizarPedido(codigoPedido, { emailEnviado: true }).catch(() => {});
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

  /* ----- Aviso do pedido para a LOJA (Web3Forms) -----
     Sai do NAVEGADOR: o Web3Forms barra chamadas de servidor (desafio
     anti-bot do Cloudflare). O texto vem pronto do servidor, com os
     valores que ELE calculou. Se falhar, a página "Minha conta" reenvia
     depois (o pedido continua sem a marca emailEnviado). */
  async function enviarEmailLoja() {
    const key = String((CFG.pedidos && CFG.pedidos.web3formsKey) || "").trim();
    const corpo = pedidoServidor && pedidoServidor.emailBody;
    if (!key || !corpo) return;
    try {
      const resp = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(Object.assign({ access_key: key }, corpo))
      });
      let dados = null;
      try { dados = await resp.json(); } catch (e) { /* resposta sem JSON */ }
      if (resp.ok && dados && dados.success === true) marcarEmailEnviado();
    } catch (e) { /* não bloqueia a conclusão do pedido */ }
  }

  /* ---------- Confirmação ---------- */
  async function finalizar() {
    if (!validar(true)) {
      if (avisoForm) { avisoForm.hidden = false; avisoForm.innerHTML = mensagemAvisoForm(); }
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const btn = document.getElementById("btn-ja-paguei");
    let original;

    // Modo Mercado Pago: o botão só força uma verificação imediata.
    // Quem realmente conclui o pedido é a confirmação automática.
    if (usaMercadoPago) {
      if (btn) { original = btn.textContent; btn.disabled = true; btn.textContent = "Verificando…"; }
      await checarPagamento(true);
      if (btn) { btn.disabled = false; btn.textContent = original; }
      return;
    }

    // Pix manual: avisa a loja e registra que o cliente diz ter pago
    // (o pedido passa a "aguardando"; a loja confere no banco).
    if (btn) { original = btn.textContent; btn.disabled = true; btn.textContent = "Enviando pedido…"; }
    await enviarEmailLoja();
    try { await chamarApiPedido({ acao: "ja-paguei", codigo: codigoPedido }); } catch (e) { /* a loja confere no banco do mesmo jeito */ }
    if (btn) { btn.disabled = false; btn.textContent = original; }
    sucesso(false);
  }

  function sucesso(confirmado) {
    pararPolling();
    // Valores oficiais: os do servidor (a conta desta tela é só a prévia).
    const calc = montarPedido();
    const oficial = pedidoServidor || {};
    const dados = calc.dados;
    const total = typeof oficial.total === "number" ? oficial.total : calc.total;
    const subtotal = typeof oficial.subtotal === "number" ? oficial.subtotal : dados.subtotal;
    const frete = typeof oficial.frete === "number" ? oficial.frete : calc.frete;
    const presente = typeof oficial.presente === "number" ? oficial.presente : calc.presente;
    const cliente = dadosCliente();
    const emDinheiro = metodoPagamento === "dinheiro";

    // Métrica de compra (GA4 "purchase" + conversão do Google Ads, com
    // conversões otimizadas a partir dos dados do cliente). Só dispara se
    // as métricas estiverem ligadas em js/config.js.
    if (window.Analytics) window.Analytics.compra({
      codigo: codigoPedido,
      total: total,
      subtotal: subtotal,
      frete: frete,
      itens: dados.itens
    }, cliente);

    const linhas = dados.itens.map(i =>
      `<li><span>${i.qty}× ${esc(i.livro.titulo)}${i.livro.condicao ? ` <span class="ci-condicao">${i.livro.condicao === "novo" ? "Novo" : "Usado"}</span>` : ""}</span><span>${Precos.formatarBRL(i.precoLinha)}</span></li>`).join("");

    const det = document.getElementById("confirmacao-detalhes");
    det.innerHTML = `
      <div class="conf-pedido">
        <p class="conf-rotulo">Código do pedido</p>
        <p class="conf-codigo">${codigoPedido || "—"}</p>
      </div>
      <ul class="conf-itens">${linhas}</ul>
      <dl class="conf-totais">
        <div><dt>Subtotal</dt><dd>${Precos.formatarBRL(subtotal)}</dd></div>
        ${opcoesFrete.some(o => o.valor > 0) ? `<div><dt>Frete</dt><dd>${frete === 0 ? "Grátis" : Precos.formatarBRL(frete)}</dd></div>` : ""}
        ${presente ? `<div><dt>Embalar para presente</dt><dd>${Precos.formatarBRL(presente)}</dd></div>` : ""}
        <div class="conf-total"><dt>${emDinheiro ? "Total a pagar na entrega" : "Total do Pix"}</dt><dd>${Precos.formatarBRL(total)}</dd></div>
      </dl>
      <p class="conf-entrega"><strong>Entrega:</strong> ${esc(cliente.entrega)}${cliente.endereco ? " · " + esc(cliente.endereco) : ""}</p>
      ${cliente.presente ? `<p class="conf-presente"><strong>Embalado para presente</strong>${cliente.presenteMsg ? ` (cartão: “${esc(cliente.presenteMsg)}”)` : ""}</p>` : ""}
      <p class="conf-aviso">${emDinheiro
        ? "Pedido aprovado! Você paga em dinheiro em espécie quando o pedido for entregue. Em breve entraremos em contato para combinar a entrega."
        : (confirmado
          ? "Pagamento confirmado! Em breve entraremos em contato para combinar a entrega."
          : "Assim que confirmarmos o seu Pix, preparamos o pedido. Se puder, envie o comprovante para agilizar.")}</p>`;

    const sub = document.getElementById("confirmacao-sub");
    sub.textContent = `Obrigado, ${cliente.nome || "leitor(a)"}! Recebemos seu pedido.`;

    // Botão para enviar o comprovante (WhatsApp, ou Instagram como alternativa).
    // No pagamento em dinheiro não há comprovante: vira um botão de contato.
    const elWhats = document.getElementById("confirmacao-whats");
    if (elWhats) {
      const resumoMsg = dados.itens.map(i => `• ${i.qty}× ${i.livro.titulo}`).join("%0A");
      const corpo = (emDinheiro
        ? `Olá! Acabei de fazer um pedido na ${CFG.nomeLoja || "BookVerse"} e vou pagar em dinheiro na entrega.%0A%0A`
        : `Olá! Acabei de pagar via Pix na ${CFG.nomeLoja || "BookVerse"}.%0A%0A`) +
        resumoMsg +
        `%0A%0ATotal: ${Precos.formatarBRL(total)}` +
        `%0AEntrega: ${cliente.entrega}` +
        `%0APedido: ${codigoPedido || ""}` +
        `%0ANome: ${cliente.nome}` +
        (emDinheiro ? "" : `%0A%0A(vou anexar o comprovante)`);
      if (emDinheiro) elWhats.textContent = "Falar com a loja no WhatsApp";
      if (CFG.whatsapp) {
        elWhats.href = `https://wa.me/${CFG.whatsapp}?text=${corpo}`;
        elWhats.hidden = false;
      } else if (CFG.instagram) {
        elWhats.href = `https://ig.me/m/${CFG.instagram}`;
        elWhats.hidden = false;
      }
    }

    // Compra direta: não mexe no carrinho, só encerra a compra avulsa.
    // Compra pelo carrinho: esvazia o carrinho.
    if (compraDireta) {
      try { sessionStorage.removeItem("bookverse_compra_direta"); } catch (e) {}
    } else {
      Carrinho.limpar();
    }

    // Pedido fechado: a marca do link do Meta não vale para o próximo.
    try { sessionStorage.removeItem("bookverse_origem"); } catch (e) {}

    document.getElementById("checkout-grid").hidden = true;
    document.getElementById("checkout-vazio").hidden = true;
    document.getElementById("confirmacao").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- Embalar para presente ---------- */
  const chkPresente = document.getElementById("cli-presente");
  const campoPresenteMsg = document.getElementById("campo-presente-msg");
  const elPresentePreco = document.getElementById("presente-preco");
  if (elPresentePreco) elPresentePreco.textContent = "+ " + Precos.formatarBRL(valorPresente());
  if (chkPresente) chkPresente.addEventListener("change", () => {
    if (campoPresenteMsg) campoPresenteMsg.hidden = !chkPresente.checked;
    render();
    atualizarEstadoPagamento();
  });

  /* ---------- Liga tudo ---------- */
  if (btnGerar) btnGerar.addEventListener("click", gerarPix);
  if (btnDinheiro) btnDinheiro.addEventListener("click", confirmarPedidoDinheiro);
  montarMetodosPagamento();
  const btnCopiar = document.getElementById("btn-copiar-pix");
  if (btnCopiar) btnCopiar.addEventListener("click", copiarPix);
  const btnPaguei = document.getElementById("btn-ja-paguei");
  if (btnPaguei) btnPaguei.addEventListener("click", finalizar);

  /* ---------- Proteção da página: só abre com conta ----------
     Os dados vêm da conta e o checkout só funciona logado. Se alguém
     chegar aqui sem login (ex.: abrindo a URL direto), mandamos de
     volta para a loja — onde ficam os avisos de criar conta. */
  function protegerCheckout() {
    if (!exigeConta()) return;
    window.Auth.onChange(function (user) {
      if (!window.Auth.pronto) return;     // espera saber o estado
      if (!user) window.location.replace("./");
    });
  }

  /* ---------- Dados vêm da conta (exibição, não edição) ----------
     O cliente edita os próprios dados em "Minha conta". Aqui só
     mostramos um cartão de leitura (os valores ficam em inputs ocultos
     usados para montar o pedido). */
  function setCampo(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor || "";
  }

  // Atualiza o cartão visual de "Seus dados" a partir dos inputs ocultos.
  function atualizarCartaoDados() {
    function aplicar(idSpan, valor, obrigatorio) {
      const el = document.getElementById(idSpan);
      if (!el) return;
      const tem = !!(valor && String(valor).trim());
      el.textContent = tem ? valor : (obrigatorio ? "Não informado" : "—");
      el.classList.toggle("faltando", !tem && obrigatorio);
    }
    aplicar("show-nome", val("cli-nome"), true);
    aplicar("show-email", val("cli-email"), true);
    aplicar("show-tel", val("cli-tel"), true);
    aplicar("show-instagram", val("cli-instagram"), false);

    const endEl = document.getElementById("show-endereco");
    if (endEl) {
      let endereco;
      if (enderecoDescrito()) {
        endereco = val("end-descricao");
      } else {
        const cidUf = (val("end-cidade") && val("end-uf"))
          ? val("end-cidade") + "/" + val("end-uf").toUpperCase()
          : (val("end-cidade") || val("end-uf").toUpperCase());
        endereco = [val("end-rua"), val("end-numero"), val("end-compl"),
          val("end-bairro"), cidUf, val("end-cep") ? "CEP " + val("end-cep") : ""]
          .filter(Boolean).join(", ");
      }
      const obrig = opcaoSelecionada().pedeEndereco;
      const tem = !!endereco;
      endEl.textContent = tem ? endereco : (obrig ? "Não informado" : "—");
      endEl.classList.toggle("faltando", !tem && obrig);
    }
  }

  function preencherDeConta() {
    if (!window.Auth || !window.Auth.configurado) return;
    window.Auth.onChange(async (user) => {
      if (user) {
        setCampo("cli-nome", user.nome);
        setCampo("cli-email", user.email);
        try {
          const p = await window.Auth.perfil();
          if (p) {
            if (p.nome) setCampo("cli-nome", p.nome);
            if (p.email) setCampo("cli-email", p.email);
            setCampo("cli-tel", p.telefone);
            setCampo("cli-instagram", p.instagram ? "@" + p.instagram : "");
            const en = p.endereco || {};
            setCampo("end-cep", en.cep);   setCampo("end-rua", en.rua);
            setCampo("end-numero", en.numero); setCampo("end-compl", en.complemento);
            setCampo("end-bairro", en.bairro); setCampo("end-cidade", en.cidade);
            setCampo("end-uf", en.uf);
            setCampo("end-descricao", en.descricao);
            // Perfis antigos não têm "modo": assume descrição se só houver o texto.
            setCampo("end-modo", en.modo || (en.descricao && !en.rua ? "descricao" : "campos"));
          }
        } catch (e) {}
      }
      contaCarregada = true;
      atualizarCartaoDados();
      atualizarEstadoPagamento();   // reavalia o botão quando a conta carrega
    });
  }

  /* ---------- Catálogo do admin (livros adicionados pelo painel) ----------
     A vitrine junta LIVROS (js/livros.js) com o catálogo do Firestore.
     O checkout precisa da MESMA junção: sem ela, um "Comprar agora" em um
     livro do catálogo chegava aqui sem correspondência e a página dizia
     que o carrinho estava vazio. */
  /* A junção (e a limpeza de livros ocultos, repetidos e apagados) mora
     em js/catalogo.js — a mesma que a vitrine usa. */
  function aplicarCatalogo(extras, autoritativo) {
    if (!window.CatalogoLoja) return false;
    return window.CatalogoLoja.aplicarExtras(extras, autoritativo);
  }

  function carregarCatalogo() {
    if (!window.CatalogoLoja) return;
    // 1) Cache local gravado pela vitrine: aplica na hora, sem esperar a rede.
    aplicarCatalogo(window.CatalogoLoja.catalogoGuardado(), false);
    // 2) Resposta fresca (caminho leve, sem as fotos): se mudar algo, refaz a página.
    window.CatalogoLoja.lerCatalogoLeve().then(extras => {
      if (Array.isArray(extras) && aplicarCatalogo(extras, true)) initLoja();
    }).catch(() => {});
  }

  let inicializado = false;
  function initLoja() {
    if (dadosPedido().vazio) { render(); return; }
    if (inicializado) { render(); atualizarEstadoPagamento(); return; }
    inicializado = true;
    montarEntrega();
    render();
    preencherDeConta();
    atualizarEstadoPagamento();
    // Métrica de "início de checkout" (só dispara se as métricas estiverem ligadas).
    if (window.Analytics) window.Analytics.iniciarCheckout(dadosPedido());
  }

  function init() {
    protegerCheckout();
    carregarCatalogo();
    initLoja();
  }

  init();
})();
