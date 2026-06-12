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
  "Romance & Literatura",
  "Mangás"
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

/* ---------- Promoção (configurada em js/livros.js) ---------- */

/** A promoção está ativa agora? (liga/desliga sozinha pelas datas)
    Para testar antes da data, abra o site com ?promo=teste no final. */
function promocaoAtiva() {
  if (typeof PROMOCAO === "undefined" || !PROMOCAO) return false;
  if (new URLSearchParams(location.search).get("promo") === "teste") return true;
  const agora = new Date();
  return (
    agora >= new Date(PROMOCAO.inicio + "T00:00:00") &&
    agora <= new Date(PROMOCAO.fim + "T23:59:59")
  );
}

/** Converte "R$ 30,00" no número 30. */
function precoNumerico(precoTexto) {
  const n = parseFloat(
    String(precoTexto).replace(/[^\d,]/g, "").replace(",", ".")
  );
  return isNaN(n) ? null : n;
}

/** Arredonda para o real cheio (R$ 22,50 vira R$ 22, a favor do cliente). */
function arredondarReal(valor) {
  return Math.ceil(valor - 0.5);
}

function formatarReal(valor) {
  return "R$ " + valor;
}

/** Calcula os preços promocionais do livro (sozinho e na dupla).
    Livros com descontoMaximo nunca passam desse percentual. */
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

/** HTML do preço dentro do card (normal ou, em promoção, riscado + novo). */
function precoCardHTML(livro) {
  if (promocaoAtiva()) {
    const p = precosPromo(livro);
    if (p) {
      const linhaDupla = p.limitado
        ? `<p class="preco-dupla">♥ desconto especial de hoje</p>`
        : `<p class="preco-dupla">♥ levando 2: ${formatarReal(p.dupla)} cada</p>`;
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

/* ---------- Renderização dos cards ---------- */

function criarCard(livro, indice, seloNovo) {
  const card = document.createElement("article");
  card.className = "card-livro";
  if (livro.estoque <= 0) card.classList.add("esgotado");
  // pequeno atraso escalonado para a animação de entrada
  // atraso escalonado, mas limitado para a lista não demorar a "entrar" toda
  card.style.setProperty("--atraso", (Math.min(indice, 8) * 0.04) + "s");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `${livro.titulo}, de ${livro.autor}`);

  // Na seção "Novidades" o selo vira "Novo!"; nas demais, mostra o estoque.
  const selo = seloNovo
    ? { texto: "Novo!", classe: "novo" }
    : rotuloEstoque(livro.estoque);

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
      ${precoCardHTML(livro)}
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

  // Banner da promoção: aparece no topo do catálogo enquanto a
  // promoção estiver ativa (datas em js/livros.js) e some sozinho.
  if (promocaoAtiva()) {
    const banner = document.createElement("section");
    banner.className = "secao-promo";
    banner.setAttribute("aria-label", "Promoção de " + PROMOCAO.nome);
    banner.innerHTML = `
      <div class="promo-coracao-fundo" aria-hidden="true">❤</div>
      <span class="promo-etiqueta">♥ Só hoje · 12 de junho</span>
      <h2 class="promo-titulo">${PROMOCAO.nome}</h2>
      <p class="promo-subtitulo">O site inteiro em promoção — e levando 2 livros, o desconto <strong>dobra</strong>!</p>
      <div class="promo-regras">
        <span class="promo-regra"><strong>${PROMOCAO.descontoUm}% OFF</strong>levando 1 livro</span>
        <span class="promo-regra destaque"><strong>${PROMOCAO.descontoDupla}% OFF em cada</strong>levando 2 ou mais</span>
        <span class="promo-regra"><strong>♥ Brinde</strong>${PROMOCAO.brinde}</span>
      </div>
      <p class="promo-nota">Títulos de R$ 50+ participam com ${PROMOCAO.descontoUm}% fixo · quase tudo é exemplar único — quem chegar primeiro, leva ♥</p>
    `;
    catalogo.appendChild(banner);
  }

  // Seção "Novidades": livros com novoAte ainda válido aparecem em
  // destaque no topo, num banner promocional (além da própria categoria).
  const novidades = LIVROS.filter((livro) => ehNovidade(livro) && combina(livro));
  if (novidades.length > 0) {
    total += novidades.length;

    const secao = document.createElement("section");
    secao.className = "secao-novidades";
    secao.setAttribute("aria-label", "Novidades da semana");
    secao.innerHTML = `
      <div class="novidades-cabecalho">
        <span class="novidades-etiqueta">✨ Acabou de chegar</span>
        <h2 class="novidades-titulo">Novidades da Semana</h2>
        <p class="novidades-subtitulo">Recém-chegados na estante — garanta o seu antes que acabe!</p>
      </div>
    `;

    const grade = document.createElement("div");
    grade.className = "grade-livros";
    novidades.forEach((livro, i) => grade.appendChild(criarCard(livro, i, true)));
    secao.appendChild(grade);

    catalogo.appendChild(secao);
  }

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

  // Preço: normal fora da promoção; riscado + novo durante a promoção
  const campoPreco = modal.querySelector("[data-preco]");
  const promo = promocaoAtiva() ? precosPromo(livro) : null;
  if (promo) {
    campoPreco.innerHTML = `<s class="modal-preco-antigo">${livro.preco}</s> ${formatarReal(promo.um)}`;
  } else {
    campoPreco.textContent = livro.preco;
  }

  // Aviso da promoção dentro do modal (criado e removido conforme o caso)
  let avisoPromo = modal.querySelector(".modal-promo");
  if (promo) {
    if (!avisoPromo) {
      avisoPromo = document.createElement("p");
      avisoPromo.className = "modal-promo";
      modal.querySelector(".modal-detalhes").insertAdjacentElement("afterend", avisoPromo);
    }
    avisoPromo.innerHTML = promo.limitado
      ? `♥ <strong>${PROMOCAO.nome}:</strong> este livro está com ${PROMOCAO.descontoUm}% de desconto só hoje — e todo pedido ganha ${PROMOCAO.brinde}.`
      : `♥ <strong>${PROMOCAO.nome}:</strong> levando 2 livros ou mais, este sai por <strong>${formatarReal(promo.dupla)}</strong> (${PROMOCAO.descontoDupla}% off) — e todo pedido ganha ${PROMOCAO.brinde}.`;
  } else if (avisoPromo) {
    avisoPromo.remove();
  }

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

/* ---------- Decoração da promoção ---------- */
/* Tudo aqui só acontece com a promoção ativa e desaparece
   sozinho quando ela termina (nada fica "sujo" no site). */
function ativarModoPromocao() {
  if (!promocaoAtiva()) return;
  document.body.classList.add("modo-promo");

  // as estrelas ao lado do título viram corações
  document.querySelectorAll(".estrela-titulo").forEach((el) => {
    el.textContent = "❤";
    el.classList.add("coracao");
  });

  // corações discretos flutuando junto às estrelas do fundo
  const ceu = document.createElement("div");
  ceu.className = "ceu-coracoes";
  ceu.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 7; i++) {
    const coracao = document.createElement("span");
    coracao.textContent = "❤";
    ceu.appendChild(coracao);
  }
  document.body.appendChild(ceu);

  // mensagem especial no rodapé
  const sub = document.querySelector(".rodape-sub");
  if (sub) sub.textContent = "Feliz Dia dos Namorados! Feito com amor para nossos leitores ♥";
}

/* ---------- Inicialização ---------- */
document.getElementById("ano-atual").textContent = new Date().getFullYear();
ativarModoPromocao();
renderizar();
