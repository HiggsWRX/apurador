# 27: Noites de calibração: 2º turno de 2018 e 1º turno de 2026, com zonas

Status: resolved
Blocked by: 06
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O pipeline reconstrói mais duas noites seção por seção, com o mesmo código do [ticket 06](06-noite-2022-e-base-2026.md), no formato que o modelo e o executor de noites já leem:

- o 2º turno de 2018 inteiro, com base no 1º turno de 2018. A divulgação só abriu às 19h, mas o `detalhe_votacao_secao` traz a hora de cada seção antes disso;
- o 1º turno de 2026, com base em 2022.

Junto, saem as zonas dos 190 municípios com mais de uma, nas três noites da calibração (incluindo a de 2022), para o teste da zona.

Decisões: [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 14 e 16), [Linha do tempo de apurações passadas](../../apurador-2026/issues/02-linha-do-tempo-apuracoes-passadas.md) e [Método de projeção só com a apuração](../../apurador-2026/issues/09-metodo-projecao-so-apuracao.md) (comentário do ensaio).

## Critérios de aceite

- [x] **2º turno de 2018**: a reconstrução repete os 94,44% das 19h18 e bate com o resultado oficial no fim.
- [x] **1º turno de 2026**: a reconstrução repete a parcial publicada de 17,22% às 18:11:38 e bate com o resultado oficial no fim.
- [x] **Bases**: a do 2º turno de 2018 é o 1º turno de 2018, e a do 1º turno de 2026 é 2022, por município.
- [x] **Zonas**: as três noites trazem as zonas dos municípios com mais de uma.
- [x] As sequências ficam disponíveis sem rede para a calibração, como dado derivado com manifesto de origem.

## Comments

**19/10/2026, resolvido:**

- **2º turno de 2018**: `dados/noites/2018-2.json.gz` (0,49 MB) tem 35.238 chegadas em 6.273 zonas, com a hora do `detalhe_votacao_secao` e os votos dos 28 `bweb`. Às 19:18 o país tem 94,44% das seções, com Bolsonaro em 55,54%. A totalização ficou parada entre 19:17:16 e 19:18:48, então esse é o estado do minuto todo. A noite é inteira. Ela tem 88,47% às 19:00, quando a divulgação abriu. Começa com 40 seções do Exterior totalizadas em 27/10, das 17:43 às 17:58, com instantes negativos. Termina com 8 seções totalizadas em 25/02/2019. O fim bate com o oficial: Bolsonaro com 55,13% e Haddad com 44,87%.
- **1º turno de 2026**: `dados/noites/2026-1.json.gz` (1,22 MB) tem 69.193 chegadas em 6.292 zonas, com os 12 candidatos. Os votos vêm da `votacao_secao_2026_BR` (162 MB), porque o `bweb` do 1º turno tem 5 GB, com todos os cargos. Às 18:11:38 a noite tem 17,22%, com Flávio em 51,22% e Lula em 40,66%. Termina às 02:58:39 de 05/10, com Flávio em 47,03% e Lula em 45,16%. Os 5.246 votos no 28 contam como nulos técnicos e fecham os 3.674.249 nulos oficiais.
- **Conferências**: na geração (`npm run noites`), cada noite bate zona a zona com o resultado oficial do munzona, ou o gerador para. No CI, os testes conferem as parciais publicadas, o fim oficial e os marcos de 1%, 50%, 90% e 99% da tabela da linha do tempo, que arredonda ao minuto (18:09:44 vira 18:10). A noite e as bases de 2022 saem iguais, byte a byte.
- **Bases**: `dados/bases/2018-2.json` é o 1º turno de 2018, com Bolsonaro e Haddad. Nele, o Sul e o Centro-Oeste chegam à metade primeiro, e o Nordeste por último. `dados/bases/2026-1.json` é o 1º turno de 2022 na geografia da noite de 2026, com 5.571 municípios e 186 postos do Exterior. Os finalistas são os números 22 e 13, que em 2022 são Jair Bolsonaro e Lula (47,1 × 52,9). Boa Esperança do Norte entra zerada.
- **Zonas**: 189 municípios têm mais de uma zona em 2018 e em 2022, com São Paulo em 58, e 190 em 2026, com São Paulo em 57. O teste confere, nas três noites, que as zonas desses municípios somam no fim o resultado oficial do município (`dados/turnos/`).
- **Manifesto**: cada noite cita o detalhe por seção, as fontes dos votos e o munzona. A base de 2026-1 cita também as fontes de 2026 de onde vêm os finalistas e a geografia.
- **Leitores do TSE**: o 2018 tem quatro diferenças, agora tratadas.
  - A coluna de UF vem como `SG_ UF`: os nomes de coluna valem sem espaços em todos os leitores.
  - O CSV de cada `bweb` tem outro carimbo que o zip (`bweb_2t_AL_301020181745.csv` em `BWEB_2t_AL_301020181744.zip`), e o leitor o acha pelo prefixo.
  - A seção sem nenhum voto numa pergunta vem numa linha sem votável, que o leitor pula.
  - O detalhe não diz se a seção foi instalada, e o campo fica `null`.

  O leitor novo da `votacao_secao` lê o branco no 95 e o nulo no 96.
- **Tamanho**: `dados/` ganha 3,9 MB, dos quais 2,1 MB são as bases legíveis.
- **Para os próximos tickets**:
  - 28: a base é por município. Se o teste da zona precisar do 1º turno por zona, ele está no munzona. Na noite de 2026 com base em 2022, as zonas mudaram entre os anos: São Paulo tinha 58 e tem 57.
  - 07 e 28: a noite de 2026-1 traz todos os candidatos. O modelo usa os dois finalistas, e o resto entra nos válidos.
  - 11: a noite de 2018 tem chegadas antes do dia da eleição (instantes negativos), e a divulgação real só abriu às 19h.
  - O cache da `votacao_secao` é por ano. Para reconstruir uma noite de 2026 depois do 2º turno, rode com `--atualizar`.
- **Revisão** (`/code-review`): corrigidos as fontes da base de 2026-1 no manifesto, o teste das zonas (que conferia o replay com ele mesmo), os nomes de coluna sem espaços em todos os leitores e três limpezas nos testes. Ficaram de fora, sem efeito nas noites geradas:
  - o uso de memória do gerador, que roda em 80 s;
  - o `#NULO#` aceito como "não diz" em qualquer ano;
  - o membro do `bweb` achado pelo prefixo, porque um membro errado quebraria as conferências por seção e por zona;
  - o `2018` fixo no nome do zip.
