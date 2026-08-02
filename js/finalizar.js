/* ============================================================
   BOOKVERSE — URL DE FINALIZAÇÃO DE COMPRA (catálogo do Meta)
   ------------------------------------------------------------
   Esta é a página que o Instagram/Facebook abre quando alguém
   toca em "Ver no site"/"Comprar" dentro da nossa Loja do Meta.
   O Meta manda o carrinho pela própria URL:

     /finalizar?products=ID:QTD,ID:QTD

   O que ela faz, nesta ordem:
     1. lê os produtos e a quantidade da URL;
     2. acha cada livro no catálogo (inclusive os cadastrados
        pelo painel admin) — inclusive quando o id vem ENCURTADO,
        que é o formato usado no feed do catálogo;
     3. confere o estoque de verdade (reservados/vendidos) e
        avisa, item por item, o que mudou;
     4. monta o carrinho do site e leva ao checkout normal.

   Como a loja EXIGE conta para fechar pedido, a página nunca
   deixa o cliente na mão: ela mostra o carrinho montado e, se
   for o caso, explica por que a conta é necessária e oferece o
   login ali mesmo — sem perder os livros escolhidos.

   Não precisa mexer aqui. O endereço que vai no Gerenciador de
   Comércio do Meta está no arquivo META-CATALOGO.md.
   ============================================================ */

(function () {
  const Precos   = window.Precos;
  const Carrinho = window.Carrinho;
  const CFG      = window.LOJA_CONFIG || {};
  const esc      = window.esc || (t => String(t == null ? "" : t));

  const CACHE_DISP = "bookverse_cache_disp_v1";
  const CACHE_CAT  = "bookverse_cache_catalogo_v1";

  /* ---------- Referências da página ---------- */
  const elCarregando = document.getElementById("mc-carregando");
  const elConteudo   = document.getElementById("mc-conteudo");
  const elAvisos     = document.getElementById("mc-avisos");
  const elResumo     = document.getElementById("mc-resumo");
  const elItens      = document.getElementById("mc-itens");
  const elPromo      = document.getElementById("mc-promo");
  const elSubtotal   = document.getElementById("mc-subtotal");
  const elTitulo     = document.getElementById("mc-titulo");
  const elSub        = document.getElementById("mc-sub");
  const elOrigem     = document.getElementById("mc-origem");

  const acaoContinuar = document.getElementById("mc-acao-continuar");
  const acaoLogin     = document.getElementById("mc-acao-login");
  const acaoCadastro  = document.getElementById("mc-acao-cadastro");
  const acaoVazio     = document.getElementById("mc-acao-vazio");

  /* ---------- Estado ---------- */
  let itensFinais = [];     // [{ id, qty, livro }] já validados pelo estoque
  let indo = false;         // trava contra clique duplo em "Ir para o pagamento"
  let houveAjuste = false;  // true quando o carrinho precisou ser ajustado
  let trocouCarrinho = false; // o cliente já tinha OUTRO carrinho no site

  /* ============================================================
     1. LEITURA DOS PARÂMETROS DA URL
     ============================================================ */

  /* Nomes aceitos para a lista de produtos. O formato oficial do Meta é
     "products=ID:QTD,ID:QTD", mas aceitamos as variações mais comuns para
     que um ajuste de configuração no painel do Meta nunca quebre a página.

     A loja não trabalha com cupom: se o Meta mandar um "coupon" na URL, ele é
     simplesmente ignorado — o link continua funcionando normalmente. */
  const CHAVES_PRODUTOS = ["products", "product", "items", "item", "product_ids", "productids", "cart", "produtos"];

  function query() {
    try { return new URLSearchParams(location.search); } catch (e) { return null; }
  }

  /* Valor que ainda tem chaves ({products}) é um placeholder que o Meta não
     substituiu — tratamos como vazio em vez de procurar um livro chamado "{products}". */
  function valorUtil(v) {
    const s = String(v == null ? "" : v).trim();
    if (!s) return "";
    if (s.indexOf("{") >= 0 || s.indexOf("}") >= 0) return "";
    return s;
  }

  function primeiroParam(q, chaves) {
    if (!q) return "";
    for (const chave of chaves) {
      const achados = q.getAll(chave).map(valorUtil).filter(Boolean);
      if (achados.length) return achados.join(",");
    }
    return "";
  }

  /* "titulo-autor:2" -> { rid: "titulo-autor", qty: 2 }. Sem ":" a quantidade é 1. */
  function lerItem(parte) {
    let texto = String(parte || "").trim();
    if (!texto) return null;
    // O Meta pode codificar o valor duas vezes; se a decodificação falhar,
    // seguimos com o texto como veio.
    if (texto.indexOf("%") >= 0) {
      try { texto = decodeURIComponent(texto); } catch (e) { /* usa como veio */ }
    }

    let rid = texto;
    let qty = 1;
    const corte = texto.lastIndexOf(":");
    if (corte > 0) {
      const cauda = texto.slice(corte + 1).trim();
      if (/^\d+$/.test(cauda)) {
        rid = texto.slice(0, corte).trim();
        qty = parseInt(cauda, 10) || 1;
      }
    }
    rid = rid.trim();
    if (!rid) return null;
    return { rid, qty: Math.max(1, Math.min(qty, 99)) };
  }

  /* Lista pedida pelo Meta, já com os repetidos somados. */
  function produtosDaURL() {
    const q = query();
    const bruto = primeiroParam(q, CHAVES_PRODUTOS);
    const pedidos = [];
    const porId = new Map();
    bruto.split(/[,;]/).forEach(parte => {
      const item = lerItem(parte);
      if (!item) return;
      const chave = item.rid.toLowerCase();
      if (porId.has(chave)) {
        const anterior = porId.get(chave);
        anterior.qty = Math.min(99, anterior.qty + item.qty);
      } else {
        porId.set(chave, item);
        pedidos.push(item);
      }
    });
    return pedidos;
  }

  /* ============================================================
     2. CATÁLOGO E ESTOQUE
     ============================================================ */

  function comLimite(promessa, ms) {
    return Promise.race([
      Promise.resolve(promessa),
      new Promise(resolve => setTimeout(() => resolve(null), ms || 6000))
    ]).catch(() => null);
  }

  function catalogo() {
    return (typeof LIVROS !== "undefined" && Array.isArray(LIVROS)) ? LIVROS : [];
  }

  /* Junta os livros do painel admin ao catálogo local (mesma regra do
     index e do checkout — a junção mora em js/catalogo.js). */
  function aplicarExtras(extras, autoritativo) {
    if (!window.CatalogoLoja) return false;
    return window.CatalogoLoja.aplicarExtras(extras, autoritativo);
  }

  function lerCache(chave) {
    try { const s = localStorage.getItem(chave); return s ? JSON.parse(s) : null; }
    catch (e) { return null; }
  }
  function gravarCache(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {}
  }

  async function carregarCatalogo() {
    // 1) cache local da vitrine: vale na hora, sem esperar a rede.
    aplicarExtras(lerCache(CACHE_CAT) || [], false);
    // 2) resposta fresca do Firestore.
    if (!(window.Auth && window.Auth.configurado && window.Auth.lerCatalogo)) return;
    const extras = await comLimite(window.Auth.lerCatalogo(), 8000);
    if (Array.isArray(extras) && extras.length) {
      aplicarExtras(extras, true);
      // Regrava o cache que o checkout lê de forma síncrona: sem isto, um
      // livro cadastrado pelo admin poderia "sumir" do carrinho na troca de
      // página (o carrinho descarta ids que ainda não estão no catálogo).
      gravarCache(CACHE_CAT, extras);
    }
  }

  /* Mapa id -> unidades bloqueadas (reservadas/vendidas), igual ao main.js. */
  function montarBloqueados(mapa) {
    const bloq = new Map();
    const agora = Date.now();
    Object.keys(mapa || {}).forEach(id => {
      const d = mapa[id] || {};
      let q = 0;
      if (d.estado === "vendido") q = (d.qtd > 0) ? Number(d.qtd) : Infinity;
      else if (d.estado === "reservado" && (!d.ate || d.ate > agora)) q = (d.qtd > 0) ? Number(d.qtd) : Infinity;
      if (q > 0) bloq.set(id, q);
    });
    return bloq;
  }

  async function carregarDisponibilidade() {
    window.__bloqueados = montarBloqueados(lerCache(CACHE_DISP) || {});
    let mapa = null;
    if (window.Auth && window.Auth.configurado && window.Auth.lerDisponibilidade) {
      mapa = await comLimite(window.Auth.lerDisponibilidade(), 8000);
    }
    // O Firebase não respondeu (null = "não sei")? Esta é a página onde o
    // pedido é fechado: pergunta direto à API do Firestore, que é mais leve
    // e não depende do SDK, antes de confiar no cache antigo.
    if (!(mapa && typeof mapa === "object") && window.CatalogoLoja) {
      mapa = await comLimite(window.CatalogoLoja.disponibilidadeRapida(6000), 6000);
    }
    if (mapa && typeof mapa === "object") {
      gravarCache(CACHE_DISP, mapa);
      window.__bloqueados = montarBloqueados(mapa);
    }
  }

  /* Quanto ainda dá para vender de um livro. Publicado em window para que o
     carrinho (js/cart.js) respeite o mesmo limite ao montar o pedido. */
  function estoqueDisponivel(livro) {
    const mapa = window.__bloqueados;
    const bloq = (mapa && window.idLivro) ? (mapa.get(window.idLivro(livro)) || 0) : 0;
    return Math.max(0, (livro.estoque || 0) - bloq);
  }
  window.estoqueDisponivel = estoqueDisponivel;

  /* ============================================================
     3. DE-PARA: id do catálogo do Meta -> livro da loja
     ------------------------------------------------------------
     O feed encurta ids com mais de 50 caracteres (limite do Google, que o
     Meta herda ao ler o mesmo feed). Então o id que volta na URL pode ser o
     encurtado — precisamos reconhecer os dois.
     (Mesma conta de functions/api/feed.js e js/analytics.js.)
     ============================================================ */

  function hashCurto(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  function idParaFeed(id) {
    id = String(id || "");
    if (id.length <= 50) return id;
    const sufixo = "-" + hashCurto(id);
    return id.slice(0, 50 - sufixo.length) + sufixo;
  }
  function slug(texto) {
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function indiceDeLivros() {
    const mapa = new Map();
    const guardar = (chave, livro) => {
      const k = String(chave || "").toLowerCase();
      if (k && !mapa.has(k)) mapa.set(k, livro);
    };
    catalogo().forEach(livro => {
      const id = window.idLivro ? window.idLivro(livro) : livro.id;
      guardar(id, livro);
      guardar(idParaFeed(id), livro);
      guardar(slug(id), livro);
    });
    return mapa;
  }

  /* Resolve a lista pedida pelo Meta contra o catálogo e o estoque real.
     Devolve o que dá para vender + a lista de avisos para o cliente. */
  function resolver(pedidos) {
    const indice = indiceDeLivros();
    const itens = [];
    const avisos = [];

    pedidos.forEach(pedido => {
      const chave = String(pedido.rid || "").toLowerCase();
      const livro = indice.get(chave) || indice.get(slug(chave)) || null;

      if (!livro) {
        avisos.push({ tipo: "sumiu", titulo: "" });
        return;
      }
      const max = estoqueDisponivel(livro);
      if (max <= 0) {
        avisos.push({ tipo: "esgotado", titulo: livro.titulo || "" });
        return;
      }
      const qty = Math.min(pedido.qty, max);
      if (qty < pedido.qty) {
        avisos.push({ tipo: "menos", titulo: livro.titulo || "", qty: qty });
      }
      itens.push({ id: window.idLivro(livro), qty: qty, livro: livro });
    });

    return { itens, avisos };
  }

  /* ============================================================
     4. TELA
     ============================================================ */

  function mostrarAcao(el) {
    [acaoContinuar, acaoLogin, acaoCadastro, acaoVazio].forEach(x => {
      if (x) x.hidden = (x !== el);
    });
  }

  function textoAviso(a) {
    if (a.tipo === "esgotado") {
      return a.titulo
        ? `<strong>${esc(a.titulo)}</strong> acabou de ser vendido e saiu da estante.`
        : "Um dos livros acabou de ser vendido e saiu da estante.";
    }
    if (a.tipo === "menos") {
      const sobra = a.qty > 1 ? `sobraram ${a.qty} unidades` : "sobrou 1 unidade";
      return `De <strong>${esc(a.titulo)}</strong> ${sobra} — ajustamos a quantidade do seu carrinho.`;
    }
    return "Um dos livros do link não está mais no catálogo da loja.";
  }

  function renderAvisos(avisos, titulo) {
    if (!elAvisos) return;
    const blocos = [];

    if (avisos.length) {
      blocos.push(
        `<div class="pagamento-aviso mc-aviso">` +
        `<strong>${esc(titulo || "Uma coisinha mudou:")}</strong><ul class="mc-aviso-lista">` +
        avisos.map(a => `<li>${textoAviso(a)}</li>`).join("") +
        `</ul>Nossos livros são de segunda mão e quase todos têm cópia única — ` +
        `por isso a estante muda rápido.</div>`);
    }

    if (trocouCarrinho) {
      blocos.push(
        `<div class="pagamento-demo mc-aviso-troca">` +
        `O seu carrinho antigo do site foi <strong>substituído</strong> pelos livros ` +
        `deste link — é assim que o pedido chega igualzinho ao que você escolheu por lá. ` +
        `Quer os dois? Finalize este e depois volte à estante.</div>`);
    }

    elAvisos.innerHTML = blocos.join("");
  }

  function renderResumo(itens) {
    if (!elResumo || !elItens) return;
    const dados = Carrinho.resolverLista(itens.map(i => ({ id: i.id, qty: i.qty })), false);

    elItens.innerHTML = dados.itens.map(item => {
      const base = Precos.precoNumerico(item.livro.preco);
      const emPromo = Precos.promoAtiva() && item.precoUnit < base;
      const src = window.Util ? window.Util.imagemSrcSegura(item.livro.imagem) : item.livro.imagem;
      const capa = src
        ? `<img src="${esc(src)}" alt="" loading="lazy">`
        : `<span class="resumo-capa-fallback">${esc((item.livro.titulo || "?").charAt(0))}</span>`;
      const condicao = item.livro.condicao
        ? ` <span class="ci-condicao">${item.livro.condicao === "novo" ? "Novo" : "Usado"}</span>` : "";
      return `
        <div class="resumo-item">
          <div class="resumo-capa">${capa}<span class="resumo-qtd">${item.qty}</span></div>
          <div class="resumo-item-info">
            <p class="resumo-item-titulo">${esc(item.livro.titulo)}${condicao}</p>
            <p class="resumo-item-autor">${esc(item.livro.autor)}</p>
          </div>
          <div class="resumo-item-preco">
            ${emPromo ? `<s>${Precos.formatarBRL(base * item.qty)}</s>` : ""}
            <strong>${Precos.formatarBRL(item.precoLinha)}</strong>
          </div>
        </div>`;
    }).join("");

    if (elPromo) {
      if (Precos.promoAtiva()) {
        elPromo.hidden = false;
        elPromo.innerHTML = `<strong>${esc(Precos.nomePromo())}:</strong> descontos já aplicados` +
          (Precos.dataFimPromo() ? " · válido até " + esc(Precos.dataFimPromo()) : "") + ".";
      } else {
        elPromo.hidden = true;
      }
    }

    if (elSubtotal) elSubtotal.textContent = Precos.formatarBRL(dados.subtotal);
    elResumo.hidden = false;
  }

  function definirCabecalho(titulo, sub) {
    if (elTitulo) elTitulo.textContent = titulo;
    if (elSub) elSub.innerHTML = sub;
  }

  /* ============================================================
     5. LOGIN / CADASTRO
     ============================================================ */

  // Só exige conta quando o login está configurado E a loja pediu isso.
  function exigeConta() {
    return !!(CFG.pedidos && CFG.pedidos.exigirConta) &&
           !!(window.Auth && window.Auth.configurado);
  }

  function usuario() {
    return (window.Auth && window.Auth.usuario) ? window.Auth.usuario() : null;
  }

  /* Espera o Firebase dizer se há alguém logado (com limite de tempo: se o
     login estiver fora do ar, a página segue e mostra o convite de entrar). */
  function esperarAuth(ms) {
    return new Promise(resolve => {
      if (!(window.Auth && window.Auth.configurado)) return resolve(null);
      if (window.Auth.pronto) return resolve(usuario());
      let feito = false;
      let parar = null;
      const terminar = () => {
        if (feito) return;
        feito = true;
        try { if (parar) parar(); } catch (e) {}
        resolve(usuario());
      };
      parar = window.Auth.onChange(() => { if (window.Auth.pronto) terminar(); });
      setTimeout(terminar, ms || 9000);
    });
  }

  /* Navegador embutido do Instagram/Facebook: o login do Google costuma ser
     recusado dentro dele ("este navegador pode não ser seguro"). */
  function navegadorDeApp() {
    const ua = String(navigator.userAgent || "");
    return /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Line\//i.test(ua);
  }

  /* Guarda esta URL (com os produtos) para voltar aqui depois do cadastro. */
  function guardarRetorno() {
    try { sessionStorage.setItem("bookverse_retorno", location.href); } catch (e) {}
  }

  async function cadastroCompleto() {
    if (!(window.Auth && window.Auth.cadastroCompleto)) return true;
    const ok = await comLimite(window.Auth.cadastroCompleto(), 7000);
    // Sem resposta (rede lenta): não trava o cliente aqui — o checkout
    // continua conferindo os dados e diz exatamente o que falta.
    return ok === null ? true : !!ok;
  }

  /* ============================================================
     6. AÇÃO FINAL: monta o carrinho e vai para o checkout
     ============================================================ */

  async function irParaOPagamento() {
    if (indo || !itensFinais.length) return;
    indo = true;

    const btn = document.getElementById("mc-btn-continuar");
    const nota = document.getElementById("mc-continuar-nota");
    if (btn) { btn.disabled = true; btn.textContent = "Preparando seu carrinho…"; }
    if (nota) nota.hidden = false;

    // Compra direta pendente atrapalharia: o checkout mostraria só aquele livro.
    try { sessionStorage.removeItem("bookverse_compra_direta"); } catch (e) {}

    const itens = itensFinais.map(i => ({ id: i.id, qty: i.qty }));
    Carrinho.substituir(itens);

    // Marca do pedido: a origem (catálogo do Meta). O checkout leva isso para
    // o e-mail do pedido e para o histórico, para a loja saber de onde veio.
    try {
      sessionStorage.setItem("bookverse_origem", "meta");
      sessionStorage.removeItem("bookverse_retorno");
    } catch (e) {}

    // Salva o carrinho na conta também: sem isso, o carrinho antigo guardado
    // no Firestore poderia sobrescrever este ao voltar para a vitrine.
    if (usuario() && window.Auth.salvarCarrinho) {
      await comLimite(window.Auth.salvarCarrinho(itens), 3500);
    }

    // replace() em vez de href: o "voltar" do celular sai para o Instagram,
    // em vez de cair de novo nesta página e reabrir o carrinho em loop.
    location.replace("checkout.html");
  }

  /* ============================================================
     7. DECISÃO: o que mostrar depois de montar o carrinho
     ============================================================ */

  async function decidir() {
    // Contas desligadas na configuração: segue direto.
    if (!exigeConta()) {
      mostrarAcao(acaoContinuar);
      definirCabecalho("Seu carrinho está pronto", "Confira os livros e siga para o pagamento.");
      if (!houveAjuste) agendarAutomatico();
      return;
    }

    if (!usuario()) {
      mostrarAcao(acaoLogin);
      definirCabecalho("Seu carrinho está guardado",
        "Entre na sua conta BookVerse para finalizar — os livros continuam reservados aqui.");
      // O "copiar link" só faz sentido dentro do navegador do app, onde o
      // login do Google costuma ser recusado e a saída é abrir no Chrome/Safari.
      const noApp = navegadorDeApp();
      const avisoApp = document.getElementById("mc-aviso-app");
      if (avisoApp) avisoApp.hidden = !noApp;
      const btnLink = document.getElementById("mc-btn-copiar");
      if (btnLink) btnLink.hidden = !noApp;
      guardarRetorno();
      return;
    }

    if (!(await cadastroCompleto())) {
      mostrarAcao(acaoCadastro);
      definirCabecalho("Seu carrinho está guardado",
        "Falta só concluir seu cadastro — depois voltamos direto para cá.");
      guardarRetorno();
      return;
    }

    mostrarAcao(acaoContinuar);
    definirCabecalho("Seu carrinho está pronto", "Confira os livros e siga para o pagamento.");
    if (!houveAjuste) agendarAutomatico();
  }

  /* Com tudo certo (logado, cadastro completo e nenhum ajuste no carrinho),
     seguimos sozinhos para o pagamento — é o que o cliente espera ao tocar
     em "Comprar" no Instagram. O botão continua ali como plano B. */
  function agendarAutomatico() {
    const nota = document.getElementById("mc-continuar-nota");
    if (nota) nota.hidden = false;
    setTimeout(() => { irParaOPagamento(); }, 1200);
  }

  /* ============================================================
     8. CAMINHOS SEM PRODUTOS / SEM ESTOQUE
     ============================================================ */

  function semProdutos() {
    if (elCarregando) elCarregando.hidden = true;
    if (elConteudo) elConteudo.hidden = false;
    if (elResumo) elResumo.hidden = true;
    if (elAvisos) elAvisos.innerHTML = "";

    // O carrinho do site já tem itens? Então o link provavelmente foi aberto
    // solto — oferecemos continuar de onde a pessoa parou.
    let temCarrinho = false;
    try { temCarrinho = !Carrinho.resolver().vazio; } catch (e) {}

    if (temCarrinho) {
      itensFinais = Carrinho.resolver().itens.map(i => ({ id: i.id, qty: i.qty, livro: i.livro }));
      renderResumo(itensFinais);
      definirCabecalho("Você já tem livros no carrinho", "Siga para o pagamento quando quiser.");
      decidir();
      return;
    }

    definirCabecalho("Seu carrinho está vazio", "Escolha seus livros na estante — leva menos de um minuto.");
    const t = document.getElementById("mc-vazio-titulo");
    const p = document.getElementById("mc-vazio-texto");
    if (t) t.textContent = "Nenhum livro neste link";
    if (p) p.innerHTML = "O link que você abriu não trouxe nenhum livro. " +
      "Sem problema: a estante inteira está a um toque daqui.";
    mostrarAcao(acaoVazio);
  }

  function nadaDisponivel(avisos) {
    if (elResumo) elResumo.hidden = true;
    renderAvisos(avisos, "O que aconteceu:");
    definirCabecalho("Esses exemplares já saíram",
      "Mas a estante muda toda semana — vem ver o que chegou.");
    // O aviso acima já explicou o motivo — aqui vale o convite, sem repetir.
    const t = document.getElementById("mc-vazio-titulo");
    const p = document.getElementById("mc-vazio-texto");
    if (t) t.textContent = "Vamos achar outro livro para você";
    if (p) p.innerHTML = "Chegam títulos novos toda semana, e a maioria custa " +
      "menos que um lanche. Dá uma olhada no que está na estante agora.";
    mostrarAcao(acaoVazio);
  }

  /* ============================================================
     9. LIGAÇÕES DOS BOTÕES
     ============================================================ */

  const btnContinuar = document.getElementById("mc-btn-continuar");
  if (btnContinuar) btnContinuar.addEventListener("click", irParaOPagamento);

  const btnCadastro = document.getElementById("mc-btn-cadastro");
  if (btnCadastro) btnCadastro.addEventListener("click", guardarRetorno);

  const btnCopiar = document.getElementById("mc-btn-copiar");
  if (btnCopiar) btnCopiar.addEventListener("click", async () => {
    const original = btnCopiar.textContent;
    try {
      await navigator.clipboard.writeText(location.href);
      btnCopiar.textContent = "Link copiado!";
    } catch (e) {
      window.prompt("Copie o link do seu carrinho:", location.href);
      return;
    }
    setTimeout(() => { btnCopiar.textContent = original; }, 2200);
  });

  const btnGoogle = document.getElementById("mc-btn-google");
  if (btnGoogle) btnGoogle.addEventListener("click", async () => {
    const erro = document.getElementById("mc-erro-login");
    if (erro) erro.hidden = true;
    btnGoogle.disabled = true;
    guardarRetorno();
    try {
      const user = await window.Auth.entrarComGoogle();
      // Login por redirecionamento: a página navega para o Google e volta
      // depois — não há nada a fazer agora.
      if (!user) { btnGoogle.disabled = false; return; }
      await decidir();
    } catch (e) {
      if (erro) {
        erro.hidden = false;
        erro.textContent = (e && e.code === "auth/unauthorized-domain")
          ? "Este endereço do site ainda não está liberado para login. Avise a loja."
          : (navegadorDeApp()
            ? "O login não abriu por aqui. Abra este link no seu navegador (Chrome/Safari) e tente de novo — seu carrinho continua o mesmo."
            : "Não foi possível entrar com o Google agora. Tente novamente.");
      }
    } finally {
      btnGoogle.disabled = false;
    }
  });

  /* ============================================================
     10. INÍCIO
     ============================================================ */

  async function iniciar() {
    if (elOrigem) elOrigem.hidden = false;

    const pedidos = produtosDaURL();

    // Guarda a intenção ANTES de qualquer login: assim um redirecionamento
    // do Google (ou uma passada pelo cadastro) volta exatamente para cá.
    guardarRetorno();

    if (!pedidos.length) { semProdutos(); return; }

    await Promise.all([
      carregarCatalogo(),
      carregarDisponibilidade(),
      esperarAuth(9000)
    ]);

    const { itens, avisos } = resolver(pedidos);
    itensFinais = itens;
    houveAjuste = avisos.length > 0;

    // O cliente já tinha um carrinho diferente aberto no site? O Meta exige
    // que o pedido saia exatamente com o que veio no link, então trocamos —
    // e avisamos, para ninguém achar que perdeu os livros de antes.
    try {
      const atual = Carrinho.resolver();
      if (!atual.vazio) {
        const antes  = atual.itens.map(i => i.id + "x" + i.qty).sort().join(",");
        const depois = itens.map(i => i.id + "x" + i.qty).sort().join(",");
        trocouCarrinho = antes !== depois;
      }
    } catch (e) {}

    if (elCarregando) elCarregando.hidden = true;
    if (elConteudo) elConteudo.hidden = false;

    if (!itens.length) { nadaDisponivel(avisos); return; }

    renderAvisos(avisos);
    renderResumo(itens);
    await decidir();
  }

  iniciar();
})();
