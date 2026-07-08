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
  const esc = window.esc || (t => String(t == null ? "" : t));

  // Trava o scroll da página de fundo (html E body — no celular, só o
  // body não basta e a página de trás rola junto).
  function travarFundo(travar) {
    const v = travar ? "hidden" : "";
    document.body.style.overflow = v;
    document.documentElement.style.overflow = v;
  }

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
  let soltarFocoDrawer = null;
  function abrirDrawer() {
    drawer.hidden = false;
    drawerFundo.hidden = false;
    requestAnimationFrame(() => {
      drawer.classList.add("aberto");
      drawerFundo.classList.add("aberto");
    });
    travarFundo(true);
    if (window.Util && window.Util.prenderFoco) soltarFocoDrawer = window.Util.prenderFoco(drawer);
  }
  function fecharDrawer() {
    drawer.classList.remove("aberto");
    drawerFundo.classList.remove("aberto");
    travarFundo(false);
    setTimeout(() => { drawer.hidden = true; drawerFundo.hidden = true; }, 280);
    if (soltarFocoDrawer) { soltarFocoDrawer(); soltarFocoDrawer = null; }
  }
  btnCarrinho.addEventListener("click", abrirDrawer);
  fecharBtn.addEventListener("click", fecharDrawer);
  drawerFundo.addEventListener("click", fecharDrawer);
  const continuar = document.getElementById("carrinho-continuar");
  if (continuar) continuar.addEventListener("click", fecharDrawer);
  // Finalizar pelo carrinho leva o carrinho inteiro: cancela qualquer
  // "compra direta" pendente para não misturar os fluxos.
  if (irCheckout) irCheckout.addEventListener("click", () => {
    try { sessionStorage.removeItem("bookverse_compra_direta"); } catch (e) {}
  });
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

    itensEl.innerHTML = dados.itens.map(item => {
      // Livros com 1 unidade não têm seletor de quantidade.
      const controleQty = item.livro.estoque <= 1
        ? `<span class="qty-unica">Unidade única</span>`
        : `<div class="qty-stepper" role="group" aria-label="Quantidade">
            <button type="button" data-acao="menos" aria-label="Diminuir quantidade">−</button>
            <span class="qty-valor">${item.qty}</span>
            <button type="button" data-acao="mais" aria-label="Aumentar quantidade" ${item.qty >= item.livro.estoque ? "disabled" : ""}>+</button>
          </div>`;
      const condicao = item.livro.condicao
        ? `<span class="ci-condicao">${item.livro.condicao === "novo" ? "Novo" : "Usado"}</span>` : "";
      return `
      <div class="carrinho-item" data-id="${esc(item.id)}">
        <div class="carrinho-item-capa">${typeof capaHTML === "function" ? capaHTML(item.livro) : ""}</div>
        <div class="carrinho-item-info">
          <p class="carrinho-item-titulo">${esc(item.livro.titulo)}${condicao}</p>
          <p class="carrinho-item-autor">${esc(item.livro.autor)}</p>
          ${precoLinhaHTML(item)}
        </div>
        <div class="carrinho-item-controles">
          ${controleQty}
          <button type="button" class="carrinho-remover" data-acao="remover" aria-label="Remover ${esc(item.livro.titulo)}">Remover</button>
        </div>
      </div>`;
    }).join("");

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
      <span>${esc(msg)}</span>`;
    requestAnimationFrame(() => el.classList.add("visivel"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("visivel"), 2200);
  }

  // Exposto para o main.js (modal) reutilizar o aviso.
  window.lojaToast = toast;
  window.abrirCarrinho = abrirDrawer;

  /* ---------- Aviso "precisa de conta" (modal bloqueante) ---------- */
  const avisoConta = document.getElementById("aviso-conta");
  function abrirAvisoConta() {
    if (!avisoConta) { toast("Crie sua conta para adicionar livros"); return; }
    avisoConta.hidden = false;
    requestAnimationFrame(() => avisoConta.classList.add("aberto"));
    travarFundo(true);
  }
  function fecharAvisoConta() {
    if (!avisoConta) return;
    avisoConta.classList.remove("aberto");
    travarFundo(false);
    setTimeout(() => { avisoConta.hidden = true; }, 250);
  }
  if (avisoConta) {
    avisoConta.querySelectorAll("[data-fechar-aviso]").forEach(el =>
      el.addEventListener("click", fecharAvisoConta));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !avisoConta.hidden) fecharAvisoConta();
    });
    const btnG = document.getElementById("aviso-conta-google");
    if (btnG) btnG.addEventListener("click", async () => {
      btnG.disabled = true;
      let user = null;
      try { if (window.Auth) user = await window.Auth.entrarComGoogle(); } catch (e) {}
      btnG.disabled = false;
      fecharAvisoConta();
      if (!user) return;
      // Primeira vez (cadastro incompleto): leva ao onboarding e volta.
      // Se já tiver cadastro, o onChange retoma a ação pendente sozinho.
      let completo = false;
      try { completo = await window.Auth.cadastroCompleto(); } catch (e) {}
      if (!completo) {
        try { sessionStorage.setItem("bookverse_retorno", "index.html"); } catch (e) {}
        window.location.href = "conta.html";
      }
    });
  }

  /* ---------- Carrinho exige conta ---------- */
  // Só permite usar o carrinho com o cliente logado (quando o login
  // está configurado). Caso contrário, guarda a ação pretendida e abre
  // o modal pedindo conta.
  function podeUsarCarrinho(pendente) {
    if (!(window.Auth && window.Auth.configurado)) return true; // contas desligadas
    if (window.Auth.usuario()) return true;                     // logado
    if (pendente) {
      try { sessionStorage.setItem("bookverse_acao_pendente", JSON.stringify(pendente)); } catch (e) {}
    }
    abrirAvisoConta();
    return false;
  }
  window.podeUsarCarrinho = podeUsarCarrinho;

  /* ---------- Roteamento após o login ----------
     - Cadastro incompleto: leva ao onboarding (e volta depois).
     - Cadastro completo: retoma a ação que foi interrompida (adicionar
       ao carrinho ou comprar agora). */
  async function rotearAposLogin() {
    let pend = null;
    try { pend = JSON.parse(sessionStorage.getItem("bookverse_acao_pendente") || "null"); } catch (e) {}
    if (!pend) return;                          // nada pendente: segue normal

    let completo = false;
    try { completo = await window.Auth.cadastroCompleto(); } catch (e) {}
    if (!completo) return;                       // aguarda o onboarding (não força aqui)

    try { sessionStorage.removeItem("bookverse_acao_pendente"); } catch (e) {}

    // "Comprar agora": compra direta, sem mexer no carrinho.
    if (pend.tipo === "comprar") {
      try { sessionStorage.setItem("bookverse_compra_direta", JSON.stringify({ id: pend.id, qty: 1 })); } catch (e) {}
      window.location.href = "checkout.html";
      return;
    }

    // "Adicionar ao carrinho".
    const livro = (typeof LIVROS !== "undefined" && Array.isArray(LIVROS))
      ? LIVROS.find(l => window.idLivro(l) === pend.id) : null;
    if (!livro) return;
    Carrinho.add(livro, 1);
    toast(`"${livro.titulo}" no carrinho`);
    abrirDrawer();
  }

  /* ---------- Sincroniza o carrinho com a conta (Firestore) ---------- */
  if (window.Auth && window.Auth.configurado) {
    let carrinhoPronto = false;
    let salvarTimer;
    window.Auth.onChange(async (user) => {
      if (!window.Auth.pronto) return;     // ainda não sabemos o estado
      carrinhoPronto = false;
      if (user) {
        try {
          const remoto = await window.Auth.lerCarrinho();
          if (remoto) Carrinho.substituir(remoto);
        } catch (e) {}
        carrinhoPronto = true;             // a partir daqui, mudanças são salvas
        rotearAposLogin();                 // onboarding ou retomar a ação
      } else {
        Carrinho.limpar();                 // sem conta: carrinho vazio
      }
    });
    document.addEventListener("carrinho:mudou", () => {
      if (!carrinhoPronto || !window.Auth.usuario()) return;
      clearTimeout(salvarTimer);
      salvarTimer = setTimeout(() => {
        const itens = Carrinho.resolver().itens.map(i => ({ id: i.id, qty: i.qty }));
        window.Auth.salvarCarrinho(itens).catch(() => {});
      }, 600);
    });
  }

  /* ---------- Liga tudo ---------- */
  Carrinho.assinar(render);
})();
