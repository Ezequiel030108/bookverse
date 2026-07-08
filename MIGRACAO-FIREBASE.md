# 🚚 Migração Vercel → Firebase — Guia passo a passo

O site está mudando da **Vercel** para o **Firebase** (Hosting + Functions),
no **mesmo projeto** (`bookverse-69878`) onde já ficam o login com Google e o
banco de dados (Firestore). Por isso:

- ✅ **Nenhum dado muda de lugar** — contas, pedidos e catálogo do admin
  continuam exatamente onde estão.
- ✅ **Nada muda para o cliente** — mesmas páginas, mesmos links
  (`/api/...` e `/livro/<id>` continuam iguais).
- ✅ **O site na Vercel continua no ar** durante toda a transição. Só sai do
  ar quando VOCÊ decidir (e dá para voltar atrás a qualquer momento).

---

## ✅ O que já está pronto (feito no código)

| O quê | Onde |
|---|---|
| As 9 APIs portadas para o Firebase Functions | `functions/api/` + `functions/index.js` |
| Configuração do Hosting (o que publicar, rotas `/api/*` e `/livro/<id>`) | `firebase.json` |
| Projeto padrão (`bookverse-69878`) | `.firebaserc` |
| **Freio de custo**: no máximo 10 cópias da função ao mesmo tempo (`maxInstances`) | `functions/index.js` |
| Atalhos `npm run deploy` e `npm run emulador` | `package.json` |

A pasta `api/` e o `vercel.json` **foram mantidos de propósito**: a Vercel
continua funcionando igual enquanto a mudança não termina.

---

## 👤 O que SÓ VOCÊ pode fazer

### Passo 1 — Instalar a ferramenta do Firebase (uma vez só)

Você precisa do **Node.js 20 ou mais novo** no computador
([nodejs.org](https://nodejs.org)). Depois, no terminal:

```bash
npm install -g firebase-tools
firebase login
```

O `firebase login` abre o navegador — **entre com a conta Google que é dona
do projeto** `bookverse-69878` (a mesma que você usa no Firebase Console).

> 💡 Se aparecer "firebase: command not found" depois de instalar, feche e
> reabra o terminal.

### Passo 2 — Cadastrar os segredos

São as mesmas "Environment Variables" que estão na Vercel
(vercel.com → seu projeto → **Settings → Environment Variables** — deixe
essa página aberta para copiar os valores).

Na pasta do projeto, rode um por um (cada comando pergunta o valor —
cole e dê Enter):

```bash
firebase functions:secrets:set MP_ACCESS_TOKEN
firebase functions:secrets:set WEB3FORMS_KEY
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set MP_WEBHOOK_SECRET
```

Onde encontrar cada um:

| Segredo | Onde encontrar |
|---|---|
| `MP_ACCESS_TOKEN` | O mesmo da Vercel. (Original: painel do Mercado Pago → Suas integrações → sua aplicação → **Credenciais de produção** → Access Token) |
| `WEB3FORMS_KEY` | O mesmo da Vercel (a chave do Web3Forms que recebe os e-mails de pedido) |
| `GEMINI_API_KEY` | O mesmo da Vercel. (Original: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)) |
| `MP_WEBHOOK_SECRET` | A **"Assinatura secreta"** da tela de Webhooks do Mercado Pago (veja o Passo 5). ⚠️ Se você não usa/não encontrar, digite apenas **`-`** (um traço) — isso desliga a validação, igual a deixar vazio na Vercel. |

### Passo 3 — Publicar (deploy) 🚀

Na pasta do projeto:

```bash
firebase deploy
```

Na **primeira vez**, ele pode pedir para **ativar APIs** do Google Cloud
(Cloud Functions, Cloud Build, Artifact Registry) — aceite tudo. É para
isso que o plano Blaze era necessário. Também pode oferecer criar algum
segredo que faltou — pode criar na hora.

Ao final, ele mostra:

```
Hosting URL: https://bookverse-69878.web.app
```

**Esse é o site novo, completo, rodando no Firebase** — sem mexer no
domínio ainda.

### Passo 4 — Testar ANTES de virar o domínio 🧪

Abra `https://bookverse-69878.web.app` e confira:

- [ ] A vitrine abre e os livros aparecem
- [ ] **Entrar** com Google funciona (a conta e os pedidos antigos aparecem — é o mesmo banco!)
- [ ] Cole `https://bookverse-69878.web.app/livro/<id-de-um-livro>` numa
      conversa do WhatsApp → a prévia mostra a capa com a moldura roxa
- [ ] No painel admin (Minha conta): **gerar sinopse com IA** funciona
- [ ] **Checkout**: faça um pedido real de valor baixo e pague o Pix →
      a tela confirma sozinha e o e-mail de pedido chega
      (a cobrança criada pelo site novo já avisa o servidor novo
      automaticamente — não depende do domínio)

Se algo falhar, os logs ficam em: Firebase Console → **Functions** →
função `api` → **Registros** (ou `firebase functions:log`).

### Passo 5 — Conferir o webhook no Mercado Pago 💳

Painel do Mercado Pago → **Suas integrações** → sua aplicação →
**Webhooks** (modo produtivo):

- Se a URL configurada é `https://bookverse.com.br/api/webhook-mp` →
  **não mexa** — ela continua válida depois que o domínio virar (Passo 6).
- Se a URL é algo como `https://....vercel.app/api/webhook-mp` → troque
  para `https://bookverse.com.br/api/webhook-mp`.
- Nessa mesma tela aparece a **"Assinatura secreta"** → é o valor do
  `MP_WEBHOOK_SECRET` do Passo 2. Se você preencheu `-` lá, pode voltar e
  rodar o comando de novo com o valor certo (fica mais seguro).

### Passo 6 — Apontar o domínio bookverse.com.br para o Firebase 🌐

Essa é a "virada de chave" de verdade — faça só depois do Passo 4 passar.

1. [Firebase Console](https://console.firebase.google.com) → projeto
   `bookverse-69878` → **Hosting** → **Adicionar domínio personalizado**.
2. Digite `bookverse.com.br` (e repita depois para `www.bookverse.com.br`).
3. O Firebase mostra registros DNS para você criar **onde o domínio é
   gerenciado** (Registro.br, Cloudflare, etc.):
   - um registro **TXT** (para provar que o domínio é seu);
   - registros **A** (os IPs do Firebase).
4. No gerenciador do domínio, **remova/substitua os registros que apontam
   para a Vercel** (o A `76.76.21.21` e/ou o CNAME `cname.vercel-dns.com`)
   pelos que o Firebase mostrou.
5. Aguarde: a propagação leva de minutos a algumas horas, e o certificado
   de segurança (https) é emitido sozinho (pode levar ~1 h). O status
   aparece na própria tela do Hosting.

⚠️ **Não mexa** no `login.bookverse.com.br` — ele já está configurado e
continua igual.

💡 Durante a propagação **o site não sai do ar**: quem cair na Vercel vê o
site antigo funcionando; quem cair no Firebase vê o novo. Os dois usam o
mesmo banco.

### Passo 7 — Alerta de orçamento (5 minutos, MUITO recomendado) 🔔

Para dormir tranquilo com o Blaze:

1. [console.cloud.google.com/billing](https://console.cloud.google.com/billing)
   → selecione a conta de faturamento do projeto → **Orçamentos e alertas**
   → **Criar orçamento**.
2. Valor: ex. **R$ 10**. Alertas em 50%, 90% e 100%.

Você recebe **e-mail** se o gasto se aproximar do valor. Lembre: o alerta
**avisa, não corta** — mas o freio automático (`maxInstances: 10`) já está
no código, e no uso normal da loja a fatura esperada é **R$ 0**.

### Passo 8 — Limpeza (depois que tudo estiver rodando no Firebase) 🧹

Sem pressa — só quando o domínio já estiver servido pelo Firebase há
alguns dias e tudo funcionando:

- Na **Vercel**: remova o domínio do projeto (Settings → Domains) e, se
  quiser, pause/apague o projeto.
- No **código**: me peça que eu removo a pasta `api/`, o `vercel.json` e o
  `.vercelignore`, e atualizo o README para falar só do Firebase.

---

## 🆘 Se algo der errado (plano B)

O site antigo na Vercel **continua intacto** até você apagá-lo. Para
voltar atrás, basta restaurar os registros DNS antigos (os da Vercel) no
gerenciador do domínio — em pouco tempo tudo volta a ser como era.

## ❓ Problemas comuns

| Sintoma | Solução |
|---|---|
| `firebase: command not found` | Feche e reabra o terminal; confirme que o Node está instalado (`node -v`) |
| Deploy reclama de **permissão** | Você logou com a conta certa? (`firebase login:list` mostra; `firebase logout` + `firebase login` para trocar) |
| Deploy pede para **ativar APIs** ou **billing** | Aceite — é o plano Blaze em ação (as cotas grátis continuam valendo) |
| Função dá erro 500 | Veja os registros: `firebase functions:log` ou Console → Functions → Registros |
| Login Google não abre no `.web.app` | Firebase Console → Authentication → Settings → **Authorized domains** → confira se `bookverse-69878.web.app` está na lista (vem por padrão) |
