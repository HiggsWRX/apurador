# 21: Painel do coletor, alertas e sentinela

Status: ready-for-agent
Blocked by: 17, 20
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O dono vê a noite toda no painel do coletor: uma página que o coletor grava como arquivo a cada rodada e que se recarrega a cada 5 s, sem servidor nem porta aberta.

Os alertas chegam em dois níveis, críticos e de atenção, no computador e no celular, pelo ntfy. Uma sentinela na nuvem, um Worker agendado a cada minuto, avisa quando o arquivo de rodada público para. Nenhum alerta age sozinho.

Decisões: [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md) (decisões 5 a 8 e comentários) e [Volume de gravações na noite](../../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md) (decisões 5 e 8).

## Critérios de aceite

- [ ] **Seções do painel**, nesta ordem:
  1. **Estado**: fase, cada chave, destino ativo, conexão ativa (cabo ou celular) e alertas ativos.
  2. **Visto de fora**: o arquivo de rodada e o JSON do Brasil lidos pelo endereço público como a página lê, com o atraso do visitante.
  3. **TSE**: a última leitura e a última novidade, o pico de req/s no último minuto contra o limite de 100, os 403, 404 e 5xx nos últimos 10 min e o tempo da rodada.
  4. **Placar conferido**: o placar do Brasil publicado contra o do arquivo do TSE.
  5. **Projeção do Brasil**: nas duas bases, com a chance, o peso das pesquisas e a mudança desde a rodada anterior.
  6. **Gravação**: a última gravação boa em cada destino, as falhas, as gravações do mês nos dois buckets e os MB que passaram pelo celular desde a troca.
  7. **Computador**: CPU, memória, disco, rede e o desvio do relógio contra o `Date` do TSE.
- [ ] **Alertas críticos** (som no computador e no celular):
  - 403 ou 429 do TSE;
  - nenhuma rodada completa há 60 s;
  - gravação no destino ativo falhando em 2 rodadas seguidas;
  - arquivo de rodada público com mais de 2 min;
  - placar publicado diferente do arquivo do TSE;
  - arquivo do TSE do Brasil ou de uma UF que o leitor não entende.
- [ ] **Alertas de atenção** (no painel, com som curto):
  - TSE sem novidade há 5 min com menos de 99% das seções;
  - projeção do Brasil mudando mais de 1 p.p., ou a chance mais de 20 pontos, numa rodada depois de 5%;
  - pico acima de 50 req/s;
  - rodada com mais de 15 s;
  - relógio desviado mais de 2 s;
  - gravações do mês acima de 70%;
  - arquivo de município que o leitor não entende, caso em que fica o último arquivo bom.
- [ ] Os limites dos alertas são parâmetros, conferidos no ensaio 1.
- [ ] **ntfy**: o alerta vai por HTTPS de saída, num tópico com nome impossível de adivinhar, guardado no `.env`, fora do Git. As mensagens só dizem o estado.
- [ ] **Sentinela**: um Worker com Cron Trigger a cada minuto lê o arquivo de rodada público e manda alerta pelo ntfy se ele passar 3 min parado. Com a fase "encerrada", ele não alerta.
- [ ] Os alertas são testados no replay, provocando cada condição.

## Comments

- 19/10/2026, do [ticket 12](12-coletor-minimo-e-replay.md): o registro de cada rodada (`RegistroDaRodada`) já sai no `aoRodar` e em `.cache/coletor/rodadas-*.jsonl`, com duração, processamento, pedidos, respostas por status, baixados, gravações e falhas.
  - As falhas são texto: arquivo que o leitor não entende (`não é JSON`), arquivo sem os candidatos do Brasil, status HTTP e gravação que falhou.
  - O ritmo padrão (45 pedidos/s, nunca acima de 50 num segundo, no máximo 14 s de pedidos por rodada) fica abaixo dos limites de atenção de pico e de duração da rodada.
- 20/10/2026, do [ticket 20](20-publicacao-r2-e-plano-b.md):
  - **Destino ativo**: `RegistroDaRodada.destinoAtivo` (`"principal"` ou `"plano B"`) diz onde a rodada gravou. `controle.planoB` é só o comando. Sem destino de plano B, o coletor fica no principal e registra a cada rodada a falha `plano B: o coletor roda sem destino de plano B`.
  - **Gravações do mês**: vêm em `RegistroDaRodada.gravacoesDoMes`, no formato `{ mes: "AAAA-MM", buckets: { "apurador-ao-vivo": n, "apurador-ensaio": m } }`, com o mês em UTC. `somaDoMes` dá o total contra o 1 milhão do plano gratuito, de onde sai o alerta acima de 70%. O contador fica em `packages/coletor/src/contador.ts` e é guardado a cada rodada em `.cache/coletor/gravacoes.json`.
  - **Falhas de gravação**, que o alerta "gravação no destino ativo falhando em 2 rodadas seguidas" lê:
    - no R2: `gravar <caminho>: R2 respondeu <status> em <caminho>: <corpo>`;
    - no plano B: `republicar o plano B: wrangler saiu com <código>: <últimas linhas>`, na rodada seguinte à republicação que falhou.
  - **Última gravação boa**: ainda não tem campo. No R2, é uma rodada com `gravacoes > 0` e sem falha de gravação. No plano B, ela pede que `republicacaoDoWorker` (`plano-b.ts`) exponha a hora da última republicação que terminou bem.
  - **Visto de fora**: o painel lê `https://ao-vivo.apurador.org/rodada.json` e, depois do comando, `https://apurador-plano-b.hicampos93.workers.dev/rodada.json` (`AMBIENTES`, em `packages/coletor/src/ambientes.ts`). Leia com `Origin: https://apurador.org`, e a sentinela também. O R2 só põe o CORS na resposta quando o pedido traz `Origin`. Sem a Transform Rule do passo 4 de `packages/coletor/cloudflare/README.md`, a cópia da borda feita pelo painel chegaria ao navegador sem o CORS.
