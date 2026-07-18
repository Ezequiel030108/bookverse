/* ============================================================
   BOOKVERSE — LÓGICA DO SITE
   Layout estilo Netflix: hero billboard rotativo + fileiras
   (carrosséis) que rolam para o lado por categoria.
   ============================================================ */

/* ---------- CONFIGURAÇÃO RÁPIDA (vem de js/config.js) ---------- */
const CFG_VITRINE = (window.LOJA_CONFIG && window.LOJA_CONFIG.vitrine) || {};
const INSTAGRAM_USUARIO = (window.LOJA_CONFIG && window.LOJA_CONFIG.instagram) || "mybookverse.pb";

const ORDEM_GENEROS = CFG_VITRINE.ordemGeneros || [
  "Clássicos da Literatura",
  "Romance & Literatura",
  "Finanças & Negócios",
  "Autoajuda & Desenvolvimento Pessoal",
  "Filosofia",
  "Suspense & Terror",
  "Ciência & Curiosidades",
  "Mangás"
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
const FIXAR_ULTIMO   = CFG_VITRINE.fixarUltimoDestaque || "";

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

const Precos = window.Precos;
const esc    = window.esc || (t => String(t == null ? "" : t));

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
  const disp = livrosVitrine();
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
  const src = window.Util ? window.Util.imagemSrcSegura(livro.imagem) : livro.imagem;
  return src
    ? `<img src="${esc(src)}" alt="Capa de ${esc(livro.titulo)}"${lazy ? ' loading="lazy"' : ''} />`
    : `<div class="capa-fallback ${varianteFallback(livro.titulo)}" aria-hidden="true">${esc((livro.titulo || "?").charAt(0).toUpperCase())}</div>`;
}

/* Quantas unidades estão bloqueadas (reservadas ou já vendidas). */
function qtdBloqueada(livro) {
  const mapa = window.__bloqueados;
  if (!mapa || typeof window.idLivro !== "function") return 0;
  return mapa.get(window.idLivro(livro)) || 0;
}
/* Estoque que ainda pode ser vendido = estoque - reservados/vendidos. */
function estoqueDisponivel(livro) {
  return Math.max(0, (livro.estoque || 0) - qtdBloqueada(livro));
}
window.estoqueDisponivel = estoqueDisponivel;   // usado pelo carrinho

function disponivel(livro) {
  return estoqueDisponivel(livro) > 0;
}

/* ---------- Cache local da loja ----------
   O Firestore demora alguns instantes para responder. Sem cache, a
   página renderizava primeiro com TODOS os livros (inclusive vendidos)
   e "piscava" quando os dados chegavam — inclusive trocando o título
   do carrossel. Guardamos a última resposta no navegador e aplicamos
   ANTES da primeira renderização; quando a resposta fresca chega, só
   re-renderizamos se algo realmente mudou. */
const CACHE_DISP = "bookverse_cache_disp_v1";
const CACHE_CAT  = "bookverse_cache_catalogo_v1";

function lerCacheLoja(chave) {
  try { const s = localStorage.getItem(chave); return s ? JSON.parse(s) : null; }
  catch (e) { return null; }
}
function gravarCacheLoja(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {}
}

/* Mapa id -> quantidade bloqueada, a partir do doc de disponibilidade. */
function montarBloqueados(mapa) {
  const bloq = new Map();
  const agora = Date.now();
  Object.keys(mapa || {}).forEach(id => {
    const d = mapa[id] || {};
    let q = 0;
    // Documentos antigos (sem "qtd") bloqueiam o livro inteiro, como antes.
    if (d.estado === "vendido") q = (d.qtd > 0) ? Number(d.qtd) : Infinity;
    else if (d.estado === "reservado" && (!d.ate || d.ate > agora)) q = (d.qtd > 0) ? Number(d.qtd) : Infinity;
    if (q > 0) bloq.set(id, q);
  });
  return bloq;
}
function bloqueadosIguais(a, b) {
  const ta = a || new Map(), tb = b || new Map();
  if (ta.size !== tb.size) return false;
  for (const [k, v] of ta) if (tb.get(k) !== v) return false;
  return true;
}

/* Carrega a disponibilidade (reservados/vendidos) e re-renderiza a loja. */
function carregarDisponibilidade() {
  if (!(window.Auth && window.Auth.configurado && window.Auth.lerDisponibilidade)) return;
  window.Auth.lerDisponibilidade().then(mapa => {
    gravarCacheLoja(CACHE_DISP, mapa || {});
    const bloq = montarBloqueados(mapa);
    if (bloqueadosIguais(window.__bloqueados, bloq)) return;   // nada mudou: sem "pisca"
    window.__bloqueados = bloq;
    const termo = (campoBusca && campoBusca.value) || "";
    renderizar(termo);
  }).catch(() => {});
}

/* ---------- Variantes (mesmo livro novo e usado) ----------
   Livros com o MESMO título e autor formam um grupo. Na vitrine
   aparece só a versão preferencial (novo antes de usado; depois,
   o mais barato). No modal, o cliente escolhe entre as versões. */

function chaveGrupo(l) {
  return normalizar((l.titulo || "") + "|" + (l.autor || ""));
}
function ordenarVariantes(lista) {
  return lista.slice().sort((a, b) => {
    const ca = a.condicao === "novo" ? 0 : 1;
    const cb = b.condicao === "novo" ? 0 : 1;
    if (ca !== cb) return ca - cb;
    return (Precos.precoNumerico(a.preco) || 0) - (Precos.precoNumerico(b.preco) || 0);
  });
}
/* Todas as variantes DISPONÍVEIS do mesmo livro (inclui o próprio). */
function variantesDe(livro) {
  const chave = chaveGrupo(livro);
  return ordenarVariantes(LIVROS.filter(l => chaveGrupo(l) === chave && disponivel(l)));
}
/* Lista da vitrine: um card por grupo, mostrando a versão preferencial. */
function livrosVitrine() {
  const vistos = new Set();
  const out = [];
  LIVROS.forEach(l => {
    if (!disponivel(l)) return;
    const chave = chaveGrupo(l);
    if (vistos.has(chave)) return;
    vistos.add(chave);
    out.push(variantesDe(l)[0]);
  });
  return out;
}

/* ---------- Promoção (configurada em js/livros.js) ----------
   Liga e desliga sozinha pelas datas de PROMOCAO. Para testar antes da
   data, abra o site com ?promo=teste no final do endereço. */

/* As regras de preço/promoção moram em js/precos.js (window.Precos),
   compartilhadas com o carrinho e o checkout — assim o valor é o
   mesmo em todo o site. Aqui ficam só atalhos. */
function promocaoAtiva() { return Precos.promoAtiva(); }
function formatarReal(valor) { return Precos.formatarBRL(valor); }
function dataFimPromo() { return Precos.dataFimPromo(); }

/* Hoje é o último dia da promoção? */
function ultimoDiaPromo() {
  const h = new Date();
  const iso = h.getFullYear() + "-" + String(h.getMonth() + 1).padStart(2, "0") +
              "-" + String(h.getDate()).padStart(2, "0");
  return iso === PROMOCAO.fim;
}
/* Preços promocionais (sozinho e na dupla). descontoMaximo limita o teto. */
function precosPromo(livro) {
  const cheio = Precos.precoNumerico(livro.preco);
  if (cheio === null) return null;
  const teto = livro.descontoMaximo || 100;
  const pctUm = Math.min(PROMOCAO.descontoUm, teto);
  const pctDupla = Math.min(PROMOCAO.descontoDupla, teto);
  return {
    um: Precos.arredondarReal(cheio * (1 - pctUm / 100)),
    dupla: Precos.arredondarReal(cheio * (1 - pctDupla / 100)),
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
          <s class="preco-antigo">${esc(livro.preco)}</s>
          <span class="preco-promo">${formatarReal(p.um)}</span>
        </p>
        ${linhaDupla}`;
    }
  }
  return `<p class="info-preco">${esc(livro.preco)}</p>`;
}
/* Preço no carrossel (hero). */
function precoHeroHTML(livro) {
  if (promocaoAtiva()) {
    const p = precosPromo(livro);
    if (p) {
      return `<span class="hero-preco em-promo"><s>${esc(livro.preco)}</s> ${formatarReal(p.um)}</span>`;
    }
  }
  return `<span class="hero-preco">${esc(livro.preco)}</span>`;
}

/* ---------- Cards das fileiras ---------- */

/* ----- Livro usado com trechos grifados -----
   Destaca no card (alerta vermelho) os livros USADOS cujo estado menciona
   "grifado". Essa informação já vem escrita no campo "estado" de cada livro,
   então a checagem é direta — não precisa de IA para reconhecê-la. */
function ehLivroNovo(livro) {
  if (livro.condicao === "novo") return true;
  if (livro.condicao === "usado") return false;
  return /\b(novo|lacrad)/i.test(String(livro.estado || ""));
}
function ehGrifado(livro) {
  return /grif/i.test(String(livro.estado || ""));
}
function usadoEGrifado(livro) {
  return ehGrifado(livro) && !ehLivroNovo(livro);
}

function criarCard(livro, indice, seloNovo) {
  const card = document.createElement("article");
  card.className = "card-livro";
  card.style.setProperty("--atraso", (Math.min(indice, 8) * 0.05) + "s");
  card.tabIndex = 0;
  card.setAttribute("role", "button");

  // Selo "Novo" só nos livros em destaque (os mais recentes adicionados).
  // Estoque/condição ficam no modal — marcar todo card viraria ruído.
  const eNovo = seloNovo || LIVROS_DESTAQUE.has(livro);
  const seloHTML = eNovo ? `<span class="selo novo">Novo</span>` : "";

  // Livro usado com trechos grifados: alerta vermelho no card (canto
  // superior direito) + aro vermelho na capa, para o cliente já saber.
  const grifado = usadoEGrifado(livro);
  if (grifado) card.classList.add("card-grifado");
  card.setAttribute("aria-label",
    `${livro.titulo}, ${livro.autor}` + (grifado ? " — usado, com trechos grifados" : ""));
  const grifadoHTML = grifado
    ? `<span class="selo-grifado" title="Livro usado com trechos grifados">
         <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.6 2.4 20.4h19.2L12 3.6z"/><line x1="12" y1="9.8" x2="12" y2="14"/><circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none"/></svg>
         <span>Grifado</span>
       </span>`
    : "";

  // Existe outra versão deste livro (ex.: novo + usado)? Mostra no card.
  const variantes = variantesDe(livro);
  let linhaVariante = "";
  if (variantes.length > 1) {
    const outra = variantes.find(vl => vl !== livro);
    if (outra) {
      const rot = outra.condicao === "novo" ? "Novo" : "Usado";
      linhaVariante = `<p class="info-variante">${rot} por ${formatarReal(Precos.precoUnitario(outra, 1))}</p>`;
    }
  }

  card.innerHTML = `
    <div class="capa">
      ${seloHTML}
      ${grifadoHTML}
      ${capaHTML(livro)}
      <div class="capa-overlay" aria-hidden="true">
        <span class="overlay-ver">Ver detalhes</span>
      </div>
      <button class="card-add" type="button" data-add-id="${esc(idLivro(livro))}" aria-label="Adicionar ${esc(livro.titulo)} ao carrinho">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        <span>Carrinho</span>
      </button>
    </div>
    <div class="info-livro">
      <h3 class="info-titulo">${esc(livro.titulo)}</h3>
      <p class="info-autor">${esc(livro.autor)}</p>
      ${precoCardHTML(livro)}
      ${linhaVariante}
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

/* Funções de limpeza das fileiras anteriores. Sem isso, cada re-render
   (a cada tecla na busca) deixaria listeners de resize e ResizeObservers
   órfãos acumulando para sempre. */
let limparFileiras = [];
function limparFileirasAntigas() {
  limparFileiras.forEach(fn => { try { fn(); } catch (e) {} });
  limparFileiras = [];
}

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

  // Rola ~85% da largura visível (clique e teclado/acessibilidade)
  const passo = () => Math.max(trilho.clientWidth * 0.85, 220);
  sEsq.addEventListener("click", () => trilho.scrollBy({ left: -passo(), behavior: "smooth" }));
  sDir.addEventListener("click", () => trilho.scrollBy({ left:  passo(), behavior: "smooth" }));

  // Mostra cada seta só quando dá para rolar naquele sentido.
  const atualizarSetas = () => {
    const max = trilho.scrollWidth - trilho.clientWidth - 1;
    sEsq.classList.toggle("oculta", trilho.scrollLeft <= 1);
    sDir.classList.toggle("oculta", max <= 0 || trilho.scrollLeft >= max);
  };
  trilho.addEventListener("scroll", atualizarSetas, { passive: true });
  window.addEventListener("resize", atualizarSetas);
  // Recalcula quando as medidas mudam (capas carregando, fontes, layout).
  // É o que evita a seta "que às vezes some, às vezes não".
  let observador = null;
  if ("ResizeObserver" in window) {
    observador = new ResizeObserver(atualizarSetas);
    observador.observe(trilho);
  }
  limparFileiras.push(() => {
    window.removeEventListener("resize", atualizarSetas);
    if (observador) observador.disconnect();
  });
  requestAnimationFrame(atualizarSetas);
  setTimeout(atualizarSetas, 400);

  // ---- Auto-scroll por proximidade (só mouse; respeita "reduzir movimento") ----
  // Aproximar o ponteiro de uma borda já rola sozinho; quanto mais perto da
  // seta, mais rápido. Curva quadrática: suave de longe, firme em cima da seta.
  const podeAutoScroll =
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (podeAutoScroll) {
    const ZONA = 120;     // faixa sensível em cada borda (px)
    const VEL_MAX = 15;   // px por frame quando o ponteiro encosta na seta
    let vel = 0;          // px/frame: negativo = esquerda, positivo = direita
    let raf = null;

    const frame = () => {
      const max = trilho.scrollWidth - trilho.clientWidth - 1;
      if (vel < 0 && trilho.scrollLeft <= 0)  vel = 0;
      if (vel > 0 && trilho.scrollLeft >= max) vel = 0;
      if (vel === 0) { raf = null; return; }
      trilho.scrollLeft += vel;
      raf = requestAnimationFrame(frame);
    };
    const ligar = () => { if (raf === null && vel !== 0) raf = requestAnimationFrame(frame); };

    area.addEventListener("mousemove", (e) => {
      const r = area.getBoundingClientRect();
      const x = e.clientX - r.left;
      const max = trilho.scrollWidth - trilho.clientWidth - 1;
      let v = 0;
      if (x < ZONA && trilho.scrollLeft > 0) {
        const t = (ZONA - x) / ZONA;            // 0..1 (1 = colado na borda)
        v = -VEL_MAX * t * t;
      } else if (x > r.width - ZONA && trilho.scrollLeft < max) {
        const t = (x - (r.width - ZONA)) / ZONA;
        v = VEL_MAX * t * t;
      }
      vel = v;
      ligar();
    });
    area.addEventListener("mouseleave", () => { vel = 0; });
  }

  return secao;
}

/* ---------- Renderização principal ---------- */

function renderizar(termoBusca) {
  const termo = normalizar((termoBusca ?? "").trim());
  const buscando = termo.length > 0;

  function combina(livro) {
    if (!termo) return true;
    // Busca por título, autor OU gênero — assim "mangá", "filosofia",
    // "clássicos" etc. encontram a seção inteira, não só títulos.
    return normalizar(livro.titulo + " " + livro.autor + " " + (livro.genero || "")).includes(termo);
  }

  limparFileirasAntigas();
  catalogo.innerHTML = "";
  pararHero();

  // Um card por livro: se existe a versão nova e a usada, a vitrine
  // mostra a preferencial e o modal oferece a outra.
  const vitrine = livrosVitrine();

  if (buscando) {
    // Modo busca: hero oculto, grade de resultados
    hero.hidden = true;
    document.body.classList.add("modo-busca");
    const resultados = vitrine.filter(combina);
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
    // Quem pesquisa costuma estar no meio da estante (no celular, a busca
    // surge justamente ao rolar). Ao trocar a estante pelos resultados a
    // página encolhe e a vista ficaria presa lá embaixo, no rodapé — com o
    // "Esse a gente não achou…" fora da tela. Volta ao topo para mostrar
    // os resultados (a barra é sticky: o campo continua visível e focado).
    if (window.scrollY > 0) window.scrollTo(0, 0);
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
  vitrine.forEach(l => { const g = l.genero || "Outros"; if (!generos.includes(g)) generos.push(g); });

  generos.forEach(genero => {
    // Fileira estilo Netflix: ordem SEMPRE embaralhada (nova a cada
    // carregamento), mas com os livros em destaque (os mais famosos)
    // aparecendo primeiro. Embaralhamos os dois grupos separadamente e
    // juntamos: famosos embaralhados na frente, o resto embaralhado atrás.
    const doGenero = vitrine.filter(l => (l.genero || "Outros") === genero);
    if (doGenero.length === 0) return;
    const famosos = embaralhar(doGenero.filter(l => l.destaque));
    const resto = embaralhar(doGenero.filter(l => !l.destaque));
    catalogo.appendChild(criarFileira(genero, famosos.concat(resto)));
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
          <h2 class="hero-livro-titulo">${esc(livro.titulo)}</h2>
          <p class="hero-livro-autor">${esc(livro.autor)}</p>
          <p class="hero-livro-sinopse">${esc(livro.sinopse || "")}</p>
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
  if (semMovimento) return;      // respeita "reduzir movimento" do sistema
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

/* Re-render com uma pequena pausa: digitar rápido não re-renderiza
   a estante inteira a cada tecla. */
const renderizarComPausa = (window.Util && window.Util.debounce)
  ? window.Util.debounce(v => renderizar(v), 140)
  : renderizar;

/* Métrica de busca: dispara UMA vez quando o cliente para de digitar
   (não a cada tecla). Só age se as métricas estiverem ligadas. */
const medirBusca = (window.Util && window.Util.debounce)
  ? window.Util.debounce(v => { if (window.Analytics) window.Analytics.busca(v); }, 900)
  : () => {};

function sincronizarBusca(origem) {
  const val = origem.value;
  if (origem === campoBusca && campoBuscaMob)  campoBuscaMob.value  = val;
  if (origem === campoBuscaMob && campoBusca)  campoBusca.value     = val;
  renderizarComPausa(val);
  medirBusca(val);
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

let soltarFocoModal = null;

/* Trava/destrava o scroll da página de fundo (html E body — no celular,
   travar só o body deixa a página de trás rolando junto com o modal). */
function travarScrollFundo(travar) {
  const v = travar ? "hidden" : "";
  document.body.style.overflow = v;
  document.documentElement.style.overflow = v;
}

function abrirModal(livro) {
  // Métrica de "livro visualizado" (só dispara se as métricas estiverem ligadas).
  if (window.Analytics) window.Analytics.verItem(livro);
  modal.querySelector("#modal-titulo").textContent    = livro.titulo;
  modal.querySelector(".modal-autor").textContent     = livro.autor;
  modal.querySelector(".modal-sinopse").textContent   = livro.sinopse || "";
  modal.querySelector("[data-estado]").textContent    = livro.estado;
  const restante = estoqueDisponivel(livro);
  modal.querySelector("[data-estoque]").textContent   =
    restante > 0 ? `${restante} unidade${restante > 1 ? "s" : ""}` : "Esgotado";
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
  capa.innerHTML = capaHTML(livro, false);
  // Foto real: tocar na capa abre a foto INTEIRA em tela cheia (sem cortes).
  const srcFoto = window.Util ? window.Util.imagemSrcSegura(livro.imagem) : livro.imagem;
  capa.classList.toggle("tem-zoom", !!srcFoto);
  capa.onclick = srcFoto ? (() => abrirFoto(livro)) : null;

  // ---- Outras versões do mesmo livro (ex.: novo × usado), estilo Amazon ----
  const elVar = document.getElementById("modal-variantes");
  const elVarLista = document.getElementById("modal-variantes-lista");
  if (elVar && elVarLista) {
    const grupo = variantesDe(livro);
    if (grupo.length > 1) {
      elVar.hidden = false;
      elVarLista.innerHTML = grupo.map(vl => {
        const atual = vl === livro;
        const rotulo = vl.condicao === "novo" ? "Novo" : "Usado";
        return `
          <button type="button" class="variante-opcao${atual ? " ativa" : ""}"
                  data-var-id="${esc(idLivro(vl))}" aria-pressed="${atual ? "true" : "false"}">
            <span class="variante-rotulo">${rotulo}</span>
            <span class="variante-preco">${formatarReal(Precos.precoUnitario(vl, 1))}</span>
            <span class="variante-estado">${esc(vl.estado || "")}</span>
          </button>`;
      }).join("");
      elVarLista.querySelectorAll("[data-var-id]").forEach(btn =>
        btn.addEventListener("click", () => {
          const alvo = grupo.find(x => idLivro(x) === btn.dataset.varId);
          if (alvo && alvo !== livro) abrirModal(alvo);
        }));
    } else {
      elVar.hidden = true;
      elVarLista.innerHTML = "";
    }
  }

  // Botões de compra (carrinho / comprar agora) + Instagram como suporte
  window.__livroModal = livro;
  const semEstoque = restante <= 0;
  const btnAdd     = document.getElementById("modal-add-carrinho");
  const btnComprar = document.getElementById("modal-comprar");
  if (btnAdd) {
    btnAdd.disabled = semEstoque;
    btnAdd.textContent = semEstoque ? "Esgotado" : "Adicionar ao carrinho";
  }
  if (btnComprar) btnComprar.disabled = semEstoque;
  if (botaoIG) botaoIG.href = linkInstagram();

  // Compartilhar: onclick (e não addEventListener) para não acumular
  // um listener a cada abertura do modal.
  const btnShare = document.getElementById("modal-compartilhar");
  if (btnShare) btnShare.onclick = () => compartilharLivro(livro);
  prepararCapaShare(livro);   // já baixa a foto que vai junto no compartilhar

  const jaAberto = !modal.hidden;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  travarScrollFundo(true);
  // Prende o Tab dentro do modal (acessibilidade) — só na primeira abertura.
  if (!jaAberto && window.Util && window.Util.prenderFoco) {
    soltarFocoModal = window.Util.prenderFoco(modal.querySelector(".modal-caixa"));
  }
}

function fecharModal() {
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  travarScrollFundo(false);
  if (soltarFocoModal) { soltarFocoModal(); soltarFocoModal = null; }
  // Desfaz qualquer resto do gesto de arrastar para baixo: na próxima
  // abertura a caixa nasce no lugar e com a animação de entrada.
  const caixa = modal.querySelector(".modal-caixa");
  if (caixa) { caixa.style.transform = ""; caixa.style.transition = ""; caixa.style.animation = ""; }
}

/* ---------- Visualizador de foto em tela cheia ---------- */
const fotoViewer    = document.getElementById("foto-viewer");
const fotoViewerImg = document.getElementById("foto-viewer-img");

function abrirFoto(livro) {
  const src = window.Util ? window.Util.imagemSrcSegura(livro.imagem) : livro.imagem;
  if (!src || !fotoViewer) return;
  fotoViewerImg.src = src;
  fotoViewerImg.alt = "Foto de " + (livro.titulo || "livro");
  fotoViewer.hidden = false;
  travarScrollFundo(true);
}
function fecharFoto() {
  if (!fotoViewer || fotoViewer.hidden) return;
  fotoViewer.hidden = true;
  fotoViewerImg.src = "";
  // o modal continua aberto atrás: mantém a página de fundo travada
  travarScrollFundo(!modal.hidden);
}
if (fotoViewer) fotoViewer.addEventListener("click", fecharFoto);

modal.addEventListener("click", (e) => { if (e.target.hasAttribute("data-fechar-modal")) fecharModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (fotoViewer && !fotoViewer.hidden) { fecharFoto(); return; }   // 1º fecha a foto
  if (!modal.hidden) fecharModal();                                  // depois o modal
});

/* ---------- Arrastar o modal para baixo fecha (celular) ----------
   No celular o modal é uma "gaveta" que sobe de baixo, com a alça
   (.modal-puxador) sugerindo o gesto de puxar. Aqui o gesto funciona
   de verdade: a caixa segue o dedo e, soltando longe (ou num puxão
   rápido), fecha; soltando perto, volta ao lugar. A rolagem do
   conteúdo continua normal — o arrasto só "pega" começando na alça,
   fora da área rolável, ou com a rolagem já no topo. */
(function () {
  const caixa   = modal.querySelector(".modal-caixa");
  const puxador = modal.querySelector(".modal-puxador");
  const rolavel = modal.querySelector(".modal-rolavel");
  if (!caixa || !puxador) return;

  let y0 = 0, x0 = 0, dy = 0, t0 = 0;
  let arrastando = false, decidiu = false, podePuxar = false;
  let suprimirCliqueAte = 0;   // pós-arrasto: o toque não vira clique na alça

  caixa.addEventListener("touchstart", (e) => {
    decidiu = true; arrastando = false;
    if (puxador.offsetParent === null) return;   // layout de tela grande: sem gesto
    const t = e.touches[0];
    y0 = t.clientY; x0 = t.clientX; dy = 0; t0 = Date.now();
    decidiu = false;
    podePuxar = puxador.contains(e.target) ||
      !rolavel || !rolavel.contains(e.target) || rolavel.scrollTop <= 0;
  }, { passive: true });

  caixa.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    if (!decidiu) {
      const my = t.clientY - y0, mx = t.clientX - x0;
      if (Math.abs(my) < 8 && Math.abs(mx) < 8) return;   // ainda pode ser só um toque
      decidiu = true;
      arrastando = podePuxar && my > 0 && my > Math.abs(mx);
    }
    if (!arrastando) return;
    dy = Math.max(0, t.clientY - y0);
    e.preventDefault();   // o dedo move a caixa, não a rolagem
    // A animação de entrada (subir, fill both) "segura" o transform e
    // ganharia do estilo inline — sai de cena enquanto o dedo manda.
    caixa.style.animation = "none";
    caixa.style.transition = "none";
    caixa.style.transform = "translateY(" + dy + "px)";
  }, { passive: false });

  function soltar() {
    if (!arrastando) return;
    arrastando = false;
    suprimirCliqueAte = Date.now() + 400;
    const puxaoRapido = dy > 45 && Date.now() - t0 < 250;
    const foiLonge    = dy > Math.min(caixa.offsetHeight * 0.28, 170);
    if (puxaoRapido || foiLonge) {
      caixa.style.transition = "transform .18s ease-in";
      caixa.style.transform = "translateY(105%)";
      setTimeout(fecharModal, 180);   // fecharModal limpa transform/animação
    } else {
      caixa.style.transition = "transform .2s ease-out";
      caixa.style.transform = "";
      setTimeout(() => { caixa.style.transition = ""; }, 220);
    }
  }
  caixa.addEventListener("touchend", soltar);
  caixa.addEventListener("touchcancel", soltar);

  // Se o arrasto terminou "voltando", o navegador ainda pode disparar um
  // clique na alça — que fecharia o modal do mesmo jeito. Engole esse clique.
  caixa.addEventListener("click", (e) => {
    if (Date.now() < suprimirCliqueAte) { e.preventDefault(); e.stopPropagation(); }
  }, true);
})();

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
}

/* ---------- Ações de compra no modal ---------- */
(function () {
  const btnAdd     = document.getElementById("modal-add-carrinho");
  const btnComprar = document.getElementById("modal-comprar");
  if (btnAdd) btnAdd.addEventListener("click", () => {
    const l = window.__livroModal;
    if (!l || estoqueDisponivel(l) <= 0 || !window.Carrinho) return;
    if (window.podeUsarCarrinho && !window.podeUsarCarrinho({ tipo: "carrinho", id: window.idLivro(l) })) return;
    window.Carrinho.add(l, 1);
    if (window.lojaToast) window.lojaToast(`"${l.titulo}" no carrinho`);
    fecharModal();
    if (window.abrirCarrinho) window.abrirCarrinho();
  });
  if (btnComprar) btnComprar.addEventListener("click", () => {
    const l = window.__livroModal;
    if (!l || estoqueDisponivel(l) <= 0 || !window.Carrinho) return;
    if (window.podeUsarCarrinho && !window.podeUsarCarrinho({ tipo: "comprar", id: window.idLivro(l) })) return;
    // Compra direta: leva só este livro ao checkout, sem mexer no carrinho.
    try { sessionStorage.setItem("bookverse_compra_direta", JSON.stringify({ id: window.idLivro(l), qty: 1 })); } catch (e) {}
    window.location.href = "checkout.html";
  });
})();

/* Junta os livros cadastrados/editados pelo admin ao catálogo local.
   Devolve true só quando algo REALMENTE mudou (evita re-render à toa). */
function aplicarCatalogoExtras(extras) {
  if (!Array.isArray(extras) || !extras.length) return false;
  const idDe = window.idLivro || (l => l.id);
  const indice = new Map();
  LIVROS.forEach((l, i) => indice.set(idDe(l), i));
  let mudou = false;
  extras.forEach(l => {
    if (!l || !l.id) return;
    if (indice.has(l.id)) {
      // Edição de um livro existente: aplica as alterações por cima do original.
      const atual = LIVROS[indice.get(l.id)];
      const novo = Object.assign({}, atual, l);
      if (JSON.stringify(novo) !== JSON.stringify(atual)) {
        LIVROS[indice.get(l.id)] = novo;
        mudou = true;
      }
    } else {
      // Livro novo, cadastrado pelo admin.
      LIVROS.push(l);
      indice.set(l.id, LIVROS.length - 1);
      mudou = true;
    }
  });
  return mudou;
}

/* Carrega os livros cadastrados pelo admin (Firestore) e os junta ao catálogo. */
function carregarCatalogo() {
  if (!(window.Auth && window.Auth.configurado && window.Auth.lerCatalogo)) return;
  window.Auth.lerCatalogo().then(extras => {
    if (!Array.isArray(extras)) return;
    gravarCacheLoja(CACHE_CAT, extras);
    const mudou = aplicarCatalogoExtras(extras);
    if (mudou) {
      const termo = (campoBusca && campoBusca.value) || "";
      renderizar(termo);
      carregarDisponibilidade();
    }
    abrirLivroDaURL();   // o livro do link pode ter vindo do catálogo do admin
  }).catch(() => {});
}

/* ---------- Compartilhar / abrir livro por link direto ---------- */

/* O link compartilhado passa por /livro/<id>: uma pagininha no servidor
   que faz a prévia (WhatsApp/Instagram) mostrar a CAPA do livro, e
   redireciona o visitante direto para a loja com o livro aberto. */
function urlDoLivro(livro) {
  return location.origin + "/livro/" + encodeURIComponent(idLivro(livro));
}

function mensagemCompartilhar(livro, url) {
  const preco = formatarReal(Precos.precoUnitario(livro, 1));
  const condicao = livro.condicao === "novo" ? " (novo)" : (livro.condicao === "usado" ? " (usado)" : "");
  return (
    "💜✨ Olha esse achado na BookVerse! ✨💜\n\n" +
    "📖 " + livro.titulo + ", de " + livro.autor + "\n" +
    "🤍 " + preco + condicao + "\n\n" +
    "🌟 Confira já: " + url
  );
}

/* A FOTO do livro vai junto do compartilhamento como arquivo (WhatsApp,
   Instagram etc. mostram a imagem de verdade, não só o link). Preferimos
   a arte da prévia (/api/capa, moldura da BookVerse); se ela não estiver
   disponível, vai a própria foto do livro. */
let capaShare = { id: null, promessa: null };

async function baixarArquivoCapa(livro) {
  const id = idLivro(livro);
  const fontes = [];
  if (livro.imagem) fontes.push("/api/capa?id=" + encodeURIComponent(id));
  const foto = window.Util ? window.Util.imagemSrcSegura(livro.imagem) : "";
  if (foto) fontes.push(foto);
  for (const src of fontes) {
    try {
      const r = await fetch(src);
      if (!r.ok) continue;
      const blob = await r.blob();
      if (!blob.size || !/^image\//.test(blob.type)) continue;
      const ext = blob.type === "image/png" ? ".png" : (blob.type === "image/webp" ? ".webp" : ".jpg");
      return new File([blob], (id || "livro") + ext, { type: blob.type });
    } catch (e) { /* tenta a próxima fonte */ }
  }
  return null;
}

/* Começa a baixar a foto assim que o modal abre: na hora do toque em
   "Compartilhar" ela já está pronta e o navigator.share não perde a
   permissão do gesto esperando a rede. */
function prepararCapaShare(livro) {
  if (!navigator.canShare || typeof File === "undefined") return;
  const id = idLivro(livro);
  if (capaShare.id === id && capaShare.promessa) return;
  capaShare = { id, promessa: baixarArquivoCapa(livro).catch(() => null) };
}

async function compartilharLivro(livro) {
  const url = urlDoLivro(livro);
  const texto = mensagemCompartilhar(livro, url);
  const titulo = livro.titulo + " · BookVerse";
  if (navigator.share) {
    // O link já vai dentro do texto (com a mensagem bonita); mandar o
    // campo url separado duplicaria o link em alguns apps.
    let dados = { title: titulo, text: texto };
    prepararCapaShare(livro);
    // Espera a foto só por um instante: se a rede demorar, compartilha
    // sem ela em vez de perder a janela do gesto do usuário.
    const arquivo = (capaShare.id === idLivro(livro) && capaShare.promessa)
      ? await Promise.race([capaShare.promessa, new Promise(r => setTimeout(r, 2500, null))])
      : null;
    if (arquivo && navigator.canShare({ files: [arquivo] })) {
      dados = { title: titulo, text: texto, files: [arquivo] };
    }
    try { await navigator.share(dados); return; }
    catch (e) {
      if (e && e.name === "AbortError") return; /* cancelou */
      // Alguns apps/navegadores recusam arquivo+texto juntos: tenta
      // de novo só com a mensagem antes de cair no plano B.
      if (dados.files) {
        try { await navigator.share({ title: titulo, text: texto }); return; }
        catch (e2) { if (e2 && e2.name === "AbortError") return; }
      }
    }
  }
  try {
    await navigator.clipboard.writeText(texto);
    if (window.lojaToast) window.lojaToast("Mensagem copiada! É só colar e enviar.");
  } catch (e) {
    window.prompt("Copie a mensagem do livro:", texto);
  }
}

/* Se a página abriu com ?livro=<id>, mostra esse livro no modal. */
let livroDaURLJaAberto = false;
function abrirLivroDaURL() {
  if (livroDaURLJaAberto) return;
  let id = null;
  try { id = new URLSearchParams(location.search).get("livro"); } catch (e) {}
  if (!id) { livroDaURLJaAberto = true; return; }
  const livro = LIVROS.find(l => idLivro(l) === id);
  if (livro) {
    livroDaURLJaAberto = true;
    abrirModal(livro);
  }
}

/* ---------- Inicialização ---------- */
// Aplica o cache local ANTES da primeira renderização: livros vendidos
// não "piscam" na tela e o título do carrossel não troca depois.
window.__bloqueados = montarBloqueados(lerCacheLoja(CACHE_DISP) || {});
aplicarCatalogoExtras(lerCacheLoja(CACHE_CAT) || []);

// Contatos: Instagram (barra no desktop + faixa) e WhatsApp (faixa).
(function () {
  const url = "https://instagram.com/" + INSTAGRAM_USUARIO;
  const topo = document.getElementById("btn-instagram-topo");
  if (topo) topo.href = url;
  const strip = document.getElementById("link-instagram-strip");
  if (strip) strip.href = url;
  const arroba = document.getElementById("contato-ig-arroba");
  if (arroba) arroba.textContent = "@" + INSTAGRAM_USUARIO;

  // WhatsApp da loja (js/config.js) — só aparece se estiver configurado.
  const numero = String((window.LOJA_CONFIG && window.LOJA_CONFIG.whatsapp) || "").replace(/\D/g, "");
  const whats = document.getElementById("link-whats-strip");
  if (whats && numero) {
    whats.href = "https://wa.me/" + numero;
    whats.hidden = false;
    // "5514982241492" -> "(14) 98224-1492"
    const num = document.getElementById("contato-whats-num");
    const m = numero.match(/^55(\d{2})(\d{5})(\d{4})$/);
    if (num && m) num.textContent = "(" + m[1] + ") " + m[2] + "-" + m[3];
  }
})();

ativarModoPromocao();
// Link direto de busca (?busca=mangás): abre a estante já filtrada.
// Usado nos sitelinks dos anúncios e em links compartilháveis.
let buscaInicial = "";
try { buscaInicial = (new URLSearchParams(location.search).get("busca") || "").trim(); } catch (e) {}
if (buscaInicial) {
  if (campoBusca) campoBusca.value = buscaInicial;
  if (campoBuscaMob) campoBuscaMob.value = buscaInicial;
}
renderizar(buscaInicial);
abrirLivroDaURL();           // abre o livro do link compartilhado (?livro=...)
carregarDisponibilidade();   // esconde reservados/vendidos quando a lista carrega
carregarCatalogo();          // adiciona os livros cadastrados pelo admin
