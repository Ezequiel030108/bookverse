/* ============================================================
   BOOKVERSE — CONFIGURAÇÃO DA LOJA
   ------------------------------------------------------------
   É AQUI que você liga a loja ao seu PayPal e ajusta frete,
   contatos e moeda. Você NÃO precisa saber programar: basta
   trocar os textos entre aspas. Leia os comentários de cada
   item com calma.
   ============================================================ */

window.LOJA_CONFIG = {

  /* ---------- Identidade da loja ---------- */
  nomeLoja: "BookVerse",
  cidade: "Juazeirinho",
  instagram: "mybookverse.pb",   // sem o @
  emailContato: "",              // opcional (aparece no rodapé do checkout)
  // WhatsApp opcional para o cliente mandar o comprovante do pedido.
  // Formato internacional só com números: 55 + DDD + número. Ex.: "5583999998888".
  whatsapp: "",

  /* ---------- Moeda ---------- */
  // O PayPal precisa de uma moeda. O Brasil usa BRL (Real).
  moeda: { codigo: "BRL", simbolo: "R$" },

  /* ---------- PAGAMENTO (PayPal) ----------
     👉 PARA RECEBER PAGAMENTOS DE VERDADE:
     1. Acesse https://developer.paypal.com/dashboard/applications/live
     2. Crie (ou abra) um aplicativo na sua conta PayPal de empresa.
     3. Copie o "Client ID" (é uma chave pública, pode ficar no site).
     4. Cole esse Client ID abaixo, entre as aspas, e salve.

     Enquanto o campo estiver vazio, a loja funciona em MODO
     DEMONSTRAÇÃO: o cliente consegue percorrer todo o checkout e
     "finalizar" um pedido de teste, mas NENHUM dinheiro é cobrado.
     Assim você consegue ver tudo funcionando antes de ir ao ar. */
  paypal: {
    clientId: "",          // <- cole aqui o seu Client ID de PRODUÇÃO
    ambiente: "producao"   // "producao" = paypal.com (deixe assim)
  },

  /* ---------- ENTREGA / FRETE ----------
     Cada opção aparece como uma escolha no checkout.
     - valor: 0 significa grátis.
     - pedeEndereco: true mostra os campos de endereço para essa opção. */
  frete: {
    opcoes: [
      {
        id: "retirada",
        titulo: "Combinar retirada/entrega local",
        descricao: "A gente combina local e horário pelo Instagram — sem custo de entrega.",
        valor: 0,
        pedeEndereco: false
      },
      {
        id: "correios",
        titulo: "Envio pelos Correios (todo o Brasil)",
        descricao: "Enviamos para todo o Brasil. O prazo é combinado após a confirmação.",
        valor: 15,
        pedeEndereco: true
      }
    ],
    // Frete grátis quando o subtotal for igual ou maior que este valor.
    // Use 0 (ou null) para desligar o frete grátis.
    freteGratisAcima: 150
  }
};
