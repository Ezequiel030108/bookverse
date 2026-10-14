/* ============================================================
   Testes da VITRINE LEVE (api/catalogo e api/img-livro)
   ------------------------------------------------------------
   • O catálogo do painel sai SEM as fotos embutidas: cada foto
     vira um endereço com a impressão digital dela (?v=...).
   • A foto nesse endereço fica 1 ano no cache (nunca muda ali);
     sem a impressão certa, só 1 dia (o feed do Google, links velhos).
   • Com &f=webp (o que a vitrine pede), a foto sai em WebP.
   • Um id esquisito não abre caminho para outras partes do banco.
   ============================================================ */

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const T = require("./ajuda");

const BYTES = Buffer.from("isto-faz-de-conta-que-e-uma-foto");
const FOTO = "data:image/png;base64," + BYTES.toString("base64");

let siteSrv, catalogo, imgLivro;

before(async () => {
  siteSrv = await T.servirSite();   // js/livros.js (livros fixos) vem daqui
  catalogo = T.api("catalogo");
  imgLivro = T.api("img-livro");
});
after(() => { siteSrv.close(); });

beforeEach(async () => {
  await T.limparBanco();
  await T.banco().collection("catalogo").doc("livro-do-painel").set({
    titulo: "Livro do Painel", autor: "Autora Teste", preco: "R$ 20,00", estoque: 1, imagem: FOTO
  });
  await T.banco().collection("catalogo").doc("livro-com-link").set({
    titulo: "Livro com Link", autor: "Autor Teste", preco: "R$ 15,00", estoque: 1, imagem: "img/1984.jpg"
  });
});

test("catálogo sai sem as fotos embutidas, cada uma com endereço versionado", async () => {
  const r = await T.chamar(catalogo, { metodo: "GET" });
  assert.equal(r.status, 200);
  const livros = r.corpo.livros;
  assert.equal(livros.length, 2);
  assert.ok(!JSON.stringify(r.corpo).includes("base64"), "nenhuma foto embutida na resposta");

  const painel = livros.find(l => l.id === "livro-do-painel");
  const m = painel.imagem.match(/^\/api\/img-livro\?id=livro-do-painel&v=([a-f0-9]{12})$/);
  assert.ok(m, "foto vira endereço da API: " + painel.imagem);
  assert.equal(painel.fotoHash, m[1], "fotoHash = impressão digital da foto");
  assert.equal(painel.titulo, "Livro do Painel");

  const comLink = livros.find(l => l.id === "livro-com-link");
  assert.equal(comLink.imagem, "img/1984.jpg", "foto que já é arquivo continua igual");
  assert.match(r.headers["cache-control"], /max-age=60/);
});

test("foto no endereço versionado: os bytes certos, guardados por 1 ano", async () => {
  const v = catalogo.impressaoDigital(FOTO);
  const r = await T.chamar(imgLivro, { metodo: "GET", query: { id: "livro-do-painel", v } });
  assert.equal(r.status, 200);
  assert.equal(r.headers["content-type"], "image/png");
  assert.ok(Buffer.compare(r.corpo, BYTES) === 0, "devolve a foto decodificada");
  assert.match(r.headers["cache-control"], /max-age=31536000.*immutable/);
});

test("foto trocada no painel: o endereço antigo não fica preso no cache", async () => {
  const vAntigo = catalogo.impressaoDigital(FOTO);
  const nova = "data:image/png;base64," + Buffer.from("foto-nova").toString("base64");
  await T.banco().collection("catalogo").doc("livro-do-painel").update({ imagem: nova });

  // Endereço antigo (ou sem ?v=): mostra a foto atual, com cache curto.
  for (const query of [{ id: "livro-do-painel", v: vAntigo }, { id: "livro-do-painel" }]) {
    const r = await T.chamar(imgLivro, { metodo: "GET", query });
    assert.equal(r.status, 200);
    assert.equal(String(r.corpo), "foto-nova");
    assert.match(r.headers["cache-control"], /max-age=86400/);
    assert.doesNotMatch(r.headers["cache-control"], /immutable/);
  }
});

test("livro dos arquivos do site: redireciona para a capa, no mesmo domínio", async () => {
  const r = await T.chamar(imgLivro, { metodo: "GET", query: { id: "livro-com-link" } });
  assert.equal(r.status, 302);
  assert.equal(r.headers.location, "/img/1984.jpg");
});

test("vitrine pede WebP (&f=webp): a foto do painel sai convertida", async () => {
  const jpg = require("fs").readFileSync(require("path").join(__dirname, "..", "img", "1984.jpg"));
  const fotoJpg = "data:image/jpeg;base64," + jpg.toString("base64");
  await T.banco().collection("catalogo").doc("livro-do-painel").update({ imagem: fotoJpg });
  const v = catalogo.impressaoDigital(fotoJpg);
  const r = await T.chamar(imgLivro, { metodo: "GET", query: { id: "livro-do-painel", v, f: "webp" } });
  assert.equal(r.status, 200);
  assert.equal(r.headers["content-type"], "image/webp");
  assert.equal(r.corpo.subarray(0, 4).toString(), "RIFF");
  assert.equal(r.corpo.subarray(8, 12).toString(), "WEBP");
  assert.ok(r.corpo.length < jpg.length, "WebP menor que o JPG");
  assert.match(r.headers["cache-control"], /max-age=31536000.*immutable/);

  // Sem &f=webp (feed do Google/Meta): continua o JPG original.
  const orig = await T.chamar(imgLivro, { metodo: "GET", query: { id: "livro-do-painel", v } });
  assert.equal(orig.headers["content-type"], "image/jpeg");
  assert.ok(Buffer.compare(orig.corpo, jpg) === 0);
});

test("WebP de uma foto que não dá para converter: vai a original", async () => {
  const r = await T.chamar(imgLivro, { metodo: "GET", query: { id: "livro-do-painel", f: "webp" } });
  assert.equal(r.status, 200);
  assert.equal(r.headers["content-type"], "image/png");
  assert.ok(Buffer.compare(r.corpo, BYTES) === 0);
});

test("WebP de um livro dos arquivos do site: redireciona para o .webp", async () => {
  const r = await T.chamar(imgLivro, { metodo: "GET", query: { id: "livro-com-link", f: "webp" } });
  assert.equal(r.status, 302);
  assert.equal(r.headers.location, "/img/1984.webp");
});

test("id esquisito não lê outras partes do banco", async () => {
  await T.banco().collection("users").doc("abc").set({ imagem: FOTO, nome: "Segredo" });
  for (const id of ["../users/abc", "..%2Fusers%2Fabc", "catalogo/../users/abc", "livro-do-painel/../../users/abc"]) {
    const r = await T.chamar(imgLivro, { metodo: "GET", query: { id } });
    assert.equal(r.status, 404, "id " + id + " → " + r.status);
  }
});

test("catálogo comprimido para quem aceita (brotli ou gzip), igual ao normal", async () => {
  const zlib = require("zlib");
  const normal = await T.chamar(catalogo, { metodo: "GET" });
  for (const [aceita, abrir] of [["gzip, deflate, br", zlib.brotliDecompressSync], ["gzip", zlib.gunzipSync]]) {
    const r = await T.chamar(catalogo, { metodo: "GET", headers: { "accept-encoding": aceita } });
    assert.equal(r.status, 200);
    assert.equal(r.headers["content-encoding"], aceita.includes("br") ? "br" : "gzip");
    assert.match(r.headers["vary"], /Accept-Encoding/);
    assert.deepEqual(JSON.parse(abrir(r.corpo)), normal.corpo, "mesmo conteúdo, só menor");
  }
});
