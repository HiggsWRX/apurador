# Linha do tempo de apurações passadas

Type: research
Status: resolved
Blocked by: —
Map: [Apurador 2026](../map.md)

## Question

É possível reconstruir como a apuração presidencial evoluiu ao longo da noite em 2022 (1T e 2T), 2018 (1T e 2T) e no 1T de 2026, isto é, a ordem e o horário em que seções e municípios foram totalizados?

Isso alimenta duas coisas: calibrar a curva projetada (quais lugares chegam cedo e quais chegam tarde, como no caso de Sul/Sudeste antes de Norte/Nordeste) e reproduzir uma apuração passada como ensaio geral do site.

Precisamos saber:

- Se o TSE publica horários por seção ou por município (ex.: campos de data/hora de recebimento ou totalização nos dados de boletim de urna, logs de totalização, ou outro conjunto em dadosabertos.tse.jus.br / cdn.tse.jus.br).
- Se terceiros guardaram snapshots periódicos da divulgação oficial durante essas noites (repositórios no GitHub, Kaggle, Base dos Dados, veículos de imprensa), com cobertura, granularidade e formato.
- Qual é a melhor fonte para reconstruir a curva real (placar parcial × % de seções totalizadas) de cada eleição, e o que falta em cada uma.

## Answer

Sim, para as cinco noites, seção por seção e com hora ao segundo, só com dados oficiais do TSE.

- **Horário:** o arquivo `detalhe_votacao_secao_<ano>.zip` (membro `_BR.csv`, de 34 a 62 MB, que dá para ler por *Range*) traz, para cada seção, `DT_RECEBIMENTO_BU_HOR_TSE` e `DT_PRIM_TOT_PARCIAL_HOR_TSE` em 2018, 2022 e 2026.
- **Votos:** vêm do `bweb` (o boletim de urna) ou da `votacao_secao`.
- **Validação:** ordenar as seções pela 1ª totalização repete o histórico oficial de 2022 ao segundo, inclusive a virada das 18h44 com 67,76%. Repete também as parciais publicadas de 2026 (17,22% às 18:11:38) e os 94,44% das 19h18 de 2018.
- **Histórico oficial nacional:** só existe para 2022. O de 2026 1T ainda não saiu. O `bweb` de 2018 não tem horário nenhum. Snapshots de terceiros (wcota em 2022, davimassari em 2026 a partir de 85%) são parciais e desnecessários.
- **Melhor ensaio geral:** o 2T de 2022 (~130 MB, com virada e histórico oficial para conferir). O segundo é o 1T de 2026 (~200 MB, sem virada).
- **Ordem de chegada:** Centro-Oeste e Sul chegam cedo, Sudeste e Nordeste tarde. Dentro de cada UF e de cada município, a ordem também é ligada ao voto. De um turno para outro, a ordem por seção se repete pouco.

Detalhes, tabela por eleição e lacunas: [pesquisa](../research/02-linha-do-tempo-apuracoes-passadas.md).
