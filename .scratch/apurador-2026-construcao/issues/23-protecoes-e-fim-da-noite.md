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
