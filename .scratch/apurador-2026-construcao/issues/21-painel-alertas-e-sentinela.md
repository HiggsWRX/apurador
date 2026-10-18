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
