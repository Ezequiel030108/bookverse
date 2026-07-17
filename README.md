# 📚 Site da Livraria — Guia Completo

Este é o site da sua livraria. Agora ele é uma **loja de verdade**: o cliente
navega pela estante, adiciona livros ao **carrinho** e finaliza a compra
pagando com **Pix** (o QR Code e o "Pix Copia e Cola" são gerados na hora, com
o valor exato do pedido). O dinheiro cai direto na sua conta — sem taxa e sem
intermediário.

Você **não precisa saber programar** para mexer no dia a dia. Este guia
explica tudo passo a passo.

> 💳 **Quer começar a receber pagamentos?** Pule direto para a seção
> **"💳 Como receber os pagamentos (Pix)"** mais abaixo. É só preencher seus
> dados no arquivo `js/config.js`.

> ☁️ **Onde o site fica hospedado:** tudo roda no **Firebase** — hospedagem
> do site, funções (Pix, IA), login com Google e banco de dados, no mesmo
> projeto. O site atualiza **sozinho** a cada mudança que você salva no
> GitHub. As "variáveis de ambiente" (tokens secretos) ficam guardadas com
> o comando `firebase functions:secrets:set NOME_DA_VARIAVEL`. Histórico da
> mudança da Vercel para o Firebase: veja **`MIGRACAO-FIREBASE.md`**.

---

## 🗂️ O que tem dentro da pasta

```
projeto livros/
├── index.html         ← a vitrine (estante de livros)
├── checkout.html      ← a página de finalizar compra (pagamento)
├── conta.html         ← a página "Minha conta" (login Google + pedidos)
├── functions/         ← backend (Firebase) — Pix automático, IA, etc.
│   └── api/
│       ├── criar-pix.js   ← cria a cobrança Pix no Mercado Pago
│       ├── status-pix.js  ← o checkout pergunta "já caiu?"
│       ├── webhook-mp.js  ← envia o e-mail quando o Pix é confirmado
│       └── feed.js        ← gera /feed.xml para o Google Shopping (automático)
├── css/
│   └── style.css      ← o visual do site (cores, estante, etc.)
├── js/
│   ├── livros.js      ← 👈 É AQUI QUE VOCÊ EDITA OS LIVROS
│   ├── config.js      ← 👈 É AQUI QUE VOCÊ LIGA PIX, FRETE, LOGIN
│   ├── precos.js      ← cálculo de preços e promoção (não precisa mexer)
│   ├── cart.js        ← o carrinho de compras (não precisa mexer)
│   ├── pix.js         ← gera o "Pix Copia e Cola" (não precisa mexer)
│   ├── auth.js        ← login com Google e contas (não precisa mexer)
│   ├── conta.js       ← lógica da página "Minha conta" (não precisa mexer)
│   ├── main.js        ← lógica da vitrine (não precisa mexer)
│   ├── loja.js        ← carrinho lateral da vitrine (não precisa mexer)
│   ├── checkout.js    ← lógica do pagamento (não precisa mexer)
│   ├── story.js       ← desenha e publica o story do Instagram (não precisa mexer)
│   └── vendor/
│       └── qrcode.js  ← biblioteca que desenha o QR Code (não precisa mexer)
├── img/               ← coloque aqui as fotos das capas
└── README.md          ← este guia
```

---

## 💳 Como receber os pagamentos (Pix)

A loja já está pronta para vender. Falta só **uma coisa**: preencher os dados
da sua conta para o site gerar o Pix. Não precisa criar conta em lugar nenhum —
é a chave Pix do seu próprio banco.

### Passo a passo

1. Abra o arquivo `js/config.js`.
2. Preencha os 3 campos do bloco `pix`:

   ```js
   pix: {
     chave: "SUA_CHAVE_PIX",          // CPF, celular (+55...), e-mail ou chave aleatória
     nomeRecebedor: "SEU NOME",       // o nome que está na conta (máx. 25 letras)
     cidade: "Juazeirinho"            // sua cidade (máx. 15 letras)
   },
   ```

   - **chave** pode ser:
     - CPF só com números: `"12345678900"`
     - Celular com +55: `"+5583999998888"`
     - E-mail: `"voce@email.com"`
     - Chave aleatória do banco (aquele código comprido)
   - **nomeRecebedor**: o nome do titular da conta, igual ao do banco.
   - **cidade**: a cidade da sua conta.

3. Salve o arquivo e publique o site de novo (veja a seção de publicação).

Pronto! No checkout, o cliente clica em **"Gerar Pix"** e o site mostra o
**QR Code** e o **"Pix Copia e Cola"** com o valor exato do pedido. Ele paga
pelo app do banco e o dinheiro cai direto na sua conta.

### ✅ Como confirmar que o pagamento caiu

O Pix aqui é **confirmado manualmente** (jeito simples e sem custo):

- Você confere no **app do seu banco** que o valor entrou. Cada pedido tem um
  **código** (ex.: `BV12AB34`) que ajuda a identificar.
- O cliente também pode te **enviar o comprovante** pelo WhatsApp/Instagram —
  na tela de "pedido recebido" aparece um botão pra isso (se você preencher o
  campo `whatsapp` no `js/config.js`).
- Só depois de confirmar o pagamento é que você separa e entrega/envia o livro.

> 💡 Enquanto o campo `chave` ficar **vazio**, o botão de pagamento fica
> desativado (o resto do checkout continua funcionando pra você testar).
> Quando preencher a chave, o Pix liga sozinho.

---

## 📬 Como receber os pedidos por e-mail

Cada pedido finalizado é enviado **automaticamente para o seu e-mail**, com:
nome, e-mail e WhatsApp do cliente, forma de entrega, **endereço completo**
(ou "Entrega a combinar" quando for retirada), itens, valores e o código do
pedido. Você ainda responde direto pro e-mail do cliente (vem no "responder").

Usamos o **Web3Forms** (gratuito, sem instalar nada e sem expor o seu e-mail).

### Passo a passo (1 minuto)

1. Acesse **https://web3forms.com**
2. Digite o **e-mail onde quer receber os pedidos** e clique em
   **"Create Access Key"**.
3. Você recebe uma **Access Key** nesse e-mail. Copie e cole no `js/config.js`:

   ```js
   pedidos: {
     web3formsKey: "COLE_AQUI_A_SUA_CHAVE"
   },
   ```

4. Salve e publique o site de novo.

> Enquanto a chave ficar vazia, o envio por e-mail fica desligado (o checkout
> continua funcionando). O e-mail é enviado quando o cliente toca em
> **"Já fiz o pagamento"** — vale lembrar o cliente de apertar esse botão
> depois de pagar.
>
> ⚠️ No modo **manual** (padrão), o e-mail avisa do pedido, mas **quem confirma
> se o Pix caiu é você**, no app do banco. Se quiser que o e-mail só chegue
> **quando o dinheiro realmente cair**, veja a seção a seguir.

---

## ⚡ Confirmação automática do Pix (Mercado Pago)

Por padrão a loja usa o Pix **manual** (cai direto no seu banco, sem taxa, e
você confere o pagamento no app). Se preferir, dá para ligar a **confirmação
automática**: o Pix é criado pelo **Mercado Pago** e o **e-mail do pedido chega
no exato momento em que o dinheiro cai** — mesmo que o cliente feche o site.

> 💡 Trade-off: o Mercado Pago cobra uma **pequena taxa por Pix recebido** e o
> dinheiro passa pela conta dele antes de você sacar para o banco. Em troca,
> você não precisa conferir pagamento manualmente.

Tudo já está programado (pasta `functions/`). Falta só **você** ligar:

### Passo a passo

1. **Crie uma conta no Mercado Pago** e pegue o seu **Access Token de produção**:
   em <https://www.mercadopago.com.br/developers> → *Suas integrações* → crie uma
   aplicação → *Credenciais de produção* → copie o **Access Token**
   (começa com `APP_USR-...`). **Esse token é secreto — nunca coloque no código.**

2. **Cadastre os segredos no Firebase.** No computador, na pasta do projeto,
   rode um por um (cada comando pergunta o valor — cole e dê Enter):

   ```bash
   firebase functions:secrets:set MP_ACCESS_TOKEN
   firebase functions:secrets:set WEB3FORMS_KEY
   firebase functions:secrets:set MP_WEBHOOK_SECRET
   ```

   | Segredo | Valor |
   |---|---|
   | `MP_ACCESS_TOKEN` | seu Access Token do Mercado Pago |
   | `WEB3FORMS_KEY` | a mesma chave do Web3Forms que está no `js/config.js` |
   | `MP_WEBHOOK_SECRET` | segredo da assinatura do webhook (ver passo 4); se não usar, cadastre o valor `-` |

   > Depois de mexer nos segredos, publique as funções: `firebase deploy --only functions`.

3. No `js/config.js`, mude o **modo** do Pix para `"mercadopago"`:

   ```js
   pix: {
     ...
     modo: "mercadopago"   // era "manual"
   }
   ```

4. *(Opcional, mais seguro)* No Mercado Pago, em *Webhooks*, aponte para
   `https://bookverse.com.br/api/webhook-mp`, gere a **assinatura secreta** e
   cadastre o valor em `MP_WEBHOOK_SECRET` (passo 2). Sem isso já funciona — o
   servidor sempre confere o pagamento direto no Mercado Pago antes de enviar
   o e-mail —, mas a assinatura adiciona uma camada extra de proteção.

5. **Publique as funções:** `firebase deploy --only functions`.

Pronto! No checkout, ao gerar o Pix, a tela fica *"Aguardando o pagamento…"* e
vira *"Pagamento confirmado!"* sozinha quando o cliente paga — e o **e-mail do
pedido chega nesse instante**.

> Para **voltar ao modo manual** a qualquer momento, é só trocar
> `modo: "manual"` no `js/config.js`.

---

## 👤 Login com Google e histórico de pedidos

A loja pode ter **contas de cliente**: a pessoa entra com a conta **Google**,
tem os dados preenchidos automaticamente no checkout e vê o **histórico de
pedidos**. Tudo isso é **opcional** — enquanto não for configurado, o botão
"Entrar" nem aparece e o site funciona normalmente.

Usamos o **Firebase** (do Google), que tem plano **gratuito** generoso.

### Passo a passo

1. Acesse <https://console.firebase.google.com> e clique em **Adicionar projeto**
   (pode desativar o Google Analytics, não é necessário).

2. Dentro do projeto, crie um **App da Web** (ícone `</>`). O Firebase mostra um
   bloco `firebaseConfig` com `apiKey`, `authDomain`, `projectId`, `appId`, etc.
   **Copie esses valores** para o bloco `firebase` do `js/config.js`:

   ```js
   firebase: {
     apiKey: "AIza...",
     authDomain: "seu-projeto.firebaseapp.com",
     projectId: "seu-projeto",
     appId: "1:1234567890:web:abcdef..."
   },
   ```
   > Esses dados são **públicos** por natureza — pode deixá-los no site sem medo.

3. No menu **Build → Authentication → Sign-in method**, ative o provedor
   **Google**.

4. Em **Authentication → Settings → Authorized domains**, adicione **todos** os
   endereços em que o site abre, para o login funcionar em cada um:
   - o domínio do Firebase (ex.: `bookverse-69878.web.app`);
   - o seu domínio próprio (ex.: `bookverse.com.br` **e**
     `www.bookverse.com.br` — adicione as duas versões).

   > ⚠️ **Trocou o domínio do site?** O login com Google só funciona em domínios
   > que estejam nessa lista. Sempre que mudar o endereço da loja, volte aqui e
   > adicione o novo domínio (com e sem `www`). Se o login "parar de funcionar"
   > logo depois de trocar de domínio, é quase sempre isto que está faltando —
   > no console do navegador (tecla F12) aparece o erro `auth/unauthorized-domain`.

5. No menu **Build → Firestore Database**, clique em **Criar banco de dados**
   (modo de produção). Depois, na aba **Regras (Rules)**, cole as regras abaixo
   para que **cada cliente só veja os próprios dados**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       // ⚠️ Troque pelos e-mails REAIS dos administradores (os mesmos
       // do bloco admin.emails em js/config.js).
       function ehAdmin() {
         return request.auth != null &&
           request.auth.token.email in [
             "ezequielfigueiredoaraujobatist@gmail.com",
             "cauantista@gmail.com",
             "marialeticinha22@gmail.com",
             "oficialpaulo6@gmail.com"
           ];
       }

       // Cada cliente só vê e mexe nos próprios dados.
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
         match /pedidos/{pedido} {
           allow read, write: if request.auth != null && request.auth.uid == uid;
         }
       }

       // Admins enxergam e atualizam os pedidos de TODOS os clientes
       // (é o que alimenta o painel "Pedidos da loja").
       match /{path=**}/pedidos/{pedido} {
         allow read, write: if ehAdmin();
       }

       // Disponibilidade (reservados/vendidos): qualquer um LÊ (para a
       // vitrine esconder). Cliente comum só pode RESERVAR — com o
       // próprio uid e por no máximo 45 minutos. Marcar VENDIDO, repor
       // ou apagar é só para admins (a baixa é dada em "Pedidos da loja").
       match /disponibilidade/{livro} {
         allow read: if true;
         allow write: if ehAdmin() ||
           (request.auth != null &&
            request.resource.data.estado == "reservado" &&
            request.resource.data.uid == request.auth.uid &&
            request.resource.data.ate is number &&
            request.resource.data.ate < request.time.toMillis() + 45 * 60 * 1000);
         allow delete: if ehAdmin();
       }

       // Catálogo do admin (livros adicionados/editados pelo site):
       // qualquer um LÊ (é a vitrine); só admins escrevem. Sem isso,
       // qualquer pessoa logada conseguiria alterar a sua loja.
       match /catalogo/{livro} {
         allow read: if true;
         allow write: if ehAdmin();
       }
     }
   }
   ```

   > ⚠️ **Importante:** se você já usava as regras antigas, substitua TUDO
   > pelas de cima. As antigas deixavam qualquer pessoa logada marcar seus
   > livros como vendidos e mexer no catálogo da loja.

6. **Salve e publique o site.** Agora aparece o botão **"Entrar"** no topo. O
   cliente entra com o Google, salva os dados na página **Minha conta** e os
   pedidos passam a aparecer no histórico.

> Os pedidos confirmados pelo Pix automático (seção acima) são marcados como
> **"Pago"** no histórico assim que o cliente conclui o pagamento.

---

## 📦 Pedidos da loja (painel do admin)

Quem está na lista `admin.emails` (js/config.js) vê, dentro de **Minha conta**,
a aba **"Pedidos da loja"** com os pedidos de TODOS os clientes:

- **Confirmar pagamento** — para quando o Pix caiu mas o status não atualizou
  sozinho (ex.: modo manual).
- **Marcar como entregue** — a "baixa" do pedido. O cliente vê o status
  **Entregue ✓** na linha do tempo do pedido dele.
- **Cancelar pedido** — libera o pedido sem entrega.

Ao confirmar o pagamento (ou entregar), o estoque dos itens é baixado
automaticamente: um livro com 3 unidades continua na loja com 2.

O cliente acompanha tudo em **Meus pedidos**, numa linha do tempo:
**Pedido feito → Pagamento → Entrega**.

## 🎁 Embalar para presente

No checkout o cliente pode marcar **"Embalar para presente"** (grátis) e
escrever uma mensagem para o cartão. A informação chega destacada no e-mail do
pedido e aparece no painel "Pedidos da loja".

## 📚 Mesmo livro novo e usado (variantes)

Se a loja tiver o MESMO livro nas versões **nova e usada** (mesmo título e
autor), eles aparecem **juntos na mesma página** — a versão nova em destaque e
a usada como opção mais barata, estilo Amazon. No painel de Administração,
basta cadastrar o segundo exemplar com a **Condição** certa (Novo/Usado); o
site cuida do resto.

---

## ✨ Gerar sinopses com IA (grátis)

No painel de **Administração** (dentro de "Minha conta", para os e-mails da
lista `admin.emails`), ao adicionar ou editar um livro existe o botão
**"✨ Gerar sinopse com IA"**. Ele escreve uma sinopse curta e elegante a partir
do título, autor e gênero — e você ainda pode editar o texto depois.

Para ativar, cadastre **uma** chave de IA como segredo no Firebase.
Recomendamos o **Google Gemini**, que é **gratuito** e **não pede cartão**:

1. Acesse <https://aistudio.google.com/apikey> e entre com sua conta Google.
2. Clique em **Create API key** e **copie** a chave gerada.
3. No computador, na pasta do projeto, cadastre o segredo:

   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```

   | Segredo          | Valor                    |
   | ---------------- | ------------------------ |
   | `GEMINI_API_KEY` | a chave que você copiou  |

4. **Publique as funções:** `firebase deploy --only functions`. Pronto: o botão
   de gerar sinopse passa a funcionar.

> O plano gratuito do Gemini é mais que suficiente para uma livraria (centenas
> de gerações por dia). Enquanto a chave não for configurada, o botão apenas
> avisa que a geração está indisponível — você pode escrever a sinopse à mão
> normalmente.
>
> Prefere usar o **Claude (Anthropic)**? Em vez do Gemini, crie a variável
> `ANTHROPIC_API_KEY` com a chave da Anthropic (serviço pago). Se as duas
> estiverem configuradas, o Gemini (gratuito) é usado.

---

## 🏷️ Classificar o livro na categoria certa (IA)

Ainda no formulário de **Administração**, ao lado do campo **Gênero**, existe o
botão **"🏷️ Classificar categoria com IA"**. A partir do título, autor e (se já
houver) sinopse, a IA escolhe **a melhor categoria entre as que a loja já tem** e
preenche o campo sozinha — assim o livro cai na seção (carrossel) correta da loja.

Se o livro **não se encaixar em nenhuma** categoria existente, a IA **sugere
criar uma nova** e mostra o botão **"➕ Criar categoria «…»"**. Você confere o
nome e, com um clique, a aplica — ela vira uma nova seção da loja assim que o
livro é salvo.

> Usa a **mesma chave de IA** da geração de sinopse (`GEMINI_API_KEY` ou
> `ANTHROPIC_API_KEY`). Não precisa configurar nada além do que você já fez na
> seção anterior. Enquanto não houver chave, o botão apenas avisa que a
> classificação está indisponível — você escolhe o gênero à mão normalmente.

---

## 🛒 Aparecer no Google Shopping (automático)

O **Google Shopping** é aquela vitrine de produtos com foto e preço que aparece
na aba **"Shopping"** do Google (e às vezes no topo da busca normal). Colocar os
seus livros lá é **de graça** e ajuda quem procura o título no Google a cair
direto na sua loja.

### Como já funciona no site

O site gera **sozinho** uma lista de todos os livros à venda, no formato que o
Google entende, num endereço fixo:

```
https://www.bookverse.com.br/feed.xml
```

Essa lista (chamada de **"feed"**) é montada na hora, a partir do **mesmo
catálogo** da loja. Ou seja: **todo livro novo que você cadastrar** (no
`js/livros.js` ou pelo painel de Administração) **entra no feed sozinho** — e o
Google, na próxima vez que ler o feed (uma vez por dia), coloca o livro no
Shopping. **Você não precisa mexer em nada disso.**

> Os livros **esgotados** (estoque 0) saem do feed automaticamente, igual saem
> da loja. Se houver promoção ligada, o feed já manda o **preço com desconto**.

### O que você faz UMA vez (criar a conta)

1. Acesse **[merchants.google.com](https://merchants.google.com)** e entre com a
   sua conta do Google (a mesma que administra o site, de preferência).
2. Preencha os dados da loja: **nome** (BookVerse), **país** (Brasil), **site**
   (`https://www.bookverse.com.br`) e a forma de **entrega/frete**.
3. **Verifique o site**: o Merchant Center pede para você provar que o site é
   seu. Se você já usa o **Google Search Console**, dá para reaproveitar a
   verificação com um clique. (É o mesmo tipo de verificação da seção de
   publicação.)
4. No menu, vá em **Produtos → Feeds → +** (adicionar feed).
   - Método: **"Busca programada"** (o Google busca o arquivo sozinho).
   - Cole o endereço do feed: `https://www.bookverse.com.br/feed.xml`
   - Frequência: **diária** (assim livros novos aparecem em até 1 dia).
5. Salve. O Google vai ler o feed e, depois de uma **revisão** (costuma levar de
   algumas horas a alguns dias na primeira vez), os livros começam a aparecer no
   Shopping.

Pronto! Depois disso é **100% automático**: cadastrou livro na loja → ele entra
no feed → o Google atualiza o Shopping. Você **nunca mais precisa mexer aqui**.

> 💡 **Quer conferir se está tudo certo?** Abra
> `https://www.bookverse.com.br/feed.xml` no navegador: deve aparecer uma
> "lista" (XML) com todos os livros à venda. Se aparecer, o Google consegue ler.

> ℹ️ Livros **usados** normalmente não têm código de barras (ISBN). O feed já
> avisa isso ao Google (`identifier_exists: no`), então não é problema.

---

## 🚚 Como ajustar o frete e a entrega

Tudo fica no arquivo `js/config.js`, dentro de `frete`. Cada opção é um bloco:

```js
{
  id: "correios",
  titulo: "Envio pelos Correios (todo o Brasil)",
  descricao: "Enviamos para todo o Brasil...",
  valor: 15,            // preço do frete (use 0 para grátis)
  pedeEndereco: true    // true mostra os campos de endereço no checkout
}
```

- Para **frete grátis acima de um valor**, ajuste `freteGratisAcima` (ex.: `150`).
  Use `0` para desligar.
- Você pode adicionar ou remover opções de entrega copiando/apagando esses blocos.
- No mesmo arquivo dá para preencher um **WhatsApp** (campo `whatsapp`): aparece
  um botão na tela de pedido confirmado para o cliente te mandar o comprovante.

---

## 🖥️ Como abrir o site no seu computador para testar

1. Abra a pasta `projeto livros` no seu computador.
2. Dê **duplo clique** em `index.html`.
3. O site vai abrir no seu navegador (Chrome, Edge, Firefox).

> Pronto! Tudo o que você editar nos arquivos vai aparecer ao apertar **F5**
> para atualizar a página.

---

## ➕ Como ADICIONAR um livro novo

1. Abra o arquivo `js/livros.js` em um editor de texto
   (recomendo o **Bloco de Notas** ou, melhor ainda, o **VS Code** —
   é grátis: https://code.visualstudio.com).
2. Procure um bloco de livro existente. Ele começa em `{` e termina em `},`
   e tem mais ou menos esta aparência:

   ```js
   {
     titulo: "O Alquimista",
     autor: "Paulo Coelho",
     preco: "R$ 32,00",
     estoque: 3,
     estado: "Novo",
     sinopse: "Santiago, um jovem pastor andaluz...",
     imagem: "",
     dataAdicao: "2026-06-19"
   },
   ```

   > 💡 Coloque em `dataAdicao` a **data de hoje** ao cadastrar o livro.
   > Ele aparece em **"Novidades da Semana"** (no topo) por 7 dias e depois
   > sai de lá sozinho — continuando normalmente na categoria dele.

3. **Selecione e copie** esse bloco inteiro (inclusive a vírgula no final).
4. **Cole** logo abaixo, antes do `]` que fecha a lista.
5. **Substitua** as informações pelos dados do livro novo.
6. **Salve** o arquivo e atualize o navegador (F5).

> ⚠️ **Cuidados ao editar:**
> - Não apague as aspas `"` em volta dos textos.
> - Não apague as vírgulas no final de cada linha.
> - Não apague as chaves `{` e `}`.

---

## ✏️ Como EDITAR um livro existente

> 💜 **Sem mexer em código:** se o login com Google estiver ligado, entre com um
> e-mail de **administrador** e vá em **Minha conta → Administração**. Toque em
> **Editar** em qualquer livro (inclusive os que já vêm na loja) para mudar
> título, autor, preço, estado, capa e sinopse. As alterações aparecem para
> todos os clientes ao recarregar a página. Para desfazer uma edição feita ali,
> use o botão **Reverter edição** (o livro volta ao original deste arquivo).

Pelo código: abra `js/livros.js`, encontre o livro, troque o texto entre as
aspas e salve.

| Campo     | Para que serve                                           |
|-----------|----------------------------------------------------------|
| `titulo`  | Nome do livro                                            |
| `autor`   | Nome do autor                                            |
| `preco`   | Preço com R$ (ex: `"R$ 32,00"`)                          |
| `estoque` | Quantidade que você tem (`0` = esgotado, `1` = "Último!")|
| `estado`  | `"Novo"`, `"Seminovo"` ou `"Usado"`                      |
| `sinopse` | Resumo curto do livro                                    |
| `imagem`  | Caminho da capa, ex: `"img/o-alquimista.jpg"`            |
| `dataAdicao` | (opcional) Data que você adicionou, ex: `"2026-06-19"`. Mostra em "Novidades da Semana" por 7 dias |

---

## ❌ Como REMOVER um livro

Apague o bloco inteiro do livro, das chaves `{` até a `},`
(incluindo a vírgula do final). Salve e atualize a página.

---

## 🖼️ Como adicionar a foto da capa de um livro

1. Coloque a imagem dentro da pasta `img/`.
2. Renomeie o arquivo para algo simples, **sem espaços nem acentos**.
   Exemplo bom: `o-alquimista.jpg`
   Exemplo ruim: `O Alquimista (capa).jpg`
3. No arquivo `js/livros.js`, preencha o campo `imagem` assim:

   ```js
   imagem: "img/o-alquimista.jpg"
   ```

4. Salve e atualize a página.

> Se você ainda não tem a capa de um livro, deixe `imagem: ""` (vazio) —
> o site mostrará automaticamente uma capa bonita com a letra inicial do título.

**Tamanho recomendado da capa:** cerca de 400x600 pixels (formato vertical).
Pode ser `.jpg`, `.png` ou `.webp`.

---

## 📱 Como trocar o @ do Instagram

O @ aparece em **dois lugares** — troque nos dois:

### 1) No arquivo `js/main.js`
Logo no início do arquivo você vai ver:

```js
const INSTAGRAM_USUARIO = "seu_usuario";
```

Troque `seu_usuario` pelo @ da sua livraria (sem o `@`).

### 2) No arquivo `index.html`
Procure por `seu_usuario` (use Ctrl+F). Vai aparecer aqui:

```html
<a class="link-instagram" href="https://instagram.com/seu_usuario" ...>
  ...
  <span>@seu_usuario</span>
</a>
```

Troque os dois `seu_usuario` pelo seu @ real. Também é nesse arquivo
que você ajusta o **nome da livraria** e a **cidade** (procure por
"Livraria do Bairro" e "Sua Cidade").

---

## 📲 Stories dos livros no Instagram (com um toque)

No painel de **Administração**, cada livro tem um botão **Story**. Ele monta
a arte do story **sozinho** — o molde da BookVerse (céu roxo e estrelas) com a
**capa**, o **nome** e o **preço** do livro — mostra a prévia e, com um toque
em **Publicar story**, posta direto no Instagram da loja. Sem sair do site.

Para funcionar, é preciso conectar a conta **uma vez**. É de graça, mas exige
alguns passos no site da Meta (a dona do Instagram):

### 1) Deixe a conta do Instagram "profissional"

No app do Instagram: **Configurações → Central de contas → tipo de conta**
(ou **Configurações → Tipo de conta**) → **Mudar para conta profissional** →
escolha **Empresa**. É gratuito e não muda nada para os seguidores.

### 2) Crie um "app" no painel de desenvolvedor da Meta

1. Acesse <https://developers.facebook.com> e entre com a conta do Facebook.
2. **Meus apps → Criar app**. Escolha o caso de uso **"Gerenciar tudo na sua
   página"** ou adicione depois o produto **Instagram**. Dê qualquer nome
   (ex.: "BookVerse Stories").
3. No painel do app, adicione o produto **Instagram** e escolha
   **"API do Instagram com login do Instagram"** (Instagram API with
   Instagram Login).

### 3) Gere o token de acesso da loja

1. Ainda no painel do app: **Instagram → Configuração da API com login do
   Instagram** (API setup with Instagram business login).
2. Na seção de **gerar token de acesso**, clique em **Adicionar conta** /
   **Generate token** e entre com a conta do Instagram **da loja**.
3. Autorize as permissões pedidas — precisa ter
   `instagram_business_basic` e `instagram_business_content_publish`.
4. Copie o **token de longa duração** que aparece (um código bem comprido).

> O app pode ficar no **modo de desenvolvimento** para sempre: como só a
> própria loja usa (você é o admin do app), não precisa passar por revisão
> da Meta.

### 4) Conecte no site

1. Entre no site com um e-mail de **admin** → **Minha conta → Administração**.
2. Abra o bloco **"Instagram — story dos livros"**, cole o token e toque em
   **Conectar Instagram**. Aparece "Conectado como @sualoja" — pronto!

O token é guardado **no servidor** (nenhum cliente tem acesso) e vale 60
dias — mas ele se **renova sozinho** a cada story publicado, então na
prática não expira com o uso normal. Se ficar 2 meses sem publicar e o
token vencer, é só gerar outro (passo 3) e conectar de novo.

### Dicas e limites

- **Molde personalizado:** quer usar uma arte sua de fundo? Salve uma imagem
  **1080×1920** em `img/story-molde.jpg`. Ela substitui o céu, a marca e o
  rodapé — a capa, o nome e o preço continuam sendo desenhados por cima.
- O site precisa estar **publicado na internet** (o Instagram baixa a imagem
  do story pelo endereço público do site — testando só no computador não
  funciona).
- O Instagram permite no máximo **100 publicações por dia** via API — mais
  que suficiente.
- O story sai como **foto** e desaparece em 24h, como um story normal.

---

## 🌐 Como publicar o site DE GRAÇA na internet

### Opção 1 — Netlify (mais fácil, recomendado)

1. Acesse https://app.netlify.com/drop
2. **Arraste a pasta inteira** `projeto livros` para dentro do quadrado da página.
3. Pronto! O Netlify gera um link tipo `https://seu-site-123.netlify.app`.
4. Pode mudar o nome desse link nas configurações ("Site settings" → "Change site name").

> Toda vez que quiser atualizar (adicionar/editar livros), entre no painel do
> Netlify e arraste a pasta atualizada de novo em **"Deploys"**.

### Opção 2 — GitHub Pages

1. Crie uma conta gratuita em https://github.com
2. Crie um repositório novo (ex: `livraria`).
3. Suba os arquivos do site (botão **"uploading an existing file"**).
4. Vá em **Settings → Pages** e em **"Source"** escolha **"main / root"**.
5. Em alguns minutos seu site estará em
   `https://SEU_USUARIO.github.io/livraria`.

---

## 📲 Como colocar o link na bio do Instagram

1. Copie o link do seu site (do Netlify ou GitHub Pages).
2. No app do Instagram, vá em **Editar perfil**.
3. No campo **Site** (ou **Link**), cole o endereço.
4. Salve.

Pronto! Agora quando alguém clicar no link da sua bio vai ver a estante
da livraria e poder pedir os livros direto pelo direct.

---

## ❓ Algo deu errado?

- **Não aparece nenhum livro:** provavelmente você apagou uma vírgula ou
  uma aspa por engano em `js/livros.js`. Abra o site, aperte **F12** e
  veja a aba **Console** — ela aponta o erro.
- **A capa não carrega:** confira se o nome do arquivo em `imagem:` está
  exatamente igual ao nome do arquivo na pasta `img/` (letras maiúsculas
  e minúsculas importam!).
- **O botão do Instagram não abre o direct:** verifique se o `@` foi
  trocado nos dois lugares (veja a seção "Como trocar o @ do Instagram").
