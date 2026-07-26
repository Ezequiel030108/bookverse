# 🛒 URL de finalização de compra do Meta (aprovar o catálogo e abrir a Loja)

Este guia resolve **um problema específico**: o catálogo do Meta não é aprovado
para virar Loja (Instagram Shopping / Facebook Shop) enquanto você não informar
uma **URL de finalização de compra** — o endereço para onde o Meta manda o
cliente com os produtos que ele escolheu.

> **Resumo em uma linha:** o site já tem essa URL pronta —
> `https://www.bookverse.com.br/finalizar` — é só colar no Gerenciador de
> Comércio e marcar que ela aceita parâmetros de produto e cupom.

---

## Por que o Meta pede isso

O Meta **encerrou o checkout dentro do Facebook/Instagram**. Hoje, quem vende
por lá precisa mandar o cliente para o próprio site, e o Meta exige que esse
endereço saiba **receber o carrinho pela URL** — senão o cliente chegaria ao seu
site com o carrinho vazio e a venda se perderia. É exatamente por isso que o
catálogo fica travado na revisão.

---

## O que você faz (uma vez, ~2 minutos)

1. Abra o **Gerenciador de Comércio** → sua **Loja** → *Configurações →
   Finalização da compra* (ou *Método de checkout*).
2. Escolha **"Finalizar a compra em outro site"**.
3. No campo da URL, cole exatamente:

   ```
   https://www.bookverse.com.br/finalizar
   ```

4. **Marque a opção** que diz algo como *"Minha URL aceita parâmetros de produto
   e cupom (opcional)"* (em inglês: *"My URL will support product and coupon
   parameters"*). Isso é o que faz o Meta enviar o carrinho junto do link.
5. O Meta vai **testar com 2 produtos**. Deve abrir a página *"Seu carrinho está
   pronto"* com os dois livros e o subtotal. Salve e mande o catálogo para
   revisão.

---

## Como testar você mesmo, agora

Cole no navegador, trocando os ids por dois livros que estejam à venda (o id é o
`g:id` que aparece em <https://www.bookverse.com.br/feed.xml>):

```
https://www.bookverse.com.br/finalizar?products=quem-pensa-enriquece-napoleon-hill:1,os-segredos-da-mente-milionaria-t-harv-eker:2&coupon=TESTE10
```

Deve aparecer o carrinho com **1 unidade** do primeiro livro e **2 unidades** do
segundo, o subtotal e o caminho para o pagamento. (Peça uma quantidade que você
realmente tem em estoque; se pedir mais, a página ajusta e avisa — que é
justamente o comportamento correto.)

### O formato que o Meta usa

| Parâmetro | Formato | Exemplo |
|---|---|---|
| `products` | `id:quantidade`, vários separados por vírgula | `products=livro-a:1,livro-b:2` |
| `coupon` | código do cupom (opcional) | `coupon=BOOK10` |

A página é **tolerante de propósito**: também entende `product`, `items`,
`produtos`, `cupom`, `promo_code`, ponto e vírgula no lugar da vírgula, id
repetido (soma as quantidades) e id sem quantidade (vira 1). Se o Meta mandar um
espaço reservado que ele não substituiu (`{products}`), a página não quebra —
mostra um convite para a estante.

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

## Cupons

A BookVerse não tem sistema de cupom (os descontos da promoção são automáticos).
Se o Meta enviar um `coupon`, o site:

- **mostra** o código para o cliente, deixando claro que os descontos já estão
  nos preços e que a loja confirma qualquer desconto extra antes da entrega;
- **registra** o código no pedido — ele aparece no **e-mail do pedido** e como
  selo no painel **"Pedidos da loja"**, junto com o selo
  **"Instagram / Facebook"** que marca a origem da venda.

Ou seja: nada é prometido ao cliente automaticamente, e você não perde a
informação.

---

## Isso mexe no Google Shopping?

**Não.** O feed `/feed.xml` (`functions/api/feed.js`) **não foi alterado** — os
mesmos campos, os mesmos ids, os mesmos links de produto que o Google Merchant
Center já lê. A URL de finalização é uma configuração que vive **dentro do
painel do Meta**, não no feed. O Google continua exatamente como estava.

A página nova é `noindex` e está bloqueada no `robots.txt`, então também não
concorre com o site nos resultados de busca.

---

## Onde isso vive no código

| Arquivo | O que faz |
|---|---|
| `finalizar.html` | a página que o Meta abre |
| `js/finalizar.js` | lê a URL, acha os livros, confere estoque, monta o carrinho |
| `firebase.json` | faz `/finalizar` servir o `finalizar.html` |
| `js/checkout.js` | leva cupom e origem para o e-mail e para o histórico do pedido |
| `js/conta.js` | mostra os selos de origem/cupom em "Pedidos da loja" |

Um detalhe importante que já está resolvido: o feed **encurta ids com mais de 50
caracteres** (limite do Google, que o Meta herda ao ler o mesmo feed). A página
reconhece as duas formas — o id completo e o encurtado —, então livros de título
longo funcionam igual.

---

## Se algo der errado

| Sintoma | O que olhar |
|---|---|
| O Meta diz que a URL não carregou os produtos | Confirme que a opção *"aceita parâmetros de produto e cupom"* está marcada e teste o link do exemplo acima no navegador. |
| Abre a página dizendo que os livros não estão mais no catálogo | O feed do Meta está velho: no Gerenciador de Comércio, force a atualização do feed (`https://www.bookverse.com.br/feed.xml`). |
| O cliente diz que o login não abre | Ele está no navegador do Instagram — o aviso na tela ensina a abrir no Chrome/Safari. |
| Quer permitir compra sem conta | `js/config.js` → `pedidos.exigirConta: false`. A página passa a ir direto para o pagamento. |

*Guia criado em 26/07/2026.*
