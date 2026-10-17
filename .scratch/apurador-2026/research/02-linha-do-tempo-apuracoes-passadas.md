# Linha do tempo de apurações passadas

Pesquisa para o ticket [02 — Linha do tempo de apurações passadas](../issues/02-linha-do-tempo-apuracoes-passadas.md). Fontes consultadas em 17/10/2026.

Convenções (as mesmas do ticket 03):

- **Medido:** número que eu obtive abrindo o arquivo: HEAD HTTP, lista do zip, leitura do CSV ou cálculo sobre ele. A fonte é a URL do arquivo.
- **Documentado:** está escrito na página da fonte ou no dicionário (`leiame.pdf`).
- **Inferência:** conclusão minha, sem documento que a confirme.

Os scripts de medição são protótipos descartáveis e ficaram fora do repositório. O método está descrito na seção 2.4, para quem quiser refazer.

---

## Resumo

1. **Sim, dá para reconstruir as cinco noites (2018 1T/2T, 2022 1T/2T, 2026 1T) seção por seção, com hora ao segundo, usando só dados oficiais do TSE.** O arquivo-chave é o **`detalhe_votacao_secao_<ano>.zip`**. Ele traz, para cada seção, `DT_RECEBIMENTO_BU_HOR_TSE` (chegada do boletim) e `DT_PRIM_TOT_PARCIAL_HOR_TSE` (primeira totalização). A curva oficial do placar parcial é refeita ordenando as seções por `DT_PRIM_TOT_PARCIAL_HOR_TSE` e somando os votos de cada uma, tirados do boletim de urna (`bweb`) ou da votação por seção (`votacao_secao`).
2. **A reconstrução bate com o oficial ao segundo.** No 2T de 2022, ela repete o histórico oficial do TSE: 67,76% às 18:44:04, as cinco trocas de liderança entre 18:42:53 e 18:44:50 e o fim às 00:18:04. No 1T de 2026, repete as parciais publicadas na imprensa: 17,22% às 18:11:38, com Flávio 51,22% e Lula 40,66%, e 47,24% às 18:44. No 2T de 2018, repete os 94,44% das 19h18 citados pela presidente do TSE.
3. **2022 tem ainda o histórico oficial nacional** (`Historico_Totalizacao_Presidente_BR_{1T,2T}_2022.zip`, de 0,8 a 1,6 MB). Ele traz uma linha por evento de totalização, só no nível Brasil. Não existe para 2018, e o de 2026 ainda não foi publicado. O de 2022 saiu 2 dias depois do 2T (zip de 01/11/2022) e 11 a 16 dias depois do 1T (CSV de 13/10, recurso criado em 18/10).
4. **O `bweb` de 2022 e de 2026 tem `DT_BU_RECEBIDO`**, idêntico ao `DT_RECEBIMENTO_BU_HOR_TSE`. O de 2018 não tem nenhum horário de chegada ou de totalização. Para 2018, a fonte é o `detalhe_votacao_secao`, regerado pelo TSE em 15/02/2024.
5. **Snapshots de terceiros existem, mas são parciais e desnecessários:** `wcota` (2022, cerca de 1 por minuto, Brasil e UFs) e `davimassari-rgb/apura-o26` (2026 1T, só a partir de 85%). Não achei nada para 2018 nem no Kaggle. O Wayback Machine guardou só a casca do site de 2018.
6. **O folclore "Sul/Sudeste cedo, Norte/Nordeste tarde" está meio errado.** Centro-Oeste e Sul chegam cedo. O Sudeste (SP, RJ, MG) e o Nordeste chegam tarde. O Norte fica no meio, com AC e RR entre os últimos em 2018. No 1T de 2026, o último décimo das seções foi 49% Nordeste e 39% Sudeste.
7. **A ordem de chegada não é neutra em relação ao voto, nem dentro de cada UF nem dentro de cada município.** Ela também se repete pouco de um turno para outro. Isso afeta o método de projeção (seção 5).

---

## 1. Tabela por eleição

| Eleição | Melhor fonte para a curva real | Granularidade | Resolução temporal | Tamanho para baixar | Lacunas |
|---|---|---|---|---|---|
| **2018 1T** (07/10) | `detalhe_votacao_secao_2018.zip`, membro `_BR.csv` (horários) + votos por seção de `votacao_secao_2018_BR.zip` ou do `bweb` 1T | seção → município → UF → Brasil | segundo | horários: 62 MB (membro `_BR`, via *Range*); votos: 251 MB (`votacao_secao`) ou 1,4 GB (`bweb`) | O TSE só divulgou a partir das 19h de Brasília, quando já havia **57,2%** totalizado. A curva antes disso é interna. Não validei os votos do 1T de 2018 (arquivos acima do limite de 200 MB). Não há histórico oficial. |
| **2018 2T** (28/10) | mesmo `detalhe` + `bweb` 2T (74 MB, votos por seção) | seção | segundo | 62 MB + 74 MB | Divulgação a partir das 19h, com **88,5%** já totalizado. Validado contra o oficial: 94,44% às 19h18. 42 seções sem votos (não instaladas). 8 seções com 1ª totalização em 25/02/2019. |
| **2022 1T** (02/10) | `Historico_Totalizacao_Presidente_BR_1T_2022` (nacional) + `detalhe_votacao_secao_2022` (por seção) + votos do `bweb` ou `votacao_secao` | Brasil (histórico); seção (detalhe) | segundo | histórico: 1,6 MB; detalhe `_BR`: 60 MB; votos: 271 MB (`votacao_secao_2022_BR`) ou 1,46 GB (`bweb`, o de SP tem 404 MB) | Nenhuma relevante. Não refiz os votos por seção do 1T (tamanho), mas os horários batem com o histórico (1% às 17:38:34, 50% às 19:35:33). |
| **2022 2T** (30/10) | histórico oficial `..._2T_2022` + `detalhe_votacao_secao_2022` + `bweb` 2T (69 MB) | Brasil; seção | segundo | 0,8 MB + 60 MB + 69 MB | Nenhuma. **É o melhor ensaio:** tem virada, histórico oficial para conferir e arquivos pequenos. |
| **2026 1T** (04/10) | `detalhe_votacao_secao_2026` (membro `_BR`) + `votacao_secao_2026_BR.zip` | seção | segundo | 34 MB + 162 MB (o `bweb` também serve, mas são 5,1 GB, 1,4 GB só de SP) | Ainda sem histórico oficial nacional. Sem virada: Flávio liderou do 1% ao fim. |

**Medido** (HEAD e lista dos zips): [detalhe 2018](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_secao/detalhe_votacao_secao_2018.zip), [detalhe 2022](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_secao/detalhe_votacao_secao_2022.zip), [detalhe 2026](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip), [votacao_secao 2018 BR](https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2018_BR.zip), [2022 BR](https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2022_BR.zip) e [2026 BR](https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2026_BR.zip). Os `bweb` são somas dos 28 zips por UF de [2018](https://dadosabertos.tse.jus.br/dataset/resultados-2018-boletim-de-urna), [2022](https://dadosabertos.tse.jus.br/dataset/resultados-2022-boletim-de-urna) e [2026](https://dadosabertos.tse.jus.br/dataset/resultados-2026-boletim-de-urna): 1.397 / 74 MB (2018 1T/2T), 1.457 / 69 MB (2022) e 5.077 MB (2026 1T).

---

## 2. Fontes primárias do TSE

### 2.1 `detalhe_votacao_secao`: horário de chegada e de 1ª totalização de cada seção (2018, 2022, 2026)

**Documentado** ([leiame.pdf dentro de detalhe_votacao_secao_2022.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_secao/detalhe_votacao_secao_2022.zip)):

- `DT_RECEBIMENTO_BU_HOR_TSE`: "Data e hora do recebimento do Boletim de Urna (Hora TSE)".
- `DT_PRIM_TOT_PARCIAL_HOR_TSE`: "Data e hora da primeira totalização parcial do Boletim de Urna da seção (Hora TSE)".
- O arquivo também traz `DS_ORIGEM_VOTO` (urna, RED, sistema de apuração, totalização), `ST_SECAO_INSTALADA`, `ST_SECAO_ANULADA` e o modelo da urna.
- Há um CSV por UF (cargos estaduais), um `_BR.csv` (só Presidente) e um `_BRASIL.csv` (todos os cargos).

**Medido** (cabeçalho e conteúdo dos membros `_AC.csv` e `_BR.csv`, lidos por *Range* sem baixar o zip inteiro):

- As colunas existem nos três anos. O de 2018 foi gerado em 15/02/2024 (`DT_GERACAO`), o de 2022 também em 15/02/2024 e o de 2026 em 05/10/2026.
- Presidente, por turno, no `_BR.csv`: 454.490 seções em 2018 (1T e 2T), 472.075 em 2022 e 499.248 em 2026. **Nenhuma linha sem horário.**
- "Hora TSE" é o horário de Brasília. Em 2018, a chegada menos o encerramento (horário local, do `bweb`) tem mínimo de ~124 min no Acre (UTC−5) e ~65 min no Amazonas (UTC−4). Em SP (UTC−3), o 1º percentil é 22 min. Há poucos casos negativos em SP, até −18 min, que não expliquei.
- `DT_RECEBIMENTO_BU_HOR_TSE` é **idêntico** ao `DT_BU_RECEBIDO` do `bweb` de 2022 (diferença 0 s em todas as 2.124 seções do AC e nas 101.073 de SP no 2T).
- A 1ª totalização vem segundos depois da chegada. Mediana: 200 s (2018 1T), 183 s (2018 2T), 45 s (2022 1T), 36 s (2022 2T) e 115 s (2026 1T).
- Seções não instaladas: 47 em 2022 e 41 em 2026. Elas estão no total de seções (o denominador oficial) e não têm votos. Em 2018 são 42 sem votos no `bweb`.

**Validação contra o oficial (medido):**

| Eleição | Ponto oficial / imprensa | Reconstrução com `DT_PRIM_TOT_PARCIAL_HOR_TSE` |
|---|---|---|
| 2022 2T | Histórico oficial: 67,764% às 18:44:04, Lula 50,006% | 67,76% às 18:44:04, Lula 50,01% |
| 2022 2T | Histórico oficial: trocas de líder às 18:42:53, 18:42:58, 18:43:50, 18:44:48 e 18:44:50 | as mesmas cinco, nos mesmos segundos |
| 2022 2T | [A Gazeta](https://www.agazeta.com.br/es/politica/casagrande-e-lula-como-foi-a-evolucao-de-votos-no-es-minuto-a-minuto-1122): "18h44 … 67,76%"; "19h55 … 98,81%" | 98,81% às 19:56:23 |
| 2022 1T | Histórico oficial: 1,000% às 17:38:34; 50,142% às 19:35:33 | 1,0% às 17:38:34; 50,14% às 19:35:33 |
| 2026 1T | [BNews](https://www.bnewssaopaulo.com.br/amp/noticias/politica/flavio-bolsonaro-mantem-lideranca-na-apuracao-presidencial.html): 18h11min38s, 17,22%, Flávio 51,22%, Lula 40,66% | 17,22%, Flávio 51,22%, Lula 40,66% |
| 2026 1T | [TradeMap](https://trademap.com.br/noticias/news-8377647): 47,26%, Flávio 50,20%, Lula 41,63% | 47,24% às 18:44, Flávio 50,20%, Lula 41,63% |
| 2018 2T | [Agência Brasil](https://agenciabrasil.ebc.com.br/politica/noticia/2018-10/com-100-das-urnas-apuradas-bolsonaro-teve-577-milhoes-de-votos): resultado "definido às 19h18, com 94,44% das urnas apuradas" | 94,44% às 19:18 (Bolsonaro 55,54%) |
| 2018 2T | [Rádio Câmara](https://www.camara.leg.br/radio/programas/546908-jair-bolsonaro-lidera-apuracao-dos-votos-com-88-das-urnas-apuradas/): "88% das urnas apuradas". A página é de 19h43, e a hora do dado não é informada | 88,47% às 19:00, na 1ª parcial (Bolsonaro 55,69%). Compatível, mas não é prova |
| 2018 1T | [EFE/Panamá América](https://www.panamaamerica.com.pa/mundo/derecha-brasilena-lidera-con-un-49-segun-el-primer-escrutinio-parcial-1117995): "primer escrutinio parcial" com "57,00 % del total", Bolsonaro 48,94%. A hora da página (16:15) tem fuso ambíguo | 57,17% às 19:00 (votos do 1T de 2018 não refeitos) |
| 2018 1T | [Banda B](https://www.bandab.com.br/politica/confira-os-primeiros-boletins-de-urna-no-parana-acompanhe-o-tempo-real/): "19h05 … 53% das urnas apuradas" | 59,96% às 19:05. **Não bate.** O blog provavelmente repetia um número velho. É a única divergência |

As finais também batem: 2018 2T, Bolsonaro 55,130% e Haddad 44,870%; 2022 2T, Lula 50,902%; 2026 1T, Flávio 47,03% e Lula 45,16%.

### 2.2 Boletim de urna (`bweb`): votos por seção e, desde 2022, a chegada

**Documentado** ([leiame-boletimurnaweb.pdf dentro de bweb_2t_AC_311020221535.zip](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/buweb/bweb_2t_AC_311020221535.zip)): `DT_BU_RECEBIDO` é a "Data do boletim de urna recebido". `DT_ABERTURA`, `DT_ENCERRAMENTO` e `DT_EMISSAO_BU` são data e hora da urna. Só `HH_GERACAO` diz o fuso ("horário de Brasília"). O dicionário não diz o fuso dos demais campos.

**Medido:**

- **2022** ([conjunto](https://dadosabertos.tse.jus.br/dataset/resultados-2022-boletim-de-urna)): 45 colunas, `DT_BU_RECEBIDO` preenchido em todas as 472.028 seções do 2T. **Fusos:** a chegada está no horário de Brasília, e abertura, encerramento e emissão estão no horário local. No AC (UTC−5), a chegada menos a emissão tem mínimo de 126 min. A votação em 2022 foi das 8h às 17h de Brasília em todo o país, das 6h às 15h no Acre ([TSE](https://www.tse.jus.br/comunicacao/noticias/2022/Setembro/votacao-em-todo-pais-seguira-o-horario-de-brasilia)). O AC abriu às 06:01 local no arquivo.
- **2026** ([conjunto](https://dadosabertos.tse.jus.br/dataset/resultados-2026-boletim-de-urna), [bweb_1t_AC_051020261403.zip](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/buweb/bweb_1t_AC_051020261403.zip)): mesmo conteúdo, com três mudanças de formato que quebram leitores de 2022:
  - datas em ISO (`2026-10-04 18:25:49`);
  - números sem aspas;
  - colunas renomeadas: `DS_SECOES_AGREGADAS` (antes `DS_AGREGADAS`) e `QT_ELEI_BIOM_SEM_HABILITACAO` (antes `QT_ELEITORES_BIOMETRIA_NH`).

  Presidente é `CD_ELEICAO = 6257` ("Eleição Geral Federal 2026"). Os outros cargos são o 6259. No AC: 2.270 seções, nenhuma sem chegada, e mínimo chegada − emissão de 124,5 min (Brasília × local, de novo).
- **2018** ([conjunto](https://dadosabertos.tse.jus.br/dataset/resultados-2018-boletim-de-urna), [BWEB_1t_AC_101020181938.zip](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2018/buweb/BWEB_1t_AC_101020181938.zip), [BWEB_2t_AC_301020181744.zip](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2018/buweb/BWEB_2t_AC_301020181744.zip)): 42 colunas, **sem `DT_BU_RECEBIDO` e sem `DT_EMISSAO_BU`**. Só tem abertura e encerramento (local). A coluna de UF vem como `"SG_ UF"`, com espaço. O [dicionário de 2018](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2018/buweb/BWEB_2t_AC_301020181744.zip) confirma a lista. Por isso, em 2018 o horário vem do `detalhe_votacao_secao` (2.1).
- Para refazer a curva, o `bweb` vale pelos votos por candidato em cada seção. O `detalhe_votacao_secao` só tem totais (nominais, brancos, nulos).

**Validação do `DT_BU_RECEBIDO` sozinho (2022 2T, medido):** ordenar as seções pela chegada, em vez da 1ª totalização, adianta a curva de 25 a 45 s. Exemplos: 50% às 18:26:12 contra 18:26:53 no oficial; 90% às 19:09:01 contra 19:09:26. Com o mesmo número de seções, o placar difere do oficial em até ~0,6 pp nos primeiros ~4% das seções, cai para ≤0,1 pp a partir de ~5% e para ≤0,05 pp a partir de ~7%. A comparação foi com os snapshots do wcota (seção 3). Serve, mas a `DT_PRIM_TOT_PARCIAL_HOR_TSE` é exata.

### 2.3 Histórico oficial de totalização, nacional (só 2022)

**Medido:** [Historico_Totalizacao_Presidente_BR_1T_2022.zip](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/Historico_Totalizacao_Presidente_BR_1T_2022.zip) (1,6 MB; 8.437 linhas) e [..._2T_2022.zip](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/Historico_Totalizacao_Presidente_BR_2T_2022.zip) (0,8 MB; 5.286 linhas). Cada linha é um instante de totalização, com timestamp ao segundo. Ela traz as seções e os votos desse instante e os acumulados, por candidato, branco e nulo. A [busca no CKAN do TSE](https://dadosabertos.tse.jus.br/api/3/action/resource_search?query=url:Historico_Totalizacao) acha só esses dois recursos, no conjunto [resultados-2022](https://dadosabertos.tse.jus.br/dataset/resultados-2022). Os nomes adivinhados para 2018 e para 2026 1T retornam 404.

**Documentado** (`leiame.pdf` do zip): `SG_UE_UF` é a abrangência (no arquivo, só `BR`). `PE_SECOES_TOT_ACUMULADO` é `QT_SECOES_TOT_ACUMULADO / QT_SECOES_TOTAL`, e `QT_SECOES_TOTAL` é fixo (472.075). Os percentuais dos candidatos são sobre os votos "concorrentes" (os válidos).

**Medido, 1T 2022:**

- Começa às 17:04:47. Chega a 1% às 17:38:34, 50% às 19:35:33, 90% às 20:30:16 e 99% às 22:15:58. O 100% só vem em 04/10 às 10:27:34.
- **Virada:** Lula passa à frente às 19:59:54, com 67,96%. Há trocas até a última, às 20:00:39, com 68,60%.

**Medido, 2T 2022:**

- Começa às 17:00:51. Chega a 1% às 17:14:17, 50% às 18:26:53, 90% às 19:09:26 e 99% às 20:00:46. O 100% vem às 00:18:04 de 31/10.
- **Virada:** a definitiva é às 18:44:50, com 68,32%, depois de quatro trocas desde as 18:42:53 (66,78%).

### 2.4 Método da reconstrução (para refazer)

1. Do `detalhe_votacao_secao_<ano>.zip`, leia só o membro `_<ano>_BR.csv`. O CDN aceita `Range`, então é possível ler o diretório do zip e baixar só esse membro, como o ticket 03 também notou. Filtre `DS_CARGO = Presidente` e o turno. Guarde UF, município, zona, seção e `DT_PRIM_TOT_PARCIAL_HOR_TSE`.
2. Tire os votos por seção de A, de B e os válidos de `votacao_secao_<ano>_BR.zip` ou dos `bweb`. Junte pela chave (UF, município, zona, seção), com os códigos sem zeros à esquerda: o `bweb` de 2018 usa `"01007"`, os outros usam `1007`.
3. Ordene as seções pelo horário e acumule. O % de seções totalizadas usa como denominador **todas** as seções do `detalhe`, inclusive as não instaladas: 472.075 em 2022, 499.248 em 2026 e 454.490 em 2018.
4. Em 2026, o candidato 28 teve os votos anulados e conta como nulo no total oficial. Isso vem do [config do projeto robertomsgomide/eleicoes](https://github.com/robertomsgomide/eleicoes/blob/main/config/eleicoes.toml); no meu cálculo o efeito foi desprezível.

### 2.5 Outras fontes do TSE examinadas

- **`detalhe_votacao_munzona`** ([2018](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2018.zip), [2026](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2026.zip)): tem `DT/HH_ULTIMA_TOTALIZACAO` por município e zona, ou seja, quando a zona terminou. **Medido:** em 2018 1T, 2.318 das 12.546 linhas de Presidente (18%) têm datas de re-totalização (30/11/2018 a 14/01/2019), que apagam o horário da noite. Ficou obsoleto pelo `detalhe_votacao_secao`.
- **`votacao_secao`** (votos por seção): não tem horário. Serve só como fonte dos votos.
- **`Relatorio_Resultado_Totalizacao_2026_<UF>.zip`**: contém só PDFs ([AC](https://cdn.tse.jus.br/estatistica/sead/odsele/relatorio_resultado_totalizacao/Relatorio_Resultado_Totalizacao_2026_AC.zip)).
- **Logs de urna:** são texto, com os eventos da própria urna ([formato, TSE](https://www.tse.jus.br/eleicoes/eleicoes-2022/arquivos/formato-dos-arquivos-de-log-17-9-22/@@download/file/formato-arquivos-log.pdf)), sem a chegada ao TSE. Não abri nenhum.
- **Divulgação de 2018 a partir das 19h:** a resolução do TSE 23.554, art. 239, liberava o resultado de Presidente "a partir das 17h do fuso horário do Acre", ou seja, 19h de Brasília ([notícia do TSE](https://www.tse.jus.br/comunicacao/noticias/2018/Outubro/eleicoes-2018-divulgacao-de-votos-para-presidente-da-republica-comecara-a-partir-do-fim-da-votacao-no-acre-1)). O site responde 403 a acesso automatizado, então o texto veio pelo resultado da busca. Desde 2022, a votação segue o horário de Brasília e a divulgação começa às 17h (ver 2.2).

---

## 3. Terceiros

| Fonte | O que tem | Cobertura | Avaliação |
|---|---|---|---|
| [wcota/br_eleicoes_2022_2T](https://github.com/wcota/br_eleicoes_2022_2T) | CSV de snapshots do Divulga TSE: `date` (coleta), `date_totalizacao`, votos, % de seções. Um arquivo para o Brasil (`br.csv`) e um por UF | 2T 2022, das 17:00 às 00:18. Medido: 200 horários de totalização distintos no Brasil e 160 em SP | Bate com a reconstrução. A chegada pelo `bweb` vem 0,1 a 0,8 min antes (mediana 0,2 min). Útil como amostra do JSON por UF, mas redundante |
| [wcota/br_eleicoes_2022_1T](https://github.com/wcota/br_eleicoes_2022_1T) | o mesmo, só para Brasil, SP e MG | 1T 2022, a partir das 17:54 (74 horários distintos no Brasil) | Lacunas grandes. `municipios.csv` é só o resultado final |
| [davimassari-rgb/apura-o26](https://github.com/davimassari-rgb/apura-o26) `data/2026-historico-br-1t.json` | 341 pontos do arquivo nacional do TSE, gravados a cada ~30 s | 1T 2026, **só a partir das 19:59 (84,9%)** | Medido contra o `detalhe`: o arquivo ao vivo ficou atrás da 1ª totalização por mediana de 0,7 min (p90 1,0 min). O 1º ponto gravado estava 1,3 pp atrás |
| [robertomsgomide/eleicoes](https://github.com/robertomsgomide/eleicoes) | Projeto paralelo, quase o mesmo que o nosso: curvas minuto a minuto (`site/src/data/apuracao_<ano>_t<turno>.json`), simulador da noite de 2022 e coletores para 25/10 | 2022 e 2026 "exatas" (pelo `bweb`); 2018 "estimada" | Para 2018, estima a chegada como encerramento + atraso mediano da zona em 2022 ([apuracao.py](https://github.com/robertomsgomide/eleicoes/blob/main/src/eleicoes/analises/apuracao.py)). Afirma que 2018 "não tem a chegada dos boletins" ([docs/dados.md](https://github.com/robertomsgomide/eleicoes/blob/main/docs/dados.md)), o que vale para o `bweb` mas não para o `detalhe`. Pela validação do próprio projeto, a estimativa erra de 12 a 21 pp no "% apurado × hora" (máximo de 37 a 52 pp) e de 0,25 a 0,5 pp no placar × % de seções. **Medido:** a estimativa dá 23% às 19h no 1T de 2018, contra 57,2% no `detalhe`. No 2T acerta (87,3% contra 88,5%) |
| [marcal1981/apuracao-eleicoes-2026](https://github.com/marcal1981/apuracao-eleicoes-2026) | Guarda snapshots em banco em tempo de execução | — | Não há dados no repositório (árvore conferida) |
| Base dos Dados | tabela `br_tse_eleicoes_2022.resultado_boletim_urna` (`select *` do staging, [SQL](https://github.com/basedosdados/queries-basedosdados/blob/main/models/br_tse_eleicoes_2022/resultado_boletim_urna.sql)) | 2022 | Não confirmei se a chegada vem junto (exige BigQuery). Desnecessário |
| Wayback Machine | [CDX de divulga.tse.jus.br](https://web.archive.org/cdx/search/cdx?url=divulga.tse.jus.br/*&from=20181007&to=20181029) | 2018: só HTML/JS do app, nenhum dado. 2022 2T: 27 capturas do JSON Brasil | Inútil frente ao `detalhe` |
| Kaggle | — | — | Nada achado para a apuração brasileira (busca) |
| Imprensa | parciais com hora em blogs ao vivo (ver 2.1) | pontos soltos | Servem só para conferir |

---

## 4. O que os dados mostram sobre a ordem de chegada

Tudo medido sobre o `detalhe_votacao_secao` (1ª totalização) e, para os votos, sobre o `bweb` (2018 2T, 2022 2T) e a `votacao_secao` (2026 1T).

### 4.1 Ritmo geral

| | 1% | 50% | 90% | 99% | 100% | Início da divulgação |
|---|---|---|---|---|---|---|
| 2018 1T | 17:26 | 18:49 | 20:11 | 21:59 | 23/10 | 19:00 (já 57,2%) |
| 2018 2T | 17:18 | 18:10 | 19:02 | 20:07 | 25/02/2019 | 19:00 (já 88,5%) |
| 2022 1T | 17:38 | 19:36 | 20:30 | 22:16 | 04/10 10:27 | 17:00 |
| 2022 2T | 17:14 | 18:27 | 19:09 | 20:01 | 31/10 00:18 | 17:00 |
| 2026 1T | 17:21 | 18:47 | 20:16 | 21:14 | 05/10 02:58 | 17:00 |

**O 2º turno é bem mais rápido que o 1º.** Em 2022, ele chegou a 50% 69 min antes. Inferência: no 2T de 2026 a curva deve andar mais rápido que no 1T de 2026.

### 4.2 Regiões: hora em que 50% das seções da região foram totalizadas

| | CO | S | N | SE | NE |
|---|---|---|---|---|---|
| 2018 1T | 18:37 | 18:10 | 18:56 | 18:56 | 19:08 |
| 2018 2T | 18:16 | 17:48 | 18:15 | 18:15 | 18:10 |
| 2022 1T | 18:50 | 19:14 | 19:19 | 19:40 | 19:56 |
| 2022 2T | 17:49 | 18:12 | 17:55 | 18:37 | 18:29 |
| 2026 1T | 18:21 | 18:26 | 18:31 | 18:57 | 19:03 |

UFs por mediana, 2026 1T:

- **Primeiras:** DF 17:46, TO 17:55, MS 18:11, PR 18:12.
- **Últimas:** RJ 19:11, BA 19:13, CE 19:14, AL 19:23.

Em 2018, AC (20:45 no 1T) e RR ficaram entre as últimas.

### 4.3 Por décimo da chegada: quem chega e o placar de cada décimo

Lula ou Haddad (PT) como % dos votos dos dois primeiros:

| Décimo | 2018 2T (Haddad) | 2022 2T (Lula) | 2026 1T (Lula, só contra Flávio) | Composição no 2026 1T |
|---|---|---|---|---|
| 1º | 40,5 | 48,0 | 44,5 | S 28%, N 20%, CO 18%, NE 18%, SE 15% |
| 5º | 46,2 | 51,0 | 46,8 | SE 49%, NE 22%, S 15% |
| 9º | 47,7 | 52,5 | 54,0 | SE 45%, NE 40% |
| 10º | 48,0 | 54,3 | 59,3 | NE 49%, SE 39%, S 2% |

Nos três casos, o PT cresce ao longo da noite. Em 2022 2T, o peso do Nordeste ficou parado em 29–30% do 3º décimo em diante (19% e 24% nos dois primeiros), e o que mudou foi o Sudeste (de 11% a 55%) e a saída do Centro-Oeste e do Sul. Em 2026 1T, o Nordeste foi de 18% a 49%.

### 4.4 Dentro de cada UF e de cada município (2022 2T, pela chegada do `bweb`)

**Dentro da UF**, a diferença no % de Lula entre a 2ª e a 1ª metade das seções a chegar vai de −9 a +10 pp:

- AM +9,8; MA +8,9; SE +6,9; CE +4,9;
- AL −5,3; RO −5,2.

**Dentro do município**, entre municípios com 20 seções ou mais:

- a diferença média ponderada é de 2,4 pp em módulo e de **+1,4 pp a favor de Lula nas seções tardias**;
- nas capitais grandes fica abaixo de 1 pp (SP +0,3; RJ +0,7);
- há exceções, como Guarulhos (−2,9) e Campinas (+2,3).

### 4.5 A ordem se repete de um turno para outro?

Pouco. Correlação de Spearman da hora de chegada, medida em AC, PB e AM:

| Par de turnos | Seção | Município |
|---|---|---|
| 2022 1T × 2T | 0,31 a 0,54 | 0,23 a 0,59 |
| 2022 2T × 2026 1T | 0,19 a 0,45 | 0,15 a 0,32 |
| 2022 1T × 2026 1T | 0,15 a 0,54 | 0,06 a 0,35 |

A regularidade forte está no nível de UF e região (4.2), não no de seção.

---

## 5. Implicações para o projeto

- **Calibrar a curva projetada:** use o 1T de 2026 (mesma eleição, mesma rede, mesmo par de candidatos) e o 2T de 2022 (mesmo tipo de turno). Uma estratégia possível, por inferência:
  1. tirar do 1T de 2026 a ordem relativa dos municípios e UFs;
  2. acelerar a escala de tempo, como o 2T acelerou em relação ao 1T em 2022.

  A ordem por seção não se sustenta. O 2018 serve para conferir, com a ressalva de que o público só viu a curva a partir das 19h.
- **Método de projeção:** o que falta apurar não se parece com o que já chegou, nem dentro da UF (até ±10 pp) nem dentro do município (+1,4 pp em média, 2022 2T). Projetar por UF supondo uma variação uniforme sobre o que falta erra sistematicamente.

  Inferência: a base deve ser pelo menos o município. Use o resultado do 1T de 2026 do que falta, mais a variação entre os turnos estimada no que já chegou, e uma folga para a deriva dentro do município.

  Os três turnos com votos refeitos (2018 2T, 2022 2T, 2026 1T) servem de teste fora da amostra, porque a curva e o resultado final de cada um são conhecidos.
- **Atraso do arquivo ao vivo:** no 1T de 2026, o arquivo nacional ficou ~0,7 min (p90 1 min) atrás da 1ª totalização.
- **Ensaio geral:**
  - O 2T de 2022 é o candidato natural. Tem virada, histórico oficial para conferir e cabe em ~130 MB (`detalhe` `_BR` + `bweb` 2T).
  - Com horário e votos por seção, dá para sintetizar a cada minuto os arquivos de Brasil, UF e município no formato que o site consumir ao vivo.
  - O 1T de 2026 é o segundo ensaio (~200 MB). Ele testa o caso "líder desde o início, diferença fechando", sem virada.
  - O projeto paralelo [robertomsgomide/eleicoes](https://github.com/robertomsgomide/eleicoes) já tem um simulador da noite de 2022 (`uv run eleicoes simular`), que pode servir de referência.

---

## 6. O que ficou sem resposta

1. **A curva de votos do 1T de 2018 não foi refeita.** Os horários estão validados (57% na 1ª parcial), mas os votos por seção exigem 251 MB (`votacao_secao_2018_BR`) ou 1,4 GB (`bweb`), acima do limite que usei. O mesmo vale para os votos do 1T de 2022, que, porém, tem o histórico oficial.
2. **O TSE vai publicar o histórico oficial do 1T de 2026 antes de 25/10?** Não se sabe. O do 1T de 2022 saiu 11 a 16 dias depois do turno, e hoje é o 13º dia. O `detalhe_votacao_secao` o substitui.
3. **Não existe histórico oficial por UF ou município.** Ele precisa ser derivado da seção. A confiabilidade disso só foi conferida no nível Brasil. Para a UF, a única referência são os snapshots do wcota (2022 2T).
4. **Primeira totalização com votos finais.** A curva usa os votos finais de cada seção no instante da 1ª totalização. Não verifiquei se alguma seção entrou com votos diferentes e foi corrigida depois. No Brasil, a coincidência com o histórico oficial de 2022 sugere que não houve diferença relevante.
5. **Datas estranhas em 2018.** Há 40 seções com 1ª totalização em 27/10/2018 (véspera do 2T) e 8 em 25/02/2019. Não investiguei.
6. **O blog da Banda B** (53% às 19h05 no 1T de 2018) não bate com o `detalhe` (60%). Atribuí a erro do blog, sem prova.
7. **Base dos Dados:** não confirmei se a tabela de boletins de 2022 mantém a coluna de chegada.

---

## Fontes

TSE (primárias):

- Dados abertos, boletim de urna: [2018](https://dadosabertos.tse.jus.br/dataset/resultados-2018-boletim-de-urna), [2022](https://dadosabertos.tse.jus.br/dataset/resultados-2022-boletim-de-urna), [2026](https://dadosabertos.tse.jus.br/dataset/resultados-2026-boletim-de-urna)
- Dados abertos, resultados: [2018](https://dadosabertos.tse.jus.br/dataset/resultados-2018), [2022](https://dadosabertos.tse.jus.br/dataset/resultados-2022), [2026](https://dadosabertos.tse.jus.br/dataset/resultados-2026)
- `detalhe_votacao_secao`: [2018](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_secao/detalhe_votacao_secao_2018.zip), [2022](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_secao/detalhe_votacao_secao_2022.zip), [2026](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip)
- Histórico de totalização: [1T 2022](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/Historico_Totalizacao_Presidente_BR_1T_2022.zip), [2T 2022](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/Historico_Totalizacao_Presidente_BR_2T_2022.zip)
- `bweb` de amostra: [2022 2T AC](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/buweb/bweb_2t_AC_311020221535.zip), [2026 1T AC](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/buweb/bweb_1t_AC_051020261403.zip), [2018 1T AC](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2018/buweb/BWEB_1t_AC_101020181938.zip), [2018 2T AC](https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2018/buweb/BWEB_2t_AC_301020181744.zip)
- `votacao_secao` Brasil: [2018](https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2018_BR.zip), [2022](https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2022_BR.zip), [2026](https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2026_BR.zip)
- `detalhe_votacao_munzona`: [2018](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2018.zip), [2026](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2026.zip)
- Notícias do TSE: [horário de 2018](https://www.tse.jus.br/comunicacao/noticias/2018/Outubro/eleicoes-2018-divulgacao-de-votos-para-presidente-da-republica-comecara-a-partir-do-fim-da-votacao-no-acre-1), [horário unificado de 2022](https://www.tse.jus.br/comunicacao/noticias/2022/Setembro/votacao-em-todo-pais-seguira-o-horario-de-brasilia), [formato dos logs](https://www.tse.jus.br/eleicoes/eleicoes-2022/arquivos/formato-dos-arquivos-de-log-17-9-22/@@download/file/formato-arquivos-log.pdf)

Terceiros e imprensa:

- Repositórios: [wcota 2T](https://github.com/wcota/br_eleicoes_2022_2T), [wcota 1T](https://github.com/wcota/br_eleicoes_2022_1T), [davimassari-rgb/apura-o26](https://github.com/davimassari-rgb/apura-o26), [robertomsgomide/eleicoes](https://github.com/robertomsgomide/eleicoes), [marcal1981/apuracao-eleicoes-2026](https://github.com/marcal1981/apuracao-eleicoes-2026), [Base dos Dados (SQL)](https://github.com/basedosdados/queries-basedosdados/blob/main/models/br_tse_eleicoes_2022/resultado_boletim_urna.sql)
- Imprensa: [A Gazeta](https://www.agazeta.com.br/es/politica/casagrande-e-lula-como-foi-a-evolucao-de-votos-no-es-minuto-a-minuto-1122), [Agência Brasil](https://agenciabrasil.ebc.com.br/politica/noticia/2018-10/com-100-das-urnas-apuradas-bolsonaro-teve-577-milhoes-de-votos), [Rádio Câmara](https://www.camara.leg.br/radio/programas/546908-jair-bolsonaro-lidera-apuracao-dos-votos-com-88-das-urnas-apuradas/), [EFE/Panamá América](https://www.panamaamerica.com.pa/mundo/derecha-brasilena-lidera-con-un-49-segun-el-primer-escrutinio-parcial-1117995), [Banda B](https://www.bandab.com.br/politica/confira-os-primeiros-boletins-de-urna-no-parana-acompanhe-o-tempo-real/), [BNews](https://www.bnewssaopaulo.com.br/amp/noticias/politica/flavio-bolsonaro-mantem-lideranca-na-apuracao-presidencial.html), [TradeMap](https://trademap.com.br/noticias/news-8377647)
- Wayback CDX: [divulga.tse.jus.br, out/2018](https://web.archive.org/cdx/search/cdx?url=divulga.tse.jus.br/*&from=20181007&to=20181029)
