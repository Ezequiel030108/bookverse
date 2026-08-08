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
├── finalizar.html     ← recebe o carrinho da Loja do Instagram/Facebook
├── functions/         ← backend (Firebase) — Pix automático, IA, avisos
│   └── api/
│       ├── criar-pix.js   ← cria a cobrança Pix no Mercado Pago
│       ├── status-pix.js  ← o checkout pergunta "já caiu?"
│       ├── webhook-mp.js  ← confirma o Pix e avisa o cliente na hora
│       ├── avisar.js      ← avisa o cliente (pedido pago, entregue…)
│       ├── campanha.js    ← 👈 anuncia NOVIDADES para todos os clientes
│       ├── descadastrar.js← o link "não quero mais novidades" do e-mail
│       ├── _avisos.js     ← 👈 É AQUI QUE VOCÊ MUDA O TEXTO DOS AVISOS
│       ├── gerar-novidade.js  ← a IA que escreve o texto da novidade
│       ├── imagem-campanha.js ← guarda e publica a imagem da campanha
│       ├── _email.js      ← manda o e-mail (Resend / Brevo)
│       ├── _whatsapp.js   ← manda pelo WhatsApp Business (API da Meta)
│       └── feed.js        ← gera /feed.xml (Google) e /feed-meta.xml (Meta)
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
│   ├── avisos.js      ← chama os avisos ao cliente (não precisa mexer)
│   ├── main.js        ← lógica da vitrine (não precisa mexer)
│   ├── loja.js        ← carrinho lateral da vitrine (não precisa mexer)
│   ├── checkout.js    ← lógica do pagamento (não precisa mexer)
│   ├── finalizar.js   ← carrinho vindo do catálogo do Meta (não precisa mexer)
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

> 📣 **Esta seção é sobre o e-mail que avisa VOCÊ.** Para os e-mails e
> mensagens de WhatsApp que vão para o **CLIENTE** (pedido recebido, pagamento
> confirmado, saiu para entrega, entregue, novidades), veja a seção
> **"📣 Avisos automáticos para o cliente"**.

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
- **Saiu para entrega** — quando você sai com o pedido na mochila. O cliente
  passa a ver **A caminho 🚚**.
- **Marcar como entregue** — a "baixa" do pedido. O cliente vê o status
  **Entregue ✓** na linha do tempo do pedido dele.
- **Cancelar pedido** — libera o pedido sem entrega.

**A cada um desses toques o CLIENTE é avisado automaticamente** por e-mail e
pelo WhatsApp da loja (veja a seção **"📣 Avisos automáticos para o cliente"**).
Embaixo de cada pedido aparece a linha *"Cliente avisado: pagamento, saiu para
entrega…"*, e o botão **Avisar o cliente** reenvia o aviso quando você quiser.

Ao confirmar o pagamento (ou entregar), o estoque dos itens é baixado
automaticamente: um livro com 3 unidades continua na loja com 2.

O cliente acompanha tudo em **Meus pedidos**, numa linha do tempo:
**Pedido feito → Pagamento → Saiu para entrega → Entregue**.

## 📣 Avisos automáticos para o cliente (e-mail + WhatsApp)

É isto que separa uma loja amadora de uma **loja profissional**: o cliente não
fica no escuro. Ele recebe uma mensagem em cada passo da compra — e você
consegue anunciar novidades para todo mundo de uma vez.

### O que o cliente recebe (sozinho, sem você fazer nada)

| Momento | Quando dispara | O que chega |
|---|---|---|
| 🧾 **Pedido recebido** | assim que ele finaliza a compra | "Recebemos seu pedido, já reservamos os livros" + itens e total |
| ✅ **Pagamento confirmado** | no segundo em que o Pix cai | "Seu pagamento caiu! Já estamos separando seus livros" |
| 🚚 **Saiu para entrega** | quando você toca em *Saiu para entrega* | "Seu pedido está a caminho" |
| 📚 **Entregue** | quando você toca em *Marcar como entregue* | "Entregue! Boa leitura" + pedido para marcar a loja no Insta |
| ⚠️ **Cancelado** | quando você cancela o pedido | "Seu pedido foi cancelado" + como refazer |

E, quando **você** quiser, o painel **Novidades** manda um anúncio (livro novo,
promoção, recado) para **todos os clientes** de uma vez.

O e-mail sai com a cara da loja: cabeçalho roxo, a lista de livros, o total, a
forma de entrega e um botão para acompanhar o pedido. Nada de e-mail cru.

### ⚠️ Antes de tudo: cadastre os segredos

O Firebase **exige que todo segredo exista** para o deploy passar. Então rode
os seis comandos abaixo **uma vez**, na pasta do projeto — mesmo os que você
não for usar agora. Onde não quiser usar, digite só um traço (`-`), que
significa *"desligado"*:

```bash
firebase functions:secrets:set RESEND_API_KEY      # e-mail (recomendado)
firebase functions:secrets:set BREVO_API_KEY       # e-mail (alternativa; use "-" se usar o Resend)
firebase functions:secrets:set EMAIL_REMETENTE     # "BookVerse <oi@bookverse.com.br>"
firebase functions:secrets:set WHATSAPP_TOKEN      # WhatsApp automático
firebase functions:secrets:set WHATSAPP_PHONE_ID   # WhatsApp automático
firebase functions:secrets:set AVISOS_SECRET       # qualquer frase secreta sua
```

> 🚨 **Se você não rodar isso, o deploy das funções falha** com uma mensagem do
> tipo `Secret RESEND_API_KEY does not exist`. É só rodar os comandos e mandar
> o deploy de novo (aba **Actions** do GitHub → *Deploy Functions* → **Run
> workflow**).

Depois de cadastrar, publique o backend:

```bash
firebase deploy --only functions
```

---

### Parte 1 — E-mail para o cliente (10 minutos)

O Web3Forms que você já usa só sabe mandar e-mail **para você**. Para escrever
**para o cliente** precisamos de um serviço de e-mail de verdade. Escolha um:

#### Opção A — Resend (recomendado: 3.000 e-mails/mês grátis)

1. Crie a conta em **https://resend.com** (dá para entrar com o Google).
2. Vá em **Domains → Add Domain** e digite `bookverse.com.br`.
3. O Resend mostra 3 registros (SPF, DKIM e DMARC). Copie e cole cada um no
   painel de onde você comprou o domínio (Registro.br, Hostinger, Cloudflare…).
   Depois clique em **Verify**. Costuma levar de 5 minutos a 1 hora.
4. Vá em **API Keys → Create API Key**, copie a chave (começa com `re_`) e rode:

   ```bash
   firebase functions:secrets:set RESEND_API_KEY
   firebase functions:secrets:set EMAIL_REMETENTE   # cole: BookVerse <oi@bookverse.com.br>
   ```

> 🧪 **Quer testar antes de mexer no domínio?** Deixe o `EMAIL_REMETENTE` com
> `-`. O sistema usa o remetente de teste do Resend — só que ele **só entrega
> no e-mail dono da conta Resend**. Serve para você ver como o e-mail ficou,
> não para vender.

#### Opção B — Brevo (300 e-mails/dia grátis, verificação mais simples)

1. Crie a conta em **https://brevo.com**.
2. **Senders & IP → Senders → Add a sender**: cadastre o e-mail que vai
   aparecer como remetente e confirme pelo link que chega na caixa dele.
3. **SMTP & API → API Keys → Generate a new API key**, copie e rode:

   ```bash
   firebase functions:secrets:set BREVO_API_KEY
   firebase functions:secrets:set EMAIL_REMETENTE   # BookVerse <seu-email-verificado>
   firebase functions:secrets:set RESEND_API_KEY    # digite "-"
   ```

Se os dois estiverem preenchidos, o **Resend** é usado.

---

### Parte 2 — WhatsApp pelo seu WhatsApp Business

Aqui tem uma regra da Meta que é importante entender **antes** de começar:

> Quando é a **loja** que começa a conversa, o WhatsApp **só aceita mensagens
> de um "modelo" aprovado antes pela Meta**. Texto livre só vale nas 24 horas
> seguintes a uma mensagem do cliente. Não é limitação nossa — é da Meta, e
> vale para todas as lojas.

Por isso existem **dois jeitos** de usar o WhatsApp aqui, e o primeiro
**já funciona agora, sem configurar nada**:

#### Jeito 1 — Semiautomático (funciona hoje, de graça)

Não precisa fazer nada. No painel **Pedidos da loja**, quando o aviso pelo
WhatsApp não puder sair sozinho, aparece o link **"Enviar pelo WhatsApp"**:
ele abre o **seu** WhatsApp Business com a mensagem **já escrita** para aquele
cliente. Você só confere e toca em enviar. Leva 3 segundos e não custa nada.

#### Jeito 2 — Automático (WhatsApp Cloud API)

1. Acesse **https://developers.facebook.com** → **Meus apps** → **Criar app** →
   tipo **Empresa**.
2. No app, adicione o produto **WhatsApp**. A Meta cria um número de teste e
   mostra o **ID do número de telefone** (*Phone number ID*) — guarde.
3. Em **Configuração da API**, conecte o número do **seu WhatsApp Business**
   (o número precisa sair do app comum do WhatsApp para entrar na API).
4. Crie um **token permanente**: **Configurações do negócio → Usuários →
   Usuários do sistema → Adicionar** (função *Administrador*) → **Gerar novo
   token** → marque `whatsapp_business_messaging` e
   `whatsapp_business_management`. Copie o token (ele só aparece uma vez).
5. Cadastre os dois segredos:

   ```bash
   firebase functions:secrets:set WHATSAPP_TOKEN
   firebase functions:secrets:set WHATSAPP_PHONE_ID
   ```

6. **Cadastre os modelos.** Vá em **Gerenciador do WhatsApp → Modelos de
   mensagem → Criar modelo** e crie os seis abaixo, com **exatamente** esses
   nomes e o idioma **Português (BR)**. As `{{1}}`, `{{2}}`… são preenchidas
   pelo site na ordem indicada:

   | Nome do modelo | Categoria | Texto para colar |
   |---|---|---|
   | `pedido_recebido` | Utilidade | `Oi, {{1}}! Recebemos seu pedido {{2}} na BookVerse: {{4}}. Total: {{3}}. Assim que o pagamento cair a gente confirma por aqui. 💜` |
   | `pedido_pago` | Utilidade | `{{1}}, seu pagamento foi confirmado! Pedido {{2}}, no valor de {{3}}. Já estamos separando seus livros e avisamos quando sair para entrega. 📚` |
   | `pedido_enviado` | Utilidade | `{{1}}, seu pedido {{2}} saiu para entrega! Forma de entrega: {{3}}. Qualquer coisa é só responder esta mensagem. 🚚` |
   | `pedido_entregue` | Utilidade | `{{1}}, seu pedido {{2}} foi entregue! Esperamos que você ame a leitura. Se puder, marque a gente numa foto do livro — ajuda demais! 💜` |
   | `pedido_cancelado` | Utilidade | `{{1}}, seu pedido {{2}} na BookVerse foi cancelado. Se foi engano ou se quiser refazer, é só responder aqui que a gente resolve. 💜` |
   | `novidades` | Marketing | `Oi, {{1}}! Novidade na BookVerse: {{2}}. {{3}}` |

   **Exemplos para a Meta aprovar:** ao criar o modelo, a Meta pede um exemplo
   de cada variável. Preencha com algo real, tipo `Ana`, `BV12AB34`,
   `R$ 47,50`, `2x Vidas Secas`. Modelos de **Utilidade** costumam ser
   aprovados em minutos.

   > 💡 Usou outros nomes? Sem problema — dá para apontar cada um pelo arquivo
   > `functions/.env` (ex.: `WHATSAPP_MODELO_PAGO=meu_nome_de_modelo`).

7. **Custo:** a Meta cobra por conversa iniciada pela loja. As de **Utilidade**
   (avisos de pedido) são baratas e, no Brasil, muitas vezes gratuitas quando
   partem de uma conversa recente. As de **Marketing** (novidades) são pagas.
   Confira o preço atual em *Gerenciador do WhatsApp → Preços* — a Meta muda
   isso de tempos em tempos.

**Se algo der errado no envio automático** (modelo reprovado, saldo, janela de
24h), o sistema **não perde o aviso**: ele devolve o link "Enviar pelo
WhatsApp" no painel, e você manda com um toque.

---

### Parte 3 — Anunciar novidades para todo mundo

Entre em **Minha conta → Novidades** (só aparece para os e-mails de admin).

1. No topo o painel mostra **quantos clientes vão receber**.
2. Escreva o **título** — é ele que vira o assunto do e-mail.
3. Escreva a **mensagem**, ou toque em **"✨ Escrever com IA"** (veja abaixo).
   Uma linha em branco separa parágrafos.
4. **Link do botão** — três jeitos, escolha nos botõezinhos:
   - **Digitar** — você cola qualquer endereço na mão (como era antes);
   - **Um livro** — escolhe na lista e o link daquele livro entra sozinho
     (o mesmo endereço do botão "Compartilhar" da loja);
   - **Uma categoria** — escolhe, por exemplo, *Mangás*, e o botão abre a
     estante já filtrada nessa categoria.
5. **Imagem de capa** — quatro jeitos:
   - **Sem imagem** (padrão);
   - **Capa de um livro** — escolhe o livro e usa a capa dele;
   - **Enviar do meu aparelho** — pega uma foto do celular/computador. Ela é
     reduzida no próprio navegador e publicada automaticamente;
   - **Colar endereço** — se você já tem a imagem publicada em outro lugar.
6. Escolha os canais: **E-mail** e/ou **WhatsApp**.
7. Olhe a **prévia** — ela mostra o e-mail e o balão do WhatsApp.
8. Toque em **"Enviar teste para mim"**. O anúncio chega só para você.
9. Gostou? **"Enviar para todos"**. A barra mostra o progresso
   (*"Enviando… 34 clientes até agora"*).

O envio vai em lotes por dois motivos: uma função tem 60 segundos para
responder, e mandar tudo de uma vez derrubaria o limite dos serviços de
e-mail. Você não precisa fazer nada — o painel cuida disso.

#### ✨ Escrever a mensagem com IA

Preencha o **título** e toque em **"Escrever com IA"**. A IA escreve o corpo
da mensagem no tom da loja, e você ajusta o que quiser antes de enviar.

Ela fica **muito melhor** se você escolher antes um **livro** ou uma
**categoria** no *link do botão*: aí a IA recebe o título, o autor, o preço, o
estado do exemplar e a sinopse, e escreve sobre aquilo de verdade em vez de
falar no vazio.

A IA é orientada a: não repetir o título, não cumprimentar nem assinar (o
e-mail já faz as duas coisas), escrever 2 ou 3 parágrafos curtos e — o mais
importante — **nunca inventar preço, desconto, prazo ou promoção**. Se você
não informou, ela não fala.

> Usa a **mesma chave gratuita do Gemini** que gera as sinopses
> (`GEMINI_API_KEY`). Se ela não estiver cadastrada, o botão avisa e você
> escreve à mão normalmente. As palavras que orientam a IA ficam no arquivo
> `functions/api/gerar-novidade.js` — são texto comum, dá para editar.

> 🖼️ **Por que a imagem enviada vira um endereço:** o Gmail bloqueia imagens
> embutidas dentro do e-mail. Por isso a foto que você envia é guardada e
> ganha um endereço `https://` de verdade (`/api/imagem-campanha`) — é assim
> que ela aparece na caixa de entrada do cliente.

> 📌 **Boas práticas de loja séria:** no máximo 1 ou 2 anúncios por semana,
> sempre com algo de valor (livro novo, promoção de verdade). Base cansada
> marca como spam, e aí nem os avisos de pedido chegam mais.

---

### Parte 4 — A escolha do cliente (LGPD)

Em **Minha conta → Meus dados** o cliente vê o bloco **"Avisos e novidades"**
com três chaves: avisos por e-mail, avisos por WhatsApp e novidades/promoções.
Tudo começa **ligado** (quem compra espera ser avisado) e ele desliga o que
quiser.

Todo e-mail de **novidades** leva no rodapé o link **"Não quero mais receber
novidades"**. Um clique e pronto — sem login, sem formulário. Isso é exigência
da LGPD e das regras antispam do Gmail; loja que não dá saída fácil acaba na
caixa de spam de todo mundo.

**Sair das novidades não cancela os avisos de pedido.** "Pagamento confirmado"
e "saiu para entrega" continuam chegando, porque fazem parte da compra.

---

### Parte 5 — Ligar e desligar (js/config.js)

No bloco `avisos` do `js/config.js` você controla o que dispara sozinho:

```js
avisos: {
  ligado: true,              // false desliga TODOS os avisos automáticos
  eventos: {
    recebido: true,          // "recebemos seu pedido"
    pago: true,              // "pagamento confirmado ✓"
    enviado: true,           // "saiu para entrega 🚚"
    entregue: true,          // "entregue, boa leitura 📚"
    cancelado: true          // "seu pedido foi cancelado"
  },
  preferencias: true,        // mostra as opções de aviso na conta do cliente
  whatsapp: false            // avisos pelo WhatsApp: desligados por ora
}
```

Deixe `false` no que você preferir mandar na mão — o botão **Avisar o cliente**
continua funcionando no painel.

**`whatsapp: false` (situação de hoje).** Enquanto a API do WhatsApp Business
não estiver ativa, toda a parte de WhatsApp some da tela: o cliente não vê
"Avisos pelo WhatsApp" em *Meus dados* e o painel **Novidades** não oferece o
canal WhatsApp — não faz sentido deixar ligar uma opção que ainda não envia
nada. A preferência que o cliente já tinha salva continua guardada no banco.
Quando o `WHATSAPP_TOKEN` e o `WHATSAPP_PHONE_ID` estiverem cadastrados
(Parte 2 acima), troque para `true` e as opções voltam a aparecer.

---

### Parte 6 — Um índice a mais no banco (opcional)

O aviso de "pagamento confirmado" dispara sozinho porque o Mercado Pago avisa
o nosso servidor quando o Pix cai. Para o servidor achar o pedido, ele usa o
código guardado na própria cobrança — isso **já funciona sem configurar nada**.

Existe um caminho reserva (procurar o pedido pelo id do pagamento) que precisa
de um índice do Firestore. Se quiser ligar essa rede extra de segurança:

```bash
firebase deploy --only firestore:indexes
```

---

### Parte 7 — A foto da loja na caixa de entrada do Gmail

Aquela bolinha colorida com a letra **B** ao lado do remetente. Para virar a
logo da loja, o caminho **não** é o Gravatar: o Gmail nunca leu o Gravatar
(isso é coisa do WordPress). O Gmail decide a foto assim, nesta ordem:

1. **A pessoa te salvou nos contatos** com foto — aí ela vê essa foto. Não
   dá para controlar do nosso lado.
2. **O endereço remetente tem uma Conta Google com foto de perfil.** Era o
   caminho barato, mas hoje ele está fechado: o Google **tirou do cadastro**
   a opção "usar meu endereço de e-mail atual", então não dá mais para
   criar uma Conta Google grátis com `contato@bookverse.com.br`. Sobra o
   **Google Workspace**, que é pago (algo em torno de R$ 30 por usuário/mês —
   confira o preço do dia). Com ele o endereço da loja vira uma Conta Google
   de verdade e a foto do perfil é a logo. Mesmo assim não é garantia: o
   Gmail não promete mostrar essa foto para quem recebe.
3. **BIMI** — o jeito oficial, o único que o Gmail garante. Precisa de:
   - SPF e DKIM passando e **alinhados** com o domínio (o Resend/Brevo já
     entrega isso quando o domínio está verificado);
   - **DMARC valendo**: `p=quarantine` ou `p=reject` em
     `_dmarc.bookverse.com.br` (com `p=none` o BIMI não conta);
   - a logo em **SVG Tiny PS**, quadrada, hospedada em HTTPS;
   - um registro TXT em `default._bimi.bookverse.com.br`:
     `v=BIMI1; l=https://www.bookverse.com.br/img/bimi.svg; a=https://.../vmc.pem`
   - e o caro: um **VMC** (ou CMC) da DigiCert/Entrust, na faixa de
     **US$ 1.000 por ano**. Sem esse certificado o Gmail continua mostrando
     a letra, mesmo com todo o resto certo.

Resumo honesto: nenhum caminho é grátis hoje. A bolinha com a letra é o
normal para loja pequena e não atrapalha venda nenhuma — quem abre o e-mail
vê o cabeçalho com a logo do mesmo jeito. Deixe a foto para quando o volume
justificar o Workspace ou o VMC. O **DMARC**, esse sim, vale a pena agora:
é grátis, melhora a entrega, mantém o e-mail longe do spam e já deixa meio
caminho andado se um dia você quiser o BIMI.

---

### ❓ Se algum aviso não chegar

| Sintoma | O que costuma ser |
|---|---|
| Nenhum e-mail sai | Os segredos não foram cadastrados, ou o deploy não rodou depois deles. |
| E-mail só chega para você | O `EMAIL_REMETENTE` está com `-` (remetente de teste do Resend). Verifique o domínio e cadastre o remetente real. |
| E-mail cai no spam | O domínio não está verificado (SPF/DKIM) no Resend/Brevo. |
| WhatsApp não sai, mas aparece o link | Normal quando a API não está configurada, ou o modelo ainda não foi aprovado. Envie pelo link até resolver. |
| "Modelo não existe" | O nome do modelo na Meta está diferente do esperado (veja a tabela da Parte 2) ou o idioma não é `pt_BR`. |
| Cliente reclama que recebeu duas vezes | Não deveria acontecer: cada aviso fica marcado no pedido. Se acontecer, me mostre a linha *"Cliente avisado: …"* daquele pedido. |
| Quero ver o que deu errado | Firebase Console → **Functions → Registros** e procure por `[avisar]`, `[campanha]` ou `[webhook-mp]`. |

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

## 🛍️ Vender pelo Instagram/Facebook (catálogo do Meta)

O catálogo do Meta — que marca os livros nos posts e stories — tem um feed
próprio, com o **mesmo catálogo** do Google e um campo a mais (a quantidade
disponível, exigida pelas Lojas do Meta):

```
https://www.bookverse.com.br/feed-meta.xml
```

Para o catálogo ser aprovado como **Loja**, o Meta também exige uma **URL de
finalização de compra**, que já existe no site:

```
https://www.bookverse.com.br/finalizar
```

É a página que recebe o carrinho escolhido no Instagram (`?products=id:qtd,...`),
confere o estoque de verdade, avisa o que mudou e leva ao checkout normal.

👉 Passo a passo no Gerenciador de Comércio, teste e detalhes:
**`META-CATALOGO.md`**. (Nada disso muda o feed nem afeta o Google Shopping.)

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

> 💜 **Livro cadastrado pelo painel (Administração):** ele não está neste
> arquivo, e sim no Firebase. Para tirá-lo do ar, use **Minha conta →
> Administração → Remover**.
>
> Se precisar sumir com ele na hora, sem abrir o painel, ponha o **id** do
> livro na lista `LIVROS_OCULTOS`, no começo do `js/livros.js`. Livro que
> está nessa lista não aparece em lugar nenhum: nem na estante, nem na
> busca, nem no carrinho, nem nos anúncios. O id é o pedacinho que fica no
> fim do link do livro (`www.bookverse.com.br/livro/AQUI-FICA-O-ID`).

### 👯 Livro repetido na estante

Se o mesmo livro for cadastrado duas vezes com títulos escritos de formas
diferentes, o site percebe sozinho: dois cadastros com a **mesma foto de
capa** são o mesmo livro, e só o cadastro mais recente aparece. O antigo
continua no painel — apague-o por lá quando puder.

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

## 🤖 Cadastro automático de livros com IA (foto da capa)

No painel de **Administração → Adicionar um novo livro**, o cadastro ficou
**mais automático**: basta **escolher a foto da capa** e a IA lê a imagem e
**preenche sozinha o título e o autor** do livro. Se quiser, dá para clicar em
**"Identificar título e autor da capa (IA)"** para rodar de novo (ou
sobrescrever o que estiver nos campos).

- A IA só **completa os campos vazios** quando roda sozinha ao escolher a foto,
  então ela nunca apaga o que você já digitou. O botão manual, esse sim,
  sobrescreve.
- Os campos vêm como **sugestão**: confira e ajuste antes de salvar.
- Junto com os botões que já existiam (**Gerar sinopse com IA** e **Classificar
  categoria com IA**), o fluxo fica: tira a foto → título, autor, sinopse e
  categoria quase prontos.

Usa a **mesma chave do Gemini** (`GEMINI_API_KEY`) que a geração de sinopse e a
classificação já usam — é **gratuita**. Se ela não estiver configurada, o
cadastro continua funcionando normalmente (é só preencher à mão).

> Só **administradores logados** conseguem usar os recursos de IA, para proteger
> a cota da chave.

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
