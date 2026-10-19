# 28: Calibração

Status: resolved
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

- [x] **Candidatos registrados antes de rodar**:
  - incerteza regional e nacional: 0,5, 1, 1,5 ou 2 p.p.;
  - peso do próprio município: 1.000, 3.000 ou 10.000 votos;
  - ordem de chegada: "mistura", "1º turno" ou "ritmo da noite";
  - K: 0,25%, 0,5%, 1% ou 2%;
  - limite de "sem sinal de virada": 5%, depois 2%, depois 1%;
  - zona: sim ou não.
- [x] **Regra das constantes do modelo**, nesta ordem:
  1. cobertura de 95% em pelo menos 95% das rodadas depois de 1% das seções, em cada noite;
  2. quem perdeu nunca passa de 95% de chance depois de 5%;
  3. menor erro médio entre 5% e 50%;
  4. no empate (menos de 0,05 p.p.), a incerteza mais larga.
- [x] **K**: os casos são o 2º turno de 2022 com o agregado real e deslocado 2 pontos para cada lado, o 2º turno de 2018 com o agregado real e o 1º turno de 2026 com as pesquisas entre os dois finalistas (as 12 da regra do agregado, com erro de −3,8 na margem, por decisão do dono em 19/10: ver o [ticket 05](05-historico-das-pesquisas.md)). Fica o K com o menor erro no pior caso entre 0,1% e 5% das seções, mantendo a cobertura de 95% em todos.
- [x] **Sinal de virada**: o limite de 50% fica. O de 5% passa só se, em todas as rodadas, nas duas bases e com as pesquisas deslocadas:
  - no Brasil e nas UFs, "sem sinal de virada" nunca aparece antes de uma virada real;
  - nos municípios, no máximo 5% dos momentos com "sem sinal de virada" são seguidos de virada.

  Se falhar, o limite cai para 2% e depois para 1%.
- [x] **Zona**: o modelo aceita zonas nos 190 municípios com mais de uma. A zona entra só se reduzir o erro entre 5% e 50% em pelo menos 0,05 p.p. em todas as noites, sem piorar a cobertura. Se não reduzir, ou se o teste não estiver pronto no fim de 21/10, fica o município.
- [x] **Constantes congeladas**: as escolhidas vão para o arquivo de constantes no fim de 21/10, e o coletor, o simulador e a metodologia passam a usá-las.
- [x] **Registro da calibração**: traz os candidatos, os números por noite e o valor escolhido de cada constante.
- [x] **Noites momento a momento**: por noite, o % de seções, o placar parcial e a projeção com a incerteza nas duas bases. Em 2022, também com o agregado deslocado. Saem em CSV, para a metodologia.

## Comments

- 19/10/2026, do [ticket 08](08-base-apuracao-mais-pesquisas.md):
  - O executor roda uma base por chamada: `executarNoite(modelo, noite, constantes)` na "Só apuração" e `executarNoite(modelo, noite, constantes, { agregado })` na "Apuração + pesquisas". Cada uma tem o próprio resumo (erro, cobertura, Brier).
  - Os momentos são os mesmos nas duas, com o mesmo instante, % de seções e placar parcial. O CSV momento a momento junta as linhas pela posição.
  - K é `secoesDasPesquisas` nas constantes: um candidato é `{ ...constantes, secoesDasPesquisas: 1 }`.
  - O agregado deslocado é `{ ...agregado, valor: agregado.valor ± 2 }`. Os agregados das noites saem do `agregadoDaNoite` do `pipeline`, no 1º finalista da base do modelo (2026-1: Flávio 48,87).
  - Na noite de 2022, com K = 0,5%, o maior erro entre 0,1% e 5% das seções é de 1,74 na "Só apuração", 1,12 com o agregado real, 1,74 com +2 para Lula e 1,03 com +2 para Bolsonaro. A tabela completa está nos comentários do ticket 08.
  - O executor não tem o momento de 0%. Para ele, use o `projetar` sobre a apuração sem nada totalizado.
  - O teste do sinal de virada "nas duas bases" tem os municípios da base com pesquisas no mesmo `projetar`. Neles, a incerteza nacional e a da UF das pesquisas não caem com a correção pelo próprio placar, como no protótipo.

**19/10/2026, resolvido na branch `ticket/28-calibracao`, à espera da revisão do dono:**

- **Registro antes de rodar**: o `docs/calibracao.md` traz as noites, os candidatos e a regra em cinco passos, num commit (`054571b`) anterior ao primeiro que roda a calibração. Os resultados entram abaixo, gerados.
- **Decisões do dono em 19/10, antes de rodar**, que a regra das decisões deixava em aberto:
  - as "rodadas" da regra são as fotografias do executor de noites;
  - a incerteza regional e a nacional são escolhidas juntas, nas 16 combinações, e o empate fica com a maior margem média;
  - a ordem de chegada é escolhida pelo erro da curva projetada do Brasil contra a curva real, com a "mistura" no empate;
  - no sinal de virada, conta como virada a troca de quem lidera o placar parcial num momento seguinte com 3% das seções do lugar, mesmo que ela se desfaça;
  - a fotografia de um ponto conta como o ponto, mesmo meia seção abaixo dele. A de 0,1% de 2022 tem 0,09998%, e o ticket 08 a deixou de fora na conta do maior erro de 0,1% a 5%: com ela, o +2 para Bolsonaro erra 1,60, e não 1,03. O 1,12 de lá é 1,1146.
- **Código** (`packages/ensaio`):
  - `calibracao.ts`: as medidas e as regras de cada passo, e o `calibrar`, que roda os cinco na ordem;
  - `noites-da-calibracao.ts`: as três noites do repositório, com o agregado da véspera e a base por zona;
  - `registro-da-calibracao.ts`: a seção "Resultados" e os CSVs;
  - `npm run calibracao` (~1 min) regrava o registro e os CSVs, e `-- --congelar` grava as escolhidas no arquivo de constantes.
- **Escolhidas**, congeladas em 19/10 no `packages/modelo/constantes.json` (o dono preferiu não esperar o fim de 21/10):

  | Constante | Provisória | Escolhida |
  |---|---|---|
  | Incerteza regional e nacional | 1 e 1 p.p. | 2 e 2 p.p. |
  | Peso do próprio município | 3.000 votos | 10.000 votos |
  | Ordem de chegada | "mistura" | "mistura" |
  | K | 0,5% | 0,25% |
  | Limite de "sem sinal de virada" | 5% | 2% |
  | Zona | não | não |

- **Achados**:
  - **As incertezas sempre empatam.** Elas mudam a margem, e não a projeção, então dão o mesmo erro médio, e a regra do empate escolhe a maior que passa, 2 e 2. A margem média de 5% a 50% das seções dobra (de ~1,5 para ~3,0 p.p.), a cobertura vai a 100% nas três noites, e a chance fica menos firme (em 2022, quem perdeu chega a 38,9% depois de 5%, contra 30,3%). O dono decidiu congelar como saiu, pela regra registrada.
  - **K**: o pior caso é sempre o 1º turno de 2026, e o 0,25% ganha do 0,5% por 0,02 p.p. (2,00 contra 2,02).
  - **Sinal de virada**: o limite de 5% falha só no Brasil, em 2022 com +2 para Lula, às 17:00:55, com 0,1% das seções. Só o Exterior tinha chegado, Lula tinha 54,3%, e a chance de virada de Bolsonaro era de 3,12%. Ele passou à frente minutos depois. O de 2% passa em tudo.
  - **Zona**: piora o erro médio em 2022 (0,089 p.p.) e em 2026 (0,037) e melhora só 0,027 em 2018. Fica o município.
  - **A noite de 2026-1 não parte do agregado**: antes da primeira seção, a base com pesquisas dá 48,78, e não 48,87, e a "Só apuração" dá 47,06, e não 47,14. A base é o 1º turno de 2022, pesado pelos eleitores da geografia de 2026. Em 2022 e em 2018, as duas ficam a menos de 0,001. Na noite de 25/10, a base é do mesmo ano. Não foi mexido aqui.
- **Modelo e pipeline**:
  - o `baseDoModelo` divide em zonas, com as zonas da noite, o município com mais de uma e as mesmas no turno da base. O que mudou de zonas fica inteiro (4 em 2026, entre eles São Paulo);
  - o `npm run noites` grava `dados/bases/<noite>-zonas.json` para as três noites (+3,8 MB), e as noites e bases de antes saem iguais;
  - um município da base do modelo pode ser a parte de uma zona, e o executor leva cada zona da noite à sua parte. Sai do modelo `apuracaoAntesDaPrimeiraSecao`;
  - a zona vira uma constante (`zona`), que o modelo não lê;
  - o modelo exporta `CONSTANTES_PROVISORIAS`, e os testes do modelo as usam, porque o porte fiel e o executor têm as referências delas.
- **Revisão** (`/code-review`). Corrigidos:
  - "mais de 1%" e "mais de 5%" deixam de fora a fotografia do ponto, como no registro. A cobertura do executor contava a de 1% só porque ela cai acima de 1 nas três noites. As escolhas não mudaram;
  - o passo 5 roda com as constantes dos passos 1 a 3;
  - o registro mostra o empate do passo 1 que decidiu a escolha;
  - a cópia da apuração antes da primeira seção;
  - a tolerância do placar de 17,22%, um teste que passava por construção e as bases por zona conferidas contra os totais oficiais.

  Ficaram de fora:
  - "candidato" para o valor de uma constante (`CANDIDATOS`, `CandidatoDoPasso1`), que é o termo do ticket e das decisões;
  - o escritor do registro e dos CSVs sem teste próprio;
  - repetições pequenas entre os passos (os laços de soma do sinal, o "fica o melhor");
  - a tolerância de 0,05 p.p. acima do ponto nas fotografias, contra 0,0077 de maior passagem nas três noites.
- **Para os próximos**: notas nos comentários dos tickets 17, 18, 24 e 29.
