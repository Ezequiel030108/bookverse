/* ============================================================
   BOOKVERSE — CARRINHO DE COMPRAS
   ------------------------------------------------------------
   Guarda o carrinho no próprio navegador do cliente
   (localStorage), então ele não some ao recarregar a página.

   Guardamos apenas o "id" e a quantidade de cada livro; os
   detalhes (título, preço, capa, estoque) são sempre lidos da
   lista LIVROS (js/livros.js) na hora de mostrar — assim o
   carrinho nunca fica com preço ou estoque desatualizado.

   Não precisa mexer aqui.
   ============================================================ */

window.Carrinho = (function () {
  const CHAVE = "bookverse_carrinho_v1";

  /* Gera um identificador estável a partir do título + autor. */
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

  /* Mapa id -> livro, montado a partir de LIVROS. */
  function mapaLivros() {
    const mapa = {};
    if (typeof LIVROS !== "undefined" && Array.isArray(LIVROS)) {
      LIVROS.forEach(l => { mapa[idLivro(l)] = l; });
    }
    return mapa;
  }

  /* Máximo vendável: desconta unidades reservadas/vendidas quando a
     página conhece a disponibilidade (index); senão usa o estoque. */
  function maxVendavel(livro) {
    if (typeof window.estoqueDisponivel === "function") return window.estoqueDisponivel(livro);
    return livro.estoque || 0;
  }

  /* ---------- Persistência ---------- */
  function carregar() {
    try {
      const bruto = localStorage.getItem(CHAVE);
      const dados = bruto ? JSON.parse(bruto) : [];
      return Array.isArray(dados) ? dados.filter(i => i && i.id && i.qty > 0) : [];
    } catch (e) { return []; }
  }
  function salvar(itens) {
    try { localStorage.setItem(CHAVE, JSON.stringify(itens)); } catch (e) { /* modo privado */ }
    notificar();
  }

  let estado = carregar();

  /* ---------- Assinantes (para atualizar a interface) ---------- */
  const assinantes = new Set();
  function assinar(fn) { assinantes.add(fn); fn(resolver()); return () => assinantes.delete(fn); }
  function notificar() {
    const dados = resolver();
    assinantes.forEach(fn => { try { fn(dados); } catch (e) {} });
    document.dispatchEvent(new CustomEvent("carrinho:mudou", { detail: dados }));
  }

  /* ---------- Leitura resolvida (com detalhes dos livros) ----------
     resolverLista resolve uma lista [{id, qty}] qualquer; resolver()
     usa o carrinho salvo. A "compra direta" (Comprar agora) usa
     resolverLista com um único livro, sem mexer no carrinho. */
  function resolverLista(lista, persistir) {
    const mapa = mapaLivros();
    const itens = [];
    let mudou = false;

    (lista || []).forEach(item => {
      const livro = mapa[item.id];
      const max = livro ? maxVendavel(livro) : 0;
      if (!livro || max <= 0) { mudou = true; return; } // saiu de catálogo/estoque
      const qty = Math.max(1, Math.min(item.qty, max));  // respeita o estoque
      if (qty !== item.qty) mudou = true;
      itens.push({ id: item.id, qty, livro });
    });

    if (persistir && mudou) {
      estado = itens.map(i => ({ id: i.id, qty: i.qty }));
      try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) {}
    }

    const totalItens = itens.reduce((s, i) => s + i.qty, 0);
    const linhas = itens.map(i => {
      const unit = window.Precos.precoUnitario(i.livro, totalItens);
      return Object.assign({}, i, { precoUnit: unit, precoLinha: unit * i.qty });
    });
    const subtotal = linhas.reduce((s, i) => s + i.precoLinha, 0);

    return { itens: linhas, totalItens, subtotal, vazio: linhas.length === 0 };
  }
  function resolver() { return resolverLista(estado, true); }

  /* ---------- Ações ---------- */
  function add(livro, qty) {
    const id = idLivro(livro);
    qty = qty || 1;
    const existente = estado.find(i => i.id === id);
    const max = Math.max(1, maxVendavel(livro));
    if (existente) existente.qty = Math.min(existente.qty + qty, max);
    else estado.push({ id, qty: Math.min(qty, max) });
    salvar(estado);
    // Métrica de "adicionar ao carrinho" (só dispara se as métricas estiverem ligadas).
    if (window.Analytics) window.Analytics.adicionarCarrinho(livro, qty);
  }
  function definirQty(id, qty) {
    const item = estado.find(i => i.id === id);
    if (!item) return;
    if (qty <= 0) { estado = estado.filter(i => i.id !== id); }
    else {
      const livro = mapaLivros()[id];
      const max = livro ? maxVendavel(livro) : qty;
      item.qty = Math.min(qty, max);
    }
    salvar(estado);
  }
  function remover(id) { estado = estado.filter(i => i.id !== id); salvar(estado); }
  function limpar() { estado = []; salvar(estado); }
  function totalItens() { return resolver().totalItens; }

  /* Substitui o carrinho inteiro (usado ao sincronizar com a conta). */
  function substituir(itens) {
    estado = (Array.isArray(itens) ? itens : [])
      .filter(i => i && i.id && i.qty > 0)
      .map(i => ({ id: i.id, qty: i.qty }));
    salvar(estado);
  }

  return { idLivro, assinar, resolver, resolverLista, add, definirQty, remover, limpar, totalItens, substituir };
})();

/* Disponibiliza o gerador de id para os outros scripts. */
window.idLivro = window.Carrinho.idLivro;

/* Ao sair da conta, esvazia o carrinho em memória também. */
document.addEventListener("bookverse:logout", function () {
  if (window.Carrinho) window.Carrinho.limpar();
});
