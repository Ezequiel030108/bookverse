/* ============================================================
   BOOKVERSE — A LOJA "ENTENDIDA" PELO SERVIDOR
   ------------------------------------------------------------
   Para cobrar o valor certo, o servidor precisa saber o MESMO que
   a vitrine sabe: os livros e a promoção (js/livros.js), o frete,
   o presente e o Pix (js/config.js) e a conta do preço
   (js/precos.js). Em vez de copiar essas regras para cá (e um dia
   elas divergirem), o servidor roda OS PRÓPRIOS ARQUIVOS do site:
   busca no endereço oficial (siteInterno, nunca um endereço vindo
   da requisição) e executa isolado (vm), sem acesso a nada do
   servidor.

   O resultado fica em cache por alguns minutos. Quem precisa do
   dado mais novo (a criação de um pedido) pede "fresco".

   Arquivos com "_" no início NÃO viram rotas (functions/index.js).
   ============================================================ */

const vm = require("vm");
const { siteInterno } = require("./_seguranca");

const ARQUIVOS = ["js/livros.js", "js/config.js", "js/precos.js", "js/pix.js"];
const TEMPO_CACHE = 5 * 60 * 1000;
const TEMPO_LIMITE_MS = 5000;

let cache = { t: 0, loja: null };

async function baixar(caminho) {
  const r = await fetch(siteInterno() + "/" + caminho, { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
  if (!r.ok) throw new Error("Não deu para ler " + caminho + " do site (HTTP " + r.status + ").");
  return r.text();
}

/* Roda os arquivos num contexto vazio. "window" é o próprio contexto,
   como no navegador; "location" não existe (o ?promo=teste da vitrine
   não vale para cobranças de verdade). */
function montarContexto(codigos) {
  const contexto = vm.createContext(Object.create(null));
  vm.runInContext("var window = globalThis;", contexto);
  ARQUIVOS.forEach((caminho, i) => {
    new vm.Script(codigos[i], { filename: caminho }).runInContext(contexto, { timeout: 1000 });
  });
  return contexto;
}

/* Dados simples (JSON) de dentro do contexto. */
function dadosDe(contexto, expressao) {
  const json = vm.runInContext("JSON.stringify(" + expressao + ")", contexto, { timeout: 1000 });
  return json === undefined ? null : JSON.parse(json);
}

function montarLoja(contexto) {
  const precos = vm.runInContext("window.Precos", contexto);
  const pix = vm.runInContext("window.Pix", contexto);
  return {
    livros: dadosDe(contexto, "(typeof LIVROS !== 'undefined') ? LIVROS : []") || [],
    ocultos: dadosDe(contexto, "(typeof LIVROS_OCULTOS !== 'undefined') ? LIVROS_OCULTOS : []") || [],
    promocao: dadosDe(contexto, "(typeof PROMOCAO !== 'undefined') ? PROMOCAO : null"),
    config: dadosDe(contexto, "window.LOJA_CONFIG || {}") || {},
    // A conta do preço é a do js/precos.js — a mesma da vitrine e do carrinho.
    precoUnitario(livro, totalItens) {
      return Number(precos.precoUnitario({ preco: String(livro.preco || ""), descontoMaximo: Number(livro.descontoMaximo) || 0 }, totalItens));
    },
    precoNumerico(texto) { return precos.precoNumerico(String(texto || "")); },
    formatarBRL(valor) { return String(precos.formatarBRL(Number(valor) || 0)); },
    promoAtiva() { return !!precos.promoAtiva(); },
    nomePromo() { return String(precos.nomePromo() || ""); },
    // Código Pix "copia e cola" (só para o modo de Pix manual).
    gerarPix(dados) { return pix && pix.gerarPayload ? String(pix.gerarPayload(dados)) : ""; }
  };
}

/* A loja como o servidor a entende. { fresco: true } ignora o cache. */
async function carregarLoja(opcoes) {
  const fresco = !!(opcoes && opcoes.fresco);
  if (!fresco && cache.loja && Date.now() - cache.t < TEMPO_CACHE) return cache.loja;
  const codigos = await Promise.all(ARQUIVOS.map(baixar));
  const loja = montarLoja(montarContexto(codigos));
  cache = { t: Date.now(), loja };
  return loja;
}

module.exports = { carregarLoja };
