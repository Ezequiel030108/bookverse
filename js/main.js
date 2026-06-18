/* ============================================================
   LÓGICA DO SITE — LAYOUT ESTILO NETFLIX
   - Hero/billboard rotativo com os destaques no topo
   - Fileiras (carrosséis) por gênero que rolam para o lado
   - Setas de navegação (desktop) + arrastar/deslizar (mobile)
   - Modal de detalhes ao clicar
   - Busca em tempo real (título / autor)
   - Monta o link do Instagram com a mensagem pronta
   ============================================================ */

/* ---------- CONFIGURAÇÃO RÁPIDA ---------- */
/* Troque aqui o @ do Instagram da livraria (sem o @).
   Esse mesmo @ aparece no cabeçalho do site —
   se mudar aqui, lembre de mudar no index.html também. */
const INSTAGRAM_USUARIO = "mybookverse.pb";

/* Ordem em que as fileiras de gênero aparecem no site.
   Todo gênero usado em livros.js deve estar listado aqui. */
const ORDEM_GENEROS = [
  "Finanças & Negócios",
  "Autoajuda & Desenvolvimento Pessoal",
  "Ciência & Curiosidades",
  "Filosofia",
  "Clássicos da Literatura",
  "Romance & Literatura",
  "Mangás"
];

/* Quantos destaques no máximo aparecem girando no billboard do topo. */
const MAX_DESTAQUES = 6;
/* De quanto em quanto tempo o billboard troca de destaque sozinho (ms). */
const INTERVALO_HERO = 6500;

/* ---------- Referências de elementos ---------- */
const catalogo     = document.getElementById("catalogo");
const semResultados= document.getElementById("sem-resultados");
const campoBusca   = document.getElementById("campo-busca");
const modal        = document.getElementById("modal");
const botaoIG      = document.getElementById("botao-instagram");
const topbar       = document.getElementById("topbar");
const hero         = document.getElementById("hero");
const heroPalco    = document.getElementById("hero-palco");
const heroPontos   = document.getElementById("hero-pontos");

/* ---------- Utilidades ---------- */

/** Remove acentos e deixa minúsculo (para a busca ignorar acentos). */
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Verifica se o livro ainda vale como novidade (campo novoAte em livros.js). */
function ehNovidade(livro) {
  if (!livro.novoAte) return false;
  return new Date() <= new Date(livro.novoAte + "T23:59:59");
}

/** Define o selo de estoque conforme a quantidade. */
function rotuloEstoque(estoque) {
  if (estoque <= 0) return { texto: "Esgotado",   classe: "esgotado"   };
  if (estoque === 1) return { texto: "Último!",   classe: "ultimo"     };
  return                    { texto: "Disponível", classe: "disponivel" };
}

/** Gera uma variação de cor para o fallback da capa (estável por título). */
function varianteFallback(titulo) {
  const variantes = ["", "var-musgo", "var-ambar", "var-tinta"];
  let soma = 0;
  for (let i = 0; i < titulo.length; i++) soma += titulo.charCodeAt(i);
  return variantes[soma % variantes.length];
}

/** Monta a mensagem de interesse para o Instagram. */
function mensagemInstagram(livro) {
  return `Olá! Tenho interesse no livro "${livro.titulo}" de ${livro.autor} (${livro.preco}). Ainda está disponível?`;
}

/** Link para o DM do Instagram. */
function linkInstagram() {
  return `https://ig.me/m/${INSTAGRAM_USUARIO}`;
}

/** HTML da capa: imagem real OU fallback bonito com a inicial do título. */
function capaHTML(livro) {
  return livro.imagem
    ? `<img src="${livro.imagem}" alt="Capa do livro ${livro.titulo}" loading="lazy" />`
    : `<div class="capa-fallback ${varianteFallback(livro.titulo)}" aria-hidden="true">${livro.titulo.charAt(0).toUpperCase()}</div>`;
}

/** Só os livros que aparecem no site (estoque > 0). */
function disponivel(livro) {
  return livro.estoque > 0;
}

/* ---------- Cards das fileiras ---------- */

function criarCard(livro, indice, seloNovo) {
  const card = document.createElement("article");
  card.className = "card-livro";
  // atraso escalonado e limitado para a fileira "entrar" suave, sem demorar
  card.style.setProperty("--atraso", (Math.min(indice, 8) * 0.04) + "s");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `${livro.titulo}, de ${livro.autor}`);

  // Nas fileiras de novidade o selo vira "Novo!"; nas demais, mostra o estoque.
  const selo = seloNovo
    ? { texto: "Novo!", classe: "novo" }
    : rotuloEstoque(livro.estoque);

  card.innerHTML = `
    <div class="capa">
      <span class="selo ${selo.classe}">${selo.texto}</span>
      ${capaHTML(livro)}
    </div>
    <div class="info-livro">
      <h3 class="info-titulo">${livro.titulo}</h3>
      <p class="info-autor">${livro.autor}</p>
      <p class="info-preco">${livro.preco}</p>
    </div>
  `;

  card.addEventListener("click", () => abrirModal(livro));
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      abrirModal(livro);
    }
  });

  return card;
}

/** Cria uma fileira (carrossel horizontal) com título e setas de navegação. */
function criarFileira(titulo, livros, opcoes = {}) {
  const { seloNovo = false, etiqueta = "" } = opcoes;

  const secao = document.createElement("section");
  secao.className = "fileira" + (seloNovo ? " fileira-novidades" : "");

  const cabecalho = document.createElement("div");
  cabecalho.className = "fileira-cabecalho";
  cabecalho.innerHTML = `
    ${etiqueta ? `<span class="fileira-etiqueta">${etiqueta}</span>` : ""}
    <h2 class="fileira-titulo">${titulo}</h2>
  `;
  secao.appendChild(cabecalho);

  // Área que rola: trilho + setas sobrepostas
  const area = document.createElement("div");
  area.className = "fileira-area";

  const setaEsq = document.createElement("button");
  setaEsq.type = "button";
  setaEsq.className = "fileira-seta fileira-seta-esq";
  setaEsq.setAttribute("aria-label", "Ver anteriores");
  setaEsq.innerHTML = "‹";

  const setaDir = document.createElement("button");
  setaDir.type = "button";
  setaDir.className = "fileira-seta fileira-seta-dir";
  setaDir.setAttribute("aria-label", "Ver mais");
  setaDir.innerHTML = "›";

  const trilho = document.createElement("div");
  trilho.className = "fileira-trilho";
  livros.forEach((livro, i) => trilho.appendChild(criarCard(livro, i, seloNovo)));

  area.appendChild(setaEsq);
  area.appendChild(trilho);
  area.appendChild(setaDir);
  secao.appendChild(area);

  // Rola ~90% da largura visível a cada clique
  const passo = () => Math.max(trilho.clientWidth * 0.9, 240);
  setaEsq.addEventListener("click", () => trilho.scrollBy({ left: -passo(), behavior: "smooth" }));
  setaDir.addEventListener("click", () => trilho.scrollBy({ left:  passo(), behavior: "smooth" }));

  // Mostra/esconde as setas conforme dá ou não para rolar mais
  const atualizarSetas = () => {
    const fim = trilho.scrollWidth - trilho.clientWidth - 2;
    setaEsq.classList.toggle("oculta", trilho.scrollLeft <= 2);
    setaDir.classList.toggle("oculta", trilho.scrollLeft >= fim);
    // Se não há o que rolar, esconde as duas
    if (trilho.scrollWidth <= trilho.clientWidth + 4) {
      setaEsq.classList.add("oculta");
      setaDir.classList.add("oculta");
    }
  };
  trilho.addEventListener("scroll", atualizarSetas, { passive: true });
  // mede depois que o layout assentou
  requestAnimationFrame(atualizarSetas);
  setTimeout(atualizarSetas, 300);

  return secao;
}

/* ---------- Renderização principal ---------- */

function renderizar() {
  const termo = normalizar(campoBusca.value.trim());
  const buscando = termo.length > 0;

  function combina(livro) {
    if (!disponivel(livro)) return false;
    if (!termo) return true;
    const alvo = normalizar(livro.titulo + " " + livro.autor);
    return alvo.includes(termo);
  }

  catalogo.innerHTML = "";
  pararHero();

  /* --- Modo busca: esconde o hero e mostra uma grade de resultados --- */
  if (buscando) {
    hero.hidden = true;
    document.body.classList.add("modo-busca");

    const resultados = LIVROS.filter(combina);
    if (resultados.length > 0) {
      const secao = document.createElement("section");
      secao.className = "fileira fileira-grade";
      secao.innerHTML = `<div class="fileira-cabecalho"><h2 class="fileira-titulo">Resultados</h2></div>`;
      const grade = document.createElement("div");
      grade.className = "grade-livros";
      resultados.forEach((livro, i) => grade.appendChild(criarCard(livro, i)));
      secao.appendChild(grade);
      catalogo.appendChild(secao);
    }
    semResultados.hidden = resultados.length !== 0;
    return;
  }

  /* --- Modo normal: hero + fileiras por gênero --- */
  document.body.classList.remove("modo-busca");
  semResultados.hidden = true;

  // Destaques = novidades disponíveis (limitadas), para o billboard do topo.
  const destaques = LIVROS.filter((l) => ehNovidade(l) && disponivel(l)).slice(0, MAX_DESTAQUES);
  montarHero(destaques);

  // Fileira "Novidades da Semana" no topo (todas as novidades disponíveis).
  const novidades = LIVROS.filter((l) => ehNovidade(l) && disponivel(l));
  if (novidades.length > 0) {
    catalogo.appendChild(
      criarFileira("Novidades da Semana", novidades, {
        seloNovo: true,
        etiqueta: "✨ Acabou de chegar"
      })
    );
  }

  // Monta a lista de gêneros: os da ordem definida + qualquer outro que apareça.
  const generos = [...ORDEM_GENEROS];
  LIVROS.forEach((livro) => {
    const g = livro.genero || "Outros";
    if (!generos.includes(g)) generos.push(g);
  });

  generos.forEach((genero) => {
    const doGenero = LIVROS.filter(
      (livro) => (livro.genero || "Outros") === genero && disponivel(livro)
    );
    if (doGenero.length === 0) return;
    catalogo.appendChild(criarFileira(genero, doGenero));
  });
}

/* ---------- Hero / Billboard rotativo ---------- */

let heroIndice = 0;
let heroTimer = null;
let heroLista = [];

function montarHero(destaques) {
  heroLista = destaques;
  heroPalco.innerHTML = "";
  heroPontos.innerHTML = "";

  if (destaques.length === 0) {
    hero.hidden = true;
    return;
  }
  hero.hidden = false;

  destaques.forEach((livro, i) => {
    const slide = document.createElement("article");
    slide.className = "hero-slide";
    slide.dataset.indice = i;

    // Fundo desfocado (a própria capa) + camada escura para o texto respirar
    const fundo = livro.imagem
      ? `<div class="hero-fundo" style="background-image:url('${livro.imagem}')"></div>`
      : `<div class="hero-fundo hero-fundo-cor ${varianteFallback(livro.titulo)}"></div>`;

    slide.innerHTML = `
      ${fundo}
      <div class="hero-veu"></div>
      <div class="hero-conteudo">
        <div class="hero-capa">${capaHTML(livro)}</div>
        <div class="hero-texto">
          <span class="hero-etiqueta">✨ Novidade</span>
          <h2 class="hero-titulo-livro">${livro.titulo}</h2>
          <p class="hero-autor">${livro.autor}</p>
          <p class="hero-sinopse">${livro.sinopse || ""}</p>
          <div class="hero-acoes">
            <span class="hero-preco">${livro.preco}</span>
            <button class="hero-botao" type="button">Ver detalhes</button>
          </div>
        </div>
      </div>
    `;

    // Clicar em qualquer lugar do slide (ou no botão) abre o modal
    slide.querySelector(".hero-botao").addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModal(livro);
    });
    slide.querySelector(".hero-capa").addEventListener("click", () => abrirModal(livro));

    heroPalco.appendChild(slide);

    // ponto indicador
    const ponto = document.createElement("button");
    ponto.type = "button";
    ponto.className = "hero-ponto";
    ponto.setAttribute("role", "tab");
    ponto.setAttribute("aria-label", `Destaque ${i + 1}`);
    ponto.addEventListener("click", () => irParaHero(i, true));
    heroPontos.appendChild(ponto);
  });

  heroIndice = 0;
  aplicarHero();
  iniciarHero();
}

function aplicarHero() {
  heroPalco.style.transform = `translateX(-${heroIndice * 100}%)`;
  [...heroPontos.children].forEach((p, i) =>
    p.classList.toggle("ativo", i === heroIndice)
  );
  // mostra/esconde as setas se só houver um destaque
  hero.classList.toggle("hero-unico", heroLista.length <= 1);
}

function irParaHero(i, manual) {
  if (heroLista.length === 0) return;
  heroIndice = (i + heroLista.length) % heroLista.length;
  aplicarHero();
  if (manual) iniciarHero(); // reinicia o cronômetro ao interagir
}

function iniciarHero() {
  pararHero();
  if (heroLista.length > 1) {
    heroTimer = setInterval(() => irParaHero(heroIndice + 1), INTERVALO_HERO);
  }
}

function pararHero() {
  if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
}

document.querySelector(".hero-seta-anterior").addEventListener("click", () => irParaHero(heroIndice - 1, true));
document.querySelector(".hero-seta-proximo").addEventListener("click", () => irParaHero(heroIndice + 1, true));

// Pausa a rotação enquanto o ponteiro está sobre o hero (desktop)
hero.addEventListener("mouseenter", pararHero);
hero.addEventListener("mouseleave", iniciarHero);

/* Arrastar para o lado no hero (mobile) troca de destaque */
let heroX0 = null;
heroPalco.addEventListener("touchstart", (e) => { heroX0 = e.touches[0].clientX; pararHero(); }, { passive: true });
heroPalco.addEventListener("touchend", (e) => {
  if (heroX0 === null) return;
  const dx = e.changedTouches[0].clientX - heroX0;
  if (Math.abs(dx) > 45) irParaHero(heroIndice + (dx < 0 ? 1 : -1), true);
  else iniciarHero();
  heroX0 = null;
}, { passive: true });

/* ---------- Barra superior: fica sólida ao rolar ---------- */
function atualizarTopbar() {
  topbar.classList.toggle("rolado", window.scrollY > 10);
}
window.addEventListener("scroll", atualizarTopbar, { passive: true });

/* ---------- Modal ---------- */

function abrirModal(livro) {
  modal.querySelector("#modal-titulo").textContent = livro.titulo;
  modal.querySelector(".modal-autor").textContent = livro.autor;
  modal.querySelector(".modal-sinopse").textContent = livro.sinopse || "";
  modal.querySelector("[data-estado]").textContent = livro.estado;
  modal.querySelector("[data-estoque]").textContent =
    livro.estoque > 0 ? `${livro.estoque} unidade${livro.estoque > 1 ? "s" : ""}` : "Esgotado";
  modal.querySelector("[data-preco]").textContent = livro.preco;

  const capa = modal.querySelector(".modal-capa");
  capa.innerHTML = livro.imagem
    ? `<img src="${livro.imagem}" alt="Capa do livro ${livro.titulo}" />`
    : `<div class="capa-fallback ${varianteFallback(livro.titulo)}" aria-hidden="true">${livro.titulo.charAt(0).toUpperCase()}</div>`;

  const textoBtn = botaoIG.querySelector(".botao-instagram-texto");
  if (livro.estoque <= 0) {
    botaoIG.classList.add("desativado");
    if (textoBtn) textoBtn.textContent = "Indisponível";
    botaoIG.removeAttribute("href");
    botaoIG.onclick = null;
  } else {
    botaoIG.classList.remove("desativado");
    if (textoBtn) textoBtn.textContent = "Pedir pelo Instagram";
    botaoIG.href = linkInstagram();
    botaoIG.onclick = null;
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

modal.addEventListener("click", (e) => {
  if (e.target.hasAttribute("data-fechar-modal")) fecharModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) fecharModal();
});

/* ---------- Eventos ---------- */
campoBusca.addEventListener("input", renderizar);

/* ---------- Inicialização ---------- */
document.getElementById("ano-atual").textContent = new Date().getFullYear();
atualizarTopbar();
renderizar();
