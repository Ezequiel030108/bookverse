/* ============================================================
   BOOKVERSE — AVISOS AO CLIENTE (o site conversando com o backend)
   ------------------------------------------------------------
   Quem escreve e envia o e-mail/WhatsApp é o servidor
   (functions/api/avisar.js e campanha.js). Este arquivo só faz a
   ponte: pega o token de login e chama a API.

   O que dá para fazer daqui:

     Avisos.avisar("pago", { codigo: "BV12AB34" })
       → manda para o CLIENTE o aviso daquele momento do pedido.
         Eventos: recebido, pago, enviado, entregue, cancelado.

     Avisos.publico()        → quantos clientes recebem novidades
     Avisos.campanha({...})  → dispara UM lote da campanha
     Avisos.linkWhatsapp(tel, texto)
       → link "wa.me" pronto, para o admin mandar com um toque
         quando o WhatsApp automático não estiver ligado.

   Nada aqui trava a loja: se o aviso falhar, a compra continua.
   Não precisa mexer neste arquivo.
   ============================================================ */

(function () {

  const CFG = (window.LOJA_CONFIG && window.LOJA_CONFIG.avisos) || {};

  /* Token de login do Firebase (prova de quem está chamando). */
  async function token() {
    if (!window.Auth || !window.Auth.idToken) return null;
    try { return await window.Auth.idToken(); } catch (e) { return null; }
  }

  async function chamar(caminho, opcoes) {
    const t = await token();
    if (!t) throw new Error("Entre na sua conta para continuar.");
    const o = opcoes || {};
    const resp = await fetch(caminho, {
      method: o.metodo || "GET",
      headers: Object.assign(
        { "Authorization": "Bearer " + t },
        o.corpo ? { "Content-Type": "application/json" } : {}
      ),
      body: o.corpo ? JSON.stringify(o.corpo) : undefined
    });
    let dados = null;
    try { dados = await resp.json(); } catch (e) { /* resposta sem JSON */ }
    if (!resp.ok) throw new Error((dados && dados.error) || "Falha na comunicação com o servidor.");
    return dados || {};
  }

  /* Este aviso deve sair automaticamente? (liga/desliga no config) */
  function ligado(evento) {
    if (CFG.ligado === false) return false;
    const e = CFG.eventos;
    if (e && e[evento] === false) return false;
    return true;
  }

  /* ------------------------------------------------------------
     Avisa o cliente sobre um momento do pedido.
     Devolve o resultado do servidor, ou null se não deu (nunca
     lança: nenhum aviso pode derrubar um pedido).
     ------------------------------------------------------------ */
  async function avisar(evento, opcoes) {
    const o = opcoes || {};
    if (!o.forcar && !ligado(evento)) return null;
    if (!o.codigo) return null;
    try {
      return await chamar("/api/avisar", {
        metodo: "POST",
        corpo: {
          evento: evento,
          codigo: o.codigo,
          uid: o.uid || undefined,
          canais: o.canais || undefined,
          forcar: o.forcar === true
        }
      });
    } catch (e) {
      if (o.propagarErro) throw e;
      return null;
    }
  }

  /* Quantos clientes recebem novidades (só admin). */
  function publico() {
    return chamar("/api/campanha");
  }

  /* Dispara UM lote da campanha (só admin). Devolve, entre outras
     coisas, "proximo": o cursor do lote seguinte (ou "" no fim). */
  function campanha(dados) {
    return chamar("/api/campanha", { metodo: "POST", corpo: dados || {} });
  }

  /* Link de envio manual pelo WhatsApp (plano B do admin). */
  function linkWhatsapp(telefone, texto) {
    let d = String(telefone || "").replace(/\D/g, "");
    if (d.length > 11 && d[0] === "0") d = d.replace(/^0+/, "");
    if (d.length === 10 || d.length === 11) d = "55" + d;
    if (d.length < 12) return "";
    return "https://wa.me/" + d + "?text=" + encodeURIComponent(String(texto || "").slice(0, 1500));
  }

  window.Avisos = { avisar, publico, campanha, linkWhatsapp, ligado };

})();
