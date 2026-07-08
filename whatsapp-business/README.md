# Fundos para o WhatsApp Business — BookVerse

Imagens de fundo com a estética do site (tema cósmico roxo, estrelas douradas,
meteoros, lua e uma pilha de livros discretos).

## Arquivos

| Arquivo | Dimensões | Uso sugerido |
| --- | --- | --- |
| `capa-perfil.png` | 1920 × 1080 (paisagem) | Capa/foto de fundo do perfil do WhatsApp Business. Centro deixado "limpo" para não conflitar com a foto de perfil. |
| `papel-de-parede.png` | 1080 × 2340 (retrato) | Papel de parede das conversas (Configurações → Conversas → Papel de parede). |

## Paleta (a mesma do site — `css/style.css`)

- Roxos do espaço: `#0a0524`, `#14093a`, `#1f1466`, `#4a2bb5`
- Lavanda: `#b89eff`, `#d8caff`
- Estrelas douradas: `#ffd966`, `#fff3a8`
- Auroras: rosa `#ff7ad9`, ciano `#7adfff`

## Como gerar de novo

O visual é 100% vetorial e reproduzível. Para regerar (ou ajustar cores,
posições da lua/livros, quantidade de estrelas), edite `gerar-fundo.js` e rode:

```bash
node gerar-fundo.js .        # gera os PNGs na pasta atual
```

Requer Node com o Chromium do Playwright disponível (renderiza o SVG e captura
o PNG no tamanho exato).
