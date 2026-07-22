# 🛍️ Campanha de Shopping — BookVerse (ativada e otimizada)

**Status:** ATIVA · **Tipo:** Shopping (padrão) · **Cidade:** Juazeirinho/PB
**Ativada e revisada em:** 21/07/2026

> Companheira da campanha de Pesquisa (ver `CAMPANHA-GOOGLE-ADS.md`).
> As duas rodam juntas e **dividem o mesmo orçamento de ~R$ 50/mês**, então
> o gasto total continua limitado — ativar o Shopping **não** aumenta o teto.

---

## O que é e por que faz sentido aqui

A campanha de Shopping mostra o anúncio com **foto da capa + preço** direto na
busca do Google, quando alguém procura por um livro. Para uma loja com catálogo
e feed no Merchant Center, costuma converter bem em buscas de intenção de compra
("comprar 1984", "berserk mangá") — complementa os anúncios de texto da Pesquisa.

Ela foi montada de forma **conservadora** (lance manual, só Rede de Pesquisa,
segmentação por presença na cidade), que é o oposto do cenário que "queima"
orçamento pequeno (Performance Max + lance automático + correspondência ampla).

---

## Configuração atual (revisada)

| Item | Valor | Observação |
|---|---|---|
| Status | **Ativada** | ligada em 21/07/2026 |
| Estratégia de lance | **CPC manual** | correto sem histórico de conversão |
| CPC máximo | **R$ 0,80/clique** | ⬅️ corrigido (estava R$ 5,00) |
| Orçamento | **~R$ 1,65/dia**, compartilhado com a Pesquisa | teto total ≤ ~R$ 50/mês |
| Redes | **Só Rede de Pesquisa do Google** | sem Display, sem parceiros |
| Localização | **Raio de 20 km de Juazeirinho** | alvo **"Presença"** (quem está na cidade) |
| Grupo de produtos | "Todos os Produtos" (1 nó) | catálogo inteiro |
| Palavras negativas | **32 termos** | pdf, grátis, resumo, amazon, shopee, magalu, kindle, epub, fruta, receita… |
| Merchant Center | Vinculado | feed de produtos conectado |

---

## O que foi feito nesta revisão (21/07/2026)

1. **Corrigido o lance de R$ 5,00 → R$ 0,80/clique** (no grupo de anúncios e no
   grupo de produtos). O valor antigo gastaria ~3 dias de orçamento em **um
   único clique** — era o principal risco da campanha.
2. **Adicionadas 2 palavras negativas** que já existiam na Pesquisa mas faltavam
   aqui: `fruta` e `receita` (agora as duas campanhas têm a mesma blindagem).
3. **Ativada a campanha** (estava pausada).

Configurações que já estavam boas e foram **mantidas**: rede só de Pesquisa,
segmentação por presença, lance manual e as outras 30 palavras negativas.

---

## ⚠️ Verifique no Merchant Center

A aprovação dos produtos **não aparece pela API de anúncios** — confira no
Merchant Center se os produtos estão **aprovados e ativos**. Se o feed estiver
reprovado ou vazio, a campanha fica ativa mas **não mostra nada** (não é erro de
configuração, é o feed).

---

## Rotina (junto com a da Pesquisa, 10 min/semana)

1. **Termos de pesquisa** (Campanha Shopping → Palavras-chave → Termos de
   pesquisa): termo ruim (pdf, resumo, outra loja) → adicionar como **negativa**.
2. **Estoque:** livro anunciado esgotou? Como o Shopping puxa do feed, garanta
   que o produto saia do catálogo/feed quando acabar (são exemplares únicos).
3. **Impressões:** se em 2 semanas houver **zero impressão** com produtos
   aprovados, subir o CPC máx. para **R$ 1,20** (mesmo critério da Pesquisa).
4. **Gasto:** as duas campanhas somadas devem ficar em ~R$ 12/semana (o teto
   compartilhado garante isso).

---

## Evolução (quando tiver dados)

- Com **15+ conversões**, testar **"Maximizar cliques"** ou lance por conversão.
- Se o Shopping vender melhor que a Pesquisa, considerar **orçamento próprio**
  para ele (aí sim aumentando o investimento de forma consciente).
- Segmentar grupos de produtos (mangás vs. clássicos) para dar lances diferentes
  quando houver volume que justifique.

*Revisão feita em 21/07/2026. Reavaliar com os dados reais em ~30 dias.*
