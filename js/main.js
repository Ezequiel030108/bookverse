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

/* Quantos livros aparecem no billboard do topo. */
const MAX_DESTAQUES = 6;
/* Intervalo de troca automática do billboard (ms). */
const INTERVALO_HERO = 6500;

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

  // Modo normal: hero + fileiras
  document.body.classList.remove("modo-busca");
  semResultados.hidden = true;

  const destaques = LIVROS.filter(l => ehNovidade(l) && disponivel(l)).slice(0, MAX_DESTAQUES);
  montarHero(destaques);

  const novidades = LIVROS.filter(l => ehNovidade(l) && disponivel(l));
  if (novidades.length > 0) {
    catalogo.appendChild(
      criarFileira("Novidades da Semana", novidades, { seloNovo: true, etiqueta: "✨ Acabou de chegar" })
    );
  }

  const generos = [...ORDEM_GENEROS];
  LIVROS.forEach(l => { const g = l.genero || "Outros"; if (!generos.includes(g)) generos.push(g); });

  generos.forEach(genero => {
    const lista = LIVROS.filter(l => (l.genero || "Outros") === genero && disponivel(l));
    if (lista.length === 0) return;
    catalogo.appendChild(criarFileira(genero, lista));
  });
}

/* ---------- Hero billboard (scroll-snap) ---------- */
/*
  A técnica correta:
  - .hero-janela: overflow-x:auto + scroll-snap-type:x mandatory
    (clipa os slides e permite swipe nativo)
  - .hero-palco: display:grid, grid-auto-columns:100%
    (cada slide ocupa 100% da janela — sem bugs de % em flex)
  - Setas e pontos: chamam heroJanela.scrollTo({ left: i × width })
  - O scroll nativo do mobile já funciona; as setas adicionam suporte desktop
*/

let heroIndice = 0;
let heroTimer  = null;
let heroLista  = [];

function montarHero(destaques) {
  heroLista = destaques;
  heroPalco.innerHTML = "";
  heroPontosEl.innerHTML = "";

  if (destaques.length === 0) { hero.hidden = true; return; }
  hero.hidden = false;

  destaques.forEach((livro, i) => {
    const slide = document.createElement("article");
    slide.className = "hero-slide";

    const fundo = livro.imagem
      ? `<div class="hero-fundo" style="background-image:url('${livro.imagem}')"></div>`
      : `<div class="hero-fundo hero-fundo-cor ${varianteFallback(livro.titulo)}"></div>`;

    // Trunca sinopse para não explodir o layout mobile
    const sinopse = (livro.sinopse || "").substring(0, 160) + ((livro.sinopse || "").length > 160 ? "…" : "");

    slide.innerHTML = `
      ${fundo}
      <div class="hero-veu"></div>
      <div class="hero-conteudo">
        <div class="hero-capa-wrap">${capaHTML(livro, false)}</div>
        <div class="hero-texto">
          <span class="hero-chip">✨ Novidade</span>
          <h2 class="hero-livro-titulo">${livro.titulo}</h2>
          <p class="hero-livro-autor">${livro.autor}</p>
          <p class="hero-livro-sinopse">${sinopse}</p>
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

    // Ponto indicador
    const ponto = document.createElement("button");
    ponto.type = "button";
    ponto.className = "hero-ponto";
    ponto.setAttribute("role", "tab");
    ponto.setAttribute("aria-label", `Destaque ${i + 1}: ${livro.titulo}`);
    ponto.addEventListener("click", () => irParaHero(i, true));
    heroPontosEl.appendChild(ponto);
  });

  heroIndice = 0;
  atualizarPontosHero();
  iniciarHeroTimer();

  // Atualiza os pontos quando o usuário desliza no mobile
  let scrollEndTimer;
  heroJanela.addEventListener("scroll", () => {
    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      const w = heroJanela.offsetWidth;
      if (!w) return;
      const novoIdx = Math.round(heroJanela.scrollLeft / w);
      if (novoIdx !== heroIndice && novoIdx >= 0 && novoIdx < heroLista.length) {
        heroIndice = novoIdx;
        atualizarPontosHero();
        iniciarHeroTimer();
      }
    }, 80);
  }, { passive: true });
}

function irParaHero(i, manual = false) {
  if (!heroLista.length) return;
  heroIndice = ((i % heroLista.length) + heroLista.length) % heroLista.length;
  heroJanela.scrollTo({ left: heroIndice * heroJanela.offsetWidth, behavior: "smooth" });
  atualizarPontosHero();
  if (manual) iniciarHeroTimer();
}

function atualizarPontosHero() {
  [...heroPontosEl.children].forEach((p, i) => {
    p.classList.toggle("ativo", i === heroIndice);
    p.setAttribute("aria-selected", i === heroIndice ? "true" : "false");
  });
}

function iniciarHeroTimer() {
  pararHero();
  if (heroLista.length > 1) {
    heroTimer = setInterval(() => irParaHero(heroIndice + 1), INTERVALO_HERO);
  }
}

function pararHero() {
  if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
}

// Setas do hero
document.querySelector(".hero-ant").addEventListener("click", () => irParaHero(heroIndice - 1, true));
document.querySelector(".hero-prox").addEventListener("click", () => irParaHero(heroIndice + 1, true));

hero.addEventListener("mouseenter", pararHero);
hero.addEventListener("mouseleave", iniciarHeroTimer);

/* ---------- Busca: sincroniza os dois campos (desktop + mobile) ---------- */

function sincronizarBusca(origem) {
  const val = origem.value;
  if (origem === campoBusca && campoBuscaMob)  campoBuscaMob.value  = val;
  if (origem === campoBuscaMob && campoBusca)  campoBusca.value     = val;
  renderizar(val);
}

campoBusca.addEventListener("input",    () => sincronizarBusca(campoBusca));
campoBuscaMob.addEventListener("input", () => sincronizarBusca(campoBuscaMob));

/* ---------- Toggle de busca no mobile ---------- */

btnBuscaToggle.addEventListener("click", () => {
  const aberta = topbarBuscaMob.getAttribute("aria-hidden") === "false";
  if (aberta) {
    fecharBuscaMobile();
  } else {
    topbarBuscaMob.setAttribute("aria-hidden", "false");
    topbarBuscaMob.classList.add("aberta");
    btnBuscaToggle.setAttribute("aria-expanded", "true");
    campoBuscaMob.focus();
  }
});

btnCancelar.addEventListener("click", () => {
  campoBuscaMob.value = "";
  campoBusca.value    = "";
  fecharBuscaMobile();
  renderizar("");
});

function fecharBuscaMobile() {
  topbarBuscaMob.setAttribute("aria-hidden", "true");
  topbarBuscaMob.classList.remove("aberta");
  btnBuscaToggle.setAttribute("aria-expanded", "false");
}

/* ---------- Topbar: fica sólida ao rolar ---------- */
window.addEventListener("scroll", () => {
  topbar.classList.toggle("rolado", window.scrollY > 60);
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
