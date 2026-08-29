/* ============================================================
   BOOKVERSE — PROTÓTIPO: ESTANTE EM 3D (o motor)
   ------------------------------------------------------------
   Duas coisas moram aqui:

   • window.Vitrine3D — o motor de verdade. Ele pega uma fileira
     que JÁ EXISTE (o mesmo .fileira-trilho da loja, com os
     mesmos .card-livro dentro) e transforma em estante 3D. Não
     precisa mudar nada em como os cards são criados: o motor
     embrulha o que já está lá.

     Para ligar na loja de verdade um dia, é uma linha só dentro
     do criarFileira() do js/main.js:

         if (window.Vitrine3D) Vitrine3D.ativar(trilho);

   • A montagem desta página de demonstração (no fim do arquivo):
     desenha algumas fileiras com os livros reais do catálogo e
     liga os controles do painel de ajustes.

   COMO O GIRO FUNCIONA (a parte importante):
   A cada rolagem o motor mede, para cada livro, a distância
   entre o centro dele e o centro da janela do trilho. Essa
   distância vira um número entre -1 (bem na esquerda) e +1 (bem
   na direita). Desse número saem três coisas:
       girar   -> quanto o livro vira de lado
       afundar -> quanto ele vai para o fundo
       apagar  -> quanto ele perde de brilho e de tamanho
   Livro no centro = número 0 = de frente, na frente de todos.
   ============================================================ */

window.Vitrine3D = (function () {
  "use strict";

  /* Valores de fábrica. O painel do protótipo mexe nestes
     mesmos números ao vivo. */
  var PADRAO = {
    rotacao:      28,    // graus máximos de giro nas pontas
    profundidade: 170,   // px que o livro afunda nas pontas
    escala:       0.12,  // quanto encolhe nas pontas (0.12 = 12%)
    sombra:       0.42,  // quanto escurece nas pontas
    alcance:      1.25,  // até onde o efeito vai (1 = borda do trilho)
    espessura:    15,    // px de lombada (a "grossura" do livro)
    flutuar:      true,  // o balanço parado no espaço
    parallax:     true   // a estante acompanha o mouse
  };

  /* O usuário pediu para reduzir animações? Então nada de 3D. */
  function movimentoReduzido() {
    return window.matchMedia &&
           window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* Sorteio SEM sorteio: o mesmo índice sempre dá o mesmo número.
     Assim o livro não muda de ritmo a cada vez que a página abre
     (isso deixaria a estante "nervosa" ao rolar e voltar). */
  function pseudoAleatorio(semente) {
    var x = Math.sin(semente * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function limitar(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  /* ---------- Preparar um card ----------
     Sai de:   <article class=card-livro> .capa + .info-livro
     Chega em: <article class=card-livro p3d-card>
                 <div class=p3d-flutua>            (balança)
                   <div class=p3d-corpo>           (bloco 3D)
                     <div class=capa>…</div>       (a face da frente)
                     <span class=p3d-lombada>      (o lado do livro)
                     <span class=p3d-paginas>      (o miolo)
                     <span class=p3d-sombra>
                   </div>
                   <div class=info-livro>…</div>
                 </div>
               </article>                                        */
  function prepararCard(card, indice) {
    if (card.classList.contains("p3d-card")) return;
    card.classList.add("p3d-card");

    var flutua = document.createElement("div");
    flutua.className = "p3d-flutua";
    while (card.firstChild) flutua.appendChild(card.firstChild);
    card.appendChild(flutua);

    var capa = flutua.querySelector(".capa");
    if (capa) {
      var corpo = document.createElement("div");
      corpo.className = "p3d-corpo";
      capa.parentNode.insertBefore(corpo, capa);
      corpo.appendChild(capa);
      corpo.insertAdjacentHTML("beforeend",
        '<span class="p3d-lombada" aria-hidden="true"></span>' +
        '<span class="p3d-paginas" aria-hidden="true"></span>' +
        '<span class="p3d-sombra" aria-hidden="true"></span>');
      /* O véu vai DENTRO da capa (que já corta nos cantos
         arredondados). É ele que escurece o livro das pontas. */
      capa.insertAdjacentHTML("beforeend",
        '<span class="p3d-veu" aria-hidden="true"></span>');
    }

    /* Ritmo próprio de flutuação: quem balança junto parece
       preso na mesma prateleira; quem balança em tempos
       diferentes parece solto no espaço. */
    var r1 = pseudoAleatorio(indice + 1);
    var r2 = pseudoAleatorio(indice + 37);
    card.style.setProperty("--p3d-dur",    (5.2 + r1 * 3.6).toFixed(2) + "s");
    card.style.setProperty("--p3d-atraso", (-r2 * 6).toFixed(2) + "s");
    card.style.setProperty("--p3d-amp",    (5 + r1 * 6).toFixed(1) + "px");
    card.style.setProperty("--p3d-giro",   (0.7 + r2 * 1.6).toFixed(2) + "deg");
  }

  /* ---------- Ativar uma fileira ---------- */
  function ativar(trilho, opcoes) {
    if (!trilho || trilho.__p3d) return null;
    var cfg = Object.assign({}, PADRAO, opcoes || {});
    var palco = trilho.parentElement || trilho;

    trilho.classList.add("p3d-trilho");
    palco.classList.add("p3d-palco");

    var cards = Array.prototype.slice.call(trilho.querySelectorAll(".card-livro"));
    cards.forEach(prepararCard);

    var pendente = false;   // já tem um quadro agendado?
    var visivel  = true;    // a fileira está na tela?

    function aplicarEstaticos() {
      trilho.style.setProperty("--p3d-espessura", cfg.espessura + "px");
      cards.forEach(function (card) {
        card.style.setProperty("--p3d-espessura", cfg.espessura + "px");
        card.querySelectorAll(".p3d-corpo").forEach(function (c) {
          c.style.setProperty("--p3d-espessura", cfg.espessura + "px");
        });
        var flutua = card.querySelector(".p3d-flutua");
        if (flutua) flutua.style.animationPlayState = cfg.flutuar ? "running" : "paused";
      });
      if (!cfg.parallax) {
        palco.style.setProperty("--p3d-inclina-x", "0deg");
        palco.style.setProperty("--p3d-inclina-y", "0deg");
      }
    }

    /* O coração: mede e posiciona todo mundo.

       Em DUAS PASSADAS de propósito. Se a gente medisse e mexesse
       no mesmo laço (mede o livro 1, mexe no livro 1, mede o 2…),
       o navegador seria obrigado a recalcular o layout da página
       inteira a cada livro — é o "layout thrashing", e num celular
       simples ele engasga a rolagem. Medindo TUDO primeiro e só
       depois mexendo, o layout é calculado uma vez só. */
    var poses = [];

    function desenhar() {
      pendente = false;
      if (movimentoReduzido()) return;

      /* --- passada 1: só MEDE (nada de escrever) --- */
      var janela = trilho.getBoundingClientRect();
      var centro = janela.left + janela.width / 2;
      var meia   = (janela.width / 2) * cfg.alcance || 1;
      poses.length = 0;

      for (var i = 0; i < cards.length; i++) {
        var c = cards[i].getBoundingClientRect();
        /* Livro muito fora da janela não precisa de conta:
           economiza bateria em fileira comprida. */
        if (c.right < janela.left - 240 || c.left > janela.right + 240) continue;
        poses.push({
          card: cards[i],
          d: limitar((c.left + c.width / 2 - centro) / meia, -1, 1)
        });
      }

      /* --- passada 2: só ESCREVE --- */
      for (var k = 0; k < poses.length; k++) {
        var card = poses[k].card;
        var d = poses[k].d;
        var fora = Math.abs(d);

        /* Sinal POSITIVO de propósito: o livro da direita vira com a
           lombada para nós, olhando para o centro da fileira (é o
           giro do Cover Flow). Com o sinal trocado eles viram para
           FORA — some a lombada e a estante parece explodindo. */
        card.style.setProperty("--p3d-ry",  (d * cfg.rotacao).toFixed(2) + "deg");
        card.style.setProperty("--p3d-tz",  (-fora * cfg.profundidade).toFixed(1) + "px");
        card.style.setProperty("--p3d-sc",  (1 - fora * cfg.escala).toFixed(3));
        card.style.setProperty("--p3d-luz", (1 - fora * cfg.sombra).toFixed(3));
        /* --p3d-foco: 1 no centro, 0 nas pontas. Acende o halo e
           o texto do livro que está "em foco". */
        card.style.setProperty("--p3d-foco", Math.max(0, 1 - fora * 2.1).toFixed(3));
      }
    }

    function agendar() {
      if (pendente || !visivel) return;
      pendente = true;
      requestAnimationFrame(desenhar);
    }

    /* ---------- Parallax do mouse ----------
       A estante inteira acompanha de leve o ponteiro. É o que
       convence o olho de que existe profundidade ali: o cenário
       responde a quem olha. Só no desktop — no celular a própria
       rolagem já dá o efeito. */
    function aoMover(e) {
      if (!cfg.parallax || movimentoReduzido()) return;
      var r = palco.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width  - 0.5;   // -0.5 … 0.5
      var py = (e.clientY - r.top)  / r.height - 0.5;
      palco.style.setProperty("--p3d-inclina-y", (px *  7).toFixed(2) + "deg");
      palco.style.setProperty("--p3d-inclina-x", (py * -5).toFixed(2) + "deg");
    }
    function aoSair() {
      palco.style.setProperty("--p3d-inclina-x", "0deg");
      palco.style.setProperty("--p3d-inclina-y", "0deg");
    }

    trilho.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    var finoPonteiro = window.matchMedia && window.matchMedia("(hover: hover)").matches;
    if (finoPonteiro) {
      palco.addEventListener("pointermove", aoMover);
      palco.addEventListener("pointerleave", aoSair);
    }

    /* Fileira fora da tela = motor desligado. */
    var observador = null;
    if (window.IntersectionObserver) {
      observador = new IntersectionObserver(function (entradas) {
        visivel = entradas[0].isIntersecting;
        if (visivel) agendar();
      }, { rootMargin: "120px" });
      observador.observe(palco);
    }

    aplicarEstaticos();
    agendar();

    var api = {
      /* Muda os números ao vivo (é o que o painel usa). */
      config: function (novos) {
        Object.assign(cfg, novos || {});
        aplicarEstaticos();
        agendar();
        return cfg;
      },
      valores: function () { return Object.assign({}, cfg); },
      atualizar: agendar,
      desligar: function () {
        trilho.removeEventListener("scroll", agendar);
        window.removeEventListener("resize", agendar);
        palco.removeEventListener("pointermove", aoMover);
        palco.removeEventListener("pointerleave", aoSair);
        if (observador) observador.disconnect();
        delete trilho.__p3d;
      }
    };
    trilho.__p3d = api;
    return api;
  }

  return { ativar: ativar, PADRAO: PADRAO };
})();


/* ============================================================
   DAQUI PARA BAIXO: só a página de demonstração
   ------------------------------------------------------------
   Monta as fileiras com os livros reais do js/livros.js e liga
   os controles do painel. Nada disso vai para a loja.
   ============================================================ */
(function () {
  "use strict";

  var alvo = document.getElementById("p3d-catalogo");
  if (!alvo || typeof LIVROS === "undefined") return;

  var motores = [];

  function precoDe(livro) {
    if (!window.Precos) return livro.preco || "";
    return Precos.formatarBRL(Precos.precoUnitario(livro, 1));
  }

  function capaDe(livro) {
    var src = window.Util ? Util.imagemSrcSegura(livro.imagem) : livro.imagem;
    if (src) {
      return '<img src="' + esc(src) + '" alt="Capa de ' + esc(livro.titulo) + '" loading="lazy">';
    }
    return '<div class="capa-fallback" aria-hidden="true">' +
           esc(String(livro.titulo || "?").charAt(0).toUpperCase()) + '</div>';
  }

  /* Card com a MESMA marcação da loja (mesmas classes) — assim o
     que se vê aqui é o que se veria lá dentro. */
  function montarCard(livro) {
    var card = document.createElement("article");
    card.className = "card-livro";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", livro.titulo + ", " + livro.autor);
    card.innerHTML =
      '<div class="capa">' + capaDe(livro) + '</div>' +
      '<div class="info-livro">' +
        '<h3 class="info-titulo">' + esc(livro.titulo) + '</h3>' +
        '<p class="info-autor">' + esc(livro.autor) + '</p>' +
        '<p class="info-preco">' + esc(precoDe(livro)) + '</p>' +
      '</div>';
    return card;
  }

  function montarFileira(titulo, etiqueta, livros) {
    var secao = document.createElement("section");
    secao.className = "fileira";
    secao.innerHTML =
      '<div class="fileira-cabecalho">' +
        (etiqueta ? '<span class="fileira-etiqueta">' + esc(etiqueta) + '</span>' : '') +
        '<h2 class="fileira-titulo">' + esc(titulo) + '</h2>' +
      '</div>';

    var area = document.createElement("div");
    area.className = "fileira-area";
    var trilho = document.createElement("div");
    trilho.className = "fileira-trilho";
    livros.forEach(function (l) { trilho.appendChild(montarCard(l)); });
    area.appendChild(trilho);
    secao.appendChild(area);
    alvo.appendChild(secao);

    var motor = Vitrine3D.ativar(trilho);
    if (motor) motores.push(motor);
  }

  /* Agrupa o catálogo por gênero, como a loja faz. */
  var porGenero = {};
  LIVROS.forEach(function (l) {
    if (!l || (l.estoque !== undefined && l.estoque <= 0)) return;
    var g = l.genero || "Outros";
    (porGenero[g] = porGenero[g] || []).push(l);
  });

  Object.keys(porGenero)
    .filter(function (g) { return porGenero[g].length >= 4; })
    .slice(0, 4)
    .forEach(function (g, i) {
      montarFileira(g, i === 0 ? "Role para o lado e veja os livros virarem" : "", porGenero[g]);
    });

  /* ---------- Painel de ajustes ---------- */
  function ligarControle(id, chave, sufixo, divisor) {
    var input = document.getElementById(id);
    if (!input) return;
    var saida = document.getElementById(id + "-valor");
    function aplicar() {
      var v = parseFloat(input.value) / (divisor || 1);
      var novo = {};
      novo[chave] = v;
      motores.forEach(function (m) { m.config(novo); });
      if (saida) saida.textContent = input.value + (sufixo || "");
    }
    input.addEventListener("input", aplicar);
    aplicar();
  }

  function ligarChave(id, chave) {
    var input = document.getElementById(id);
    if (!input) return;
    input.addEventListener("change", function () {
      var novo = {};
      novo[chave] = input.checked;
      motores.forEach(function (m) { m.config(novo); });
    });
  }

  ligarControle("p3d-rotacao",      "rotacao",      "°");
  ligarControle("p3d-profundidade", "profundidade", "px");
  ligarControle("p3d-espessura",    "espessura",    "px");
  ligarControle("p3d-sombra",       "sombra",       "%", 100);
  ligarChave("p3d-flutuar",  "flutuar");
  ligarChave("p3d-parallax", "parallax");
})();
