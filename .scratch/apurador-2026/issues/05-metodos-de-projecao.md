# Métodos de projeção da apuração

Type: research
Status: resolved
Blocked by: —
Map: [Apurador 2026](../map.md)

## Question

Que métodos já foram usados para projetar, durante a apuração, o resultado final de uma eleição a partir de resultados parciais, e quais são viáveis para nós?

- Casos brasileiros: veículos (Estadão, Folha, G1/Globo, UOL, Núcleo, Agência Lupa), projetos open source e trabalhos acadêmicos, sobretudo na virada de 2022.
- Casos estrangeiros de referência: NYT "needle", The Economist, Decision Desk HQ, modelos de "votos restantes" nos EUA e no Reino Unido.
- Para cada um: entradas usadas, como estima o voto ainda não totalizado (ex.: variação entre turnos por município, regressão demográfica, modelos hierárquicos), como produz incerteza e chance de vitória, como lida com a ordem não aleatória de chegada (Sul/Sudeste cedo, Norte/Nordeste tarde) e desempenho conhecido.
- Como projetar a **curva** (a trajetória do placar parcial até 100%), além do resultado final.

Termine com uma lista curta das opções viáveis para uma equipe pequena com cerca de uma semana, com os prós e contras de cada uma.

## Answer

- Os métodos de noite eleitoral (WaPo, NYT, DDHQ, *exit poll* britânico, CSIR sul-africano, Pavía na Espanha) projetam a **mudança** de cada unidade em relação a uma linha de base da própria unidade e a aplicam às unidades que faltam. Para nós, a linha de base natural é o 1º turno de 2026 (*swing* entre turnos), que absorve boa parte do viés da ordem de chegada.
- No Brasil, o único veículo com método descrito é o Datafolha (pós-estratificação por mesorregião, projeção com 91% das seções em 2022). Projetos abertos de 2026 informam, sem verificação nossa, erro de ±0,1 a 0,2 p.p. com *swing* por seção ou município. A extrapolação ingênua por UF errou cerca de 1 p.p. no 1º turno de 2026.
- A incerteza precisa de erros correlacionados (viés comum por área, simulação hierárquica ou *bootstrap* estratificado). A chance de vitória sai da distribuição da projeção.
- Ninguém publica uma curva projetada. Proposta: curva = projeção por unidade + modelo de ordem de chegada (repetir a ordem do 1º turno de 2026 ou de 2022, ou curvas por UF), com simulação para a faixa e para a chance e o ponto da virada.
- Opções para uma semana: (1) *swing* por município com recuo hierárquico, recomendada; (2) *swing* por seção ou zona, se houver dados; (3) transferência de votos com simulação; (4) pós-estratificação simples como plano B.
- A escolha depende dos tickets 01 (granularidade do *feed* ao vivo), 02 (horário de totalização por seção) e 03 (1º turno de 2026 por seção).

Pesquisa completa: [../research/05-metodos-de-projecao.md](../research/05-metodos-de-projecao.md)
