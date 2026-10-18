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
- Fato de [API ao vivo do TSE](01-api-ao-vivo-tse.md): o TSE não oferece simulado nem replay para o 2T. O ensaio precisa gerar arquivos parciais no formato do TSE a partir da reconstrução seção por seção e servi-los num mock. O arquivo zerado do 2T (`6258`) dá o esqueleto.
- **Zona por dentro do modelo**: a divulgação ao vivo tem votos por zona, e só 190 municípios têm mais de uma (São Paulo tem 57). Testar no ensaio se usar a zona nesses municípios reduz o erro e o desvio das seções tardias. A decisão de unidade de [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md) previa revisão se houvesse dado abaixo do município.
- **Calibração do modelo**, herdada de [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md): reproduzir o 1T de 2026 com base em 2022 (e o 2T de 2018 a partir das 19h, se ajudar) para calibrar as incertezas regional e nacional, o peso do próprio município e o modelo de ordem de chegada. Medir o desvio das seções tardias em 2026. O protótipo da branch `prototipo/metodo-projecao` já tem o placar do teste reaproveitável.
