#!/usr/bin/env node
/* ============================================================
   Gera a versão WebP de cada imagem da pasta img/ (.jpg/.png).

   PARA QUE ISSO SERVE
   -------------------
   O site MOSTRA as imagens sempre em WebP (bem mais leve que JPG
   e PNG): js/util.js troca "img/x.jpg" por "img/x.webp" na hora
   de desenhar a capa. Os arquivos originais continuam na pasta,
   porque quem está FORA do site ainda precisa deles: o feed do
   Google/Meta, a prévia do link no WhatsApp (api/capa.js), os
   e-mails e os ícones do celular.

   Adicionou uma capa nova (img/novo-livro.jpg)? Não precisa fazer
   nada: a publicação roda este script e cria o img/novo-livro.webp
   (.github/workflows/firebase-hosting-merge.yml). Para rodar à mão:

     node scripts/gerar-webp.js            → só cria os que faltam
     node scripts/gerar-webp.js --refazer  → refaz todos

   TROCOU a foto de uma capa que já existia, mantendo o mesmo nome?
   Apague o .webp antigo (ou rode com --refazer), senão a loja
   continua mostrando a foto velha.

   Usa a biblioteca "sharp" (a mesma das Functions).
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

function carregarSharp() {
  try { return require("sharp"); } catch (e) {}
  // Rodando à mão, sem instalar nada na raiz: usa a das Functions.
  return require(path.join(__dirname, "..", "functions", "node_modules", "sharp"));
}

const PASTA = path.join(__dirname, "..", "img");
const REFAZER = process.argv.includes("--refazer");

/* Sem versão WebP: arquivos que só servem para fora do site. */
const IGNORAR = new Set([
  "email-estrelas.png",   // e-mails (Outlook/Gmail não garantem WebP)
  "og-moldura.jpg",       // moldura lida pelo servidor (api/capa.js)
  "icone-180.png",        // ícone do iPhone (precisa ser PNG)
  "icone-192.png",        // ícone do manifest (Android)
  "logo.png",             // manifest, prévia de link e Google
  "bookverse-titulo.png"  // e-mails; o WebP do site já existe (menor, 398×96)
]);

async function main() {
  const sharp = carregarSharp();
  const arquivos = fs.readdirSync(PASTA)
    .filter(n => /\.(jpe?g|png)$/i.test(n) && !IGNORAR.has(n))
    .sort();

  let criados = 0, antes = 0, depois = 0;
  for (const nome of arquivos) {
    const origem = path.join(PASTA, nome);
    const destino = path.join(PASTA, nome.replace(/\.(jpe?g|png)$/i, ".webp"));
    if (!REFAZER && fs.existsSync(destino)) continue;

    // Foto (JPG): qualidade 80. Desenho (PNG): fica com o menor entre a
    // versão sem perda e a de qualidade 90.
    const webp = opcoes => sharp(origem).rotate().webp(Object.assign({ effort: 6 }, opcoes)).toBuffer();
    let buf;
    if (/\.png$/i.test(nome)) {
      const [semPerda, comPerda] = [await webp({ lossless: true }), await webp({ quality: 90, alphaQuality: 100 })];
      buf = semPerda.length <= comPerda.length ? semPerda : comPerda;
    } else {
      buf = await webp({ quality: 80 });
    }
    fs.writeFileSync(destino, buf);

    const tam = fs.statSync(origem).size;
    antes += tam; depois += buf.length; criados++;
    console.log(`  ${nome} → ${path.basename(destino)}  (${Math.round(tam / 1024)} KB → ${Math.round(buf.length / 1024)} KB)`);
  }

  if (!criados) { console.log("WebP: nada a fazer — todas as imagens já têm versão WebP."); return; }
  const pct = Math.round((1 - depois / antes) * 100);
  console.log(`WebP: ${criados} imagem(ns) gerada(s), ${Math.round(antes / 1024)} KB → ${Math.round(depois / 1024)} KB (−${pct}%).`);
}

main().catch(e => { console.error("Falha ao gerar WebP:", e.message); process.exit(1); });
