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
    async sair()            { await prontoPromise; return impl.sair(); },
    async perfil()          { await prontoPromise; return impl.perfil(); },
    async salvarPerfil(d)   { await prontoPromise; return impl.salvarPerfil(d); },
    async salvarPedido(p)   { await prontoPromise; return impl.salvarPedido(p); },
    async atualizarStatusPedido(c, s) { await prontoPromise; return impl.atualizarStatusPedido(c, s); },
    async listarPedidos()   { await prontoPromise; return impl.listarPedidos(); }
  };
  window.Auth = Auth;

  /* -------- Botão de conta na barra superior (se existir) -------- */
  function ligarBotaoConta() {
    const btn = document.getElementById("btn-conta");
    if (!btn) return;
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
  }
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
      listarPedidos: async () => []
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
        salvarPedido: async () => {}, atualizarStatusPedido: async () => {}, listarPedidos: async () => []
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
