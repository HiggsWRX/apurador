# 11: TSE falso

Status: resolved
Blocked by: 06
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O TSE falso do módulo `ensaio`. Ele serve a noite reconstruída do 2º turno de 2022 no formato da divulgação de 2026 (estrutura da eleição `6258`), como se fosse o TSE:

- a configuração da eleição e a de municípios e zonas, com a geografia de 2022;
- os índices `-ab.json` do Brasil e das UFs;
- os arquivos de Brasil, UF, Exterior, município e zona.

Cada arquivo traz o placar, a hora da última totalização e o andamento no instante do relógio do TSE falso.

Ele funciona de dois jeitos: dentro do processo, na velocidade máxima, para o replay automático; e como servidor HTTP local no computador do dono, com relógio próprio, para o ensaio geral.

Decisões: [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 4 e 6), [API ao vivo do TSE](../../apurador-2026/issues/01-api-ao-vivo-tse.md) e [Arquitetura e tecnologia](../../apurador-2026/issues/08-arquitetura-e-tecnologia.md) (decisão 7).

## Critérios de aceite

- [x] Os arquivos servidos têm a mesma estrutura dos reais da eleição `6258` (zerados) e dos finais do 1º turno (`6257`), conferida campo a campo.
- [x] Um arquivo pedido no instante t traz o estado da reconstrução no instante t: votos por candidato, brancos, nulos, comparecimento, seções totalizadas e total, hora da última totalização e andamento.
- [x] Os candidatos (Bolsonaro e Lula) e a geografia de 2022 vêm só dos arquivos. Nada a jusante pode tê-los fixos.
- [x] A indicação do TSE aparece no mesmo campo do EA20 que o TSE usa, conferido no dicionário do EA20. A totalização final marca `tf="s"`.
  - O campo (`md`) foi conferido no código do app oficial de resultados, não no PDF do dicionário, que o site do TSE bloqueia para robôs. Falta abrir o PDF num navegador para fechar a conferência (ver Comments).
- [x] O relógio é configurável:
  - velocidade máxima para o replay;
  - para o ensaio, 3x das 16:50 às 20:30 de 2022 e 30x até a totalização final.
- [x] As respostas trazem ETag, 304, gzip e o cabeçalho `Date`, como o CDN do TSE.
- [x] Uma URL que não existe na configuração responde 404.
- [x] O limite de 100 req/s por cliente vale com os 404 e os 304 contando, e toda violação fica registrada.
- [x] Por comando, o TSE falso responde 403 durante um tempo, para testar o bloqueio.

## Comments

**19/10/2026, resolvido:**

- **TSE falso** (`@apurador/ensaio`): `criarTseFalso` responde como o CDN do TSE, com os arquivos no estado da noite reconstruída no instante do relógio dele. Serve a configuração das eleições e a de municípios e zonas, os índices `-ab.json` do Brasil e das UFs e o resultado de Brasil, UF, Exterior, município e zona. Qualquer outra URL dá 404.
- **Dois jeitos**: dentro do processo, `buscarNoTseFalso` tem a forma do `fetch`, para o coletor do replay. A noite inteira, com os 29 índices a cada rodada de 20 s, roda em ~6 s.
  - O `relogioDoReplay` anda com o relógio simulado do coletor, a 1x e sem esperar. Assim o limite de pedidos conta pelo ritmo em que o coletor espaça os pedidos. Com o `relogioManual`, todos os pedidos de uma rodada caem no mesmo milissegundo.
  - Como servidor local, `npm run tse-falso` aceita `--porta`, `--partida HH:MM` e `--velocidade`, e lê no terminal os comandos `403 <segundos>`, `liberar`, `estado` e `sair`.
- **Estrutura**: conferida campo a campo, com a ordem das chaves, contra arquivos reais baixados em 19/10 (os zerados da 6258 e os finais da 6257), guardados em `packages/ensaio/test/amostras/tse`. Antes das 17h, os arquivos são iguais aos zerados. Depois da final, são iguais aos finais. No meio da noite, são iguais aos finais sem `esae` e `mnae`, que só a final traz.
  - As regras de escrita dos números (vírgula; duas casas, nunca 0,00 de uma parte nem 100,00 de menos que o todo; nove casas com "0" e "100" exatos) batem com todos os percentuais das amostras. O JSON sai com o espaçamento do TSE, byte a byte.
- **Estado no instante t**: confere com o histórico oficial (18:44:04, 67,76%, Lula 50,01%), com a medição de 2022 (DF termina às 19:59:37, SP chega à metade às 18:38:10, AC termina às 22:29:40) e com o resultado oficial no Brasil, em SP e na capital.
- **Candidatos e geografia**: vêm do novo `dados/cadastros/2022-2.json` (`npm run cadastros`), com `sqcand`, vice e coligação do `consulta_cand_2022` e a geografia da noite, com nomes do TSE, IBGE e capitais. Tem o Vaticano e não tem Boa Esperança do Norte.
- **Indicação do TSE**: é o campo `md` na raiz do resultado do Brasil (`"e"`), só até a final. Foi conferido no código do app oficial de resultados (`exibirMatematicamente`, `validacaoMatematicaDefinicao`), porque o PDF do EA20 está bloqueado para robôs e não está no Wayback.
  - A regra é a vantagem de quem lidera passar dos eleitores das seções que faltam. Em 2022, isso acontece às 19:56:20, com 98,78%. O TSE indicou às 19:56:23, com 98,81%, a chegada seguinte. A narração mostra os dois como 19:56.
- **Totalização final**: `tf = "s"` em todos os arquivos de resultado, com `dt`/`ht` da final (00:18:04 de 31/10), `esae`/`mnae` e o eleito (`e = "s"`, `st = "Eleito"`). Os índices guardam a hora da última totalização de cada lugar, como os reais.
- **CDN e limite**: ETag/304, `If-Modified-Since`, gzip e `Date` no relógio da noite; 200 ao preflight de CORS e 403 ao `HEAD`; query string ignorada. Acima de 100 pedidos por segundo por cliente, com 404 e 304 contando, a violação fica registrada e o cliente é bloqueado por 10 min, renovados a cada pedido no bloqueio.
  - 404, 403 e violações vão para `registro()` e, no servidor, para `.cache/tse-falso/*.jsonl`.
- **Para o 12**:
  - O replay precisa do `relogioDoReplay` ligado ao relógio do coletor, e o coletor precisa espaçar os pedidos de cada rodada. No pico de 2022 são ~630 pedidos numa rodada.
  - O cabeçalho `Date` é a hora de 2022. A fase sai dele, mas o alerta de relógio (2 s) vai disparar contra o TSE falso.
  - `seq`, `e` e `st` são os do Brasil em todos os arquivos.
  - O `tse` ganhou `lerConfiguracaoDeMunicipios`, para gerar as URLs do `cm.json`.
- **Simplificações**: a noite não separa as seções não instaladas, os nulos técnicos nem os anulados. Por isso `sni`, `sna`, `vnt` e `van` ficam zerados, e a abstenção do Brasil sai 657 acima da oficial. O TSE falso também não imita o cache de ~60 s da borda.
