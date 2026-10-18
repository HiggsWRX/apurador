# 07: Modelo "Só apuração": porte fiel do protótipo

Status: ready-for-agent
Blocked by: 06
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O módulo `modelo`, puro, sem rede nem DOM, com a base "Só apuração" portada do módulo `Projecao` do protótipo (branch `prototipo/metodo-projecao`). Ele dá, para cada lugar (Brasil, UF, Exterior e município), estes resultados:

- a projeção com a margem de 95% e a chance de vitória;
- a curva projetada com a ordem de chegada "mistura";
- a virada projetada como ponto mais faixa;
- a chance de virada e o estado do sinal de virada.

Ele traz também o executor de noites, que roda uma noite inteira e resume o erro, a cobertura e a chance honesta. As constantes entram como parâmetros, com os valores provisórios, num arquivo de dados versionado.

Decisões: [Método de projeção só com a apuração](../../apurador-2026/issues/09-metodo-projecao-so-apuracao.md), [Sinal de virada](../../apurador-2026/issues/23-sinal-de-virada.md) e a nota de implementação da [Combinação de pesquisas e apuração](../../apurador-2026/issues/11-combinacao-pesquisas-e-apuracao.md).

## Critérios de aceite

- [ ] **Método**: transferência de votos estimada por UF nos municípios já apurados, com recuo UF → região → Brasil → 1º turno e mínimo de 2.000 votos válidos por nível. Cada município mistura essa estimativa com o próprio placar parcial e pesa metade com 3.000 votos apurados.
- [ ] **Recuo "1º turno"**: parte do placar entre finalistas do lugar, e não do meio a meio do protótipo (`par = 0,5`). É a única diferença deliberada em relação a ele.
- [ ] **Exterior**: tem projeção própria e, no lugar da região, recua para o Brasil.
- [ ] **Incerteza**: analítica e normal. Soma o erro da referência de cada UF (UFs que herdam a mesma referência erram juntas), a incerteza regional (1 p.p.), a nacional comum a todo o voto que falta (1 p.p.) e a dispersão dos municípios.
- [ ] **Chance de vitória**: a probabilidade de passar de 50%, para cada lugar, pela mesma fórmula restrita ao voto que falta do lugar.
- [ ] **Antes da primeira seção**: a projeção é o placar entre finalistas do lugar, com a incerteza mais larga.
- [ ] **Curva projetada**: sai para o Brasil, cada UF e o Exterior, com a faixa de 95%. A ordem "mistura" é a média entre o ritmo do 1º turno e o ritmo observado de cada UF. Antes da apuração, usa a ordem do 1º turno.
- [ ] **Virada projetada**: ponto e faixa (de quando a margem de quem está atrás encosta em 50% até quando a curva toda passa).
- [ ] **Sinal de virada**: a chance de virada é a chance de vitória de quem está atrás no placar parcial. Dá três estados: virada projetada (≥ 50%), virada possível (5–50%) e sem sinal de virada (< 5%). Os limites são parâmetros.
- [ ] **Porte fiel**: no 2º turno de 2022 (base: 1º turno de 2022), com as constantes provisórias, os números são os do protótipo com diferença de até 0,01 p.p. Ficam de fora os momentos em que alguma UF usa o recuo "1º turno", ou o protótipo roda com a mesma correção.
- [ ] **Executor de noites**: reproduz a ordem de grandeza da tabela do ticket 09: erro de ~0,11, ~0,37 e ~0,47 p.p. com 5%, 25% e 50% das seções, e o resultado dentro da margem de 95% em ~98% dos momentos.
- [ ] **Desempenho**: uma projeção completa, com curva, sobre todos os municípios leva poucos milissegundos.
- [ ] **Fórmulas fixas**: as constantes ficam num arquivo de dados versionado, sem nada treinado.
