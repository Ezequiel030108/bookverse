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
    // Foto de um livro do painel, servida pela API (veja api/catalogo.js).
    if (/^\/api\/img-livro\?id=[a-z0-9._%-]+(&v=[a-f0-9]+)?$/i.test(u)) return u;
    return "";
  }

  /* A mesma foto, em WebP (bem mais leve): é ela que a loja MOSTRA.
     - Capa do site (img/x.jpg|png) → img/x.webp, gerada na publicação
       por scripts/gerar-webp.js.
     - Foto do painel (/api/img-livro) → o servidor converte (&f=webp).
     - Endereço externo ou data:image: fica como está.
     O original continua valendo para quem está fora do site (feed do
     Google, compartilhar no WhatsApp…). Use sempre depois de
     imagemSrcSegura(). */
  function imagemWebp(src) {
    const u = String(src || "");
    if (/^\/?img\/[a-z0-9_\-./]+\.(jpe?g|png)$/i.test(u)) return u.replace(/\.(jpe?g|png)$/i, ".webp");
    if (/^\/api\/img-livro\?/i.test(u) && !/[?&]f=/i.test(u)) return u + "&f=webp";
    return u;
  }

  /* Rede de segurança: se o WebP faltar (capa nova ainda sem .webp) ou o
     navegador for antigo demais, a <img> volta para o original guardado
     em data-orig. */
  document.addEventListener("error", function (e) {
    const img = e.target;
    if (!img || img.tagName !== "IMG" || !img.dataset || !img.dataset.orig || !img.getAttribute("src")) return;
    const orig = img.dataset.orig;
    delete img.dataset.orig;
    if (orig && img.getAttribute("src") !== orig) img.src = orig;
  }, true);

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

  window.Util = { esc, imagemSrcSegura, imagemWebp, debounce, prenderFoco };
  window.esc = esc;   // atalho usado nos templates

})();
