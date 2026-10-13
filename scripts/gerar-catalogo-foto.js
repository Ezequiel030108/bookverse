#!/usr/bin/env node
/* ============================================================
   Gera o js/catalogo-foto.js — a "foto" dos livros cadastrados
   pelo PAINEL no momento da publicação do site.

   PARA QUE ISSO SERVE
   -------------------
   Os livros do painel chegam pela /api/catalogo, que pode demorar
   (principalmente quando o servidor está "frio"). Sem esta foto, a
   primeira visita de alguém desenhava o carrossel "Novidades" só com
   os livros do js/livros.js e, segundos depois, redesenhava tudo com
   os livros do painel — a capa grande trocava na frente do cliente
   (e o Google mede isso como lentidão: a "maior imagem" só termina
   de aparecer no fim).

   Com a foto, a loja já abre com os livros do painel. A resposta de
   verdade da /api/catalogo continua chegando logo depois e manda:
   livro novo entra, livro apagado sai, preço editado é atualizado.

   Roda sozinho a cada publicação e a cada 6 horas
   (.github/workflows/firebase-hosting-merge.yml). Para rodar à mão:

     node scripts/gerar-catalogo-foto.js

   Se a API não responder, o arquivo antigo é mantido como está.
   (Rodou à mão? Não precisa enviar o arquivo para o GitHub: a
   publicação gera de novo.)
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const SITE = String(process.env.LOJA_SITE || "https://www.bookverse.com.br").replace(/\/+$/, "");
const DESTINO = path.join(__dirname, "..", "js", "catalogo-foto.js");
const TEMPO_LIMITE = 30000;   // o servidor pode estar "frio": dá tempo a ele

async function main() {
  const r = await fetch(SITE + "/api/catalogo", { signal: AbortSignal.timeout(TEMPO_LIMITE) });
  if (!r.ok) throw new Error("/api/catalogo respondeu HTTP " + r.status);
  const dados = await r.json();
  const livros = Array.isArray(dados && dados.livros) ? dados.livros : null;
  if (!livros) throw new Error("resposta sem a lista de livros");
  // Segurança: a foto nunca leva foto embutida (base64) — só o endereço.
  if (JSON.stringify(livros).includes(";base64,")) throw new Error("resposta com foto embutida");

  const conteudo =
`/* ============================================================
   LIVROS DO PAINEL — foto da publicação
   ------------------------------------------------------------
   ARQUIVO GERADO AUTOMATICAMENTE. Não edite à mão: ele é
   refeito a cada publicação do site (e a cada 6 horas) por
   scripts/gerar-catalogo-foto.js.

   É só o ponto de partida da vitrine: a resposta de verdade
   da /api/catalogo chega logo depois e manda.

   Gerado em ${new Date().toISOString()} — ${livros.length} livros.
   ============================================================ */
window.CATALOGO_FOTO = ${JSON.stringify(livros)};
`;
  fs.writeFileSync(DESTINO, conteudo);
  console.log("js/catalogo-foto.js atualizado: " + livros.length + " livros do painel.");
}

main().catch(e => {
  console.warn("Não foi possível atualizar o js/catalogo-foto.js (" + e.message + "). O arquivo anterior foi mantido.");
  process.exit(0);
});
