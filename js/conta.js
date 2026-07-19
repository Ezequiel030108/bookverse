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
  const esc = window.esc || (t => String(t == null ? "" : t));

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
    catch (e) {
      if (elErro) {
        elErro.hidden = false;
        elErro.textContent = (e && e.code === "auth/unauthorized-domain")
          ? "Este endereço do site ainda não está liberado para login. Avise a loja para autorizar o domínio no Firebase."
          : "Não foi possível entrar com o Google. Tente novamente.";
      }
    }
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
    pDica.textContent = erro ? "Número inválido. Use DDD + número, ex.: (83) 9 9999-8888." : "Com DDD, ex.: (83) 9 9999-8888.";
  }
  if (pTel) pTel.addEventListener("input", () => { marcar("p-tel", false); atualizarDicaWhats(); });
  const pNome = document.getElementById("p-nome");
  if (pNome) pNome.addEventListener("input", () => marcar("p-nome", false));
  ["p-cep", "p-rua", "p-numero", "p-bairro", "p-cidade", "p-uf", "p-end-descricao"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => marcar(id, false));
  });

  /* ---------- Modo do endereço: campos normais ou descrição livre ---------- */
  function modoEndereco() {
    const r = document.querySelector('input[name="p-end-modo"]:checked');
    return (r && r.value) === "descricao" ? "descricao" : "campos";
  }
  function aplicarModoEndereco(modo) {
    const grupo = document.getElementById("p-endereco-modo");
    if (grupo) {
      grupo.querySelectorAll('input[name="p-end-modo"]').forEach(r => { r.checked = r.value === modo; });
      grupo.querySelectorAll(".entrega-opcao").forEach(l =>
        l.classList.toggle("selecionada", l.dataset.modo === modo));
    }
    const campos = document.getElementById("p-endereco-campos");
    const descricao = document.getElementById("p-endereco-descricao");
    if (campos)    campos.hidden = modo === "descricao";
    if (descricao) descricao.hidden = modo !== "descricao";
  }
  (function () {
    const grupo = document.getElementById("p-endereco-modo");
    if (!grupo) return;
    grupo.querySelectorAll('input[name="p-end-modo"]').forEach(r =>
      r.addEventListener("change", () => {
        aplicarModoEndereco(r.value);
        if (onbErro) onbErro.hidden = true;
      }));
  })();

  /* ---------- CEP: preenche o endereço sozinho (ViaCEP, gratuito) ---------- */
  const pCep = document.getElementById("p-cep");
  if (pCep) pCep.addEventListener("blur", async () => {
    const cep = soDigitos(pCep.value);
    if (cep.length !== 8) return;
    try {
      const r = await fetch("https://viacep.com.br/ws/" + cep + "/json/");
      const d = await r.json();
      if (d && !d.erro) {
        if (!v("p-rua") && d.logradouro)   set("p-rua", d.logradouro);
        if (!v("p-bairro") && d.bairro)     set("p-bairro", d.bairro);
        if (!v("p-cidade") && d.localidade) set("p-cidade", d.localidade);
        if (!v("p-uf") && d.uf)             set("p-uf", d.uf);
      }
    } catch (e) { /* sem internet ou fora do ar: preenche à mão */ }
  });

  /* ---------- Form do perfil ---------- */
  const formPerfil = document.getElementById("form-perfil");
  const perfilOk = document.getElementById("perfil-ok");

  function validarPerfil() {
    const nomeRuim = !v("p-nome");
    const telRuim = !whatsappValido(v("p-tel"));
    marcar("p-nome", nomeRuim);
    marcar("p-tel", telRuim);
    atualizarDicaWhats();

    /* Endereço: é opcional deixar TUDO em branco (dá para completar
       depois), mas se começou a preencher tem que estar completo —
       um endereço pela metade travaria a entrega a domicílio.
       No modo "descrever com minhas palavras" basta o texto. */
    let endRuim = false;
    if (modoEndereco() === "campos") {
      const camposEnd = ["p-cep", "p-rua", "p-numero", "p-bairro", "p-cidade", "p-uf"];
      const comecouEndereco = camposEnd.some(id => v(id)) || !!v("p-compl");
      endRuim = comecouEndereco && camposEnd.some(id => !v(id));
      camposEnd.forEach(id => marcar(id, comecouEndereco && !v(id)));
    }

    const ok = !nomeRuim && !telRuim && !endRuim;
    if (onbErro) {
      onbErro.hidden = ok;
      if (nomeRuim || telRuim) {
        onbErro.textContent = "Preencha os campos obrigatórios: nome e um WhatsApp válido (com DDD).";
      } else if (endRuim) {
        onbErro.textContent = "Endereço incompleto: preencha CEP, rua, número, bairro, cidade e UF, ou deixe todos os campos de endereço em branco para cadastrar depois.";
      }
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
          modo: modoEndereco(),
          cep: v("p-cep"), rua: v("p-rua"), numero: v("p-numero"),
          complemento: v("p-compl"), bairro: v("p-bairro"),
          cidade: v("p-cidade"), uf: v("p-uf").toUpperCase(),
          descricao: v("p-end-descricao")
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
    let retorno = "./";
    try {
      retorno = sessionStorage.getItem("bookverse_retorno") || "./";
      sessionStorage.removeItem("bookverse_retorno");
    } catch (e) {}
    window.location.href = retorno;
  });

  /* ---------- Menu (abas) ---------- */
  function abrirTab(tab) {
    const abaPedidos = tab === "pedidos";
    const abaLoja    = tab === "loja";
    const abaAdmin   = tab === "admin";
    const abaDados   = !abaPedidos && !abaLoja && !abaAdmin;
    if (painelDados) painelDados.hidden = !abaDados;
    if (painelPedidos) painelPedidos.hidden = !abaPedidos;
    const painelLoja = document.getElementById("painel-pedidos-loja");
    if (painelLoja) painelLoja.hidden = !abaLoja;
    const painelAdmin = document.getElementById("painel-admin");
    if (painelAdmin) painelAdmin.hidden = !abaAdmin;
    document.querySelectorAll(".conta-menu-item").forEach(b =>
      b.classList.toggle("ativo", b.dataset.tab === tab));
    // Traz a aba ativa para a área visível (o menu rola na horizontal).
    const abaAtiva = document.querySelector(".conta-menu-item.ativo");
    if (abaAtiva && abaAtiva.scrollIntoView) abaAtiva.scrollIntoView({ block: "nearest", inline: "center" });
    // Saiu da aba de pedidos: encerra o listener em tempo real (evita leak).
    if (!abaPedidos && cancelarOuvirPedidos) { cancelarOuvirPedidos(); cancelarOuvirPedidos = null; }
    if (abaPedidos) carregarPedidos();
    if (abaLoja) carregarPedidosLoja();
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
    const pl = document.getElementById("painel-pedidos-loja"); if (pl) pl.hidden = true;
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

    // Abas de administração: só para e-mails autorizados.
    const admin = ehAdmin(Auth.usuario());
    document.querySelectorAll(".conta-menu-admin").forEach(b => { b.hidden = !admin; });
    adminCarregado = false;   // recarrega disponibilidade a cada abertura do painel
    plojaCarregado = false;   // idem para os pedidos da loja

    let abaInicial = "dados";
    if (location.hash === "#pedidos") abaInicial = "pedidos";
    else if (location.hash === "#loja" && admin) abaInicial = "loja";
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
    const plOk = document.getElementById("painel-pedidos-loja"); if (plOk) plOk.hidden = true;
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
    pago:       { texto: "Pago · preparando",      classe: "pedido-pago" },
    aprovado:   { texto: "Aprovado · pague na entrega", classe: "pedido-pago" },
    pendente:   { texto: "Aguardando pagamento",   classe: "pedido-pendente" },
    aguardando: { texto: "Aguardando confirmação", classe: "pedido-pendente" },
    entregue:   { texto: "Entregue ✓",             classe: "pedido-entregue" },
    cancelado:  { texto: "Cancelado",              classe: "pedido-cancelado" }
  };

  /* Linha do tempo do pedido: Pedido feito → Pagamento → Entrega.
     A baixa de "entregue" é dada pelos admins em "Pedidos da loja". */
  function passosHTML(status) {
    if (status === "cancelado") return "";
    const nivel = status === "entregue" ? 3 : (status === "pago" || status === "aprovado" ? 2 : 1);
    // "aprovado" = pedido em dinheiro: aprovado na hora, paga-se na entrega.
    const rotuloPagamento = status === "aprovado"
      ? "Aprovado, pague na entrega"
      : (nivel >= 2 ? "Pagamento confirmado" : "Pagamento");
    const passos = [
      { rotulo: "Pedido feito", feito: true },
      { rotulo: rotuloPagamento, feito: nivel >= 2 },
      { rotulo: nivel >= 3 ? "Entregue" : "Entrega", feito: nivel >= 3 }
    ];
    return `<ol class="pedido-passos" aria-label="Andamento do pedido">` + passos.map((p, i) => `
      <li class="passo${p.feito ? " feito" : ""}${(i === nivel && nivel < 3) || (i === 1 && nivel === 1) ? " atual" : ""}">
        <span class="passo-bola" aria-hidden="true">${p.feito ? "✓" : ""}</span>
        <span class="passo-rotulo">${p.rotulo}</span>
      </li>`).join("") + `</ol>`;
  }

  function itensPedidoHTML(p) {
    return (p.itens || []).map(i =>
      `<li>${esc(i.qty)}× ${esc(i.titulo)}${i.condicao ? ` <span class="ci-condicao">${i.condicao === "novo" ? "Novo" : "Usado"}</span>` : ""}</li>`).join("");
  }

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
      const data = p.criadoEm && p.criadoEm.toDate ? p.criadoEm.toDate().toLocaleDateString("pt-BR") : "";
      const aPagar = p.status === "pendente" || p.status === "aguardando";
      const pixBloco = (aPagar && p.pix) ? `
          <details class="pedido-pix">
            <summary>Ver código Pix para pagar</summary>
            <p class="pedido-pix-ajuda">Copie e pague no app do seu banco (Pix Copia e Cola):</p>
            <textarea class="pedido-pix-codigo" readonly rows="3">${esc(p.pix)}</textarea>
            <div class="pedido-pix-acoes">
              <button type="button" class="botao-loja botao-loja-secundario pedido-pix-copiar">Copiar código</button>
              ${p.pixUrl && /^https:\/\//i.test(p.pixUrl) ? `<a class="botao-loja botao-loja-primario" href="${esc(p.pixUrl)}" target="_blank" rel="noopener">Abrir pagamento</a>` : ""}
            </div>
          </details>` : "";
      const aviso = p.status === "pago"
        ? `<p class="pedido-contato-aviso">Pagamento confirmado. Em breve entraremos em contato para combinar a entrega.</p>`
        : (p.status === "aprovado"
          ? `<p class="pedido-contato-aviso">Pedido aprovado: você paga em dinheiro em espécie na entrega. Em breve entraremos em contato.</p>`
          : (p.status === "entregue" ? `<p class="pedido-contato-aviso pedido-aviso-entregue">Pedido entregue. Boa leitura!</p>` : ""));
      return `
        <article class="pedido-card">
          <div class="pedido-topo">
            <span class="pedido-codigo">${esc(p.codigo || "—")}</span>
            <span class="pedido-status ${st.classe}">${esc(st.texto)}</span>
          </div>
          ${data ? `<p class="pedido-data">${esc(data)}</p>` : ""}
          ${passosHTML(p.status)}
          <ul class="pedido-itens">${itensPedidoHTML(p)}</ul>
          ${p.presente ? `<p class="pedido-presente">Embalado para presente${p.presenteMsg ? ` (cartão: “${esc(p.presenteMsg)}”)` : ""}</p>` : ""}
          <div class="pedido-rodape"><span>${esc(p.entrega || "")}</span><strong>${fmt(p.total)}</strong></div>
          ${pixBloco}
          ${aviso}
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
      // "aprovado" (dinheiro na entrega) conta como fechado para fins de
      // aviso por e-mail — se o envio falhou no checkout, reenvia aqui.
      let pago = p.status === "pago" || p.status === "aprovado";
      // Ainda pendente: confirma no Mercado Pago.
      if (!pago && p.pagamentoId) {
        try {
          const r = await fetch("/api/status-pix?id=" + encodeURIComponent(p.pagamentoId));
          const d = await r.json();
          pago = !!(d && d.status === "approved");
        } catch (e) {}
        if (pago) {
          try { await Auth.atualizarStatusPedido(p.codigo, "pago"); } catch (e) {}
          const itens = (p.itens || []).filter(i => i && i.id).map(i => ({ id: i.id, qty: i.qty || 1 }));
          // Dar baixa é ação de admin; para clientes a chamada falha em
          // silêncio e a RESERVA segura o livro até o admin dar baixa.
          try { await Auth.marcarVendidos(itens); } catch (e) {}
          try { await Auth.reservarLivros(itens); } catch (e) {}
          mudou = true;
        }
      }
      // Avisa o lojista por e-mail, uma única vez por pedido (trava
      // emailEnviado). Vale para TODOS os pedidos pagos, inclusive os do
      // Mercado Pago: o envio pelo servidor é barrado pelo desafio anti-bot
      // do Cloudflare que protege o Web3Forms, então quem envia é sempre o
      // navegador. É também a rede de recuperação quando o cliente fecha a
      // aba antes do Pix confirmar — ao reabrir "Minha conta", o aviso sai.
      if (pago && !p.emailEnviado && p.emailBody && key) {
        try {
          const rEmail = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(Object.assign({ access_key: key }, p.emailBody))
          });
          // Só marca como enviado se o Web3Forms ACEITOU ({success:true}).
          // Se recusou, o pedido continua sem a marca e tentamos de novo
          // na próxima abertura da página.
          let dEmail = null;
          try { dEmail = await rEmail.json(); } catch (e) {}
          if (rEmail.ok && dEmail && dEmail.success === true) {
            await Auth.atualizarPedido(p.codigo, { emailEnviado: true });
            mudou = true;
          }
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

  /* ================================================================
     PEDIDOS DA LOJA (admin): todos os pedidos de todos os clientes.
     - Confirmar pagamento (quando o Pix caiu e o status não atualizou)
     - Marcar como ENTREGUE (a "baixa" que o cliente vê na conta dele)
     - Cancelar pedido
     Ao marcar pago/entregue, o estoque dos itens também é baixado.
     ================================================================ */
  let plojaPedidos = [];
  let plojaCarregado = false;
  let plojaFiltro = "";
  let plojaFiltroStatus = "todos";   // todos | apagar | pago | entregue

  function plojaStatusGrupo(p) {
    // "aprovado" (dinheiro na entrega) entra no grupo dos aprovados/pagos:
    // o pedido já está fechado, falta só entregar (e receber o dinheiro).
    if (p.status === "pago" || p.status === "aprovado") return "pago";
    if (p.status === "entregue") return "entregue";
    if (p.status === "cancelado") return "cancelado";
    return "apagar";   // pendente / aguardando
  }

  function renderPedidosLoja() {
    const lista = document.getElementById("ploja-lista");
    if (!lista) return;
    const termo = plojaFiltro.toLowerCase();

    const pedidos = plojaPedidos.filter(p => {
      if (plojaFiltroStatus !== "todos" && plojaStatusGrupo(p) !== plojaFiltroStatus) return false;
      if (!termo) return true;
      const texto = [
        p.codigo, p.entrega, p.endereco,
        p.cliente && p.cliente.nome, p.cliente && p.cliente.email, p.cliente && p.cliente.telefone
      ].concat((p.itens || []).map(i => i.titulo)).join(" ").toLowerCase();
      return texto.indexOf(termo) >= 0;
    });

    if (!pedidos.length) {
      lista.innerHTML = `<p class="conta-ajuda">${plojaPedidos.length ? "Nenhum pedido com esse filtro." : "Nenhum pedido registrado ainda."}</p>`;
      return;
    }

    lista.innerHTML = pedidos.map(p => {
      const st = STATUS[p.status] || { texto: p.status || "—", classe: "pedido-pendente" };
      const dataObj = p.criadoEm && p.criadoEm.toDate ? p.criadoEm.toDate() : null;
      const data = dataObj ? dataObj.toLocaleDateString("pt-BR") + " " + dataObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
      const c = p.cliente || {};
      const grupo = plojaStatusGrupo(p);
      const whats = c.whatsappLink && /^https:\/\/wa\.me\//.test(c.whatsappLink)
        ? `<a class="ploja-whats" href="${esc(c.whatsappLink)}" target="_blank" rel="noopener">WhatsApp: ${esc(c.telefone || "")}</a>`
        : (c.telefone ? `WhatsApp: ${esc(c.telefone)}` : "");

      const acoes = [];
      if (grupo === "apagar") acoes.push(`<button type="button" class="botao-loja botao-loja-primario ploja-btn" data-acao="pago" data-caminho="${esc(p._caminho)}">Confirmar pagamento</button>`);
      if (grupo === "pago")   acoes.push(`<button type="button" class="botao-loja botao-loja-primario ploja-btn" data-acao="entregue" data-caminho="${esc(p._caminho)}">Marcar como entregue</button>`);
      if (grupo === "apagar" || grupo === "pago")
        acoes.push(`<button type="button" class="botao-loja botao-loja-secundario ploja-btn ploja-btn-cancelar" data-acao="cancelado" data-caminho="${esc(p._caminho)}">Cancelar pedido</button>`);
      if (grupo === "cancelado" || grupo === "entregue")
        acoes.push(`<button type="button" class="botao-loja botao-loja-secundario ploja-btn" data-acao="pago" data-caminho="${esc(p._caminho)}">Reabrir como pago</button>`);
      // Reenvio manual do e-mail do pedido (para pedidos pagos/aprovados
      // que têm o corpo salvo). O envio pelo servidor é barrado pelo
      // Cloudflare do Web3Forms, então quem manda é o navegador do admin.
      if ((grupo === "pago") && p.emailBody)
        acoes.push(`<button type="button" class="botao-loja botao-loja-secundario ploja-email-btn" data-caminho="${esc(p._caminho)}">${p.emailEnviado ? "Reenviar e-mail do pedido" : "Enviar e-mail do pedido"}</button>`);

      return `
        <article class="pedido-card ploja-card">
          <div class="pedido-topo">
            <span class="pedido-codigo">${esc(p.codigo || "—")}</span>
            <span class="pedido-status ${st.classe}">${esc(st.texto)}</span>
          </div>
          ${data ? `<p class="pedido-data">${esc(data)}</p>` : ""}
          <div class="ploja-cliente">
            <p class="ploja-cliente-nome">${esc(c.nome || "Cliente sem nome")}</p>
            <p class="ploja-cliente-contato">${whats}${c.instagram ? ` · ${esc(c.instagram)}` : ""}${c.email ? ` · ${esc(c.email)}` : ""}</p>
          </div>
          <ul class="pedido-itens">${itensPedidoHTML(p)}</ul>
          ${p.presente ? `<p class="pedido-presente"><strong>Embalar para presente</strong>${p.presenteMsg ? ` (cartão: “${esc(p.presenteMsg)}”)` : ""}</p>` : ""}
          ${p.observacoes ? `<p class="ploja-obs">Obs.: ${esc(p.observacoes)}</p>` : ""}
          <div class="pedido-rodape">
            <span>${esc(p.entrega || "")}${p.endereco ? " · " + esc(p.endereco) : ""}</span>
            <strong>${fmt(p.total)}</strong>
          </div>
          <div class="ploja-acoes">${acoes.join("")}</div>
        </article>`;
    }).join("");
  }

  /* Baixa de estoque dos itens de um pedido (com quantidade). */
  function baixarEstoquePedido(p) {
    const itens = (p.itens || []).filter(i => i && i.id).map(i => ({ id: i.id, qty: i.qty || 1 }));
    if (!itens.length) return Promise.resolve();
    return Auth.marcarVendidos(itens).catch(() => {});
  }

  async function carregarPedidosLoja() {
    const carregando = document.getElementById("ploja-carregando");
    const elErroLoja = document.getElementById("ploja-erro");
    if (elErroLoja) elErroLoja.hidden = true;
    if (plojaCarregado) { renderPedidosLoja(); return; }
    if (carregando) carregando.hidden = false;
    try {
      plojaPedidos = await Auth.listarPedidosLoja();
      plojaCarregado = true;

      // Pedidos pagos/aprovados que ainda não tiveram baixa de estoque: dá baixa agora.
      // (O cliente comum não tem permissão para marcar "vendido"; o admin tem.)
      for (const p of plojaPedidos) {
        if ((p.status === "pago" || p.status === "aprovado") && !p.estoqueBaixado && p._caminho) {
          await baixarEstoquePedido(p);
          Auth.atualizarPedidoLoja(p._caminho, { estoqueBaixado: true }).catch(() => {});
          p.estoqueBaixado = true;
        }
      }
      renderPedidosLoja();
    } catch (e) {
      if (elErroLoja) {
        elErroLoja.hidden = false;
        elErroLoja.textContent = "Não foi possível carregar os pedidos. Confira as regras do Firestore (seção do README) e tente de novo.";
      }
    } finally {
      if (carregando) carregando.hidden = true;
    }
  }

  // Busca e filtros do painel de pedidos da loja
  const plojaBusca = document.getElementById("ploja-busca");
  if (plojaBusca) plojaBusca.addEventListener("input", () => { plojaFiltro = plojaBusca.value.trim(); renderPedidosLoja(); });
  const plojaFiltros = document.getElementById("ploja-filtros");
  if (plojaFiltros) plojaFiltros.addEventListener("click", (e) => {
    const chip = e.target.closest(".admin-chip");
    if (!chip) return;
    plojaFiltroStatus = chip.dataset.filtro || "todos";
    plojaFiltros.querySelectorAll(".admin-chip").forEach(c => c.classList.toggle("ativo", c === chip));
    renderPedidosLoja();
  });

  // Ações (confirmar pagamento / entregar / cancelar) — delegação
  const plojaListaEl = document.getElementById("ploja-lista");
  if (plojaListaEl) plojaListaEl.addEventListener("click", async (e) => {
    // Reenviar o e-mail do pedido (pelo navegador do admin, que passa no
    // desafio anti-bot do Cloudflare que barra o servidor).
    const emailBtn = e.target.closest(".ploja-email-btn");
    if (emailBtn) {
      const caminhoEmail = emailBtn.dataset.caminho;
      const pedidoEmail = plojaPedidos.find(x => x._caminho === caminhoEmail);
      const keyEmail = String((CFG.pedidos && CFG.pedidos.web3formsKey) || "").trim();
      if (!pedidoEmail || !pedidoEmail.emailBody) return;
      if (!keyEmail) { window.alert("O envio por e-mail está desligado (sem chave do Web3Forms em js/config.js)."); return; }
      const origEmail = emailBtn.textContent;
      emailBtn.disabled = true; emailBtn.textContent = "Enviando…";
      try {
        const rEmail = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(Object.assign({ access_key: keyEmail }, pedidoEmail.emailBody))
        });
        let dEmail = null;
        try { dEmail = await rEmail.json(); } catch (err) {}
        if (rEmail.ok && dEmail && dEmail.success === true) {
          Auth.atualizarPedidoLoja(caminhoEmail, { emailEnviado: true }).catch(() => {});
          pedidoEmail.emailEnviado = true;
          emailBtn.textContent = "E-mail enviado ✓";
        } else {
          emailBtn.disabled = false; emailBtn.textContent = origEmail;
          window.alert("O Web3Forms recusou o envio. Confira a chave em js/config.js e o limite mensal do plano.");
        }
      } catch (err) {
        emailBtn.disabled = false; emailBtn.textContent = origEmail;
        window.alert("Não foi possível enviar agora. Verifique a conexão e tente novamente.");
      }
      return;
    }

    const btn = e.target.closest(".ploja-btn");
    if (!btn) return;
    const caminho = btn.dataset.caminho;
    const acao = btn.dataset.acao;
    if (!caminho || !acao) return;
    if (acao === "cancelado" && !window.confirm("Cancelar este pedido?")) return;

    const original = btn.textContent;
    btn.disabled = true; btn.textContent = "Salvando…";
    try {
      const campos = { status: acao };
      const pedido = plojaPedidos.find(x => x._caminho === caminho);
      if (acao === "entregue") campos.entregueEm = Date.now();
      await Auth.atualizarPedidoLoja(caminho, campos);
      // Pagou (ou entregou sem ter passado por "pago"): baixa o estoque.
      if ((acao === "pago" || acao === "entregue") && pedido && !pedido.estoqueBaixado) {
        await baixarEstoquePedido(pedido);
        Auth.atualizarPedidoLoja(caminho, { estoqueBaixado: true }).catch(() => {});
        pedido.estoqueBaixado = true;
      }
      if (pedido) pedido.status = acao;
      renderPedidosLoja();
    } catch (err) {
      btn.disabled = false; btn.textContent = original;
      window.alert("Não foi possível salvar agora. Tente novamente.");
    }
  });

  const ESTADO_ADMIN = {
    vendido:    { texto: "Vendido",     classe: "admin-tag-vendido" },
    reservado:  { texto: "Reservado",   classe: "admin-tag-reservado" },
    disponivel: { texto: "Disponível",  classe: "admin-tag-disponivel" }
  };
  let dispMapaAdmin = {};
  let adminCarregado = false;
  let adminFiltro = "";
  let adminFiltroStatus = "todos";         // todos | disponivel | vendido | meus
  let editandoId = "";                     // id do livro em edição (vazio = adicionando)
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

  // Conjunto de ids dos livros originais da loja (vindos de js/livros.js).
  function idsEstaticos() {
    const idDe = window.idLivro || (l => l.id);
    const estaticos = (typeof LIVROS !== "undefined" && Array.isArray(LIVROS)) ? LIVROS : [];
    return new Set(estaticos.map(idDe));
  }

  function listaLivrosAdmin() {
    const idDe = window.idLivro || (l => l.id);
    const estaticos = (typeof LIVROS !== "undefined" && Array.isArray(LIVROS)) ? LIVROS : [];
    const override = {};
    livrosCatalogo.forEach(c => { if (c && c.id) override[c.id] = c; });
    const ids = new Set(estaticos.map(idDe));
    // Livros originais da loja, com as edições aplicadas por cima (quando houver).
    const base = estaticos.map(s => {
      const ov = override[idDe(s)];
      return ov ? Object.assign({}, s, ov) : s;
    });
    // Livros novos criados pelo admin (sem correspondente original).
    livrosCatalogo.forEach(c => { if (c && c.id && !ids.has(c.id)) base.push(c); });
    return base;
  }

  // Resumo no topo: total / disponíveis / vendidos / adicionados pelo admin.
  function atualizarResumo() {
    const box = document.getElementById("admin-resumo");
    if (!box) return;
    const idDe = window.idLivro || (l => l.id);
    const todos = listaLivrosAdmin();
    let disp = 0, vend = 0;
    todos.forEach(l => {
      const est = estadoDoLivro(idDe(l));
      if (est === "vendido") vend++;
      else if (est === "disponivel") disp++;
    });
    const meus = idsCatalogo.size;
    box.hidden = false;
    box.innerHTML =
      '<div class="admin-resumo-item"><strong>' + todos.length + '</strong><span>no total</span></div>' +
      '<div class="admin-resumo-item"><strong>' + disp + '</strong><span>disponíveis</span></div>' +
      '<div class="admin-resumo-item"><strong>' + vend + '</strong><span>vendidos</span></div>' +
      '<div class="admin-resumo-item"><strong>' + meus + '</strong><span>modificados</span></div>';
  }

  function renderAdmin() {
    atualizarResumo();
    const lista = document.getElementById("admin-lista");
    if (!lista) return;
    const idDe = window.idLivro || (l => l.id);
    const termo = adminFiltro.toLowerCase();
    const livros = listaLivrosAdmin().filter(l => {
      const id = idDe(l);
      if (termo && ((l.titulo || "") + " " + (l.autor || "")).toLowerCase().indexOf(termo) < 0) return false;
      if (adminFiltroStatus === "meus") return idsCatalogo.has(id);
      if (adminFiltroStatus === "disponivel") return estadoDoLivro(id) === "disponivel";
      if (adminFiltroStatus === "vendido") return estadoDoLivro(id) === "vendido";
      return true;
    });

    if (!livros.length) {
      lista.innerHTML = "";
      lista.appendChild(criarAvisoVazio(adminFiltro || adminFiltroStatus !== "todos"
        ? "Nenhum livro encontrado com esse filtro."
        : "Nenhum livro no catálogo ainda."));
      return;
    }

    const estaticos = idsEstaticos();
    lista.innerHTML = "";
    livros.forEach(l => {
      const id = idDe(l);
      const est = estadoDoLivro(id);
      const tag = ESTADO_ADMIN[est] || ESTADO_ADMIN.disponivel;
      const noCatalogo = idsCatalogo.has(id);   // tem documento salvo (novo ou editado)
      const ehEstatico = estaticos.has(id);     // existe no catálogo original da loja
      const novoMeu = noCatalogo && !ehEstatico; // criado pelo admin do zero
      const editado = noCatalogo && ehEstatico;  // livro da loja com edição salva

      const card = document.createElement("article");
      card.className = "admin-item";
      if (id === editandoId) card.classList.add("admin-item-editando");

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
      const metaTxt = [l.genero, l.preco, l.condicao === "novo" ? "Novo" : (l.condicao === "usado" ? "Usado" : "")]
        .filter(Boolean).join("  ·  ");
      const meta = document.createElement("p"); meta.className = "admin-meta"; meta.textContent = metaTxt;

      const tags = document.createElement("div");
      tags.className = "admin-tags";
      const badge = document.createElement("span");
      badge.className = "admin-tag " + tag.classe; badge.textContent = tag.texto;
      tags.appendChild(badge);
      if (novoMeu || editado) {
        const seu = document.createElement("span");
        seu.className = "admin-tag admin-tag-meu";
        seu.textContent = novoMeu ? "Seu livro" : "Editado";
        tags.appendChild(seu);
      }
      info.appendChild(t); info.appendChild(a);
      if (metaTxt) info.appendChild(meta);
      info.appendChild(tags);

      const acoes = document.createElement("div");
      acoes.className = "admin-acoes";

      function botao(acao, texto, classe) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "admin-btn " + classe;
        b.textContent = texto; b.dataset.acao = acao; b.dataset.id = id;
        return b;
      }

      if (est === "disponivel") acoes.appendChild(botao("vender", "Marcar vendido", "admin-btn-vender"));
      else acoes.appendChild(botao("repor", "Repor na loja", "admin-btn-repor"));

      // Qualquer livro pode ser editado.
      acoes.appendChild(botao("editar", "Editar", "admin-btn-editar"));
      // Story do livro no Instagram (abre a prévia; publica na conta conectada).
      if (window.StoryIG) acoes.appendChild(botao("story", "Story", "admin-btn-story"));
      // Livro criado pelo admin: pode ser removido de vez.
      // Livro da loja editado: pode ter a edição revertida (volta ao original).
      if (novoMeu) acoes.appendChild(botao("remover", "Remover", "admin-btn-remover"));
      else if (editado) acoes.appendChild(botao("reverter", "Reverter edição", "admin-btn-remover"));

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
    categoriasExistentes().forEach(g => { const o = document.createElement("option"); o.value = g; dl.appendChild(o); });
  }

  // Lista única de categorias (gêneros) atualmente usadas na loja: livros
  // originais (js/livros.js) + livros/edições do admin (Firestore).
  function categoriasExistentes() {
    const fonte = (typeof listaLivrosAdmin === "function" && livrosCatalogo.length)
      ? listaLivrosAdmin()
      : ((typeof LIVROS !== "undefined" && Array.isArray(LIVROS)) ? LIVROS : []);
    const out = [];
    fonte.forEach(l => { const g = (l.genero || "").trim(); if (g && out.indexOf(g) < 0) out.push(g); });
    return out;
  }

  async function carregarAdmin() {
    const carregando = document.getElementById("admin-carregando");
    preencherGeneros();
    carregarInsta();   // estado da conexão com o Instagram (uma vez)
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

  /* ================================================================
     INSTAGRAM (admin): conexão da conta usada nos stories dos livros.
     O token é validado e guardado no servidor (/api/instagram) — o
     painel só mostra o estado e envia/apaga o token.
     ================================================================ */
  let instaCarregado = false;

  async function apiInstagram(metodo, corpo) {
    const token = await Auth.idToken().catch(() => null);
    const r = await fetch("/api/instagram", {
      method: metodo,
      headers: Object.assign(
        corpo ? { "Content-Type": "application/json" } : {},
        token ? { "Authorization": "Bearer " + token } : {}),
      body: corpo ? JSON.stringify(corpo) : undefined
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d && d.error) || "falha");
    return d;
  }

  function mostrarEstadoInsta(conectado, username) {
    const st = document.getElementById("insta-status");
    const form = document.getElementById("insta-form");
    const btnDesc = document.getElementById("btn-insta-desconectar");
    if (st) {
      st.classList.toggle("insta-ok", !!conectado);
      st.textContent = conectado
        ? "Conectado como @" + (username || "?") + ". O acesso se renova sozinho a cada story publicado."
        : "Ainda não conectado.";
    }
    if (form) form.hidden = !!conectado;
    if (btnDesc) btnDesc.hidden = !conectado;
  }

  async function carregarInsta() {
    if (instaCarregado || !document.getElementById("admin-insta")) return;
    instaCarregado = true;
    try {
      const d = await apiInstagram("GET");
      mostrarEstadoInsta(!!d.conectado, d.username);
    } catch (e) {
      const st = document.getElementById("insta-status");
      if (st) st.textContent = "Não foi possível verificar a conexão agora. Recarregue a página para tentar de novo.";
      instaCarregado = false;   // deixa tentar de novo na próxima abertura
    }
  }

  const btnInstaConectar = document.getElementById("btn-insta-conectar");
  if (btnInstaConectar) btnInstaConectar.addEventListener("click", async () => {
    const inp = document.getElementById("insta-token");
    const erroEl = document.getElementById("insta-erro");
    const tokenIG = inp ? inp.value.trim() : "";
    if (erroEl) erroEl.hidden = true;
    if (!tokenIG) {
      if (erroEl) { erroEl.hidden = false; erroEl.textContent = "Cole o token de acesso primeiro."; }
      return;
    }
    btnInstaConectar.disabled = true; btnInstaConectar.textContent = "Conectando…";
    try {
      const d = await apiInstagram("POST", { token: tokenIG });
      if (inp) inp.value = "";
      mostrarEstadoInsta(true, d.username);
    } catch (e) {
      if (erroEl) { erroEl.hidden = false; erroEl.textContent = (e && e.message) || "Não foi possível conectar agora. Tente novamente."; }
    } finally {
      btnInstaConectar.disabled = false; btnInstaConectar.textContent = "Conectar Instagram";
    }
  });

  const btnInstaDesconectar = document.getElementById("btn-insta-desconectar");
  if (btnInstaDesconectar) btnInstaDesconectar.addEventListener("click", async () => {
    if (!window.confirm("Desconectar o Instagram? Os stories deixam de funcionar até conectar de novo.")) return;
    const erroEl = document.getElementById("insta-erro");
    if (erroEl) erroEl.hidden = true;
    btnInstaDesconectar.disabled = true;
    try {
      await apiInstagram("DELETE");
      mostrarEstadoInsta(false, "");
    } catch (e) {
      if (erroEl) { erroEl.hidden = false; erroEl.textContent = "Não foi possível desconectar agora. Tente novamente."; }
    } finally {
      btnInstaDesconectar.disabled = false;
    }
  });

  // Busca no admin
  const adminBusca = document.getElementById("admin-busca");
  if (adminBusca) adminBusca.addEventListener("input", () => { adminFiltro = adminBusca.value.trim(); renderAdmin(); });

  // Filtros por estado (Todos / Disponíveis / Vendidos / Modificados)
  const adminFiltros = document.getElementById("admin-filtros");
  if (adminFiltros) adminFiltros.addEventListener("click", (e) => {
    const chip = e.target.closest(".admin-chip");
    if (!chip) return;
    adminFiltroStatus = chip.dataset.filtro || "todos";
    adminFiltros.querySelectorAll(".admin-chip").forEach(c => c.classList.toggle("ativo", c === chip));
    renderAdmin();
  });

  // Ações de editar / repor / marcar vendido / remover (delegação)
  const adminListaEl = document.getElementById("admin-lista");
  if (adminListaEl) adminListaEl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".admin-btn");
    if (!btn) return;
    const id = btn.dataset.id;
    const acao = btn.dataset.acao;
    if (!id || !acao) return;
    // Editar abre o formulário preenchido — não é uma ação "salvando" inline.
    if (acao === "editar") { entrarModoEdicao(id); return; }
    // Story: abre a prévia da arte (capa + nome + preço) para publicar.
    if (acao === "story") {
      const idDe = window.idLivro || (l => l.id);
      const livro = listaLivrosAdmin().find(x => idDe(x) === id);
      if (livro && window.StoryIG) window.StoryIG.abrir(livro);
      return;
    }
    if (acao === "remover") {
      if (!window.confirm("Remover este livro da loja permanentemente?")) return;
    } else if (acao === "reverter") {
      if (!window.confirm("Desfazer suas alterações e voltar o livro ao original da loja?")) return;
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
      } else if (acao === "reverter") {
        // Apaga só o documento de edição: o livro original (js/livros.js) continua.
        await Auth.removerLivro(id);
        livrosCatalogo = livrosCatalogo.filter(l => l.id !== id);
        idsCatalogo.delete(id);
        if (id === editandoId) sairModoEdicao();
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
      const token = await Auth.idToken().catch(() => null);
      const r = await fetch("/api/gerar-sinopse", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" },
          token ? { "Authorization": "Bearer " + token } : {}),
        body: JSON.stringify({ titulo: titulo, autor: autor, genero: genero })
      });
      const d = await r.json();
      if (!r.ok || !d.sinopse) throw new Error((d && d.error) || "falha");
      const ta = document.getElementById("livro-sinopse");
      if (ta) ta.value = d.sinopse;
      if (sinopseDica) { sinopseDica.hidden = false; sinopseDica.classList.remove("erro"); sinopseDica.textContent = "Sinopse gerada. Você pode editá-la."; }
    } catch (e) {
      if (sinopseDica) { sinopseDica.hidden = false; sinopseDica.classList.add("erro"); sinopseDica.textContent = "Não foi possível gerar agora. Escreva à mão ou tente de novo."; }
    } finally {
      btnGerar.disabled = false; btnGerar.textContent = original;
    }
  });

  // Classificar o livro na categoria certa com IA
  const btnClassificar = document.getElementById("btn-classificar-genero");
  const generoDica = document.getElementById("genero-dica");
  const btnUsarGeneroNovo = document.getElementById("btn-usar-genero-novo");
  let categoriaNovaSugerida = "";

  function mostrarGeneroDica(texto, tipo) {
    if (!generoDica) return;
    generoDica.hidden = false;
    generoDica.classList.toggle("erro", tipo === "erro");
    generoDica.classList.toggle("ok", tipo === "ok");
    generoDica.textContent = texto;
  }

  function limparGeneroDica() {
    categoriaNovaSugerida = "";
    if (generoDica) { generoDica.hidden = true; generoDica.classList.remove("erro", "ok"); generoDica.textContent = ""; }
    if (btnUsarGeneroNovo) btnUsarGeneroNovo.hidden = true;
  }

  // Aplica a categoria nova sugerida (o admin confirma a criação da seção).
  if (btnUsarGeneroNovo) btnUsarGeneroNovo.addEventListener("click", () => {
    if (!categoriaNovaSugerida) return;
    set("livro-genero", categoriaNovaSugerida);
    btnUsarGeneroNovo.hidden = true;
    mostrarGeneroDica("Nova categoria “" + categoriaNovaSugerida + "” aplicada. Vira uma nova seção na loja ao salvar.", "ok");
  });

  if (btnClassificar) btnClassificar.addEventListener("click", async () => {
    const titulo = v("livro-titulo");
    const autor = v("livro-autor");
    const sinopse = v("livro-sinopse");
    if (!titulo) { mostrarGeneroDica("Preencha o título primeiro.", "erro"); if (btnUsarGeneroNovo) btnUsarGeneroNovo.hidden = true; return; }
    const categorias = categoriasExistentes();
    if (!categorias.length) { mostrarGeneroDica("Catálogo ainda carregando. Tente de novo em instantes.", "erro"); return; }
    categoriaNovaSugerida = "";
    if (btnUsarGeneroNovo) btnUsarGeneroNovo.hidden = true;
    const original = btnClassificar.textContent;
    btnClassificar.disabled = true; btnClassificar.textContent = "Classificando…";
    mostrarGeneroDica("Analisando o livro…", "");
    try {
      const token = await Auth.idToken().catch(() => null);
      const r = await fetch("/api/classificar-livro", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" },
          token ? { "Authorization": "Bearer " + token } : {}),
        body: JSON.stringify({ titulo: titulo, autor: autor, sinopse: sinopse, categorias: categorias })
      });
      const d = await r.json();
      if (!r.ok || !d.categoria) throw new Error((d && d.error) || "falha");
      const just = d.justificativa ? " " + d.justificativa : "";
      if (d.nova) {
        // Não se encaixou em nenhuma categoria: sugere criar uma nova.
        categoriaNovaSugerida = d.categoria;
        mostrarGeneroDica("Não encontrei uma categoria ideal entre as atuais. Sugestão: criar uma nova." + just, "");
        if (btnUsarGeneroNovo) { btnUsarGeneroNovo.hidden = false; btnUsarGeneroNovo.textContent = "Criar categoria “" + d.categoria + "”"; }
      } else {
        // Encaixou numa categoria existente: já preenche o campo.
        set("livro-genero", d.categoria);
        mostrarGeneroDica("Classificado em “" + d.categoria + "”." + just, "ok");
      }
    } catch (e) {
      mostrarGeneroDica("Não foi possível classificar agora. Escolha o gênero à mão ou tente de novo.", "erro");
    } finally {
      btnClassificar.disabled = false; btnClassificar.textContent = original;
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
  // "R$ 20,00" / "1.234,56" / "20" -> número
  function precoParaNumero(str) {
    let s = String(str || "").replace(/[^\d,.]/g, "");
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  /* ---------- Edição de um livro já adicionado ---------- */
  function preencherFormLivro(l) {
    set("livro-titulo", l.titulo);
    set("livro-autor", l.autor);
    set("livro-genero", l.genero);
    set("livro-condicao", l.condicao === "novo" ? "novo" : "usado");
    const pn = precoParaNumero(l.preco);
    set("livro-preco", pn ? String(pn) : "");
    set("livro-estoque", l.estoque != null ? String(l.estoque) : "1");
    set("livro-estado", l.estado);
    set("livro-sinopse", l.sinopse);
    fotoBase64 = l.imagem || "";
    if (fotoPreview) {
      if (fotoBase64) {
        fotoPreview.innerHTML = "";
        const im = document.createElement("img"); im.src = fotoBase64; im.alt = ""; fotoPreview.appendChild(im);
      } else {
        fotoPreview.innerHTML = '<span class="admin-foto-vazio">Foto da capa</span>';
      }
    }
  }


  function entrarModoEdicao(id) {
    const idDe = window.idLivro || (l => l.id);
    // Procura entre todos os livros (originais da loja + adicionados/editados).
    const l = listaLivrosAdmin().find(x => idDe(x) === id);
    if (!l) return;
    editandoId = id;
    preencherFormLivro(l);
    set("livro-edit-id", id);
    limparGeneroDica();
    if (livroErro) livroErro.hidden = true;
    if (livroOk) livroOk.hidden = true;
    const titEl = document.getElementById("admin-add-titulo");
    if (titEl) titEl.textContent = "Editando: " + (l.titulo || "livro");
    if (btnSalvarLivro) btnSalvarLivro.textContent = "Salvar alterações";
    const cancelar = document.getElementById("btn-cancelar-edicao");
    if (cancelar) cancelar.hidden = false;
    const det = document.getElementById("admin-add");
    if (det) det.open = true;
    renderAdmin();   // realça o card que está sendo editado
    if (det && det.scrollIntoView) det.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function sairModoEdicao() {
    editandoId = "";
    if (formLivro) formLivro.reset();
    set("livro-edit-id", "");
    limparGeneroDica();
    fotoBase64 = "";
    if (fotoPreview) fotoPreview.innerHTML = '<span class="admin-foto-vazio">Foto da capa</span>';
    const titEl = document.getElementById("admin-add-titulo");
    if (titEl) titEl.textContent = "Adicionar um novo livro";
    if (btnSalvarLivro) btnSalvarLivro.textContent = "Adicionar livro à loja";
    const cancelar = document.getElementById("btn-cancelar-edicao");
    if (cancelar) cancelar.hidden = true;
    if (livroErro) livroErro.hidden = true;
  }

  const btnCancelarEdicao = document.getElementById("btn-cancelar-edicao");
  if (btnCancelarEdicao) btnCancelarEdicao.addEventListener("click", () => { sairModoEdicao(); renderAdmin(); });

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
    const editando = !!editandoId;
    const idDe = window.idLivro || (l => l.id);
    // Original (loja ou catálogo) para preservar data e destaque ao editar.
    const existente = editando ? listaLivrosAdmin().find(l => idDe(l) === editandoId) : null;
    const condicao = v("livro-condicao") === "novo" ? "novo" : "usado";
    let id = editando ? editandoId : (slugLivro(titulo, autor) || ("livro-" + Date.now().toString(36)));
    if (!editando) {
      // Já existe um livro com o mesmo título e autor? É uma VARIANTE
      // (ex.: versão nova + usada): gera um id diferente para as duas
      // conviverem — na loja elas aparecem juntas, na mesma página.
      const idsExistentes = new Set(listaLivrosAdmin().map(l => idDe(l)));
      if (idsExistentes.has(id)) {
        let candidato = id + "-" + condicao;
        let n = 2;
        while (idsExistentes.has(candidato)) candidato = id + "-" + condicao + "-" + (n++);
        id = candidato;
      }
    }
    const estoque = Math.max(1, parseInt(v("livro-estoque"), 10) || 1);
    const livro = {
      id: id,
      titulo: titulo,
      autor: autor,
      genero: v("livro-genero") || "Outros",
      preco: precoBR(precoNum),
      estoque: estoque,
      condicao: condicao,
      estado: v("livro-estado") || "Estado perfeito",
      sinopse: v("livro-sinopse"),
      imagem: fotoBase64 || "",
      // Preserva o destaque original (não promove um livro comum sem querer).
      destaque: existente ? !!existente.destaque : true,
      // Ao editar, preserva a data original (não volta para "Novidades da Semana").
      dataAdicao: (existente && existente.dataAdicao) ? existente.dataAdicao : new Date().toISOString().slice(0, 10)
    };
    if (btnSalvarLivro) { btnSalvarLivro.disabled = true; btnSalvarLivro.textContent = editando ? "Salvando…" : "Adicionando…"; }

    // Estima a "fama" do livro com IA — a loja usa essa nota para a ordem
    // estilo Netflix (mais famosos primeiro). NÃO trava o salvamento: se a
    // IA falhar/demorar, o livro é salvo sem a nota (a ordem cai no destaque).
    try {
      const token = await Auth.idToken().catch(() => null);
      const rf = await fetch("/api/classificar-fama", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" },
          token ? { "Authorization": "Bearer " + token } : {}),
        body: JSON.stringify({ titulo: titulo, autor: autor, sinopse: livro.sinopse, genero: livro.genero })
      });
      if (rf.ok) {
        const df = await rf.json();
        if (typeof df.fama === "number" && isFinite(df.fama)) {
          livro.fama = Math.max(0, Math.min(100, Math.round(df.fama)));
        }
      }
    } catch (e) { /* segue sem a nota de fama */ }
    // Ao editar, se a IA falhou agora, preserva a nota anterior do livro.
    if (typeof livro.fama !== "number" && existente && typeof existente.fama === "number") {
      livro.fama = existente.fama;
    }

    try {
      await Auth.adicionarLivro(livro);
      // Atualiza a lista local do admin
      livrosCatalogo = livrosCatalogo.filter(l => l.id !== id);
      livrosCatalogo.push(livro);
      idsCatalogo.add(id);
      sairModoEdicao();
      renderAdmin();
      if (livroOk) { livroOk.hidden = false; livroOk.textContent = editando ? "Alterações salvas ✓" : "Livro adicionado ✓"; setTimeout(() => { livroOk.hidden = true; }, 3000); }
      const det = document.getElementById("admin-add");
      if (det) det.open = false;
    } catch (e) {
      if (livroErro) { livroErro.hidden = false; livroErro.textContent = editando ? "Não foi possível salvar as alterações agora. Tente novamente." : "Não foi possível adicionar o livro agora. Tente novamente."; }
    } finally {
      if (btnSalvarLivro) { btnSalvarLivro.disabled = false; btnSalvarLivro.textContent = editandoId ? "Salvar alterações" : "Adicionar livro à loja"; }
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
      window.location.href = "./";
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
      set("p-end-descricao", en.descricao);
      // Perfis antigos não têm "modo": assume descrição se só houver o texto.
      aplicarModoEndereco(en.modo || (en.descricao && !en.rua ? "descricao" : "campos"));
    }
    atualizarDicaWhats();

    reconciliacaoRodando = false;
    if (perfilCompleto(perfil)) entrarModoDashboard();
    else entrarModoOnboarding();
  });
})();
