/* ============================================================
   BOOKVERSE — CONFIGURAÇÃO DA LOJA
   ------------------------------------------------------------
   É AQUI que você liga a loja ao seu Pix e ajusta frete,
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
  // Moeda usada nos preços e no Pix. O Brasil usa BRL (Real).
  moeda: { codigo: "BRL", simbolo: "R$" },

  /* ---------- PAGAMENTO (Pix) ----------
     👉 PARA RECEBER PAGAMENTOS:
     Preencha os 3 campos abaixo com os dados da SUA conta. O site
     gera o QR Code e o "Pix Copia e Cola" com o valor do pedido, e
     o dinheiro cai direto na sua conta — sem taxa, sem intermediário.

     - chave: sua chave Pix. Pode ser:
         • CPF (só números): "12345678900"
         • Celular (com +55): "+5583999998888"
         • E-mail: "voce@email.com"
         • Chave aleatória do banco (aquele código comprido)
     - nomeRecebedor: o nome que está na conta (igual ao do banco). Máx. 25 letras.
     - cidade: a cidade da conta. Máx. 15 letras.

     Enquanto a "chave" estiver vazia, o pagamento fica desativado
     (o resto do checkout funciona normalmente para você testar).

     ⚠️ A confirmação do Pix é MANUAL: você confere no app do seu banco
     que o pagamento caiu (o cliente também pode te enviar o comprovante
     pelo WhatsApp/Instagram). */
  pix: {
    chave: "13377347488",
    nomeRecebedor: "Cauan Batista da Costa",
    cidade: "Juazeirinho"
  },

  /* ---------- RECEBER PEDIDOS POR E-MAIL ----------
     Quando o cliente finaliza, o pedido é enviado para o SEU e-mail
     automaticamente (com nome, e-mail e WhatsApp do cliente, forma de
     entrega, endereço ou "entrega a combinar", itens e total).

     Usamos o serviço gratuito Web3Forms (não precisa instalar nada):
       1. Acesse https://web3forms.com
       2. Digite o e-mail onde quer RECEBER os pedidos e clique em
          "Create Access Key".
       3. Você recebe uma chave (Access Key) nesse e-mail. Copie e cole
          abaixo, entre as aspas.

     Enquanto a chave ficar vazia, o envio por e-mail fica desligado
     (o checkout continua funcionando normalmente). */
  pedidos: {
    web3formsKey: "5306d669-6b95-4729-85ba-3c256ec61142"
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
