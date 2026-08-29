/* ============================================================
   BOOKVERSE — PROTÓTIPO: A BANCADA
   ------------------------------------------------------------
   Só da página prototipo-livro-3d.html: um livro sozinho que dá
   para girar com o dedo/mouse, para conferir as seis faces do
   bloco de perto.

   Nada disto vai para a loja.
   ============================================================ */
(function () {
  "use strict";

  var bancada = document.getElementById("bancada");
  if (!bancada || typeof LIVROS === "undefined" || !window.Livro3D) return;

  var comFoto = LIVROS.filter(function (l) { return l && l.imagem; });
  if (!comFoto.length) return;

  var bloco = null;
  var girox = -14, giroy = -32;    // pose atual, em graus

  function aplicarPose() {
    bancada.style.setProperty("--l3d-girox", girox.toFixed(1) + "deg");
    bancada.style.setProperty("--l3d-giroy", giroy.toFixed(1) + "deg");
  }

  function pararGiroAutomatico() {
    bancada.classList.remove("girando");
  }

  /* ---------- Montar o livro escolhido ---------- */
  function montarLivro(livro) {
    bancada.innerHTML = "";

    var capa = document.createElement("div");
    capa.className = "capa";
    /* Se o livro tiver a foto só da capa (imagemCapa), é ela que
       veste o bloco — ver a nota no fim da página. */
    var bruta = livro.imagemCapa || livro.imagem;
    var src = window.Util ? Util.imagemSrcSegura(bruta) : bruta;
    capa.innerHTML = '<img src="' + esc(src) + '" alt="Capa de ' + esc(livro.titulo) + '">';
    bancada.appendChild(capa);

    bloco = Livro3D.montar(capa, { titulo: livro.titulo });
    /* O bloco precisa saber quanto ocupa na tela: o CSS empurra
       cada face até a superfície em pixels. */
    Livro3D.medir(bloco, bloco.offsetWidth, bloco.offsetHeight);
    aplicarGrossura();
    aplicarPose();
  }

  function aplicarGrossura() {
    var faixa = document.getElementById("l3d-grossura");
    if (!bloco || !faixa) return;
    bloco.style.setProperty("--l3d-e", faixa.value + "px");
    var saida = document.getElementById("l3d-grossura-valor");
    if (saida) saida.textContent = faixa.value + "px";
  }

  /* ---------- Arrastar para girar ---------- */
  var arrastando = false, xAnterior = 0, yAnterior = 0;

  bancada.addEventListener("pointerdown", function (e) {
    arrastando = true;
    xAnterior = e.clientX;
    yAnterior = e.clientY;
    pararGiroAutomatico();
    aplicarPose();
    bancada.setPointerCapture(e.pointerId);
  });

  bancada.addEventListener("pointermove", function (e) {
    if (!arrastando) return;
    giroy += (e.clientX - xAnterior) * 0.5;
    /* O eixo vertical fica preso entre -60° e 60°: passando disso
       o livro capota e a leitura fica confusa. */
    girox = Math.max(-60, Math.min(60, girox - (e.clientY - yAnterior) * 0.35));
    xAnterior = e.clientX;
    yAnterior = e.clientY;
    aplicarPose();
  });

  function soltar(e) {
    if (!arrastando) return;
    arrastando = false;
    try { bancada.releasePointerCapture(e.pointerId); } catch (err) {}
  }
  bancada.addEventListener("pointerup", soltar);
  bancada.addEventListener("pointercancel", soltar);

  /* ---------- Poses prontas ---------- */
  var VISTAS = {
    capa:        { x: 0,   y: 0 },
    lombada:     { x: 0,   y: 88 },     /* quase de perfil: o lado do livro */
    verso:       { x: 0,   y: 180 },
    tresquartos: { x: -14, y: -32 }
  };

  document.querySelectorAll(".l3d-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var vista = btn.dataset.vista;
      if (vista === "girar") {
        bancada.classList.add("girando");
        return;
      }
      pararGiroAutomatico();
      var p = VISTAS[vista];
      if (!p) return;
      /* Anima só nesta troca de vista (o arrasto tem que ser
         instantâneo, senão fica com atraso no dedo). */
      bloco.style.transition = "transform .5s cubic-bezier(.32,.72,.35,1)";
      girox = p.x; giroy = p.y;
      aplicarPose();
      setTimeout(function () { if (bloco) bloco.style.transition = ""; }, 520);
    });
  });

  /* ---------- Escolher o livro ---------- */
  var seletor = document.getElementById("l3d-livro");
  comFoto.forEach(function (l, i) {
    var op = document.createElement("option");
    op.value = String(i);
    op.textContent = l.titulo;
    seletor.appendChild(op);
  });
  seletor.addEventListener("change", function () {
    montarLivro(comFoto[Number(seletor.value)]);
  });

  document.getElementById("l3d-grossura").addEventListener("input", aplicarGrossura);

  montarLivro(comFoto[0]);
})();
