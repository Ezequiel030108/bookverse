/* ============================================================
   BOOKVERSE — CONTAS (login com Google via Firebase)
   ------------------------------------------------------------
   Cuida do login com Google, do perfil do cliente e do histórico
   de pedidos (Firestore). É tudo OPCIONAL: enquanto o bloco
   "firebase" do js/config.js estiver vazio, o site funciona
   normalmente, só sem a parte de contas (o botão "Entrar" nem
   aparece).

   Você NÃO precisa mexer aqui. Para ligar as contas, preencha os
   dados do seu projeto Firebase em js/config.js (veja o README,
   seção "👤 Login com Google e histórico de pedidos").

   Expõe um objeto global window.Auth com:
     Auth.configurado            → true/false
     Auth.onChange(cb)           → avisa quando loga/desloga
     Auth.usuario()              → { uid, nome, email, foto } ou null
     Auth.entrarComGoogle()      → abre o login do Google
     Auth.sair()                 → desloga
     Auth.perfil()               → dados salvos do cliente
     Auth.salvarPerfil(dados)    → salva/atualiza o perfil
     Auth.salvarPedido(pedido)   → salva um pedido no histórico
     Auth.atualizarStatusPedido(codigo, status)
     Auth.listarPedidos()        → lista os pedidos do cliente
   ============================================================ */

(function () {
  const CFG = (window.LOJA_CONFIG && window.LOJA_CONFIG.firebase) || {};
  const configurado = !!(CFG.apiKey && CFG.projectId && CFG.appId);

  let resolverPronto;
  const prontoPromise = new Promise(r => { resolverPronto = r; });
  let impl = null;          // implementação real (preenchida após carregar o Firebase)
  let ouvintes = [];
  let usuarioAtual = null;

  function notificar() {
    ouvintes.forEach(cb => { try { cb(usuarioAtual); } catch (e) {} });
  }

  // Remove dados locais (carrinho etc.) ao sair da conta — em qualquer página.
  function limparDadosLocais() {
    try {
      Object.keys(localStorage).forEach(k => {
        if (k && k.toLowerCase().indexOf("bookverse") === 0) localStorage.removeItem(k);
      });
    } catch (e) {}
    try { document.dispatchEvent(new CustomEvent("bookverse:logout")); } catch (e) {}
  }

  const Auth = {
    configurado,
    pronto: false,        // true quando já sabemos se está logado ou não
    onChange(cb) {
      ouvintes.push(cb);
      try { cb(usuarioAtual); } catch (e) {}   // dispara já com o estado atual
      return () => { ouvintes = ouvintes.filter(f => f !== cb); };
    },
    usuario() { return usuarioAtual; },
    async entrarComGoogle() { await prontoPromise; return impl.entrarComGoogle(); },
    async sair()            { await prontoPromise; const r = await impl.sair(); limparDadosLocais(); return r; },
    async perfil()          { await prontoPromise; return impl.perfil(); },
    async salvarPerfil(d)   { await prontoPromise; return impl.salvarPerfil(d); },
    async salvarPedido(p)   { await prontoPromise; return impl.salvarPedido(p); },
    async atualizarStatusPedido(c, s) { await prontoPromise; return impl.atualizarStatusPedido(c, s); },
    async listarPedidos()   { await prontoPromise; return impl.listarPedidos(); },
    async salvarCarrinho(c) { await prontoPromise; return impl.salvarCarrinho(c); },
    async lerCarrinho()     { await prontoPromise; return impl.lerCarrinho(); }
  };
  window.Auth = Auth;

  /* -------- Botão de conta na barra superior (se existir) -------- */
  function ligarBotaoConta() {
    const btn = document.getElementById("btn-conta");
    const wrap = document.getElementById("conta-dropdown-wrap");
    const menu = document.getElementById("conta-menu");
    
    // Suporte para o botão antigo (caso ainda não tenha atualizado o HTML em alguma página)
    if (btn && !wrap) {
      if (!configurado) { btn.hidden = true; return; }
      btn.hidden = false;
      Auth.onChange(function (user) {
        const label = btn.querySelector(".conta-btn-label");
        const av = btn.querySelector(".conta-btn-avatar");
        if (user) {
          if (label) label.textContent = (user.nome || "Conta").split(" ")[0];
          if (av && user.foto) av.innerHTML = `<img src="${user.foto}" alt="">`;
        } else if (label) {
          label.textContent = "Entrar";
        }
      });
      return;
    }

    if (!btn || !wrap) return;
    if (!configurado) { wrap.hidden = true; return; }
    
    wrap.hidden = false;
    
    Auth.onChange(function (user) {
      const label = btn.querySelector("#conta-nome-label");
      const foto = btn.querySelector("#conta-foto");
      const iconePadrao = btn.querySelector("#conta-icone-padrao");
      
      if (user) {
        if (label) label.textContent = (user.nome || "Conta").split(" ")[0];
        if (foto && user.foto) {
          foto.src = user.foto;
          foto.hidden = false;
          if (iconePadrao) iconePadrao.hidden = true;
        }
        
        // Preencher dados do menu
        const menuFoto = document.getElementById("menu-conta-foto");
        const menuNome = document.getElementById("menu-conta-nome");
        const menuEmail = document.getElementById("menu-conta-email");
        if (menuFoto && user.foto) { menuFoto.src = user.foto; menuFoto.hidden = false; }
        if (menuNome) menuNome.textContent = user.nome || "Usuário";
        if (menuEmail) menuEmail.textContent = user.email || "";
      } else {
        if (label) label.textContent = "Entrar";
        if (foto) foto.hidden = true;
        if (iconePadrao) iconePadrao.hidden = false;
        if (menu) menu.hidden = true;
      }
    });

    // Lógica do dropdown
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      if (!Auth.usuario()) {
        // Se não está logado, tenta logar
        abrirOnboardingOuLogar();
        return;
      }
      e.stopPropagation();
      const expandido = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", !expandido);
      if (menu) menu.hidden = expandido;
    });

    // Fechar dropdown ao clicar fora
    document.addEventListener("click", function(e) {
      if (menu && !menu.hidden && !wrap.contains(e.target)) {
        menu.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      }
    });

    // Botão sair
    const btnSair = document.getElementById("btn-sair-conta");
    if (btnSair) {
      btnSair.addEventListener("click", async function() {
        if (menu) menu.hidden = true;
        btn.setAttribute("aria-expanded", "false");
        await Auth.sair();
        if (window.location.pathname.includes("conta.html") || window.location.pathname.includes("checkout.html")) {
          window.location.href = "index.html";
        } else {
          window.location.reload();
        }
      });
    }
  }

  /* -------- Fluxo de Onboarding (primeira vez) -------- */
  async function abrirOnboardingOuLogar() {
    try {
      if (!Auth.usuario()) {
        await Auth.entrarComGoogle();
      }
      if (!Auth.usuario()) return; // Cancelou o login

      // Verifica se o perfil está completo
      const perfil = await Auth.perfil();
      if (perfil && perfil.nome && perfil.whatsapp) {
        // Já tem os dados completos
        finalizarAcaoPendente();
        return;
      }

      // Mostrar modal de onboarding
      const modal = document.getElementById("modal-onboarding");
      if (!modal) {
        // Se não tiver modal na página atual, redireciona para a conta
        window.location.href = "conta.html";
        return;
      }

      // Ocultar aviso de conta (se estiver aberto)
      const modalAviso = document.getElementById("aviso-conta");
      if (modalAviso && !modalAviso.hidden) {
        modalAviso.hidden = true;
      }

      modal.hidden = false;
      const form = document.getElementById("form-onboarding");
      const btnSalvar = document.getElementById("btn-salvar-onboarding");
      const inNome = document.getElementById("onb-nome");
      const inZap = document.getElementById("onb-zap");
      const inInsta = document.getElementById("onb-insta");

      if (form) {
        // Pré-preencher nome se vier do Google
        if (inNome && !inNome.value && Auth.usuario().nome) {
          inNome.value = Auth.usuario().nome;
        }
        
        // Validação simples
        const validarForm = () => {
          btnSalvar.disabled = !form.checkValidity();
        };
        form.addEventListener("input", validarForm);
        validarForm();

        form.onsubmit = async (e) => {
          e.preventDefault();
          btnSalvar.disabled = true;
          btnSalvar.textContent = "Salvando...";

          await Auth.salvarPerfil({
            nome: inNome.value.trim(),
            whatsapp: inZap.value.trim(),
            instagram: inInsta ? inInsta.value.trim() : "",
            email: Auth.usuario().email
          });

          modal.hidden = true;
          finalizarAcaoPendente();
        };
      }
    } catch (err) {
      console.error(err);
    }
  }

  function finalizarAcaoPendente() {
    const pendente = sessionStorage.getItem("bookverse_pendingAction");
    if (pendente === "abrirCarrinho") {
      sessionStorage.removeItem("bookverse_pendingAction");
      try { document.getElementById("btn-carrinho").click(); } catch(e){}
    } else if (pendente === "irCheckout") {
      sessionStorage.removeItem("bookverse_pendingAction");
      window.location.href = "checkout.html";
    }
  }

  // Expor fluxo de login com onboarding no Auth para outros scripts usarem
  Auth.loginEOnboarding = abrirOnboardingOuLogar;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ligarBotaoConta);
  } else {
    ligarBotaoConta();
  }

  /* -------- Sem Firebase configurado: encerra por aqui -------- */
  if (!configurado) {
    impl = {
      entrarComGoogle: async () => { alert("Contas ainda não foram configuradas pela loja."); },
      sair: async () => {},
      perfil: async () => null,
      salvarPerfil: async () => {},
      salvarPedido: async () => {},
      atualizarStatusPedido: async () => {},
      listarPedidos: async () => [],
      salvarCarrinho: async () => {},
      lerCarrinho: async () => null
    };
    Auth.pronto = true;
    resolverPronto();
    return;
  }

  /* -------- Carrega o SDK do Firebase (compat) sob demanda -------- */
  const VER = "10.12.2";
  const BASE = `https://www.gstatic.com/firebasejs/${VER}/`;

  function carregarScript(src) {
    return new Promise((ok, err) => {
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = ok;
      s.onerror = () => err(new Error("Falha ao carregar " + src));
      document.head.appendChild(s);
    });
  }

  (async function init() {
    try {
      await carregarScript(BASE + "firebase-app-compat.js");
      await carregarScript(BASE + "firebase-auth-compat.js");
      await carregarScript(BASE + "firebase-firestore-compat.js");
    } catch (e) {
      console.warn("[BookVerse] Não foi possível carregar o Firebase:", e);
      impl = {
        entrarComGoogle: async () => { alert("Não foi possível conectar ao login agora. Tente novamente."); },
        sair: async () => {}, perfil: async () => null, salvarPerfil: async () => {},
        salvarPedido: async () => {}, atualizarStatusPedido: async () => {}, listarPedidos: async () => [],
        salvarCarrinho: async () => {}, lerCarrinho: async () => null
      };
      Auth.pronto = true;
      notificar();
      resolverPronto();
      return;
    }

    const fb = window.firebase;
    fb.initializeApp({
      apiKey: CFG.apiKey,
      authDomain: CFG.authDomain,
      projectId: CFG.projectId,
      appId: CFG.appId
    });
    const auth = fb.auth();
    const db = fb.firestore();
    const stamp = () => fb.firestore.FieldValue.serverTimestamp();

    function semUndefined(obj) {
      const limpo = {};
      Object.keys(obj || {}).forEach(k => { if (obj[k] !== undefined) limpo[k] = obj[k]; });
      return limpo;
    }

    impl = {
      entrarComGoogle: async function () {
        const provider = new fb.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await auth.signInWithPopup(provider);
      },
      sair: async function () { await auth.signOut(); },

      perfil: async function () {
        if (!usuarioAtual) return null;
        const doc = await db.collection("users").doc(usuarioAtual.uid).get();
        return doc.exists ? doc.data() : null;
      },
      salvarPerfil: async function (dados) {
        if (!usuarioAtual) return;
        const limpo = semUndefined(dados);
        limpo.email = limpo.email || usuarioAtual.email || "";
        limpo.atualizadoEm = stamp();
        await db.collection("users").doc(usuarioAtual.uid).set(limpo, { merge: true });
      },
      salvarPedido: async function (pedido) {
        if (!usuarioAtual || !pedido || !pedido.codigo) return;
        await db.collection("users").doc(usuarioAtual.uid)
          .collection("pedidos").doc(pedido.codigo)
          .set(Object.assign({}, semUndefined(pedido), { criadoEm: stamp() }), { merge: true });
      },
      atualizarStatusPedido: async function (codigo, status) {
        if (!usuarioAtual || !codigo) return;
        const extra = { status: status };
        if (status === "pago") extra.pagoEm = stamp();
        await db.collection("users").doc(usuarioAtual.uid)
          .collection("pedidos").doc(codigo).set(extra, { merge: true });
      },
      listarPedidos: async function () {
        if (!usuarioAtual) return [];
        const snap = await db.collection("users").doc(usuarioAtual.uid)
          .collection("pedidos").orderBy("criadoEm", "desc").limit(50).get();
        return snap.docs.map(d => d.data());
      },

      // Carrinho guardado na conta (campo "carrinho" do documento do usuário).
      salvarCarrinho: async function (itens) {
        if (!usuarioAtual) return;
        await db.collection("users").doc(usuarioAtual.uid)
          .set({ carrinho: Array.isArray(itens) ? itens : [] }, { merge: true });
      },
      lerCarrinho: async function () {
        if (!usuarioAtual) return null;
        const doc = await db.collection("users").doc(usuarioAtual.uid).get();
        const data = doc.exists ? doc.data() : null;
        return data && Array.isArray(data.carrinho) ? data.carrinho : null;
      }
    };

    auth.onAuthStateChanged(function (user) {
      usuarioAtual = user ? {
        uid: user.uid,
        nome: user.displayName || "",
        email: user.email || "",
        foto: user.photoURL || ""
      } : null;
      Auth.pronto = true;
      notificar();
    });

    resolverPronto();
  })();
})();
