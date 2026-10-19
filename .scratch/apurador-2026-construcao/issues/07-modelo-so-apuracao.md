# 07: Modelo "Só apuração": porte fiel do protótipo

Status: resolved
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

- [x] **Método**: transferência de votos estimada por UF nos municípios já apurados, com recuo UF → região → Brasil → 1º turno e mínimo de 2.000 votos válidos por nível. Cada município mistura essa estimativa com o próprio placar parcial e pesa metade com 3.000 votos apurados.
- [x] **Recuo "1º turno"**: parte do placar entre finalistas do lugar, e não do meio a meio do protótipo (`par = 0,5`). É a única diferença deliberada em relação a ele.
- [x] **Exterior**: tem projeção própria e, no lugar da região, recua para o Brasil.
- [x] **Incerteza**: analítica e normal. Soma o erro da referência de cada UF (UFs que herdam a mesma referência erram juntas), a incerteza regional (1 p.p.), a nacional comum a todo o voto que falta (1 p.p.) e a dispersão dos municípios.
- [x] **Chance de vitória**: a probabilidade de passar de 50%, para cada lugar, pela mesma fórmula restrita ao voto que falta do lugar.
- [x] **Antes da primeira seção**: a projeção é o placar entre finalistas do lugar, com a incerteza mais larga.
- [x] **Curva projetada**: sai para o Brasil, cada UF e o Exterior, com a faixa de 95%. A ordem "mistura" é a média entre o ritmo do 1º turno e o ritmo observado de cada UF. Antes da apuração, usa a ordem do 1º turno.
- [x] **Virada projetada**: ponto e faixa (de quando a margem de quem está atrás encosta em 50% até quando a curva toda passa).
- [x] **Sinal de virada**: a chance de virada é a chance de vitória de quem está atrás no placar parcial. Dá três estados: virada projetada (≥ 50%), virada possível (5–50%) e sem sinal de virada (< 5%). Os limites são parâmetros.
- [x] **Porte fiel**: no 2º turno de 2022 (base: 1º turno de 2022), com as constantes provisórias, os números são os do protótipo com diferença de até 0,01 p.p. Ficam de fora os momentos em que alguma UF usa o recuo "1º turno", ou o protótipo roda com a mesma correção.
- [x] **Executor de noites**: reproduz a ordem de grandeza da tabela do ticket 09: erro de ~0,11, ~0,37 e ~0,47 p.p. com 5%, 25% e 50% das seções, e o resultado dentro da margem de 95% em ~98% dos momentos.
- [x] **Desempenho**: uma projeção completa, com curva, sobre todos os municípios leva poucos milissegundos.
- [x] **Fórmulas fixas**: as constantes ficam num arquivo de dados versionado, sem nada treinado.

## Comments

**19/10/2026, resolvido:**

- **Módulo**: `packages/modelo` dá `prepararModelo` (a base em vetores), `projetar` (Brasil, cada UF, Exterior e município: projeção, margem, chance de vitória, chance de virada, sinal de virada, votos válidos projetados, a referência de cada UF e a virada projetada de cada município), `curvaProjetada` (Brasil, cada UF e Exterior, com o desvio de cada ponto e a virada projetada), `sinalDeVirada`, `momentosDaNoite` e `executarNoite`. As fatias são do 1º finalista da base. As constantes ficam em `packages/modelo/constantes.json`, conferidas por `lerConstantes`. Ficaram fora de `dados/`, onde o teste do manifesto só aceita derivados do TSE.
- **Porte fiel**: o módulo `Projecao` do protótipo está copiado sem mudança em `packages/modelo/test/prototipo/projecao.js`, só para os testes. Ele roda sobre os mesmos 106 momentos da noite de 2022. No Brasil, projeção, desvio, chance de vitória, curva e virada batem com diferença abaixo de 10⁻¹². A única exceção é o início da faixa da virada, que difere até 0,002 p.p., porque o modelo usa 1,959964 e o protótipo usa 1,96. O voto que falta e a fatia de cada município também batem. Em mais de 100 casos, cada UF bate com o protótipo rodado só sobre ela: são os momentos em que nada da UF vem do país.
- **Executor**: na noite de 2022, o erro é de 0,11, 0,37 e 0,47 p.p. com 5, 25 e 50% das seções. A cobertura é de 98,1% (98,0% depois de 1%). A projeção acerta o vencedor desde 0,1% e dá chance de 95% ou mais desde 68,0%, com Brier de 0,032. É a tabela do ticket 09.
- **Desempenho**: a projeção completa com as curvas, sobre os 5.751 municípios, leva ~4 ms. O teste mede com o relógio real, apesar da regra de determinismo da especificação, porque o critério pede o tempo. Ele não decide nenhum número, e o teto é largo (20 ms).
- **Para o dono decidir: o recuo "1º turno"**. Nele, além de cada município partir do próprio placar entre finalistas, os válidos esperados contam só os votos dos dois finalistas no 1º turno. Sem isso, o Brasil de 2026 partiria de 51,24 para Flávio, e não de 51,01, porque os eliminados votaram mais onde Flávio é forte (Goiás). Com isso, cada lugar parte exatamente do próprio placar, como pede o critério. O recuo só vale enquanto o Brasil tem menos de 2.000 votos válidos, e o porte fiel não usa esses momentos. Mesmo assim, é uma segunda diferença em relação ao protótipo, dentro do mesmo recuo.
- **Diferença em relação ao protótipo na curva**: antes de 2% das seções, toda ordem usa o 1º turno, como pede a especificação. Na ordem "ritmo da noite", o protótipo usava ali a ordem "proporcional", que dá uma curva reta antes das 17h. A "mistura" não muda.
- **Achado para a calibração (28) e para o ticket 18**: no Brasil, a margem cobre o resultado em 98% dos momentos. Restrita ao voto que falta de um lugar, ela fica estreita no fim da noite. Nas UFs, cobre 89% dos momentos da noite de 2022. Nos municípios, cobre 72% com 50% das seções e 55% com 90%. O peso do próprio município tira a dispersão justo quando sobram poucas seções, e o 1 p.p. regional e nacional não cobre a deriva das seções tardias de um município. O método segue as decisões. Vale medir isso na calibração antes de a página de município mostrar a margem. O executor resume só o Brasil, e a calibração vai precisar das UFs e dos municípios (sinal de virada).
- **Para os próximos**:
  - 08 entra pela estimativa do voto que falta em `projetar`.
  - 17 e 18 leem `projetar` e `curvaProjetada`. A curva de cada UF tem os pontos espalhados por igual no % de seções dela. Ela salta no último ponto quando a UF está atrás do ritmo do país, porque o ritmo da noite não a termina antes de 100% do país (o Brasil do protótipo faz o mesmo).
  - O `src/normal.ts` é idêntico ao do ticket 04, para as branches se juntarem sem conflito.
  - Os testes leem a noite e a base com o `@apurador/pipeline`, por isso o `modelo` tem uma devDependency dele. Quando o `pipeline` usar o `modelo`, a dependência fica circular só nos testes.
  - A zona ainda não entra no modelo.
  - Os limites internos do protótipo (300 aptos, erro de 2 e 4 p.p. das referências herdadas, 5 municípios, fatia entre 1 e 99%, 2% das seções na curva) seguem no código.
- **Vocabulário**: "executor de noites", "referência" (da transferência de votos) e "fotografia" (os momentos fixos do protótipo) não estão no glossário. Vale registrá-los com o `/domain-modeling`.
