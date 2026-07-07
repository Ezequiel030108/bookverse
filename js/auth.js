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

  // Cria um <img> seguro a partir de uma URL de foto, sem injeção de HTML.
  // Só aceita http(s); qualquer outra coisa é ignorada.
  function imagemSegura(url) {
    const u = String(url || "");
    if (!/^https?:\/\//i.test(u)) return null;
    const img = document.createElement("img");
    img.src = u;
    img.alt = "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    return img;
  }
  window.AuthUtil = { imagemSegura };

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
    async atualizarPedido(c, campos) { await prontoPromise; return impl.atualizarPedido(c, campos); },
    async listarPedidos()   { await prontoPromise; return impl.listarPedidos(); },
    async ouvirPedidos(cb)  { await prontoPromise; return impl.ouvirPedidos(cb); },
    async salvarCarrinho(c) { await prontoPromise; return impl.salvarCarrinho(c); },
    async lerCarrinho()     { await prontoPromise; return impl.lerCarrinho(); },
    async cadastroCompleto(){ await prontoPromise; return impl.cadastroCompleto(); },
    async lerDisponibilidade() { await prontoPromise; return impl.lerDisponibilidade(); },
    async reservarLivros(ids)  { await prontoPromise; return impl.reservarLivros(ids); },
    async marcarVendidos(ids)  { await prontoPromise; return impl.marcarVendidos(ids); },
    async liberarLivros(ids)   { await prontoPromise; return impl.liberarLivros(ids); },
    async lerCatalogo()        { await prontoPromise; return impl.lerCatalogo(); },
    async adicionarLivro(l)    { await prontoPromise; return impl.adicionarLivro(l); },
    async removerLivro(id)     { await prontoPromise; return impl.removerLivro(id); },
    async apagarConta()        { await prontoPromise; const r = await impl.apagarConta(); limparDadosLocais(); return r; }
  };
  window.Auth = Auth;

  /* -------- Botão de conta na barra superior (vira um menu) -------- */
  function ligarBotaoConta() {
    const btn = document.getElementById("btn-conta");
    if (!btn) return;
    if (!configurado) { btn.hidden = true; return; }
    btn.hidden = false;

    // Cria o menu (dropdown) uma única vez.
    let pop = document.getElementById("conta-menu-pop");
    if (!pop) {
      pop = document.createElement("div");
      pop.id = "conta-menu-pop";
      pop.className = "conta-menu-pop";
      pop.hidden = true;
      pop.innerHTML =
        '<div class="cmp-head"><p class="cmp-nome"></p><p class="cmp-email"></p></div>' +
        '<a class="cmp-item" href="conta.html#dados"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg> Meus dados</a>' +
        '<a class="cmp-item" href="conta.html#pedidos"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"/><path d="M9 12h6M9 16h6"/></svg> Meus pedidos</a>' +
        '<a class="cmp-item cmp-admin" href="conta.html#admin" hidden><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/></svg> Administração</a>' +
        '<button type="button" class="cmp-item cmp-sair"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 17l5-5-5-5M21 12H9M9 21H4V3h5"/></svg> Sair</button>';
      document.body.appendChild(pop);
      pop.querySelector(".cmp-sair").addEventListener("click", async () => {
        fecharPop();
        await Auth.sair();
        window.location.href = "index.html";
      });
    }

    function posicionar() {
      const r = btn.getBoundingClientRect();
      pop.style.top = (r.bottom + 8) + "px";
      pop.style.right = Math.max(8, window.innerWidth - r.right) + "px";
    }
    function abrirPop() { posicionar(); pop.hidden = false; requestAnimationFrame(() => pop.classList.add("aberto")); }
    function fecharPop() { pop.classList.remove("aberto"); setTimeout(() => { pop.hidden = true; }, 180); }

    document.addEventListener("click", (e) => {
      if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) fecharPop();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharPop(); });
    window.addEventListener("resize", () => { if (!pop.hidden) posicionar(); });

    btn.addEventListener("click", (e) => {
      if (usuarioAtual) {
        e.preventDefault();                 // logado: abre o menu em vez de navegar
        pop.hidden ? abrirPop() : fecharPop();
      } else {
        // deslogado: vai para a página de conta (login), lembrando de onde veio
        try { sessionStorage.setItem("bookverse_retorno", window.location.href); } catch (err) {}
      }
    });

    const adminEmails = ((window.LOJA_CONFIG && window.LOJA_CONFIG.admin && window.LOJA_CONFIG.admin.emails) || [])
      .map(e => String(e || "").trim().toLowerCase()).filter(Boolean);

    Auth.onChange(function (user) {
      const label = btn.querySelector(".conta-btn-label");
      const av = btn.querySelector(".conta-btn-avatar");
      if (user) {
        if (label) label.textContent = (user.nome || "Conta").split(" ")[0];
        if (av && user.foto) { const im = imagemSegura(user.foto); if (im) { av.innerHTML = ""; av.appendChild(im); } }
        const n = pop.querySelector(".cmp-nome"), em = pop.querySelector(".cmp-email");
        if (n) n.textContent = user.nome || "Leitor(a)";
        if (em) em.textContent = user.email || "";
        const adminItem = pop.querySelector(".cmp-admin");
        if (adminItem) adminItem.hidden = !(user.email && adminEmails.indexOf(String(user.email).toLowerCase()) >= 0);
      } else {
        if (label) label.textContent = "Entrar";
        if (av) av.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>';
        const adminItem = pop.querySelector(".cmp-admin");
        if (adminItem) adminItem.hidden = true;
        fecharPop();
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
      atualizarPedido: async () => {},
      listarPedidos: async () => [],
      ouvirPedidos: async () => () => {},
      salvarCarrinho: async () => {},
      lerCarrinho: async () => null,
      cadastroCompleto: async () => false,
      lerDisponibilidade: async () => ({}),
      reservarLivros: async () => {},
      marcarVendidos: async () => {},
      liberarLivros: async () => {},
      lerCatalogo: async () => [],
      adicionarLivro: async () => {},
      removerLivro: async () => {},
      apagarConta: async () => {}
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
        salvarPedido: async () => {}, atualizarStatusPedido: async () => {}, atualizarPedido: async () => {}, listarPedidos: async () => [],
        ouvirPedidos: async () => () => {},
        salvarCarrinho: async () => {}, lerCarrinho: async () => null, cadastroCompleto: async () => false,
        lerDisponibilidade: async () => ({}), reservarLivros: async () => {}, marcarVendidos: async () => {},
        liberarLivros: async () => {}, lerCatalogo: async () => [], adicionarLivro: async () => {}, removerLivro: async () => {},
        apagarConta: async () => {}
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

    // ---- Resiliência: cache local do perfil + timeout nas operações ----
    // Se o Firestore estiver lento/indisponível, a interface não trava e os
    // dados do perfil não se perdem (ficam no cache local do navegador).
    function chaveCachePerfil() { return usuarioAtual ? "bookverse_perfil_" + usuarioAtual.uid : null; }
    function lerCachePerfil() {
      try { const k = chaveCachePerfil(); if (!k) return null; const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; }
      catch (e) { return null; }
    }
    function gravarCachePerfil(p) {
      try { const k = chaveCachePerfil(); if (k) localStorage.setItem(k, JSON.stringify(p || {})); } catch (e) {}
    }
    function comTimeout(promessa, ms) {
      return Promise.race([
        promessa,
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))
      ]);
    }

    impl = {
      entrarComGoogle: async function () {
        const provider = new fb.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        try {
          const cred = await auth.signInWithPopup(provider);
          const u = cred && cred.user;
          if (u) usuarioAtual = { uid: u.uid, nome: u.displayName || "", email: u.email || "", foto: u.photoURL || "" };
          return usuarioAtual;
        } catch (e) {
          // Domínio do site não autorizado no Firebase — é a causa nº 1 quando o
          // login "para de funcionar" depois de trocar o domínio da loja.
          if (e && e.code === "auth/unauthorized-domain") {
            console.error(
              '[BookVerse] Login bloqueado: o domínio "' + location.hostname +
              '" não está na lista de domínios autorizados do Firebase.\n' +
              'Abra o Firebase Console → Authentication → Settings → Authorized domains ' +
              'e adicione "' + location.hostname + '" (e a versão com www, se você usar).');
            throw e;
          }
          // Popup bloqueado ou sem suporte (navegador interno do Instagram e de
          // outros apps, bloqueadores de popup): tenta de novo por REDIRECIONAMENTO,
          // que funciona nesses ambientes. O resultado é tratado em getRedirectResult().
          if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-environment")) {
            await auth.signInWithRedirect(provider);
            return null;   // a página navega para o Google; ao voltar, o login conclui
          }
          throw e;
        }
      },
      sair: async function () { await auth.signOut(); },

      perfil: async function () {
        if (!usuarioAtual) return null;
        try {
          const doc = await comTimeout(db.collection("users").doc(usuarioAtual.uid).get(), 6000);
          if (doc && doc.exists) { gravarCachePerfil(doc.data()); return doc.data(); }
          return lerCachePerfil();
        } catch (e) { return lerCachePerfil(); }   // Firestore lento: usa o cache
      },
      salvarPerfil: async function (dados) {
        if (!usuarioAtual) return;
        const limpo = semUndefined(dados);
        limpo.email = limpo.email || usuarioAtual.email || "";
        // 1) cache local — instantâneo e à prova de falha do Firestore
        gravarCachePerfil(Object.assign({}, lerCachePerfil() || {}, limpo));
        // 2) Firestore — melhor esforço, sem travar a interface
        try {
          await comTimeout(
            db.collection("users").doc(usuarioAtual.uid)
              .set(Object.assign({}, limpo, { atualizadoEm: stamp() }), { merge: true }),
            8000);
        } catch (e) { /* permanece salvo no cache local */ }
      },
      salvarPedido: async function (pedido) {
        if (!usuarioAtual || !pedido || !pedido.codigo) return;
        try {
          await comTimeout(db.collection("users").doc(usuarioAtual.uid)
            .collection("pedidos").doc(pedido.codigo)
            .set(Object.assign({}, semUndefined(pedido), { criadoEm: stamp() }), { merge: true }), 8000);
        } catch (e) {}
      },
      atualizarStatusPedido: async function (codigo, status) {
        if (!usuarioAtual || !codigo) return;
        const extra = { status: status };
        if (status === "pago") extra.pagoEm = stamp();
        try {
          await comTimeout(db.collection("users").doc(usuarioAtual.uid)
            .collection("pedidos").doc(codigo).set(extra, { merge: true }), 8000);
        } catch (e) {}
      },
      atualizarPedido: async function (codigo, campos) {
        if (!usuarioAtual || !codigo) return;
        try {
          await comTimeout(db.collection("users").doc(usuarioAtual.uid)
            .collection("pedidos").doc(codigo).set(campos || {}, { merge: true }), 8000);
        } catch (e) {}
      },
      listarPedidos: async function () {
        if (!usuarioAtual) return [];
        try {
          const snap = await comTimeout(db.collection("users").doc(usuarioAtual.uid)
            .collection("pedidos").orderBy("criadoEm", "desc").limit(50).get(), 6000);
          return snap.docs.map(d => d.data());
        } catch (e) { return []; }
      },
      ouvirPedidos: function (cb) {
        if (!usuarioAtual) return () => {};
        try {
          const unsubscribe = db.collection("users").doc(usuarioAtual.uid)
            .collection("pedidos").orderBy("criadoEm", "desc").limit(50)
            .onSnapshot(snap => {
              const pedidos = snap.docs.map(d => d.data());
              try { cb(pedidos); } catch (e) {}
            }, () => {});
          return unsubscribe;
        } catch (e) { return () => {}; }
      },

      // Carrinho guardado na conta (campo "carrinho" do documento do usuário).
      salvarCarrinho: async function (itens) {
        if (!usuarioAtual) return;
        try {
          await comTimeout(db.collection("users").doc(usuarioAtual.uid)
            .set({ carrinho: Array.isArray(itens) ? itens : [] }, { merge: true }), 8000);
        } catch (e) {}
      },
      lerCarrinho: async function () {
        if (!usuarioAtual) return null;
        try {
          const doc = await comTimeout(db.collection("users").doc(usuarioAtual.uid).get(), 6000);
          const data = doc && doc.exists ? doc.data() : null;
          return data && Array.isArray(data.carrinho) ? data.carrinho : null;
        } catch (e) { return null; }
      },
      cadastroCompleto: async function () {
        if (!usuarioAtual) return false;
        let p = null;
        try {
          const doc = await comTimeout(db.collection("users").doc(usuarioAtual.uid).get(), 6000);
          if (doc && doc.exists) { p = doc.data(); gravarCachePerfil(p); }
        } catch (e) {}
        if (!p) p = lerCachePerfil();
        if (!p) return false;
        if (p.cadastroCompleto) return true;
        const tel = String(p.telefone || "").replace(/\D/g, "");
        return !!(p.nome && tel.length >= 10);
      },

      // Disponibilidade dos livros (reservados/vendidos) — leitura pública.
      lerDisponibilidade: async function () {
        try {
          const snap = await comTimeout(db.collection("disponibilidade").get(), 6000);
          const mapa = {};
          snap.forEach(doc => { mapa[doc.id] = doc.data(); });
          return mapa;
        } catch (e) { return {}; }
      },
      reservarLivros: async function (ids) {
        if (!usuarioAtual || !Array.isArray(ids)) return;
        const ate = Date.now() + 30 * 60 * 1000;   // reserva vale 30 min
        await Promise.all(ids.map(id => id
          ? comTimeout(db.collection("disponibilidade").doc(id)
              .set({ estado: "reservado", ate: ate, uid: usuarioAtual.uid }, { merge: true }), 8000).catch(() => {})
          : Promise.resolve()));
      },
      marcarVendidos: async function (ids) {
        if (!usuarioAtual || !Array.isArray(ids)) return;
        await Promise.all(ids.map(id => id
          ? comTimeout(db.collection("disponibilidade").doc(id)
              .set({ estado: "vendido", uid: usuarioAtual.uid }, { merge: true }), 8000).catch(() => {})
          : Promise.resolve()));
      },
      // Repõe o livro na loja: apaga o registro de disponibilidade.
      liberarLivros: async function (ids) {
        if (!usuarioAtual || !Array.isArray(ids)) return;
        await Promise.all(ids.map(id => id
          ? comTimeout(db.collection("disponibilidade").doc(id).delete(), 8000).catch(() => {})
          : Promise.resolve()));
      },

      // Livros cadastrados pelo admin (coleção "catalogo") — leitura pública.
      lerCatalogo: async function () {
        try {
          const snap = await comTimeout(db.collection("catalogo").get(), 8000);
          return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
        } catch (e) { return []; }
      },
      adicionarLivro: async function (livro) {
        if (!usuarioAtual || !livro || !livro.id) return;
        await comTimeout(db.collection("catalogo").doc(livro.id)
          .set(Object.assign({}, semUndefined(livro), { criadoEm: stamp() }), { merge: true }), 12000);
      },
      removerLivro: async function (id) {
        if (!usuarioAtual || !id) return;
        await comTimeout(db.collection("catalogo").doc(id).delete(), 8000).catch(() => {});
      },

      apagarConta: async function () {
        if (!usuarioAtual) return;
        const uid = usuarioAtual.uid;
        // Apaga todos os pedidos da subcoleção
        try {
          const snap = await comTimeout(db.collection("users").doc(uid).collection("pedidos").get(), 8000);
          const batch = db.batch();
          snap.docs.forEach(d => batch.delete(d.ref));
          if (snap.docs.length) await batch.commit();
        } catch (e) {}
        // Apaga o documento do usuário
        try {
          await comTimeout(db.collection("users").doc(uid).delete(), 8000);
        } catch (e) {}
        // Apaga a conta do Firebase Auth
        try {
          const fbUser = auth.currentUser;
          if (fbUser) await fbUser.delete();
        } catch (e) {
          // auth/requires-recent-login: faz reautenticação pelo Google e tenta de novo
          if (e && e.code === "auth/requires-recent-login") {
            const provider = new fb.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });
            await auth.signInWithPopup(provider);
            const fbUser2 = auth.currentUser;
            if (fbUser2) await fbUser2.delete();
          }
        }
        await auth.signOut();
      }
    };

    // Conclui o login iniciado por redirecionamento (o fallback do popup acima).
    // O usuário em si é aplicado pelo onAuthStateChanged logo abaixo; aqui só
    // deixamos claro no console se o domínio não estiver autorizado.
    auth.getRedirectResult().catch(function (e) {
      if (e && e.code === "auth/unauthorized-domain") {
        console.error(
          '[BookVerse] Login bloqueado: o domínio "' + location.hostname +
          '" não está na lista de domínios autorizados do Firebase ' +
          '(Authentication → Settings → Authorized domains).');
      }
    });

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
