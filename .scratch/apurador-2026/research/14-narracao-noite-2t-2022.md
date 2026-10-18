# Narração da noite: eventos medidos no 2º turno de 2022

Medição para as regras da "narração da noite" (feed de eventos gerado a partir da apuração ao vivo). Eleição: 2º turno de 30/10/2022, Presidente, Lula × Bolsonaro. Feita em 18/10/2026.

**Todos os números são medidos** (cálculo sobre os arquivos oficiais do TSE, seção 0), salvo o que estiver marcado como *inferência*.

## Resumo

1. **Ritmo Brasil:** 50% das seções às 18:26:53, 90% às 19:09:26 e 99% às 20:00:46. O 100% só vem às 00:18:04 de 31/10: o último 1% leva 4h17.
2. **Virada Brasil:** a série exata tem 6 trocas de líder. A primeira é às 17:07:59, com 0,25% das seções (ruído do começo). As outras cinco ficam entre 18:42:53 e 18:44:50. **Amostrando a cada 20 s (fase :00), só aparecem 2:** às 17:08:00 (0,26%) e às 18:44:00 (67,74%). Em 7 das 20 fases possíveis aparecem 4. A 60 s, aparecem sempre 2.
3. **Trocas por UF são raras:** só 4 trocas depois de a UF passar de 3% das suas seções, em 3 UFs (MG 2, AM 1, AP 1). Abaixo de 3% houve 23 trocas, em 13 UFs. Os limiares de 3%, 5% e 10% dão o mesmo resultado. O de 25% corta só a 1ª troca de MG (15,8%).
4. **UFs fechando:** nenhuma UF chega a 100% antes das 19h. 7 chegam até as 20h e 21 até as 22h. As outras 7 fecham depois das 22h, e o AM só às 00:18. No marco de 99%, 22 UFs chegam antes das 20h.
5. **Municípios:** 46,6% dos 5.570 mudam em mais de 10 rodadas de 20 s (mediana: 10 rodadas). 531 municípios têm alguma troca de líder depois de 3% das suas seções (824 trocas no total). Depois de 25%, são 366 municípios (532 trocas). O pico é de 198 municípios chegando a 100% numa só rodada, às 19:27:00. A mediana entre 17h e 20h é de 6 por rodada.
6. **Onde está o que falta:** o Sudeste tem 41% das seções do país, mas é 51% do que falta quando o Brasil chega a 50%, e 60% quando chega a 99%. O Nordeste fica em ~30% do que falta a noite toda.
7. **Densidade do conjunto de regras candidato:** 70 eventos na noite. São no máximo 7 por janela de 10 min (17:50–18:00) e no máximo 3 numa mesma rodada de 20 s (18:44:00). Das 20:10 às 20:30 não há nenhum evento. Depois das 21h há 15 eventos, todos "UF chegou a 100%" ou o 100% do Brasil.

---

## 0. Fontes, método e validação

**Fontes (baixadas em 18/10/2026):**

- [`detalhe_votacao_secao_2022.zip`](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_secao/detalhe_votacao_secao_2022.zip), membro `detalhe_votacao_secao_2022_BR.csv`, lido por HTTP *Range* (59,5 MB comprimido; `DT_GERACAO` 15/02/2024). Filtrei `NR_TURNO = 2` e `DS_CARGO = Presidente`: 472.075 seções, sem duplicatas, 47 não instaladas, todas com `DT_PRIM_TOT_PARCIAL_HOR_TSE` em 30 ou 31/10.
- `bweb_2t_<UF>_311020221535.zip`, os 28 zips por UF do [conjunto de boletins de urna de 2022](https://dadosabertos.tse.jus.br/dataset/resultados-2022-boletim-de-urna) (67 MB). Deles saem os votos 13 e 22 por seção: 60.345.999 para Lula e 58.206.354 para Bolsonaro, o resultado oficial. Toda linha do `bweb` achou sua seção no `detalhe`. 48 seções ficaram sem votos para os dois candidatos: as 47 não instaladas e 1 instalada.
- [`Historico_Totalizacao_Presidente_BR_2T_2022.zip`](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/Historico_Totalizacao_Presidente_BR_2T_2022.zip), só para validar.
- O protótipo `prototipos/metodo-projecao/` não serve aqui. O HTML embute só "fotos" em cortes de % nacional (0,1%, 0,25%, …, 1% a 99%, 99,5%, 99,9%), com a hora do corte e os deltas por município. Ele não tem hora por seção, e por isso não dá para amostrar a cada 20 s.

**Método:**

- Uma seção conta como totalizada no instante T se `DT_PRIM_TOT_PARCIAL_HOR_TSE ≤ T`. Ela entra com os votos finais do `bweb`.
- O **placar** é Lula / (Lula + Bolsonaro). No 2º turno, isso é o % dos válidos.
- O **% de seções** usa como denominador todas as seções do `detalhe` daquele recorte (Brasil, UF ou município), inclusive as não instaladas.
- **Amostragem:** T = 17:00:00 + k × passo. A rodada k recebe as seções com horário em (T − passo, T].
- **Troca de liderança:** o líder do placar acumulado é diferente do último líder não empatado. Um empate não gera troca. A troca é atribuída à rodada em que ela aparece, com o % do recorte nessa rodada.
- **Hora dos marcos** (seções 1, 3, 4, 6 e 7): o segundo exato em que o recorte atinge o %. Na seção 8, os eventos levam a hora da rodada de 20 s em que aparecem.

**Validação:** a reconstrução coincide com as 5.286 linhas do histórico oficial. No mesmo segundo, a diferença máxima é de 0 seções acumuladas e de 0,0000 pp no % de Lula. As 6 trocas da série exata são as mesmas do histórico oficial.

**Limites:**

- A hora usada é a da 1ª totalização, não a da publicação do arquivo ao vivo. *Inferência:* um coletor real vê tudo deslocado em ~0,7 min (atraso medido no 1T de 2026, ticket 02). As contagens devem ser parecidas, mas a fase das rodadas muda (ver 2).
- Não existe histórico oficial por UF nem por município. Esses níveis saem da seção e só foram conferidos no nível Brasil (e, no ticket 02, contra os snapshots do wcota por UF).

---

## 1. Marcos Brasil

| % das seções | Hora (Brasília) | Lula, % dos válidos |
|---|---|---|
| 1% | 17:14:17 | 43,68 |
| 5% | 17:25:47 | 46,71 |
| 10% | 17:33:41 | 47,99 |
| 25% | 17:55:43 | 48,74 |
| 50% | 18:26:53 | 49,69 |
| 75% | 18:51:36 | 50,17 |
| 90% | 19:09:26 | 50,53 |
| 95% | 19:23:45 | 50,66 |
| 99% | 20:00:46 | 50,84 |
| 100% | 00:18:04 (31/10) | 50,90 |

A primeira seção totalizada é das 17:00:51.

## 2. Virada Brasil vista por um coletor

| Série | Trocas | Hora da rodada · % seções → novo líder (Lula %) |
|---|---|---|
| Exata, ao segundo (= histórico oficial) | 6 | 17:07:59 · 0,25% → B (48,79) · 18:42:53 · 66,78% → L (50,007) · 18:42:58 · 66,85% → B (49,996) · 18:43:50 · 67,59% → L (50,007) · 18:44:48 · 68,32% → B (50,000) · 18:44:50 · 68,32% → L (50,000) |
| A cada 20 s (17:00:00, 17:00:20, …) | **2** | 17:08:00 · 0,26% → B (48,83) · 18:44:00 · 67,74% → L (50,011) |
| A cada 40 s | 2 | as mesmas duas |
| A cada 60 s | 2 | as mesmas duas |

**A fase do relógio do coletor importa** (medido em todos os deslocamentos possíveis):

| Passo | Fases que veem 2 trocas | Fases que veem 4 trocas | Quando aparecem 4 |
|---|---|---|---|
| 20 s | 13 de 20 | 7 de 20 | Deslocamento de +13 a +17 s: a amostra cai dentro da liderança de Lula de 18:42:53 a 18:42:57. Deslocamento de +8 ou +9 s: cai no "B" de 2 s, às 18:44:48–49 |
| 40 s | 33 de 40 | 7 de 40 | os mesmos dois casos |
| 60 s | 60 de 60 | 0 | — |

Nas fases com 4 trocas, as duas a mais são um vai-e-volta em 20 a 40 s, com Lula entre 49,987% e 50,025% nas amostras.

**A totalização anda em rajadas.** Rodadas de 20 s sem nenhuma seção nova no Brasil:

| Faixa | Rodadas sem mudança |
|---|---|
| 17h–18h | 42 de 180 |
| 18h–19h | 7 de 180 |
| 19h–20h | 61 de 180 |
| 20h–21h | 113 de 180 |

Entre 17:01 e 17:07 e perto das 19:50–19:57, há pausas de ~60 s entre totalizações.

## 3. Por UF (amostragem de 20 s)

As colunas de 50% a 100% trazem a hora exata em que a UF atingiu o %. As colunas de trocas contam as trocas na série de 20 s: todas, e só as que acontecem com a UF já acima de 3, 5, 10 e 25% das suas seções.

| UF | Seções | Lula final % | 50% | 90% | 99% | 100% | Trocas (todas) | ≥3% | ≥5% | ≥10% | ≥25% |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AC | 2.124 | 29,70 | 17:47:06 | 18:43:28 | 19:17:49 | 22:29:40 | 0 | 0 | 0 | 0 | 0 |
| AL | 6.626 | 58,68 | 18:43:56 | 19:09:29 | 19:32:11 | 20:08:20 | 3 | 0 | 0 | 0 | 0 |
| AM | 7.454 | 51,10 | 17:52:44 | 18:50:34 | 19:46:29 | 00:18:04 (31/10) | 1 | 1 | 1 | 1 | 1 |
| AP | 1.740 | 48,64 | 18:08:21 | 18:42:16 | 19:34:25 | 22:55:00 | 4 | 1 | 1 | 1 | 1 |
| BA | 34.424 | 72,12 | 18:29:23 | 19:10:30 | 20:01:48 | 21:48:48 | 0 | 0 | 0 | 0 | 0 |
| CE | 22.796 | 69,97 | 18:32:21 | 19:08:56 | 19:45:24 | 20:50:55 | 0 | 0 | 0 | 0 | 0 |
| DF | 6.748 | 41,19 | 17:19:37 | 17:35:17 | 18:33:27 | 19:59:37 | 0 | 0 | 0 | 0 | 0 |
| ES | 9.239 | 41,96 | 17:51:49 | 18:22:03 | 18:40:47 | 19:09:24 | 1 | 0 | 0 | 0 | 0 |
| GO | 14.620 | 41,29 | 18:12:57 | 18:55:46 | 19:24:28 | 21:37:51 | 5 | 0 | 0 | 0 | 0 |
| MA | 16.423 | 71,14 | 18:40:09 | 19:37:43 | 20:35:37 | 22:13:48 | 0 | 0 | 0 | 0 | 0 |
| MG | 49.981 | 50,20 | 18:42:24 | 19:26:44 | 20:36:42 | 21:44:29 | 3 | 2 | 2 | 2 | 1 |
| MS | 6.912 | 40,51 | 17:43:15 | 18:13:26 | 18:38:38 | 19:12:48 | 1 | 0 | 0 | 0 | 0 |
| MT | 7.652 | 34,92 | 17:54:39 | 18:53:37 | 19:48:41 | 20:42:08 | 1 | 0 | 0 | 0 | 0 |
| PA | 18.235 | 54,75 | 18:02:21 | 18:58:14 | 19:41:02 | 22:57:09 | 0 | 0 | 0 | 0 | 0 |
| PB | 9.602 | 66,62 | 17:57:09 | 18:38:23 | 19:00:27 | 19:45:25 | 0 | 0 | 0 | 0 | 0 |
| PE | 20.572 | 66,93 | 18:40:41 | 19:10:34 | 19:53:05 | 21:02:57 | 1 | 0 | 0 | 0 | 0 |
| PI | 8.963 | 76,86 | 18:13:00 | 19:05:45 | 20:01:49 | 22:21:14 | 0 | 0 | 0 | 0 | 0 |
| PR | 25.721 | 37,60 | 17:52:33 | 18:34:44 | 19:10:05 | 21:49:54 | 1 | 0 | 0 | 0 | 0 |
| RJ | 34.068 | 43,47 | 18:37:54 | 19:03:24 | 19:25:37 | 20:44:21 | 2 | 0 | 0 | 0 | 0 |
| RN | 7.674 | 65,10 | 18:03:09 | 18:57:59 | 19:37:44 | 20:05:07 | 0 | 0 | 0 | 0 | 0 |
| RO | 4.198 | 29,34 | 18:16:26 | 18:59:28 | 19:27:08 | 19:59:38 | 0 | 0 | 0 | 0 | 0 |
| RR | 1.268 | 23,92 | 18:19:15 | 18:50:09 | 19:44:20 | 20:58:34 | 1 | 0 | 0 | 0 | 0 |
| RS | 27.201 | 43,65 | 18:13:18 | 18:59:26 | 19:27:01 | 20:33:28 | 0 | 0 | 0 | 0 | 0 |
| SC | 16.242 | 30,73 | 18:43:59 | 19:16:11 | 19:52:01 | 21:16:06 | 0 | 0 | 0 | 0 | 0 |
| SE | 5.498 | 67,21 | 18:24:06 | 18:57:23 | 19:21:34 | 19:53:06 | 2 | 0 | 0 | 0 | 0 |
| SP | 101.073 | 44,76 | 18:38:10 | 19:15:48 | 20:04:04 | 21:37:55 | 0 | 0 | 0 | 0 | 0 |
| TO | 3.957 | 51,36 | 17:27:15 | 18:04:28 | 19:03:26 | 19:37:46 | 1 | 0 | 0 | 0 | 0 |
| ZZ (Exterior) | 1.064 | 51,28 | 17:00:55 | 19:44:21 | 22:01:56 | 22:31:49 | 0 | 0 | 0 | 0 | 0 |
| **Total** | | | | | | | **27** | **4** | **4** | **4** | **3** |

As 4 trocas depois de 3% da UF:

| UF | Hora da rodada | % da UF | Novo líder | Lula % |
|---|---|---|---|---|
| MG | 17:58:40 | 15,8 | Bolsonaro | 49,94 |
| AP | 18:15:00 | 57,3 | Bolsonaro | 49,96 |
| AM | 18:59:20 | 92,9 | Lula | 50,05 |
| MG | 19:35:40 | 93,1 | Lula | 50,02 |

As outras 23 trocas aconteceram com a UF abaixo de 3%: GO 5, AL 3, AP 3, RJ 2, SE 2 e uma em ES, MG, MS, MT, PE, PR, RR e TO. Na série exata, ao segundo, as contagens depois de 3% e de 5% são as mesmas (AM 1, AP 1, MG 2): a amostragem de 20 s não perdeu nem inventou troca acima de 3%.

## 4. Quando as UFs fecham

Número de UFs, de 28 (com o Exterior), que chegaram ao marco antes de cada hora (acumulado):

| Marco | Antes das 18h | Antes das 19h | Antes das 20h | Antes das 21h | Antes das 22h | Depois das 22h |
|---|---|---|---|---|---|---|
| 100% | 0 | 0 | 7 | 14 | 21 | 7 |
| 99% | 0 | 3 | 22 | 27 | 27 | 1 |

Ordem de chegada a 100%:

- antes das 20h: ES 19:09, MS 19:12, TO 19:37, PB 19:45, SE 19:53, DF 19:59, RO 19:59;
- 20h–21h: RN 20:05, AL 20:08, RS 20:33, MT 20:42, RJ 20:44, CE 20:50, RR 20:58;
- 21h–22h: PE 21:02, SC 21:16, GO 21:37, SP 21:37, MG 21:44, BA 21:48, PR 21:49;
- depois das 22h: MA 22:13, PI 22:21, AC 22:29, ZZ 22:31, AP 22:55, PA 22:57, AM 00:18.

No marco de 99%, a primeira UF é o DF (18:33) e as últimas são MA (20:35), MG (20:36) e ZZ (22:01).

## 5. Municípios (amostragem de 20 s)

São 5.570 municípios e 181 cidades do exterior. "Rodadas com mudança" são as rodadas de 20 s em que o município recebeu pelo menos uma seção.

**(a) Em quantas rodadas cada município foi totalizado:**

| Rodadas com mudança | Municípios | % dos 5.570 | Cidades do exterior |
|---|---|---|---|
| 1 (tudo de uma vez) | 152 | 2,7 | 146 |
| 2–3 | 728 | 13,1 | 29 |
| 4–10 | 2.094 | 37,6 | 6 |
| > 10 | 2.596 | 46,6 | 0 |

A mediana é de 10 rodadas, o p90 de 37 e o máximo de 177.

**(b) Trocas de líder com o município já acima de 3% e de 25% das suas seções:**

| | Municípios com ≥1 troca | Trocas (soma) |
|---|---|---|
| depois de 3% | 531 | 824 |
| depois de 25% | 366 | 532 |
| depois de 50% (referência) | 246 | — |
| exterior, depois de 3% | 2 | 2 |

Num município com menos de 34 seções, a primeira seção já passa de 3%, e o limiar de 3% não filtra nada.

**(c) Municípios chegando a 100% por rodada:**

- **Pico:** a rodada das 19:27:00, com 198 municípios (195 sem contar o exterior): MG 77, SP 36, CE 18, MA 15, GO 10 e PI 9. Ela veio depois de 28 s sem nenhuma totalização (de 19:26:14 a 19:26:42) e trouxe 2.536 seções.
- As rodadas seguintes no ranking são 19:26:00 (89), 19:27:20 (76) e 19:26:20 (67). Depois vêm 17:01:00 e 19:00:20, com 54 cada. Os 54 de 17:01:00 são todos cidades do exterior.

Entre 17:00 e 20:00 (540 rodadas):

| | Valor |
|---|---|
| Mediana por rodada | 6 (5.570 + exterior) · 6 (só Brasil) |
| Média por rodada | 10,1 |
| p90 por rodada | 23 |
| Rodadas com 0 municípios | 153 |

Por hora:

| Hora | Municípios fechados | Mediana por rodada | Máximo numa rodada |
|---|---|---|---|
| 17h–18h | 754 | 2 | 54 |
| 18h–19h | 2.464 | 13 | 40 |
| 19h–20h | 2.214 | 6 | 198 |

## 6. Onde estão as seções que faltam

**Referência: participação de cada região no total da noite**

| | N | NE | CO | SE | S | Exterior |
|---|---|---|---|---|---|---|
| Seções | 8,3 | 28,1 | 7,6 | 41,2 | 14,7 | 0,2 |
| Aptos | 8,0 | 27,1 | 7,4 | 42,6 | 14,4 | 0,4 |

**Seções ainda não totalizadas no instante do marco Brasil (% por região):**

| Marco Brasil | Hora | Faltam | N | NE | CO | SE | S | Exterior |
|---|---|---|---|---|---|---|---|---|
| 10% | 17:33:41 | 424.723 | 6,5 | 29,1 | 5,7 | 44,5 | 14,2 | 0,1 |
| 25% | 17:55:43 | 354.031 | 5,6 | 29,8 | 4,4 | 47,5 | 12,6 | 0,1 |
| 50% | 18:26:53 | 235.873 | 4,5 | 29,7 | 3,1 | 51,3 | 11,2 | 0,2 |
| 75% | 18:51:36 | 117.984 | 3,7 | 30,1 | 2,2 | 53,7 | 10,0 | 0,3 |
| 90% | 19:09:26 | 47.194 | 3,8 | 30,0 | 1,7 | 55,4 | 8,4 | 0,7 |
| 95% | 19:23:45 | 23.596 | 3,9 | 31,3 | 1,3 | 55,5 | 6,8 | 1,2 |
| 99% | 20:00:46 | 4.688 | 3,6 | 32,0 | 0,9 | 60,1 | 1,4 | 2,0 |

**Aptos (eleitores) ainda não totalizados (% por região):**

| Marco Brasil | Hora | Aptos que faltam | N | NE | CO | SE | S | Exterior |
|---|---|---|---|---|---|---|---|---|
| 10% | 17:33:41 | 140.871.749 | 6,3 | 27,9 | 5,5 | 46,1 | 13,9 | 0,2 |
| 25% | 17:55:43 | 117.909.995 | 5,3 | 28,5 | 4,3 | 49,4 | 12,3 | 0,2 |
| 50% | 18:26:53 | 78.884.836 | 4,1 | 28,0 | 3,0 | 53,5 | 10,9 | 0,3 |
| 75% | 18:51:36 | 39.360.855 | 3,3 | 28,1 | 2,2 | 56,1 | 9,7 | 0,6 |
| 90% | 19:09:26 | 15.584.222 | 3,4 | 27,5 | 1,6 | 58,1 | 8,0 | 1,4 |
| 95% | 19:23:45 | 7.784.170 | 3,3 | 28,2 | 1,2 | 58,3 | 6,5 | 2,5 |
| 99% | 20:00:46 | 1.566.497 | 2,9 | 27,7 | 0,9 | 63,5 | 1,2 | 3,9 |

A linha de 99% foi acrescentada como referência. O que falta vai ficando cada vez mais Sudeste, enquanto o Nordeste fica estável em ~28–32%.

## 7. Grandes eleitorados: hora em que cada UF chegou a X% das suas seções

| UF | 25% | 50% | 75% | 90% |
|---|---|---|---|---|
| SP | 18:16:07 | 18:38:10 | 18:58:01 | 19:15:48 |
| MG | 18:14:54 | 18:42:24 | 19:05:36 | 19:26:44 |
| RJ | 18:20:20 | 18:37:54 | 18:53:25 | 19:03:24 |
| BA | 18:02:11 | 18:29:23 | 18:52:45 | 19:10:30 |
| RS | 17:45:14 | 18:13:18 | 18:41:37 | 18:59:26 |
| PR | 17:36:36 | 17:52:33 | 18:14:07 | 18:34:44 |
| PE | 18:16:23 | 18:40:41 | 18:58:25 | 19:10:34 |
| CE | 18:08:24 | 18:32:21 | 18:53:29 | 19:08:56 |

Quando o Brasil chega a 25% (17:55:43), só RS e PR já passaram de 25%. Os outros seis ainda estão abaixo.

## 8. Teste de densidade de eventos (amostragem de 20 s)

**Regras testadas:**

- marcos Brasil de 10, 25, 50, 75, 90, 95, 99 e 100%;
- trocas de líder no Brasil, todas, sem limiar;
- troca de líder em uma UF que já passou de 5% das suas seções;
- UF chegando a 50% e a 100%.

Cada evento leva a hora da rodada de 20 s em que aparece.

**Total: 70 eventos.**

| Tipo | Eventos |
|---|---|
| Marcos Brasil | 8 |
| Trocas Brasil | 2 (17:08:00 com 0,26%; 18:44:00 com 67,74%) |
| Trocas por UF (após 5%) | 4 (MG 17:58:40, AP 18:15:00, AM 18:59:20, MG 19:35:40) |
| UF chegou a 50% | 28 |
| UF chegou a 100% | 28 |

**Eventos por janela de 10 min** (pela hora da rodada; a janela inclui o início e exclui o fim):

| Janela | Eventos | Janela | Eventos |
|---|---|---|---|
| 17:00–17:10 | 2 | 19:00–19:10 | 2 |
| 17:10–17:20 | 1 | 19:10–19:20 | 1 |
| 17:20–17:30 | 1 | 19:20–19:30 | 1 |
| 17:30–17:40 | 1 | 19:30–19:40 | 2 |
| 17:40–17:50 | 2 | 19:40–19:50 | 1 |
| 17:50–18:00 | **7** | 19:50–20:00 | 3 |
| 18:00–18:10 | 3 | 20:00–20:10 | 3 |
| 18:10–18:20 | 6 | 20:10–20:20 | 0 |
| 18:20–18:30 | 3 | 20:20–20:30 | 0 |
| 18:30–18:40 | 3 | 20:30–20:40 | 1 |
| 18:40–18:50 | 6 | 20:40–20:50 | 2 |
| 18:50–19:00 | 2 | 20:50–21:00 | 2 |

São 55 eventos entre 17:00 e 21:00. Os outros 15 vêm depois das 21h: 14 UFs chegando a 100% (a última, o AM, às 00:18:20) e o 100% do Brasil.

**Máximo numa rodada de 20 s: 3 eventos**, às 18:44:00: AL chega a 50%, SC chega a 50% e o Brasil vira para Lula. Há 63 rodadas com algum evento. Em 6 delas há 2 ou mais:

| Rodada | Eventos |
|---|---|
| 18:13:00 | GO 50% e PI 50% |
| 18:44:00 | AL 50%, SC 50% e a virada Brasil |
| 19:09:40 | ES 100% e o marco Brasil de 90% |
| 19:59:40 | DF 100% e RO 100% |
| 21:38:00 | GO 100% e SP 100% |
| 00:18:20 | AM 100% e o 100% do Brasil |

**Para comparar** (conta sobre a seção 5): se a regra incluísse a troca de líder por município depois de 25%, seriam mais 532 eventos, 7,6 vezes o conjunto todo. Não medi como eles se distribuem ao longo da noite.
