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

  /* ---------- Avisos: o que o cliente quer receber ----------
     Tudo começa MARCADO (quem faz um pedido espera ser avisado).
     Só fica desligado o que a pessoa desmarcar aqui — ou o clique
     em "não quero mais receber" no rodapé do e-mail. */
  const AVISOS_CFG = CFG.avisos || {};
  const blocoAvisos = document.getElementById("p-avisos-bloco");
  if (blocoAvisos) blocoAvisos.hidden = AVISOS_CFG.preferencias === false;

  function marcado(id) {
    const el = document.getElementById(id);
    return el ? !!el.checked : true;
  }
  function preencherAvisos(perfil) {
    const n = (perfil && perfil.notificacoes) || {};
    const par = [["p-av-email", n.email], ["p-av-whats", n.whatsapp], ["p-av-novidades", n.novidades]];
    par.forEach(([id, valor]) => {
      const el = document.getElementById(id);
      if (el) el.checked = valor !== false;   // ausente = ligado
    });
  }
  function avisosDoFormulario() {
    return {
      email: marcado("p-av-email"),
      whatsapp: marcado("p-av-whats"),
      novidades: marcado("p-av-novidades")
    };
  }

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
        notificacoes: avisosDoFormulario(),
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
    const abaPedidos   = tab === "pedidos";
    const abaLoja      = tab === "loja";
    const abaAdmin     = tab === "admin";
    const abaNovidades = tab === "novidades";
    const abaDados     = !abaPedidos && !abaLoja && !abaAdmin && !abaNovidades;
    if (painelDados) painelDados.hidden = !abaDados;
    if (painelPedidos) painelPedidos.hidden = !abaPedidos;
    const painelLoja = document.getElementById("painel-pedidos-loja");
    if (painelLoja) painelLoja.hidden = !abaLoja;
    const painelAdmin = document.getElementById("painel-admin");
    if (painelAdmin) painelAdmin.hidden = !abaAdmin;
    const painelNov = document.getElementById("painel-novidades");
    if (painelNov) painelNov.hidden = !abaNovidades;
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
    if (abaNovidades) carregarNovidades();
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
    const pn = document.getElementById("painel-novidades"); if (pn) pn.hidden = true;
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
    novidadesCarregado = false;

    let abaInicial = "dados";
    if (location.hash === "#pedidos") abaInicial = "pedidos";
    else if (location.hash === "#loja" && admin) abaInicial = "loja";
    else if (location.hash === "#admin" && admin) abaInicial = "admin";
    else if (location.hash === "#novidades" && admin) abaInicial = "novidades";
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
    const pnOk = document.getElementById("painel-novidades"); if (pnOk) pnOk.hidden = true;
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
    enviado:    { texto: "A caminho 🚚",           classe: "pedido-pago" },
    entregue:   { texto: "Entregue ✓",             classe: "pedido-entregue" },
    cancelado:  { texto: "Cancelado",              classe: "pedido-cancelado" }
  };

  /* Linha do tempo do pedido:
       Pedido feito → Pagamento → A caminho → Entregue
     Quem move o pedido de "a caminho" para "entregue" são os
     admins, no painel "Pedidos da loja" — e cada passo dispara o
     aviso correspondente para o cliente. */
  function nivelPedido(status) {
    if (status === "entregue") return 4;
    if (status === "enviado") return 3;
    if (status === "pago" || status === "aprovado") return 2;
    return 1;
  }
  function passosHTML(status) {
    if (status === "cancelado") return "";
    const nivel = nivelPedido(status);
    // "aprovado" = pedido em dinheiro: aprovado na hora, paga-se na entrega.
    const rotuloPagamento = status === "aprovado"
      ? "Aprovado, pague na entrega"
      : (nivel >= 2 ? "Pagamento confirmado" : "Pagamento");
    const passos = [
      { rotulo: "Pedido feito", feito: true },
      { rotulo: rotuloPagamento, feito: nivel >= 2 },
      { rotulo: nivel >= 3 ? "Saiu para entrega" : "A caminho", feito: nivel >= 3 },
      { rotulo: nivel >= 4 ? "Entregue" : "Entrega", feito: nivel >= 4 }
    ];
    const ultimo = passos.length - 1;
    return `<ol class="pedido-passos" aria-label="Andamento do pedido">` + passos.map((p, i) => `
      <li class="passo${p.feito ? " feito" : ""}${i === nivel && nivel <= ultimo ? " atual" : ""}">
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
          : (p.status === "enviado"
            ? `<p class="pedido-contato-aviso">Seu pedido saiu para entrega. Avisamos pelo WhatsApp quando estivermos chegando.</p>`
            : (p.status === "entregue" ? `<p class="pedido-contato-aviso pedido-aviso-entregue">Pedido entregue. Boa leitura!</p>` : "")));
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
          // Rede de recuperação do aviso ao CLIENTE: se o webhook do
          // Mercado Pago não chegou (ou o site estava fechado), o aviso
          // de "pagamento confirmado" sai agora. O servidor guarda o que
          // já foi enviado, então ninguém recebe duas vezes.
          if (window.Avisos) window.Avisos.avisar("pago", { codigo: p.codigo });
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

  /* De onde veio o pedido (campo "origem", gravado pelo checkout). */
  const ORIGENS_PEDIDO = { meta: "Instagram / Facebook" };

  function plojaStatusGrupo(p) {
    // "aprovado" (dinheiro na entrega) entra no grupo dos aprovados/pagos:
    // o pedido já está fechado, falta só entregar (e receber o dinheiro).
    if (p.status === "pago" || p.status === "aprovado") return "pago";
    if (p.status === "enviado") return "enviado";
    if (p.status === "entregue") return "entregue";
    if (p.status === "cancelado") return "cancelado";
    return "apagar";   // pendente / aguardando
  }

  const AVISO_ROTULO = {
    recebido: "pedido recebido", pago: "pagamento", enviado: "saiu para entrega",
    entregue: "entregue", cancelado: "cancelado"
  };

  /* Qual aviso combina com cada mudança de status. */
  const AVISO_DO_STATUS = {
    pago: "pago", aprovado: "pago", enviado: "enviado",
    entregue: "entregue", cancelado: "cancelado"
  };

  /* O caminho do pedido é "users/<uid>/pedidos/<codigo>". */
  function uidDoCaminho(caminho) {
    const partes = String(caminho || "").split("/");
    return partes.length >= 2 ? partes[1] : "";
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

      // Selo de origem: pedidos que vieram da Loja do Instagram/Facebook
      // chegam com essa marca (veja js/finalizar.js).
      const selos = [];
      if (ORIGENS_PEDIDO[p.origem]) selos.push(`<span class="ploja-selo">${esc(ORIGENS_PEDIDO[p.origem])}</span>`);

      const acoes = [];
      if (grupo === "apagar") acoes.push(`<button type="button" class="botao-loja botao-loja-primario ploja-btn" data-acao="pago" data-caminho="${esc(p._caminho)}">Confirmar pagamento</button>`);
      if (grupo === "pago")   acoes.push(`<button type="button" class="botao-loja botao-loja-primario ploja-btn" data-acao="enviado" data-caminho="${esc(p._caminho)}">Saiu para entrega</button>`);
      if (grupo === "pago" || grupo === "enviado")
        acoes.push(`<button type="button" class="botao-loja ${grupo === "enviado" ? "botao-loja-primario" : "botao-loja-secundario"} ploja-btn" data-acao="entregue" data-caminho="${esc(p._caminho)}">Marcar como entregue</button>`);
      if (grupo === "apagar" || grupo === "pago" || grupo === "enviado")
        acoes.push(`<button type="button" class="botao-loja botao-loja-secundario ploja-btn ploja-btn-cancelar" data-acao="cancelado" data-caminho="${esc(p._caminho)}">Cancelar pedido</button>`);
      if (grupo === "cancelado" || grupo === "entregue")
        acoes.push(`<button type="button" class="botao-loja botao-loja-secundario ploja-btn" data-acao="pago" data-caminho="${esc(p._caminho)}">Reabrir como pago</button>`);
      // Reenvio manual do e-mail do pedido (para pedidos pagos/aprovados
      // que têm o corpo salvo). O envio pelo servidor é barrado pelo
      // Cloudflare do Web3Forms, então quem manda é o navegador do admin.
      if ((grupo === "pago" || grupo === "enviado") && p.emailBody)
        acoes.push(`<button type="button" class="botao-loja botao-loja-secundario ploja-email-btn" data-caminho="${esc(p._caminho)}">${p.emailEnviado ? "Reenviar e-mail do pedido" : "Enviar e-mail do pedido"}</button>`);
      // Reenviar ao CLIENTE o aviso do momento atual do pedido.
      const avisoAtual = AVISO_DO_STATUS[p.status];
      if (avisoAtual)
        acoes.push(`<button type="button" class="botao-loja botao-loja-secundario ploja-avisar-btn" data-evento="${esc(avisoAtual)}" data-caminho="${esc(p._caminho)}">${(p.avisos || {})[avisoAtual] ? "Reavisar o cliente" : "Avisar o cliente"}</button>`);

      // Linha de status do aviso: mostra o que já foi enviado e, quando o
      // WhatsApp automático não está ligado, o link para mandar num toque.
      const enviados = Object.keys(p.avisos || {}).filter(k => p.avisos[k]);
      const statusAviso = enviados.length
        ? `Cliente avisado: ${enviados.map(e => AVISO_ROTULO[e] || e).join(", ")}`
        : "Cliente ainda não avisado por aqui";

      return `
        <article class="pedido-card ploja-card">
          <div class="pedido-topo">
            <span class="pedido-codigo">${esc(p.codigo || "—")}</span>
            <span class="pedido-status ${st.classe}">${esc(st.texto)}</span>
          </div>
          ${data ? `<p class="pedido-data">${esc(data)}</p>` : ""}
          ${selos.length ? `<p class="ploja-selos">${selos.join("")}</p>` : ""}
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
          <p class="ploja-aviso-status" data-caminho="${esc(p._caminho)}">${esc(statusAviso)}</p>
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

    // Avisar o cliente (ou reavisar) sobre o momento atual do pedido.
    const avisarBtn = e.target.closest(".ploja-avisar-btn");
    if (avisarBtn) {
      const caminhoAviso = avisarBtn.dataset.caminho;
      const pedidoAviso = plojaPedidos.find(x => x._caminho === caminhoAviso);
      if (!pedidoAviso) return;
      const origAviso = avisarBtn.textContent;
      avisarBtn.disabled = true; avisarBtn.textContent = "Enviando…";
      const r = await dispararAviso(pedidoAviso, avisarBtn.dataset.evento, true);
      avisarBtn.disabled = false;
      avisarBtn.textContent = r && r.enviado ? "Aviso enviado ✓" : origAviso;
      return;
    }

    const btn = e.target.closest(".ploja-btn");
    if (!btn) return;
    const caminho = btn.dataset.caminho;
    const acao = btn.dataset.acao;
    if (!caminho || !acao) return;
    if (acao === "cancelado" && !window.confirm("Cancelar este pedido? O cliente recebe um aviso avisando do cancelamento.")) return;

    const original = btn.textContent;
    btn.disabled = true; btn.textContent = "Salvando…";
    try {
      const campos = { status: acao };
      const pedido = plojaPedidos.find(x => x._caminho === caminho);
      if (acao === "enviado") campos.enviadoEm = Date.now();
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
      // O CLIENTE é avisado logo depois de o status mudar. Não bloqueia
      // nem desfaz nada: o pedido já está salvo.
      if (pedido) dispararAviso(pedido, AVISO_DO_STATUS[acao], false);
    } catch (err) {
      btn.disabled = false; btn.textContent = original;
      window.alert("Não foi possível salvar agora. Tente novamente.");
    }
  });

  /* ------------------------------------------------------------
     Manda o aviso ao cliente e conta o que aconteceu na linha
     "Cliente avisado: …" do card. Quando o WhatsApp automático não
     está ligado (ou a Meta recusa), mostramos um link para o admin
     enviar num toque pelo próprio WhatsApp Business.
     ------------------------------------------------------------ */
  function linhaAviso(caminho) {
    return document.querySelector(`.ploja-aviso-status[data-caminho="${(window.CSS && CSS.escape) ? CSS.escape(caminho) : caminho}"]`);
  }

  async function dispararAviso(pedido, evento, forcar) {
    if (!evento || !window.Avisos) return null;
    const uid = uidDoCaminho(pedido._caminho);
    const linha = linhaAviso(pedido._caminho);
    if (linha) { linha.textContent = "Avisando o cliente…"; linha.className = "ploja-aviso-status"; }

    let r = null;
    try {
      r = await window.Avisos.avisar(evento, {
        codigo: pedido.codigo, uid: uid, forcar: !!forcar, propagarErro: true
      });
    } catch (e) {
      if (linha) {
        linha.className = "ploja-aviso-status ploja-aviso-falhou";
        linha.textContent = "Não deu para avisar o cliente: " + e.message;
      }
      return null;
    }
    // null sem erro = o aviso está desligado no js/config.js (bloco "avisos").
    if (!r) {
      if (linha) {
        linha.className = "ploja-aviso-status";
        linha.textContent = `Aviso de "${AVISO_ROTULO[evento] || evento}" está desligado no js/config.js.`;
      }
      return null;
    }

    // Guarda o que saiu para o card continuar certo ao redesenhar.
    if (r.enviado) {
      pedido.avisos = Object.assign({}, pedido.avisos, { [evento]: true });
    }

    if (linha) {
      const partes = [];
      if (r.email) partes.push(r.email.ok ? "e-mail ✓" : "e-mail ✗");
      if (r.whatsapp) partes.push(r.whatsapp.ok ? "WhatsApp ✓" : "WhatsApp ✗");
      const rotulo = AVISO_ROTULO[evento] || evento;
      const zapLink = r.whatsapp && !r.whatsapp.ok && r.whatsapp.link ? r.whatsapp.link : "";

      if (r.jaEnviado) {
        linha.className = "ploja-aviso-status";
        linha.textContent = `Aviso de "${rotulo}" já tinha sido enviado.`;
      } else {
        linha.className = "ploja-aviso-status" + (r.enviado ? " ploja-aviso-ok" : " ploja-aviso-falhou");
        linha.innerHTML = esc(`Aviso de "${rotulo}": ${partes.join(" · ") || "nenhum canal disponível"}`) +
          (zapLink
            ? ` <a class="ploja-whats" href="${esc(zapLink)}" target="_blank" rel="noopener">Enviar pelo WhatsApp</a>`
            : "") +
          (!r.enviado && !zapLink && r.email && r.email.motivo ? ` <span class="ploja-aviso-motivo">${esc(r.email.motivo)}</span>` : "");
      }
    }
    return r;
  }

  /* ================================================================
     NOVIDADES (admin): o anúncio para toda a base de clientes.
     Escreve uma vez, escolhe os canais, vê a prévia, manda um teste
     para si mesmo e só então dispara para todo mundo — em lotes,
     com barra de progresso.
     ================================================================ */
  let novidadesCarregado = false;
  let campanhaRodando = false;

  const campTitulo  = document.getElementById("camp-titulo");
  const campTexto   = document.getElementById("camp-texto");
  const campLink    = document.getElementById("camp-link");
  const campBotao   = document.getElementById("camp-botao");
  const campImagem  = document.getElementById("camp-imagem");
  const campPrevia  = document.getElementById("camp-previa");
  const campErro    = document.getElementById("camp-erro");
  const campProg    = document.getElementById("camp-progresso");
  const formCamp    = document.getElementById("form-campanha");

  function campCanais() {
    const canais = [];
    const e = document.getElementById("camp-canal-email");
    const w = document.getElementById("camp-canal-whats");
    if (e && e.checked) canais.push("email");
    if (w && w.checked) canais.push("whatsapp");
    return canais;
  }

  function campDados() {
    return {
      titulo: (campTitulo && campTitulo.value.trim()) || "",
      texto: (campTexto && campTexto.value.trim()) || "",
      link: (campLink && campLink.value.trim()) || "",
      imagem: (campImagem && campImagem.value.trim()) || "",
      rotuloBotao: (campBotao && campBotao.value.trim()) || "",
      canais: campCanais()
    };
  }

  /* Prévia: aproximação do que o cliente vai ver no e-mail. */
  function renderPrevia() {
    if (!campPrevia) return;
    const d = campDados();
    const nomeLoja = CFG.nomeLoja || "BookVerse";
    if (!d.titulo && !d.texto) {
      campPrevia.innerHTML = `<p class="conta-ajuda">Comece a escrever para ver a prévia aqui.</p>`;
      return;
    }
    const imgOk = window.Util && window.Util.imagemSrcSegura ? window.Util.imagemSrcSegura(d.imagem) : "";
    const paragrafos = d.texto.split(/\n{2,}/).filter(Boolean)
      .map(t => `<p>${esc(t).replace(/\n/g, "<br>")}</p>`).join("");
    campPrevia.innerHTML = `
      <article class="camp-cartao">
        <header class="camp-cartao-topo">
          <span class="camp-cartao-marca">${esc(nomeLoja)}</span>
          <span class="camp-cartao-selo">Novidades</span>
        </header>
        <div class="camp-cartao-corpo">
          <h4>${esc(d.titulo || "(sem título)")}</h4>
          ${imgOk ? `<img src="${esc(imgOk)}" alt="" class="camp-cartao-img" loading="lazy">` : ""}
          ${paragrafos || `<p class="conta-ajuda">(sem mensagem)</p>`}
          ${d.link ? `<span class="camp-cartao-botao">${esc(d.rotuloBotao || "Ver na loja")}</span>` : ""}
        </div>
        <footer class="camp-cartao-rodape">${esc(nomeLoja)} · não quero mais receber novidades</footer>
      </article>
      ${d.canais.indexOf("whatsapp") >= 0 ? `
      <div class="camp-zap">
        <p class="camp-zap-rotulo">No WhatsApp:</p>
        <p class="camp-zap-balao">${esc(d.titulo)}<br><br>${esc(d.texto).replace(/\n/g, "<br>")}${d.link ? "<br><br>" + esc(d.link) : ""}</p>
      </div>` : ""}`;
  }

  [campTitulo, campTexto, campLink, campBotao, campImagem].forEach(el => {
    if (el) el.addEventListener("input", renderPrevia);
  });
  ["camp-canal-email", "camp-canal-whats"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", renderPrevia);
  });

  /* Quantas pessoas vão receber. */
  async function carregarNovidades() {
    renderPrevia();
    if (novidadesCarregado) return;
    const alvo = document.getElementById("camp-publico");
    if (!alvo || !window.Avisos) return;
    alvo.textContent = "Contando quantas pessoas vão receber…";
    try {
      const d = await window.Avisos.publico();
      novidadesCarregado = true;
      alvo.innerHTML = d.total
        ? `<strong>${d.total}</strong> cliente${d.total === 1 ? "" : "s"} vão receber esta novidade ` +
          `<span class="camp-publico-detalhe">(${d.comEmail} por e-mail · ${d.comWhatsapp} por WhatsApp)</span>`
        : `Nenhum cliente aceita receber novidades ainda. Assim que as pessoas criarem conta na loja, elas aparecem aqui.`;
    } catch (e) {
      alvo.textContent = "Não deu para contar os clientes agora: " + e.message;
    }
  }

  function campMostrarErro(msg) {
    if (!campErro) return;
    campErro.hidden = !msg;
    campErro.textContent = msg || "";
  }

  function campTravar(travado) {
    campanhaRodando = travado;
    ["camp-teste", "camp-enviar"].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.disabled = travado;
    });
  }

  /* Envia a campanha inteira, um lote por vez. */
  async function enviarCampanhaCompleta() {
    const d = campDados();
    if (!d.titulo || !d.texto) { campMostrarErro("Preencha o título e a mensagem."); return; }
    if (!d.canais.length) { campMostrarErro("Escolha pelo menos um canal (e-mail ou WhatsApp)."); return; }
    if (!window.confirm(`Enviar "${d.titulo}" para todos os clientes que aceitam novidades?`)) return;

    campMostrarErro("");
    campTravar(true);
    if (campProg) { campProg.hidden = false; campProg.textContent = "Preparando o envio…"; }

    let cursor = "", campanhaId = "", total = 0, porEmail = 0, porZap = 0, falhas = 0, voltas = 0;
    try {
      do {
        const r = await window.Avisos.campanha(Object.assign({}, d, { cursor, campanhaId }));
        campanhaId = r.campanhaId || campanhaId;
        total += r.enviados || 0;
        porEmail += r.porEmail || 0;
        porZap += r.porWhatsapp || 0;
        falhas += (r.falhas || []).length;
        cursor = r.proximo || "";
        if (campProg) {
          campProg.textContent = `Enviando… ${total} cliente${total === 1 ? "" : "s"} até agora` +
            (cursor ? " (continuando…)" : "");
        }
      } while (cursor && ++voltas < 100);   // trava: no máximo 6.000 clientes

      if (campProg) {
        campProg.innerHTML = `<strong>Pronto!</strong> ${total} cliente${total === 1 ? "" : "s"} ` +
          `receberam a novidade (${porEmail} por e-mail · ${porZap} por WhatsApp).` +
          (falhas ? ` <span class="camp-falhas">${falhas} não deu para entregar.</span>` : "");
      }
    } catch (e) {
      campMostrarErro("O envio parou: " + e.message +
        (total ? ` (${total} cliente(s) já tinham recebido).` : ""));
      if (campProg) campProg.hidden = true;
    } finally {
      campTravar(false);
    }
  }

  if (formCamp) formCamp.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!campanhaRodando) enviarCampanhaCompleta();
  });

  const campTesteBtn = document.getElementById("camp-teste");
  if (campTesteBtn) campTesteBtn.addEventListener("click", async () => {
    const d = campDados();
    if (!d.titulo || !d.texto) { campMostrarErro("Preencha o título e a mensagem antes de testar."); return; }
    if (!d.canais.length) { campMostrarErro("Escolha pelo menos um canal (e-mail ou WhatsApp)."); return; }
    campMostrarErro("");
    campTravar(true);
    if (campProg) { campProg.hidden = false; campProg.textContent = "Enviando o teste para você…"; }
    try {
      const r = await window.Avisos.campanha(Object.assign({}, d, { teste: true }));
      if (campProg) {
        campProg.innerHTML = r.enviados
          ? `Teste enviado ✓ Confira sua caixa de entrada${r.porWhatsapp ? " e o WhatsApp" : ""}. Se estiver bom, use "Enviar para todos".`
          : `O teste não saiu. Motivo: ${esc((r.falhas && r.falhas[0] && r.falhas[0].motivo) || "canal não configurado")}.`;
      }
    } catch (e) {
      campMostrarErro("Não deu para enviar o teste: " + e.message);
      if (campProg) campProg.hidden = true;
    } finally {
      campTravar(false);
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
      // Copiar o link público do livro para a área de transferência.
      acoes.appendChild(botao("copiar-link", "Copiar link", "admin-btn-link"));
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
    if (!adminCarregado) {
      if (carregando) { carregando.hidden = false; carregando.textContent = "Carregando catálogo…"; }
      // As leituras devolvem null quando falham ("não sei"): aqui o painel
      // cai no vazio mesmo, mas sem quebrar (o admin recarrega a página).
      try { dispMapaAdmin = (await Auth.lerDisponibilidade()) || {}; } catch (e) { dispMapaAdmin = {}; }
      try { livrosCatalogo = (await Auth.lerCatalogo()) || []; } catch (e) { livrosCatalogo = []; }
      idsCatalogo = new Set((livrosCatalogo || []).map(l => l && l.id).filter(Boolean));
      adminCarregado = true;
    }
    if (carregando) carregando.hidden = true;
    renderAdmin();
  }

  /* Copiar o link público do livro (/livro/<id>) para a área de
     transferência — o mesmo endereço usado ao compartilhar na loja. */
  function copiarLinkLivro(id, btn) {
    const url = location.origin + "/livro/" + encodeURIComponent(id);
    const ok = () => {
      const o = btn.dataset.rotulo || btn.textContent;
      btn.dataset.rotulo = o;
      btn.textContent = "Link copiado!";
      btn.classList.add("admin-btn-ok");
      setTimeout(() => { btn.textContent = o; btn.classList.remove("admin-btn-ok"); }, 1600);
    };
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = url; ta.setAttribute("readonly", "");
      ta.style.position = "absolute"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) { /* sem suporte */ }
      document.body.removeChild(ta); ok();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(ok).catch(fallback);
    } else { fallback(); }
  }

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
    // Copiar link: coloca o endereço público do livro na área de transferência.
    if (acao === "copiar-link") { copiarLinkLivro(id, btn); return; }
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
  const fotoIaDica = document.getElementById("foto-ia-dica");
  const btnIdentificar = document.getElementById("btn-identificar-capa");

  function mostrarFotoDica(texto, tipo) {
    if (!fotoIaDica) return;
    fotoIaDica.hidden = !texto;
    fotoIaDica.classList.toggle("erro", tipo === "erro");
    fotoIaDica.classList.toggle("ok", tipo === "ok");
    fotoIaDica.textContent = texto || "";
  }

  // Identifica TÍTULO e AUTOR a partir da FOTO da capa (Gemini vision).
  // forcar=true sobrescreve os campos; senão, só preenche os que estiverem
  // vazios (não apaga o que o admin já digitou nem clobbera uma edição).
  async function identificarPelaCapa(forcar) {
    if (!fotoBase64) { mostrarFotoDica("Escolha a foto da capa primeiro.", "erro"); return; }
    const campoTitulo = document.getElementById("livro-titulo");
    const campoAutor = document.getElementById("livro-autor");
    const tinhaTitulo = !!(campoTitulo && campoTitulo.value.trim());
    const tinhaAutor = !!(campoAutor && campoAutor.value.trim());
    // Sem forçar e ambos já preenchidos: não gasta a cota da IA à toa.
    if (!forcar && tinhaTitulo && tinhaAutor) return;
    if (btnIdentificar) btnIdentificar.disabled = true;
    mostrarFotoDica("Lendo a capa com IA…", "");
    try {
      const token = await Auth.idToken().catch(() => null);
      const r = await fetch("/api/identificar-livro", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" },
          token ? { "Authorization": "Bearer " + token } : {}),
        body: JSON.stringify({ imagem: fotoBase64 })
      });
      const d = await r.json();
      if (!r.ok) throw new Error((d && d.error) || "falha");
      const preencheu = [];
      if (d.titulo && (forcar || !tinhaTitulo)) { set("livro-titulo", d.titulo); preencheu.push("título"); }
      if (d.autor && (forcar || !tinhaAutor)) { set("livro-autor", d.autor); preencheu.push("autor"); }
      if (preencheu.length) {
        mostrarFotoDica("IA preencheu " + preencheu.join(" e ") + " pela capa. Confira e ajuste se precisar.", "ok");
      } else {
        mostrarFotoDica("A capa foi lida, mas os campos já estavam preenchidos.", "ok");
      }
    } catch (e) {
      mostrarFotoDica((e && e.message) || "Não consegui ler a capa. Preencha à mão ou tente outra foto.", "erro");
    } finally {
      if (btnIdentificar) btnIdentificar.disabled = false;
    }
  }

  if (btnIdentificar) btnIdentificar.addEventListener("click", () => identificarPelaCapa(true));

  if (inpFoto) inpFoto.addEventListener("change", async () => {
    const file = inpFoto.files && inpFoto.files[0];
    if (!file) return;
    mostrarFotoDica("", "");
    try {
      fotoBase64 = await comprimirImagem(file);
      if (fotoPreview) { fotoPreview.innerHTML = ""; const im = document.createElement("img"); im.src = fotoBase64; im.alt = ""; fotoPreview.appendChild(im); }
      // Automação: assim que a capa é escolhida, a IA já identifica
      // título e autor (preenche só os campos vazios).
      identificarPelaCapa(false);
    } catch (e) {
      fotoBase64 = "";
      mostrarFotoDica("Não consegui ler a imagem. Tente outra foto.", "erro");
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
    mostrarFotoDica("", "");
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
    mostrarFotoDica("", "");
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
    preencherAvisos(perfil);
    atualizarDicaWhats();

    reconciliacaoRodando = false;
    if (perfilCompleto(perfil)) entrarModoDashboard();
    else entrarModoOnboarding();
  });
})();
