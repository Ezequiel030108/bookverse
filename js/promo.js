/* ============================================================
   BOOKVERSE — FAIXA DA PROMOÇÃO (topo da vitrine)
   ------------------------------------------------------------
   Este arquivo roda LOGO ABAIXO do cabeçalho, antes de o resto
   da página existir. Assim a faixa já nasce no lugar certo e não
   empurra o carrossel nem a estante para baixo depois que a tela
   já apareceu (era o "pulo" que o Google mede como CLS).

   NÃO coloque defer/async na tag deste arquivo no index.html.
   As regras da promoção (datas, %, tema) continuam em js/livros.js
   (a constante PROMOCAO) — não precisa mexer aqui.
   ============================================================ */
(function () {
  if (!window.Precos || !window.Precos.promoAtiva()) return;
  const topbar = document.getElementById("topbar");
  if (!topbar) return;
  const esc = window.esc || (t => String(t == null ? "" : t));

  /* O desconto cresce levando 2 ou mais? (mesmo % nos dois = desconto único) */
  const temDupla = PROMOCAO.descontoDupla > PROMOCAO.descontoUm;
  /* Hoje é o último dia da promoção? */
  const h = new Date();
  const hoje = h.getFullYear() + "-" + String(h.getMonth() + 1).padStart(2, "0") +
               "-" + String(h.getDate()).padStart(2, "0");
  const ultimoDia = hoje === PROMOCAO.fim;

  document.body.classList.add("modo-promo");
  const tema = /^[a-z0-9-]+$/.test(PROMOCAO.tema || "") ? PROMOCAO.tema : "";
  if (tema) document.body.classList.add("promo-tema-" + tema);

  /* Confete e balões da faixa do Dia das Crianças (só decoração). */
  const CONFETE_CRIANCAS = [
    [2.5, 7, "ciano", "tira", 28], [33, 5, "verde", "tira", -24], [68, 6, "lavanda", "bolinha", 0],
    [60, 40, "rosa", "bolinha", 0], [50, 70, "ouro", "tira", -38], [43, 91, "rosa", "tira", 40],
    [7, 93, "verde", "bolinha", 0], [72, 90, "ciano", "bolinha", 0]
  ];
  const DECORACAO_CRIANCAS = CONFETE_CRIANCAS.map(([x, y, cor, forma, giro]) =>
    `<i class="confete ${forma} ${cor}" style="left:${x}%;top:${y}%;--giro:${giro}deg" aria-hidden="true"></i>`
  ).join("") + `
  <svg class="vitrine-baloes" viewBox="0 0 120 160" aria-hidden="true" focusable="false">
    <g fill="none" stroke="rgba(243,237,255,.55)" stroke-width="1.2" stroke-linecap="round">
      <path d="M37 76c-3 18 10 30 23 42s4 26 2 40"/>
      <path d="M85 68c4 16-8 26-18 40s-6 30-5 50"/>
      <path d="M62 98c-5 14 6 26 1 38s-2 16-1 22"/>
    </g>
    <path d="M37 75 33 80h8z" fill="#ff7ad9"/>
    <ellipse cx="37" cy="48" rx="22" ry="27" fill="#ff7ad9"/>
    <ellipse cx="29" cy="37" rx="5" ry="8" fill="#fff" opacity=".42" transform="rotate(24 29 37)"/>
    <path d="M85 67 81 72h8z" fill="#7adfff"/>
    <ellipse cx="85" cy="41" rx="21" ry="26" fill="#7adfff"/>
    <ellipse cx="77" cy="31" rx="4.6" ry="7.6" fill="#fff" opacity=".45" transform="rotate(24 77 31)"/>
    <path d="M62 97 58 102h8z" fill="#ffd966"/>
    <ellipse cx="62" cy="71" rx="20" ry="25" fill="#ffd966"/>
    <ellipse cx="55" cy="61" rx="4.4" ry="7.2" fill="#fff" opacity=".5" transform="rotate(24 55 61)"/>
  </svg>`;

  const ofertas = temDupla
    ? `
        <ol class="vitrine-rota">
          <li class="vitrine-parada">
            <span class="parada-estrela" aria-hidden="true"></span>
            <span class="vitrine-pct">${PROMOCAO.descontoUm}<small>% OFF</small></span>
            <span class="vitrine-oferta-txt">levando 1 livro</span>
          </li>
          <li class="vitrine-parada destaque">
            <span class="parada-estrela" aria-hidden="true"></span>
            <span class="vitrine-selo">Melhor escolha</span>
            <span class="vitrine-pct">${PROMOCAO.descontoDupla}<small>% OFF</small></span>
            <span class="vitrine-oferta-txt">em cada livro, levando 2 ou mais</span>
          </li>
        </ol>`
    : `
        <p class="vitrine-unica">
          <span class="vitrine-pct">${PROMOCAO.descontoUm}<small>% OFF</small></span>
          <span class="vitrine-oferta-txt">em todos os livros da loja</span>
        </p>`;

  const vitrine = document.createElement("section");
  vitrine.className = "vitrine-promo";
  vitrine.id = "vitrine-promo";
  vitrine.tabIndex = -1;   // o selo flutuante (js/main.js) leva o foco até aqui
  vitrine.setAttribute("aria-label", "Promoção " + PROMOCAO.nome);
  vitrine.innerHTML = `
    <div class="vitrine-card${temDupla ? "" : " unica"}">
      <span class="vitrine-aurora" aria-hidden="true"></span>
      ${tema === "criancas" ? DECORACAO_CRIANCAS : ""}
      <div class="vitrine-conteudo">
        <div class="vitrine-head">
          <span class="vitrine-tag">${esc(PROMOCAO.nome)}</span>
          <span class="vitrine-prazo${ultimoDia ? " urgente" : ""}">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            ${ultimoDia ? "Último dia!" : "Até " + window.Precos.dataFimPromo()}
          </span>
        </div>${ofertas}
      </div>
    </div>
  `;
  topbar.insertAdjacentElement("afterend", vitrine);
})();
