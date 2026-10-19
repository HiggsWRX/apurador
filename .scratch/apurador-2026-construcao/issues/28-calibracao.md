# 28: Calibração

Status: ready-for-agent
Blocked by: 05, 08, 27
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

A calibração escolhe as constantes do modelo nas três noites (2º turno de 2022, 2º turno de 2018 inteiro e 1º turno de 2026). Os candidatos e a regra de escolha são escritos e registrados antes de rodar. Ela não treina nada: a liberação jurídica do modelo depende disso.

Saem dela:

- o registro da calibração;
- as noites momento a momento, para a metodologia;
- o arquivo de constantes, congelado no fim de 21/10.

Prazo: 20 e 21/10.

Decisões: [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 13 a 18 e comentário da metodologia), [Combinação de pesquisas e apuração](../../apurador-2026/issues/11-combinacao-pesquisas-e-apuracao.md) (decisão 4 e comentários), [Sinal de virada](../../apurador-2026/issues/23-sinal-de-virada.md) e [Segunda consulta jurídica](../../apurador-2026/issues/21-segunda-consulta-juridica.md) (decisão 3).

## Critérios de aceite

- [ ] **Candidatos registrados antes de rodar**:
  - incerteza regional e nacional: 0,5, 1, 1,5 ou 2 p.p.;
  - peso do próprio município: 1.000, 3.000 ou 10.000 votos;
  - ordem de chegada: "mistura", "1º turno" ou "ritmo da noite";
  - K: 0,25%, 0,5%, 1% ou 2%;
  - limite de "sem sinal de virada": 5%, depois 2%, depois 1%;
  - zona: sim ou não.
- [ ] **Regra das constantes do modelo**, nesta ordem:
  1. cobertura de 95% em pelo menos 95% das rodadas depois de 1% das seções, em cada noite;
  2. quem perdeu nunca passa de 95% de chance depois de 5%;
  3. menor erro médio entre 5% e 50%;
  4. no empate (menos de 0,05 p.p.), a incerteza mais larga.
- [ ] **K**: os casos são o 2º turno de 2022 com o agregado real e deslocado 2 pontos para cada lado, o 2º turno de 2018 com o agregado real e o 1º turno de 2026 com as pesquisas entre os dois finalistas (as 12 da regra do agregado, com erro de −3,8 na margem, por decisão do dono em 19/10: ver o [ticket 05](05-historico-das-pesquisas.md)). Fica o K com o menor erro no pior caso entre 0,1% e 5% das seções, mantendo a cobertura de 95% em todos.
- [ ] **Sinal de virada**: o limite de 50% fica. O de 5% passa só se, em todas as rodadas, nas duas bases e com as pesquisas deslocadas:
  - no Brasil e nas UFs, "sem sinal de virada" nunca aparece antes de uma virada real;
  - nos municípios, no máximo 5% dos momentos com "sem sinal de virada" são seguidos de virada.

  Se falhar, o limite cai para 2% e depois para 1%.
- [ ] **Zona**: o modelo aceita zonas nos 190 municípios com mais de uma. A zona entra só se reduzir o erro entre 5% e 50% em pelo menos 0,05 p.p. em todas as noites, sem piorar a cobertura. Se não reduzir, ou se o teste não estiver pronto no fim de 21/10, fica o município.
- [ ] **Constantes congeladas**: as escolhidas vão para o arquivo de constantes no fim de 21/10, e o coletor, o simulador e a metodologia passam a usá-las.
- [ ] **Registro da calibração**: traz os candidatos, os números por noite e o valor escolhido de cada constante.
- [ ] **Noites momento a momento**: por noite, o % de seções, o placar parcial e a projeção com a incerteza nas duas bases. Em 2022, também com o agregado deslocado. Saem em CSV, para a metodologia.

## Comments

- 19/10/2026, do [ticket 08](08-base-apuracao-mais-pesquisas.md):
  - O executor roda uma base por chamada: `executarNoite(modelo, noite, constantes)` na "Só apuração" e `executarNoite(modelo, noite, constantes, { agregado })` na "Apuração + pesquisas". Cada uma tem o próprio resumo (erro, cobertura, Brier).
  - Os momentos são os mesmos nas duas, com o mesmo instante, % de seções e placar parcial. O CSV momento a momento junta as linhas pela posição.
  - K é `secoesDasPesquisas` nas constantes: um candidato é `{ ...constantes, secoesDasPesquisas: 1 }`.
  - O agregado deslocado é `{ ...agregado, valor: agregado.valor ± 2 }`. Os agregados das noites saem do `agregadoDaNoite` do `pipeline`, no 1º finalista da base do modelo (2026-1: Flávio 48,87).
  - Na noite de 2022, com K = 0,5%, o maior erro entre 0,1% e 5% das seções é de 1,74 na "Só apuração", 1,12 com o agregado real, 1,74 com +2 para Lula e 1,03 com +2 para Bolsonaro. A tabela completa está nos comentários do ticket 08.
  - O executor não tem o momento de 0%. Para ele, use o `projetar` sobre a apuração sem nada totalizado.
  - O teste do sinal de virada "nas duas bases" tem os municípios da base com pesquisas no mesmo `projetar`. Neles, a incerteza nacional e a da UF das pesquisas não caem com a correção pelo próprio placar, como no protótipo.
