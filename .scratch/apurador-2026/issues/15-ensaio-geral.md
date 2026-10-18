# Ensaio geral

Type: grilling
Status: open
Blocked by: 02, 08
Map: [Apurador 2026](../map.md)

## Question

Como reproduzimos uma apuração passada inteira no site, acelerada, antes de 25/10, e o que precisa acontecer para o ensaio ser aprovado?

- Qual apuração reproduzir (2º turno de 2022, 1º turno de 2026) e a partir de que fonte de linha do tempo. Candidata: os horários por seção de `detalhe_votacao_secao`, ver [Dados históricos por município e malhas](03-dados-historicos-e-malhas.md). [Linha do tempo de apurações passadas](02-linha-do-tempo-apuracoes-passadas.md) recomenda o 2T de 2022 (cerca de 130 MB, validado contra o histórico oficial). 2018 só tem dados públicos a partir das 19h. O `bweb` de 2026 mudou de formato em relação ao de 2022.
- Como simular o TSE: servir os arquivos no mesmo formato da divulgação oficial, para que o caminho ao vivo rode sem mudanças.
- Velocidade, quem assiste e critérios de aprovação: sem falhas, curva projetada plausível, narração coerente, carga simulada.
- Data do ensaio e o que fazemos se ele falhar.
- **Calibração do modelo**, herdada de [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md): reproduzir o 1T de 2026 com base em 2022 (e o 2T de 2018 a partir das 19h, se ajudar) para calibrar as incertezas regional e nacional, o peso do próprio município e o modelo de ordem de chegada. Medir o desvio das seções tardias em 2026. O protótipo da branch `prototipo/metodo-projecao` já tem o placar do teste reaproveitável.
