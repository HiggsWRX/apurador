# 05: Histórico das pesquisas de 2002 a 2022

Status: ready-for-agent
Blocked by: 04
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O `pesquisas-historicas.csv`, só nacional, com as pesquisas finais dos 2º turnos de 2006 a 2022 e a média de 2002 de Jennings e Wlezien. Cada linha traz a fonte, e os resultados oficiais de 2002 a 2018 são conferidos no TSE.

Sobre ele, a regra do agregado é aplicada aos seis 2º turnos, com a incerteza de cada ano calculada sem aquele ano. Isso alimenta:

- o gráfico "agregado contra resultado" da metodologia;
- o agregado de 2022 e o de 2018, que o replay, a calibração e o ensaio usam;
- as pesquisas do 1º turno de 2026 entre os dois finalistas, para o caso do K na calibração.

Decisões: [Agregado de pesquisas e erro histórico](../../apurador-2026/issues/10-agregado-de-pesquisas.md) (decisão 10), [Pesquisas eleitorais: dados atuais e erro histórico](../../apurador-2026/issues/06-pesquisas-eleitorais.md) e [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 3 e 17).

## Critérios de aceite

- [ ] O `pesquisas-historicas.csv` cobre os 2º turnos de 2002 a 2022, com uma fonte por linha. Não traz erro por UF nem por instituto.
- [ ] Os resultados oficiais de 2002 a 2018 estão conferidos no TSE, e a conferência fica registrada.
- [ ] A regra do agregado sai de um só código, o do [ticket 04](04-agregado-de-pesquisas.md), aplicado a cada ano, com a incerteza calculada sem aquele ano.
- [ ] Um teste confere a conta prévia: Bolsonaro com ~100% de chance em 2018 (média de 57,0% contra 55,1% real) e Lula com ~75% em 2022 (51,0% contra 50,9%).
- [ ] O erro da média nos seis anos dá cerca de 1,2 ponto de raiz do erro quadrático médio na participação, sem lado fixo.
- [ ] O agregado de 2022 e o de 2018, congelados na véspera de cada 2º turno, ficam prontos para o replay, a calibração e o ensaio geral.
- [ ] As pesquisas do 1º turno de 2026 entre os dois finalistas ficam registradas com fonte, e o erro delas na margem confere com os 2,8 pontos contra Flávio.
- [ ] O `pesquisas-historicas.csv` está pronto para ser oferecido para baixar na metodologia.
