/* ============================================================
   BOOKVERSE — STORY DE LIVRO PARA O INSTAGRAM (painel do admin)
   ------------------------------------------------------------
   Desenha a arte do story (1080×1920) com o molde da BookVerse —
   céu roxo, estrelas, a capa do livro, o nome e o preço —,
   mostra a prévia num modal e envia para /api/postar-story
   publicar na conta conectada (Administração → Instagram).

   Quer usar um molde SEU? Salve uma imagem 1080×1920 em
   img/story-molde.jpg: ela vira o fundo (no lugar do céu, da
   marca e do rodapé) e a capa, o nome e o preço continuam sendo
   desenhados por cima, nas mesmas posições.

   Não precisa mexer aqui.
   ============================================================ */

(function () {
  const CFG = window.LOJA_CONFIG || {};
  const W = 1080, H = 1920;          // tamanho oficial de story (9:16)

  const $ = (id) => document.getElementById(id);

  let livroAtual = null;
  let ocupado = false;               // publicando agora? (trava o modal)

  /* ================= Desenho da arte ================= */

  function carregarImagem(src) {
    return new Promise((resolve) => {
      const seguro = (window.Util && window.Util.imagemSrcSegura)
        ? window.Util.imagemSrcSegura(src) : String(src || "");
      if (!seguro) { resolve(null); return; }
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = seguro;
    });
  }

  /* Números "aleatórios" com semente fixa: as estrelas caem sempre
     nos mesmos lugares e a prévia fica idêntica ao story publicado. */
  function geradorAleatorio(semente) {
    let s = semente | 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function retanguloArredondado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* Quebra um texto em linhas que caibam na largura dada. */
  function quebrarLinhas(ctx, texto, larguraMax) {
    const palavras = String(texto || "").trim().split(/\s+/);
    const linhas = [];
    let atual = "";
    palavras.forEach((p) => {
      const teste = atual ? atual + " " + p : p;
      if (!atual || ctx.measureText(teste).width <= larguraMax) atual = teste;
      else { linhas.push(atual); atual = p; }
    });
    if (atual) linhas.push(atual);
    return linhas;
  }

  /* Acha o maior tamanho de fonte em que o texto cabe em N linhas
     (se nem no menor couber, corta com reticências). */
  function ajustarTexto(ctx, texto, montarFonte, tamMax, tamMin, larguraMax, linhasMax) {
    for (let t = tamMax; t >= tamMin; t -= 2) {
      ctx.font = montarFonte(t);
      const linhas = quebrarLinhas(ctx, texto, larguraMax);
      if (linhas.length <= linhasMax) return { tamanho: t, linhas };
    }
    ctx.font = montarFonte(tamMin);
    const linhas = quebrarLinhas(ctx, texto, larguraMax).slice(0, linhasMax);
    let ultima = linhas[linhas.length - 1] || "";
    while (ultima && ctx.measureText(ultima + "…").width > larguraMax) {
      ultima = ultima.replace(/\s*\S+$/, "");
    }
    linhas[linhas.length - 1] = (ultima || "…") + "…";
    return { tamanho: tamMin, linhas };
  }

  /* Fundo padrão: o céu da BookVerse (gradiente roxo, estrelas e
     um meteoro), igual ao clima do site. */
  function desenharCeu(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#2e1f8a");
    grad.addColorStop(0.45, "#14093a");
    grad.addColorStop(1, "#0a0524");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // brilho suave atrás da capa
    const brilho = ctx.createRadialGradient(W / 2, 830, 90, W / 2, 830, 700);
    brilho.addColorStop(0, "rgba(74, 43, 181, 0.5)");
    brilho.addColorStop(1, "rgba(74, 43, 181, 0)");
    ctx.fillStyle = brilho;
    ctx.fillRect(0, 0, W, H);

    // estrelas
    const rnd = geradorAleatorio(20260716);
    for (let i = 0; i < 130; i++) {
      const x = rnd() * W, y = rnd() * H;
      const raio = 0.8 + rnd() * 1.8;
      ctx.globalAlpha = 0.25 + rnd() * 0.6;
      ctx.fillStyle = rnd() < 0.22 ? "#ffd966" : "#f3edff";
      ctx.beginPath(); ctx.arc(x, y, raio, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // meteoro no canto superior direito
    const meteoro = ctx.createLinearGradient(690, 265, 985, 138);
    meteoro.addColorStop(0, "rgba(255, 243, 168, 0)");
    meteoro.addColorStop(1, "rgba(255, 243, 168, 0.9)");
    ctx.strokeStyle = meteoro;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(690, 265); ctx.lineTo(985, 138); ctx.stroke();
    ctx.fillStyle = "#fff3a8";
    ctx.beginPath(); ctx.arc(985, 138, 7, 0, Math.PI * 2); ctx.fill();
  }

  /* Marca da loja no topo (logo + nome + cidade). */
  async function desenharMarca(ctx) {
    const logo = await carregarImagem("img/logo.png");
    let y = 96;
    if (logo) {
      const t = 92;
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, y + t / 2, t / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logo, W / 2 - t / 2, y, t, t);
      ctx.restore();
      y += t;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f3edff";
    ctx.font = '700 62px "Playfair Display", serif';
    ctx.fillText(CFG.nomeLoja || "BookVerse", W / 2, y + 76);
    ctx.font = "500 30px Inter, sans-serif";
    ctx.fillStyle = "rgba(216, 202, 255, 0.85)";
    ctx.fillText("Livraria" + (CFG.cidade ? " · " + CFG.cidade : ""), W / 2, y + 126);
  }

  /* A capa do livro, grande e centralizada, com sombra e borda de
     vidro. Sem foto, desenha uma capa com a inicial do título
     (igual a loja faz). */
  async function desenharCapa(ctx, livro) {
    const maxW = 640, maxH = 860, cx = W / 2, cy = 830;
    const img = await carregarImagem(livro.imagem || "");
    let w = 600, h = 850;
    if (img && img.width && img.height) {
      const escala = Math.min(maxW / img.width, maxH / img.height);
      w = Math.round(img.width * escala);
      h = Math.round(img.height * escala);
    }
    const x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);

    // sombra
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 70;
    ctx.shadowOffsetY = 26;
    retanguloArredondado(ctx, x, y, w, h, 24);
    ctx.fillStyle = "#1f1466";
    ctx.fill();
    ctx.restore();

    // a foto (ou a capa desenhada), recortada nos cantos arredondados
    ctx.save();
    retanguloArredondado(ctx, x, y, w, h, 24);
    ctx.clip();
    if (img) {
      ctx.drawImage(img, x, y, w, h);
    } else {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, "#4a2bb5");
      g.addColorStop(1, "#2e1f8a");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#d8caff";
      ctx.font = '700 300px "Playfair Display", serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((livro.titulo || "?").charAt(0).toUpperCase(), x + w / 2, y + h / 2 + 16);
    }
    ctx.restore();

    // borda de vidro
    retanguloArredondado(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 22);
    ctx.strokeStyle = "rgba(216, 202, 255, 0.4)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  /* Título, autor e a pílula dourada do preço, centralizados no
     espaço entre a capa e o rodapé. */
  function desenharTextos(ctx, livro) {
    const larguraMax = 920;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const titulo = ajustarTexto(
      ctx, livro.titulo || "Livro",
      (t) => '800 ' + t + 'px "Playfair Display", serif',
      68, 46, larguraMax, 2);
    const alturaLinha = Math.round(titulo.tamanho * 1.18);

    const autor = String(livro.autor || "").trim();
    const preco = String(livro.preco || "").trim();

    const hTitulo = titulo.linhas.length * alturaLinha;
    const hAutor = autor ? 66 : 0;
    const hPreco = preco ? 130 : 0;
    const topo = 1310, base = 1796;
    let y = topo + Math.max(0, (base - topo - hTitulo - hAutor - hPreco) / 2);

    // título
    ctx.font = '800 ' + titulo.tamanho + 'px "Playfair Display", serif';
    ctx.fillStyle = "#f3edff";
    titulo.linhas.forEach((linha) => { ctx.fillText(linha, W / 2, y); y += alturaLinha; });

    // autor
    if (autor) {
      y += 10;
      ctx.font = "italic 400 40px Inter, sans-serif";
      ctx.fillStyle = "#b89eff";
      const linhaAutor = quebrarLinhas(ctx, "de " + autor, larguraMax)[0] || "";
      ctx.fillText(linhaAutor, W / 2, y);
      y += 56;
    }

    // preço na pílula dourada
    if (preco) {
      y += 26;
      ctx.font = "700 56px Inter, sans-serif";
      const larguraPreco = Math.min(larguraMax, ctx.measureText(preco).width + 96);
      const alturaPreco = 104;
      const xP = (W - larguraPreco) / 2;
      ctx.save();
      ctx.shadowColor = "rgba(255, 217, 102, 0.35)";
      ctx.shadowBlur = 40;
      retanguloArredondado(ctx, xP, y, larguraPreco, alturaPreco, alturaPreco / 2);
      ctx.fillStyle = "#ffd966";
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#14093a";
      ctx.textBaseline = "middle";
      ctx.fillText(preco, W / 2, y + alturaPreco / 2 + 3);
      ctx.textBaseline = "top";
    }
  }

  /* Rodapé: o convite para pedir + o @ da loja. */
  function desenharRodape(ctx) {
    ctx.strokeStyle = "rgba(184, 158, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 70, 1816);
    ctx.lineTo(W / 2 + 70, 1816);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "600 36px Inter, sans-serif";
    ctx.fillStyle = "#d8caff";
    const arroba = CFG.instagram ? " · @" + CFG.instagram : "";
    ctx.fillText("Peça pelo link da bio" + arroba, W / 2, 1878);
  }

  async function desenharStory(canvas, livro) {
    const ctx = canvas.getContext("2d");

    // Garante as fontes do site antes de medir e desenhar.
    if (document.fonts && document.fonts.load) {
      try {
        await Promise.all([
          document.fonts.load('800 68px "Playfair Display"'),
          document.fonts.load('700 62px "Playfair Display"'),
          document.fonts.load("700 56px Inter"),
          document.fonts.load("600 36px Inter"),
          document.fonts.load("400 40px Inter")
        ]);
      } catch (e) { /* segue com a fonte substituta */ }
    }

    ctx.clearRect(0, 0, W, H);

    // Molde personalizado? (img/story-molde.jpg, 1080×1920) Ele já traz
    // marca e rodapé prontos; só a capa e os textos entram por cima.
    const molde = await carregarImagem("img/story-molde.jpg");
    if (molde) {
      ctx.drawImage(molde, 0, 0, W, H);
    } else {
      desenharCeu(ctx);
      await desenharMarca(ctx);
    }
    await desenharCapa(ctx, livro);
    desenharTextos(ctx, livro);
    if (!molde) desenharRodape(ctx);
  }

  /* ================= Modal de prévia/publicação ================= */

  function mostrarStatus(texto, ok) {
    const el = $("story-status");
    if (!el) return;
    el.hidden = !texto;
    el.classList.toggle("ok", !!ok);
    el.textContent = texto || "";
  }

  function mostrarErro(texto) {
    const el = $("story-erro");
    if (!el) return;
    el.hidden = !texto;
    el.textContent = texto || "";
  }

  async function abrir(livro) {
    const modal = $("modal-story");
    const canvas = $("story-canvas");
    const btnPublicar = $("btn-story-publicar");
    if (!modal || !canvas || !livro) return;

    livroAtual = livro;
    ocupado = false;
    modal.hidden = false;
    mostrarErro("");
    mostrarStatus("Gerando a arte do story…");
    if (btnPublicar) {
      btnPublicar.disabled = true;
      btnPublicar.textContent = "Publicar story";
    }

    try {
      await desenharStory(canvas, livro);
      mostrarStatus("");
      if (btnPublicar) btnPublicar.disabled = false;
    } catch (e) {
      mostrarErro("Não foi possível gerar a arte agora. Feche e tente de novo.");
    }
  }

  function fechar() {
    if (ocupado) return;   // publicando: segura o modal aberto
    const modal = $("modal-story");
    if (modal) modal.hidden = true;
    livroAtual = null;
  }

  async function publicar() {
    const canvas = $("story-canvas");
    const btnPublicar = $("btn-story-publicar");
    const btnFechar = $("btn-story-fechar");
    if (ocupado || !livroAtual || !canvas) return;

    ocupado = true;
    mostrarErro("");
    mostrarStatus("Publicando no Instagram…");
    if (btnPublicar) { btnPublicar.disabled = true; btnPublicar.textContent = "Publicando…"; }
    if (btnFechar) btnFechar.disabled = true;

    try {
      // Comprime até caber no limite do envio (~1 MB), reduzindo a
      // qualidade aos poucos se precisar.
      let dataUrl = "";
      for (const q of [0.86, 0.78, 0.7, 0.6, 0.5]) {
        dataUrl = canvas.toDataURL("image/jpeg", q);
        if (dataUrl.length <= 1000000) break;
      }
      if (dataUrl.length > 1000000) throw new Error("A arte ficou pesada demais. Tente uma foto de capa menor.");

      const token = (window.Auth && window.Auth.idToken)
        ? await window.Auth.idToken().catch(() => null) : null;
      const r = await fetch("/api/postar-story", {
        method: "POST",
        headers: Object.assign(
          { "Content-Type": "application/json" },
          token ? { "Authorization": "Bearer " + token } : {}),
        body: JSON.stringify({ imagem: dataUrl })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error((d && d.error) || "Não foi possível publicar agora. Tente novamente.");

      mostrarStatus("Story publicado" + (d.username ? " em @" + d.username : "") + " ✓", true);
      if (btnPublicar) btnPublicar.textContent = "Publicado ✓";
    } catch (e) {
      mostrarStatus("");
      mostrarErro((e && e.message) || "Não foi possível publicar agora. Tente novamente.");
      if (btnPublicar) { btnPublicar.disabled = false; btnPublicar.textContent = "Publicar story"; }
    } finally {
      ocupado = false;
      if (btnFechar) btnFechar.disabled = false;
    }
  }

  /* ---------- Liga os botões do modal ---------- */
  const btnPublicarEl = $("btn-story-publicar");
  if (btnPublicarEl) btnPublicarEl.addEventListener("click", publicar);
  const btnFecharEl = $("btn-story-fechar");
  if (btnFecharEl) btnFecharEl.addEventListener("click", fechar);
  const modalEl = $("modal-story");
  if (modalEl) modalEl.addEventListener("click", (e) => { if (e.target === modalEl) fechar(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalEl && !modalEl.hidden) fechar();
  });

  window.StoryIG = { abrir };
})();
