/* ============================================================
   BOOKVERSE — PÁGINA "MINHA CONTA"
   ------------------------------------------------------------
   Três estados:
   - Deslogado: botão de entrar com Google.
   - Onboarding (1ª vez): pede os dados obrigatórios, valida e
     mostra "cadastro completo" — depois o cliente continua de
     onde estava.
   - Painel (retornante): menu com "Meus dados" e "Meus pedidos"
     e o botão de sair.
   ============================================================ */

(function () {
  const Auth = window.Auth;
  const CFG = window.LOJA_CONFIG || {};
  const simbolo = (CFG.moeda && CFG.moeda.simbolo) || "R$";

  const elCarregando = document.getElementById("conta-carregando");
  const elDesconfig  = document.getElementById("conta-desconfig");
  const elDeslogado  = document.getElementById("conta-deslogado");
  const elLogado     = document.getElementById("conta-logado");
  const elErro       = document.getElementById("conta-erro");

  const onbIntro    = document.getElementById("onboarding-intro");
  const dashHeader  = document.getElementById("dashboard-header");
  const contaMenu   = document.getElementById("conta-menu");
  const painelDados = document.getElementById("painel-dados");
  const painelPedidos = document.getElementById("painel-pedidos");
  const onbOk       = document.getElementById("onboarding-ok");
  const dadosTitulo = document.getElementById("painel-dados-titulo");
  const dadosAjuda  = document.getElementById("painel-dados-ajuda");
  const btnSalvar   = document.getElementById("btn-salvar-perfil");
  const onbErro     = document.getElementById("onboarding-erro");

  const anoEl = document.getElementById("ano-atual");
  if (anoEl) anoEl.textContent = new Date().getFullYear();

  let modo = "dashboard";   // "onboarding" | "dashboard"

  function fmt(v) { const n = Number(v) || 0; return simbolo + " " + n.toFixed(2).replace(".", ","); }
  function mostrar(el) { [elCarregando, elDesconfig, elDeslogado, elLogado].forEach(x => { if (x) x.hidden = (x !== el); }); }

  /* ---------- Validação do WhatsApp (igual à do checkout) ---------- */
  function soDigitos(v) { return String(v || "").replace(/\D/g, ""); }
  function whatsappNacional(v) {
    let d = soDigitos(v);
    if ((d.length === 12 || d.length === 13) && d.indexOf("55") === 0) d = d.slice(2);
    return d;
  }
  function whatsappValido(v) { return /^[1-9][0-9]9\d{8}$/.test(whatsappNacional(v)); }

  /* ---------- Contas desligadas ---------- */
  if (!Auth || !Auth.configurado) { mostrar(elDesconfig); return; }

  /* ---------- Login / logout ---------- */
  const btnGoogle = document.getElementById("btn-google");
  if (btnGoogle) btnGoogle.addEventListener("click", async () => {
    if (elErro) elErro.hidden = true;
    btnGoogle.disabled = true;
    try { await Auth.entrarComGoogle(); }
    catch (e) { if (elErro) { elErro.hidden = false; elErro.textContent = "Não foi possível entrar com o Google. Tente novamente."; } }
    finally { btnGoogle.disabled = false; }
  });
  const btnSair = document.getElementById("btn-sair");
  if (btnSair) btnSair.addEventListener("click", () => Auth.sair());

  /* ---------- Campos ---------- */
  function v(id) { const e = document.getElementById(id); return e ? e.value.trim() : ""; }
  function set(id, val) { const e = document.getElementById(id); if (e) e.value = val || ""; }
  function marcar(id, ruim) { const e = document.getElementById(id); if (e) e.classList.toggle("invalido", !!ruim); }

  const pTel = document.getElementById("p-tel");
  const pDica = document.getElementById("p-dica-whats");
  function atualizarDicaWhats() {
    if (!pTel || !pDica) return;
    const erro = pTel.value.trim().length > 0 && !whatsappValido(pTel.value);
    pDica.classList.toggle("erro", erro);
    pDica.textContent = erro ? "Número inválido. Use DDD + número, ex.: (83) 9 9999-8888." : "Com DDD — ex.: (83) 9 9999-8888.";
  }
  if (pTel) pTel.addEventListener("input", () => { marcar("p-tel", false); atualizarDicaWhats(); });
  const pNome = document.getElementById("p-nome");
  if (pNome) pNome.addEventListener("input", () => marcar("p-nome", false));

  /* ---------- Form do perfil ---------- */
  const formPerfil = document.getElementById("form-perfil");
  const perfilOk = document.getElementById("perfil-ok");

  function validarPerfil() {
    const nomeRuim = !v("p-nome");
    const telRuim = !whatsappValido(v("p-tel"));
    marcar("p-nome", nomeRuim);
    marcar("p-tel", telRuim);
    atualizarDicaWhats();
    const ok = !nomeRuim && !telRuim;
    if (onbErro) {
      onbErro.hidden = ok;
      if (!ok) onbErro.textContent = "Preencha os campos obrigatórios: nome e um WhatsApp válido (com DDD).";
    }
    return ok;
  }

  if (formPerfil) formPerfil.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!validarPerfil()) return;
    if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = "Salvando…"; }
    if (onbErro) onbErro.hidden = true;
    try {
      await Auth.salvarPerfil({
        nome: v("p-nome"),
        telefone: v("p-tel"),
        instagram: v("p-instagram").replace(/^@+/, ""),
        endereco: {
          cep: v("p-cep"), rua: v("p-rua"), numero: v("p-numero"),
          complemento: v("p-compl"), bairro: v("p-bairro"),
          cidade: v("p-cidade"), uf: v("p-uf").toUpperCase()
        },
        cadastroCompleto: true
      });

      if (modo === "onboarding") {
        // Mostra "Cadastro completo!" e permanece até a pessoa clicar em
        // "Continuar" (que leva de volta para onde ela estava).
        entrarModoOk();
      } else if (perfilOk) {
        perfilOk.hidden = false;
        setTimeout(() => { perfilOk.hidden = true; }, 2500);
      }
    } catch (e) {
      if (onbErro) { onbErro.hidden = false; onbErro.textContent = "Não foi possível salvar agora. Tente novamente."; }
    } finally {
      if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = (modo === "onboarding") ? "Concluir cadastro" : "Salvar alterações"; }
    }
  });

  /* ---------- "Continuar" depois do onboarding ---------- */
  const btnContinuar = document.getElementById("btn-continuar");
  if (btnContinuar) btnContinuar.addEventListener("click", () => {
    let retorno = "index.html";
    try {
      retorno = sessionStorage.getItem("bookverse_retorno") || "index.html";
      sessionStorage.removeItem("bookverse_retorno");
    } catch (e) {}
    window.location.href = retorno;
  });

  /* ---------- Menu (abas) ---------- */
  function abrirTab(tab) {
    const ehDados = tab !== "pedidos";
    if (painelDados) painelDados.hidden = !ehDados;
    if (painelPedidos) painelPedidos.hidden = ehDados;
    document.querySelectorAll(".conta-menu-item").forEach(b =>
      b.classList.toggle("ativo", b.dataset.tab === (ehDados ? "dados" : "pedidos")));
    if (!ehDados) carregarPedidos();
  }
  document.querySelectorAll(".conta-menu-item").forEach(b =>
    b.addEventListener("click", () => abrirTab(b.dataset.tab)));

  /* ---------- Modos ---------- */
  function entrarModoOnboarding() {
    modo = "onboarding";
    if (onbIntro) onbIntro.hidden = false;
    if (dashHeader) dashHeader.hidden = true;
    if (contaMenu) contaMenu.hidden = true;
    if (painelDados) painelDados.hidden = false;
    if (painelPedidos) painelPedidos.hidden = true;
    if (onbOk) onbOk.hidden = true;
    if (dadosTitulo) dadosTitulo.hidden = true;
    if (dadosAjuda) dadosAjuda.hidden = true;
    if (btnSalvar) btnSalvar.textContent = "Concluir cadastro";
    if (zonaPerigo) zonaPerigo.hidden = true;
  }
  function entrarModoDashboard() {
    modo = "dashboard";
    if (onbIntro) onbIntro.hidden = true;
    if (dashHeader) dashHeader.hidden = false;
    if (contaMenu) contaMenu.hidden = false;
    if (onbOk) onbOk.hidden = true;
    if (dadosTitulo) dadosTitulo.hidden = false;
    if (dadosAjuda) dadosAjuda.hidden = false;
    if (btnSalvar) btnSalvar.textContent = "Salvar alterações";
    if (zonaPerigo) zonaPerigo.hidden = false;
    abrirTab(location.hash === "#pedidos" ? "pedidos" : "dados");
  }
  function entrarModoOk() {
    if (onbIntro) onbIntro.hidden = true;
    if (dashHeader) dashHeader.hidden = true;
    if (contaMenu) contaMenu.hidden = true;
    if (painelDados) painelDados.hidden = true;
    if (painelPedidos) painelPedidos.hidden = true;
    if (onbOk) onbOk.hidden = false;
    const okNome = document.getElementById("ok-nome");
    if (okNome) okNome.textContent = (v("p-nome") || "leitor(a)").split(" ")[0];
  }

  function perfilCompleto(p) {
    if (!p) return false;
    if (p.cadastroCompleto) return true;
    return !!(p.nome && whatsappValido(p.telefone));
  }

  /* ---------- Histórico de pedidos ---------- */
  const STATUS = {
    pago:       { texto: "Pago",                   classe: "pedido-pago" },
    pendente:   { texto: "Aguardando pagamento",   classe: "pedido-pendente" },
    aguardando: { texto: "Aguardando confirmação", classe: "pedido-pendente" }
  };

  function renderPedidos(pedidos) {
    const lista = document.getElementById("lista-pedidos");
    const vazio = document.getElementById("sem-pedidos");
    if (!lista) return;
    if (!pedidos.length) {
      lista.innerHTML = "";
      if (vazio) { vazio.hidden = false; vazio.textContent = "Você ainda não fez nenhum pedido por aqui."; }
      return;
    }
    if (vazio) vazio.hidden = true;
    lista.innerHTML = pedidos.map(p => {
      const st = STATUS[p.status] || { texto: p.status || "—", classe: "pedido-pendente" };
      const itens = (p.itens || []).map(i => `<li>${i.qty}× ${i.titulo}</li>`).join("");
      const data = p.criadoEm && p.criadoEm.toDate ? p.criadoEm.toDate().toLocaleDateString("pt-BR") : "";
      const pago = p.status === "pago";
      const pixBloco = (!pago && p.pix) ? `
          <details class="pedido-pix">
            <summary>Ver código Pix para pagar</summary>
            <p class="pedido-pix-ajuda">Copie e pague no app do seu banco (Pix Copia e Cola):</p>
            <textarea class="pedido-pix-codigo" readonly rows="3">${p.pix}</textarea>
            <div class="pedido-pix-acoes">
              <button type="button" class="botao-loja botao-loja-secundario pedido-pix-copiar">Copiar código</button>
              ${p.pixUrl ? `<a class="botao-loja botao-loja-primario" href="${p.pixUrl}" target="_blank" rel="noopener">Abrir pagamento</a>` : ""}
            </div>
          </details>` : "";
      const pagoAviso = pago ? `<p class="pedido-contato-aviso">📦 Em breve entraremos em contato para combinar a entrega.</p>` : "";
      return `
        <article class="pedido-card">
          <div class="pedido-topo">
            <span class="pedido-codigo">${p.codigo || "—"}</span>
            <span class="pedido-status ${st.classe}">${st.texto}</span>
          </div>
          ${data ? `<p class="pedido-data">${data}</p>` : ""}
          <ul class="pedido-itens">${itens}</ul>
          <div class="pedido-rodape"><span>${p.entrega || ""}</span><strong>${fmt(p.total)}</strong></div>
          ${pixBloco}
          ${pagoAviso}
        </article>`;
    }).join("");
  }

  let cancelarOuvirPedidos = null;
  let reconciliacaoRodando = false;

  async function carregarPedidos() {
    const lista = document.getElementById("lista-pedidos");
    const vazio = document.getElementById("sem-pedidos");
    if (!lista) return;

    // Cancela listener anterior se houver
    if (cancelarOuvirPedidos) { cancelarOuvirPedidos(); cancelarOuvirPedidos = null; }

    if (vazio) { vazio.hidden = false; vazio.textContent = "Carregando seus pedidos…"; }

    // Snapshot em tempo real: atualiza a UI automaticamente quando o Firestore muda
    cancelarOuvirPedidos = await Auth.ouvirPedidos(pedidos => {
      renderPedidos(pedidos);
      // Roda reconciliação só uma vez por abertura de aba (evita múltiplas chamadas)
      if (!reconciliacaoRodando) {
        reconciliacaoRodando = true;
        reconciliarPendentes(pedidos).finally(() => { reconciliacaoRodando = false; });
      }
    });
  }

  // Verifica no Mercado Pago os pedidos pendentes; se algum foi pago,
  // atualiza o status e avisa o lojista por e-mail (uma única vez).
  async function reconciliarPendentes(pedidos) {
    let mudou = false;
    const key = String((CFG.pedidos && CFG.pedidos.web3formsKey) || "").trim();
    for (const p of pedidos) {
      if (!p) continue;
      let pago = p.status === "pago";
      // Ainda pendente: confirma no Mercado Pago.
      if (!pago && p.pagamentoId) {
        try {
          const r = await fetch("/api/status-pix?id=" + encodeURIComponent(p.pagamentoId));
          const d = await r.json();
          pago = !!(d && d.status === "approved");
        } catch (e) {}
        if (pago) {
          try { await Auth.atualizarStatusPedido(p.codigo, "pago"); } catch (e) {}
          try { await Auth.marcarVendidos((p.itens || []).map(i => i.id).filter(Boolean)); } catch (e) {}
          mudou = true;
        }
      }
      // Avisa o lojista por e-mail, uma única vez por pedido.
      if (pago && !p.emailEnviado && p.emailBody && key) {
        try {
          await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(Object.assign({ access_key: key }, p.emailBody))
          });
          await Auth.atualizarPedido(p.codigo, { emailEnviado: true });
          mudou = true;
        } catch (e) {}
      }
    }
    // Não precisa chamar carregarPedidos() aqui — o onSnapshot já detecta as mudanças automaticamente.
  }

  // Copiar o código Pix de um pedido (delegação no container da lista).
  (function () {
    const listaEl = document.getElementById("lista-pedidos");
    if (!listaEl) return;
    listaEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".pedido-pix-copiar");
      if (!btn) return;
      const det = btn.closest(".pedido-pix");
      const ta = det && det.querySelector(".pedido-pix-codigo");
      if (!ta) return;
      const ok = () => { const o = btn.textContent; btn.textContent = "Copiado!"; setTimeout(() => { btn.textContent = o; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(ok).catch(() => { ta.select(); document.execCommand("copy"); ok(); });
      } else { ta.select(); document.execCommand("copy"); ok(); }
    });
  })();

  /* ---------- Apagar conta ---------- */
  const zonaPerigo   = document.getElementById("zona-perigo");
  const modalApagar  = document.getElementById("modal-apagar");
  const btnApagarConta   = document.getElementById("btn-apagar-conta");
  const btnModalCancelar = document.getElementById("btn-modal-cancelar");
  const btnModalConfirmar = document.getElementById("btn-modal-confirmar");
  const modalErro    = document.getElementById("modal-apagar-erro");

  function abrirModal() { if (modalApagar) { modalApagar.hidden = false; if (modalErro) modalErro.hidden = true; } }
  function fecharModal() { if (modalApagar) modalApagar.hidden = true; }

  if (btnApagarConta)   btnApagarConta.addEventListener("click", abrirModal);
  if (btnModalCancelar) btnModalCancelar.addEventListener("click", fecharModal);
  if (modalApagar) modalApagar.addEventListener("click", e => { if (e.target === modalApagar) fecharModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") fecharModal(); });

  if (btnModalConfirmar) btnModalConfirmar.addEventListener("click", async () => {
    btnModalConfirmar.disabled = true;
    btnModalConfirmar.textContent = "Apagando…";
    if (modalErro) modalErro.hidden = true;
    try {
      await Auth.apagarConta();
      window.location.href = "index.html";
    } catch (e) {
      if (modalErro) { modalErro.hidden = false; modalErro.textContent = "Não foi possível apagar a conta agora. Tente novamente."; }
      btnModalConfirmar.disabled = false;
      btnModalConfirmar.textContent = "Sim, apagar tudo";
    }
  });

  /* ---------- Reage ao login/logout ---------- */
  Auth.onChange(async (user) => {
    if (!user && !Auth.pronto) { mostrar(elCarregando); return; }
    if (!user) {
      // Cancela o listener de pedidos ao deslogar
      if (cancelarOuvirPedidos) { cancelarOuvirPedidos(); cancelarOuvirPedidos = null; }
      mostrar(elDeslogado);
      return;
    }

    mostrar(elLogado);

    const fNome = document.getElementById("conta-nome");
    const fEmail = document.getElementById("conta-email");
    const fFoto = document.getElementById("conta-foto");
    if (fNome) fNome.textContent = user.nome || "Leitor(a)";
    if (fEmail) fEmail.textContent = user.email || "";
    if (fFoto) fFoto.innerHTML = user.foto ? `<img src="${user.foto}" alt="">` : "";

    set("p-nome", user.nome);
    set("p-email", user.email);
    let perfil = null;
    try { perfil = await Auth.perfil(); } catch (e) {}
    if (perfil) {
      if (perfil.nome) set("p-nome", perfil.nome);
      set("p-tel", perfil.telefone);
      set("p-instagram", perfil.instagram ? "@" + perfil.instagram : "");
      const en = perfil.endereco || {};
      set("p-cep", en.cep); set("p-rua", en.rua); set("p-numero", en.numero);
      set("p-compl", en.complemento); set("p-bairro", en.bairro);
      set("p-cidade", en.cidade); set("p-uf", en.uf);
    }
    atualizarDicaWhats();

    reconciliacaoRodando = false;
    if (perfilCompleto(perfil)) entrarModoDashboard();
    else entrarModoOnboarding();
  });
})();
