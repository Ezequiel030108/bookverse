/* ============================================================
   BOOKVERSE — LÓGICA DO SITE
   Layout estilo Netflix: hero billboard rotativo + fileiras
   (carrosséis) que rolam para o lado por categoria.
   ============================================================ */

/* ---------- CONFIGURAÇÃO RÁPIDA ---------- */
const INSTAGRAM_USUARIO = "mybookverse.pb";

const ORDEM_GENEROS = [
  "Finanças & Negócios",
  "Autoajuda & Desenvolvimento Pessoal",
  "Ciência & Curiosidades",
  "Filosofia",
  "Clássicos da Literatura",
  "Romance & Literatura",
  "Mangás"
];

/* Quantos livros aparecem no carrossel de novidades do topo. */
const MAX_DESTAQUES = 10;
/* Intervalo do auto-play do carrossel (ms) — estilo "stories". */
const INTERVALO_HERO = 5000;

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

/* ---------- Utilidades ---------- */

function normalizar(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function ehNovidade(livro) {
  if (!livro.novoAte) return false;
  return new Date() <= new Date(livro.novoAte + "T23:59:59");
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

function disponivel(livro) { return livro.estoque > 0; }

/* ---------- Cards das fileiras ---------- */

function criarCard(livro, indice, seloNovo) {
  const card = document.createElement("article");
  card.className = "card-livro";
  card.style.setProperty("--atraso", (Math.min(indice, 8) * 0.05) + "s");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `${livro.titulo} — ${livro.autor}`);

  // Selo só para o que é raro e relevante: novidade.
  // Como quase todo livro de sebo é exemplar único, marcar estoque em
  // todo card vira ruído — a condição/estoque fica no modal de detalhes.
  const eNovo = seloNovo || ehNovidade(livro);
  const seloHTML = eNovo ? `<span class="selo novo">Novo</span>` : "";

  card.innerHTML = `
    <div class="capa">
      ${seloHTML}
      ${capaHTML(livro)}
      <div class="capa-overlay" aria-hidden="true">
        <span class="overlay-ver">Ver detalhes</span>
      </div>
    </div>
    <div class="info-livro">
      <h3 class="info-titulo">${livro.titulo}</h3>
      <p class="info-autor">${livro.autor}</p>
      <p class="info-preco">${livro.preco}</p>
    </div>
  `;

  const abrir = () => abrirModal(livro);
  card.addEventListener("click", abrir);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); }
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

  // O carrossel do topo é a ÚNICA seção de novidades — sem fileira duplicada.
  const novidades = LIVROS.filter(l => ehNovidade(l) && disponivel(l)).slice(0, MAX_DESTAQUES);
  montarHero(novidades);

  const generos = [...ORDEM_GENEROS];
  LIVROS.forEach(l => { const g = l.genero || "Outros"; if (!generos.includes(g)) generos.push(g); });

  generos.forEach(genero => {
    const lista = LIVROS.filter(l => (l.genero || "Outros") === genero && disponivel(l));
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

function montarHero(destaques) {
  heroLista = destaques;
  heroPalco.innerHTML = "";
  heroPontosEl.innerHTML = "";

  if (destaques.length === 0) { hero.hidden = true; pararHero(); return; }
  hero.hidden = false;

  destaques.forEach((livro, i) => {
    const slide = document.createElement("article");
    slide.className = "hero-slide";
    slide.innerHTML = `
      <div class="hero-conteudo">
        <div class="hero-capa-wrap">${capaHTML(livro, false)}</div>
        <div class="hero-texto">
          <h2 class="hero-livro-titulo">${livro.titulo}</h2>
          <p class="hero-livro-autor">${livro.autor}</p>
          <div class="hero-acoes">
            <span class="hero-preco">${livro.preco}</span>
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
  agendarAuto(INTERVALO_HERO);
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
  modal.querySelector("[data-preco]").textContent     = livro.preco;

  const capa = modal.querySelector(".modal-capa");
  capa.innerHTML = livro.imagem
    ? `<img src="${livro.imagem}" alt="Capa de ${livro.titulo}" />`
    : `<div class="capa-fallback ${varianteFallback(livro.titulo)}">${livro.titulo.charAt(0).toUpperCase()}</div>`;

  const textoBtn = botaoIG.querySelector(".botao-instagram-texto");
  if (livro.estoque <= 0) {
    botaoIG.classList.add("desativado");
    if (textoBtn) textoBtn.textContent = "Indisponível";
    botaoIG.removeAttribute("href");
  } else {
    botaoIG.classList.remove("desativado");
    if (textoBtn) textoBtn.textContent = "Pedir pelo Instagram";
    botaoIG.href = linkInstagram();
  }

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

/* ---------- Inicialização ---------- */
document.getElementById("ano-atual").textContent = new Date().getFullYear();
renderizar("");
