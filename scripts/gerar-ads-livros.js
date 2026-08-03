#!/usr/bin/env node
/* ============================================================
   Gera a lista de palavras-chave + URL final de cada livro que
   ESTÁ MESMO À VENDA, para colar no Google Ads (grupo de
   anúncios "Livros do Catálogo").

   O catálogo da loja vem de dois lugares:
     1. js/livros.js (os livros escritos no arquivo);
     2. o painel de Administração (coleção "catalogo" do Firebase)
        — hoje é de onde vem boa parte dos livros novos.
   E quem já foi VENDIDO/reservado vive na coleção
   "disponibilidade". Este script junta os três, do mesmo jeito
   que o site faz, para você nunca mais anunciar um livro que já
   saiu da estante (dinheiro jogado fora) nem esquecer de
   anunciar um livro que só existe no painel.

   Uso:
     node scripts/gerar-ads-livros.js            -> tabela no terminal
     node scripts/gerar-ads-livros.js --csv      -> CSV
     node scripts/gerar-ads-livros.js --tsv      -> TSV (Google Ads Editor)
     node scripts/gerar-ads-livros.js --pausar   -> palavras-chave dos
                                                    livros que JÁ VENDERAM
                                                    (para pausar no Ads)
     node scripts/gerar-ads-livros.js --offline  -> só o js/livros.js,
                                                    sem consultar o Firebase

   TSV = separado por TAB, ideal para colar direto no Google Ads
   Editor via "Fazer várias alterações"; abra no Bloco de Notas,
   Ctrl+A, Ctrl+C e cole lá — NÃO abra no Excel, que corrompe os
   acentos.

   Rotina sugerida: rode com --tsv para ADICIONAR as palavras-chave
   dos livros à venda e com --pausar para PAUSAR as dos que já
   venderam. Fazer isso depois de cada leva de vendas evita pagar
   clique em livro que não existe mais.
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CAMINHO_LIVROS = path.join(__dirname, "..", "js", "livros.js");
const DOMINIO = "https://www.bookverse.com.br/";
const PROJETO = process.env.FIREBASE_PROJECT_ID || "bookverse-69878";
const TEMPO_LIMITE = 10000;

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

/* ---------- 1) Livros escritos no js/livros.js ---------- */
function carregarLivrosLocais() {
  const codigo = fs.readFileSync(CAMINHO_LIVROS, "utf8");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(codigo +
    "\nthis.__LIVROS__ = LIVROS;" +
    "\nthis.__OCULTOS__ = (typeof LIVROS_OCULTOS !== 'undefined') ? LIVROS_OCULTOS : [];", sandbox);
  return { livros: sandbox.__LIVROS__ || [], ocultos: sandbox.__OCULTOS__ || [] };
}

/* ---------- 2 e 3) Firebase: catálogo do painel e disponibilidade ---------- */
function valorDoCampo(v) {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  return undefined;
}
function converterDoc(doc) {
  const out = { id: String(doc.name || "").split("/").pop() };
  Object.keys(doc.fields || {}).forEach(k => {
    const v = valorDoCampo(doc.fields[k]);
    if (v !== undefined) out[k] = v;
  });
  return out;
}
async function lerColecao(nome) {
  const url = "https://firestore.googleapis.com/v1/projects/" + PROJETO +
              "/databases/(default)/documents/" + nome + "?pageSize=300";
  const r = await fetch(url, { signal: AbortSignal.timeout(TEMPO_LIMITE) });
  if (!r.ok) throw new Error(nome + ": HTTP " + r.status);
  const data = await r.json();
  return (data.documents || []).map(converterDoc);
}

/* Quantas unidades de cada livro já saíram (vendidas ou reservadas).
   Mesma regra do site (js/main.js) e do feed (functions/api/feed.js). */
function montarBloqueados(docs) {
  const bloq = new Map();
  const agora = Date.now();
  (docs || []).forEach(d => {
    let q = 0;
    if (d.estado === "vendido") q = (d.qtd > 0) ? Number(d.qtd) : Infinity;
    else if (d.estado === "reservado" && (!d.ate || Number(d.ate) > agora)) q = (d.qtd > 0) ? Number(d.qtd) : Infinity;
    if (q > 0) bloq.set(d.id, q);
  });
  return bloq;
}

/* Junta local + painel e tira o que não deve aparecer: ids ocultos e o
   mesmo livro cadastrado duas vezes (capa idêntica) — as mesmas regras
   de js/catalogo.js, para o Ads não divergir do site. */
function juntarCatalogo(locais, extras, ocultos) {
  const escondidos = new Set((ocultos || []).map(id => String(id || "").trim()).filter(Boolean));
  const lista = locais.slice();
  const indice = new Map(lista.map((l, i) => [idLivro(l), i]));
  (extras || []).forEach(l => {
    if (!l || !l.id) return;
    if (indice.has(l.id)) lista[indice.get(l.id)] = Object.assign({}, lista[indice.get(l.id)], l);
    else { lista.push(l); indice.set(l.id, lista.length - 1); }
  });

  const quando = l => {
    const t = Date.parse(l.criadoEm || "");
    if (!Number.isNaN(t)) return t;
    const d = Date.parse((l.dataAdicao || "") + "T00:00:00");
    return Number.isNaN(d) ? 0 : d;
  };
  const porFoto = new Map();
  const out = [];
  lista.forEach(l => {
    if (!l || escondidos.has(idLivro(l))) return;
    const img = String(l.imagem || "");
    const foto = img.slice(0, 5).toLowerCase() === "data:" ? img : "";
    if (foto) {
      const pos = porFoto.get(foto);
      if (pos !== undefined) {
        if (quando(l) > quando(out[pos])) out[pos] = l;
        return;
      }
      porFoto.set(foto, out.length);
    }
    out.push(l);
  });
  return out;
}

// Remove pontuação do título para virar uma palavra-chave limpa
// (Google Ads ignora a maior parte dela, mas fica mais legível assim).
function textoPalavraChave(titulo) {
  return String(titulo || "")
    .toLowerCase()
    .replace(/[?!:.,;"“”#]/g, "")
    .replace(/–/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

async function main() {
  const modoCsv = process.argv.includes("--csv");
  const modoTsv = process.argv.includes("--tsv");
  const modoPausar = process.argv.includes("--pausar");
  const offline = process.argv.includes("--offline");
  const silencioso = modoCsv || modoTsv;

  const { livros: locais, ocultos } = carregarLivrosLocais();

  let extras = [], bloqueados = new Map(), aviso = "";
  if (!offline) {
    try {
      const [c, d] = await Promise.all([lerColecao("catalogo"), lerColecao("disponibilidade")]);
      extras = c;
      bloqueados = montarBloqueados(d);
    } catch (e) {
      aviso = "⚠️  Não deu para falar com o Firebase (" + e.message + ").\n" +
              "    A lista abaixo saiu SÓ com os livros do js/livros.js e sem\n" +
              "    conferir o que já foi vendido. Confira a internet e rode de novo.";
      extras = []; bloqueados = new Map();
    }
  }

  const catalogo = juntarCatalogo(locais, extras, ocultos);
  const comEstoque = l => Math.max(0, (Number(l.estoque) || 0) - (bloqueados.get(idLivro(l)) || 0));

  const linha = l => ({
    titulo: l.titulo,
    autor: l.autor || "",
    genero: l.genero || "",
    disponivel: comEstoque(l),
    palavraChave: textoPalavraChave(l.titulo) + " livro",
    urlFinal: DOMINIO + "?livro=" + idLivro(l)
  });

  const aVenda = catalogo.filter(l => comEstoque(l) > 0).map(linha);
  const vendidos = catalogo.filter(l => comEstoque(l) <= 0).map(linha);
  const alvo = modoPausar ? vendidos : aVenda;

  if (modoTsv) {
    // 2 colunas, sem cabeçalho: palavra-chave e URL final. O Ads Editor
    // não tem coluna de "tipo de correspondência" na colagem — ele lê o
    // tipo do próprio texto: "com aspas" = frase, [colchetes] = exata.
    process.stdout.write(alvo.map(l => ['"' + l.palavraChave + '"', l.urlFinal].join("\t")).join("\r\n") + "\r\n");
    return;
  }

  if (modoCsv) {
    const cab = ["Palavra-chave", "Tipo de correspondência", "URL final", "Título", "Autor", "Gênero", "Disponível"];
    const out = [cab.join(",")];
    alvo.forEach(l => out.push([
      csvEscape(l.palavraChave), "Frase", csvEscape(l.urlFinal),
      csvEscape(l.titulo), csvEscape(l.autor), csvEscape(l.genero), csvEscape(l.disponivel)
    ].join(",")));
    process.stdout.write(out.join("\n") + "\n");
    return;
  }

  if (aviso) console.log(aviso + "\n");
  if (modoPausar) {
    console.log(`${vendidos.length} livros JÁ VENDIDOS — pause estas palavras-chave no Google Ads:\n`);
    vendidos.forEach(l => console.log(`  "${l.palavraChave}"   (${l.titulo})`));
    return;
  }

  const doPainel = extras.length;
  console.log(`${catalogo.length} livros no catálogo (${locais.length} do arquivo + ${doPainel} do painel)`);
  console.log(`${aVenda.length} à venda  ·  ${vendidos.length} já vendidos (fora da lista)\n`);
  aVenda.forEach(l => {
    const aviso = l.disponivel === 1 ? "  ⚠️ último exemplar" : "";
    console.log(`"${l.palavraChave}"${aviso}\n  -> ${l.urlFinal}\n`);
  });
  if (vendidos.length) {
    console.log(`👉 Rode com --pausar para ver as ${vendidos.length} palavras-chave que devem ser PAUSADAS.`);
  }
}

main().catch(e => { console.error("Erro:", e.message); process.exit(1); });
