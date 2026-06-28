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

---

## 🗂️ O que tem dentro da pasta

```
projeto livros/
├── index.html         ← a vitrine (estante de livros)
├── checkout.html      ← a página de finalizar compra (pagamento)
├── css/
│   └── style.css      ← o visual do site (cores, estante, etc.)
├── js/
│   ├── livros.js      ← 👈 É AQUI QUE VOCÊ EDITA OS LIVROS
│   ├── config.js      ← 👈 É AQUI QUE VOCÊ LIGA O PIX E O FRETE
│   ├── precos.js      ← cálculo de preços e promoção (não precisa mexer)
│   ├── cart.js        ← o carrinho de compras (não precisa mexer)
│   ├── pix.js         ← gera o "Pix Copia e Cola" (não precisa mexer)
│   ├── main.js        ← lógica da vitrine (não precisa mexer)
│   ├── loja.js        ← carrinho lateral da vitrine (não precisa mexer)
│   ├── checkout.js    ← lógica do pagamento (não precisa mexer)
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
> ⚠️ O e-mail avisa do pedido, mas **quem confirma se o Pix caiu é você**, no
> app do banco (o código do pedido ajuda a casar uma coisa com a outra).

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

Abra `js/livros.js`, encontre o livro, troque o texto entre as aspas e salve.

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
