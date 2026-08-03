#!/usr/bin/env node
/* ============================================================
   Gera o js/vendidos.js — a "foto" de quem já estava vendido no
   momento da publicação do site.

   PARA QUE ISSO SERVE
   -------------------
   Ao abrir a loja, o site pergunta ao Firebase quem já foi
   vendido ANTES de desenhar a estante, justamente para não
   mostrar um livro que saiu. Só que, numa internet ruim, essa
   resposta pode demorar; passados 3,5 segundos a loja abre assim
   mesmo (melhor uma estante um pouco desatualizada do que uma
   página parada). Nesse caso ela usa esta foto como ponto de
   partida — assim, mesmo no pior cenário, os livros já vendidos
   continuam fora da estante.

   A foto é só o ponto de partida: quando a resposta de verdade
   chega (quase sempre em menos de meio segundo), ela substitui
   tudo o que está aqui — inclusive devolvendo à loja um livro
   que você tenha reposto pelo painel.

   Roda sozinho a cada publicação (.github/workflows/
   firebase-hosting-merge.yml). Para rodar à mão:

     node scripts/gerar-vendidos.js

   Se o Firebase não responder, o arquivo antigo é mantido como
   está (nunca fica vazio por causa de uma falha de rede).
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const PROJETO = process.env.FIREBASE_PROJECT_ID || "bookverse-69878";
const DESTINO = path.join(__dirname, "..", "js", "vendidos.js");
const TEMPO_LIMITE = 15000;

function valorDoCampo(v) {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  return undefined;
}

async function main() {
  const url = "https://firestore.googleapis.com/v1/projects/" + PROJETO +
              "/databases/(default)/documents/disponibilidade?pageSize=300";
  const r = await fetch(url, { signal: AbortSignal.timeout(TEMPO_LIMITE) });
  if (!r.ok) throw new Error("Firestore respondeu HTTP " + r.status);
  const dados = await r.json();

  const mapa = {};
  (dados.documents || []).forEach(doc => {
    const id = String(doc.name || "").split("/").pop();
    if (!id) return;
    const item = {};
    Object.keys(doc.fields || {}).forEach(k => {
      const v = valorDoCampo(doc.fields[k]);
      // "uid" (quem deu baixa) não interessa ao site e é dado de conta:
      // fica de fora do arquivo público.
      if (v !== undefined && k !== "uid") item[k] = v;
    });
    mapa[id] = item;
  });

  const quantos = Object.keys(mapa).length;
  const conteudo =
`/* ============================================================
   LIVROS JÁ VENDIDOS/RESERVADOS — foto da publicação
   ------------------------------------------------------------
   ARQUIVO GERADO AUTOMATICAMENTE. Não edite à mão: ele é
   refeito a cada publicação do site por
   scripts/gerar-vendidos.js.

   Serve de ponto de partida para a loja não mostrar um livro
   vendido enquanto a resposta do Firebase não chega (internet
   ruim). Assim que a resposta de verdade chega, ela manda.

   Gerado em ${new Date().toISOString()} — ${quantos} registros.
   ============================================================ */
window.VENDIDOS_FOTO = ${JSON.stringify(mapa, null, 1)};
`;
  fs.writeFileSync(DESTINO, conteudo, "utf8");
  console.log(`js/vendidos.js atualizado: ${quantos} livros fora da estante.`);
}

main().catch(e => {
  // Falha de rede não pode gerar um arquivo vazio (isso devolveria os
  // livros vendidos para a loja). Mantém o que já existe e avisa.
  console.error("Não deu para atualizar o js/vendidos.js:", e.message);
  if (!fs.existsSync(DESTINO)) {
    fs.writeFileSync(DESTINO, "window.VENDIDOS_FOTO = {};\n", "utf8");
    console.error("Arquivo não existia: criado vazio (a loja segue pelo Firebase).");
  } else {
    console.error("O arquivo anterior foi mantido.");
  }
  process.exit(0);   // não derruba a publicação do site por causa disso
});
