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
    cidade: "Juazeirinho",

    /* COMO O PIX FUNCIONA:
       - "manual"      → o site gera o Pix no navegador com a SUA chave
                         acima. Cai direto no seu banco, sem taxa. A
                         confirmação é manual (você confere no app) e o
                         e-mail chega quando o cliente toca "Já paguei".
       - "mercadopago" → o Pix é criado pelo Mercado Pago e o pagamento é
                         confirmado AUTOMATICAMENTE. O e-mail do pedido
                         chega no momento exato em que o dinheiro cai.

       👉 Só mude para "mercadopago" DEPOIS de configurar as variáveis
          na Vercel (MP_ACCESS_TOKEN, WEB3FORMS_KEY) — veja o README,
          seção "⚡ Confirmação automática do Pix". Antes disso, deixe
          em "manual" para o checkout continuar funcionando. */
    modo: "mercadopago"
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
    web3formsKey: "5306d669-6b95-4729-85ba-3c256ec61142",

    /* Exigir que o cliente esteja logado (conta Google) para finalizar
       o pedido. Só vale quando o login está configurado (bloco firebase
       abaixo). Use false para permitir compra sem conta. */
    exigirConta: true
  },

  /* ---------- ADMINISTRADORES ----------
     E-mails (de contas Google) que enxergam o painel de Administração
     dentro de "Minha conta": ali dá para repor um livro na loja ou
     marcá-lo como vendido, sem precisar abrir o Firebase Console.
     Coloque um e-mail por linha, entre aspas e separado por vírgula. */
  admin: {
    emails: [
      "ezequielfigueiredoaraujobatist@gmail.com",
      "cauantista@gmail.com",
      "marialeticinha22@gmail.com"
    ]
  },

  /* ---------- LOGIN COM GOOGLE / CONTAS (Firebase) ----------
     Opcional. Permite que o cliente crie conta com o Google, tenha os
     dados preenchidos no checkout e veja o histórico de pedidos.

     Enquanto estes campos ficarem vazios, a parte de contas fica
     DESLIGADA (o botão "Entrar" nem aparece) e o site funciona normal.

     Para ligar: crie um projeto no Firebase (gratuito), ative o login
     com Google e o Firestore, e cole aqui os dados do "app web". Passo
     a passo no README, seção "👤 Login com Google e histórico de pedidos".
     Atenção: estes dados são PÚBLICOS por natureza (podem ficar no site). */
  firebase: {
    apiKey: "AIzaSyBkD1A6yvhUJPWhs6qe-EwqzRjXekDh8PU",
    authDomain: "bookverse-69878.firebaseapp.com",
    projectId: "bookverse-69878",
    appId: "1:784486720606:web:7cefa1b2c002ddbe4e40cf"
  },

  /* ---------- ENTREGA / FRETE ----------
     Cada opção aparece como uma escolha no checkout.
     - valor: 0 significa grátis.
     - pedeEndereco: true mostra os campos de endereço para essa opção. */
  frete: {
    opcoes: [
      {
        id: "combinar",
        titulo: "Combinar entrega",
        descricao: "Entramos em contato pelo WhatsApp para combinar local e horário da entrega. Opção ideal para quem estuda na ECIT Deputado Genival Matias — a mesma escola de parte da nossa equipe. 💜",
        valor: 0,
        pedeEndereco: false
      },
      {
        id: "domicilio",
        titulo: "Entrega a domicílio (somente em Juazeirinho)",
        descricao: "Levamos o pedido até você, no endereço cadastrado na sua conta (confira e edite abaixo, se precisar). Disponível apenas em Juazeirinho.",
        valor: 0,
        pedeEndereco: true
      }
    ],
    // Não cobramos frete: todas as opções acima têm valor 0.
    // (0 ou null aqui também desliga o aviso de "frete grátis acima de X".)
    freteGratisAcima: 0
  }
};
