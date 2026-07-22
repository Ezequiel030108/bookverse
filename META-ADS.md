# 📣 Entrando no Meta Ads (Instagram + Facebook + WhatsApp) — BookVerse

**Cenário:** loja local de Juazeirinho/PB, público jovem forte (mangá!), já com
**Instagram** (@mybookverse.pb) e **WhatsApp Business**. O Meta é **geração de
demanda** — mostra o anúncio pra quem **não** está procurando — o par perfeito da
campanha de Display que já roda no Google. Pra loja local com público jovem,
costuma **render tanto quanto ou mais** que o Google.

> Ordem recomendada: **1) Contas → 2) Pixel → 3) Catálogo → 4) 1ª campanha.**
> As partes 2 e 3 (técnicas) já estão **prontas no código** — você só ativa.

---

## Parte 1 — Contas (a fundação) · grátis

1. **Instagram → conta Profissional**
   No app do Instagram: *Configurações → Conta → Mudar para conta profissional
   → Empresa*. Categoria: **Livraria**.
2. **Página no Facebook**
   O Meta exige uma Página pra rodar anúncios (mesmo que você só queira anunciar
   no Instagram). Crie uma Página **BookVerse** (facebook.com/pages/create),
   categoria Livraria, e **conecte ao Instagram**.
3. **Meta Business Suite** (o "painel de negócio")
   Em <https://business.facebook.com> → criar **portfólio de negócio** BookVerse.
   Adicione a Página e a conta do Instagram.
4. **Conta de anúncios + pagamento**
   Dentro do Business Suite: *Configurações → Contas de anúncios → Criar* e
   cadastre um cartão.
5. **Conectar o WhatsApp Business**
   No Business Suite: *Configurações → Contas do WhatsApp* → conectar o número
   `5514982241492`. É isso que destrava os anúncios **Click-to-WhatsApp**.

---

## Parte 2 — Meta Pixel (medição + remarketing) · JÁ PRONTO no código

O Pixel é o "sensor" que mede visitas, produtos vistos e compras no site, e monta
o público de remarketing. **Já deixei ele instalado** — só falta ligar com o seu ID:

1. No Business Suite: *Gerenciador de Eventos → Conectar fontes de dados → Web →
   criar Pixel*. Copie o **ID do Pixel** (só números).
2. Cole no arquivo **`js/config.js`**, no bloco `analytics`:
   ```js
   metaPixelId: "COLE_O_ID_AQUI"
   ```
3. Publique o site. Pronto — o site passa a enviar automaticamente estes eventos:

   | Ação no site | Evento no Meta |
   |---|---|
   | Abrir o site / qualquer página | `PageView` |
   | Abrir um livro | `ViewContent` |
   | Adicionar ao carrinho | `AddToCart` |
   | Pesquisar | `Search` |
   | Começar o checkout | `InitiateCheckout` |
   | Clicar pra falar no WhatsApp/Instagram | `Lead` |
   | Concluir a compra | `Purchase` (com valor) |

   > Enquanto o campo ficar vazio, o Meta fica **desligado** e o site funciona
   > normal (nada do Meta é carregado). Teste com a extensão **Meta Pixel Helper**
   > no Chrome depois de publicar.

---

## Parte 3 — Catálogo (livros no Instagram Shopping e no WhatsApp) · JÁ PRONTO

Você **já tem um feed de produtos** dinâmico (o mesmo do Google Shopping), que se
atualiza sozinho quando você mexe em `js/livros.js`:

```
https://www.bookverse.com.br/feed.xml
```

O Meta lê feeds nesse formato. Então **não precisa gerar nada** — é só apontar:

1. Business Suite → **Gerenciador de Comércio (Commerce Manager) → Criar catálogo
   → tipo "E-commerce"**.
2. *Adicionar itens → Feed de dados → Usar URL* → cole
   `https://www.bookverse.com.br/feed.xml` → agendar atualização **diária**.
3. **Conectar o catálogo** à Página, ao Instagram e ao Pixel.
4. Ativar o **Instagram Shopping** (*Configurações do Instagram → Compras* — passa
   por uma revisão do Meta) e o **catálogo do WhatsApp** (WhatsApp Business →
   Ferramentas da empresa → Catálogo → conectar ao catálogo do Meta).

Resultado: dá pra **marcar os livros** nos posts/stories, o cliente vê preço e
"Ver no site", e o catálogo aparece direto na conversa do WhatsApp. E destrava os
**anúncios dinâmicos de produto** (Advantage+ Catálogo) mais pra frente.

---

## Parte 4 — A 1ª campanha

Mesma disciplina do Google: **começar simples, cidade só, verba pequena, aprender
com dados**. Duas frentes que combinam:

### A) Mensagens no WhatsApp (o formato-ouro pra loja local)
- **Objetivo:** *Engajamento → Mensagens → WhatsApp* (o clique abre sua conversa).
- Por quê: barato, direto e você **fecha a venda conversando** — do jeito que já
  funciona hoje. Perfeito com o WhatsApp Business que você já tem.

### B) Reconhecimento/Tráfego no Instagram (as capas cósmicas)
- **Objetivo:** *Tráfego* (leva pro site) ou *Reconhecimento* (alcance).
- Usa os criativos que a gente montou, no formato do Instagram.

**Segmentação (nas duas):**
- **Local:** Juazeirinho + raio (~15–20 km). Cidade pequena → às vezes o melhor é
  deixar o **público amplo** (só geo + idade) e o Meta acha os interessados sozinho.
- **Idade:** ~16–40. **Interesses (opcional):** livros, leitura, mangá, anime,
  Berserk, autores. Não aperte demais — a cidade já é pequena.
- **Posicionamentos:** deixe **Advantage+ (automático)** — Feed, Stories e Reels.

**Orçamento (honesto):** o mínimo do Meta é ~**R$6/dia por conjunto**. Comece com
**R$5–10/dia** numa frente só, rode 1–2 semanas, veja o que traz conversa/clique,
e aí escale. (É um pouco mais que os R$50/mês do Google, mas numa cidade pequena
compra bastante alcance.)

**Criativos:** eu gero os banners cósmicos em **1:1 (feed)** e **9:16
(stories/reels)** — é só pedir.

---

## Parte 5 — Rotina e evolução

- **Semana 1–2:** ver quantas **conversas no WhatsApp** e cliques cada anúncio
  trouxe. Cortar o que não anda, reforçar o que anda.
- **Com o Pixel populado (~algumas centenas de visitas):** criar o público de
  **remarketing** ("visitou/adicionou ao carrinho e não comprou") e rodar
  **anúncios de catálogo** reimpactando com a capa exata que a pessoa viu.
- **Datas que vendem livro:** Dia dos Pais/Estudante (ago), Black Friday (nov),
  **Natal (dez — o melhor mês)**, volta às aulas (jan/fev), Dia do Livro (abr),
  Dia dos Namorados (jun) — reforçar verba nessas.
- **Integração:** todo visitante do site (dos anúncios do Google **e** do Meta)
  entra nos dois públicos de remarketing — os canais se retroalimentam.

*Guia criado em 22/07/2026. Pixel e feed já prontos no código; contas e campanha
são configuração no painel do Meta.*
