# Simulador "e se"

Type: grilling
Status: open
Blocked by: 11, 12
Map: [Apurador 2026](../map.md)

## Question

Que hipóteses o visitante pode ajustar no simulador "e se", como cada uma entra no modelo e como o resultado aparece na tela?

- Candidatas a ajuste: desempenho de um candidato numa região ou UF em relação ao 1º turno, confiança nas pesquisas, comparecimento, transferência dos votos de quem não foi ao 2º turno.
- O simulador funciona antes e durante a apuração? Durante, os ajustes valem só para o que ainda não foi totalizado?
- Fato útil de [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md): uma projeção completa, com curva, sobre os 5.751 municípios leva poucos milissegundos no navegador, então o simulador pode recalcular a cada ajuste.
- Como evitar que a simulação seja confundida com a projeção oficial do site, e se ela pode ser compartilhada por link.
- De [Arquitetura e tecnologia](08-arquitetura-e-tecnologia.md): o simulador é o único lugar onde o modelo roda no navegador. Ele baixa, ao abrir, um arquivo completo com os dados por município, que o coletor republica a cada rodada (decisões 1 e 18).
- De [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md): o site não desloca o centro pelo viés do 1º turno (as pesquisas subestimaram Flávio em 1,4 ponto na participação). Por isso, "e se o viés do 1º turno se repetir?" é um ajuste natural. Com o agregado em 51,0 e incerteza de 1,5, a chance de Flávio vai de ~75% a ~84% com 40% do viés e a ~95% com ele inteiro. "Confiança nas pesquisas" pode ser a própria mudança nacional do agregado.
