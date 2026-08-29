/* ============================================================
   BOOKVERSE — LIVRO 3D (montagem do bloco)
   ------------------------------------------------------------
   Transforma a capa de um livro (a <div class="capa"> que a loja
   já cria) num paralelepípedo de seis faces.

   Uso:
       Livro3D.montar(capa, { titulo: "Berserk", espessura: 24 });

   A capa NÃO é jogada fora: ela vira a face da frente do bloco,
   com a mesma foto e o mesmo selo de "Novo" que já estavam lá.

   Sobre a GROSSURA de cada livro:
   a loja não guarda o número de páginas, então:
     • se o livro tiver "paginas" no js/livros.js, a grossura sai
       de lá (a conta está em espessuraDe(), logo abaixo);
     • senão, ela é tirada do próprio título, sempre com o mesmo
       resultado para o mesmo livro. Não é o número real, mas
       impede o efeito de "estante de livros clonados", em que
       todos têm exatamente a mesma grossura e a fileira fica com
       cara de papel de parede.
   Quem quiser a grossura certinha de um livro é só acrescentar
   "paginas: 320" no cadastro dele.
   ============================================================ */

window.Livro3D = (function () {
  "use strict";

  var MIN = 12;    // px — um mangá fininho
  var MAX = 40;    // px — um clássico de 700 páginas

  function limitar(v, min, max) { return v < min ? min : (v > max ? max : v); }

  /* Número estável a partir de um texto (0…1). O mesmo título dá
     sempre a mesma grossura — inclusive depois de recarregar. */
  function semente(texto) {
    var s = 0, t = String(texto || "");
    for (var i = 0; i < t.length; i++) s = (s * 31 + t.charCodeAt(i)) % 100000;
    return s / 100000;
  }

  /* A grossura de um livro, em pixels. */
  function espessuraDe(livro, larguraCard) {
    var base;
    if (livro && livro.espessura) {
      base = Number(livro.espessura);
    } else if (livro && livro.paginas) {
      /* Papel comum: mais ou menos 1 cm a cada 100 folhas. Como o
         card tem ~140px para uns 20cm de livro, cada 100 páginas
         valem uns 3,5px. */
      base = 8 + (Number(livro.paginas) / 100) * 3.5;
    } else {
      base = MIN + semente((livro && livro.titulo) || "") * (MAX - MIN);
    }
    /* A grossura acompanha o tamanho do card: num celular o livro
       é menor, e uma lombada de 30px ficaria desproporcional. */
    var escala = (larguraCard || 140) / 140;
    return limitar(base * escala, 8, MAX);
  }

  /* Monta o bloco. Devolve o elemento .livro3d criado. */
  function montar(capa, opcoes) {
    if (!capa || capa.classList.contains("l3d-frente")) return capa.closest(".livro3d");
    var o = opcoes || {};

    var caixa = document.createElement("div");
    caixa.className = "livro3d";
    capa.parentNode.insertBefore(caixa, capa);
    caixa.appendChild(capa);

    /* A capa que já existia vira a face da frente. */
    capa.classList.add("l3d-face", "l3d-frente");

    var titulo = String(o.titulo || "");
    caixa.insertAdjacentHTML("beforeend",
      '<div class="l3d-face l3d-verso" aria-hidden="true">' +
        '<span class="l3d-verso-marca">BookVerse</span>' +
      '</div>' +
      '<div class="l3d-face l3d-lombada" aria-hidden="true">' +
        '<span class="l3d-lombada-titulo"></span>' +
      '</div>' +
      '<div class="l3d-face l3d-corte" aria-hidden="true"></div>' +
      '<div class="l3d-face l3d-topo" aria-hidden="true"></div>' +
      '<div class="l3d-face l3d-base" aria-hidden="true"></div>');

    /* textContent (e não HTML) porque o título vem do catálogo. */
    caixa.querySelector(".l3d-lombada-titulo").textContent = titulo;

    if (o.espessura) caixa.style.setProperty("--l3d-e", o.espessura + "px");
    return caixa;
  }

  /* Informa ao bloco o tamanho real que ele ocupa na tela.
     É preciso em pixels: o CSS empurra cada face até a superfície
     com translateZ, e translateZ não aceita porcentagem. */
  function medir(elemento, largura, altura) {
    elemento.style.setProperty("--l3d-l", largura + "px");
    elemento.style.setProperty("--l3d-a", altura + "px");
  }

  return { montar: montar, medir: medir, espessuraDe: espessuraDe, MIN: MIN, MAX: MAX };
})();
