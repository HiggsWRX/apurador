# 23: Proteções do coletor e fim da noite

Status: ready-for-agent
Blocked by: 22
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

As únicas ações automáticas do coletor:

- parar de pedir ao TSE no primeiro bloqueio;
- respeitar o teto de gravações por rodada;
- reduzir as gravações sozinho em 90% do mês;
- encerrar a noite na totalização final.

Todo o resto é decisão do dono.

Decisões: [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md) (decisões 12 e 21) e [Volume de gravações na noite](../../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md) (decisão 5).

## Critérios de aceite

- [ ] **Bloqueio**: no primeiro 403 ou 429, o coletor para de pedir ao TSE e manda um alerta crítico.
- [ ] **Retomada depois do bloqueio**: quando a conexão ativa cai e volta, ou muda (do cabo para o celular, ou depois do modo avião), o coletor retoma com rodada a cada 40 s por 15 min. Se o pico passou de 50 req/s, a rodada fica em 40 s até o fim da noite.
- [ ] **Teto por rodada**: no máximo 1.500 gravações. O excedente fica para a rodada seguinte, nesta ordem: arquivo de rodada, Brasil, UFs, tabelas de projeções e os municípios mais antigos.
- [ ] **Trava de 90%**: com 90% das gravações do mês, contadas nos dois buckets, o coletor passa sozinho a gravar só Brasil, UFs, tabelas de projeções e arquivo de rodada, mais cada município no máximo a cada 5 min, e manda um alerta crítico.
- [ ] **Fim da noite**: na totalização final do Brasil, o coletor publica a fase "encerrada", roda mais 30 min e para sozinho. Com essa fase, a página nunca mais mostra "interrompido".
- [ ] O replay testa cada proteção: 403 do TSE falso, rodada acima do teto, contador perto de 90% e totalização final.
- [ ] Nenhuma outra ação é automática.

## Comments

- 19/10/2026, do [ticket 12](12-coletor-minimo-e-replay.md): num 403 ou 429, o coletor hoje só registra a falha da URL e segue pedindo. Já existe o teto de downloads por rodada (14 s de pedidos), mas não o de gravações nem a parada 30 min depois da final. O replay da noite inteira já roda até 30 min depois da final (`packages/ensaio/test/replay.test.ts`).
- 20/10/2026, do [ticket 20](20-publicacao-r2-e-plano-b.md):
  - **Onde está o contador**: o contador das gravações nos dois buckets existe e vai no registro de cada rodada, em `registro.gravacoesDoMes.buckets`, por bucket e por mês em UTC. O coletor o recebe em `OpcoesDoColetor.contador`. Sem contador (o replay, os testes), o registro traz `gravacoesDoMes: null`.
  - **O que conta**: cada gravação que o R2 aceitou conta uma. A recusada não conta, e o plano B e a pasta local também não, porque não são operações do R2.
  - **A trava de 90%**: lê a soma dos buckets com `somaDoMes` (`contador.ts`) e dispara em 900 mil.
  - **O teto por rodada**: as gravações dos lugares saem até 32 ao mesmo tempo (`emParalelo`, em `publicar`). O teto de 1.500 entra na lista que `publicar` monta antes de gravar.
- 22/10/2026, do [ticket 18](18-projecao-dos-municipios-e-tabelas.md): `publicar()` grava agora, além do arquivo de rodada e dos lugares, as 28 tabelas de projeções (`tabelas/<UF>.json`, quase toda rodada com resultado novo), os municípios delas (`tabelas/<UF>-municipios.json`, uma vez a partir das 17h) e o `mapa.json` (quase toda rodada). No replay de 2022, em 1.435 rodadas: 11.874 gravações das tabelas, 28 dos municípios delas e 791 do mapa.json, e 629 gravações na maior rodada. O `mapa.json` e os municípios das tabelas não estão na ordem do teto nem na lista da trava de 90% (Volume de gravações na noite, decisão 5): onde eles entram fica com este ticket. Sem os municípios da tabela, a página do município fica sem a projeção.
- 22/10/2026, do [ticket 21](21-painel-alertas-e-sentinela.md):
  - **O alerta do bloqueio já existe**: `tse-bloqueou`, crítico, sai de qualquer 403 ou 429 em `registro.respostas` e fica ativo por 10 min (`avaliarAlertas`, em `packages/coletor/src/alertas.ts`). Quando a janela acaba, ele não vai ao celular. Aqui só falta o coletor parar de pedir. Uma rodada sem pedido nenhum conta como completa (`rodadaCompleta`), e o coletor parado no bloqueio não dá também o "sem rodada".
  - **A trava de 90%**: o crítico dela entra em `avaliarAlertas`, com um id novo em `IdDoAlerta` e um campo novo no `RegistroDaRodada`, que o coletor preenche em `rodada()`. O de atenção acima de 70% (`gravacoes-do-mes`) continua. O teste vai em `packages/ensaio/test/painel-e-alertas.test.ts`, que já começa o mês com 699.900 gravações pelo `contador`.
  - **Fim da noite**: com a fase "encerrada", a sentinela não alerta. Quando o coletor para, 30 min depois, o painel para junto, sem alerta, porque o processo acaba.
- 22/10/2026, do [ensaio 1](32-ensaios-gerais.md) (`noite-local`, a 3x):
  - **No 403**: com o TSE falso respondendo 403 por 180 s, o coletor fez 341 a 454 pedidos 403 por rodada, 3.738 no total. Na volta, três rodadas no teto de 630 pedidos e ~600 municípios novos cada, com 645 a 686 gravações; a última levou 15,2 s.
  - **Teto por rodada**: a rodada que passou ao plano B regravou 5.838 arquivos em 17,5 s. Com o teto de 1.500, ela vira quatro rodadas.
  - **Fim da noite**: a rodada logo depois da final rebaixou os ~600 municípios finais (602 gravações, 15,5 s, alerta de atenção). O encerramento 30 min depois da final ainda não existe: o `--minutos` parou o coletor.
