/* ============================================================
   Gera as imagens do CÉU ESTRELADO do fundo (img/estrelas-*.png)
   ------------------------------------------------------------
   As estrelas eram 23 "radial-gradient" no css/style.css. O navegador
   recalculava todos eles em cada pedaço da tela ao abrir a página, e
   isso travava o site por 0,2–0,3 s (pior no desktop, que tem tela
   maior). Agora as mesmas estrelas vêm de uma imagenzinha que se
   repete: o desenho é IDÊNTICO, pixel a pixel, e muito mais leve.

   As estrelas são descritas aqui embaixo (CAMADAS), do mesmo jeito
   que estavam no CSS: o céu normal (estrelas-*) e o céu em festa da
   promoção do Dia das Crianças, com confete colorido (confete-*). Este
   script pinta cada camada com o Chromium e salva um ladrilho em 1x, 2x
   e 3x (telas comuns, retina e celulares) em PNG sem perda. É PNG, e
   não WebP, porque o Safari dos Macs antigos (macOS 10.14/10.15) não
   abre WebP, e o céu ficaria vazio. Com paleta de cores, o PNG fica
   com 1 a 3 KB.

   Só precisa rodar se quiser MUDAR as estrelas:
     npm install --no-save playwright sharp
     npx playwright install chromium
     node scripts/gerar-estrelas.js
   ============================================================ */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const PASTA = path.join(__dirname, "..", "img");

const ESTRELA = "#ffd966";        // --estrela
const ESTRELA_CLARA = "#fff3a8";  // --estrela-clara
const LAVANDA_CLARA = "#d8caff";  // --lavanda-clara
const LAVANDA = "#b89eff";        // --lavanda
const ROSA = "#ff7ad9";           // --aurora-rosa
const CIANO = "#7adfff";          // --aurora-ciano

// lado = tamanho do ladrilho (o CSS usa o mesmo em background-size)
const CAMADAS = [
  { nome: "estrelas-1", lado: 440, imagens: [   // body::before
    `radial-gradient(1.8px 1.8px at 12% 18%, ${ESTRELA}, transparent 55%)`,
    `radial-gradient(2.3px 2.3px at 78% 8%,  ${ESTRELA}, transparent 55%)`,
    `radial-gradient(1.8px 1.8px at 42% 88%, ${ESTRELA_CLARA}, transparent 55%)`,
    "radial-gradient(1.3px 1.3px at 25% 50%, #fff, transparent 55%)",
    "radial-gradient(1.3px 1.3px at 60% 35%, #fff, transparent 55%)",
    "radial-gradient(1.3px 1.3px at 88% 62%, #fff, transparent 55%)",
    "radial-gradient(1.3px 1.3px at 33% 73%, #fff, transparent 55%)",
    "radial-gradient(1.3px 1.3px at 7%  82%, #fff, transparent 55%)",
    "radial-gradient(1.3px 1.3px at 95% 28%, #fff, transparent 55%)",
    "radial-gradient(1.3px 1.3px at 53% 60%, #fff, transparent 55%)",
    "radial-gradient(1.3px 1.3px at 70% 78%, #fff, transparent 55%)",
    "radial-gradient(.8px .8px at 18% 30%, rgba(255,255,255,.85), transparent 55%)",
    "radial-gradient(.8px .8px at 50% 12%, rgba(255,255,255,.75), transparent 55%)",
    "radial-gradient(.8px .8px at 67% 95%, rgba(255,255,255,.85), transparent 55%)",
    "radial-gradient(.8px .8px at 82% 45%, rgba(255,255,255,.75), transparent 55%)",
    "radial-gradient(.8px .8px at 3%  62%, rgba(255,255,255,.85), transparent 55%)",
    "radial-gradient(.8px .8px at 38% 5%,  rgba(255,255,255,.75), transparent 55%)"
  ] },
  { nome: "estrelas-2", lado: 320, imagens: [   // body::after
    "radial-gradient(1.3px 1.3px at 20% 22%, #fff, transparent 55%)",
    "radial-gradient(1.3px 1.3px at 55% 80%, #fff, transparent 55%)",
    `radial-gradient(1px 1px at 75% 40%, ${LAVANDA_CLARA}, transparent 55%)`,
    "radial-gradient(1px 1px at 40% 60%, #fff, transparent 55%)",
    "radial-gradient(1px 1px at 88% 15%, #fff, transparent 55%)",
    "radial-gradient(.8px .8px at 10% 45%, #fff, transparent 55%)"
  ] },
  // Céu em festa (body.promo-tema-criancas): mesmas posições, parte das
  // estrelas vira confete colorido, um pouco maior.
  { nome: "confete-1", lado: 440, imagens: [    // body.promo-tema-criancas::before
    `radial-gradient(3.2px 3.2px at 12% 18%, ${ROSA}, transparent 55%)`,
    `radial-gradient(2.9px 2.9px at 78% 8%,  ${ESTRELA}, transparent 55%)`,
    `radial-gradient(3.2px 3.2px at 42% 88%, ${CIANO}, transparent 55%)`,
    "radial-gradient(2.9px 2.9px at 25% 50%, #8ff0b0, transparent 55%)",
    "radial-gradient(1.3px 1.3px at 60% 35%, #fff, transparent 55%)",
    `radial-gradient(2.9px 2.9px at 88% 62%, ${ROSA}, transparent 55%)`,
    "radial-gradient(1.3px 1.3px at 33% 73%, #fff, transparent 55%)",
    `radial-gradient(2.9px 2.9px at 7%  82%, ${LAVANDA}, transparent 55%)`,
    `radial-gradient(2.9px 2.9px at 95% 28%, ${CIANO}, transparent 55%)`,
    "radial-gradient(1.3px 1.3px at 53% 60%, #fff, transparent 55%)",
    `radial-gradient(2.9px 2.9px at 70% 78%, ${ESTRELA}, transparent 55%)`,
    "radial-gradient(.8px .8px at 18% 30%, rgba(255,255,255,.85), transparent 55%)",
    "radial-gradient(.8px .8px at 50% 12%, rgba(255,255,255,.75), transparent 55%)",
    "radial-gradient(.8px .8px at 67% 95%, rgba(255,255,255,.85), transparent 55%)",
    "radial-gradient(.8px .8px at 82% 45%, rgba(255,255,255,.75), transparent 55%)",
    "radial-gradient(.8px .8px at 3%  62%, rgba(255,255,255,.85), transparent 55%)",
    "radial-gradient(.8px .8px at 38% 5%,  rgba(255,255,255,.75), transparent 55%)"
  ] },
  { nome: "confete-2", lado: 320, imagens: [    // body.promo-tema-criancas::after
    "radial-gradient(1.3px 1.3px at 20% 22%, #fff, transparent 55%)",
    `radial-gradient(2.7px 2.7px at 55% 80%, ${ROSA}, transparent 55%)`,
    `radial-gradient(2.7px 2.7px at 75% 40%, ${CIANO}, transparent 55%)`,
    "radial-gradient(1px 1px at 40% 60%, #fff, transparent 55%)",
    `radial-gradient(2.7px 2.7px at 88% 15%, ${ESTRELA}, transparent 55%)`,
    "radial-gradient(.8px .8px at 10% 45%, #fff, transparent 55%)"
  ] }
];

/* PNG com paleta de cores exata (cada cor da imagem vira uma entrada da
   paleta, nada é arredondado) quando a imagem tem até 256 cores; senão,
   PNG completo. Fica com a menor das duas e nunca perde nada. */
async function menorPngIdentico(sharp, png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const completo = await sharp(png).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  const indice = new Map(), cores = [];
  const linhas = Buffer.alloc(info.height * (info.width + 1));   // 1 byte de filtro por linha
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const cor = data.readUInt32BE(i);
      if (!indice.has(cor)) { if (cores.length === 256) return completo; indice.set(cor, cores.length); cores.push(cor); }
      linhas[y * (info.width + 1) + 1 + x] = indice.get(cor);
    }
  }
  const pedaco = (tipo, dados) => {
    const corpo = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
    const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(corpo));
    return Buffer.concat([tam, corpo, crc]);
  };
  const cab = Buffer.alloc(13);
  cab.writeUInt32BE(info.width, 0); cab.writeUInt32BE(info.height, 4);
  cab[8] = 8; cab[9] = 3;                                         // 8 bits, cor com paleta
  const paleta = Buffer.concat(cores.map(c => Buffer.from([c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255])));
  const alfa = Buffer.from(cores.map(c => c & 255));
  const comPaleta = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pedaco("IHDR", cab), pedaco("PLTE", paleta), pedaco("tRNS", alfa),
    pedaco("IDAT", zlib.deflateSync(linhas, { level: 9 })), pedaco("IEND", Buffer.alloc(0))
  ]);
  // Confere: os pixels do PNG com paleta são exatamente os do original.
  const conferir = await sharp(comPaleta).ensureAlpha().raw().toBuffer();
  if (Buffer.compare(conferir, data) !== 0) throw new Error("PNG com paleta saiu diferente do original");
  return comPaleta.length < completo.length ? comPaleta : completo;
}

(async () => {
  const { chromium } = require("playwright");
  const sharp = require("sharp");
  const navegador = await chromium.launch();
  for (const c of CAMADAS) {
    for (const escala of [1, 2, 3]) {
      const pagina = await navegador.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: escala });
      // Igual à página: camada fixa cobrindo a tela, ladrilho repetido.
      await pagina.setContent(`<!doctype html><style>
        html, body { margin: 0; background: transparent; }
        div { position: fixed; inset: 0; background-image: ${c.imagens.join(", ")};
              background-size: ${c.lado}px ${c.lado}px; background-repeat: repeat; }
      </style><div></div>`);
      const png = await pagina.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: c.lado, height: c.lado } });
      const destino = path.join(PASTA, `${c.nome}-${escala}x.png`);
      fs.writeFileSync(destino, await menorPngIdentico(sharp, png));
      console.log("ok:", path.relative(path.join(__dirname, ".."), destino), fs.statSync(destino).size, "bytes");
      await pagina.close();
    }
  }
  await navegador.close();
})().catch(e => { console.error(e); process.exit(1); });
