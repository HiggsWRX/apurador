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
- De [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md):
  - O TSE falso roda no computador do dono e serve, no formato oficial, a apuração reconstruída. O coletor lê dele só trocando a URL base (decisão 7).
  - Medir: o atraso de ponta a ponta sobre o TSE (meta ~35 s em média, ~70 s no pior caso, decisão 17), o tempo até um JSON novo valer na borda pelo R2 e pelo plano B de republicação (decisão 15) e a carga no computador.
  - Testar: derrubar e reiniciar o coletor no meio da noite, cortar a internet e passar para o roteador de celular, e conferir o aviso de "atualização interrompida" (decisões 16 e 19).
  - Usar as zonas dos 190 municípios com mais de uma, já coletadas desde o início (decisão 20).
- De [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md): a mesma reprodução do 2º turno de 2022 roda também com as pesquisas deslocadas 2 pontos para cada candidato, para calibrar K, o quanto as pesquisas valem em seções apuradas.
- De [Contas e acessos](07-contas-e-acessos.md): o domínio foi adiado. Até ele existir, os JSONs ao vivo seguem o plano B (Worker com os JSONs como static assets, em `*.workers.dev`), e é esse caminho que o ensaio mede primeiro.
- De [Simulador "e se"](13-simulador-e-se.md): testar os seis estados do indicador ao vivo, sobretudo "TSE sem novidade" contra "interrompido", que o arquivo de rodada separa. Testar também a passagem sozinha das 17h para o ao vivo, sem recarregar, e o simulador se atualizando com as hipóteses paradas.
- De [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md): testar as chaves de publicação ligadas e desligadas, sem código novo, e a retirada de uma pesquisa com o agregado recalculado depois do congelamento.
- De [Sinal de virada](23-sinal-de-virada.md): calibrar os limites provisórios de 50% e 5% da chance de virada e conferir se "sem sinal de virada" nunca apareceu numa noite que acabou virando. Testar também a chave de textos preditivos ligada e desligada no meio da noite.
- De [Narração da noite](14-narracao-da-noite.md):
  - "Narração coerente" pode ser conferida contra a [medição do 2º turno de 2022](../research/14-narracao-noite-2t-2022.md). Com as regras decididas, a narração do Brasil deve dar cerca de 50 eventos, uma única virada às ~18:44, sem a troca de 0,26%, e as 4 viradas em UF (MG duas vezes, AP e AM).
  - Testar a janela de 10 minutos da virada nas fases do relógio do coletor que veem 4 trocas no Brasil.
  - Testar a retomada do coletor sem eventos repetidos nem retroativos.
  - Com a chave desligada, conferir que nenhum evento preditivo, nem a frase de projeção da manchete, aparece nos JSONs públicos (decisão 6 de lá).
