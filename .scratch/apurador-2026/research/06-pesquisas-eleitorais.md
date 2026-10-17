# Pesquisas eleitorais: dados atuais e erro histórico

Pesquisa para o ticket [06 — Pesquisas eleitorais: dados atuais e erro histórico](../issues/06-pesquisas-eleitorais.md). Fontes consultadas em 17/10/2026.

Os termos do produto seguem o `GLOSSARY.md`. Todo percentual de candidato está em **votos válidos**, salvo quando a tabela diz "votos totais". Converto votos totais em válidos dividindo o voto do candidato pela soma dos dois candidatos (no 2º turno) ou por 100 menos brancos, nulos e indecisos (no 1º turno). Isso equivale a repartir os indecisos na proporção dos candidatos, que é o critério dos institutos: o Datafolha diz que o cálculo de válidos "exclui brancos, nulos e indecisos" (CNN Brasil, <https://www.cnnbrasil.com.br/eleicoes/datafolha-flavio-tem-52-dos-votos-validos-lula-48/>).

Convenções:

- **Fonte primária**: dado do próprio dono (TSE, instituto, autor do conjunto de dados ou do artigo). Quando só consegui uma reportagem, digo isso.
- **Índice**: a Wikipédia serviu para achar as pesquisas e as reportagens de cada uma. Os números que copiei dela conferem com as manchetes das reportagens citadas como referência na própria página.
- **Inferência nossa**: conclusão minha, sem fonte que a afirme diretamente.
- **(calc.)**: número que eu calculei a partir de votos totais publicados.

Os arquivos baixados e os scripts de contagem ficaram fora do repositório, na pasta temporária da sessão (`scratchpad/06-pesquisas/` e `scratchpad/scripts/`). Não versionei nada disso.

---

## Resumo

1. **O TSE não publica resultados de pesquisas, só o registro.** O conjunto aberto "Pesquisas Eleitorais – 2026" (CSV, atualizado diariamente) traz instituto, CNPJ, número de registro, datas de campo, data liberada para divulgação, tamanho da amostra, custo, estatístico responsável, metodologia e plano amostral em texto livre. Não traz percentuais (seção 1.1). **Os números de cada pesquisa só existem nas reportagens e nos PDFs dos institutos.** A página da Wikipédia em inglês, lida pelo `action=raw`, é a fonte legível por máquina mais completa para as pesquisas nacionais de 2026.
2. **2º turno de 2026, até 17/10:** encontrei **19 pesquisas nacionais publicadas** de 13 institutos, com campo entre 3 e 16/10 (tabela 1.2). Nas 7 pesquisas com campo iniciado de 3 a 8/10, a média simples dava **Flávio 52,3%**. Nas 12 com campo iniciado de 10 a 14/10, caiu para **51,1%**, e todas ficaram entre 50,0% e 52,6%. Os agregadores davam Flávio entre 51,2% e 52,2% de 13 a 17/10 (seção 1.5). Vox Brasil é o único instituto com Lula à frente (5 a 7/10).
3. **Frequência até 24/10:** pelo registro do TSE, há **23 pesquisas nacionais** liberadas para divulgação entre 18 e 23/10, de cerca de 20 institutos (Datafolha, Quaest, AtlasIntel, PoderData, Paraná Pesquisas, Nexus, Futura, Gerp, Palver, Veritá, Vox, Real Time Big Data e outros). São cerca de 4 por dia. Como a lei exige registro 5 dias antes da divulgação, a lista de tudo o que pode sair até 24/10 estará fechada por volta de 19/10 (seção 1.3).
4. **Pesquisas por UF no 2º turno de 2026 são poucas e mal distribuídas.** Há **30 registros estaduais** para Presidente depois do 1º turno: RN 9, DF 6, TO 5, ES 2, AM 2, AC 2 (mais um AC/AM), RJ 1, MG 1, BA 1. Não há nenhum, até agora, em SP, PR, RS, PE, CE, PA, GO e na maioria das UFs. O registro também não marca a UF: toda pesquisa para Presidente é registrada como "BR", e a UF só aparece no texto do plano amostral (seção 1.4).
5. **Histórico 2002–2022: existe um conjunto compilado e aberto, com buracos.** A tabela `br_poder360_pesquisas.microdados` da Base dos Dados (banco do Poder360) tem 166 mil linhas, de 2000 a 2024. O trecho até nov/2023 é aberto e tem download direto de 2 MB. **Faltam o 2º turno de 2002 e toda a campanha de 2018.** Uma cópia antiga do mesmo banco, no GitHub do Pindograma, cobre 2014 e 2018. A Wikipédia cobre o 2º turno nacional de 2010, 2014, 2018 e 2022. Para 2002 só achei uma média diária, sem nome do instituto (Jennings e Wlezien) (seção 2.1).
6. **Erro das pesquisas finais no 2º turno (participação do candidato do PT, votos válidos):** o **erro da média simples** das pesquisas finais foi de +1,8 (2002), +1,2 (2006), −0,3 (2010), −0,8 (2014), −1,9 (2018) e +0,1 (2022) ponto. Isso dá cerca de **1,2 ponto de raiz do erro quadrático médio na participação, ou 2,5 pontos na margem**, sem sinal constante. Cada instituto, isoladamente, erra mais: erro absoluto médio de 1,2 a 2,5 pontos por eleição, com casos de 5 a 6 pontos (tabela 2.3). Meireles e Russo (2022) acham uma raiz do erro quadrático médio de 3,0 pontos nas pesquisas de véspera do 2º turno presidencial e de 3,9 no 1º turno.
7. **No 1º turno, o erro tem lado.** Em 2018, 2022 e **2026** as pesquisas finais subestimaram o candidato bolsonarista: em média −5,2, −5,7 e **−2,8 pontos**. Em 2026 a margem Flávio − Lula saiu, em média, 2,8 pontos pior para Flávio do que o resultado (seção 2.4). Nos 2º turnos de 2018 e 2022 o viés foi bem menor (−1,9 e +0,1 na participação do PT). **A pergunta mais importante para a chance de vitória é se esse viés de 2026 se repete no 2º turno.** O histórico de seis eleições não responde isso com segurança.
8. **Erro por UF (2º turno de 2022, primeira medição):** 32 pesquisas finais em 14 UFs tiveram erro médio de +0,2 e erro absoluto médio de **2,3 pontos** na participação de Lula (4,7 na margem), com máximo de 7,8. Treze UFs não tiveram nenhuma pesquisa na última semana dentro do conjunto (seção 2.5).
9. **Métodos documentados no Brasil:** os agregadores da imprensa usam médias ponderadas simples, com peso por recência, amostra, modo de coleta ou "tradição" do instituto. Nenhum dos que consegui ler publica chance de vitória nem ajuste por instituto (*house effect*). Ranking de institutos com método publicado: Pindograma (código aberto, *plus-minus* no estilo 538) e BTG Pactual (distância de variação total). Há projetos independentes de 2026 com modelo de espaço de estados e efeito por instituto, que publicam chance de vitória (seção 3).

---

## 1. Segundo turno de 2026

### 1.1 Registro no TSE (PesqEle) e dados abertos

**O que é.** Toda pesquisa divulgada precisa ser registrada no PesqEle "até 5 (cinco) dias de antecedência da divulgação", sem contar o dia do registro nem o da divulgação. O número de registro tem de constar na divulgação (Lei 9.504/1997, art. 33, conforme o guia do TRE-PI, <https://www.tre-pi.jus.br/eleicoes/eleicoes-2024-1/arquivos/guia-pesquisas-eleitorais>, e a minuta da resolução de 2026, <https://www.tse.jus.br/servicos-judiciais/audiencias-publicas/arquivos/minutas/2026/pesquisas-eleitorais>).

**Onde baixar (fonte primária, verificado).**

- Conjunto "Pesquisas Eleitorais – 2026" no portal de dados abertos (CKAN): <https://dadosabertos.tse.jus.br/dataset/pesquisas-eleitorais-2026>. API: <https://dadosabertos.tse.jus.br/api/3/action/package_show?id=pesquisas-eleitorais-2026>.
- Arquivos: `pesquisa_eleitoral_2026.zip` (CSV por UF e um `BRASIL.csv` com tudo), `pesquisa_contratante_2026.zip`, `pesquisa_pagante_2026.zip` (CSV) e, em PDF, notas fiscais, questionários e detalhamento por bairro ou município. Padrão das URLs: `https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_<ANO>.zip`.
- **Atualização diária:** o ZIP de 2026 tinha `Last-Modified: Sat, 17 Oct 2026 08:48:34 GMT` e `DT_GERACAO` "17/10/2026 05:46:51". Há conjuntos do mesmo tipo para 2012 a 2024.
- A consulta web pública do PesqEle (<https://pesqele-divulgacao.tse.jus.br/app/pesquisa/listar.xhtml>) respondeu 403 às minhas ferramentas e não foi verificada.

**Formato (do `leiame.pdf` que vem no ZIP).** Latin-1, campos entre aspas separados por ponto e vírgula, `#NULO` para vazio. Campos de 2026: `NR_PROTOCOLO_REGISTRO` (ex.: `BR087292026` = BR-08729/2026), `DT_REGISTRO`, `ST_PESQUISA_PROPRIA`, `NR_CNPJ_EMPRESA`, `NM_EMPRESA`, `NM_EMPRESA_FANTASIA`, `DS_CARGO`, `DT_INICIO_PESQUISA`, `DT_FIM_PESQUISA`, `DT_DIVULGACAO` ("data a partir da qual a empresa pode publicar o resultado"), `QT_ENTREVISTADO`, `CD_CONRE`, `NM_ESTATISTICO_RESP`, `VR_PESQUISA`, `DS_METODOLOGIA_PESQUISA`, `DS_PLANO_AMOSTRAL`, `DS_SISTEMA_CONTROLE`, `DS_DADO_MUNICIPIO`.

**O que o registro não tem:**

- **Resultados.** Nenhum campo com percentuais. O TSE guarda os questionários (PDF), não as respostas.
- **Margem de erro como campo.** Ela aparece só no texto do plano amostral.
- **A UF de uma pesquisa para Presidente.** Todos os 1.358 registros de Presidente de 2026 têm `SG_UF = BR`, inclusive os estaduais. Exemplo: uma pesquisa AtlasIntel do Espírito Santo foi registrada como BR-02089/2026, e a UF só aparece no plano amostral ("representando as características do eleitorado de Espírito Santo"). Para separar nacional de estadual, procurei nomes de UF nesse texto livre (heurística minha, com erros possíveis).
- **Nome comercial padronizado.** "Futura" aparece como `100% CIDADES PARTICIPACOES LTDA` (BR-03764/2026, a pesquisa Futura de 14–15/10, conforme a CNN: <https://www.cnnbrasil.com.br/eleicoes/futura-flavio-tem-508-dos-votos-validos-no-2o-turno-lula-492/>). Gerp aparece como `GERP MERCADOLOGIA LTDA`, e o Datafolha e a Quaest muitas vezes vêm sem nome fantasia. É preciso manter uma tabela manual de equivalência.
- **Esquema estável entre anos.** O CSV de 2018 usa `DS_CARGOS`, datas `dd/mm/aaaa` e traz contratante e pagante na mesma linha. Os de 2014, 2022 e 2026 usam `DS_CARGO` e datas ISO. Em 2026, contratante e pagante estão em arquivos separados.

**Volume de 2026** (CSV de 17/10): 3.566 registros, sendo 1.358 para Presidente. Depois do 1º turno (campo terminando em 05/10 ou depois) há **74 registros de Presidente**: 44 nacionais (21 liberados até 17/10 e 23 de 18 a 23/10) e 30 estaduais. Para comparar: em 2022 houve 215 registros de Presidente com campo terminando entre 03/10 e 30/10 (CSV de 2022, mesmo método de contagem).

### 1.2 Pesquisas nacionais de 2º turno publicadas (05 a 17/10/2026)

Ordem: campo mais recente primeiro. "Totais" = votos totais, como divulgados. "Válidos" = número divulgado pelo instituto ou pela reportagem. Quando só havia totais, marquei (calc.). O registro vem do CSV do TSE ou da reportagem (✓ = confirmado nas duas). Datas de campo e amostra são as da reportagem e da Wikipédia. Em alguns casos o registro tem datas ou amostra planejadas um pouco diferentes (Datafolha 6–8/10, Palver 10–14/10, Futura 13–15/10, MDA n = 2.002, AtlasIntel n = 5.000).

| Instituto (contratante) | Campo | n | Registro TSE | Totais Flávio / Lula / BNI* | Válidos Flávio / Lula | Fonte |
|---|---|---|---|---|---|---|
| Gerp | 14–16/10 | 2.400 | BR-05187/2026 | 50 / 45 / 5 | 52,6 / 47,4 (calc.) | TMC, <https://tmc.com.br/politica/pesquisa-gerp-flavio-bolsonaro-lidera-com-50-contra-45-de-lula/> |
| Veritá (recursos próprios) | 12–16/10 | 15.554 | BR-01107/2026 ✓ | 49,7 / 47,7 / 2,6 | 51,1 / 48,9 | CNN, <https://www.cnnbrasil.com.br/eleicoes/verita-flavio-tem-511-dos-votos-validos-no-2o-turno-lula-489/> |
| Futura (telefone) | 14–15/10 | 2.000 | BR-03764/2026 ✓ | 49 / 47,5 / 3,6 | 50,8 / 49,2 | CNN (link acima, seção 1.1) |
| Ipespe/Abrapel | 13–15/10 | 1.500 | BR-00223/2026 ✓ | 48 / 46 / 6 | 51,2 / 48,8 | CNN, <https://www.cnnbrasil.com.br/eleicoes/ipespe-abrapel-flavio-tem-512-dos-votos-validos-no-2o-turno-lula-488/> |
| CNT/MDA | 13–15/10 | 2.014 | BR-00652/2026 | 46,8 / 45,9 / 7,3 | 50,5 / 49,5 | UOL, <https://noticias.uol.com.br/eleicoes/2026/10/16/cntmda-pesquisa-presidencial-2-turno.ghtm> |
| PoderData/Aya | 13–15/10 | 3.000 | BR-04258/2026 | 47 / 47 / 6 | 50 / 50 | UOL, <https://noticias.uol.com.br/eleicoes/2026/10/16/poderdata-lula-flavio-bolsonaro-presidencia-republica-segundo-turno.ghtm> |
| Datafolha (Folha, Globo) | 13–15/10 | 2.520 | BR-00466/2026 ✓ | 47 / 45 / 8 | 51 / 49 | g1, <https://g1.globo.com/politica/eleicoes/2026/pesquisa-eleitoral/noticia/2026/10/15/datafolha-presidente-segundo-turno-15-outubro.ghtml>; Diário do Nordeste, <https://diariodonordeste.verdesmares.com.br/pontopoder/datafolha-no-2-turno-flavio-bolsonaro-tem-51-e-lula-49-em-votos-validos-1.3798886> |
| Indexa/Broadcast | 13–14/10 | 2.000 | BR-04629/2026 | 44 / 42 / 4 | 51,2 / 48,8 (calc.) | VIVA, <https://viva.com.br/politica/indexabroadcast-no-2-turno-flavio-bolsonaro-tem-44-ante-42-de-lula.html> |
| Palver | 10–13/10 | 5.000 | BR-08028/2026 | 50 / 49 / 1 | 50,5 / 49,5 (calc.) | VIVA, <https://viva.com.br/politica/palver-flavio-bolsonaro-tem-50-e-lula-49-em-empate-tecnico-no-2-turno.html> |
| Quaest (Globo; presencial) | 10–13/10 | 2.154 | BR-08729/2026 ✓ | 46 / 44 / 10 | 51,1 / 48,9 (calc.) | Correio da Manhã, <https://www.correiodamanha.com.br/politica/2026/10/327008-quaest-flavio-tem-46-e-lula-44-no-segundo-turno-disputa-segue-em-empate-tecnico.html> |
| PoderData/Aya | 10–12/10 | 3.000 | BR-01209/2026 | 48 / 46 / 7 | 51 / 49 | CNN, <https://www.cnnbrasil.com.br/eleicoes/poderdata-aya-flavio-tem-51-dos-votos-validos-no-2o-turno-lula-49/> |
| BTG/Nexus | 10–12/10 | 2.000 | BR-07997/2026 | 48 / 45 / 7 | 52 / 48 | UOL, <https://noticias.uol.com.br/eleicoes/2026/10/13/btgnexus-pesquisa-presidencial-segundo-turno.ghtm> |
| Gerp | 8–12/10 | 2.400 | BR-07877/2026 ✓ | 53 / 44 / 3 | 55 / 45 | CNN, <https://www.cnnbrasil.com.br/eleicoes/gerp-flavio-tem-55-dos-votos-validos-no-2o-turno-lula-45/>; Jornal Opção, <https://www.jornalopcao.com.br/ultimas-noticias/flavio-bolsonaro-tem-55-dos-votos-validos-contra-45-de-lula-aponta-gerp-878414/> |
| Futura | 7–10/10 | 2.000 | BR-00650/2026 | 50 / 46,6 / 3,4 | 51,8 / 48,2 | CNN, <https://www.cnnbrasil.com.br/eleicoes/futura-flavio-tem-518-dos-votos-validos-no-2o-turno-lula-482/> |
| Ipespe | 6–8/10 | 1.500 | BR-00933/2026 | 49 / 44 / 7 | 52,7 / 47,3 | CNN, <https://www.cnnbrasil.com.br/eleicoes/ipespe-flavio-tem-527-dos-votos-validos-no-2o-turno-lula-473/> |
| AtlasIntel/Bloomberg | 3–8/10 | 5.026 | BR-03663/2026 | 51,1 / 45,7 / 3,2 | 52,8 / 47,2 | CNN, <https://www.cnnbrasil.com.br/eleicoes/atlas-flavio-tem-528-dos-votos-validos-no-2o-turno-lula-472/> |
| Datafolha (Folha, Globo) | 6–7/10 | 2.520 | BR-02949/2026 | 49 / 45 / 6 | 52 / 48 | CNN (link na introdução); g1, <https://g1.globo.com/politica/eleicoes/2026/pesquisa-eleitoral/noticia/2026/10/08/datafolha-presidente-8-outubro.ghtml> |
| PoderData/Aya | 5–7/10 | 3.000 | BR-08134/2026 | 49 / 44 / 7 | 53 / 47 | Poder360, <https://www.poder360.com.br/poderdata/flavio-tem-53-contra-47-de-lula-no-2o-turno-diz-pesquisa-poderdata-aya/> |
| Vox Brasil | 5–7/10 | 2.100 | BR-09623/2026 | 42,7 / 44,2 / 13,1 | 49,1 / 50,9 (calc.) | CNN, <https://www.cnnbrasil.com.br/eleicoes/vox-lula-tem-442-das-intencoes-de-voto-no-2o-turno-flavio-427/> |

\* BNI = brancos, nulos e indecisos somados, como na Wikipédia. O Datafolha de 15/10 separa 6% de brancos e nulos e 2% de indecisos. A Quaest separa 9% e 1%.

Índice usado: tabela "October (after 1st round)" da Wikipédia, <https://en.wikipedia.org/wiki/Opinion_polling_for_the_2026_Brazilian_presidential_election> (lida em `?action=raw`). Ela também tem colunas de margem de erro e amostra. Observações:

- **Registro errado na imprensa:** a CNN publicou o Datafolha de 8/10 como "BR-0949/2026". No CSV do TSE o número é BR-02949/2026 (2.520 entrevistas, campo de 6 a 8/10).
- **Pesquisas registradas e liberadas até 17/10 que não estão na Wikipédia:** DataTrends (BR-03576/2026, campo 7–9/10) e Instituto Seta (BR-04487/2026, 7–10/10, abrangência não identificada). Não procurei os números delas.
- **Médias simples (inferência nossa):** campo iniciado de 3 a 8/10 (AtlasIntel, Datafolha, PoderData, Vox, Ipespe, Futura, Gerp), 7 pesquisas, Flávio 52,3%. Campo iniciado de 10 a 14/10, 12 pesquisas, Flávio 51,1%.

### 1.3 O que ainda deve sair até 24/10 (registro do TSE)

Registros nacionais de Presidente com divulgação liberada entre 18 e 23/10, conforme o CSV de 17/10. A coluna de data é `DT_DIVULGACAO`, a data a partir da qual a divulgação é permitida, não a data em que ela acontece.

| Liberada a partir de | Institutos (registro; campo) |
|---|---|
| 18/10 | Instituto Phoenix (BR-08809; 13–16/10), Vox Brasil (BR-04332; 15–17/10) |
| 19/10 | AtlasIntel (BR-02418; 13–18/10), PoderData (BR-02586; 16–18/10), Nexus (BR-04499; 16–18/10), Paraná Pesquisas (BR-09051; 14–17/10), Futura/100% Cidades (BR-06715; 16–17/10), DataTrends (BR-04454; 15–17/10), Instituto Ranking (BR-00152; 14–16/10) |
| 20/10 | Veritá (BR-06396; 15–19/10), Real Time Big Data (BR-02952; 15–19/10), Alfa Inteligência (BR-00820; 15–19/10), Instituto Franca (BR-07896; 16–20/10), Vetor Arrow (BR-06957; campo 22–23/10) |
| 21/10 | Quaest (BR-08535; 17–20/10), Palver (BR-04612; 16–20/10), Gerp (BR-03835; 17–20/10), Futura/100% Cidades (BR-06614; 19–20/10), Boas Ideias (BR-08251; 15–19/10) |
| 22/10 | Datafolha (BR-09709; 20–22/10), PoderData (BR-07926; 19–21/10, n = 4.000), Indexa (BR-02348; 20–21/10), Gerp (BR-09327; campo 21–24/10) |

Todos os números são "/2026". Ritmo: cerca de 4 pesquisas nacionais por dia. Os registros feitos até 19/10 ainda podem acrescentar pesquisas para 24/10. **Inferência nossa:** o agregado deve ser recalculado várias vezes ao dia até 24/10, e na véspera da eleição o conjunto final será de 10 a 15 institutos com campo terminando entre 20 e 24/10.

### 1.4 Pesquisas por UF no 2º turno de 2026

Registros estaduais de Presidente depois do 1º turno, com a UF identificada no plano amostral (heurística minha). Contagem total: 30.

| UF | Registros | Institutos |
|---|---|---|
| RN | 9 | Quaest, Data Capital, Affare, Datavero, Item, DataTrends, Data Plus, Qualitta, Exatus |
| DF | 6 | Datafolha (2), Quaest (2), IGAPE, Instituto Franca |
| TO | 5 | Quaest, Direct, Correio do Povo Tocantinense, Stylo, Data Pop |
| ES | 2 | Quaest, Instituto Perfil |
| AM | 2 | PoderData, Quaest |
| AC | 2 | Data Control (2) |
| AC/AM | 1 | Quaest |
| RJ | 1 | Datafolha |
| MG | 1 | Data Tempo |
| BA | 1 | Instituto Franca |

As outras 18 UFs, entre elas SP, PR, RS, SC, PE, CE, PA e GO, não têm nenhum registro estadual de Presidente para o 2º turno no arquivo de 17/10. **Antes do 1º turno a cobertura foi bem maior:** em 2026 há registros estaduais de Presidente nas 27 UFs (de 14 em RR a 96 no RN). A AtlasIntel, por exemplo, publicou PDFs estaduais com campo de 27/09 a 02/10 para cerca de 20 UFs (<https://atlasintel.org/polls>). **Os números das pesquisas estaduais de 2026 não foram coletados**: estão nas reportagens locais e nos PDFs dos institutos.

### 1.5 Agregadores de 2026 e o que cada um publica

Valores do 2º turno. Totais conforme publicados. Válidos (calc.) por mim.

| Agregador | Data | Flávio / Lula | Flávio válidos | O que se sabe do método | Fonte |
|---|---|---|---|---|---|
| Poll+Trend | 17/10 | 48,48 / 46,16 | 51,2 (calc.) | Pondera por tamanho da amostra e data; 11 institutos (campo de 9 a 16/10); sem efeito por instituto; sem chance de vitória. Erro autodeclarado no 1º turno de 2026: 0,39 | <https://pollplustrend.wordpress.com/26brpf> |
| UOL | 15/10 | 51,6 / 48,4 | 51,6 | Não verificado (UOL inacessível às minhas ferramentas) | <https://noticias.uol.com.br/eleicoes/agregador-de-pesquisas-eleitorais/> (pela Wikipédia) |
| BBC/PollingData | 15/10 | 47,7 / 45,3 | 51,3 (calc.) | Não verificado (BBC inacessível); um resumo de busca fala em pesquisas estimuladas registradas no TSE e intervalos de 95% | pela Wikipédia |
| Plano Político | 15/10 | 48 / 44,9 | 51,7 (calc.) | Não encontrado | pela Wikipédia |
| The Economist | 13/10 | 48 / 44 | 52,2 (calc.) | Não encontrado | pela Wikipédia |
| Exame/Inteligov | (2/10, só 1º turno) | — | — | Média móvel ponderada: presencial com peso cheio, telefone/IVR e online com 30 a 45% menos influência; o peso cai 25% a cada quinzena; não faz previsão | <https://exame.com/eleicoes/agregador/?turno=1> |
| O POVO | — | — | — | Média diária simples, com peso igual ao número de cenários do dia, e média móvel ponderada de 30 dias; dados para baixar em CSV (método de 2022) | <https://mais.opovo.com.br/interativos/agregador/metodologia.php> |
| Poder360 | — | — | — | Atrás de assinatura (Poder Monitor) | <https://www.poder360.com.br/agregador-de-pesquisas/> |

---

## 2. Histórico: 2º turnos de 2002 a 2022 (e 1º turnos de 2018, 2022 e 2026)

### 2.1 Fontes e cobertura real

| Fonte | O que tem | Formato e acesso | Cobertura verificada (Presidente, estimulada) | Problemas |
|---|---|---|---|---|
| **Base dos Dados, `basedosdados.br_poder360_pesquisas.microdados`** (banco do Poder360). Página: <https://basedosdados.org/dataset/fb38dbe8-03ce-46b4-a6b7-638ade03999c> | 166.292 linhas: um percentual por candidato e por cenário, com instituto, data, `data_referencia` (texto do campo), contratante, número de registro, entrevistas, margem, turno, `tipo_voto` (totais ou válidos) e `sigla_uf` | BigQuery. Há também **download direto e gratuito** (CSV.gz, 2 MB): <https://storage.googleapis.com/basedosdados-public/one-click-download/br_poder360_pesquisas/microdados/microdados.csv.gz>. Trecho aberto de 2000 a nov/2023; dez/2023 a mai/2024 só no plano pago (API GraphQL da BD) | Pesquisas de 2º turno com data depois do 1º turno: **2002: 0** (só 56 simulações feitas antes do 1º turno); **2006: 9 nacionais e 10 estaduais**; **2010: 20 nacionais, 5 estaduais e 32 regionais**; **2014: 21 nacionais e 50 estaduais em 15 UFs, mais 22 regionais**; **2018: nenhuma** (os dados de 2018 param em dez/2017); **2022: 48 nacionais e 67 estaduais em 14 UFs** | Exige limpeza: a boca de urna aparece como pesquisa estimulada (Ibope, 31/10/2010, n = 4.500); válidos vêm rotulados como "votos totais" (2010); há registro errado (Ibope de 24–25/10/2014 com "CE-00035/2014"); nomes de instituto variam ("AtlasIntel/Internet") |
| **Pindograma, cópia do banco do Poder360**: <https://github.com/pindograma/pesquisas> (`data/poder360/all.csv`, 24 MB, ODbL com atribuição obrigatória) | O mesmo banco, extraído antes de 2022 | CSV no GitHub | Presidente só em 2014 e 2018. **2018: 102 pesquisas nacionais de 2º turno (29 depois do 1º turno) e 62 estaduais em 14 UFs depois do 1º turno**. 2014: 21 nacionais e 50 estaduais depois do 1º turno | Mesmo formato do Poder360. É a única fonte aberta que achei para 2018 com UF |
| **Pindograma, PDFs convertidos em tabela** (`data/parsed/`) | Resultados extraídos dos PDFs do Ibope (2012 a 2018) e do Datafolha (2012 a 2018), pelo número de registro do TSE | CSV | Ibope: 137 registros de Presidente em 2018 (35 com campo no período do 2º turno, cerca de 29 estaduais em 13 UFs) e 171 em 2014 | Precisa cruzar com o CSV do TSE para obter datas e UF |
| **Wikipédia** (índice), páginas "Opinion polling for the 20xx Brazilian presidential election" e "2014 Brazilian general election" | Tabelas nacionais, com link para a reportagem de cada pesquisa | Wikitexto (`?action=raw`), fácil de converter | 2º turno nacional: 2010 (cerca de 20 pesquisas), 2014 (cerca de 15), 2018 (cerca de 22), 2022 (cerca de 45), 2026. **Não há tabelas por UF** (conferi en/pt de 2018, 2022 e 2026 e as páginas estaduais de 2026). 2002 e 2006 não têm tabela de 2º turno | Colunas e ordem dos candidatos mudam entre páginas. Algumas linhas divergem do Poder360 (a Quaest final de 2022 aparece como 27–29/10 45/42; no Poder360, como 28–29/10 46/43, BR-05765/2022) |
| **Jennings e Wlezien (2018)**, dados de replicação: <https://doi.org/10.7910/DVN/8421DX> | Média diária das pesquisas (*poll-of-polls*), sem nome do instituto, e resultado, para 45 países | `.tab` de 292 MB; filtrei as 14.633 linhas do Brasil | Brasil 1998 e 2002 a 2014. 2º turno: 2002 (9 dias com pesquisa), 2006 (7), 2010 (13). **Sem 2º turno de 2014**, e o 1º turno de 2014 está corrompido (os votos do 1º turno trazem números do 2º) | Percentuais em votos totais; sem instituto |
| **CSV de registro do TSE** (seção 1.1), 2012 a 2026 | Metadados de cada pesquisa | CSV aberto | Todos os registros | Sem resultados. Serve para conferir datas, amostra e abrangência |
| **CESOP/Unicamp**, Banco de Dados de Opinião Pública (também listado na Base dos Dados) | Microdados, questionários e frequências de pesquisas Ibope, Datafolha e outras | Ficha por pesquisa; acesso por pedido | Não medi. Uma ficha de out/2002 do Ibope (CESOP/IBOPE/02495, 3.979 entrevistas) aparece em busca | Não é uma série pronta |
| **Poder360 (original)**: <https://www.poder360.com.br/banco-de-dados/> | O banco original, "desde o ano 2000" | Atrás de assinatura (Poder Monitor). A API usada pelo pacote R `pollingBR` (<https://github.com/sergiospagnuolo/pollingBR>) pedia um token que já expirou | — | Não usei |

Resultados oficiais em votos válidos usados nas tabelas abaixo (participação do PT no 2º turno): 2002 Lula 61,27; 2006 Lula 60,83; 2010 Dilma 56,05; 2014 Dilma 51,64; 2018 Haddad 44,87; 2022 Lula 50,90. Copiei-os das linhas "Results" das tabelas da Wikipédia e do conjunto de Jennings e Wlezien. **Conferi 2022 na fonte primária:** somando o arquivo de votação por seção do TSE (<https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2022_BR.zip>), Lula tem 50,90%. Os demais devem ser conferidos contra o TSE pelo ticket 03.

### 2.2 Como medi o erro

- **Pesquisa final de cada instituto:** a última com campo terminando nos 7 dias antes da eleição. Boca de urna fica de fora.
- **Erro** = participação do candidato do PT nos válidos segundo a pesquisa, menos o resultado. Erro na margem = 2 × erro (com dois candidatos).
- **"Erro da média"** = média simples das pesquisas finais menos o resultado. É o que um agregado ingênuo teria errado.
- **Fontes dos números:** 2010, 2014, 2018 e 2022 vêm das tabelas da Wikipédia, conferidas contra as manchetes das reportagens que elas citam. Acrescentei GPP (2010), Sensus (2014), Veritá e Brasmarket (2022) a partir da Base dos Dados. 2006 vem da Base dos Dados. 2002 é a média diária de Jennings e Wlezien.

### 2.3 Erro das pesquisas finais no 2º turno (primeira tabela)

| Eleição | Resultado (PT) | Pesquisas finais | Média das finais | **Erro da média** | Erro absoluto médio por instituto | Maior erro |
|---|---|---|---|---|---|---|
| 2002 Lula × Serra | 61,27 | média de 4 pesquisas em 26/10 (J&W, sem nome do instituto) | 63,0 | **+1,8** | — | — |
| 2006 Lula × Alckmin | 60,83 | 3 (Datafolha 27–28/10, Ibope 28/10, Sensus 23–25/10) | 62,0 | **+1,2** | 1,2 | Sensus +2,4 |
| 2010 Dilma × Serra | 56,05 | 5 (Vox 30/10, Datafolha 29–30/10, Sensus 28–29/10, Ibope 27–30/10, GPP 23–25/10) | 55,8 | **−0,3** | 1,2 | GPP −2,9 |
| 2014 Dilma × Aécio | 51,64 | 5 (Vox 25/10, Datafolha 24–25/10, Ibope 24–25/10, MDA 23–24/10, Sensus 21–24/10) | 50,8 | **−0,8** | 2,5 | Sensus −6,2 |
| 2018 Haddad × Bolsonaro | 44,87 | 7 (Datafolha e Ibope 26–27/10, MDA 26–27/10, Paraná 23–25/10, Real Time 24/10, Ipespe 23–24/10, FSB 20–21/10) | 43,0 | **−1,9** | 2,5 | Paraná −5,1 |
| 2022 Lula × Bolsonaro | 50,90 | 12 (Datafolha 28–29/10, Quaest, Ipec, AtlasIntel, MDA, Paraná, Futura, Gerp, PoderData, Ipespe, Veritá, Brasmarket) | 51,0 | **+0,1** | 1,9 | Brasmarket −3,9 |

Erro por instituto nas eleições com mais dados (participação do PT; positivo = superestimou o PT):

- **2018:** Datafolha +0,5; Ibope +1,7; MDA −1,8; Real Time −1,2; Ipespe −2,8; FSB −4,6; Paraná −5,1.
- **2022:** Datafolha +1,2; Quaest +0,8; Ipec +2,9; AtlasIntel +2,5; MDA +0,2; Paraná −0,5; Futura −1,2; Gerp −3,1; PoderData +1,8; Ipespe +2,3; Veritá −1,9; Brasmarket −3,9.
- **2014:** Vox +2,4; Datafolha +0,4; Ibope +1,4; MDA −1,9; Sensus −6,2.

Leitura (inferência nossa, com 6 pontos de dados):

- **O erro da média não tem sinal constante.** Positivo em 2002 e 2006, perto de zero em 2010 e 2022, negativo em 2014 e 2018. A raiz do erro quadrático médio dos seis é **≈ 1,2 ponto na participação, ou ≈ 2,5 pontos na margem**. Essa é a ordem de grandeza do erro comum a todos os institutos, que nenhuma média elimina.
- **Os institutos discordam bastante entre si.** Em 2018 e 2022 a distância entre o maior e o menor erro foi de 6 a 7 pontos na participação. Isso sugere efeitos por instituto grandes e estáveis em parte: Paraná, Gerp, Brasmarket e Veritá abaixo do PT; Ipec/Ibope e Ipespe acima. Para medir isso há 1 a 3 eleições por instituto, e vários institutos de 2026 não existiam em 2022 (Palver, Indexa, Vox Brasil, DataTrends, Nexus como instituto independente).
- **Literatura, convergente:** Meireles e Russo (2022) medem uma raiz do erro quadrático médio de **0,030 (3,0 pontos) nas pesquisas de véspera do 2º turno presidencial e 0,039 no 1º turno**. Para governador no 2º turno, 0,026. O erro absoluto médio previsto é de 1,8 ponto na véspera, 2,9 pontos a 3 dias e 3,8 pontos a 15 dias (base Pindograma, 2012–2020; *Estudos Avançados* 36(106), <https://doi.org/10.1590/s0103-4014.2022.36106.007>, PDF em <https://revistas.usp.br/eav/pt_BR/article/download/205985/189552/596015>). Eles concluem que o desempenho é parecido com o de outros países, como Jennings e Wlezien (2018) (<https://eprints.soton.ac.uk/421260/1/JenningsWlezien_PollingErrors.pdf>).

### 2.4 Erro no 1º turno: 2018, 2022 e 2026

Candidato bolsonarista (A) e petista (B), votos válidos (calc.), pesquisas finais nacionais. Números de entrada das tabelas da Wikipédia.

| Eleição | Resultado A / B | Pesquisas (erro em A) | Erro médio em A | Erro médio em B | Erro médio na margem A − B |
|---|---|---|---|---|---|
| 2018 Bolsonaro / Haddad | 46,03 / 29,28 | Datafolha −6,0; MDA −3,5; Real Time −6,0; Paraná −5,1; XP/Ipespe −5,1 | **−5,2** | −3,1 | −2,1 |
| 2022 Bolsonaro / Lula | 43,20 / 48,43 | Datafolha −7,4; Ipec −6,6; Ipespe −8,8; AtlasIntel −2,1; MDA −3,5 | **−5,7** | +1,1 | **−6,8** |
| 2026 Flávio / Lula | 47,03 / 45,16 | Datafolha −4,0; Quaest −3,4; Futura −2,3; Palver 0,0; PoderData −3,4; MDA −4,9; AtlasIntel −3,0; Vox −1,2 | **−2,8** | 0,0 | **−2,8** |

Notas:

- A Futura de 2026 não fecha 100% (candidatos 95 + BNI 2,6), por isso dividi pelo total dos candidatos.
- As linhas de 2026 vêm da tabela "Aug–Oct (Campaign period)" da página da Wikipédia de 2026. O resultado de 2026 vem da linha "Results" da mesma página, que cita resultados.tse.jus.br e confere com o enunciado do ticket.
- Para 2022, a análise da Fundação Perseu Abramo (NOPPE) chega aos mesmos números de subestimação nos válidos: Datafolha −7,2, Ipec −6,2, Quaest −5,2, Atlas −2,1. A hipótese principal é um "viés de abstenção": eleitores de Bolsonaro compareceram mais do que os de Lula (<https://fpabramo.org.br/onde-as-pesquisas-podem-ter-errado/>; texto preliminar de uma fundação partidária).
- **Inferência nossa:** nos três 1º turnos o candidato bolsonarista foi subestimado. Nos 2º turnos de 2018 e 2022 o erro foi menor (−1,9 e +0,1 na participação do PT) e não teve lado fixo. Os próprios institutos dizem ter ajustado o método entre os turnos de 2022 (BBC, citada por A Gazeta, <https://www.agazeta.com.br/mundo/o-que-explica-a-diferenca-entre-o-resultado-das-urnas-e-as-pesquisas-1026>, lido só pelo resumo da busca).

### 2.5 Erro por UF: 2º turno de 2022 (primeira medição)

Método: pesquisas estaduais de 2º turno da Base dos Dados publicadas a partir de 23/10/2022, a última de cada instituto em cada UF, comparadas com o resultado por UF que calculei somando o arquivo de votação por seção do TSE (link na seção 2.1).

- **32 pesquisas finais em 14 UFs:** erro médio **+0,2**, erro absoluto médio **2,3** na participação de Lula (4,7 na margem), máximo de 7,8.
- Exemplos: SP com Datafolha +4,2, Ipec +2,4, Futura +0,3 e Paraná −2,0; RJ com Datafolha +0,1, AtlasIntel +0,9 e Futura −0,1; MG com Datafolha +2,5, Quaest +2,7, AtlasIntel +1,3 e Futura −0,5; BA com Veritá −7,8, Paraná −3,0, AtlasIntel +0,3 e Ipec +1,3; PE com Ipec +5,4.
- **UFs sem nenhuma pesquisa final no conjunto:** AC, AP, CE, DF, GO, MA, MT, PA, PI, PR, RN, RR e TO. Isso pode ser falha de coleta do Poder360 e não ausência de pesquisa. O CSV do TSE de 2022 tem 215 registros de Presidente no período, e só uma parte está na Base dos Dados.
- **Inferência nossa:** o erro de uma pesquisa estadual isolada (cerca de 2,3 pontos) é parecido com o de uma pesquisa nacional isolada (1,9 ponto em 2022), mas as amostras estaduais são menores (800 a 3.000) e há em média 2 a 3 institutos por UF. Um agregado por UF seria ruidoso e cobriria metade das UFs.

---

## 3. Métodos de agregação documentados para o Brasil

**Médias dos veículos (descrição do próprio veículo):**

- **Exame/Inteligov:** média móvel ponderada; presencial com peso cheio, telefone/IVR e online com 30 a 45% menos influência; decaimento de 25% por quinzena (<https://exame.com/eleicoes/agregador/?turno=1>).
- **O POVO:** a página de metodologia (versão de 2022) descreve uma média diária simples, com peso igual ao número de cenários testados no dia, e média móvel de 30 dias (<https://mais.opovo.com.br/interativos/agregador/metodologia.php>). Para 2026, um resumo de busca do texto de critérios do jornal fala em grupos A/B/C de institutos, com pesos 1,5, 1 e 0, definidos pelo histórico de acerto (<https://www.opovo.com.br/noticias/politica/eleicoes/2026/03/09/quais-pesquisas-eleitorais-o-povo-publica-em-2026.html>, não lido na íntegra).
- **TVT News:** pesos por "cobertura e tradição" (Quaest 4; Nexus, Futura e PoderData 1), segundo o resumo da busca (<https://tvtnews.com.br/?p=801777>).
- **Money Times:** média das 5 últimas pesquisas (<https://www.moneytimes.com.br/agregador-de-pesquisas-money-times-gaep/>).
- **Poll+Trend:** pesos por amostra e data (<https://pollplustrend.wordpress.com/26brpf>).
- **Gráfico da Wikipédia:** regressão local (LOESS) com indecisos, brancos e nulos retirados.
- **Nenhum desses publica chance de vitória nem ajuste por instituto.** Não consegui ler a metodologia de UOL, BBC/PollingData, Plano Político e The Economist.

**Avaliação de institutos com método publicado:**

- **Pindograma (código aberto, GPL; dados em ODbL):** <https://github.com/pindograma/pesquisas/blob/master/6-CalculatePollsterRatings.Rmd>. Usa pesquisas até 21 dias antes do 1º turno e até 14 dias antes do 2º. O erro de cada pesquisa (média dos erros absolutos por candidato) é regredido em indecisos, dias até a eleição, 1/√n, tipo de eleição e UF. O resíduo vira um *plus-minus* relativo aos concorrentes da mesma eleição. Esse *plus-minus* é encolhido para a média do grupo com fator n/(n + 15), e a nota vai de A a D, só para institutos com 5 ou mais pesquisas. O ranking (<https://pindograma.com.br/ranking.html>) cobre 2012 a 2022 e foi atualizado em set/2024. A tabela não carregou na minha leitura.
- **BTG Pactual (analista Iana Ferrão):** última pesquisa de cada instituto antes de cada turno das eleições presidenciais desde 2002. A métrica é a distância de variação total entre o vetor da pesquisa e o vetor de votos válidos, com ajuste para histórico curto. MDA lidera em 2022 e no agregado histórico; Paraná e Quaest se destacam entre os mais novos. Li só o resumo da EuQueroInvestir (<https://euqueroinvestir.com/economia/qual-e-a-melhor-pesquisa-eleitoral-do-brasil>), e os números por instituto estão numa imagem.

**Modelos que transformam agregado e erro em chance de vitória (projetos independentes de 2026; autodeclarados, sem revisão):**

- **election-outlook-br** (Tiago Dantas; código privado, método publicado): <https://github.com/tiagomendesdantas/election-outlook-br>, <https://brelections.tiagodantas.com/en/methodology>.
  - 2º turno: modelo de nível local em espaço de estados (filtro de Kalman diário) com efeito por instituto no estado (os efeitos somam zero).
  - Corrige o erro do 1º turno: b₁ = 1,7 ponto na participação, com uma fração κ ~ Beta(1,05; 1,72), de média 0,38, que "volta" no 2º turno.
  - Erro do dia da eleição: t₅ com escala de 1,08 ponto, estimada nas pesquisas finais de 2º turno de 2006 a 2022.
  - Deriva de 0,74 ponto por dia depois do 1º turno.
  - Relata ter subido a incerteza depois que um intervalo de ±1,5 ponto se mostrou estreito demais em 2 de 3 eleições.
- **brazil-2026-election-forecast** (Rafael Braga): <https://github.com/RafaelBraga-Kribitz/brazil-2026-election-forecast>. Agregação bayesiana pré-registrada, com teste deixando uma eleição de fora (2014, 2018, 2022). No 2º turno, na véspera, relata erro absoluto médio de participação de 0,42 a 0,96 ponto, conforme o modelo, contra 0,96 da média da última pesquisa de cada instituto em 14 dias.
- **Base acadêmica:** Turgeon e Rennó (2012) e Bertholini, Rennó e Turgeon (2022) preveem com fundamentos (popularidade do governo), não com pesquisas, e acham que os modelos de popularidade superam os de pesquisas de intenção de voto (<https://ideas.repec.org/a/eee/intfor/v28y2012i4p804-812.html>, <https://revistas.usal.es/index.php/1852-9003/article/view/25882>, só resumos).

**Do agregado à chance de vitória: a conta mínima (inferência nossa, ilustrativa).** Se a média do 2º turno dá Flávio com 51,1% e o erro do agregado tem desvio padrão σ na participação, a chance de Flávio é Φ((51,1 − 50)/σ). Com σ = 1,2 (só o erro histórico da média, tabela 2.3), dá ~82%. Com σ = 2,0 (somando a incerteza de movimento até 25/10 e a correção do viés do 1º turno), dá ~71%. Se aplicássemos inteira a subestimação de Flávio no 1º turno de 2026 (+1,4 ponto na participação, metade dos 2,8 da margem), a média iria a ~52,5% e a chance a ~89% (σ = 2,0) ou ~98% (σ = 1,2). **A escolha de quanto do viés do 1º turno levar para o 2º turno move a chance de vitória em mais de 10 pontos percentuais, e seis eleições não bastam para estimar essa fração.** A decisão é do ticket 05 e do método de projeção.

---

## 4. Fontes que usaríamos, esforço e lacunas

### Fontes recomendadas

| Uso | Fonte | Esforço estimado |
|---|---|---|
| Lista e metadados das pesquisas de 2026 (o que existe, quando sai, amostra, registro) | CSV diário do TSE (seção 1.1), com tabela manual de nomes | 2–3 h para o primeiro carregamento; automático depois |
| Números nacionais de 2026 | Wikitexto da página en da Wikipédia (`?action=raw`), conferido contra a reportagem e o registro do TSE; entrada manual para o que faltar | 3–4 h para o analisador e a conferência; ~15 min por dia até 24/10, ou automático com revisão |
| Histórico nacional do 2º turno, 2006–2022 | Tabela 2.3 deste documento, convertida em CSV com registro e fonte de cada linha; Base dos Dados para 2006, Wikipédia para 2010–2022 | ~meio dia (os números já estão levantados) |
| 2002 | Média diária de Jennings e Wlezien; os números por instituto exigiriam o acervo da Folha ou do Ibope | Pronto (só a média). Por instituto: 1 dia, baixo valor |
| Histórico por UF | Base dos Dados (2006, 2010, 2014, 2022) + cópia do Pindograma (2018) + resultados por UF do ticket 03 | 1–2 dias de limpeza (boca de urna, válidos e totais trocados, registros errados, nomes) |
| UF em 2026 | Reportagens locais e PDFs dos institutos para os ~30 registros estaduais | ~1 dia manual, para 9 UFs. Valor baixo para o modelo |

### Lacunas que limitam o modelo

1. **Não há fonte oficial nem aberta com os resultados das pesquisas de 2026.** O TSE só tem metadados. A Wikipédia é mantida por voluntários, e os sites de Datafolha, g1, UOL e BBC não abriram para as minhas ferramentas. Qualquer coleta automática depende de uma página que pode mudar ou atrasar.
2. **As UFs estão mal cobertas no 2º turno.** Em 2026 há registros estaduais em 9 UFs, sem SP, PR, RS, PE, CE ou GO. Em 2022 houve pesquisas finais em 14 UFs (no conjunto disponível). **Inferência nossa:** um agregado por UF não é viável para 2026. Se o modelo precisar de prior por UF, ele terá de vir do 1º turno de 2026 mais o *swing* nacional das pesquisas, não de pesquisas estaduais.
3. **Poucas eleições para aprender o erro.** São 6 segundos turnos, e 2002 só com uma média sem institutos. O erro da média tem raiz do erro quadrático médio de ~1,2 ponto, mas com 6 observações o intervalo dessa estimativa é largo. Os efeitos por instituto se apoiam em 1 a 3 eleições, e metade dos institutos ativos em 2026 é nova.
4. **Buracos e sujeira no conjunto histórico aberto.** A Base dos Dados não tem o 2º turno de 2002 nem a campanha de 2018, e o trecho depois de nov/2023 é pago. Há boca de urna rotulada como pesquisa estimulada, válidos rotulados como totais e registros trocados.
5. **O viés do 1º turno de 2026 contra Flávio** (−2,8 pontos na margem) não tem regra histórica clara de transferência para o 2º turno. É a maior fonte de incerteza na chance de vitória que vem de pesquisas.
6. **Lado legal e de produto (ver tickets 04 e 05):** o ticket 05 relata que usar pesquisa como ponto de partida da projeção da apuração melhorou o erro inicial em no máximo 0,05 ponto (projeto de Meloni), e o ticket 04 aponta risco em publicar projeção baseada em pesquisas antes das 17h. **Inferência nossa:** as pesquisas valem mais como linha de base antes do primeiro boletim e como contexto do que como entrada importante da projeção ao vivo.

---

## 5. O que ficou sem resposta

- **Metodologia dos agregadores de UOL, BBC/PollingData, Plano Político e The Economist** (páginas bloqueadas ou pagas) e se algum publica chance de vitória.
- **Agregadores do Estadão e do JOTA em 2026:** as buscas não acharam nenhum. Em 2022, o Estadão aparece na tabela de agregadores da Wikipédia; em 2026, não.
- **Números das pesquisas estaduais de 2º turno de 2026** (30 registros) e das pesquisas nacionais registradas que não estão na Wikipédia (DataTrends 7–9/10, Instituto Seta 7–10/10).
- **Números por instituto do 2º turno de 2002**, e a lista completa das pesquisas finais de 2006 (achei 3 institutos).
- **Erro por UF em 2014 e 2018:** os dados existem (Base dos Dados 2014; cópia do Pindograma e PDFs do Ibope 2018), mas não fiz a conta. Faltam também os resultados por UF desses anos, que vêm do ticket 03.
- **Resultados oficiais de 2002 a 2018** conferidos no TSE: só conferi 2022. Os outros vêm das tabelas da Wikipédia e de Jennings e Wlezien e têm de ser checados pelo ticket 03.
- **Se a lei permite divulgar pesquisa no dia 25/10 e até que hora** (fica para o ticket 04). O registro mostra uma Gerp com campo até 24/10.
- **Microdados do CESOP/Unicamp:** não verifiquei acesso nem cobertura das pesquisas de 2º turno.

---

## Fontes

TSE e legislação
- Conjunto Pesquisas Eleitorais 2026: <https://dadosabertos.tse.jus.br/dataset/pesquisas-eleitorais-2026>; API CKAN: <https://dadosabertos.tse.jus.br/api/3/action/package_show?id=pesquisas-eleitorais-2026>
- ZIPs: <https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_2026.zip> (e `_2022`, `_2018`, `_2014`); `leiame.pdf` dentro do ZIP
- Consulta PesqEle: <https://pesqele-divulgacao.tse.jus.br/app/pesquisa/listar.xhtml> (403)
- Votação por seção 2022: <https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2022_BR.zip>
- Guia do TRE-PI sobre pesquisas: <https://www.tre-pi.jus.br/eleicoes/eleicoes-2024-1/arquivos/guia-pesquisas-eleitorais>; minuta do TSE 2026: <https://www.tse.jus.br/servicos-judiciais/audiencias-publicas/arquivos/minutas/2026/pesquisas-eleitorais>

Índices e pesquisas de 2026: links na tabela 1.2; Wikipédia: <https://en.wikipedia.org/wiki/Opinion_polling_for_the_2026_Brazilian_presidential_election>, <https://pt.wikipedia.org/wiki/Pesquisas_de_opinião_para_a_eleição_presidencial_no_Brasil_em_2026>

Histórico
- Wikipédia: <https://en.wikipedia.org/wiki/Opinion_polling_for_the_2022_Brazilian_presidential_election>, <https://en.wikipedia.org/wiki/Opinion_polling_for_the_2018_Brazilian_presidential_election>, <https://en.wikipedia.org/wiki/Opinion_polling_for_the_2010_Brazilian_presidential_election>, <https://en.wikipedia.org/wiki/2014_Brazilian_general_election>
- Base dos Dados (Poder360): <https://basedosdados.org/dataset/fb38dbe8-03ce-46b4-a6b7-638ade03999c>; download: <https://storage.googleapis.com/basedosdados-public/one-click-download/br_poder360_pesquisas/microdados/microdados.csv.gz>
- Pindograma: <https://github.com/pindograma/pesquisas>; <https://pindograma.com.br/ranking.html>
- pollingBR: <https://github.com/sergiospagnuolo/pollingBR>
- Jennings e Wlezien (dados): <https://doi.org/10.7910/DVN/8421DX>; artigo: <https://eprints.soton.ac.uk/421260/1/JenningsWlezien_PollingErrors.pdf>

Literatura e análises
- Meireles e Russo (2022): <https://doi.org/10.1590/s0103-4014.2022.36106.007>
- Fundação Perseu Abramo/NOPPE (2022): <https://fpabramo.org.br/onde-as-pesquisas-podem-ter-errado/>
- BTG Pactual, via EuQueroInvestir: <https://euqueroinvestir.com/economia/qual-e-a-melhor-pesquisa-eleitoral-do-brasil>
- Turgeon e Rennó (2012): <https://ideas.repec.org/a/eee/intfor/v28y2012i4p804-812.html>; Bertholini, Rennó e Turgeon (2022): <https://revistas.usal.es/index.php/1852-9003/article/view/25882>
- Gramacho (2015), pesquisas de 2014 (encontrado, não lido): <https://periodicos.usp.br/reb/article/download/98545/97223/171150>

Agregadores e modelos: links na seção 1.5 e na seção 3.
