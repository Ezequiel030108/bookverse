# 🔍 Varredura do projeto — melhorias e pendências

> ✅ **Atualização (08/07/2026):** a grande maioria dos itens abaixo já foi
> **aplicada no código** (escape de HTML/XSS, conferência de valor no webhook,
> proteção das APIs de IA, correção do estoque com quantidade, vazamento de
> listeners, Open Graph/SEO, compressão das capas, 404, manifest, ViaCEP,
> focus trap, unificação de preços, etc.). O que ainda depende de você:
> **colar as novas regras do Firestore** (README, seção do login) e conferir
> o domínio usado nas tags Open Graph (www.bookverse.com.br).

Relatório da revisão completa do site (vitrine, checkout, conta/admin, APIs na
Vercel e estrutura do repositório), feita em 08/07/2026. Itens ordenados por
prioridade: 🔴 crítico → ⚪ manutenção.

---

## 🔴 Segurança (resolver primeiro)

### 1. O valor do Pix é definido pelo navegador do cliente
`api/criar-pix.js` aceita o campo `valor` enviado pelo checkout e cria a
cobrança com ele. Qualquer pessoa com o DevTools aberto pode pagar **R$ 0,01**
por um pedido inteiro — o webhook confirma "✅ PAGO" e envia o e-mail com o
corpo montado pelo próprio cliente (que pode mostrar o total cheio).

**Como corrigir:**
- Ideal: o checkout envia só os **itens (id + quantidade)** e o servidor
  recalcula o total a partir de uma fonte confiável de preços (um JSON do
  catálogo acessível ao backend), criando a cobrança com o valor certo.
- Mitigação rápida: no `api/webhook-mp.js`, incluir no e-mail o
  `pagamento.transaction_amount` (o valor que **realmente caiu**) em destaque,
  para o lojista comparar com o total do pedido antes de entregar.

### 2. Risco de XSS armazenado pelo catálogo do admin
Título, autor, sinopse e o campo `imagem` dos livros entram no HTML por
interpolação direta (`innerHTML`) em `js/main.js` (cards, hero, modal parcial),
`js/loja.js` (drawer do carrinho) e `js/checkout.js` (resumo do pedido).
Para os livros de `js/livros.js` tudo bem (só o dono edita), mas os livros da
coleção **`catalogo` do Firestore** são carregados por qualquer visitante — e:

- As regras publicadas no README **nem citam** a coleção `catalogo` (nem a
  subcoleção usada pelo admin). Se a regra real for algo como
  `allow write: if request.auth != null`, **qualquer conta Google** pode gravar
  um "livro" com HTML malicioso que executa no navegador de todos os clientes.
- A checagem de admin (lista de e-mails em `js/config.js`) é **só visual, no
  front-end** — não impede escrita direta no Firestore.

**Como corrigir:**
1. Criar uma função `escapeHTML()` e usá-la em todos os pontos onde dados de
   livro entram em `innerHTML` (ou montar esses trechos com `textContent`).
2. Nas regras do Firestore, restringir a escrita em `catalogo` aos e-mails dos
   admins, ex.:
   ```
   match /catalogo/{livro} {
     allow read: if true;
     allow write: if request.auth != null &&
       request.auth.token.email in [
         "ezequielfigueiredoaraujobatist@gmail.com",
         "cauantista@gmail.com",
         "marialeticinha22@gmail.com",
         "oficialpaulo6@gmail.com"
       ];
   }
   ```
3. Documentar essas regras no README (hoje a seção de regras está incompleta).

### 3. Qualquer usuário logado pode "esvaziar" a loja
A regra sugerida no README para `disponibilidade` é
`allow write: if request.auth != null`. Ou seja: **qualquer conta Google**
pode marcar todos os livros como `vendido` e a vitrine inteira some.

**Como corrigir:** permitir que um usuário comum grave apenas
`estado == "reservado"` com o próprio `uid` (e um `ate` de no máximo 30 min);
`vendido` e exclusões só para os e-mails de admin (mesma lista do item 2).

### 4. Endpoints de IA abertos ao público
`/api/gerar-sinopse` e `/api/classificar-livro` não têm autenticação nem
rate-limit. Qualquer pessoa pode chamá-los em loop e **esgotar a cota do
Gemini ou gastar créditos da Anthropic**. Só o admin usa esses recursos —
exigir um Firebase ID token e validar no servidor que o e-mail é de admin
(ou, no mínimo, um segredo compartilhado + limite de chamadas por IP).

### 5. Assinatura do webhook opcional
`MP_WEBHOOK_SECRET` é opcional em `api/webhook-mp.js`. O risco é baixo (o
código sempre reconsulta o Mercado Pago antes de agir), mas vale configurar o
segredo na Vercel e torná-lo obrigatório.

---

## 🟠 Bugs e lógica

### 6. Livro com estoque > 1 some da loja após uma única venda
`reservarLivros`/`marcarVendidos` marcam o **ID inteiro** como indisponível e
`disponivel()` esconde o livro — sem decrementar `estoque`. Um mangá com 3
unidades sai do ar depois da primeira venda. Corrigir guardando a quantidade
vendida/reservada e comparando com o estoque, ou decrementando o estoque no
documento do catálogo.

### 7. Vazamento de listeners a cada busca
Cada `renderizar()` (disparado **a cada tecla** digitada na busca) recria as
fileiras e registra `window.addEventListener("resize", ...)` + um
`ResizeObserver` **que nunca são removidos**. Depois de digitar uma frase, há
dezenas de listeners órfãos acumulando trabalho a cada resize/scroll.
Corrigir com delegação (um listener global) ou removendo os antigos antes de
re-renderizar; um debounce de ~150 ms na busca também ajuda.

### 8. No modo manual, o livro nunca é marcado como vendido
No fluxo Pix manual, `finalizar()` só **reserva** por 30 minutos. Se o lojista
não marcar a venda no painel admin, o livro **volta para a loja sozinho**
mesmo já vendido. Vale ao menos avisar no e-mail do pedido: "marque o livro
como vendido no painel".

### 9. Reservas expiradas ficam para sempre no Firestore
O filtro de expiração é só no front; os documentos `reservado` vencidos nunca
são apagados e vão poluindo o painel admin. O polling do checkout (`4s`)
também roda para sempre — vale parar após ~30 min com uma mensagem de
"cobrança expirada".

### 10. Autoplay do carrossel ignora `prefers-reduced-motion`
`semMovimento` só desativa o scroll suave; o hero continua girando sozinho
para quem pediu menos movimento. Basta checar a media query em
`agendarAuto()`.

### 11. Lógica de preço/promoção duplicada
`js/main.js` tem cópias próprias de `precoNumerico`, `arredondarReal`,
`promocaoAtiva` e `precosPromo`, paralelas às de `js/precos.js` — e as duas
versões de `precoNumerico` **já divergem** no parsing (uma trata `.` de
milhar, a outra não). Unificar tudo em `window.Precos`.

---

## 🟡 Performance

### 12. Capas de até 1 MB
`como-evitar-preocupacoes.jpg` (1,1 MB), `nietzsche-o-anticristo.jpg` (1 MB),
`do-mil-ao-milhao.jpg` (994 KB), `aristoteles-a-politica.jpg` (977 KB)…
A pasta `img/` soma **9,1 MB**. Redimensionar para ~600 px de altura e
comprimir (WebP ou JPEG q~75) derruba cada capa para 40–80 KB. Adicionar
`width`/`height` nos `<img>` evita o "pulo" do layout durante o carregamento.

### 13. Fotos soltas do WhatsApp vão para o deploy
As pastas `Livros/` (1,9 MB), `Livros novos 2/` (1,4 MB) e o `LOGO.jpg` da
raiz não são usados pelo site, mas são publicados na Vercel e pesam no clone
do repositório. Mover para fora do repo (Drive) ou listar num `.vercelignore`.

---

## 🔵 SEO e compartilhamento

### 14. Sem Open Graph — impacto direto nas vendas
A loja vende pelo Instagram/WhatsApp, mas o link compartilhado aparece **sem
imagem, título ou descrição** porque não há tags `og:*`/`twitter:*`. É a
melhoria de maior retorno imediato: adicionar `og:title`, `og:description`,
`og:image` (logo ou banner 1200×630) e `og:url` no `<head>` das três páginas.

### 15. Metadados desatualizados
A meta description ainda diz "Peça pelo Instagram" — hoje o site tem carrinho
e Pix. O `<title>` genérico ("BookVerse") pode virar
"BookVerse — Livraria em Juazeirinho | Livros novos e seminovos".

### 16. Sem sitemap, robots.txt e dados estruturados
O catálogo é 100% renderizado por JS. O Google consegue indexar, mas um
`sitemap.xml` + `robots.txt` + JSON-LD `schema.org/Product` por livro
melhorariam a busca orgânica ("livro X usado Juazeirinho").

---

## 🟣 UX e acessibilidade

### 17. Modal e drawer sem "focus trap"
Ao abrir o modal do livro ou o carrinho, o Tab continua navegando pelo
conteúdo de trás, e o foco não volta ao elemento que abriu quando fecha.

### 18. Checkout: CEP sem busca automática e campos sem máscara
Integrar o ViaCEP (gratuito, sem chave) para preencher rua/bairro/cidade a
partir do CEP, e mascarar telefone/CEP enquanto digita, reduziria abandono.

### 19. Sem página 404
Um link quebrado cai na página padrão da Vercel. Um `404.html` com a cara do
site e link de volta para a estante resolve.

### 20. PWA (manifest.json)
O site é mobile-first e já tem app Android; um `manifest.json` + ícones
tornaria o site "instalável" também no iPhone, praticamente de graça.

### 21. Carrinho exige login para tudo (decisão de negócio)
Exigir conta já para **adicionar ao carrinho** é bastante atrito. Alternativa
comum: carrinho anônimo e login apenas ao finalizar. Fica a critério da loja.

---

## ⚪ Manutenção

### 22. Nenhuma verificação automática
Não há package.json, lint nem CI. Um GitHub Action simples que valide
`js/livros.js` (sintaxe, capas existentes em `img/`, preços parseáveis)
evitaria derrubar a loja com um typo numa vírgula.

### 23. Catálogo duplicado no app Android
`android/.../data/Catalog.kt` repete os livros do site e vai divergir.
Considerar publicar o catálogo como um JSON único que o site e o app leem.

### 24. Configurações "escondidas" em código
`FIXAR_ULTIMO = "O Anticristo"` e `ORDEM_GENEROS` vivem em `js/main.js`,
enquanto o resto da configuração está em `js/config.js`. Mover para lá mantém
a promessa do README de "não precisa mexer no código".

---

## ✅ O que já está bom

- README excelente para leigos, com passo a passo real.
- Separação limpa: catálogo (`livros.js`) / config (`config.js`) / lógica.
- Pix manual (BR Code EMV com CRC16) implementado corretamente.
- Webhook do MP **reconsulta o pagamento** em vez de confiar na notificação.
- Idempotency-Key na criação da cobrança; trava contra clique duplo.
- Fallbacks bons: Firestore com timeout + cache local, login popup→redirect,
  capa fallback com inicial do título.
- Acessibilidade acima da média para um site artesanal (aria-labels,
  `prefers-reduced-motion` parcial, roles nos diálogos).

## 🎯 Por onde começar (sugestão de ordem)

1. **Itens 1–3** (dinheiro e integridade da loja) — regras do Firestore são
   mudança só no console do Firebase, sem deploy.
2. **Item 14** (Open Graph) — meia hora de trabalho, impacto direto nas vendas
   pelo Instagram/WhatsApp.
3. **Itens 12–13** (imagens) — o site fica visivelmente mais rápido no 4G.
4. **Itens 6–7** (bug de estoque e vazamento de listeners).
5. O resto conforme o tempo.
