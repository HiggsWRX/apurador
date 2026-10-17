# Dados históricos por município e malhas

Pesquisa para o ticket [03 — Dados históricos por município e malhas](../issues/03-dados-historicos-e-malhas.md). Fontes consultadas em 17/10/2026.

Convenções:

- **Medido:** número que eu obtive abrindo o arquivo (HEAD HTTP, lista do zip ou leitura do CSV). A fonte é a URL do arquivo.
- **Documentado:** está escrito na página ou no dicionário (`leiame.pdf`) da fonte.
- **Inferência:** conclusão minha, sem documento que a confirme.

Os scripts de medição são protótipos descartáveis e ficaram fora do repositório. O principal deles agrega os votos por município e foi a base da estimativa de tamanho da seção 7.

---

## Resumo

1. **A fonte é o portal de dados abertos do TSE, e ela basta.** Para 2018, 2022 e 2026 (1T), dois arquivos por ano cobrem o nível de município. Um traz os votos por candidato (`votacao_candidato_munzona`), o outro o eleitorado, o comparecimento, os brancos e os nulos (`detalhe_votacao_munzona`). A licença é CC-BY. Os zips são grandes (até 582 MB), mas dentro de cada um há um membro só de Presidente, o `*_BR.csv`, com 0,3 a 2,4 MB comprimidos. O CDN aceita *Range*, então dá para baixar só esse membro.
2. **Já existe a tabela oficial TSE → IBGE** (`municipio_tse_ibge`, do TSE), com 5.571 municípios. Com ela, 100% dos códigos de 2018, 2022 e 2026 casaram, sem nenhuma sobra. A configuração da divulgação ao vivo de 2026 também traz o código IBGE (`cdi`).
3. **O exterior aparece como `SG_UF = "ZZ"`**, com uma "cidade" por posto: 186 em 2026, 181 em 2022 e 171 em 2018. Elas não têm código IBGE nem polígono. O total Brasil oficial inclui o exterior.
4. **Desde 2018 há um único município novo:** Boa Esperança do Norte (MT), com código TSE 73709 e IBGE 5101837. Ele vota a partir de 2026. Os outros 5.570 mantêm o código. Houve só mudanças de grafia de nome.
5. **Malhas:** a API de malhas do IBGE entrega TopoJSON já simplificado (412 KB com gzip, qualidade mínima), mas só da malha de 2022, que não tem Boa Esperança do Norte. A malha de 2024/2025 do IBGE já tem o município, mas vem em shapefile de 199 a 226 MB e precisa ser simplificada na construção.
6. **Seções:** os arquivos por seção existem para os três anos. Para o modelo, cabem em cerca de 4 a 7 MB com gzip por eleição e turno, depois de compactados. Achado importante para outros tickets: `detalhe_votacao_secao` traz, **para cada seção, a hora em que o boletim foi recebido e a hora da primeira totalização** (2018, 2022 e 2026). Isso permite reconstruir a ordem da apuração.
7. **Tamanho final para site estático:** cerca de 0,7 MB com gzip para os resultados das 6 eleições e turnos, por município, mais cerca de 0,4 a 1,0 MB com gzip para a malha. Uma página de mapa carrega em torno de 0,5 a 0,6 MB.

---

## 1. Resultados presidenciais por município (TSE)

### 1.1 Onde estão

O portal tem um conjunto "Resultados" por ano: [2018](https://dadosabertos.tse.jus.br/dataset/resultados-2018), [2022](https://dadosabertos.tse.jus.br/dataset/resultados-2022) e [2026](https://dadosabertos.tse.jus.br/dataset/resultados-2026). Os arquivos ficam em `https://cdn.tse.jus.br/estatistica/sead/odsele/<tipo>/<tipo>_<ano>.zip`. **Documentado:** a licença é CC-BY (páginas de 2018 e da tabela TSE↔IBGE). As páginas declaram atualização diária para o conjunto de 2026 e semanal para o de 2018. Não conferi a de 2022, mas os arquivos de 2022 foram regerados hoje (seção 1.3). O conjunto de 2026 foi criado em 06/10/2026, e os arquivos por seção trazem a nota "Arquivo atualizado ao final de cada turno".

**Documentado** (`leiame.pdf` dentro de cada zip, por exemplo [votacao_candidato_munzona_2026.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip)):

- Os CSV são em Latin-1, separados por `;`, com campos entre aspas.
- `#NULO` (ou -1 em campo numérico) quer dizer vazio. `#NE` (ou -3) quer dizer que o dado não existia no ano.
- `SG_UF` pode valer `BR` (nível nacional), `VT` (voto em trânsito) ou `ZZ` (exterior).
- Cada zip traz um CSV por UF, um `_BR.csv` e um `_BRASIL.csv` (todos os cargos). Nos arquivos de Presidente, `SG_UE = "BR"`.

**Medido:** os servidores do CDN respondem com `Accept-Ranges: bytes` e `Access-Control-Allow-Origin: *` (HEAD em [detalhe_votacao_munzona_2026.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2026.zip)). Por isso dá para ler o diretório do zip e baixar só o membro `_BR.csv` com requisições *Range*. Foi o que fiz, sem baixar os zips inteiros.

### 1.2 Tabela por conjunto de dados (nível município, Presidente)

O arquivo "munzona" tem uma linha por município × zona eleitoral × candidato. Para chegar ao município, basta somar as zonas. São Paulo, por exemplo, tem até 58 zonas (medido).

| Eleição/turno | Nível | URL | Formato | Tamanho (zip inteiro → membro `_BR.csv` comprimido / CSV) | Linhas de Presidente | Colunas-chave |
|---|---|---|---|---|---|---|
| 2018 1T+2T | município×zona×candidato | [votacao_candidato_munzona_2018.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2018.zip) | CSV `;` Latin-1 | 395,4 MB → 2,39 MB / 42,2 MB | 93.600 (81.120 1T + 12.480 2T) | `NR_TURNO`, `SG_UF`, `CD_MUNICIPIO`, `NR_ZONA`, `NR_CANDIDATO`, `NM_URNA_CANDIDATO`, `SG_PARTIDO`, `QT_VOTOS_NOMINAIS_VALIDOS` |
| 2022 1T+2T | idem | [votacao_candidato_munzona_2022.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip) | idem | 581,6 MB → 2,01 MB / 38,1 MB | 81.679 (69.113 + 12.566) | idem |
| 2026 1T | idem | [votacao_candidato_munzona_2026.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip) | idem | 294,3 MB → 1,77 MB / 33,6 MB | 75.504 | idem |
| 2018 1T+2T | município×zona (totais) | [detalhe_votacao_munzona_2018.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2018.zip) | idem | 4,27 MB → 0,64 MB / 3,45 MB | 12.546 (6.273 por turno) | `QT_APTOS`, `QT_COMPARECIMENTO`, `QT_ABSTENCOES`, `QT_TOTAL_VOTOS_VALIDOS`, `QT_VOTOS_BRANCOS`, `QT_TOTAL_VOTOS_NULOS` (= `QT_VOTOS_NULOS` + `QT_VOTOS_NULOS_TECNICOS`), `QT_SECOES_PRINCIPAIS`, `QT_SECOES_AGREGADAS`, `QT_TOTAL_SECOES` |
| 2022 1T+2T | idem | [detalhe_votacao_munzona_2022.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2022.zip) | idem | 4,43 MB → 0,64 MB / 3,45 MB | 12.566 (6.283 por turno) | idem |
| 2026 1T | idem | [detalhe_votacao_munzona_2026.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2026.zip) | idem | 2,51 MB → 0,30 MB / 1,74 MB | 6.292 | idem |

Tamanhos do `Content-Length` e do diretório de cada zip, medidos em 17/10/2026.

**Medido: os totais batem com o resultado oficial conhecido.** Somei os arquivos `_BR.csv`, incluindo o exterior:

| Eleição | Aptos | Comparecimento | Válidos | Brancos | Nulos | Dois primeiros |
|---|---|---|---|---|---|---|
| 2018 1T | 147.306.295 | 117.364.654 | 107.050.749 | 3.106.937 | 7.206.222 | Bolsonaro 49.277.010; Haddad 31.342.051 |
| 2018 2T | 147.306.294 | 115.933.451 | 104.838.753 | 2.486.593 | 8.608.105 | Bolsonaro 57.797.847; Haddad 47.040.906 |
| 2022 1T | 156.454.011 | 123.682.372 | 118.229.719 | 1.964.779 | 3.487.874 | Lula 57.259.504; Bolsonaro 51.072.345 |
| 2022 2T | 156.454.011 | 124.252.796 | 118.552.353 | 1.769.678 | 3.930.765 | Lula 60.345.999; Bolsonaro 58.206.354 |
| 2026 1T | 158.745.502 | 125.275.835 | 119.300.788 | 2.300.798 | 3.674.249 | Flávio Bolsonaro 56.104.503 (47,03%); Lula 53.879.538 (45,16%) |

O 1T de 2026 confere com os 47,03% e 45,16% do `map.md`. Em todos os municípios e turnos, a soma dos votos por candidato é igual a `QT_TOTAL_VOTOS_VALIDOS` (0 divergências, medido). O total de aptos de 2026 (158.745.502) é o mesmo que a página de 2026 cita. Segundo ela, 39 registros ficaram nas seções de origem durante a transferência temporária de eleitores, e sem eles o total efetivo seria 158.745.463 ([resultados-2026](https://dadosabertos.tse.jus.br/dataset/resultados-2026)).

### 1.3 Cuidados ao preparar

- **Código do município sem zeros à esquerda no arquivo de candidatos.** No `detalhe`, `CD_MUNICIPIO` vem com 5 dígitos (`"01015"`). No `votacao_candidato`, vem sem os zeros (`1015`). Medido nos três anos. Faça o *join* como inteiro.
- **"Nulos técnicos" em 2026.** O 1T de 2026 tem `QT_VOTOS_NULOS_TECNICOS = 5.246` (medido), somados em `QT_TOTAL_VOTOS_NULOS`. 2018 e 2022 têm zero. Uma amostra do arquivo por seção de 2026 (os primeiros 2,3 MB) lista 13 números de candidato, e o de município lista 12 com voto válido. *Inferência:* os votos do número 28 foram anulados (registro indeferido) e contam como nulos técnicos. Quem usar `votacao_secao` precisa tratar esse número como nulo.
- **Candidatos por 1T:** 13 em 2018, 11 em 2022 e 12 com voto válido em 2026 (medido).
- **Os arquivos são regerados todo dia**, inclusive os de 2022: o `DT_GERACAO` do `_BR.csv` de 2022 é 17/10/2026 03:16. Convém congelar uma cópia e registrar o `DT_GERACAO` usado.
- **Os formatos variam entre anos.** Em `votacao_secao` de 2022 todos os campos vêm entre aspas e em maiúsculas (`"PRESIDENTE"`). Em 2026, os numéricos vêm sem aspas e o texto vem em caixa mista (`Presidente`). Medido nas amostras. O parser precisa ser tolerante.
- **2T de 2026:** o `votacao_secao_2026_BR.zip` do 1T foi publicado em 06/10, dois dias depois da eleição (`Last-Modified`). O `detalhe_votacao_secao` tem `DT_GERACAO` de 05/10. *Inferência:* os arquivos oficiais do 2T (25/10) devem sair entre 26 e 27/10. Na noite da eleição, o dado vem da divulgação ao vivo (ticket 01).

### 1.4 Versão já tratada: Base dos Dados

O conjunto "Eleições Brasileiras" (organização `tse`) tem as tabelas `resultados_candidato_municipio` e `detalhes_votacao_municipio`, além das versões por zona e por seção. Elas ficam no BigQuery em `basedosdados.br_tse_eleicoes.*`. Metadados lidos pela API GraphQL do site ([backend.basedosdados.org/graphql](https://backend.basedosdados.org/graphql); a página [basedosdados.org/dataset/br-tse-eleicoes](https://basedosdados.org/dataset/br-tse-eleicoes) é montada no navegador):

| Tabela | Linhas (todos os cargos e anos) | Tamanho descomprimido | Cobertura (metadado) | Atualizada |
|---|---|---|---|---|
| `resultados_candidato_municipio` | 37.709.247 | 5,6 GB | 1994–2026 | 15/10/2026 |
| `detalhes_votacao_municipio` | 365.122 | 77 MB | 1994–2026 | 15/10/2026 |
| `resultados_candidato_secao` | 576.811.898 | 81,9 GB | 1994–2026 | 15/10/2026 |
| `detalhes_votacao_secao` | 26.442.036 | 5,1 GB | 1994–2026 | 15/10/2026 |

- **Vantagem:** já vem com `id_municipio` (IBGE, 7 dígitos) ao lado de `id_municipio_tse`. `detalhes_votacao_municipio` ainda traz `votos_validos`, `votos_brancos`, `votos_nulos` e proporções prontas (lista de colunas pela mesma API).
- **Acesso:** consulta no BigQuery com um projeto próprio no Google Cloud, mesmo vazio, e 1 TB grátis por mês, sem cartão ([docs de acesso](https://basedosdados.org/docs/access_data_bq)).
- **Não verifiquei** se as linhas do 1T de 2026 já estão nas tabelas. A cobertura "até 2026" é metadado, e conferir exigiria rodar uma consulta.
- **Conclusão:** não vale a dependência. O TSE direto, com a tabela oficial TSE↔IBGE, chega ao mesmo resultado (seção 3), sem conta Google e com dado do mesmo dia.

### 1.5 Esforço de preparo (nível município)

O protótipo é um script Python de cerca de 100 linhas, só com a biblioteca padrão. Ele baixa só os membros `_BR.csv` (6 arquivos, cerca de 8 MB no total), soma as zonas, cruza com a tabela TSE↔IBGE e grava um CSV por eleição e turno. Rodou em segundos e não sobrou nenhum código sem correspondência. Estimativa para versão de produção, com testes que comparem os totais oficiais da seção 1.2: **meio dia**. O 2T de 2026 entra rodando o mesmo script quando o TSE atualizar os zips.

---

## 2. Nível de seção (uso interno do modelo)

### 2.1 Arquivos

| Eleição | Conteúdo | URL | Tamanho | Linhas | Colunas-chave |
|---|---|---|---|---|---|
| 2018 1T+2T | votos por seção × votável (Presidente) | [votacao_secao_2018_BR.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2018_BR.zip) | 251,0 MB zip / 1,83 GB CSV | ≈ 6,6 milhões (estimativa pela amostra) | `NR_TURNO`, `SG_UF`, `CD_MUNICIPIO`, `NR_ZONA`, `NR_SECAO`, `NR_VOTAVEL` (95 = branco, 96 = nulo), `NM_VOTAVEL`, `QT_VOTOS`, `NR_LOCAL_VOTACAO` |
| 2022 1T+2T | idem | [votacao_secao_2022_BR.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2022_BR.zip) | 271,3 MB / 1,59 GB | ≈ 5,3 milhões (estimativa) | idem |
| 2026 1T | idem | [votacao_secao_2026_BR.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2026_BR.zip) | 161,6 MB / 1,05 GB | ≈ 3,7 milhões (estimativa) | idem |
| 2018 1T+2T | totais por seção (membro `_BR.csv` = Presidente) | [detalhe_votacao_secao_2018.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_secao/detalhe_votacao_secao_2018.zip) | 256,1 MB zip → membro BR 61,8 MB / 313 MB | não contado | `QT_APTOS`, `QT_COMPARECIMENTO`, `QT_ABSTENCOES`, `QT_VOTOS_NOMINAIS`, `QT_VOTOS_BRANCOS`, `QT_VOTOS_NULOS`, `NR_LOCAL_VOTACAO`, **`DT_RECEBIMENTO_BU_HOR_TSE`**, **`DT_PRIM_TOT_PARCIAL_HOR_TSE`**, `DS_ORIGEM_VOTO`, `ST_SECAO_INSTALADA`, `ST_SECAO_ANULADA`, `CD_MODELO_URNA` |
| 2022 1T+2T | idem | [detalhe_votacao_secao_2022.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_secao/detalhe_votacao_secao_2022.zip) | 243,8 MB → 59,5 MB / 331 MB | 944.150 (472.075 por turno) | idem |
| 2026 1T | idem | [detalhe_votacao_secao_2026.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip) | 176,9 MB → 34,1 MB / 176 MB | 499.248 | idem |

As colunas e o significado vêm do `leiame.pdf` de cada zip. As linhas de 2022 e 2026 foram contadas no membro `_BR.csv`. As de `votacao_secao` foram estimadas pelo tamanho médio de linha numa amostra do início do arquivo: 276 a 302 bytes.

- **Os votos por candidato e por seção só estão em `votacao_secao_<ano>_BR.zip`**, que tem de 160 a 270 MB por ano. O `detalhe_votacao_secao` tem apenas o total de votos nominais.
- **Seções principais e agregadas:** em 2022, `QT_SECOES_PRINCIPAIS` = 472.075 e `QT_SECOES_AGREGADAS` = 24.163 por turno (medido no `detalhe_votacao_munzona`). O arquivo por seção tem 472.075 linhas por turno, ou seja, uma por seção principal. Em 2026 são 499.248 principais e 17.931 agregadas. Isso importa para o denominador do "% de seções totalizadas" (tickets 01 e 02).
- **A chave da seção é razoavelmente estável:** 92,4% das seções do 1T de 2026, com 93,2% do eleitorado, têm a mesma chave (UF, município, zona, seção) que no 2T de 2022. Em 87,4% delas, o local de votação também é o mesmo (medido). O resto mudou por rezoneamento ou por seção nova, e o modelo precisa de uma regra de reserva para esses casos, por exemplo usar o local de votação ou o município.
- **Tamanho para o modelo:** o 1T de 2026 por seção, com chave + aptos, comparecimento, nominais, brancos e nulos, ocupa 9,5 MB em binário fixo e **4,1 MB com gzip** (medido). Somando dois candidatos e uma coluna "outros", a estimativa é de cerca de 12 a 14 MB brutos e **6 a 7 MB com gzip** por eleição e turno. Dá para usar no modelo, mas não para mandar a todo visitante.
- **Esforço:** um dia, para ler em fluxo os CSV de 1 a 1,8 GB, pivotar os votáveis e compactar o resultado.

### 2.2 Horário de cada seção (achado para os tickets 02 e 05)

Segundo o `leiame.pdf` do `detalhe_votacao_secao`, `DT_RECEBIMENTO_BU_HOR_TSE` é a "data e hora do recebimento do Boletim de Urna (Hora TSE)". `DT_PRIM_TOT_PARCIAL_HOR_TSE` é a "data e hora da primeira totalização parcial do Boletim de Urna da seção". Medido: nenhuma linha vem sem horário em 2022 nem em 2026. A amostra de 2018 também tem os dois campos preenchidos.

| Turno | Primeira totalização | Última |
|---|---|---|
| 2022 1T | 02/10/2022 17:04:47 | 04/10/2022 10:27:34 |
| 2022 2T | 30/10/2022 17:00:51 | 31/10/2022 00:18:04 |
| 2026 1T | 04/10/2026 17:08:57 | 05/10/2026 02:58:39 |

*Inferência:* com esses horários dá para reconstruir a curva real de eleições passadas, seção por seção, e assim ensaiar e validar a projeção contra 2022 sem depender de capturas feitas na noite. A "Hora TSE" parece ser a de Brasília, porque a apuração começa às 17h, mas o dicionário não diz isso. O ticket 02 deve confirmar.

---

## 3. Correspondência código TSE ↔ código IBGE

| Conjunto | URL | Formato | Tamanho | Linhas | Colunas |
|---|---|---|---|---|---|
| "Códigos oficiais de UF e municípios segundo o TSE e o IBGE" | [página](https://dadosabertos.tse.jus.br/dataset/codigos-oficiais-de-uf-e-municipios-segundo-o-tse-e-o-ibge) · [municipio_tse_ibge.zip](https://cdn.tse.jus.br/estatistica/sead/odsele/municipio_tse_ibge/municipio_tse_ibge.zip) | CSV `;` Latin-1 | 139 KB zip / 520 KB CSV | 5.571 (27 UFs, sem ZZ) | `CD_UF_TSE`, `CD_UF_IBGE`, `SG_UF`, `NM_UF`, `CD_MUNICIPIO_TSE` (5 dígitos), `NM_MUNICIPIO_TSE`, `CD_MUNICIPIO_IBGE` (7 dígitos), `NM_MUNICIPIO_IBGE` |

- **Documentado:** licença CC-BY, publicação da TSE/SMG, criado em 24/06/2025 e atualizado "sob demanda". O arquivo baixado tem `DT_GERACAO` 11/10/2026.
- **Medido:** a correspondência é 1:1 (5.571 códigos TSE únicos e 5.571 IBGE únicos). Todos os códigos de município não-ZZ de 2018, 2022 e 2026 encontram par, com 0 sobras.
- **Medido:** em 46 municípios, o nome no TSE difere do nome no IBGE por acento, hífen ou forma ("Iuiu" × "Iuiú", "Sem Peixe" × "Sem-Peixe", "Bom Jesus" × "Bom Jesus De Goiás"). Para exibir, use um só nome, o do IBGE, e sempre cruze por código.
- **Ao vivo:** o arquivo de configuração de municípios da divulgação de 2026, [mun-e006257-cm.json](https://resultados.tse.jus.br/oficial/ele2026/6257/config/mun-e006257-cm.json) (1T, gerado em 02/10/2026), traz para cada município `cd` (TSE) e `cdi` (IBGE, 7 dígitos). No exterior, `cdi` vem vazio. São 5.757 entradas em 28 abrangências, contando `zz` (medido). O caminho ao vivo, portanto, também liga direto à malha. Os detalhes da API ficam no ticket 01.
- **Alternativas:** a Base dos Dados (colunas `id_municipio` e `id_municipio_tse` nas próprias tabelas) e o repositório [betafcc/Municipios-Brasileiros-TSE](https://github.com/betafcc/Municipios-Brasileiros-TSE), parado desde 2018, sem licença declarada e sem Boa Esperança do Norte (API do GitHub). A tabela oficial torna os dois desnecessários.

---

## 4. Exterior (ZZ)

- **Documentado:** `SG_UF = "ZZ"` quer dizer exterior (`leiame.pdf`).
- **Medido:** cada posto no exterior aparece como um "município" com código TSE próprio (por exemplo, 29254 ABIDJÃ e 29262 ABU DHABI), sempre na zona 1, e sem código IBGE, nem na tabela TSE↔IBGE nem no `cdi` da divulgação. O arquivo não informa o país.

| Eleição | Cidades no exterior | Aptos | Comparecimento | Válidos | Seções |
|---|---|---|---|---|---|
| 2018 1T | 171 no `detalhe` (só 138 com votos: 33 sem seção instalada ou com comparecimento 0) | 500.340 | 202.766 | 193.381 | — |
| 2022 1T | 181 | 695.355 | 304.032 | 294.525 | 1.064 |
| 2022 2T | 181 | 695.578 | 310.148 | 298.169 | 1.064 |
| 2026 1T | 186 | 916.534 | 341.766 | 330.882 | 1.351 |

- A lista de postos muda entre eleições. De 2022 para 2026 entraram Dacca, Santa Elena de Uairén, Pyongyang, Orlando, Edimburgo e Marselha, e saiu Vaticano (medido).
- **Como tratar (proposta):** (a) o total **Brasil** inclui o exterior, e só assim bate com o oficial (seção 1.2). (b) No mapa, o exterior não tem polígono. (c) No explorador, entra como um lugar "Exterior" agregado, ao lado das UFs, sem detalhamento por cidade. Para mostrar países, seria preciso uma tabela manual cidade → país, com cerca de 190 linhas. Para o modelo, o exterior pesa 0,6% do eleitorado e 0,28% dos válidos em 2026 e pode ser tratado como um bloco.
- **Voto em trânsito:** nos arquivos de Presidente de 2018 a 2026 não há linha com `SG_UF = "VT"` nem com `ST_VOTO_EM_TRANSITO = "S"` (medido). *Inferência:* esses votos entram como seções comuns do município onde foram dados.

---

## 5. Malhas geográficas (municípios e UFs)

### 5.1 Fontes

| Fonte | Ano da malha | Municípios | Formato e tamanho | Licença | Observações |
|---|---|---|---|---|---|
| IBGE, Malha Municipal Digital, geoftp: [municipio_2025/Brasil](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/Brasil/) | 2025 (publicada em 26/02/2026) | 5.571 + 2 lagoas (*inferência* pelo geobr, ver abaixo) | Shapefile: `BR_Municipios_2025.zip` 226 MB; `BR_UF_2025.zip` 14 MB; também há arquivos por UF (MT: 9,0 MB) | Sem licença aberta explícita (ver 5.3) | Resolução cheia. Tem Boa Esperança do Norte (`CD_MUN` 5101837; medido no arquivo de MT). Colunas: `CD_MUN`, `NM_MUN`, `SIGLA_UF`, `CD_UF`, `AREA_KM2` e outras |
| IBGE geoftp [municipio_2024/Brasil](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2024/Brasil/) | 2024 (29/04/2025) | 5.571 (*inferência*: só o arquivo de MT foi conferido) | `BR_Municipios_2024.zip` 199 MB | idem | Também tem Boa Esperança do Norte (medido, MT 2024: 142 municípios) |
| IBGE, API de malhas v3: [docs](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3) | **2022** (só `periodo=2022` funciona; 2023, 2024 e 2025 dão HTTP 500, testado em 17/10/2026) | **5.570, sem Boa Esperança do Norte** | TopoJSON ou GeoJSON já simplificados, em três qualidades (tabela 5.2) | idem | Propriedade `codarea` = código IBGE de 7 dígitos; objeto TopoJSON `BRMU`; sem lagoas. Exemplo: `https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/json&qualidade=minima&intrarregiao=municipio` |
| geobr (Ipea), [repositório](https://github.com/ipeaGIT/geobr) e [dados v2.0.0](https://github.com/ipea/geobr_prep_data/releases/tag/v2.0.0) | 1872–2025 | conforme o ano | GeoParquet: `municipalities_2025_simplified.parquet` 21,1 MB; `municipalities_2025.parquet` 317,5 MB; `states_2025_simplified.parquet` 1,8 MB | Pacote: MIT ([DESCRIPTION](https://raw.githubusercontent.com/ipeaGIT/geobr/master/r-package/DESCRIPTION)) | O "simplificado" ainda é pesado para a web. A função tira as lagoas 4300001 e 4300002 por padrão ([read_municipality.R](https://raw.githubusercontent.com/ipeaGIT/geobr/master/r-package/R/read_municipality.R)) |
| Projetos da comunidade: [tbrugz/geodata-br](https://github.com/tbrugz/geodata-br) (CC0, GeoJSON por UF, último push em 01/2024), [carolinabigonha/br-atlas](https://github.com/carolinabigonha/br-atlas) (scripts de TopoJSON, 2022), [fititnt/gis-dataset-brasil](https://github.com/fititnt/gis-dataset-brasil) (arquivado) | anteriores a 2025 | ≤ 5.570 | — | variada | Desatualizados: nenhum tem Boa Esperança do Norte. Não recomendo |

### 5.2 Tamanhos medidos (API de malhas do IBGE, malha de 2022)

| Recorte | Qualidade | TopoJSON bruto / gzip | GeoJSON bruto / gzip |
|---|---|---|---|
| Municípios (5.570) | mínima | 1,43 MB / **412 KB** | 3,61 MB / 836 KB |
| Municípios | intermediária | 3,32 MB / 1,04 MB | 12,3 MB / 3,20 MB |
| Municípios | máxima | 12,6 MB / 3,89 MB | 56,1 MB / 13,4 MB |
| UFs (27) | mínima | 31 KB / 11 KB | — |
| UFs | intermediária | 78 KB / 26 KB | — |

Fonte: as requisições `.../api/v3/malhas/paises/BR?formato=<application/json | application/vnd.geo+json>&qualidade=<q>&intrarregiao=<municipio|UF>`, com `Accept-Encoding: gzip`. O gzip é o do próprio servidor do IBGE.

O TopoJSON compartilha as fronteiras entre polígonos e é 2,5 a 4 vezes menor que o GeoJSON. Com a topologia de municípios, o navegador também consegue gerar as bordas de UF (`topojson.mesh`/`merge`) sem um segundo arquivo.

### 5.3 Licença

- **IBGE:** não encontrei licença aberta explícita, do tipo CC, para a Malha Municipal. O `Leia_me.pdf` ([2022](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/Leia_me.pdf)) e o `LEIA-ME.txt` de 2025 (dentro dos zips) remetem à Nota Metodológica "Informações técnicas e legais para a utilização dos dados publicados". Também dizem que a malha "não pode ser utilizada, em nenhuma hipótese, como sendo uma malha oficial da divisão político-administrativa", porque os limites são aproximados. *Inferência:* o uso para visualização, citando o IBGE como fonte, é a prática corrente. O ticket 04 pode confirmar.
- **geobr:** código sob MIT. Os dados são derivados do IBGE.

### 5.4 Recomendação

- **Caminho preferido:** usar a malha IBGE de 2025 (ou de 2024), que é a única oficial com os 5.571 municípios de 2026, simplificada na construção do site. Exemplo: `mapshaper BR_Municipios_2025.shp -filter 'CD_MUN!="4300001" && CD_MUN!="4300002"' -simplify 3% keep-shapes -o format=topojson quantization=1e5`.
  - *Estimativa*, não medida: o resultado deve ficar perto do TopoJSON "mínima" do IBGE, ou seja, entre 1,4 e 2 MB brutos e **0,4 a 0,6 MB com gzip**.
  - Não rodei o mapshaper. Ele não está instalado aqui, e o shapefile nacional passa do limite de download desta pesquisa.
  - Esforço: 1 a 3 horas, contando a conferência visual.
- **Caminho de reserva**, se faltar tempo: usar o TopoJSON "mínima" da API do IBGE (2022) como está. A consequência é que Boa Esperança do Norte (4.326 aptos em 2026) fica sem polígono, e a área dela aparece dentro de Nova Ubiratã e/ou Sorriso. Dá para colorir essa área com os dados do município de origem e avisar, mas isso é um erro de geografia visível.

---

## 6. Mudanças de municípios entre 2018 e 2026

- **Criação:** Boa Esperança do Norte (MT), com código TSE 73709, IBGE 5101837 e zona 43. Medido:
  - O município está na tabela TSE↔IBGE, na configuração da divulgação de 2026, na API de localidades do IBGE ([/municipios/5101837](https://servicodados.ibge.gov.br/api/v1/localidades/municipios/5101837); [/municipios](https://servicodados.ibge.gov.br/api/v1/localidades/municipios) lista 5.571) e na malha IBGE de 2024 e de 2025.
  - Não está na de 2022, nem nos resultados de 2018 e de 2022.
  - Em 2026 tem 13 seções e 4.326 aptos.
  - Segundo a imprensa, foi desmembrado de **Sorriso e Nova Ubiratã** e instalado em 01/01/2025, depois de validação pelo STF. Exemplos: [O Povo](https://www.opovo.com.br/trends/novo-municipio-do-brasil-qual-o-nome-e-onde-fica/) e [Correio do Estado](https://correiodoestado.com.br/mix/municipio-mais-jovem-do-brasil-nasceu-em-2025-e-ja-supera-18-mil-cidades-no-numero-de-moradores/). São fontes secundárias. A lei estadual 7.264/2000 está fora do ar, e as páginas do IBGE Cidades negaram o acesso.
  - Indício nos dados: os 3 locais de votação de 2026 ainda tinham, em 2022, 4 seções com o mesmo nome de local, todas em **Nova Ubiratã** (medido no `detalhe_votacao_secao`).
- **Nenhuma outra criação, fusão ou extinção:** os conjuntos de códigos de município fora do exterior são idênticos em 2018 e 2022 (5.570), e 2026 tem os mesmos mais Boa Esperança do Norte (5.571). Medido nos arquivos `_BR.csv`.
- **Mudanças de nome no TSE**, que não afetam o *join* por código (medido):
  - 2018 → 2022: Quinjingue → Quijingue (BA); Arês → Arez (RN); Fortaleza do Tabocão → Tabocão (TO); Ereré (CE, só acentuação).
  - 2022 → 2026: Camacã → Camacan (BA); Santa Isabel do Pará → Santa Izabel do Pará; Munhoz de Melo → Munhoz de Mello (PR); Santo Antonio do Caiuá e Antonio Olinto passam a ter acento (PR); Bom Jesus de Goiás → Bom Jesus (GO).
- **Limites:** o IBGE revisa os limites a cada edição da malha. Não medi o tamanho dessas mudanças entre 2018 e 2025. Para o site, que usa uma malha só, isso não importa.
- **Como comparar entre anos (proposta):** comparar sempre por código IBGE. Boa Esperança do Norte aparece "sem dados" em 2018 e 2022. Nas comparações de Sorriso e Nova Ubiratã entre 2022 e 2026, avisar que parte do eleitorado passou ao município novo. Outra opção é comparar a soma "Nova Ubiratã + Sorriso + Boa Esperança do Norte".

---

## 7. Estimativa do tamanho final para o site estático

Medido com o protótipo: um CSV por eleição e turno, uma linha por município (código IBGE) e mais uma linha "ZZ". As colunas são `id, aptos, comp, brancos, nulos, c<número do candidato>…`.

| Arquivo | Lugares | Candidatos | Bruto | gzip | Variante "2 primeiros + outros" (bruto / gzip) |
|---|---|---|---|---|---|
| pres_2018_1t | 5.571 | 13 | 388 KB | 166 KB | 229 KB / 102 KB |
| pres_2018_2t | 5.571 | 2 | 204 KB | 91 KB | — |
| pres_2022_1t | 5.571 | 11 | 335 KB | 141 KB | 226 KB / 100 KB |
| pres_2022_2t | 5.571 | 2 | 202 KB | 90 KB | — |
| pres_2026_1t | 5.572 | 12 | 348 KB | 144 KB | 227 KB / 101 KB |
| pres_2026_2t (estimativa) | 5.572 | 2 | ≈ 205 KB | ≈ 91 KB | — |
| **Total resultados** | | | **≈ 1,7 MB** | **≈ 0,72 MB** | ≈ 0,54 MB com gzip se o 1T usar a variante |
| Lugares (código IBGE → nome, UF, código TSE), JSON | 5.571 | | 224 KB | 72 KB | |
| Malha de municípios TopoJSON (simplificada) | 5.571 | | ≈ 1,4–3,3 MB | ≈ 0,4–1,0 MB | mínima ou intermediária |
| Malha de UFs (ou gerada da topologia de municípios) | 27 | | 31–78 KB | 11–26 KB | |
| **Total do explorador** | | | **≈ 3,4–5,3 MB** | **≈ 1,2–1,8 MB** | |

- Os níveis Brasil e UF saem da soma dos municípios, no navegador ou na construção, e custam poucos KB.
- Uma página de mapa de uma eleição baixa a malha e um CSV: **≈ 0,5–0,6 MB com gzip**.
- Um JSON único com as 5 eleições já publicadas ocupa 1,59 MB brutos e 668 KB com gzip (medido). É praticamente o mesmo que os CSV separados.
- O nível de seção não vai para o visitante. Ele custa cerca de 6 a 7 MB com gzip por eleição e turno, se o modelo rodar no navegador, ou fica no serviço intermediário (seção 2.1).

---

## 8. O que ficou sem resposta

1. **Tamanho real da malha de 2025 simplificada:** é estimativa feita pela malha de 2022 da API do IBGE. Não rodei o mapshaper.
2. **Licença da malha do IBGE:** não achei licença aberta explícita, só termos de isenção. Não li a Nota Metodológica completa, que está na biblioteca do IBGE, com o site negando acesso automatizado (HTTP 403).
3. **Se a API de malhas do IBGE vai ganhar as malhas de 2024/2025:** hoje só `periodo=2022` responde.
4. **Base dos Dados com o 1T de 2026:** não verifiquei, porque exigiria rodar uma consulta no BigQuery.
5. **Origem de Boa Esperança do Norte:** a origem "Sorriso + Nova Ubiratã" vem de fontes secundárias. Os dados do TSE só mostram ligação com Nova Ubiratã.
6. **Fuso de "Hora TSE"** nos horários por seção: parece ser o de Brasília, mas o dicionário não diz. Fica para o ticket 02.
7. **Número 28 no 1T de 2026:** a leitura de que os votos dele são os "nulos técnicos" é inferência. Não li o registro de candidatura.
8. **Voto em trânsito:** a leitura de que entra como seção comum do município onde foi dado é inferência.
9. **Quando saem os arquivos oficiais do 2T de 2026:** a estimativa de 26 a 27/10 vem do que aconteceu no 1T.
10. **Contagem exata de linhas de `votacao_secao`:** estimei pela amostra. Não baixei os arquivos inteiros, de 160 a 270 MB.

---

## 9. Achados que afetam outros tickets e decisões

- **Tickets 02 e 05 (linha do tempo e projeção):** `detalhe_votacao_secao` traz a hora da primeira totalização de cada seção em 2018, 2022 e 2026. Com isso dá para reconstruir a curva real de eleições passadas e montar o ensaio geral sem capturas próprias.
- **Ticket 01 (API ao vivo):** a configuração de municípios da divulgação de 2026 já traz o código IBGE (`cdi`), e o exterior vem como a abrangência `zz`. O CDN de dados abertos aceita *Range* e CORS `*`.
- **Denominador do "% de seções totalizadas":** os arquivos separam seções principais (472.075 em 2022; 499.248 em 2026) e agregadas (24.163; 17.931). É preciso definir qual conta a divulgação usa.
- **Glossário:** "Lugar" é definido como Brasil, UF ou município, mas o exterior (ZZ) não é nenhum dos três e entra no total Brasil. É preciso decidir se "Exterior" é um lugar.
- **Congelar os dados:** o TSE regera os arquivos todo dia, inclusive os de 2022. Os dados derivados devem ser versionados com o `DT_GERACAO` de origem.

---

## Fontes

- TSE, dados abertos: [Resultados 2018](https://dadosabertos.tse.jus.br/dataset/resultados-2018) · [Resultados 2022](https://dadosabertos.tse.jus.br/dataset/resultados-2022) · [Resultados 2026](https://dadosabertos.tse.jus.br/dataset/resultados-2026) · [Códigos de UF e municípios TSE/IBGE](https://dadosabertos.tse.jus.br/dataset/codigos-oficiais-de-uf-e-municipios-segundo-o-tse-e-o-ibge)
- Arquivos do TSE (tamanhos e conteúdo medidos): os links das tabelas das seções 1.2, 2.1 e 3, e o `leiame.pdf` dentro de cada zip.
- TSE, divulgação 2026: [mun-e006257-cm.json](https://resultados.tse.jus.br/oficial/ele2026/6257/config/mun-e006257-cm.json)
- Base dos Dados: [página do conjunto](https://basedosdados.org/dataset/br-tse-eleicoes) · [API GraphQL](https://backend.basedosdados.org/graphql) · [acesso via BigQuery](https://basedosdados.org/docs/access_data_bq)
- IBGE: [geoftp, malhas municipais](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/) · [API de malhas v3](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3) · [API de localidades](https://servicodados.ibge.gov.br/api/v1/localidades/municipios) · [Leia_me 2022](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/Leia_me.pdf)
- geobr: [código](https://github.com/ipeaGIT/geobr) · [dados v2.0.0](https://github.com/ipea/geobr_prep_data/releases/tag/v2.0.0)
- Comunidade: [tbrugz/geodata-br](https://github.com/tbrugz/geodata-br) · [carolinabigonha/br-atlas](https://github.com/carolinabigonha/br-atlas) · [fititnt/gis-dataset-brasil](https://github.com/fititnt/gis-dataset-brasil) · [betafcc/Municipios-Brasileiros-TSE](https://github.com/betafcc/Municipios-Brasileiros-TSE)
- Boa Esperança do Norte (fontes secundárias): [O Povo](https://www.opovo.com.br/trends/novo-municipio-do-brasil-qual-o-nome-e-onde-fica/) · [Correio do Estado](https://correiodoestado.com.br/mix/municipio-mais-jovem-do-brasil-nasceu-em-2025-e-ja-supera-18-mil-cidades-no-numero-de-moradores/)
