# 📚 Site da Livraria — Guia Completo

Este é o site da sua livraria. Ele mostra os livros disponíveis e, ao clicar em
um deles, leva o cliente direto para o seu Instagram com uma mensagem já
escrita perguntando sobre o livro.

Você **não precisa saber programar** para mexer no dia a dia. Este guia
explica tudo passo a passo.

---

## 🗂️ O que tem dentro da pasta

```
projeto livros/
├── index.html         ← a página em si (raramente vai precisar mexer)
├── css/
│   └── style.css      ← o visual do site (cores, estante, etc.)
├── js/
│   ├── livros.js      ← 👈 É AQUI QUE VOCÊ EDITA OS LIVROS
│   └── main.js        ← lógica do site (raramente precisa mexer)
├── img/               ← coloque aqui as fotos das capas
└── README.md          ← este guia
```

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
     imagem: ""
   },
   ```

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
