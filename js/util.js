/* ============================================================
   BOOKVERSE — UTILIDADES COMPARTILHADAS
   ------------------------------------------------------------
   Funções pequenas usadas por todas as páginas. A mais
   importante é esc(): ela impede que textos vindos do catálogo
   (título, autor, sinopse…) sejam interpretados como código
   HTML — proteção contra injeção (XSS).

   Não precisa mexer aqui.
   ============================================================ */

(function () {

  /* Escapa texto para uso seguro dentro de HTML (conteúdo e atributos). */
  function esc(texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* Endereço de imagem seguro: só caminhos locais, http(s) ou data:image.
     Qualquer outra coisa (ex.: "javascript:") é descartada. */
  function imagemSrcSegura(url) {
    const u = String(url || "").trim();
    if (!u) return "";
    if (/^(https?:\/\/|data:image\/)/i.test(u)) return u;
    if (/^[a-z0-9_\-./]+$/i.test(u) && u.indexOf("..") < 0) return u; // caminho relativo (img/...)
    return "";
  }

  /* Adia a execução até parar de chamar por `ms` (ex.: busca). */
  function debounce(fn, ms) {
    let t;
    return function () {
      const args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(self, args), ms || 150);
    };
  }

  /* Prende o Tab dentro de um diálogo aberto e devolve o foco ao
     elemento de origem quando fechar. Uso:
       const soltar = prenderFoco(caixa);  // ao abrir
       soltar();                            // ao fechar          */
  function prenderFoco(container) {
    const origem = document.activeElement;
    const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

    function aoTeclar(e) {
      if (e.key !== "Tab") return;
      const els = Array.from(container.querySelectorAll(FOCAVEIS))
        .filter(el => el.offsetParent !== null || el === document.activeElement);
      if (!els.length) return;
      const primeiro = els[0], ultimo = els[els.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    }

    document.addEventListener("keydown", aoTeclar, true);
    // Foca o primeiro elemento útil do diálogo.
    const alvo = container.querySelector(FOCAVEIS);
    if (alvo) setTimeout(() => alvo.focus(), 30);

    return function soltar() {
      document.removeEventListener("keydown", aoTeclar, true);
      if (origem && origem.focus) { try { origem.focus(); } catch (e) {} }
    };
  }

  window.Util = { esc, imagemSrcSegura, debounce, prenderFoco };
  window.esc = esc;   // atalho usado nos templates

})();
