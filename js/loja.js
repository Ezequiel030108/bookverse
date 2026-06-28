/* ============================================================
   BOOKVERSE — LOJA (vitrine): carrinho lateral + contador
   ------------------------------------------------------------
   Liga os botões "Adicionar ao carrinho" da vitrine ao módulo
   window.Carrinho, mostra o contador na barra do topo e abre o
   carrinho lateral (drawer). Não precisa mexer aqui.
   ============================================================ */

(function () {
  const Precos = window.Precos;
  const Carrinho = window.Carrinho;

  const btnCarrinho = document.getElementById("btn-carrinho");
  const contador    = document.getElementById("carrinho-contador");
  const drawer      = document.getElementById("carrinho-drawer");
  const drawerFundo = document.getElementById("drawer-fundo");
  const fecharBtn   = document.getElementById("carrinho-fechar");
  const itensEl     = document.getElementById("carrinho-itens");
  const vazioEl     = document.getElementById("carrinho-vazio");
  const rodapeEl    = document.getElementById("carrinho-rodape");
  const subtotalEl  = document.getElementById("carrinho-subtotal");
  const irCheckout  = document.getElementById("ir-checkout");

  if (!btnCarrinho) return; // página sem loja

  /* ---------- Abrir / fechar o carrinho lateral ---------- */
  function abrirDrawer() {
    drawer.hidden = false;
    drawerFundo.hidden = false;
    requestAnimationFrame(() => {
      drawer.classList.add("aberto");
      drawerFundo.classList.add("aberto");
    });
    document.body.style.overflow = "hidden";
  }
  function fecharDrawer() {
    drawer.classList.remove("aberto");
    drawerFundo.classList.remove("aberto");
    document.body.style.overflow = "";
    setTimeout(() => { drawer.hidden = true; drawerFundo.hidden = true; }, 280);
  }
  btnCarrinho.addEventListener("click", abrirDrawer);
  fecharBtn.addEventListener("click", fecharDrawer);
  drawerFundo.addEventListener("click", fecharDrawer);
  const continuar = document.getElementById("carrinho-continuar");
  if (continuar) continuar.addEventListener("click", fecharDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.hidden) fecharDrawer();
  });

  /* ---------- Render do carrinho lateral ---------- */
  function precoLinhaHTML(item) {
    const base = Precos.precoNumerico(item.livro.preco);
    if (Precos.promoAtiva() && item.precoUnit < base) {
      return `<span class="ci-preco em-promo"><s>${Precos.formatarBRL(base)}</s> ${Precos.formatarBRL(item.precoUnit)}</span>`;
    }
    return `<span class="ci-preco">${Precos.formatarBRL(item.precoUnit)}</span>`;
  }

  function render(dados) {
    // Contador na barra do topo
    if (dados.totalItens > 0) {
      contador.textContent = dados.totalItens;
      contador.hidden = false;
      btnCarrinho.classList.add("tem-itens");
    } else {
      contador.hidden = true;
      btnCarrinho.classList.remove("tem-itens");
    }

    // Conteúdo do drawer
    if (dados.vazio) {
      itensEl.innerHTML = "";
      vazioEl.hidden = false;
      rodapeEl.hidden = true;
      return;
    }
    vazioEl.hidden = true;
    rodapeEl.hidden = false;

    itensEl.innerHTML = dados.itens.map(item => `
      <div class="carrinho-item" data-id="${item.id}">
        <div class="carrinho-item-capa">${typeof capaHTML === "function" ? capaHTML(item.livro) : ""}</div>
        <div class="carrinho-item-info">
          <p class="carrinho-item-titulo">${item.livro.titulo}</p>
          <p class="carrinho-item-autor">${item.livro.autor}</p>
          ${precoLinhaHTML(item)}
        </div>
        <div class="carrinho-item-controles">
          <div class="qty-stepper" role="group" aria-label="Quantidade">
            <button type="button" data-acao="menos" aria-label="Diminuir quantidade">−</button>
            <span class="qty-valor">${item.qty}</span>
            <button type="button" data-acao="mais" aria-label="Aumentar quantidade" ${item.qty >= item.livro.estoque ? "disabled" : ""}>+</button>
          </div>
          <button type="button" class="carrinho-remover" data-acao="remover" aria-label="Remover ${item.livro.titulo}">Remover</button>
        </div>
      </div>
    `).join("");

    subtotalEl.textContent = Precos.formatarBRL(dados.subtotal);
  }

  // Controles dentro do carrinho (delegação de eventos)
  itensEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-acao]");
    if (!btn) return;
    const linha = btn.closest(".carrinho-item");
    const id = linha && linha.dataset.id;
    if (!id) return;
    const atual = Carrinho.resolver().itens.find(i => i.id === id);
    const qty = atual ? atual.qty : 0;
    if (btn.dataset.acao === "menos")   Carrinho.definirQty(id, qty - 1);
    if (btn.dataset.acao === "mais")    Carrinho.definirQty(id, qty + 1);
    if (btn.dataset.acao === "remover") Carrinho.remover(id);
  });

  /* ---------- Toast (aviso rápido) ---------- */
  let toastTimer;
  function toast(msg) {
    let el = document.getElementById("loja-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "loja-toast";
      el.className = "loja-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
      <span>${msg}</span>`;
    requestAnimationFrame(() => el.classList.add("visivel"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("visivel"), 2200);
  }

  // Exposto para o main.js (modal) reutilizar o aviso.
  window.lojaToast = toast;
  window.abrirCarrinho = abrirDrawer;

  /* ---------- Liga tudo ---------- */
  Carrinho.assinar(render);
})();
