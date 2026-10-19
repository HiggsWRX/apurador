# Calibração das constantes do modelo

Ticket: [28, Calibração](../.scratch/apurador-2026-construcao/issues/28-calibracao.md). Decisões: [Ensaio geral](../.scratch/apurador-2026/issues/15-ensaio-geral.md) (13 a 18), [Combinação de pesquisas e apuração](../.scratch/apurador-2026/issues/11-combinacao-pesquisas-e-apuracao.md) (4), [Sinal de virada](../.scratch/apurador-2026/issues/23-sinal-de-virada.md) e [Segunda consulta jurídica](../.scratch/apurador-2026/issues/21-segunda-consulta-juridica.md) (3).

A calibração escolhe as constantes fixas do modelo em três noites passadas, entre valores listados antes e por uma regra escrita antes. Ela não treina nada: o modelo usa fórmulas fixas, e cada constante sai de uma lista curta, pela regra abaixo. A liberação jurídica do modelo depende disso.

Os candidatos e a regra foram registrados em 19/10/2026, num commit anterior ao primeiro que roda a calibração. Os números entram depois, em [Resultados](#resultados).

## Noites

| Noite | Base do modelo | Agregado de pesquisas da noite |
|---|---|---|
| 2º turno de 2022 | 1º turno de 2022 | o real (Lula 50,98) e o deslocado 2 pontos para cada candidato |
| 2º turno de 2018, inteiro | 1º turno de 2018 | o real |
| 1º turno de 2026 | 1º turno de 2022, na geografia de 2026 | as 12 pesquisas entre os dois finalistas pela regra do agregado (Flávio 48,87), com erro de −3,8 na margem ([ticket 05](../.scratch/apurador-2026-construcao/issues/05-historico-das-pesquisas.md), decisão do dono em 19/10) |

As noites são as reconstruídas seção por seção do `dados/noites/`, e as bases, as do `dados/bases/`. Os agregados saem do `agregadoDaNoite` do `pipeline`, com a incerteza de 1,5 ponto da noite.

**Momentos**: as fotografias do executor de noites, isto é, a primeira chegada que alcança 0,1, 0,25, 0,5 e 0,75% das seções, cada ponto inteiro de 1 a 99%, 99,5 e 99,9%, mais o fim da noite. Onde a regra das decisões diz "rodadas", valem esses momentos (decisão do dono, 19/10): é a medida do protótipo e do ticket 09, e dá o mesmo peso a cada trecho da apuração.

## Candidatos

| Constante | Candidatos |
|---|---|
| Incerteza regional | 0,5, 1, 1,5 ou 2 p.p. |
| Incerteza nacional | 0,5, 1, 1,5 ou 2 p.p., escolhida junto com a regional, em todas as combinações (decisão do dono, 19/10) |
| Peso do próprio município | 1.000, 3.000 ou 10.000 votos |
| Ordem de chegada | "mistura", "1º turno" ou "ritmo da noite" |
| K (o % de seções que as pesquisas valem) | 0,25%, 0,5%, 1% ou 2% |
| Limite de "sem sinal de virada" | 5%, depois 2%, depois 1% |
| Zona | sim ou não |

Ficam fora da calibração, com os valores das decisões: o limite de "virada projetada" (50%), o mínimo de 2.000 votos válidos por nível da referência e os coeficientes da incerteza local das pesquisas (0,13 na UF e 0,15 no município).

## Regra

A escolha anda em passos, nesta ordem, e cada passo usa as constantes escolhidas nos anteriores. Se nenhum candidato passar num passo, a calibração não escolhe sozinha: o registro mostra os números, e o dono decide antes do congelamento.

**Medidas**, sempre no Brasil:

- **Erro**: a distância, em pontos percentuais, entre a projeção e o resultado final.
- **Cobertura**: a fração dos momentos com mais de 1% das seções em que o resultado final fica dentro da margem de 95%.
- **Chance de quem perdeu**: a chance de vitória do candidato que perdeu a noite.

### 1. Incerteza regional, incerteza nacional e peso do próprio município

São 48 candidatos (4 × 4 × 3), rodados nas três noites na base "Só apuração".

1. **Cobertura**: de pelo menos 95% em cada noite.
2. **Chance honesta**: em cada noite, nos momentos com mais de 5% das seções, a chance de quem perdeu nunca passa de 95%.
3. **Erro**: entre os que passam, fica o de menor erro médio entre 5% e 50% das seções. O erro médio de uma noite é a média do erro nos momentos de 5% a 50% das seções, e o do candidato é a média das três noites, com o mesmo peso para cada uma.
4. **Empate**: os candidatos a menos de 0,05 p.p. do menor erro médio empatam. Entre eles, fica a incerteza mais larga: o de maior margem de 95% média, nos mesmos momentos e com a mesma média do erro. Isso ordena também o peso do próprio município, porque um peso maior deixa mais dispersão no voto que falta.

### 2. Ordem de chegada

A ordem de chegada só muda a curva projetada, e não a projeção, então o passo 1 não a separa (decisão do dono, 19/10). Ela é escolhida pelo **erro da curva**, na base "Só apuração":

- em cada momento de 5% a 50% das seções, a distância média, em pontos percentuais, entre cada ponto da curva projetada do Brasil depois do placar de agora e o placar parcial real da noite com o mesmo % de seções totalizadas (o da primeira chegada que alcança aquele %);
- o erro da curva de uma noite é a média desses momentos, e o da ordem é a média das três noites.

Fica a ordem de menor erro da curva. Se a "mistura" ficar a menos de 0,05 p.p. dela, fica a "mistura".

### 3. K

Os casos são cinco, na base "Apuração + pesquisas": o 2º turno de 2022 com o agregado real, com +2 para Lula e com +2 para Bolsonaro; o 2º turno de 2018 com o agregado real; e o 1º turno de 2026 com as pesquisas entre os dois finalistas.

- Em cada caso, mede-se o maior erro nos momentos de 0,1% a 5% das seções. O pior caso de um K é o maior desses cinco erros.
- Fica o K de menor pior caso, entre os que têm cobertura de pelo menos 95% nos cinco casos.

### 4. Sinal de virada

O limite de 50% fica. O de "sem sinal de virada" é posto à prova em 5%, depois em 2% e depois em 1%, e fica o primeiro que passa.

- **Execuções**: as três noites nas duas bases, mais o 2º turno de 2022 com o agregado deslocado 2 pontos para cada candidato. São oito.
- **Lugares**: o Brasil, cada UF, o Exterior e cada município.
- **"Sem sinal de virada"**: um momento em que o lugar tem seções totalizadas sem ter terminado (mais de 0% e menos de 100%), alguém está atrás no placar parcial e a chance de virada fica abaixo do limite.
- **Seguido de virada**: em algum momento seguinte da noite, com pelo menos 3% das seções do lugar totalizadas, quem lidera o placar parcial do lugar é outro. Conta a troca no placar mesmo que ela se desfaça depois, contada como a narração conta, a partir de 3% das seções do lugar (decisão do dono, 19/10). É o que o visitante veria anunciado como virada.
- **Passa** se, nas oito execuções:
  - no Brasil, nas UFs e no Exterior, nenhum momento "sem sinal de virada" é seguido de virada;
  - nos municípios, em cada execução, no máximo 5% dos momentos "sem sinal de virada" são seguidos de virada.

### 5. Zona

O modelo aceita zonas nos municípios com mais de uma: cada zona entra como uma parte do município, com o 1º turno e o perfil de chegada dela. Quando as zonas de um município mudaram entre a base e a noite (São Paulo tinha 58 em 2022 e tem 57 em 2026), ele fica inteiro.

- Com as constantes dos passos 1 a 3, na base "Só apuração", a zona entra só se, em cada uma das três noites, reduzir o erro médio entre 5% e 50% das seções em pelo menos 0,05 p.p. sem baixar a cobertura.
- Se não reduzir, ou se o teste não estiver pronto no fim de 21/10, fica o município.

## Saídas

- **Este registro**, com os números por noite e o valor escolhido de cada constante.
- **As tabelas e as noites momento a momento**, em CSV, em `docs/calibracao/`. As noites trazem, por momento, o % de seções, o placar parcial e a projeção com a margem e a chance de vitória nas duas bases, e, em 2022, também com o agregado deslocado.
- **O arquivo de constantes** (`packages/modelo/constantes.json`), com os valores escolhidos, congelado no fim de 21/10. O coletor, o simulador e a metodologia o leem.

## Resultados

Entram depois de rodar, num commit seguinte a este.
