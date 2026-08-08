/* ============================================================
   BOOKVERSE — DESENHA O CÉU ESTRELADO DO TOPO DO E-MAIL
   ------------------------------------------------------------
   O topo do site tem um céu estrelado feito em CSS (body::before,
   no css/style.css). E-mail não entende esse CSS: Gmail, Outlook e
   companhia ignoram gradiente em camadas. A saída é mandar as
   estrelas prontas, como imagem.

   Este script gera img/email-estrelas.png — 600x140, FUNDO
   TRANSPARENTE, só os pontinhos. No e-mail ela entra por cima do
   roxo do cabeçalho, então quem bloqueia imagem continua vendo o
   roxo de sempre, só sem as estrelas.

   Só precisa rodar de novo se você quiser mudar o desenho:

       node scripts/gerar-estrelas-email.js

   Não usa nenhuma biblioteca — o PNG é escrito na mão com o zlib
   que já vem no Node. E o sorteio é "viciado" (semente fixa), então
   rodar duas vezes dá exatamente a mesma imagem.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const LARGURA = 600;
const ALTURA = 140;
const SAIDA = path.join(__dirname, "..", "img", "email-estrelas.png");

/* As mesmas cores do site (css/style.css). */
const BRANCO = [255, 255, 255];
const ESTRELA = [255, 217, 102];        // --estrela
const LAVANDA = [216, 199, 255];        // --lavanda-clara

/* Onde ficam o fantasminha e o letreiro "BookVerse". As estrelas
   que caem em cima saem mais fracas, para não competir com a logo —
   caixa apertada de propósito: no celular o e-mail estreita e é
   justamente o miolo da imagem que aparece, então apagar demais
   aqui deixaria o topo careca no telefone. */
const LOGO = { x1: 176, y1: 26, x2: 424, y2: 82 };

/* Sorteio com semente fixa (mulberry32): mesma imagem sempre. */
function sorteador(semente) {
  let a = semente >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Tela RGBA, começando toda transparente. */
const tela = new Float32Array(LARGURA * ALTURA * 4);

function pintar(x, y, cor, alfa) {
  if (alfa <= 0 || x < 0 || y < 0 || x >= LARGURA || y >= ALTURA) return;
  const i = (y * LARGURA + x) * 4;
  // Mistura "por cima" (source-over) na ordem em que as estrelas caem.
  const a = Math.min(1, alfa);
  const aFinal = tela[i + 3] + a * (1 - tela[i + 3]);
  if (aFinal <= 0) return;
  for (let c = 0; c < 3; c++) {
    tela[i + c] = (cor[c] * a + tela[i + c] * tela[i + 3] * (1 - a)) / aFinal;
  }
  tela[i + 3] = aFinal;
}

/* Uma estrela: um miolo aceso e um halo que se apaga para fora. */
function estrela(cx, cy, raio, cor, brilho) {
  const alcance = Math.ceil(raio * 3.4);
  for (let y = Math.floor(cy - alcance); y <= cy + alcance; y++) {
    for (let x = Math.floor(cx - alcance); x <= cx + alcance; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > alcance) continue;
      // Miolo cheio até o raio, depois queda suave (gaussiana).
      const a = d <= raio ? 1 : Math.exp(-Math.pow((d - raio) / (raio * 1.15), 2));
      pintar(x, y, cor, a * brilho);
    }
  }
}

/* O risquinho em cruz das estrelas maiores (igual .estrela-brilho). */
function cruz(cx, cy, tamanho, cor, brilho) {
  for (let d = 1; d <= tamanho; d++) {
    const a = brilho * (1 - d / tamanho) * 0.55;
    pintar(Math.round(cx + d), Math.round(cy), cor, a);
    pintar(Math.round(cx - d), Math.round(cy), cor, a);
    pintar(Math.round(cx), Math.round(cy + d), cor, a);
    pintar(Math.round(cx), Math.round(cy - d), cor, a);
  }
}

const rnd = sorteador(20260808);

/* Espalha as estrelas. Cada faixa horizontal recebe a sua cota, para
   não sobrar um canto vazio nem virar Via Láctea de um lado só —
   lembrando que no celular o e-mail estreita e só a parte esquerda
   da imagem aparece. */
const COLUNAS = 14;
const FILEIRAS = 5;
for (let col = 0; col < COLUNAS; col++) {
  for (let fil = 0; fil < FILEIRAS; fil++) {
    if (rnd() < 0.14) continue;                  // um buraco aqui e ali
    const x = (col + rnd()) * (LARGURA / COLUNAS);
    const y = (fil + rnd()) * (ALTURA / FILEIRAS);

    const sorte = rnd();
    const cor = sorte > 0.92 ? ESTRELA : sorte > 0.82 ? LAVANDA : BRANCO;
    const grande = rnd();
    const raio = grande > 0.94 ? 1.5 : grande > 0.7 ? 1 : 0.6;
    let brilho = 0.28 + rnd() * 0.5;
    if (cor === ESTRELA) brilho = Math.min(1, brilho + 0.18);

    // Atrás da logo, bem de leve.
    const sobLogo = x > LOGO.x1 && x < LOGO.x2 && y > LOGO.y1 && y < LOGO.y2;
    if (sobLogo) brilho *= 0.55;

    estrela(x, y, raio, cor, brilho);
    if (raio >= 1.5 && !sobLogo) cruz(x, y, 9, cor, brilho);
  }
}

/* Três estrelas-guia, maiores, nos cantos livres. */
[[38, 30, ESTRELA], [556, 26, BRANCO], [92, 112, LAVANDA],
 [244, 116, ESTRELA], [392, 18, BRANCO]].forEach(([x, y, cor]) => {
  estrela(x, y, 1.9, cor, 0.95);
  cruz(x, y, 13, cor, 0.95);
});

/* ---------- Escreve o PNG (RGBA, sem filtro por linha) ---------- */
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function pedaco(tipo, dados) {
  const corpo = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tam, corpo, crc]);
}

const cru = Buffer.alloc(ALTURA * (1 + LARGURA * 4));
for (let y = 0; y < ALTURA; y++) {
  const linha = y * (1 + LARGURA * 4);
  cru[linha] = 0;                                  // filtro "None"
  for (let x = 0; x < LARGURA; x++) {
    const i = (y * LARGURA + x) * 4;
    const p = linha + 1 + x * 4;
    const a = Math.max(0, Math.min(1, tela[i + 3]));
    cru[p]     = Math.round(Math.max(0, Math.min(255, tela[i])));
    cru[p + 1] = Math.round(Math.max(0, Math.min(255, tela[i + 1])));
    cru[p + 2] = Math.round(Math.max(0, Math.min(255, tela[i + 2])));
    cru[p + 3] = Math.round(a * 255);
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(LARGURA, 0);
ihdr.writeUInt32BE(ALTURA, 4);
ihdr[8] = 8;    // bits por canal
ihdr[9] = 6;    // RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  pedaco("IHDR", ihdr),
  pedaco("IDAT", zlib.deflateSync(cru, { level: 9 })),
  pedaco("IEND", Buffer.alloc(0))
]);

fs.writeFileSync(SAIDA, png);
console.log(`Céu estrelado gerado: ${SAIDA} (${LARGURA}x${ALTURA}, ${(png.length / 1024).toFixed(1)} kB)`);
