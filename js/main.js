/* ============================================================
   LÓGICA DO SITE
   - Renderiza os cards de livros na estante
   - Modal de detalhes ao clicar
   - Busca em tempo real (título / autor)
   - Filtro "só disponíveis"
   - Monta o link do Instagram com a mensagem pronta
   ============================================================ */

/* ---------- CONFIGURAÇÃO RÁPIDA ---------- */
/* Troque aqui o @ do Instagram da livraria (sem o @).
   Esse mesmo @ aparece no cabeçalho do site —
   se mudar aqui, lembre de mudar no index.html também. */
const INSTAGRAM_USUARIO = "mybookverse.pb";

/* Ordem em que as seções de gênero aparecem no site.
   Todo gênero usado em livros.js deve estar listado aqui. */
const ORDEM_GENEROS = [
  "Finanças & Negócios",
  "Autoajuda & Desenvolvimento Pessoal",
  "Ciência & Curiosidades",
  "Clássicos da Literatura",
  "Romance & Literatura"
];

/* ---------- Referências de elementos ---------- */
const catalogo     = document.getElementById("catalogo");
const semResultados= document.getElementById("sem-resultados");
const campoBusca   = document.getElementById("campo-busca");
const modal        = document.getElementById("modal");
const botaoIG      = document.getElementById("botao-instagram");

/* ---------- Utilidades ---------- */

/** Remove acentos e deixa minúsculo (para a busca ignorar acentos). */
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
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

/* ---------- Renderização dos cards ---------- */

function criarCard(livro, indice) {
  const card = document.createElement("article");
  card.className = "card-livro";
  if (livro.estoque <= 0) card.classList.add("esgotado");
  // pequeno atraso escalonado para a animação de entrada
  // atraso escalonado, mas limitado para a lista não demorar a "entrar" toda
  card.style.setProperty("--atraso", (Math.min(indice, 8) * 0.04) + "s");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `${livro.titulo}, de ${livro.autor}`);

  const selo = rotuloEstoque(livro.estoque);

  // Capa: imagem real OU fallback bonito com a inicial
  const capaHTML = livro.imagem
    ? `<img src="${livro.imagem}" alt="Capa do livro ${livro.titulo}" loading="lazy" />`
    : `<div class="capa-fallback ${varianteFallback(livro.titulo)}" aria-hidden="true">${livro.titulo.charAt(0).toUpperCase()}</div>`;

  card.innerHTML = `
    <div class="capa">
      <span class="selo ${selo.classe}">${selo.texto}</span>
      ${capaHTML}
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

function renderizar() {
  const termo = normalizar(campoBusca.value.trim());

  // Filtro base: só livros disponíveis (estoque > 0) e que batem com a busca.
  // Livros esgotados continuam em livros.js, mas ficam ocultos.
  function combina(livro) {
    if (livro.estoque <= 0) return false;
    if (!termo) return true;
    const alvo = normalizar(livro.titulo + " " + livro.autor);
    return alvo.includes(termo);
  }

  // Monta a lista de gêneros: os da ordem definida + qualquer outro que apareça.
  const generos = [...ORDEM_GENEROS];
  LIVROS.forEach((livro) => {
    const g = livro.genero || "Outros";
    if (!generos.includes(g)) generos.push(g);
  });

  catalogo.innerHTML = "";
  let total = 0;

  generos.forEach((genero) => {
    const doGenero = LIVROS.filter(
      (livro) => (livro.genero || "Outros") === genero && combina(livro)
    );
    if (doGenero.length === 0) return;
    total += doGenero.length;

    const secao = document.createElement("section");
    secao.className = "genero-secao";

    const titulo = document.createElement("h2");
    titulo.className = "genero-titulo";
    titulo.textContent = genero;
    secao.appendChild(titulo);

    const grade = document.createElement("div");
    grade.className = "grade-livros";
    doGenero.forEach((livro, i) => grade.appendChild(criarCard(livro, i)));
    secao.appendChild(grade);

    catalogo.appendChild(secao);
  });

  semResultados.hidden = total !== 0;
}

/* ---------- Modal ---------- */

function abrirModal(livro) {
  modal.querySelector("#modal-titulo").textContent = livro.titulo;
  modal.querySelector(".modal-autor").textContent = livro.autor;
  modal.querySelector(".modal-sinopse").textContent = livro.sinopse || "";
  modal.querySelector("[data-estado]").textContent = livro.estado;
  modal.querySelector("[data-estoque]").textContent =
    livro.estoque > 0 ? `${livro.estoque} unidade${livro.estoque > 1 ? "s" : ""}` : "Esgotado";
  modal.querySelector("[data-preco]").textContent = livro.preco;

  // Capa do modal
  const capa = modal.querySelector(".modal-capa");
  capa.innerHTML = livro.imagem
    ? `<img src="${livro.imagem}" alt="Capa do livro ${livro.titulo}" />`
    : `<div class="capa-fallback ${varianteFallback(livro.titulo)}" aria-hidden="true">${livro.titulo.charAt(0).toUpperCase()}</div>`;

  // Botão do Instagram
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

/* ---------- Eventos de busca / filtro ---------- */
campoBusca.addEventListener("input", renderizar);

/* ---------- Topo grudado: esconde ao rolar pra baixo, mostra ao rolar pra cima ----------
   Padrão usado em apps profissionais (Twitter, Medium etc.):
   o bloco do topo desliza pra fora quando o usuário rola pra baixo
   e volta assim que ele rola pra cima. */
const topoGrudado = document.getElementById("topo-grudado");
let ultimoScroll = window.scrollY;
let tickAgendado = false;
// Pequenos limiares para evitar piscar com micro-rolagens (ex.: trackpads).
const LIMIAR_ESCONDER = 8;   // px de rolagem pra baixo antes de esconder
const LIMIAR_MOSTRAR  = 4;   // px de rolagem pra cima antes de mostrar
const ZONA_SEGURA_TOPO = 80; // perto do topo, sempre mostrar

function atualizarTopoGrudado() {
  const scrollAtual = window.scrollY;
  const delta = scrollAtual - ultimoScroll;

  if (scrollAtual < ZONA_SEGURA_TOPO) {
    topoGrudado.classList.remove("escondido");
  } else if (delta > LIMIAR_ESCONDER) {
    topoGrudado.classList.add("escondido");
  } else if (delta < -LIMIAR_MOSTRAR) {
    topoGrudado.classList.remove("escondido");
  }

  ultimoScroll = scrollAtual;
  tickAgendado = false;
}

window.addEventListener("scroll", () => {
  if (!tickAgendado) {
    tickAgendado = true;
    requestAnimationFrame(atualizarTopoGrudado);
  }
}, { passive: true });

/* ---------- Inicialização ---------- */
document.getElementById("ano-atual").textContent = new Date().getFullYear();
renderizar();
