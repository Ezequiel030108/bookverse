#!/usr/bin/env node
/* ============================================================
   Gera a lista de palavras-chave + URL final de cada livro do
   catálogo (js/livros.js), para colar no Google Ads (grupo de
   anúncios "Livros do catálogo").

   Uso:
     node scripts/gerar-ads-livros.js                 -> tabela no terminal
     node scripts/gerar-ads-livros.js --csv > livros-ads.csv   -> CSV
     node scripts/gerar-ads-livros.js --tsv > livros-ads.txt   -> TSV
       (TSV = separado por TAB, ideal para colar direto no Google
        Ads Editor via "Fazer várias alterações"; abra no Bloco de
        Notas, Ctrl+A, Ctrl+C e cole lá — NÃO abra no Excel, que
        corrompe os acentos)

   Rode este script sempre que adicionar, remover ou esgotar um
   livro no catálogo, e cole o resultado no Google Ads Editor
   (Campanhas -> Palavras-chave -> Importar da área de
   transferência) para manter a campanha em dia.
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CAMINHO_LIVROS = path.join(__dirname, "..", "js", "livros.js");
const DOMINIO = "https://www.bookverse.com.br/";

// Mesma função de js/cart.js -- gera o mesmo id usado pelo site
// (?livro=...) para não desalinhar os links.
function slug(texto) {
  return String(texto)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function idLivro(livro) {
  return livro.id || slug((livro.titulo || "") + "-" + (livro.autor || ""));
}

function carregarLivros() {
  const codigo = fs.readFileSync(CAMINHO_LIVROS, "utf8");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(codigo + "\nthis.__LIVROS__ = LIVROS;", sandbox);
  return sandbox.__LIVROS__;
}

// Remove pontuação do título para virar uma palavra-chave limpa
// (Google Ads ignora a maior parte dela, mas fica mais legível assim).
function textoPalavraChave(titulo) {
  return String(titulo || "")
    .toLowerCase()
    .replace(/[?!:.,;"“”]/g, "")
    .replace(/–/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function main() {
  const livros = carregarLivros();
  const modoCsv = process.argv.includes("--csv");
  const modoTsv = process.argv.includes("--tsv");

  const linhas = livros.map(l => {
    const id = idLivro(l);
    return {
      titulo: l.titulo,
      autor: l.autor || "",
      genero: l.genero || "",
      estoque: l.estoque || 0,
      palavraChave: `"${textoPalavraChave(l.titulo)} livro"`,
      urlFinal: DOMINIO + "?livro=" + id
    };
  });

  if (modoTsv) {
    // 2 colunas, sem cabeçalho: palavra-chave e URL final. O Ads Editor
    // não tem coluna de "tipo de correspondência" na colagem — ele lê o
    // tipo do próprio texto: "com aspas" = frase, [colchetes] = exata.
    // Por isso a palavra-chave já sai entre aspas aqui.
    const out = linhas.map(l =>
      ['"' + textoPalavraChave(l.titulo) + ' livro"', l.urlFinal].join("\t")
    );
    process.stdout.write(out.join("\r\n") + "\r\n");
    return;
  }

  if (modoCsv) {
    const cab = ["Palavra-chave", "Tipo de correspondência", "URL final", "Título", "Autor", "Gênero", "Estoque"];
    const out = [cab.join(",")];
    linhas.forEach(l => {
      out.push([
        csvEscape(textoPalavraChave(l.titulo) + " livro"),
        "Frase",
        csvEscape(l.urlFinal),
        csvEscape(l.titulo),
        csvEscape(l.autor),
        csvEscape(l.genero),
        csvEscape(l.estoque)
      ].join(","));
    });
    process.stdout.write(out.join("\n") + "\n");
    return;
  }

  console.log(`${linhas.length} livros no catálogo\n`);
  linhas.forEach(l => {
    const aviso = l.estoque <= 1 ? "  ⚠️ estoque baixo" : "";
    console.log(`${l.palavraChave}${aviso}\n  -> ${l.urlFinal}\n`);
  });
}

main();
