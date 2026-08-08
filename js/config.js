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
  // WhatsApp da loja: usado no botão de suporte (menu da conta) e para o
  // cliente mandar o comprovante do pedido.
  // Formato internacional só com números: 55 + DDD + número. Ex.: "5583999998888".
  whatsapp: "5514982241492",

  /* ---------- Moeda ---------- */
  // Moeda usada nos preços e no Pix. O Brasil usa BRL (Real).
  moeda: { codigo: "BRL", simbolo: "R$" },

  /* ---------- Vitrine ----------
     - ordemGeneros: a ordem das seções na página inicial. Gêneros que
       não estiverem aqui aparecem depois, na ordem em que surgirem.
     - fixarUltimoDestaque: título de um livro que deve aparecer sempre
       POR ÚLTIMO no carrossel de novidades (deixe "" para desativar). */
  vitrine: {
    ordemGeneros: [
      "Clássicos da Literatura",
      "Romance & Literatura",
      "Autoajuda & Desenvolvimento Pessoal",
      "Finanças & Negócios",
      "Suspense & Terror",
      "Filosofia",
      "Ciência & Curiosidades",
      "Mangás"
    ],
    fixarUltimoDestaque: "O Anticristo"
  },

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

       👉 Só mude para "mercadopago" DEPOIS de cadastrar os segredos no
          Firebase (MP_ACCESS_TOKEN, WEB3FORMS_KEY) com
          `firebase functions:secrets:set` — veja o README, seção
          "⚡ Confirmação automática do Pix". Antes disso, deixe
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
    web3formsKey: "4730db44-4009-4a91-9a2b-b136898bb604",

    /* Exigir que o cliente esteja logado (conta Google) para finalizar
       o pedido. Só vale quando o login está configurado (bloco firebase
       abaixo). Use false para permitir compra sem conta. */
    exigirConta: true
  },

  /* ---------- AVISAR O CLIENTE (e-mail + WhatsApp) ----------
     👉 É o que faz a loja parecer (e agir como) uma loja grande: o
     CLIENTE recebe um e-mail bonito — e uma mensagem no WhatsApp —
     quando o pedido é feito, quando o pagamento cai, quando sai
     para entrega e quando é entregue. E você pode disparar
     NOVIDADES para todo mundo pelo painel "Novidades".

     ⚠️ Aqui você só liga e desliga. Para os avisos saírem de
     verdade é preciso cadastrar as chaves no Firebase (uma vez
     só) — o passo a passo completo, com prints, está no README,
     seção "📣 Avisos automáticos para o cliente".

     Resumo do que o README manda fazer:
       • E-mail: criar conta no Resend (grátis) e rodar
         `firebase functions:secrets:set RESEND_API_KEY`
       • WhatsApp: ativar a API do WhatsApp Business na Meta e rodar
         `firebase functions:secrets:set WHATSAPP_TOKEN`
         `firebase functions:secrets:set WHATSAPP_PHONE_ID`

     ENQUANTO NADA DISSO ESTIVER PRONTO a loja continua funcionando
     igual: os avisos simplesmente não saem, e no painel "Pedidos da
     loja" aparece o botão "Avisar pelo WhatsApp", que abre o SEU
     WhatsApp Business com a mensagem já escrita — é só tocar em
     enviar. */
  avisos: {
    // false desliga TODOS os avisos automáticos de uma vez.
    ligado: true,

    /* Quais momentos disparam aviso sozinhos. Deixe false no que
       você preferir mandar na mão (pelo botão do painel).
         recebido  → "recebemos seu pedido" (assim que ele finaliza)
         pago      → "pagamento confirmado ✓"
         enviado   → "saiu para entrega 🚚"
         entregue  → "entregue, boa leitura 📚"
         cancelado → "seu pedido foi cancelado" */
    eventos: {
      recebido: true,
      pago: true,
      enviado: true,
      entregue: true,
      cancelado: true
    },

    /* Mostrar ao cliente, em "Minha conta → Meus dados", as opções
       de escolher o que quer receber. Deixe true: é exigência da
       LGPD dar essa escolha (e evita cair no spam). */
    preferencias: true,

    /* Avisos pelo WhatsApp (API do WhatsApp Business).
       Enquanto estiver false, TODA a parte de WhatsApp some da tela:
       o cliente não vê a opção "Avisos pelo WhatsApp" em "Meus dados"
       e o painel "Novidades" não oferece o canal WhatsApp — porque
       não adianta deixar ligar uma coisa que ainda não envia nada.
       A preferência que o cliente já tinha salva continua guardada.
       Quando o WHATSAPP_TOKEN e o WHATSAPP_PHONE_ID estiverem
       cadastrados no Firebase (README, seção "📣 Avisos automáticos"),
       troque para true e as opções voltam a aparecer. */
    whatsapp: false
  },

  /* ---------- EMBALAR PARA PRESENTE ----------
     Valor cobrado a mais quando o cliente marca "Embalar para presente"
     no checkout. Use 0 para deixar a opção gratuita. */
  presente: {
    valor: 1.5
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
      "marialeticinha22@gmail.com",
      "oficialpaulo6@gmail.com"
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
    authDomain: "login.bookverse.com.br",
    projectId: "bookverse-69878",
    appId: "1:784486720606:web:7cefa1b2c002ddbe4e40cf"
  },

  /* ---------- MÉTRICAS (Google Analytics + Google Ads) ----------
     Opcional. Liga o site ao Google Analytics (relatórios de visitas,
     livros mais vistos, funil de compra) e ao Google Ads (conversões e
     remarketing). Enquanto os campos ficarem vazios, as métricas ficam
     DESLIGADAS e o site funciona normal (nada do Google é carregado).

     Passo a passo completo (com prints do que copiar) no arquivo
     METRICAS.md, na raiz do projeto.

     - measurementId: o "ID da métrica" do Google Analytics 4. Você pega
       no Firebase Console → engrenagem ⚙ → Configurações do projeto →
       aba "Integrações" → Google Analytics (ou no painel do Google
       Analytics → Administrador → Fluxos de dados). Tem o formato
       "G-XXXXXXXXXX".

     - googleAdsId: o ID da sua conta do Google Ads, formato
       "AW-XXXXXXXXXX". Só preencha se você já anuncia no Google Ads e
       quer medir conversões/fazer remarketing por aqui também. (Se você
       ligar o Analytics ao Google Ads e importar as conversões por lá,
       nem precisa preencher isto — o Analytics já cuida de tudo.)

     - conversaoCompraLabel: o identificador da conversão de COMPRA criada
       no Google Ads. Formato "AW-XXXXXXXXXX/AbCdEfGhIj". Quando o cliente
       finaliza um pedido, o site avisa o Google Ads que houve uma venda,
       com o valor do pedido. Deixe vazio se você importa as conversões
       direto do Analytics.

     - conversaoContatoLabel: (opcional) o identificador de uma conversão
       de CONTATO/LEAD criada no Google Ads (mesmo formato). Quando o
       cliente clica para falar pelo WhatsApp/Instagram, o site conta como
       lead. Crie essa conversão como SECUNDÁRIA no Google Ads para não
       misturar com a otimização de vendas. Deixe vazio para não usar. */
  analytics: {
    measurementId: "G-M4K2WTHCFF",                         // ID da métrica do Google Analytics 4
    googleAdsId: "AW-17981859266",                          // ID da conta do Google Ads
    conversaoCompraLabel: "AW-17981859266/t8jECMfxls0cEMLLtf5C",  // conversão "Compra BookVerse"
    conversaoContatoLabel: "AW-17981859266/pxOzCLecvc0cEMLLtf5C",  // conversão de contato/lead (WhatsApp/Instagram)
    conversaoCarrinhoLabel: "AW-17981859266/EKvbCI_-pM0cEMLLtf5C",  // conversão "Adicionar ao carrinho"
    conversaoCheckoutLabel: "AW-17981859266/gDtiCIn9vM0cEMLLtf5C",  // conversão "Iniciar finalização de compra"

    // ---------- META (Instagram / Facebook Ads) ----------
    // metaPixelId: o ID do Meta Pixel (Gerenciador de Eventos do Meta →
    //   Fontes de dados → seu pixel → o número que aparece no topo).
    //   Só números, ex.: "1234567890123456". Enquanto ficar vazio, o Meta
    //   fica DESLIGADO (nada do Meta é carregado). Ligado, ele mede visitas,
    //   produtos vistos e compras, e monta o público de remarketing do
    //   Instagram/Facebook. Passo a passo no arquivo META-ADS.md.
    metaPixelId: "4214444458808951"
  },

  /* ---------- ENTREGA / FRETE ----------
     Cada opção aparece como uma escolha no checkout.
     - valor: 0 significa grátis.
     - pedeEndereco: true mostra os campos de endereço para essa opção.
     - somenteCidades: (opcional) lista de cidades atendidas. Se o endereço
       cadastrado do cliente for de outra cidade, o checkout bloqueia a
       finalização e pede para trocar de opção ou atualizar o endereço. */
  frete: {
    opcoes: [
      {
        id: "combinar",
        titulo: "Combinar entrega",
        descricao: "Entramos em contato pelo WhatsApp para combinar local e horário da entrega. Opção ideal para quem estuda na ECIT Deputado Genival Matias, a mesma escola de parte da nossa equipe.",
        valor: 0,
        pedeEndereco: false
      },
      {
        id: "domicilio",
        titulo: "Entrega a domicílio (somente em Juazeirinho)",
        descricao: "Levamos o pedido até você, no endereço cadastrado na sua conta (confira e edite abaixo, se precisar). Disponível apenas em Juazeirinho.",
        valor: 0,
        pedeEndereco: true,
        somenteCidades: ["Juazeirinho"]
      }
    ],
    // Não cobramos frete: todas as opções acima têm valor 0.
    // (0 ou null aqui também desliga o aviso de "frete grátis acima de X".)
    freteGratisAcima: 0
  }
};
