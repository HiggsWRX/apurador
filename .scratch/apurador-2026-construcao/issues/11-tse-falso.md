# 11: TSE falso

Status: ready-for-agent
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

- [ ] Os arquivos servidos têm a mesma estrutura dos reais da eleição `6258` (zerados) e dos finais do 1º turno (`6257`), conferida campo a campo.
- [ ] Um arquivo pedido no instante t traz o estado da reconstrução no instante t: votos por candidato, brancos, nulos, comparecimento, seções totalizadas e total, hora da última totalização e andamento.
- [ ] Os candidatos (Bolsonaro e Lula) e a geografia de 2022 vêm só dos arquivos. Nada a jusante pode tê-los fixos.
- [ ] A indicação do TSE aparece no mesmo campo do EA20 que o TSE usa, conferido no dicionário do EA20. A totalização final marca `tf="s"`.
- [ ] O relógio é configurável:
  - velocidade máxima para o replay;
  - para o ensaio, 3x das 16:50 às 20:30 de 2022 e 30x até a totalização final.
- [ ] As respostas trazem ETag, 304, gzip e o cabeçalho `Date`, como o CDN do TSE.
- [ ] Uma URL que não existe na configuração responde 404.
- [ ] O limite de 100 req/s por cliente vale com os 404 e os 304 contando, e toda violação fica registrada.
- [ ] Por comando, o TSE falso responde 403 durante um tempo, para testar o bloqueio.
