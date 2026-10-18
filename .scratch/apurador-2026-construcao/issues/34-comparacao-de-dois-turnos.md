# 34: Comparação de dois turnos no histórico

Status: ready-for-agent
Blocked by: 02
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

No bloco histórico de cada página de lugar, "Comparar dois turnos" permite escolher quaisquer dois turnos e ver a mudança entre o PT e o partido de Bolsonaro, mais onde mais mudou. É o primeiro corte se faltar tempo para a etapa "Antes da noite".

Decisões: [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisão 14) e [Plano de lançamento em fases](../../apurador-2026/issues/19-plano-de-lancamento-em-fases.md) (decisão 2).

## Critérios de aceite

- [ ] O visitante escolhe quaisquer dois turnos (2018 1T e 2T, 2022 1T e 2T, 2026 1T) para comparar.
- [ ] A comparação é só entre o PT e o partido de Bolsonaro (PSL em 2018, PL depois), rotulados pelo partido.
- [ ] Nos 1º turnos, a comparação usa o placar entre finalistas.
- [ ] O bloco mostra "onde mais mudou": as UFs, na página do Brasil, ou os municípios, na página da UF.
- [ ] O PT vem na cor de Lula, PSL e PL na de Flávio, e os números do TSE com duas casas.
