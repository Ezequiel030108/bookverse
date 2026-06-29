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
    const abaDados   = tab === "dados" || (tab !== "pedidos" && tab !== "admin");
    const abaPedidos = tab === "pedidos";
    const abaAdmin   = tab === "admin";
    if (painelDados) painelDados.hidden = !abaDados;
    if (painelPedidos) painelPedidos.hidden = !abaPedidos;
    const painelAdmin = document.getElementById("painel-admin");
    if (painelAdmin) painelAdmin.hidden = !abaAdmin;
    document.querySelectorAll(".conta-menu-item").forEach(b =>
      b.classList.toggle("ativo", b.dataset.tab === tab));
    // Saiu da aba de pedidos: encerra o listener em tempo real (evita leak).
    if (!abaPedidos && cancelarOuvirPedidos) { cancelarOuvirPedidos(); cancelarOuvirPedidos = null; }
    if (abaPedidos) carregarPedidos();
    if (abaAdmin) carregarAdmin();
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
    const pa = document.getElementById("painel-admin"); if (pa) pa.hidden = true;
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

    // Aba de administração: só para e-mails autorizados.
    const adminBtn = document.querySelector(".conta-menu-admin");
    const admin = ehAdmin(Auth.usuario());
    if (adminBtn) adminBtn.hidden = !admin;
    adminCarregado = false;   // recarrega disponibilidade a cada abertura do painel

    let abaInicial = "dados";
    if (location.hash === "#pedidos") abaInicial = "pedidos";
    else if (location.hash === "#admin" && admin) abaInicial = "admin";
    abrirTab(abaInicial);
  }
  function entrarModoOk() {
    if (onbIntro) onbIntro.hidden = true;
    if (dashHeader) dashHeader.hidden = true;
    if (contaMenu) contaMenu.hidden = true;
    if (painelDados) painelDados.hidden = true;
    if (painelPedidos) painelPedidos.hidden = true;
    const paOk = document.getElementById("painel-admin"); if (paOk) paOk.hidden = true;
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

  /* ---------- Administração da loja ---------- */
  const adminEmails = ((CFG.admin && CFG.admin.emails) || [])
    .map(e => String(e || "").trim().toLowerCase()).filter(Boolean);
  function ehAdmin(user) {
    return !!(user && user.email && adminEmails.indexOf(String(user.email).toLowerCase()) >= 0);
  }

  const ESTADO_ADMIN = {
    vendido:    { texto: "Vendido",     classe: "admin-tag-vendido" },
    reservado:  { texto: "Reservado",   classe: "admin-tag-reservado" },
    disponivel: { texto: "Disponível",  classe: "admin-tag-disponivel" }
  };
  let dispMapaAdmin = {};
  let adminCarregado = false;
  let adminFiltro = "";
  let livrosCatalogo = [];                 // livros adicionados pelo admin (Firestore)
  let idsCatalogo = new Set();             // ids removíveis (vindos do catálogo)

  function estadoDoLivro(id) {
    const d = dispMapaAdmin[id];
    if (!d) return "disponivel";
    if (d.estado === "vendido") return "vendido";
    // reserva expira em 30 min
    if (d.estado === "reservado") {
      if (d.ate && Date.now() > Number(d.ate)) return "disponivel";
      return "reservado";
    }
    return "disponivel";
  }

  function listaLivrosAdmin() {
    const base = (typeof LIVROS !== "undefined" && Array.isArray(LIVROS)) ? LIVROS.slice() : [];
    const idDe = window.idLivro || (l => l.id);
    const vistos = new Set(base.map(idDe));
    livrosCatalogo.forEach(l => { if (l && l.id && !vistos.has(l.id)) { base.push(l); vistos.add(l.id); } });
    return base;
  }

  function renderAdmin() {
    const lista = document.getElementById("admin-lista");
    if (!lista) return;
    const idDe = window.idLivro || (l => l.id);
    const termo = adminFiltro.toLowerCase();
    const livros = listaLivrosAdmin().filter(l => {
      if (!termo) return true;
      return ((l.titulo || "") + " " + (l.autor || "")).toLowerCase().indexOf(termo) >= 0;
    });

    if (!livros.length) {
      lista.innerHTML = "";
      lista.appendChild(criarAvisoVazio("Nenhum livro encontrado."));
      return;
    }

    lista.innerHTML = "";
    livros.forEach(l => {
      const id = idDe(l);
      const est = estadoDoLivro(id);
      const tag = ESTADO_ADMIN[est] || ESTADO_ADMIN.disponivel;

      const card = document.createElement("article");
      card.className = "admin-item";

      const capa = document.createElement("div");
      capa.className = "admin-capa";
      if (l.imagem) {
        const img = document.createElement("img");
        img.src = l.imagem; img.alt = ""; img.loading = "lazy";
        capa.appendChild(img);
      } else {
        capa.textContent = (l.titulo || "?").charAt(0);
      }

      const info = document.createElement("div");
      info.className = "admin-info";
      const t = document.createElement("p"); t.className = "admin-titulo"; t.textContent = l.titulo || "—";
      const a = document.createElement("p"); a.className = "admin-autor"; a.textContent = l.autor || "";
      const badge = document.createElement("span");
      badge.className = "admin-tag " + tag.classe; badge.textContent = tag.texto;
      info.appendChild(t); info.appendChild(a); info.appendChild(badge);

      const acoes = document.createElement("div");
      acoes.className = "admin-acoes";
      if (est === "disponivel") {
        const bv = document.createElement("button");
        bv.type = "button"; bv.className = "admin-btn admin-btn-vender";
        bv.textContent = "Marcar vendido"; bv.dataset.acao = "vender"; bv.dataset.id = id;
        acoes.appendChild(bv);
      } else {
        const br = document.createElement("button");
        br.type = "button"; br.className = "admin-btn admin-btn-repor";
        br.textContent = "Repor na loja"; br.dataset.acao = "repor"; br.dataset.id = id;
        acoes.appendChild(br);
      }
      // Livros adicionados pelo admin podem ser removidos de vez.
      if (idsCatalogo.has(id)) {
        const bx = document.createElement("button");
        bx.type = "button"; bx.className = "admin-btn admin-btn-remover";
        bx.textContent = "Remover"; bx.dataset.acao = "remover"; bx.dataset.id = id;
        acoes.appendChild(bx);
      }

      card.appendChild(capa); card.appendChild(info); card.appendChild(acoes);
      lista.appendChild(card);
    });
  }

  function criarAvisoVazio(texto) {
    const p = document.createElement("p"); p.className = "conta-ajuda"; p.textContent = texto; return p;
  }

  function preencherGeneros() {
    const dl = document.getElementById("generos-sugeridos");
    if (!dl || dl.children.length) return;
    const base = (typeof LIVROS !== "undefined" && Array.isArray(LIVROS)) ? LIVROS : [];
    const generos = [];
    base.forEach(l => { const g = l.genero || ""; if (g && generos.indexOf(g) < 0) generos.push(g); });
    generos.forEach(g => { const o = document.createElement("option"); o.value = g; dl.appendChild(o); });
  }

  async function carregarAdmin() {
    const carregando = document.getElementById("admin-carregando");
    preencherGeneros();
    if (!adminCarregado) {
      if (carregando) { carregando.hidden = false; carregando.textContent = "Carregando catálogo…"; }
      try { dispMapaAdmin = await Auth.lerDisponibilidade(); } catch (e) { dispMapaAdmin = {}; }
      try { livrosCatalogo = await Auth.lerCatalogo(); } catch (e) { livrosCatalogo = []; }
      idsCatalogo = new Set((livrosCatalogo || []).map(l => l && l.id).filter(Boolean));
      adminCarregado = true;
    }
    if (carregando) carregando.hidden = true;
    renderAdmin();
  }

  // Busca no admin
  const adminBusca = document.getElementById("admin-busca");
  if (adminBusca) adminBusca.addEventListener("input", () => { adminFiltro = adminBusca.value.trim(); renderAdmin(); });

  // Ações de repor / marcar vendido (delegação)
  const adminListaEl = document.getElementById("admin-lista");
  if (adminListaEl) adminListaEl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".admin-btn");
    if (!btn) return;
    const id = btn.dataset.id;
    const acao = btn.dataset.acao;
    if (!id || !acao) return;
    if (acao === "remover") {
      if (!window.confirm("Remover este livro da loja permanentemente?")) return;
    }
    const original = btn.textContent;
    btn.disabled = true; btn.textContent = "Salvando…";
    try {
      if (acao === "vender") {
        await Auth.marcarVendidos([id]);
        dispMapaAdmin[id] = { estado: "vendido" };
      } else if (acao === "repor") {
        await Auth.liberarLivros([id]);
        delete dispMapaAdmin[id];
      } else if (acao === "remover") {
        await Auth.removerLivro(id);
        await Auth.liberarLivros([id]);          // limpa disponibilidade órfã
        livrosCatalogo = livrosCatalogo.filter(l => l.id !== id);
        idsCatalogo.delete(id);
        delete dispMapaAdmin[id];
      }
      renderAdmin();
    } catch (err) {
      btn.disabled = false; btn.textContent = original;
    }
  });

  /* ---------- Adicionar livro (formulário) ---------- */
  let fotoBase64 = "";   // capa comprimida em base64 (data URL)

  // Comprime a imagem escolhida no próprio navegador (máx ~520px, JPEG) para
  // caber bem no Firestore e carregar rápido na loja.
  function comprimirImagem(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("img"));
        img.onload = () => {
          const max = 520;
          let w = img.width, h = img.height;
          if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
          else if (h >= w && h > max) { w = Math.round(w * max / h); h = max; }
          const cv = document.createElement("canvas");
          cv.width = w; cv.height = h;
          cv.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(cv.toDataURL("image/jpeg", 0.72));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  const inpFoto = document.getElementById("livro-foto");
  const fotoPreview = document.getElementById("livro-foto-preview");
  if (inpFoto) inpFoto.addEventListener("change", async () => {
    const file = inpFoto.files && inpFoto.files[0];
    if (!file) return;
    try {
      fotoBase64 = await comprimirImagem(file);
      if (fotoPreview) { fotoPreview.innerHTML = ""; const im = document.createElement("img"); im.src = fotoBase64; im.alt = ""; fotoPreview.appendChild(im); }
    } catch (e) {
      fotoBase64 = "";
    }
  });

  // Gerar sinopse com IA
  const btnGerar = document.getElementById("btn-gerar-sinopse");
  const sinopseDica = document.getElementById("sinopse-dica");
  if (btnGerar) btnGerar.addEventListener("click", async () => {
    const titulo = v("livro-titulo");
    const autor = v("livro-autor");
    const genero = v("livro-genero");
    if (!titulo) { if (sinopseDica) { sinopseDica.hidden = false; sinopseDica.classList.add("erro"); sinopseDica.textContent = "Preencha o título primeiro."; } return; }
    const original = btnGerar.textContent;
    btnGerar.disabled = true; btnGerar.textContent = "Gerando…";
    if (sinopseDica) sinopseDica.hidden = true;
    try {
      const r = await fetch("/api/gerar-sinopse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: titulo, autor: autor, genero: genero })
      });
      const d = await r.json();
      if (!r.ok || !d.sinopse) throw new Error((d && d.error) || "falha");
      const ta = document.getElementById("livro-sinopse");
      if (ta) ta.value = d.sinopse;
      if (sinopseDica) { sinopseDica.hidden = false; sinopseDica.classList.remove("erro"); sinopseDica.textContent = "Sinopse gerada — você pode editá-la."; }
    } catch (e) {
      if (sinopseDica) { sinopseDica.hidden = false; sinopseDica.classList.add("erro"); sinopseDica.textContent = "Não foi possível gerar agora. Escreva à mão ou tente de novo."; }
    } finally {
      btnGerar.disabled = false; btnGerar.textContent = original;
    }
  });

  // Salvar o novo livro
  function slugLivro(t, a) {
    return String((t || "") + "-" + (a || ""))
      .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function precoBR(n) {
    const v = Number(n) || 0;
    return "R$ " + v.toFixed(2).replace(".", ",");
  }

  const formLivro = document.getElementById("form-livro");
  const livroErro = document.getElementById("livro-erro");
  const livroOk = document.getElementById("livro-ok");
  const btnSalvarLivro = document.getElementById("btn-salvar-livro");
  if (formLivro) formLivro.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const titulo = v("livro-titulo");
    const autor = v("livro-autor");
    const precoNum = parseFloat(String(v("livro-preco")).replace(",", "."));
    if (livroErro) livroErro.hidden = true;
    if (!titulo || !autor || !(precoNum > 0)) {
      if (livroErro) { livroErro.hidden = false; livroErro.textContent = "Preencha título, autor e um preço válido."; }
      return;
    }
    const id = slugLivro(titulo, autor) || ("livro-" + Date.now().toString(36));
    const estoque = Math.max(1, parseInt(v("livro-estoque"), 10) || 1);
    const livro = {
      id: id,
      titulo: titulo,
      autor: autor,
      genero: v("livro-genero") || "Outros",
      preco: precoBR(precoNum),
      estoque: estoque,
      estado: v("livro-estado") || "Estado perfeito",
      sinopse: v("livro-sinopse"),
      imagem: fotoBase64 || "",
      destaque: true,
      dataAdicao: new Date().toISOString().slice(0, 10)
    };
    if (btnSalvarLivro) { btnSalvarLivro.disabled = true; btnSalvarLivro.textContent = "Adicionando…"; }
    try {
      await Auth.adicionarLivro(livro);
      // Atualiza a lista local do admin
      livrosCatalogo = livrosCatalogo.filter(l => l.id !== id);
      livrosCatalogo.push(livro);
      idsCatalogo.add(id);
      renderAdmin();
      formLivro.reset();
      fotoBase64 = "";
      if (fotoPreview) fotoPreview.innerHTML = '<span class="admin-foto-vazio">Foto da capa</span>';
      if (livroOk) { livroOk.hidden = false; setTimeout(() => { livroOk.hidden = true; }, 3000); }
      const det = document.getElementById("admin-add");
      if (det) det.open = false;
    } catch (e) {
      if (livroErro) { livroErro.hidden = false; livroErro.textContent = "Não foi possível adicionar o livro agora. Tente novamente."; }
    } finally {
      if (btnSalvarLivro) { btnSalvarLivro.disabled = false; btnSalvarLivro.textContent = "Adicionar livro à loja"; }
    }
  });

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
    if (fFoto) {
      fFoto.innerHTML = "";
      const im = (window.AuthUtil && user.foto) ? window.AuthUtil.imagemSegura(user.foto) : null;
      if (im) fFoto.appendChild(im);
    }

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
