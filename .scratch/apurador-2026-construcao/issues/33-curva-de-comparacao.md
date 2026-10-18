# 33: Curva de comparação

Status: ready-for-agent
Blocked by: 14, 27
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O visitante sobrepõe à curva real a curva de comparação de qualquer turno passado (2018 1T e 2T, 2022 1T e 2T, 2026 1T), no mesmo eixo de % de seções totalizadas. Ela fica desligada por padrão. O pipeline reconstrói as noites que ainda faltam, o 1º turno de 2018 e o de 2022, e gera a curva real de cada turno passado em cada lugar.

Decisões: [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisão 4), [Linha do tempo de apurações passadas](../../apurador-2026/issues/02-linha-do-tempo-apuracoes-passadas.md) e [Consulta a advogado eleitoral](../../apurador-2026/issues/16-consulta-advogado-eleitoral.md) (decisão 2: "O que esperar da noite" sem números de projeção).

## Critérios de aceite

- [ ] **Noites que faltam**: o 1º turno de 2018 e o de 2022 são reconstruídos seção por seção com o mesmo código, e o fim de cada um bate com o resultado oficial.
- [ ] **Curvas passadas**: para cada lugar (Brasil, UF, Exterior e município) e cada turno passado, a curva real é amostrada de forma compacta. Ela mostra a fatia do PT contra o partido de Bolsonaro entre os dois, como na comparação de turnos.
- [ ] **Botões**: há um botão por turno passado, desligado por padrão, e a curva de comparação aparece sobre a curva real atual, com legenda.
- [ ] **Peso**: os dados das curvas passadas só são baixados quando o visitante liga uma delas.
- [ ] **Sem a projeção antes das 17h**: com a chave desligada, "O que esperar da noite" pode mostrar as curvas reais de noites passadas.
