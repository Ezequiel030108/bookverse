# 📣 Guia de Meta Ads para a BookVerse

Este guia explica, passo a passo e **sem enrolação**, como usar os anúncios do
**Meta Ads** (Facebook + Instagram) para divulgar o site da BookVerse e vender
mais livros. Foi escrito pensando **no seu caso específico**, não em uma loja
qualquer. Você **não precisa saber programar** para seguir a maior parte dele.

> 🎯 **Resumo em uma frase:** como a BookVerse entrega **só em Juazeirinho** e
> vive no **Instagram (@mybookverse.pb)**, o segredo NÃO é gastar muito — é
> mirar num raio pequeno, com pouco dinheiro por dia, mostrando fotos reais dos
> livros e mandando a pessoa pro **site** ou pro **Direct**.

---

## 🧭 Primeiro, entenda a realidade do seu caso

Antes de gastar 1 centavo, três verdades que mudam tudo:

1. **Você é uma loja HIPERLOCAL.** A entrega é "a domicílio (somente em
   Juazeirinho)" ou "combinar entrega" (ótimo pra quem estuda na ECIT Deputado
   Genival Matias). Anunciar pra "Brasil" ou "Paraíba inteira" é **queimar
   dinheiro**: a pessoa vê o anúncio, se interessa, mas não pode comprar porque
   você não entrega lá. Regra de ouro: **só anuncie para quem você consegue
   atender.**

2. **Público pequeno é uma vantagem, não um problema.** Juazeirinho tem poucos
   milhares de habitantes. Com **R$ 5 a R$ 15 por dia** você consegue aparecer
   para uma boa fatia da cidade em poucos dias — várias vezes. Repetição é o que
   fixa a marca "BookVerse" na cabeça das pessoas.

3. **Seu maior ativo é o Instagram.** O anúncio é o "empurrãozinho" pago; o
   perfil `@mybookverse.pb` é a loja de verdade. Anúncio bom + perfil bonito e
   ativo = vendas. Anúncio bom + perfil vazio = dinheiro jogado fora.

> 💡 **Expectativa honesta:** Meta Ads para uma cidade pequena serve muito mais
> para **conhecimento de marca e visitas ao site** do que para "vendas em massa".
> O objetivo real é: *"todo mundo em Juazeirinho que gosta de ler já ouviu falar
> da BookVerse e já entrou no site."* Isso é totalmente alcançável.

---

## ✅ O que preparar ANTES de anunciar (checklist)

Nada aqui custa dinheiro. Faça na ordem:

- [ ] **Conta profissional no Instagram.** No app: *Configurações → Conta →
      Mudar para conta profissional → Empresa*. Sem isso você não consegue
      anunciar direito nem ver as métricas.
- [ ] **Página no Facebook da BookVerse.** Todo anúncio precisa estar ligado a
      uma Página. Crie uma simples (nome "BookVerse", cidade Juazeirinho, foto =
      a logo). Depois **conecte** o Instagram a ela.
- [ ] **Conta no Meta Business Suite / Gerenciador de Anúncios.** Acesse
      <https://business.facebook.com>. É o painel onde os anúncios são criados e
      medidos (bem mais completo que o botão "Impulsionar").
- [ ] **Link do site à mão.** É o endereço da Vercel (ex.:
      `https://seu-site.vercel.app`). É pra ele que o anúncio vai mandar as
      pessoas.
- [ ] **3 a 5 fotos boas** de capas de livros (ou do "cantinho" onde vocês
      organizam os livros) e, se der, **1 vídeo curtinho** (Reels) folheando um
      livro. Isso é o combustível dos anúncios.
- [ ] **Forma de pagar o anúncio:** cartão ou, em muitos casos, **Pix** — o
      próprio Meta já aceita Pix para pagar campanhas no Brasil.

> 📌 Dica: preencha o campo `whatsapp` no `js/config.js` se quiserem receber
> comprovante/atendimento por lá também. Hoje ele está vazio — o contato está
> só pelo Instagram Direct, o que já funciona, mas WhatsApp costuma converter
> ainda melhor em cidade pequena.

---

## 📈 (Opcional, mas MUITO recomendado) Instalar o Meta Pixel no site

O **Pixel** é um código invisível que fica no site e conta pro Meta o que as
pessoas fazem: *"entrou no site", "colocou no carrinho", "gerou o Pix"*. Sem ele,
você anuncia **no escuro** — sabe quantos cliques teve, mas não sabe se alguém
comprou. Com ele, o Meta aprende sozinho a mostrar o anúncio pra quem tem mais
cara de comprador, e você vê o retorno de verdade.

Como o site é feito de arquivos HTML simples e está na Vercel, dá pra instalar
em poucos minutos:

1. No **Gerenciador de Anúncios** → *Gerenciador de Eventos* → **Conectar fonte
   de dados** → *Web* → **Meta Pixel** → dê um nome (ex.: "Pixel BookVerse") e
   copie o código que aparece (começa com `<!-- Meta Pixel Code -->`).
2. Cole esse código **antes do `</head>`** em cada página: `index.html`,
   `checkout.html` e `conta.html`.
3. (Avançado) Para medir "carrinho" e "compra" de verdade, dá pra disparar os
   eventos `AddToCart` e `Purchase` nos momentos certos do checkout.

> 🤝 **Eu (Claude) posso instalar o Pixel pra você.** Se quiser, é só me passar o
> **ID do Pixel** (um número que o Meta te dá) que eu adiciono o código nas três
> páginas e configuro os eventos de carrinho e de compra confirmada. Assim seus
> anúncios ficam "com visão", não no escuro.

---

## 🚀 Passo a passo: sua primeira campanha

Você tem **dois caminhos**. Comece pelo mais simples e evolua.

### Caminho A — "Impulsionar" um post (mais fácil, bom pra começar)

1. Publique no Instagram um **Reels ou foto muito bom** (uma novidade, uma
   promoção, um "chegaram livros novos").
2. Toque em **Impulsionar publicação**.
3. **Objetivo:** *Mais visitas ao site* (cole o link da Vercel) **ou** *Mais
   mensagens* (leva pro Direct).
4. **Público:** escolha **Local** → coloque **Juazeirinho** com o **menor raio
   possível**. Idade **13–40**. (Veja a seção de segmentação abaixo.)
5. **Orçamento:** comece com **R$ 6 a R$ 10 por dia**, por **4 a 7 dias**.
6. Confirme e pronto. Depois de uns dias, veja o que rendeu.

### Caminho B — Gerenciador de Anúncios (mais controle, recomendado depois)

1. Em <https://business.facebook.com>, clique em **Criar**.
2. **Objetivo da campanha** — escolha conforme sua meta:
   - **Tráfego** → mandar gente pro **site** (melhor pra mostrar o catálogo).
   - **Engajamento → Mensagens** → puxar conversa no **Direct/WhatsApp** (bom
     pra tirar dúvida e fechar venda na conversa).
   - **Vendas** → só quando o **Pixel** já estiver instalado e medindo compras.
   - **Reconhecimento** → só pra "aparecer" barato; use no começo pra
     apresentar a marca à cidade.
3. **Conjunto de anúncios** (é aqui que mora o segredo — veja abaixo):
   - **Local**, **público**, **orçamento** e **posicionamentos**.
4. **Anúncio**: escolha o formato (imagem única, **carrossel** de vários livros,
   ou **vídeo/Reels**) e escreva o texto + o botão ("Saiba mais" / "Comprar
   agora" / "Enviar mensagem").
5. Revise e publique.

---

## 🎯 Segmentação: a parte que mais faz diferença

Anúncio pra cidade pequena vive ou morre aqui.

### Localização (o mais importante)
- Tipo: **"Pessoas que moram neste local"** (não "que estiveram aqui").
- Cidade: **Juazeirinho, PB**. Se o Meta exigir um raio, use o **mínimo**
  (geralmente parte de ~17 km — no seu caso isso já cobre Juazeirinho e o entorno
  imediato; tudo bem, é gente que você consegue atender ou combinar entrega).
- ❌ **Nunca** deixe em "Brasil" ou "Paraíba" — é o erro nº 1 e o mais caro.

### Idade e gênero
- **13–40 anos** costuma ser o coração do público de livraria/leitura em cidade
  pequena (estudantes + jovens adultos). Ajuste com o tempo olhando as métricas.
- Deixe **todos os gêneros** no começo; refine depois.

### Interesses (detalhamento)
Como sua audiência já é pequena por causa da cidade, **não aperte demais** os
interesses — senão quase ninguém vê. Mas você pode testar públicos ligados ao
seu catálogo:
- **Leitura**, **Livros**, **Literatura**, **Amazon Kindle**, **Wattpad**,
  **Goodreads**.
- Por seção do site: **Mangás/Anime** (você tem a categoria "Mangás"),
  **Finanças pessoais**, **Desenvolvimento pessoal / autoajuda**, **Filosofia**,
  **Terror/Suspense**.
- Autores populares que você tenha (ex.: Paulo Coelho) também funcionam como
  interesse.

> 💡 **Estratégia dos "3 públicos":** crie 2–3 conjuntos de anúncio parecidos
> mudando só o interesse (um "leitura em geral", um "mangá/anime", um
> "autoajuda/finanças"). Coloque um orçamentinho em cada e, depois de uns dias,
> **coloque mais dinheiro no que vender mais barato**. Isso é o famoso "teste
> A/B" — deixa os próprios números decidirem.

### Posicionamentos (onde o anúncio aparece)
- Como seu negócio é **Instagram-first**, priorize: **Feed do Instagram**,
  **Stories do Instagram** e **Reels**. Pode deixar "posicionamentos
  automáticos" que o Meta otimiza, mas de olho pra maior parte cair no Instagram.

---

## 💰 Quanto gastar

- **Comece pequeno:** R$ 5 a R$ 10 por dia já movimenta numa cidade pequena.
- **Rode por pelo menos 4–7 dias** antes de julgar. Anúncio precisa de tempo
  pra "aprender" e a compra de livro costuma ter alguns dias de "namoro".
- **Regra prática:** não coloque num anúncio mais dinheiro por semana do que o
  lucro de alguns livros. Se cada livro lucra ~R$ 15–20, um teste de R$ 40–70 na
  semana é saudável.
- Escale só o que **funciona**: viu um anúncio trazendo visita/venda barata?
  Aumente o orçamento dele **aos poucos** (ex.: +20% a cada 2–3 dias). Aumentar
  de uma vez "assusta" o algoritmo e piora o custo.

---

## 🖼️ Ideias de anúncios que combinam com a BookVerse

Fotos e textos reais vendem muito mais que banner genérico. Sugestões:

1. **"Chegaram novidades esta semana 📚"** — carrossel com 4–6 capas novas
   (aproveite os livros marcados em *Novidades da Semana* no site). Botão:
   *Saiba mais* → site.
2. **Reels "unboxing"/folheando** — vídeo de 10–20s mostrando os livros na mão,
   preço na tela, "link na bio / arrasta pra cima". Reels tem o melhor alcance
   orgânico + pago hoje.
3. **"Semana do Mangá"** (ou de qualquer categoria) — foco numa seção do site.
   Público: interesse em anime/mangá. Ótimo pro público jovem da cidade.
4. **Prova social** — foto de cliente com o livro / print de elogio no Direct.
   Nada convence mais em cidade pequena do que "fulano comprou e gostou".
5. **Facilidade de comprar** — "Escolhe no site, paga no **Pix** na hora, a
   gente entrega em Juazeirinho 💜". Vender a **conveniência** (Pix + entrega
   local) é um diferencial forte de vocês.
6. **Preço/estado** — vocês têm seminovos em ótimo estado por preço bom. "Leia
   mais gastando menos" funciona demais com estudante.

**Sobre o texto (legenda) do anúncio:**
- Primeira linha tem que fisgar ("Você em Juazeirinho que ama ler 👇").
- Diga o que é, o preço/faixa e **o que fazer** ("toque em Saiba mais",
  "chama no Direct").
- Sempre deixe claro **"entregamos em Juazeirinho"** — evita gente de fora
  clicar à toa.

---

## 📊 O que olhar depois (e quando desligar um anúncio)

No painel, foque em poucos números:

| Métrica | O que é | O que quer |
|---|---|---|
| **Alcance** | quantas pessoas viram | quanto maior, melhor (na sua cidade) |
| **CPC** (custo por clique) | quanto custa cada clique no link | quanto **menor**, melhor |
| **CTR** | % de quem viu e clicou | acima de ~1% já é ok; muito baixo = criativo fraco |
| **Cliques no link** | quantos foram ao site | é o que interessa se o objetivo é Tráfego |
| **Conversas iniciadas** | mensagens no Direct | se o objetivo for Mensagens |
| **Compras** (se tiver Pixel) | vendas atribuídas | o número que realmente importa |

Regras simples de otimização:
- **CTR baixo / poucos cliques** → o problema é o **criativo** (foto/vídeo/texto).
  Troque a imagem antes de mexer em qualquer outra coisa.
- **Muitos cliques, mas ninguém compra** → o problema é o **site/oferta**
  (preço, foto da capa faltando, ou a pessoa não é da cidade). Reforce "entrega
  em Juazeirinho".
- **Achou um vencedor** → não mexa muito; só aumente o orçamento devagar.
- Deixe rodar **pelo menos 3–4 dias** antes de qualquer julgamento.

---

## 🚫 Erros que fazem você perder dinheiro (evite!)

1. **Anunciar pro Brasil/estado todo.** Você só entrega em Juazeirinho. Mire
   pequeno.
2. **Perfil do Instagram parado.** Anúncio traz visita; se o perfil está vazio
   ou sem responder Direct, a pessoa vai embora. Poste com constância.
3. **Trocar/desligar anúncio no 1º dia.** Dê tempo de "aprender".
4. **Aumentar o orçamento de uma vez** (ex.: de R$ 5 pra R$ 50). Escale de 20%
   em 20%.
5. **Foto ruim / capa faltando.** Livro sem capa no site converte mal. Preencha
   o campo `imagem` dos livros (veja o README, seção "🖼️ capa de um livro").
6. **Mandar pro site sem o link certo.** Confira que o link da Vercel abre e
   carrega rápido no celular.
7. **Anunciar sem o Pixel** (se puder instalar). Sem ele você não sabe o que deu
   venda — e o Meta otimiza pior.

---

## 🗓️ Um plano de 4 semanas pra começar

- **Semana 1 — Apresentar a marca.** Objetivo *Reconhecimento* ou *Tráfego*,
  R$ 5–8/dia, público amplo da cidade (leitura + livros). Meta: Juazeirinho
  inteira "descobrir" a BookVerse.
- **Semana 2 — Testar públicos.** 2–3 conjuntos (leitura / mangá / autoajuda),
  R$ 5/dia cada, objetivo *Tráfego*. Veja qual traz clique mais barato.
- **Semana 3 — Escalar o vencedor + Reels.** Coloque mais no público/criativo
  campeão e suba um **Reels** novo. Comece a rodar *Mensagens* se quiser fechar
  no Direct.
- **Semana 4 — Vender de verdade.** Com o Pixel instalado, teste o objetivo
  *Vendas* e uma oferta ("frete/entrega grátis em Juazeirinho", combo de 2
  livros, etc.).

Depois disso, é repetir o que funcionou e cortar o que não funcionou. Marketing
é isso: **testar barato, medir, repetir o que vende.**

---

## ❓ Precisa de ajuda técnica?

Algumas coisas deste guia envolvem mexer no código do site — e eu posso fazer
por você. É só pedir:

- **Instalar o Meta Pixel** nas páginas (`index.html`, `checkout.html`,
  `conta.html`) e disparar os eventos de **carrinho** e **compra** — só preciso
  do **ID do Pixel**.
- Adicionar **botão/link de WhatsApp** (hoje o campo `whatsapp` no
  `js/config.js` está vazio).
- Ajustar **títulos e descrição** do site (as `<meta>` tags) para o link ficar
  mais bonito quando compartilhado/anunciado.
- Criar uma **página/seção de promoção** para uma campanha específica.

Bons anúncios! 📚✨ — Time BookVerse
