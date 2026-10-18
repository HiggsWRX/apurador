# Combinação de pesquisas e apuração

Type: grilling
Status: claimed
Blocked by: 09, 10
Map: [Apurador 2026](../map.md)

## Question

Na base "Apuração + pesquisas", como o agregado de pesquisas e o placar parcial se combinam numa única projeção, chance de vitória e curva projetada?

- Como o peso das pesquisas cai conforme a apuração avança (no país e em cada UF, já que as UFs chegam em ritmos diferentes).
- Como o modelo usa a diferença entre o que as pesquisas indicavam e o que a apuração mostra nos lugares já totalizados para corrigir os que ainda faltam.
- Como as duas bases convergem e quando a diferença entre elas deixa de ser relevante.
- Ponto de partida: o método da base "Só apuração" decidido em [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md), transferência de votos por UF com correção pelo município. As pesquisas entram como estimativa inicial da referência nacional e das UFs, e perdem peso conforme os municípios chegam.
- Contexto de [Métodos de projeção da apuração](05-metodos-de-projecao.md): um projeto aberto relata ganho de no máximo 0,05 p.p. ao usar pesquisas como ponto de partida durante a apuração. O valor das pesquisas está antes e no começo da apuração, e o modelo precisa mostrar isso de forma honesta.
- Como validar: rodar a combinação sobre 2018 e 2022 com as pesquisas da época, para o histórico de acerto que vai para a página de metodologia.

O que esta combinação recebe pronto de [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md):

- O agregado é só do Brasil e fica congelado às 23h de 24/10. Na eleição, a incerteza é normal, de 1,5 ponto na participação, e o erro é o mesmo em todos os lugares.
- Em cada lugar, esta base **começa** da indicação das pesquisas: o placar entre finalistas do lugar no 1º turno mais a mudança nacional (agregado − 51,0). Em 18/10 essa mudança é de ~0, então as duas bases partem quase do mesmo ponto.
- Fica para este ticket a incerteza local da indicação das pesquisas em cada lugar, isto é, quanto os lugares se afastam da mudança nacional, e como ela convive com a incerteza da base "Só apuração".
- A validação em 2018 e 2022 usa o `pesquisas-historicas.csv`, com a incerteza de cada ano calculada sem aquele ano.
