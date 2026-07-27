# 🛒 Catálogo do Meta: abrir a Loja do Instagram/Facebook

Este guia resolve as **duas coisas** que travam o catálogo do Meta na hora de
virar Loja (Instagram Shopping / Facebook Shop):

1. o **feed** precisa mandar a **quantidade** de cada item, senão o Meta importa
   os produtos mas não os exibe em Lojas;
2. a Loja precisa de uma **URL de finalização de compra** — o endereço para onde
   o Meta manda o cliente com os produtos que ele escolheu.

> **Resumo em duas linhas:** use `https://www.bookverse.com.br/feed-meta.xml`
> como fonte de dados do catálogo, e `https://www.bookverse.com.br/finalizar`
> como URL de finalização. As duas já estão prontas no site.

---

## Por que o Meta pede isso

O Meta **encerrou o checkout dentro do Facebook/Instagram**. Hoje, quem vende
por lá precisa mandar o cliente para o próprio site, e o Meta exige que esse
endereço saiba **receber o carrinho pela URL** — senão o cliente chegaria ao seu
site com o carrinho vazio e a venda se perderia. É exatamente por isso que o
catálogo fica travado na revisão.

---

## Onde fica esse campo (e por que ele "não aparece")

⚠️ **O campo só existe DEPOIS que a Loja está criada.** Ele mora dentro dos
detalhes da Loja, não do catálogo:

```
Gerenciador de Comércio → Configurações → Geral
   → "Detalhes da loja"  → Editar
   → "URL de finalização de compra" → Editar
```

Ou seja: **não dá para preencher a URL antes de criar a Loja** — e, por
tabela, o catálogo cinza na tela "Selecionar catálogo" **não é** por falta
dessa URL. A ordem certa é:

1. destravar o catálogo (seção abaixo) →
2. criar a Loja →
3. **aí sim** cadastrar a URL de finalização.

---

## O que você faz (uma vez, ~2 minutos)

1. Com a Loja já criada, abra **Gerenciador de Comércio → Configurações →
   Geral → Detalhes da loja → Editar → URL de finalização de compra**.
2. Escolha **"Finalizar a compra em outro site"**.
3. No campo da URL, cole exatamente:

   ```
   https://www.bookverse.com.br/finalizar
   ```

4. **Marque a opção** que diz algo como *"Minha URL aceita parâmetros de produto
   e cupom (opcional)"* (em inglês: *"My URL will support product and coupon
   parameters"*). Isso é o que faz o Meta enviar o carrinho junto do link.
   Pode marcar sem medo: **a BookVerse não usa cupom**, e se o Meta mandar um
   `coupon` na URL o site simplesmente ignora — o link continua funcionando.
5. O Meta vai **testar com 2 produtos**. Deve abrir a página *"Seu carrinho está
   pronto"* com os dois livros e o subtotal. Salve e mande o catálogo para
   revisão.

---

## O feed do Meta é outro endereço (e é o que destrava as Lojas)

```
https://www.bookverse.com.br/feed-meta.xml     ← Meta (use este no catálogo)
https://www.bookverse.com.br/feed.xml          ← Google Shopping (não mexer)
```

Mesmo catálogo, **um campo de diferença**: o feed do Meta manda também
`quantity_to_sell_on_facebook` — quantas unidades ainda dá para vender. Sem ele,
o Meta importa o produto mas o marca como **"Quantidade não informada"** e o
deixa **fora das Lojas e dos anúncios** ("Esse item foi marcado como disponível,
mas a quantidade para venda é 0 ou não foi fornecida"). Com o catálogo inteiro
nessa situação, ele não atende aos requisitos para virar Loja.

Esse campo **não existe no padrão do Google**, e é por isso que os feeds são
separados: o `/feed.xml` continua exatamente como o Google Merchant Center
sempre leu.

### O selo "Poucas unidades" na Loja

O Meta coloca esse selo sozinho quando a quantidade informada é baixa, e **não
existe botão no painel dele para desligar**. Como quase todo livro daqui é cópia
única, o selo aparecia em *todos* os produtos.

Por isso o feed do Meta nunca informa menos que **25 unidades**
(`QUANTIDADE_MINIMA_META`, no topo do `functions/api/feed.js`). Esse número não
aparece para ninguém: serve só para o Meta entender que o produto está
disponível, sem tratar como "acabando".

Não há risco de vender o que não existe — quem manda no estoque é o site: livro
vendido **sai do feed**, a página `/finalizar` confere a disponibilidade e o
checkout valida de novo antes de fechar o pedido.

> Quer o selo de volta? Troque `QUANTIDADE_MINIMA_META` por `1`: o feed volta a
> informar a quantidade real de cada livro. (Para uma loja de usados, o selo é
> verdadeiro e costuma até ajudar a vender — a escolha é sua.)

### Já cadastrou o catálogo com o `/feed.xml`? Troque a URL

*Gerenciador de Comércio → **Fontes de dados** → seu feed → aba
**Configurações** → editar a URL do arquivo de dados* → troque para
`https://www.bookverse.com.br/feed-meta.xml` → **Recarregar arquivo de dados**.

Em poucos minutos o aviso de "Quantidade não informada" deve zerar.

---

## Se o catálogo aparecer **cinza** na hora de criar a Loja

Mensagem: *"Não é possível selecionar esse(a) Catálogo porque não atende aos
nossos requisitos para lojas."*

O "Saiba mais" dessa mensagem leva ao artigo **"Sobre as mudanças nas Lojas e no
checkout do Facebook e Instagram"**, que é o aviso geral da mudança — **não é**
o motivo do bloqueio. Como a URL de finalização só pode ser cadastrada depois
que a Loja existe (veja a seção acima), o que trava aqui é um **requisito de
elegibilidade do catálogo**. Confira um por um — basta um falhar:

| Requisito | Onde conferir |
|---|---|
| O catálogo é do tipo **e-commerce** (produtos físicos), não hotel/voo/veículo | Gerenciador de Comércio → Catálogo → Configurações |
| O catálogo **não está sendo usado por outra Loja** | se você já tentou criar uma Loja antes, apague a antiga primeiro |
| O **portfólio de negócios é dono** do catálogo e você é **administrador** | Configurações do Negócio → Contas → Catálogos → *Atribuir/assumir propriedade* |
| O catálogo tem **pelo menos 1 item que pode ser exibido em Lojas** | Gerenciador de Comércio → Catálogo → **Problemas / Qualidade**. ⭐ Se aparecer *"Quantidade não informada"*, é o feed errado — use o `/feed-meta.xml` (seção acima) |
| Os **links dos produtos** usam um **domínio verificado** | Configurações do Negócio → **Segurança da marca → Domínios** — precisa ter `bookverse.com.br` **verificado** (a meta tag já está no `index.html`) |
| O negócio está em um **país compatível** com Lojas | Brasil é compatível |

> ⚠️ O ponto mais provável depois da URL é o **domínio**: os links do feed saem
> como `https://www.bookverse.com.br/?livro=...`. Se o domínio verificado no
> Meta estiver cadastrado **sem o `www`** (ou vice-versa), ele pode não bater.
> Verifique **as duas formas** em Segurança da marca → Domínios.

Se depois disso ainda travar, clique em **"Ver catálogo"** na própria mensagem:
a aba **Problemas** diz, item por item, o que o Meta recusou — e aí dá para
agir no ponto certo em vez de adivinhar.

### O atalho: criar um catálogo novo pelo próprio fluxo da Loja

Na mesma tela de "Selecionar catálogo", a opção de baixo (**criar um catálogo
novo**) continua disponível. Criar o catálogo *por dentro do fluxo da Loja*
resolve de uma vez os três motivos mais comuns do bloqueio: o catálogo nasce do
**tipo certo** (e-commerce), com o **portfólio de negócios como dono**, e sem
estar preso a nenhuma outra Loja.

Depois de criar, é só apontar a mesma fonte de dados:

```
Adicionar itens → Feed de dados → Usar URL
https://www.bookverse.com.br/feed-meta.xml   (atualização diária)
```

O que muda: o catálogo antigo continua existindo (os anúncios que já usam ele
seguem funcionando). Vale repontar o **Instagram Shopping** e o **catálogo do
WhatsApp** para o catálogo novo, senão a marcação de produtos continua olhando
para o antigo.

> ℹ️ O feed separado do Meta (`/feed-meta.xml`) resolve os campos que só o Meta
> usa — foi assim que a quantidade entrou sem encostar no Google. O que ele
> **não** carrega é a **URL de finalização**: ela não é campo de feed (não
> existe `checkout_url` na especificação de produtos do Meta), é configuração da
> Loja, no caminho do começo deste guia.

---

## Como testar você mesmo, agora

Cole no navegador, trocando os ids por dois livros que estejam à venda (o id é o
`g:id` que aparece em <https://www.bookverse.com.br/feed.xml>):

```
https://www.bookverse.com.br/finalizar?products=quem-pensa-enriquece-napoleon-hill:1,os-segredos-da-mente-milionaria-t-harv-eker:2
```

Deve aparecer o carrinho com **1 unidade** do primeiro livro e **2 unidades** do
segundo, o subtotal e o caminho para o pagamento. (Peça uma quantidade que você
realmente tem em estoque; se pedir mais, a página ajusta e avisa — que é
justamente o comportamento correto.)

### O formato que o Meta usa

| Parâmetro | Formato | Exemplo |
|---|---|---|
| `products` | `id:quantidade`, vários separados por vírgula | `products=livro-a:1,livro-b:2` |
| `coupon` | ignorado (a loja não usa cupom) | `coupon=BOOK10` — não muda nada |

A página é **tolerante de propósito**: também entende `product`, `items`,
`produtos`, ponto e vírgula no lugar da vírgula, id repetido (soma as
quantidades) e id sem quantidade (vira 1). Se o Meta mandar um espaço reservado
que ele não substituiu (`{products}`), a página não quebra — mostra um convite
para a estante.

---

## O que acontece com o cliente que chega por esse link

1. **Monta o carrinho** com os livros do link (o carrinho antigo do site é
   substituído, como o Meta exige — e o cliente é avisado disso).
2. **Confere o estoque de verdade** (reservados e vendidos) e avisa item por
   item: *"esse exemplar acabou de ser vendido"*, *"sobrou 1 unidade, ajustamos
   a quantidade"*. Como a loja é de usados com cópia única, isso acontece de vez
   em quando — e agora é explicado, em vez de dar erro.
3. **Pede a conta**, porque a BookVerse só fecha pedido com cliente logado
   (`pedidos.exigirConta` no `js/config.js`). O carrinho **não se perde**: fica
   guardado na própria URL, então o cliente entra com o Google ali mesmo, ou
   conclui o cadastro, e volta direto para o carrinho montado.
4. **Segue para o checkout normal** (Pix ou dinheiro na entrega). Quando tudo já
   está certo — logado, cadastro completo e nada mudou no estoque — a página
   avança sozinha para o pagamento.

### Se o cliente abrir dentro do app do Instagram

O login do Google costuma ser **recusado pelo navegador embutido** do
Instagram/Facebook (é uma regra do Google, não do site). A página detecta isso e
mostra um aviso ensinando a tocar em **⋯ → "Abrir no navegador"**, com um botão
de **copiar o link do carrinho**. O carrinho continua o mesmo no navegador de
fora, porque ele viaja dentro da URL.

---

## Isso mexe no Google Shopping?

**Não.** O endereço `/feed.xml` continua produzindo **exatamente o mesmo XML de
antes** — os mesmos campos, os mesmos ids, os mesmos links de produto que o
Google Merchant Center já lê. O campo novo (`quantity_to_sell_on_facebook`) sai
**só** em `/feed-meta.xml`; foi para isso que os dois endereços foram separados,
e existe um teste que compara as duas saídas para garantir que a do Google não
mudou. A URL de finalização, por sua vez, é configuração **dentro do painel do
Meta** — nem passa pelo feed.

A página nova é `noindex` e está bloqueada no `robots.txt`, então também não
concorre com o site nos resultados de busca.

---

## Onde isso vive no código

| Arquivo | O que faz |
|---|---|
| `functions/api/feed.js` | gera os dois feeds (`/feed.xml` e `/feed-meta.xml`) |
| `finalizar.html` | a página que o Meta abre |
| `js/finalizar.js` | lê a URL, acha os livros, confere estoque, monta o carrinho |
| `firebase.json` | faz `/finalizar` servir o `finalizar.html` |
| `js/checkout.js` | leva a origem para o e-mail e para o histórico do pedido |
| `js/conta.js` | mostra o selo de origem em "Pedidos da loja" |

Um detalhe importante que já está resolvido: o feed **encurta ids com mais de 50
caracteres** (limite do Google, que o Meta herda ao ler o mesmo feed). A página
reconhece as duas formas — o id completo e o encurtado —, então livros de título
longo funcionam igual.

---

## Se algo der errado

| Sintoma | O que olhar |
|---|---|
| O Meta diz que a URL não carregou os produtos | Confirme que a opção *"aceita parâmetros de produto e cupom"* está marcada e teste o link do exemplo acima no navegador. |
| Abre a página dizendo que os livros não estão mais no catálogo | O feed do Meta está velho: em *Fontes de dados*, clique em **Recarregar arquivo de dados**. |
| Os itens aparecem como **"Quantidade não informada"** | O catálogo está apontando para o `/feed.xml`. Troque para `/feed-meta.xml` (seção "O feed do Meta é outro endereço"). |
| O cliente diz que o login não abre | Ele está no navegador do Instagram — o aviso na tela ensina a abrir no Chrome/Safari. |
| Quer permitir compra sem conta | `js/config.js` → `pedidos.exigirConta: false`. A página passa a ir direto para o pagamento. |

*Guia criado em 26/07/2026.*
