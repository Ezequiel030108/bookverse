/* ============================================================
   BOOKVERSE — MONTAGEM DO CATÁLOGO (junção + limpeza)
   ------------------------------------------------------------
   A vitrine, o checkout e a página de finalizar montam a MESMA
   lista de livros: js/livros.js + os livros cadastrados pelo
   painel do admin (coleção "catalogo" do Firestore).

   Antes, cada página fazia essa junção do seu jeito e nenhuma
   delas tirava nada da lista — só acrescentava. Daí vinham dois
   problemas que apareciam no site:

   1. LIVRO REPETIDO — o mesmo livro cadastrado duas vezes, com
      títulos escritos de formas diferentes (ex.: "FNAF Fazbear
      Fright's 6 Hora de Acordar" e "Five Nights at Freddy's:
      Pavores de Fazbear #3: Hora de Acordar"). Como o título e o
      autor não batiam, a loja tratava os dois como livros
      distintos e mostrava DOIS cards do mesmo livro.

   2. LIVRO QUE VOLTAVA DO CACHE — para a loja abrir rápido, o
      catálogo do admin fica guardado no navegador. Quando um
      livro era apagado no painel, a cópia guardada continuava
      entrando na lista e o livro reaparecia no site.

   Este arquivo centraliza a junção e aplica três regras:

   • OCULTOS   — ids listados em LIVROS_OCULTOS (js/livros.js)
                 nunca entram na lista, aconteça o que acontecer.
   • REPETIDOS — duas entradas com a MESMA foto de capa são o
                 mesmo livro cadastrado duas vezes: fica só a mais
                 recente (a foto é tirada uma vez e reaproveitada,
                 então capas idênticas = mesmo cadastro repetido).
   • APAGADOS  — quando a resposta fresca do Firestore chega, os
                 livros do admin que sumiram de lá saem da lista.

   De quebra, traz a leitura RÁPIDA da disponibilidade (quem já
   foi vendido/reservado): uma única chamada à API do Firestore,
   sem carregar o SDK do Firebase. É ela que a vitrine espera
   antes de desenhar a estante pela primeira vez — assim um livro
   já vendido não chega a piscar na tela.

   Não precisa mexer aqui. Para tirar um livro do site à mão, use
   a lista LIVROS_OCULTOS no começo do js/livros.js.
   ============================================================ */

window.CatalogoLoja = (function () {

  function slug(texto) {
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /* Id do livro (o mesmo que o carrinho usa). */
  function idDe(livro) {
    if (typeof window.idLivro === "function") return window.idLivro(livro);
    return (livro && livro.id) || slug(((livro && livro.titulo) || "") + "-" + ((livro && livro.autor) || ""));
  }

  /* A lista viva da página (const LIVROS do js/livros.js). */
  function base() {
    return (typeof LIVROS !== "undefined" && Array.isArray(LIVROS)) ? LIVROS : null;
  }

  /* ---------- Regra 1: livros ocultos ---------- */
  function ocultos() {
    const lista = (typeof LIVROS_OCULTOS !== "undefined" && Array.isArray(LIVROS_OCULTOS))
      ? LIVROS_OCULTOS : [];
    return new Set(lista.map(id => String(id || "").trim()).filter(Boolean));
  }
  function oculto(livroOuId) {
    const id = typeof livroOuId === "string" ? livroOuId : idDe(livroOuId);
    return ocultos().has(id);
  }

  /* ---------- Regra 2: livros repetidos (mesma foto de capa) ----------
     Só vale para as fotos enviadas pelo painel (data:image/...), que são
     únicas de cada cadastro. Capas do /img/ podem se repetir de propósito
     (ex.: versão nova e usada do mesmo livro) e ficam de fora da regra. */
  function chaveFoto(livro) {
    const img = String((livro && livro.imagem) || "");
    return img.slice(0, 5).toLowerCase() === "data:" ? img : "";
  }
  /* Quando dois cadastros são o mesmo livro, fica o mais recente.
     "criadoEm" chega de três jeitos: objeto do Firebase (Timestamp),
     objeto vindo do cache do navegador ({seconds}) ou texto ISO. */
  function quandoEntrou(livro) {
    const c = livro && livro.criadoEm;
    if (c && typeof c === "object") {
      if (typeof c.toMillis === "function") { try { return c.toMillis(); } catch (e) {} }
      if (typeof c.seconds === "number") return c.seconds * 1000;
    }
    const t = Date.parse(c || "");
    if (!Number.isNaN(t)) return t;
    const d = Date.parse(((livro && livro.dataAdicao) || "") + "T00:00:00");
    return Number.isNaN(d) ? 0 : d;
  }

  /* Aplica as regras 1 e 2 na lista da página. Devolve true se mexeu. */
  function arrumar() {
    const LIV = base();
    if (!LIV) return false;
    const escondidos = ocultos();
    const porFoto = new Map();     // foto -> posição já ocupada em "manter"
    const manter = [];
    let mudou = false;

    LIV.forEach(livro => {
      if (!livro) return;
      if (escondidos.has(idDe(livro))) { mudou = true; return; }
      const foto = chaveFoto(livro);
      if (foto) {
        const anterior = porFoto.get(foto);
        if (anterior) {
          mudou = true;
          // Mesmo livro cadastrado duas vezes: fica o cadastro mais novo.
          if (quandoEntrou(livro) > quandoEntrou(manter[anterior])) manter[anterior] = livro;
          return;
        }
        porFoto.set(foto, manter.length);
      }
      manter.push(livro);
    });

    if (mudou) {
      LIV.length = 0;
      manter.forEach(l => LIV.push(l));
    }
    return mudou;
  }

  /* ---------- Junção com o catálogo do admin ----------
     extras      = livros vindos do Firestore (ou do cache do navegador).
     autoritativo = true quando a lista veio FRESCA do Firestore: aí os
                    livros do admin que não estão mais lá são removidos
                    (é o que impede um livro apagado de voltar do cache).
     Devolve true quando a lista realmente mudou (evita re-render à toa). */
  const idsDoAdmin = new Set();    // ids que entraram por aqui

  function aplicarExtras(extras, autoritativo) {
    const LIV = base();
    if (!LIV) return false;
    // Sem lista (null = a leitura falhou, "não sei"): mantém o que já existe.
    // Só uma lista de verdade pode ser autoritativa e apagar livros.
    if (!Array.isArray(extras)) return arrumar();
    const lista = extras;
    if (!lista.length && !autoritativo) return arrumar();

    const escondidos = ocultos();
    let mudou = false;

    // Livros do admin que sumiram da resposta fresca saem da lista.
    if (autoritativo) {
      const vivos = new Set(lista.map(l => l && l.id).filter(Boolean));
      for (let i = LIV.length - 1; i >= 0; i--) {
        const id = idDe(LIV[i]);
        if (idsDoAdmin.has(id) && !vivos.has(id)) {
          LIV.splice(i, 1);
          idsDoAdmin.delete(id);
          mudou = true;
        }
      }
    }

    const indice = new Map();
    LIV.forEach((l, i) => indice.set(idDe(l), i));

    lista.forEach(l => {
      if (!l || !l.id || escondidos.has(l.id)) return;
      if (indice.has(l.id)) {
        // Edição de um livro que já existe: aplica por cima do original.
        const atual = LIV[indice.get(l.id)];
        const novo = Object.assign({}, atual, l);
        if (JSON.stringify(novo) !== JSON.stringify(atual)) {
          LIV[indice.get(l.id)] = novo;
          mudou = true;
        }
      } else {
        LIV.push(l);
        indice.set(l.id, LIV.length - 1);
        idsDoAdmin.add(l.id);
        mudou = true;
      }
    });

    return arrumar() || mudou;
  }

  /* ---------- Disponibilidade (vendidos/reservados), caminho rápido ----------
     Uma única requisição à API do Firestore — sem baixar o SDK do Firebase.
     Devolve o mapa { id: {estado, qtd, ate} } no MESMO formato que o
     Auth.lerDisponibilidade() entrega, ou null se a leitura falhar
     (null ≠ mapa vazio: vazio significa "não há nada vendido"). */
  function valorDoCampo(v) {
    if (!v) return undefined;
    if (v.stringValue !== undefined) return v.stringValue;
    if (v.timestampValue !== undefined) return v.timestampValue;
    if (v.integerValue !== undefined) return Number(v.integerValue);
    if (v.doubleValue !== undefined) return v.doubleValue;
    if (v.booleanValue !== undefined) return v.booleanValue;
    return undefined;
  }

  function disponibilidadeRapida(msLimite) {
    const projeto = (window.LOJA_CONFIG && window.LOJA_CONFIG.firebase &&
                     window.LOJA_CONFIG.firebase.projectId) || "";
    if (!projeto) return Promise.resolve(null);
    const url = "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(projeto) +
                "/databases/(default)/documents/disponibilidade?pageSize=300";
    let opcoes = {};
    try { opcoes = { signal: AbortSignal.timeout(msLimite || 6000) }; } catch (e) {}
    return fetch(url, opcoes)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return null;
        const mapa = {};
        (data.documents || []).forEach(doc => {
          const id = String(doc.name || "").split("/").pop();
          const campos = doc.fields || {};
          const item = {};
          Object.keys(campos).forEach(k => {
            const v = valorDoCampo(campos[k]);
            if (v !== undefined) item[k] = v;
          });
          if (id) mapa[id] = item;
        });
        return mapa;
      })
      .catch(() => null);
  }

  return { idDe, oculto, arrumar, aplicarExtras, disponibilidadeRapida };
})();
