# 📊 Métricas e Google Ads — passo a passo

Este guia liga a BookVerse ao **Google Analytics** (para ver quantas
pessoas visitam, quais livros mais atraem, onde o cliente desiste da compra)
e ao **Google Ads** (para medir conversões e criar públicos de remarketing).

> **O código já está pronto.** O site já sabe enviar os eventos certos
> (visita, livro visto, adicionar ao carrinho, início de checkout e compra).
> Só faltam os **IDs** — que você pega nos painéis do Google e cola no
> arquivo `js/config.js`, no bloco `analytics`. Enquanto os IDs ficarem
> vazios, tudo continua **desligado** e o site funciona normal (nada do
> Google é carregado).

---

## Parte 1 — Ligar o Google Analytics (métricas)

O seu site já usa o Firebase (projeto **bookverse-69878**). O Google
Analytics é gratuito e vem junto do Firebase.

1. Abra o **Firebase Console**: <https://console.firebase.google.com> e
   entre no projeto **bookverse-69878**.
2. Clique na **engrenagem ⚙** (canto superior esquerdo) →
   **Configurações do projeto** → aba **Integrações**.
3. No cartão **Google Analytics**, clique em **Ativar** (ou **Gerenciar**,
   se já estiver ativo) e siga o assistente. Ele cria uma **propriedade do
   Google Analytics 4 (GA4)** ligada ao seu projeto.
4. Agora pegue o **ID da métrica** (Measurement ID). Ele tem o formato
   **`G-XXXXXXXXXX`**. Você o encontra em qualquer um destes caminhos:
   - **Firebase** → engrenagem ⚙ → *Configurações do projeto* → aba
     **Integrações** → *Google Analytics* → **Ver no Google Analytics**; ou
   - **Google Analytics** (<https://analytics.google.com>) →
     **Administrador** (engrenagem, canto inferior) → coluna *Propriedade* →
     **Fluxos de dados** → clique no fluxo do site → copie o
     **ID da métrica** que aparece no topo (`G-…`).

---

## Parte 2 — Colar o ID no site

Abra o arquivo **`js/config.js`** e encontre o bloco `analytics`. Cole o
seu ID entre as aspas do `measurementId`:

```js
analytics: {
  measurementId: "G-XXXXXXXXXX",   // <- cole aqui o SEU ID (G-…)
  googleAdsId: "",
  conversaoCompraLabel: ""
},
```

Salve, faça o commit e o push. O deploy automático publica no Firebase
Hosting (veja `.github/workflows/firebase-hosting-merge.yml`). Pronto: em
poucos minutos o Google Analytics começa a receber as visitas.

> Esse `G-…` é **público por natureza** (fica no site, igual em qualquer
> loja que usa Analytics). Pode versionar sem medo.

---

## Parte 3 — Ver as métricas

No **Google Analytics** (<https://analytics.google.com>):

- **Relatórios → Tempo real**: veja quem está no site **agora**.
- **Relatórios → Ciclo de vida → Monetização → Compras de comércio
  eletrônico**: vendas, receita e livros mais comprados.
- **Relatórios → Engajamento → Eventos**: todos os eventos que o site
  envia (lista abaixo).

Os dados dos relatórios completos costumam levar de algumas horas até 24h
para aparecer na primeira vez. O **Tempo real** e o **DebugView** aparecem
na hora — use-os para testar (veja a Parte 6).

---

## Parte 4 — Ligar o Google Ads (conversões e remarketing)

Existem **dois caminhos**. O primeiro é o mais simples e o recomendado.

### Opção A — Vincular o Analytics ao Google Ads (recomendado)

Aqui você **não mexe mais no código**. O Analytics já coleta os eventos;
você só manda essas conversões para o Google Ads.

1. Tenha uma conta no **Google Ads** (<https://ads.google.com>).
2. No **Google Analytics** → **Administrador** → coluna *Propriedade* →
   **Vinculações de produtos** → **Google Ads** → **Vincular** e escolha a
   sua conta do Google Ads.
3. Ainda no Analytics → **Administrador** → **Eventos principais**
   (*Key events*): marque o evento **`purchase`** (compra) como conversão.
   Você também pode marcar `begin_checkout` e `add_to_cart` se quiser
   otimizar campanhas para essas etapas.
4. No **Google Ads** → **Metas → Conversões → Resumo** → **+ Nova ação de
   conversão** → **Importar** → **Propriedades do Google Analytics 4** →
   selecione o evento **`purchase`** e importe.

Feito isso, o Google Ads passa a contar cada compra como conversão (com o
valor do pedido), e você pode criar **públicos de remarketing** (ex.:
"quem adicionou ao carrinho e não comprou") direto no Analytics/Ads. Deixe
`googleAdsId` e `conversaoCompraLabel` **vazios** no `config.js` — a Opção A
não precisa deles.

### Opção B — Tag de conversão direto no site

Use esta opção se você **não** quiser depender do Analytics para as
conversões (ou se quiser a tag do Ads disparando na hora exata da compra).

1. No **Google Ads** → **Metas → Conversões → + Nova ação de conversão** →
   **Site**. Crie uma ação chamada, por exemplo, *Compra*, com valor
   **"Usar valores diferentes para cada conversão"**.
2. Ao final, o Google mostra o *snippet* da tag. Você precisa de dois
   pedaços:
   - o **ID de conversão**, no formato **`AW-XXXXXXXXXX`**;
   - o **rótulo de conversão** (*conversion label*), um código como
     `AbCdEfGhIj`. Juntos eles formam **`AW-XXXXXXXXXX/AbCdEfGhIj`**.
3. Cole no `js/config.js`:

```js
analytics: {
  measurementId: "G-XXXXXXXXXX",
  googleAdsId: "AW-XXXXXXXXXX",                     // ID de conversão do Ads
  conversaoCompraLabel: "AW-XXXXXXXXXX/AbCdEfGhIj"  // ID + rótulo da COMPRA
},
```

Quando o cliente conclui um pedido, o site dispara a conversão de compra no
Google Ads **com o valor do pedido** automaticamente.

> Você pode usar **as duas** opções ao mesmo tempo, mas então marque a
> conversão importada do Analytics como **secundária** (no Google Ads) para
> não contar a mesma venda duas vezes.

---

## Parte 5 — O que o site já mede (eventos)

O site envia estes eventos padrão de e-commerce (o Google Analytics e o
Google Ads entendem todos, com nome, autor, gênero, preço e quantidade):

| Evento           | Quando acontece                                    |
|------------------|----------------------------------------------------|
| `page_view`      | Cada página aberta (automático)                    |
| `view_item`      | Cliente abre a ficha de um livro                   |
| `search`         | Cliente pesquisa (dispara quando ele para de digitar) |
| `add_to_cart`    | Cliente adiciona um livro ao carrinho              |
| `begin_checkout` | Cliente entra no checkout com itens                |
| `purchase`       | Pedido concluído — com código, total e itens       |
| `generate_lead`  | Cliente clica para falar no WhatsApp/Instagram Direct |

O código-fonte dessa parte fica em **`js/analytics.js`** (você não precisa
mexer nele).

---

## Parte 6 — Como testar se está funcionando

1. Publique o site com o `measurementId` preenchido.
2. Abra o site e navegue: veja um livro, adicione ao carrinho, entre no
   checkout.
3. No **Google Analytics** → **Administrador → DebugView** (ou
   **Relatórios → Tempo real**): você deve ver os eventos chegando em
   segundos (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`).
4. Para o **Google Ads**, instale a extensão **Google Tag Assistant**
   (<https://tagassistant.google.com>) e confira se a tag `AW-…` dispara na
   página de confirmação do pedido.

> Se você usa bloqueador de anúncios no navegador, ele pode esconder os
> eventos no seu próprio teste. Teste numa aba anônima sem bloqueador.

---

## Parte 7 — Máximo de informação para o Google Ads

Recursos extras já prontos no código para entregar o máximo de dados ao
Google Ads. As partes de painel são feitas no site do Google Ads/Analytics.

### 7.1 Conversões otimizadas (enhanced conversions) — já ligado no código
Na compra, o site envia **e-mail, telefone e nome** do cliente junto com a
conversão. O próprio gtag **criptografa (hash SHA-256)** esses dados no
navegador — o Google recebe só o hash, nunca o dado em texto puro. Isso faz
o Google **casar muito mais vendas** com os cliques nos anúncios.

No painel, confirme que está ativo: **Google Ads → Metas → Conversões →
Configurações → Conversões otimizadas** → ativado, com método **Tag do
Google (gtag.js)**, e aceite os termos de dados do cliente.

> ⚠️ **Privacidade (LGPD):** como dados do cliente (com hash) são enviados
> ao Google para medição, informe isso na sua **política de privacidade**.

### 7.2 Funil como conversões secundárias
O site envia `add_to_cart` e `begin_checkout`. Importe-os no Google Ads como
conversões **secundárias** (só observação, não atrapalham a otimização da
compra): **Google Ads → Metas → Conversões → + Nova ação de conversão →
Importar → Google Analytics 4 → Web** → selecione os eventos → depois marque
cada um como **Secundária**. (Eles só aparecem depois que acontecerem no
site — basta navegar/adicionar ao carrinho para gerá-los.)

### 7.3 Lead de contato (WhatsApp/Instagram)
O site já dispara `generate_lead` quando o cliente clica para falar no
WhatsApp/Instagram Direct. Para contar isso como conversão no Google Ads:
crie uma ação de conversão (categoria **Contato**, contagem **Uma**, marcada
como **Secundária**), pegue o `send_to` dela (`AW-…/rótulo`) e cole no
`conversaoContatoLabel` do `js/config.js`.

### 7.4 Públicos de remarketing
Com o vínculo GA4 ↔ Google Ads, os eventos acima já alimentam públicos.
Crie públicos em **Google Analytics → Administrador → Públicos-alvo**, por
exemplo **"adicionou ao carrinho e não comprou"** (inclui `add_to_cart`,
exclui `purchase`). Eles ficam disponíveis no Google Ads automaticamente.

---

### Resumo rápido

1. Firebase → ative o Google Analytics → copie o `G-…`.
2. Cole em `js/config.js` (`measurementId`) → commit → push.
3. Analytics → vincule ao Google Ads → importe a conversão `purchase`
   (Opção A). Só use `googleAdsId`/`conversaoCompraLabel` se preferir a
   Opção B.
4. Teste no **Tempo real** / **DebugView**.
