/* ============================================================
   BOOKVERSE — PÁGINA "MINHA CONTA"
   ------------------------------------------------------------
   Mostra o login com Google, o perfil do cliente (que preenche
   o checkout depois) e o histórico de pedidos. Não precisa mexer.
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

  const anoEl = document.getElementById("ano-atual");
  if (anoEl) anoEl.textContent = new Date().getFullYear();

  function fmt(v) {
    const n = Number(v) || 0;
    return simbolo + " " + n.toFixed(2).replace(".", ",");
  }
  function mostrar(el) {
    [elCarregando, elDesconfig, elDeslogado, elLogado].forEach(x => { if (x) x.hidden = (x !== el); });
  }

  /* ---------- Contas desligadas ---------- */
  if (!Auth || !Auth.configurado) {
    mostrar(elDesconfig);
    return;
  }

  /* ---------- Login com Google ---------- */
  const btnGoogle = document.getElementById("btn-google");
  if (btnGoogle) {
    btnGoogle.addEventListener("click", async () => {
      if (elErro) elErro.hidden = true;
      btnGoogle.disabled = true;
      try {
        await Auth.entrarComGoogle();
      } catch (e) {
        console.error("[BookVerse] Erro no login Google:", e);
        if (elErro) {
          elErro.hidden = false;
          const code = (e && e.code) || "";
          let msg = "Não foi possível entrar com o Google. Tente novamente.";
          if (code === "auth/unauthorized-domain") {
            msg = "Este site ainda não está autorizado no Firebase. (Lojista: adicione este domínio em Authentication → Settings → Authorized domains.)";
          } else if (code === "auth/operation-not-allowed") {
            msg = "O login com Google não está ativado. (Lojista: ative o provedor Google em Authentication → Sign-in method.)";
          } else if (code === "auth/popup-blocked") {
            msg = "Seu navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.";
          } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
            msg = "A janela de login foi fechada antes de concluir. Tente novamente.";
          }
          elErro.textContent = code ? msg + " [" + code + "]" : msg;
        }
      } finally {
        btnGoogle.disabled = false;
      }
    });
  }

  const btnSair = document.getElementById("btn-sair");
  if (btnSair) btnSair.addEventListener("click", () => Auth.sair());

  /* ---------- Formulário de perfil ---------- */
  const formPerfil = document.getElementById("form-perfil");
  const perfilOk = document.getElementById("perfil-ok");
  function v(id) { const e = document.getElementById(id); return e ? e.value.trim() : ""; }
  function set(id, val) { const e = document.getElementById(id); if (e) e.value = val || ""; }

  /* Validação de WhatsApp (mesma regra do checkout). */
  function soDigitos(x) { return String(x || "").replace(/\D/g, ""); }
  function whatsappNacional(x) {
    let d = soDigitos(x);
    if ((d.length === 12 || d.length === 13) && d.indexOf("55") === 0) d = d.slice(2);
    return d;
  }
  function whatsappValido(x) { return /^[1-9][0-9]9\d{8}$/.test(whatsappNacional(x)); }
  function marcarWhatsErro(erro) {
    const tel = document.getElementById("p-tel");
    const dica = document.getElementById("p-dica-whats");
    if (tel) tel.classList.toggle("invalido", erro);
    if (dica) {
      dica.classList.toggle("erro", erro);
      dica.textContent = erro
        ? "Número de WhatsApp inválido. Use DDD + número, ex.: (83) 9 9999-8888."
        : "Com DDD — ex.: (83) 9 9999-8888.";
    }
  }
  const elTel = document.getElementById("p-tel");
  if (elTel) elTel.addEventListener("input", () => {
    if (elTel.classList.contains("invalido") && whatsappValido(elTel.value)) marcarWhatsErro(false);
  });

  if (formPerfil) {
    formPerfil.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      // WhatsApp: se preenchido, precisa ser um celular válido.
      const tel = v("p-tel");
      if (tel && !whatsappValido(tel)) {
        marcarWhatsErro(true);
        const el = document.getElementById("p-tel");
        if (el) el.focus();
        return;
      }
      marcarWhatsErro(false);
      const btn = formPerfil.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        await Auth.salvarPerfil({
          nome: v("p-nome"),
          telefone: v("p-tel"),
          instagram: v("p-instagram").replace(/^@+/, ""),
          endereco: {
            cep: v("p-cep"), rua: v("p-rua"), numero: v("p-numero"),
            complemento: v("p-compl"), bairro: v("p-bairro"),
            cidade: v("p-cidade"), uf: v("p-uf").toUpperCase()
          }
        });
        if (perfilOk) { perfilOk.hidden = false; setTimeout(() => { perfilOk.hidden = true; }, 2500); }
      } catch (e) {
        alert("Não foi possível salvar agora. Tente novamente.");
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  /* ---------- Histórico de pedidos ---------- */
  const STATUS = {
    pago:        { texto: "Pago",                  classe: "pedido-pago" },
    pendente:    { texto: "Aguardando pagamento",  classe: "pedido-pendente" },
    aguardando:  { texto: "Aguardando confirmação", classe: "pedido-pendente" }
  };

  async function carregarPedidos() {
    const lista = document.getElementById("lista-pedidos");
    const vazio = document.getElementById("sem-pedidos");
    if (!lista) return;
    lista.innerHTML = "";
    // Sempre mostramos algo: começa em "Carregando…".
    if (vazio) { vazio.hidden = false; vazio.textContent = "Carregando seus pedidos…"; }
    let pedidos = [];
    try { pedidos = await Auth.listarPedidos(); } catch (e) { pedidos = []; }

    if (!pedidos.length) {
      if (vazio) { vazio.hidden = false; vazio.textContent = "Você ainda não fez nenhum pedido por aqui."; }
      return;
    }
    if (vazio) vazio.hidden = true;

    lista.innerHTML = pedidos.map(p => {
      const st = STATUS[p.status] || { texto: p.status || "—", classe: "pedido-pendente" };
      const itens = (p.itens || [])
        .map(i => `<li>${i.qty}× ${i.titulo}</li>`).join("");
      const data = p.criadoEm && p.criadoEm.toDate
        ? p.criadoEm.toDate().toLocaleDateString("pt-BR")
        : "";
      return `
        <article class="pedido-card">
          <div class="pedido-topo">
            <span class="pedido-codigo">${p.codigo || "—"}</span>
            <span class="pedido-status ${st.classe}">${st.texto}</span>
          </div>
          ${data ? `<p class="pedido-data">${data}</p>` : ""}
          <ul class="pedido-itens">${itens}</ul>
          <div class="pedido-rodape">
            <span>${p.entrega || ""}</span>
            <strong>${fmt(p.total)}</strong>
          </div>
        </article>`;
    }).join("");
  }

  /* ---------- Reage ao login/logout ---------- */
  Auth.onChange(async (user) => {
    // Enquanto ainda não sabemos o estado, segue "Carregando…".
    if (!user && !Auth.pronto) { mostrar(elCarregando); return; }
    if (user) {
      mostrar(elLogado);
      const fNome = document.getElementById("conta-nome");
      const fEmail = document.getElementById("conta-email");
      const fFoto = document.getElementById("conta-foto");
      if (fNome) fNome.textContent = user.nome || "Leitor(a)";
      if (fEmail) fEmail.textContent = user.email || "";
      if (fFoto) fFoto.innerHTML = user.foto ? `<img src="${user.foto}" alt="">` : "";

      // Carrega os pedidos já (independente do perfil, que pode demorar).
      carregarPedidos();

      // Preenche o formulário: começa com os dados do Google e completa com o perfil salvo.
      set("p-nome", user.nome);
      set("p-email", user.email);
      try {
        const perfil = await Auth.perfil();
        if (perfil) {
          if (perfil.nome) set("p-nome", perfil.nome);
          set("p-tel", perfil.telefone);
          set("p-instagram", perfil.instagram ? "@" + perfil.instagram : "");
          const en = perfil.endereco || {};
          set("p-cep", en.cep); set("p-rua", en.rua); set("p-numero", en.numero);
          set("p-compl", en.complemento); set("p-bairro", en.bairro);
          set("p-cidade", en.cidade); set("p-uf", en.uf);
        }
      } catch (e) {}

      // Scroll automático para a seção de pedidos, se solicitado
      if (window.location.search.includes("sec=pedidos")) {
        setTimeout(() => {
          const secaoPedidos = document.getElementById("secao-pedidos");
          if (secaoPedidos) secaoPedidos.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } else {
      mostrar(elDeslogado);
    }
  });
})();
