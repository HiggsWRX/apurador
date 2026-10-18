# 27: Noites de calibração: 2º turno de 2018 e 1º turno de 2026, com zonas

Status: ready-for-agent
Blocked by: 06
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O pipeline reconstrói mais duas noites seção por seção, com o mesmo código do [ticket 06](06-noite-2022-e-base-2026.md), no formato que o modelo e o executor de noites já leem:

- o 2º turno de 2018 inteiro, com base no 1º turno de 2018. A divulgação só abriu às 19h, mas o `detalhe_votacao_secao` traz a hora de cada seção antes disso;
- o 1º turno de 2026, com base em 2022.

Junto, saem as zonas dos 190 municípios com mais de uma, nas três noites da calibração (incluindo a de 2022), para o teste da zona.

Decisões: [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 14 e 16), [Linha do tempo de apurações passadas](../../apurador-2026/issues/02-linha-do-tempo-apuracoes-passadas.md) e [Método de projeção só com a apuração](../../apurador-2026/issues/09-metodo-projecao-so-apuracao.md) (comentário do ensaio).

## Critérios de aceite

- [ ] **2º turno de 2018**: a reconstrução repete os 94,44% das 19h18 e bate com o resultado oficial no fim.
- [ ] **1º turno de 2026**: a reconstrução repete a parcial publicada de 17,22% às 18:11:38 e bate com o resultado oficial no fim.
- [ ] **Bases**: a do 2º turno de 2018 é o 1º turno de 2018, e a do 1º turno de 2026 é 2022, por município.
- [ ] **Zonas**: as três noites trazem as zonas dos municípios com mais de uma.
- [ ] As sequências ficam disponíveis sem rede para a calibração, como dado derivado com manifesto de origem.
