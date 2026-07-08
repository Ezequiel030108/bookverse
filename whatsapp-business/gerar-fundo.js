/* ============================================================
   BOOKVERSE — Gerador de fundos cósmicos p/ WhatsApp Business
   Renderiza um SVG (tema roxo do site + estrelas douradas,
   meteoros, lua e livros discretos) via Chromium/Playwright.
   ============================================================ */
const path = require('path');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');

// -------- paleta do site (css/style.css :root) --------
const C = {
  noiteProfunda: '#0a0524',
  noite:         '#14093a',
  indigo:        '#1f1466',
  indigoClaro:   '#2e1f8a',
  violeta:       '#4a2bb5',
  lavanda:       '#b89eff',
  lavandaClara:  '#d8caff',
  estrela:       '#ffd966',
  estrelaClara:  '#fff3a8',
  auroraRosa:    '#ff7ad9',
  auroraCiano:   '#7adfff',
  cremeLua:      '#fff6e6',
};

// -------- PRNG determinístico (mulberry32) --------
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r2 = (n) => Math.round(n * 100) / 100;

// caminho de uma estrela cintilante de 4 pontas (lados côncavos), tamanho unitário
function sparklePath(cx, cy, s) {
  const p = (v) => r2(v);
  return `M ${p(cx)} ${p(cy - s)} `
    + `Q ${p(cx + s * 0.16)} ${p(cy - s * 0.16)} ${p(cx + s)} ${p(cy)} `
    + `Q ${p(cx + s * 0.16)} ${p(cy + s * 0.16)} ${p(cx)} ${p(cy + s)} `
    + `Q ${p(cx - s * 0.16)} ${p(cy + s * 0.16)} ${p(cx - s)} ${p(cy)} `
    + `Q ${p(cx - s * 0.16)} ${p(cy - s * 0.16)} ${p(cx)} ${p(cy - s)} Z`;
}

// -------- LUA discreta --------
function lua(cx, cy, r) {
  return `
  <g opacity="0.9">
    <circle cx="${cx}" cy="${cy}" r="${r2(r * 2.0)}" fill="url(#haloLua)" opacity="0.4"/>
    <circle cx="${cx}" cy="${cy}" r="${r2(r)}" fill="url(#discoLua)"/>
    <g opacity="0.35" fill="#b9a7d8">
      <circle cx="${r2(cx - r * 0.30)}" cy="${r2(cy - r * 0.22)}" r="${r2(r * 0.16)}"/>
      <circle cx="${r2(cx + r * 0.22)}" cy="${r2(cy + r * 0.10)}" r="${r2(r * 0.11)}"/>
      <circle cx="${r2(cx + r * 0.02)}" cy="${r2(cy + r * 0.38)}" r="${r2(r * 0.08)}"/>
      <circle cx="${r2(cx - r * 0.12)}" cy="${r2(cy + r * 0.14)}" r="${r2(r * 0.06)}"/>
    </g>
    <circle cx="${cx}" cy="${cy}" r="${r2(r)}" fill="url(#sombraLua)"/>
  </g>`;
}

// -------- PILHA DE LIVROS discreta (vista lateral) --------
function livros(cx, baseY, scale) {
  const s = scale;
  const paleta = ['#3f2b83', C.indigoClaro, '#4a2f8f']; // capas (tons contidos)
  const W0 = 240 * s, H0 = 34 * s;               // dimensões base do livro
  const gap = 3 * s;
  let y = baseY;
  let out = `<g filter="url(#glowLivros)" opacity="0.68"><g>`;
  // brilho suave sob a pilha
  out += `<ellipse cx="${r2(cx)}" cy="${r2(baseY + 10 * s)}" rx="${r2(W0 * 0.62)}" ry="${r2(16 * s)}" fill="url(#brilhoLivros)"/>`;
  const larguras = [1.0, 0.86, 0.72];            // afunila para cima
  const desloc  = [0, 14 * s, -8 * s];
  for (let i = 0; i < 3; i++) {
    const w = W0 * larguras[i];
    const x = cx - w / 2 + desloc[i];
    const top = y - H0;
    const cor = paleta[i % paleta.length];
    out += `
      <g>
        <rect x="${r2(x)}" y="${r2(top)}" width="${r2(w)}" height="${r2(H0)}" rx="${r2(4 * s)}" fill="${cor}"/>
        <rect x="${r2(x)}" y="${r2(top)}" width="${r2(w)}" height="${r2(H0 * 0.34)}" rx="${r2(4 * s)}" fill="#ffffff" opacity="0.10"/>
        <rect x="${r2(x + w - 8 * s)}" y="${r2(top + 3 * s)}" width="${r2(6 * s)}" height="${r2(H0 - 6 * s)}" rx="${r2(2 * s)}" fill="${C.estrela}" opacity="0.7"/>
        <line x1="${r2(x + w - 5 * s)}" y1="${r2(top + 6 * s)}" x2="${r2(x + w - 5 * s)}" y2="${r2(top + H0 - 6 * s)}" stroke="${C.estrelaClara}" stroke-width="${r2(0.8 * s)}" opacity="0.6"/>
      </g>`;
    y = top - gap;
  }
  // marcador (fita) saindo do livro do topo
  const topBook = baseY - 3 * (H0 + gap) + gap;
  out += `<rect x="${r2(cx + 2 * s)}" y="${r2(topBook + H0)}" width="${r2(6 * s)}" height="${r2(30 * s)}" fill="${C.auroraRosa}" opacity="0.75"/>`;
  out += `</g></g>`;
  return out;
}

// -------- METEORO --------
function meteoro(x, y, len, angleDeg) {
  return `
  <g transform="translate(${r2(x)} ${r2(y)}) rotate(${angleDeg})" filter="url(#glowMeteoro)">
    <rect x="0" y="-1.4" width="${r2(len)}" height="2.8" rx="1.4" fill="url(#tracoMeteoro)"/>
    <circle cx="${r2(len)}" cy="0" r="3.2" fill="#ffffff"/>
  </g>`;
}

// -------- CENA COMPLETA --------
function buildSVG(W, H, seed, layout) {
  const rand = rng(seed);
  const k = Math.max(W, H) / 1400;          // escala geral dos detalhes
  const area = W * H;

  // ---- estrelas fracas (pontos brancos/lavanda) ----
  const nFaint = Math.round(area / 11000);
  let faint = '';
  for (let i = 0; i < nFaint; i++) {
    const x = r2(rand() * W), y = r2(rand() * H);
    const rr = r2((0.5 + rand() * 1.1) * k);
    const op = r2(0.28 + rand() * 0.6);
    const col = rand() < 0.15 ? C.lavandaClara : '#ffffff';
    faint += `<circle cx="${x}" cy="${y}" r="${rr}" fill="${col}" opacity="${op}"/>`;
  }

  // ---- estrelas douradas (com brilho) ----
  const nGold = Math.round(area / 60000);
  let gold = '';
  for (let i = 0; i < nGold; i++) {
    const x = r2(rand() * W), y = r2(rand() * H);
    const rr = r2((1.1 + rand() * 1.6) * k);
    const op = r2(0.6 + rand() * 0.4);
    const col = rand() < 0.5 ? C.estrela : C.estrelaClara;
    gold += `<circle cx="${x}" cy="${y}" r="${rr}" fill="${col}" opacity="${op}"/>`;
  }

  // ---- estrelas-brilho de 4 pontas (destaques dourados) ----
  const nSpark = Math.round(area / 230000) + 3;
  let sparks = '';
  for (let i = 0; i < nSpark; i++) {
    const x = rand() * W, y = rand() * H * 0.92;
    const s = (5 + rand() * 8) * k;
    const op = r2(0.7 + rand() * 0.3);
    const big = s > 9 * k;
    sparks += `<path d="${sparklePath(x, y, s)}" fill="${rand() < 0.4 ? C.estrelaClara : C.estrela}" opacity="${op}"/>`;
    if (big) {
      // flare em cruz para as maiores
      sparks += `<rect x="${r2(x - s * 2.4)}" y="${r2(y - 0.5 * k)}" width="${r2(s * 4.8)}" height="${r2(1 * k)}" fill="${C.estrelaClara}" opacity="0.35"/>`;
      sparks += `<rect x="${r2(x - 0.5 * k)}" y="${r2(y - s * 2.4)}" width="${r2(1 * k)}" height="${r2(s * 4.8)}" fill="${C.estrelaClara}" opacity="0.35"/>`;
    }
  }

  const moon = lua(layout.moon.x * W, layout.moon.y * H, layout.moon.r * Math.min(W, H));
  const books = livros(layout.books.x * W, layout.books.y * H, layout.books.scale * k);
  let meteors = '';
  for (const m of layout.meteors) meteors += meteoro(m.x * W, m.y * H, m.len * k, m.a);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="${C.noiteProfunda}"/>
      <stop offset="38%" stop-color="${C.noite}"/>
      <stop offset="100%" stop-color="#1b1152"/>
    </linearGradient>
    <radialGradient id="auroraRosa" cx="88%" cy="6%" r="60%">
      <stop offset="0%" stop-color="${C.auroraRosa}" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="${C.auroraRosa}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="auroraCiano" cx="6%" cy="104%" r="60%">
      <stop offset="0%" stop-color="${C.auroraCiano}" stop-opacity="0.16"/>
      <stop offset="60%" stop-color="${C.auroraCiano}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="discoLua" cx="38%" cy="34%" r="78%">
      <stop offset="0%"  stop-color="#f4eeff"/>
      <stop offset="55%" stop-color="#ded0f2"/>
      <stop offset="100%" stop-color="#a998cc"/>
    </radialGradient>
    <radialGradient id="sombraLua" cx="68%" cy="70%" r="82%">
      <stop offset="52%" stop-color="#241452" stop-opacity="0"/>
      <stop offset="100%" stop-color="#160c34" stop-opacity="0.6"/>
    </radialGradient>
    <radialGradient id="haloLua" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${C.estrelaClara}" stop-opacity="0.28"/>
      <stop offset="45%" stop-color="${C.lavanda}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${C.lavanda}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="tracoMeteoro" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="70%" stop-color="${C.lavandaClara}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="1"/>
    </linearGradient>
    <radialGradient id="brilhoLivros" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${C.violeta}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${C.violeta}" stop-opacity="0"/>
    </radialGradient>
    <filter id="glowGold" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${r2(1.1 * k)}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glowSpark" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="${r2(1.6 * k)}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glowMeteoro" x="-40%" y="-200%" width="180%" height="500%">
      <feGaussianBlur stdDeviation="${r2(2.2 * k)}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glowLivros" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${r2(3 * k)}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#ceu)"/>
  <rect width="${W}" height="${H}" fill="url(#auroraRosa)"/>
  <rect width="${W}" height="${H}" fill="url(#auroraCiano)"/>

  <g>${faint}</g>
  <g filter="url(#glowGold)">${gold}</g>
  ${moon}
  ${meteors}
  <g filter="url(#glowSpark)">${sparks}</g>
  ${books}
</svg>`;
}

// -------- FORMATOS --------
const formatos = [
  {
    nome: 'capa-perfil', W: 1920, H: 1080, seed: 20260708,
    layout: {
      moon:   { x: 0.83, y: 0.25, r: 0.132 },
      books:  { x: 0.16, y: 0.90, scale: 0.95 },
      meteors:[{ x: 0.30, y: 0.08, len: 300, a: 22 },
               { x: 0.58, y: 0.16, len: 170, a: 20 }],
    },
  },
  {
    nome: 'papel-de-parede', W: 1080, H: 2340, seed: 77712,
    layout: {
      moon:   { x: 0.72, y: 0.13, r: 0.135 },
      books:  { x: 0.50, y: 0.90, scale: 1.1 },
      meteors:[{ x: 0.62, y: 0.06, len: 260, a: 28 },
               { x: 0.10, y: 0.30, len: 150, a: 24 }],
    },
  },
];

(async () => {
  const outDir = process.argv[2] || '.';
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox'],
  });
  for (const f of formatos) {
    const svg = buildSVG(f.W, f.H, f.seed, f.layout);
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <style>html,body{margin:0;padding:0;background:${C.noiteProfunda}}</style></head>
      <body>${svg}</body></html>`;
    const page = await browser.newPage({
      viewport: { width: f.W, height: f.H },
      deviceScaleFactor: 1,
    });
    await page.setContent(html, { waitUntil: 'networkidle' });
    const out = path.join(outDir, f.nome + '.png');
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: f.W, height: f.H } });
    await page.close();
    console.log('gerado:', out, `(${f.W}x${f.H})`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
