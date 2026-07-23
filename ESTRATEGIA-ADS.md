# 🧭 Estratégia atual de Google Ads — BookVerse

**Atualizado em:** 23/07/2026
**Resumo:** pivô de *captura de demanda* (Pesquisa/Shopping) para *geração de
demanda* (Display de descoberta), depois que os dados provaram que **quase
ninguém pesquisa livros no Google em Juazeirinho**.

> **Revisão de 23/07/2026 (com o 1º dia de dados da Descoberta):** os anúncios
> confirmaram estar **centrados em Juazeirinho/PB, raio de 20 km** — porém quase
> todo o gasto do 1º dia foi em **apps de jogos** (clique acidental). Corrigido:
> ver seção 8. As três campanhas agora estão padronizadas em **"Presença" + 20 km**.

> Este documento reflete o estado **atual e vivo** da conta. Ele atualiza os
> planos anteriores (`CAMPANHA-GOOGLE-ADS.md` e `CAMPANHA-SHOPPING.md`), que
> continuam válidos como referência histórica da lógica de cada peça.

---

## 1. O diagnóstico (por que mudamos)

A loja atende **só Juazeirinho/PB** (<20 mil hab.), então a segmentação é (e
deve continuar) travada na cidade. O problema não é o anúncio nem o lance — é
que **não existe busca** para capturar. Números reais da conta (≈90 dias):

| Campanha | Segmentação | Impressões | Cliques |
|---|---|---|---|
| Pesquisa (presença na cidade) | apertada | **4** | 0 |
| Pesquisa antiga (removida, ampla) | ampla | **1.039** | 2 |
| Shopping | apertada | 0 | 0 |

E o dado que fecha a conta: a Pesquisa tinha **15% de parcela de impressões**,
com um total de só **~26 leilões em 90 dias**. Ou seja: **ganhar 100% dos
leilões daria ~26 impressões no trimestre.** O gargalo é **demanda**, não lance.

**Conclusão:** aumentar lance/orçamento na Pesquisa não cria buscas que não
existem. Para atrair gente numa cidade pequena, é preciso **empurrar** o anúncio
para quem **não** está pesquisando — e foi exatamente isso que a campanha antiga
e ampla mostrou (1.039 impressões).

---

## 2. A estratégia agora

**Motor principal = Display de descoberta.** No Display o custo por mil
impressões é baixo, então com ~R$1,65/dia dá para gerar **milhares de
impressões/mês** dentro da cidade — fazendo Juazeirinho **conhecer a BookVerse**
e trazendo visitas ao site. É também **transparente** (dá para ver onde
apareceu e o que teve clique), gerando o **primeiro dado real** da conta.

**Por que NÃO fomos de Performance Max / automação:** esses formatos são
movidos por IA que **precisa de dados** (conversões/cliques) para funcionar.
Com histórico zero e verba pequena numa cidade pequena, a automação gasta no
escuro e tira a visibilidade. Regra: **começar simples e controlável; graduar
para formatos ousados só depois de ter dados.**

---

## 3. Estado vivo das campanhas

| Campanha | Tipo | Status | Papel |
|---|---|---|---|
| **Descoberta \| BookVerse \| Juazeirinho** | Display | **ATIVA** | Motor: alcance + visitas ao site |
| **Shopping \| BookVerse \| Juazeirinho** | Shopping | **ATIVA** | Rede de segurança grátis p/ o raro comprador que pesquisa |
| **Pesquisa \| BookVerse \| Juazeirinho** | Pesquisa | **ATIVA** (proteção de marca) | Captura redundante; mantida ligada só como rede de segurança |

> **Nota (23/07):** a Pesquisa estava ligada com **raio de 40 km** e alvo
> **"Presença ou interesse"** — o que a estratégia proíbe (mostraria o anúncio a
> quem só tem *interesse* na cidade, ex.: alguém em SP). Foi corrigida para
> **20 km + "Presença"**, igual às outras. Como não gera gasto (não há busca),
> fica ligada como proteção de marca; pode ser pausada sem prejuízo.

**Orçamento:** as três **dividem o mesmo orçamento de ~R$1,65/dia (~R$50/mês)**.
Isso **garante** que o gasto total nunca passe de ~R$50/mês, não importa quantas
campanhas estejam ligadas. Como Pesquisa e Shopping quase não geram impressão, na
prática **quase toda a verba vai para o Display**.

---

## 4. Configuração da campanha de Descoberta (Display)

- **Lance:** *Maximizar cliques* (sem teto) — busca o **máximo de visitas** pela
  verba, mantendo o CPC naturalmente baixo. Alinha com "disposto a tudo por um
  clique", mas o teto diário protege o bolso.
- **Rede:** só **Display do Google** (sem Pesquisa/parceiros).
- **Local:** raio de **20 km de Juazeirinho**, alvo **"Presença"** (só quem está
  fisicamente na cidade).
- **Exclusões:** domínios estacionados (*parked domains*) para cortar lixo.
- **Anúncio responsivo de Display** com:
  - 3 imagens (banner 1.91:1, quadrado 1:1, logo 1:1) — ver pasta `ads/`.
  - 5 títulos, 1 título longo, 4 descrições, nome "BookVerse".
  - URL final: `https://www.bookverse.com.br/`

Os criativos usam **fotos reais dos livros** (Berserk, 1984, O Príncipe Cruel,
Sherlock…) sobre o verde da marca — passa autenticidade de loja local.

---

## 5. ⚠️ Ajustes manuais recomendados (2 min no painel)

1. ~~**Excluir aplicativos móveis**~~ ✅ **FEITO pela API em 23/07/2026.** Foram
   excluídas as categorias de apps da Descoberta (Google Play, Apple App Store,
   Windows Phone e "Todos os apps"). O Display agora só aparece em **sites** dentro
   do raio — não mais em jogos. *(No 1º dia, praticamente todo o gasto tinha ido
   para apps de jogos com clique acidental — ver seção 8.)*
2. **Merchant Center:** confirmar que os produtos da Shopping estão **aprovados
   e ativos** (a aprovação não aparece pela API).

---

## 6. O que observar (primeiras 2 semanas)

- **Impressões e cliques** da Descoberta subindo (era 4 impressões → agora deve
  ir a milhares). Se em ~5 dias ainda estiver em ~0, me avise.
- **Onde apareceu** (relatório de canais/posicionamentos): tirar sites/apps
  ruins que aparecerem.
- **Visitas ao site** no analytics vindas de Display.
- **Gasto:** somando tudo, ~R$12/semana (o teto compartilhado garante).

---

## 7. Evolução (com dados na mão)

1. Com o **primeiro volume de cliques**, ver quais criativos/posicionamentos
   convertem melhor e cortar o resto.
2. Montar **público de remarketing** ("visitou e não comprou") e uma segunda
   leva de Display só para eles.
3. **Só então** avaliar formatos mais ousados (Demand Gen / Performance Max),
   agora com dados para a IA trabalhar — não mais no escuro.

---

## 8. 📈 Análise do 1º dia da Descoberta (dados de 22/07/2026)

A campanha de Descoberta começou a servir em **22/07** e já no 1º dia trouxe o
primeiro dado real da conta:

| Métrica | 22/07 |
|---|---|
| Impressões | **223** |
| Cliques | **14** |
| CTR | **6,28%** |
| CPC médio | **R$ 0,27** |
| Gasto | **R$ 3,78** |
| Conversões | **0** |

**A boa notícia:** o motor ligou. Saímos de ~4 impressões/trimestre (Pesquisa)
para **223 num único dia** — a tese de "gerar demanda em vez de capturar" está
funcionando em volume, e o CPC de R$ 0,27 é baixo (a verba rende).

**O problema (grave):** o relatório de *onde apareceu* mostrou que **quase 100%
das impressões e de todos os 14 cliques vieram de apps de jogos** — Baby Panda's
School Bus, Roblock Chibi, Soccer Superstar, Mahjong, Knife Tower, Water Tracker
etc. Esses cliques são **acidentais** (dedada em jogo, muitos de público
infantil) e **não têm nenhum valor** para uma livraria. Ou seja: os R$ 3,78 do
1º dia foram, na prática, **desperdiçados**.

**O que foi corrigido (23/07, pela API):**
1. ✅ **Exclusão de todo o inventário de apps** na Descoberta (4 categorias-raiz).
   A partir de agora o Display só aparece em **sites** dentro do raio de 20 km —
   inventário mais legítimo, cliques com intenção real.
2. ✅ **Pesquisa padronizada** para "Presença" + 20 km (estava 40 km + "presença
   ou interesse").

**O que observar nos próximos dias:**
- A tendência **saudável** é a de impressões/cliques **caírem em volume** (some
  o lixo dos apps) mas a **qualidade subir**: cliques vindos de sites reais,
  visitas ao site no analytics e, com sorte, as primeiras conversões.
- Se o volume de sites for baixo demais, é sinal de pouca oferta de inventário
  de Display na cidade — aí avaliamos ampliar o raio **com cautela** (ex.: 30 km)
  ou testar YouTube/Demand Gen.
- Ainda restou 1 clique de um **site** de jogos de baixa qualidade
  (`br10.webestgame.com`) — vale adicioná-lo como placement negativo na rotina
  semanal se reaparecer.

*Análise e correções feitas em 23/07/2026 com base nos dados reais da conta.*
