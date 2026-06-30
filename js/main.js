/* ============================================================
   BOOKVERSE — LÓGICA DO SITE
   Layout estilo Netflix: hero billboard rotativo + fileiras
   (carrosséis) que rolam para o lado por categoria.
   ============================================================ */

/* ---------- CONFIGURAÇÃO RÁPIDA ---------- */
const INSTAGRAM_USUARIO = "mybookverse.pb";

const ORDEM_GENEROS = [
  "Clássicos da Literatura",
  "Romance & Literatura",
  "Mangás",
  "Finanças & Negócios",
  "Autoajuda & Desenvolvimento Pessoal",
  "Ciência & Curiosidades",
  "Filosofia",
  "Suspense & Terror"
];

/* Novidades = livros adicionados nos últimos DIAS_NOVIDADE dias (o código
   calcula sozinho a partir de "dataAdicao"). O carrossel tenta mostrar
   ALVO_DESTAQUES livros; se houver poucas novidades da semana, completa com
   os adicionados mais recentemente. MAX_DESTAQUES é o teto de segurança. */
const DIAS_NOVIDADE  = 7;
const ALVO_DESTAQUES = 6;
const MAX_DESTAQUES  = 10;
/* Intervalo do auto-play do carrossel (ms) — estilo "stories".
   PRIMEIRO_AUTO é mais curto para o usuário perceber logo que há mais
   novidades ao entrar. FIXAR_ULTIMO sempre aparece por último (enquanto
   estiver entre os destaques). */
const INTERVALO_HERO = 3500;
const PRIMEIRO_AUTO  = 2200;
const FIXAR_ULTIMO   = "O Anticristo";

/* ---------- Referências ---------- */
const catalogo       = document.getElementById("catalogo");
const semResultados  = document.getElementById("sem-resultados");
const campoBusca     = document.getElementById("campo-busca");
const campoBuscaMob  = document.getElementById("campo-busca-mobile");
const modal          = document.getElementById("modal");
const botaoIG        = document.getElementById("botao-instagram");
const topbar         = document.getElementById("topbar");
const hero           = document.getElementById("hero");
const heroJanela     = document.getElementById("hero-janela");
const heroPalco      = document.getElementById("hero-palco");
const heroPontosEl   = document.getElementById("hero-pontos");
const btnBuscaToggle = document.getElementById("btn-busca-toggle");
const topbarBuscaMob = document.getElementById("topbar-busca-mobile");
const btnCancelar    = document.getElementById("btn-cancelar");
const heroTitulo     = document.querySelector(".hero-titulo-secao");
const heroEyebrow    = document.querySelector(".hero-eyebrow");

/* Conjunto de livros "em destaque" (os mais recentes) — define o selo "Novo". */
let LIVROS_DESTAQUE = new Set();

/* ---------- Utilidades ---------- */

function normalizar(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/* Quando o livro foi adicionado (em ms), ou null se não informado. */
function dataAdicaoMs(livro) {
  if (!livro.dataAdicao) return null;
  const t = Date.parse(livro.dataAdicao + "T00:00:00");
  return Number.isNaN(t) ? null : t;
}
/* Dias desde a adição (Infinity se o livro não tem data). */
function diasDesdeAdicao(livro) {
  const t = dataAdicaoMs(livro);
  return t == null ? Infinity : (Date.now() - t) / 86400000;
}
/* É novidade da semana? (adicionado nos últimos DIAS_NOVIDADE dias) */
function ehNovidade(livro) {
  return diasDesdeAdicao(livro) <= DIAS_NOVIDADE;
}

/* Embaralha (Fisher-Yates) sem alterar o array original. */
function embaralhar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Monta a lista do carrossel:
   1) novidades da semana (mais recentes primeiro);
   2) se forem poucas, completa com os adicionados mais recentemente;
   3) último recurso (catálogo sem datas): alguns disponíveis quaisquer.
   Retorna também "temSemana" para decidir o título da seção. */
function calcularDestaques() {
  const disp = LIVROS.filter(disponivel);
  const porDataDesc = (a, b) => (dataAdicaoMs(b) ?? -Infinity) - (dataAdicaoMs(a) ?? -Infinity);

  const semana = disp.filter(ehNovidade).sort(porDataDesc);
  const temSemana = semana.length > 0;

  const destaques = semana.slice();
  if (destaques.length < ALVO_DESTAQUES) {
    const recentes = disp
      .filter(l => dataAdicaoMs(l) != null && !destaques.includes(l))
      .sort(porDataDesc);
    for (const l of recentes) {
      if (destaques.length >= ALVO_DESTAQUES) break;
      destaques.push(l);
    }
  }
  if (destaques.length === 0) destaques.push(...disp.slice(0, ALVO_DESTAQUES));

  return { destaques: destaques.slice(0, MAX_DESTAQUES), temSemana };
}

function rotuloEstoque(estoque) {
  if (estoque <= 0) return { texto: "Esgotado",   classe: "esgotado"   };
  if (estoque === 1) return { texto: "Último!",   classe: "ultimo"     };
  return                    { texto: "Disponível", classe: "disponivel" };
}

function varianteFallback(titulo) {
  const v = ["", "var-musgo", "var-ambar", "var-tinta"];
  let s = 0;
  for (let i = 0; i < titulo.length; i++) s += titulo.charCodeAt(i);
  return v[s % v.length];
}

function linkInstagram() {
  return `https://ig.me/m/${INSTAGRAM_USUARIO}`;
}

function capaHTML(livro, lazy = true) {
  return livro.imagem
    ? `<img src="${livro.imagem}" alt="Capa de ${livro.titulo}"${lazy ? ' loading="lazy"' : ''} />`
    : `<div class="capa-fallback ${varianteFallback(livro.titulo)}" aria-hidden="true">${livro.titulo.charAt(0).toUpperCase()}</div>`;
}

function disponivel(livro) {
  if (livro.estoque <= 0) return false;
  // Livros reservados (Pix em processamento) ou vendidos saem da loja.
  const ind = window.__indisponiveis;
  if (ind && typeof window.idLivro === "function" && ind.has(window.idLivro(livro))) return false;
  return true;
}

/* Carrega a disponibilidade (reservados/vendidos) e re-renderiza a loja. */
function carregarDisponibilidade() {
  if (!(window.Auth && window.Auth.configurado && window.Auth.lerDisponibilidade)) return;
  window.Auth.lerDisponibilidade().then(mapa => {
    const set = new Set();
    const agora = Date.now();
    Object.keys(mapa || {}).forEach(id => {
      const d = mapa[id] || {};
      if (d.estado === "vendido") set.add(id);
      else if (d.estado === "reservado" && (!d.ate || d.ate > agora)) set.add(id);
    });
    window.__indisponiveis = set;
    const termo = (campoBusca && campoBusca.value) || "";
    renderizar(termo);
  }).catch(() => {});
}

/* ---------- Promoção (configurada em js/livros.js) ----------
   Liga e desliga sozinha pelas datas de PROMOCAO. Para testar antes da
   data, abra o site com ?promo=teste no final do endereço. */

function promocaoAtiva() {
  if (typeof PROMOCAO === "undefined" || !PROMOCAO) return false;
  if (new URLSearchParams(location.search).get("promo") === "teste") return true;
  const agora = new Date();
  return (
    agora >= new Date(PROMOCAO.inicio + "T00:00:00") &&
    agora <= new Date(PROMOCAO.fim + "T23:59:59")
  );
}

/* "R$ 45,00" -> 45 (número). */
function precoNumerico(precoTexto) {
  const n = parseFloat(String(precoTexto).replace(/[^\d,]/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}
/* Arredonda para o real cheio, a favor do cliente (R$ 22,50 -> R$ 22). */
function arredondarReal(valor) { return Math.ceil(valor - 0.5); }
function formatarReal(valor) { return "R$ " + valor; }

/* Último dia da promoção por extenso (ex.: "19 de julho"). */
function dataFimPromo() {
  const meses = ["janeiro","fevereiro","março","abril","maio","junho",
                 "julho","agosto","setembro","outubro","novembro","dezembro"];
  const fim = new Date(PROMOCAO.fim + "T12:00:00");
  return fim.getDate() + " de " + meses[fim.getMonth()];
}
/* Hoje é o último dia da promoção? */
function ultimoDiaPromo() {
  const h = new Date();
  const iso = h.getFullYear() + "-" + String(h.getMonth() + 1).padStart(2, "0") +
              "-" + String(h.getDate()).padStart(2, "0");
  return iso === PROMOCAO.fim;
}
/* Preços promocionais (sozinho e na dupla). descontoMaximo limita o teto. */
function precosPromo(livro) {
  const cheio = precoNumerico(livro.preco);
  if (cheio === null) return null;
  const teto = livro.descontoMaximo || 100;
  const pctUm = Math.min(PROMOCAO.descontoUm, teto);
  const pctDupla = Math.min(PROMOCAO.descontoDupla, teto);
  return {
    um: arredondarReal(cheio * (1 - pctUm / 100)),
    dupla: arredondarReal(cheio * (1 - pctDupla / 100)),
    limitado: pctDupla < PROMOCAO.descontoDupla
  };
}
/* Preço do card: normal, ou riscado + promocional durante a promoção. */
function precoCardHTML(livro) {
  if (promocaoAtiva()) {
    const p = precosPromo(livro);
    if (p) {
      const linhaDupla = p.limitado
        ? `<p class="preco-dupla">⚽ preço especial da Copa</p>`
        : `<p class="preco-dupla">levando 2 livros: ${formatarReal(p.dupla)}</p>`;
      return `
        <p class="info-preco em-promo">
          <s class="preco-antigo">${livro.preco}</s>
          <span class="preco-promo">${formatarReal(p.um)}</span>
        </p>
        ${linhaDupla}`;
    }
  }
  return `<p class="info-preco">${livro.preco}</p>`;
}
/* Preço no carrossel (hero). */
function precoHeroHTML(livro) {
  if (promocaoAtiva()) {
    const p = precosPromo(livro);
    if (p) {
      return `<span class="hero-preco em-promo"><s>${livro.preco}</s> ${formatarReal(p.um)}</span>`;
    }
  }
  return `<span class="hero-preco">${livro.preco}</span>`;
}

/* ---------- Cards das fileiras ---------- */

function criarCard(livro, indice, seloNovo) {
  const card = document.createElement("article");
  card.className = "card-livro";
  card.style.setProperty("--atraso", (Math.min(indice, 8) * 0.05) + "s");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `${livro.titulo} — ${livro.autor}`);

  // Selo "Novo" só nos livros em destaque (os mais recentes adicionados).
  // Estoque/condição ficam no modal — marcar todo card viraria ruído.
  const eNovo = seloNovo || LIVROS_DESTAQUE.has(livro);
  const seloHTML = eNovo ? `<span class="selo novo">Novo</span>` : "";

  card.innerHTML = `
    <div class="capa">
      ${seloHTML}
      ${capaHTML(livro)}
      <div class="capa-overlay" aria-hidden="true">
        <span class="overlay-ver">Ver detalhes</span>
      </div>
      <button class="card-add" type="button" data-add-id="${idLivro(livro)}" aria-label="Adicionar ${livro.titulo} ao carrinho">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        <span>Carrinho</span>
      </button>
    </div>
    <div class="info-livro">
      <h3 class="info-titulo">${livro.titulo}</h3>
      <p class="info-autor">${livro.autor}</p>
      ${precoCardHTML(livro)}
    </div>
  `;

  const abrir = () => abrirModal(livro);
  card.addEventListener("click", abrir);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); }
  });

  // Botão "+ Carrinho": adiciona sem abrir o modal.
  const btnAdd = card.querySelector(".card-add");
  if (btnAdd) btnAdd.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!window.Carrinho) return;
    if (window.podeUsarCarrinho && !window.podeUsarCarrinho({ tipo: "carrinho", id: window.idLivro(livro) })) return;
    window.Carrinho.add(livro, 1);
    btnAdd.classList.add("adicionado");
    setTimeout(() => btnAdd.classList.remove("adicionado"), 900);
    if (window.lojaToast) window.lojaToast(`"${livro.titulo}" no carrinho`);
  });

  return card;
}

/* ---------- Fileiras (carrosséis) ---------- */

function criarFileira(titulo, livros, opts = {}) {
  const { seloNovo = false, etiqueta = "" } = opts;

  const secao = document.createElement("section");
  secao.className = "fileira" + (seloNovo ? " fileira-novidades" : "");

  // Cabeçalho: etiqueta ACIMA do título (stack vertical)
  const cab = document.createElement("div");
  cab.className = "fileira-cabecalho";
  if (etiqueta) {
    const et = document.createElement("span");
    et.className = "fileira-etiqueta";
    et.textContent = etiqueta;
    cab.appendChild(et);
  }
  const h2 = document.createElement("h2");
  h2.className = "fileira-titulo";
  h2.textContent = titulo;
  cab.appendChild(h2);
  secao.appendChild(cab);

  // Área com trilho + setas
  const area = document.createElement("div");
  area.className = "fileira-area";

  const sEsq = document.createElement("button");
  sEsq.type = "button";
  sEsq.className = "fileira-seta fileira-seta-esq";
  sEsq.setAttribute("aria-label", "Ver anteriores");
  sEsq.innerHTML = "&#8249;";

  const sDir = document.createElement("button");
  sDir.type = "button";
  sDir.className = "fileira-seta fileira-seta-dir";
  sDir.setAttribute("aria-label", "Ver mais");
  sDir.innerHTML = "&#8250;";

  const trilho = document.createElement("div");
  trilho.className = "fileira-trilho";
  livros.forEach((livro, i) => trilho.appendChild(criarCard(livro, i, seloNovo)));

  area.appendChild(sEsq);
  area.appendChild(trilho);
  area.appendChild(sDir);
  secao.appendChild(area);

  // Rola ~85% da largura visível
  const passo = () => Math.max(trilho.clientWidth * 0.85, 220);
  sEsq.addEventListener("click", () => trilho.scrollBy({ left: -passo(), behavior: "smooth" }));
  sDir.addEventListener("click", () => trilho.scrollBy({ left:  passo(), behavior: "smooth" }));

  const atualizarSetas = () => {
    const max = trilho.scrollWidth - trilho.clientWidth - 2;
    sEsq.classList.toggle("oculta", trilho.scrollLeft <= 2);
    sDir.classList.toggle("oculta", trilho.scrollLeft >= max || max <= 0);
  };
  trilho.addEventListener("scroll", atualizarSetas, { passive: true });
  requestAnimationFrame(atualizarSetas);
  setTimeout(atualizarSetas, 400);

  return secao;
}

/* ---------- Renderização principal ---------- */

function renderizar(termoBusca) {
  const termo = normalizar((termoBusca ?? "").trim());
  const buscando = termo.length > 0;

  function combina(livro) {
    if (!disponivel(livro)) return false;
    if (!termo) return true;
    return normalizar(livro.titulo + " " + livro.autor).includes(termo);
  }

  catalogo.innerHTML = "";
  pararHero();

  if (buscando) {
    // Modo busca: hero oculto, grade de resultados
    hero.hidden = true;
    document.body.classList.add("modo-busca");
    const resultados = LIVROS.filter(combina);
    if (resultados.length > 0) {
      const sec = document.createElement("section");
      sec.className = "fileira fileira-grade";
      const cab = document.createElement("div");
      cab.className = "fileira-cabecalho";
      const h2 = document.createElement("h2");
      h2.className = "fileira-titulo";
      h2.textContent = `Resultados para "${termoBusca ?? termo}"`;
      cab.appendChild(h2);
      sec.appendChild(cab);
      const grade = document.createElement("div");
      grade.className = "grade-livros";
      resultados.forEach((l, i) => grade.appendChild(criarCard(l, i)));
      sec.appendChild(grade);
      catalogo.appendChild(sec);
    }
    semResultados.hidden = resultados.length !== 0;
    return;
  }

  // Modo normal: carrossel de novidades (topo) + fileiras por gênero.
  document.body.classList.remove("modo-busca");
  semResultados.hidden = true;

  // O carrossel do topo é a ÚNICA seção de novidades.
  const { destaques, temSemana } = calcularDestaques();
  LIVROS_DESTAQUE = new Set(destaques);            // controla o selo "Novo" nos cards

  const ordem = embaralhar(destaques);             // ordem nova a cada carregamento
  // "O Anticristo" sempre por último (enquanto estiver entre os destaques)
  const iFixar = ordem.findIndex(l => l.titulo === FIXAR_ULTIMO);
  if (iFixar !== -1) ordem.push(ordem.splice(iFixar, 1)[0]);
  montarHero(ordem, temSemana);

  const generos = [...ORDEM_GENEROS];
  LIVROS.forEach(l => { const g = l.genero || "Outros"; if (!generos.includes(g)) generos.push(g); });

  generos.forEach(genero => {
    // Livros em destaque (principais/mais famosos) primeiro na fileira.
    // sort estável: os demais mantêm a ordem do arquivo livros.js.
    const lista = LIVROS.filter(l => (l.genero || "Outros") === genero && disponivel(l))
      .sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0));
    if (lista.length === 0) return;
    catalogo.appendChild(criarFileira(genero, lista));
  });
}

/* ---------- Carrossel de novidades ----------
   - Swipe nativo no mobile (scroll-snap horizontal).
   - Passa SOZINHO a cada INTERVALO_HERO e CONTINUA passando.
   - Ao interagir (swipe, seta ou bolinha), o auto-play é ADIADO e só
     volta após RETOMAR_APOS de inatividade — assim ele nunca "briga"
     com o usuário, mas retoma quando ele para de mexer.
   - As bolinhas acompanham o swipe em tempo real (rAF).
   - heroTravado evita que o scroll programático confunda o índice.         */

const heroNav      = document.querySelector(".hero-nav");
const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const RETOMAR_APOS = 9000;   // inatividade até o auto-play voltar (ms)

let heroIndice  = 0;
let heroTimer   = null;
let heroLista   = [];
let heroTravado = false;   // ignora o listener de scroll durante scroll programático
let heroTravaTimer;
let heroRaf     = false;

function montarHero(destaques, temSemana = true) {
  heroLista = destaques;
  heroPalco.innerHTML = "";
  heroPontosEl.innerHTML = "";

  if (destaques.length === 0) { hero.hidden = true; pararHero(); return; }
  hero.hidden = false;

  // Título da seção: "Novidades da Semana" se há livros desta semana;
  // senão, vira "Livros Novos" (mostrando os mais recentes adicionados).
  if (heroTitulo)  heroTitulo.textContent  = temSemana ? "Novidades da Semana" : "Livros Novos";
  if (heroEyebrow) heroEyebrow.textContent = temSemana ? "Acabou de chegar"    : "Da nossa estante";

  destaques.forEach((livro, i) => {
    const slide = document.createElement("article");
    slide.className = "hero-slide";
    slide.innerHTML = `
      <div class="hero-conteudo">
        <div class="hero-capa-wrap">${capaHTML(livro, false)}</div>
        <div class="hero-texto">
          <h2 class="hero-livro-titulo">${livro.titulo}</h2>
          <p class="hero-livro-autor">${livro.autor}</p>
          <p class="hero-livro-sinopse">${livro.sinopse || ""}</p>
          <div class="hero-acoes">
            ${precoHeroHTML(livro)}
            <button class="hero-btn" type="button">Ver detalhes</button>
          </div>
        </div>
      </div>
    `;
    slide.querySelector(".hero-btn").addEventListener("click", (e) => { e.stopPropagation(); abrirModal(livro); });
    slide.querySelector(".hero-capa-wrap").addEventListener("click", () => abrirModal(livro));
    heroPalco.appendChild(slide);

    // Bolinha indicadora
    const ponto = document.createElement("button");
    ponto.type = "button";
    ponto.className = "hero-ponto";
    ponto.setAttribute("aria-label", `Ir para a novidade ${i + 1}: ${livro.titulo}`);
    ponto.addEventListener("click", () => { irParaHero(i); adiarAuto(); });
    heroPontosEl.appendChild(ponto);
  });

  // Com 1 só novidade, não precisa de navegação
  heroNav.hidden = destaques.length <= 1;

  heroIndice = 0;
  irParaHero(0, false);
  agendarAuto(PRIMEIRO_AUTO);   // primeiro avanço mais rápido (1ª impressão)
}

function irParaHero(i, animar = true) {
  if (!heroLista.length) return;
  heroIndice = ((i % heroLista.length) + heroLista.length) % heroLista.length;
  heroTravado = true;
  heroJanela.scrollTo({
    left: heroIndice * heroJanela.clientWidth,
    behavior: (animar && !semMovimento) ? "smooth" : "auto"
  });
  atualizarPontos();
  clearTimeout(heroTravaTimer);
  heroTravaTimer = setTimeout(() => { heroTravado = false; }, animar ? 700 : 60);
}

function atualizarPontos() {
  [...heroPontosEl.children].forEach((p, i) => {
    p.classList.toggle("ativo", i === heroIndice);
    p.setAttribute("aria-current", i === heroIndice ? "true" : "false");
  });
}

/* Agenda o próximo avanço automático; ao disparar, agenda o seguinte
   (laço contínuo). */
function agendarAuto(atraso) {
  pararHero();
  if (heroLista.length <= 1) return;
  heroTimer = setTimeout(() => {
    irParaHero(heroIndice + 1);
    agendarAuto(INTERVALO_HERO);
  }, atraso);
}

function pararHero() {
  if (heroTimer) { clearTimeout(heroTimer); heroTimer = null; }
}

/* Interação manual: empurra o próximo avanço para daqui a RETOMAR_APOS.
   Cada nova interação reinicia essa contagem — sem "briga" com o usuário. */
function adiarAuto() {
  agendarAuto(RETOMAR_APOS);
}

/* Bolinhas acompanham o swipe em tempo real (sem atraso no celular).
   Não mexe no auto-play aqui: o adiamento vem dos eventos de toque/scroll
   abaixo (assim o scroll do próprio auto-play não se auto-adia). */
heroJanela.addEventListener("scroll", () => {
  if (heroTravado || heroRaf) return;
  heroRaf = true;
  requestAnimationFrame(() => {
    heroRaf = false;
    const w = heroJanela.clientWidth;
    if (!w) return;
    const idx = Math.max(0, Math.min(heroLista.length - 1, Math.round(heroJanela.scrollLeft / w)));
    if (idx !== heroIndice) { heroIndice = idx; atualizarPontos(); }
  });
}, { passive: true });

/* Início de qualquer interação manual adia o auto-play. */
["pointerdown", "touchstart", "wheel"].forEach(ev =>
  heroJanela.addEventListener(ev, adiarAuto, { passive: true })
);

/* Setas: navegam e adiam (não param de vez). */
document.querySelector(".hero-ant").addEventListener("click", () => { irParaHero(heroIndice - 1); adiarAuto(); });
document.querySelector(".hero-prox").addEventListener("click", () => { irParaHero(heroIndice + 1); adiarAuto(); });

/* No desktop, o mouse por cima pausa; ao sair, retoma. */
hero.addEventListener("mouseenter", pararHero);
hero.addEventListener("mouseleave", () => agendarAuto(INTERVALO_HERO));

/* ---------- Busca: sincroniza os dois campos (desktop + mobile) ---------- */

function sincronizarBusca(origem) {
  const val = origem.value;
  if (origem === campoBusca && campoBuscaMob)  campoBuscaMob.value  = val;
  if (origem === campoBuscaMob && campoBusca)  campoBusca.value     = val;
  renderizar(val);
}

campoBusca.addEventListener("input",    () => sincronizarBusca(campoBusca));
campoBuscaMob.addEventListener("input", () => sincronizarBusca(campoBuscaMob));

/* ---------- Busca no mobile: abrir / fechar ---------- */

function abrirBuscaMobile(focar) {
  topbarBuscaMob.setAttribute("aria-hidden", "false");
  topbarBuscaMob.classList.add("aberta");
  btnBuscaToggle.setAttribute("aria-expanded", "true");
  if (focar) campoBuscaMob.focus();
}

function fecharBuscaMobile() {
  topbarBuscaMob.setAttribute("aria-hidden", "true");
  topbarBuscaMob.classList.remove("aberta");
  btnBuscaToggle.setAttribute("aria-expanded", "false");
}

// O ícone de lupa continua abrindo a busca manualmente (e foca para digitar)
btnBuscaToggle.addEventListener("click", () => {
  if (topbarBuscaMob.classList.contains("aberta")) fecharBuscaMobile();
  else abrirBuscaMobile(true);
});

btnCancelar.addEventListener("click", () => {
  campoBuscaMob.value = "";
  campoBusca.value    = "";
  fecharBuscaMobile();
  campoBuscaMob.blur();
  renderizar("");
});

/* ---------- Rolagem: barra sólida + busca que surge ao subir ----------
   A caixa NÃO aparece na tela inicial. Quando o usuário já desceu um pouco
   e rola para CIMA, ela surge de ponta a ponta no topo, pronta para digitar
   (como se aparecesse para ele). Ao descer, ela some.                       */

const LIMIAR_BUSCA = 300;            // só revela depois de ter descido um tanto
let ultimoY = window.scrollY;

window.addEventListener("scroll", () => {
  const y = window.scrollY;
  topbar.classList.toggle("rolado", y > 60);

  // Não interfere se o usuário está digitando ou já tem texto na busca
  const digitando = document.activeElement === campoBuscaMob || campoBuscaMob.value.length > 0;
  if (!digitando) {
    if (y <= LIMIAR_BUSCA)        fecharBuscaMobile();   // perto do topo: escondida
    else if (y < ultimoY - 4)     abrirBuscaMobile(false); // subindo: revela (sem focar)
    else if (y > ultimoY + 4)     fecharBuscaMobile();   // descendo: esconde
  }
  ultimoY = y;
}, { passive: true });

/* ---------- Modal ---------- */

function abrirModal(livro) {
  modal.querySelector("#modal-titulo").textContent    = livro.titulo;
  modal.querySelector(".modal-autor").textContent     = livro.autor;
  modal.querySelector(".modal-sinopse").textContent   = livro.sinopse || "";
  modal.querySelector("[data-estado]").textContent    = livro.estado;
  modal.querySelector("[data-estoque]").textContent   =
    livro.estoque > 0 ? `${livro.estoque} unidade${livro.estoque > 1 ? "s" : ""}` : "Esgotado";
  const promo = promocaoAtiva() ? precosPromo(livro) : null;
  const elPreco = modal.querySelector("[data-preco]");
  if (promo) {
    elPreco.innerHTML = `<s class="modal-preco-antigo">${livro.preco}</s> ${formatarReal(promo.um)}`;
  } else {
    elPreco.textContent = livro.preco;
  }
  // Nota da promoção no modal (criada/removida conforme o caso)
  let avisoPromo = modal.querySelector(".modal-promo");
  if (promo) {
    if (!avisoPromo) {
      avisoPromo = document.createElement("p");
      avisoPromo.className = "modal-promo";
      modal.querySelector(".modal-detalhes").insertAdjacentElement("afterend", avisoPromo);
    }
    avisoPromo.innerHTML = promo.limitado
      ? `⚽ <strong>${PROMOCAO.nome}:</strong> este livro participa com ${PROMOCAO.descontoUm}% de desconto. Promoção válida até ${dataFimPromo()}.`
      : `⚽ <strong>${PROMOCAO.nome}:</strong> levando 2 livros ou mais, este sai por <strong>${formatarReal(promo.dupla)}</strong> (${PROMOCAO.descontoDupla}% off). Válida até ${dataFimPromo()}.`;
  } else if (avisoPromo) {
    avisoPromo.remove();
  }

  const capa = modal.querySelector(".modal-capa");
  capa.innerHTML = livro.imagem
    ? `<img src="${livro.imagem}" alt="Capa de ${livro.titulo}" />`
    : `<div class="capa-fallback ${varianteFallback(livro.titulo)}">${livro.titulo.charAt(0).toUpperCase()}</div>`;

  // Botões de compra (carrinho / comprar agora) + Instagram como suporte
  window.__livroModal = livro;
  const semEstoque = livro.estoque <= 0;
  const btnAdd     = document.getElementById("modal-add-carrinho");
  const btnComprar = document.getElementById("modal-comprar");
  if (btnAdd) {
    btnAdd.disabled = semEstoque;
    btnAdd.textContent = semEstoque ? "Esgotado" : "Adicionar ao carrinho";
  }
  if (btnComprar) btnComprar.disabled = semEstoque;
  if (botaoIG) botaoIG.href = linkInstagram();

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function fecharModal() {
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

modal.addEventListener("click", (e) => { if (e.target.hasAttribute("data-fechar-modal")) fecharModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) fecharModal(); });

/* ---------- Decoração da promoção (tema Copa do Mundo) ----------
   Só acontece com a promoção ativa e some sozinho quando ela acaba —
   nada fica "sujo" no site fora do período. */
function ativarModoPromocao() {
  if (!promocaoAtiva()) return;
  document.body.classList.add("modo-promo");

  // Vitrine: faixa de ponta a ponta, logo abaixo do cabeçalho.
  const vitrine = document.createElement("section");
  vitrine.className = "vitrine-promo";
  vitrine.setAttribute("aria-label", "Promoção " + PROMOCAO.nome);
  vitrine.innerHTML = `
    <div class="vitrine-card">
      <span class="vitrine-glow" aria-hidden="true"></span>
      <span class="vitrine-losango" aria-hidden="true"></span>
      <div class="vitrine-conteudo">
        <div class="vitrine-head">
          <span class="vitrine-tag">
            <span class="vitrine-icone" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M7 6H5a2 2 0 0 1-2-2 1 1 0 0 1 1-1h2M17 6h2a2 2 0 0 0 2-2 1 1 0 0 0-1-1h-2"/></svg>
            </span>
            ${PROMOCAO.nome}
          </span>
          <span class="vitrine-prazo">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            ${ultimoDiaPromo() ? "Último dia!" : "Até " + dataFimPromo()}
          </span>
        </div>
        <p class="vitrine-msg">Entrou no clima da Copa? Os descontos já entram sozinhos no seu carrinho.</p>
        <div class="vitrine-ofertas">
          <div class="vitrine-oferta">
            <span class="vitrine-pct">${PROMOCAO.descontoUm}<small>% OFF</small></span>
            <span class="vitrine-oferta-txt">em qualquer livro</span>
          </div>
          <div class="vitrine-oferta destaque">
            <span class="vitrine-selo">Melhor oferta</span>
            <span class="vitrine-pct">${PROMOCAO.descontoDupla}<small>% OFF</small></span>
            <span class="vitrine-oferta-txt">levando 2 ou mais</span>
          </div>
        </div>
      </div>
    </div>
  `;
  topbar.insertAdjacentElement("afterend", vitrine);

  // Bolas de futebol discretas flutuando no fundo.
  const ceu = document.createElement("div");
  ceu.className = "ceu-bolas";
  ceu.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 7; i++) {
    const bola = document.createElement("span");
    bola.textContent = ["⚽", "🏆", "⚽", "🥅", "⚽", "🏆", "⚽"][i];
    ceu.appendChild(bola);
  }
  document.body.appendChild(ceu);

  // Mensagem especial no rodapé.
  const sub = document.querySelector(".rodape-sub");
  if (sub) sub.textContent = "É Copa do Mundo! Feito com paixão para nossos leitores ⚽🏆";
}

/* ---------- Ações de compra no modal ---------- */
(function () {
  const btnAdd     = document.getElementById("modal-add-carrinho");
  const btnComprar = document.getElementById("modal-comprar");
  if (btnAdd) btnAdd.addEventListener("click", () => {
    const l = window.__livroModal;
    if (!l || l.estoque <= 0 || !window.Carrinho) return;
    if (window.podeUsarCarrinho && !window.podeUsarCarrinho({ tipo: "carrinho", id: window.idLivro(l) })) return;
    window.Carrinho.add(l, 1);
    if (window.lojaToast) window.lojaToast(`"${l.titulo}" no carrinho`);
    fecharModal();
    if (window.abrirCarrinho) window.abrirCarrinho();
  });
  if (btnComprar) btnComprar.addEventListener("click", () => {
    const l = window.__livroModal;
    if (!l || l.estoque <= 0 || !window.Carrinho) return;
    if (window.podeUsarCarrinho && !window.podeUsarCarrinho({ tipo: "comprar", id: window.idLivro(l) })) return;
    // Compra direta: leva só este livro ao checkout, sem mexer no carrinho.
    try { sessionStorage.setItem("bookverse_compra_direta", JSON.stringify({ id: window.idLivro(l), qty: 1 })); } catch (e) {}
    window.location.href = "checkout.html";
  });
})();

/* Carrega os livros cadastrados pelo admin (Firestore) e os junta ao catálogo. */
function carregarCatalogo() {
  if (!(window.Auth && window.Auth.configurado && window.Auth.lerCatalogo)) return;
  window.Auth.lerCatalogo().then(extras => {
    if (!Array.isArray(extras) || !extras.length) return;
    const idDe = window.idLivro || (l => l.id);
    const indice = new Map();
    LIVROS.forEach((l, i) => indice.set(idDe(l), i));
    let mudou = false;
    extras.forEach(l => {
      if (!l || !l.id) return;
      if (indice.has(l.id)) {
        // Edição de um livro existente: aplica as alterações por cima do original.
        LIVROS[indice.get(l.id)] = Object.assign({}, LIVROS[indice.get(l.id)], l);
      } else {
        // Livro novo, cadastrado pelo admin.
        LIVROS.push(l);
        indice.set(l.id, LIVROS.length - 1);
      }
      mudou = true;
    });
    if (mudou) {
      const termo = (campoBusca && campoBusca.value) || "";
      renderizar(termo);
      carregarDisponibilidade();
    }
  }).catch(() => {});
}

/* ---------- Inicialização ---------- */
document.getElementById("ano-atual").textContent = new Date().getFullYear();
ativarModoPromocao();
renderizar("");
carregarDisponibilidade();   // esconde reservados/vendidos quando a lista carrega
carregarCatalogo();          // adiciona os livros cadastrados pelo admin
