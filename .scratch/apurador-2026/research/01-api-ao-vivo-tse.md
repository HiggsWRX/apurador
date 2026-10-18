# API ao vivo do TSE

Pesquisa para o ticket [01 — API ao vivo do TSE](../issues/01-api-ao-vivo-tse.md). Fontes consultadas em 17 e 18/10/2026.

Convenções (as mesmas dos tickets 02 e 03):

- **Medido:** obtido por requisição real (curl com `--max-time 30`, em 17 e 18/10/2026) ou lendo o arquivo baixado. A fonte é a URL.
- **Código do app:** lido no JavaScript do app oficial de resultados ([`resultados.tse.jus.br/oficial/app/index.html`](https://resultados.tse.jus.br/oficial/app/index.html), versão `26.10.9 (6dc83f1)`, baixado em 17/10/2026), sobretudo o serviço de dados em `chunks/9132.c7aa7f9416065cdd.js`.
- **Documentado:** escrito pelo TSE. O site `www.tse.jus.br` responde **"Access Denied"** (Akamai) a qualquer acesso automatizado, inclusive via WebFetch. Li as páginas pela cópia do Wayback Machine, citada em cada caso.
- **Terceiros:** repositório, reportagem ou fórum.
- **Inferência:** conclusão minha, sem documento que a confirme.

Os scripts de medição são descartáveis e ficaram fora do repositório.

---

## Resumo

1. **Tudo sai de um único CDN de arquivos JSON estáticos:** `https://resultados.tse.jus.br/oficial/ele2026/...` (Akamai na frente, um S3/Ceph atrás). Não há API REST, WebSocket nem índice de arquivos alterados. O TSE confirma que não haverá índice. Quem consome faz *polling* de arquivos de nome conhecido.
2. **Os códigos do 2º turno presidencial são: ciclo `ele2026`, eleição `6258`, cargo `1` (Presidente), pleito `3221`.** O 1º turno é a eleição `6257`, pleito `3220`. Tudo isso se descobre em `oficial/comum/config/ele-c.json` (medido).
3. **Os arquivos do 2º turno já estão no ar, zerados.** O nacional ([`br-c0001-e006258-u.json`](https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json)) foi gerado em 15/10/2026 às 09:38:12, com `st = 0` de `ts = 499.248` seções. Também já existem os arquivos de UF, município e zona, o de configuração de municípios e o índice de seções (medido).
4. **CORS está liberado e um navegador pode buscar direto.** O CDN devolve `Access-Control-Allow-Origin` igual à origem pedida, com `Vary: Origin`. O preflight responde 200, com `Access-Control-Max-Age: 600` (medido). Mas **`HEAD` responde 403**: use `GET`, condicional se quiser.
5. **O limite é de 100 requisições por segundo por IP.** Acima disso, o IP fica bloqueado 10 minutos, e o bloqueio se renova se ele insistir. Muitos 404 também bloqueiam. Respostas 304 contam no limite (documentado). O CDN guarda cada arquivo por ~60 s, ignora a query string, aceita `If-None-Match`/`If-Modified-Since` (responde 304) e comprime com gzip (medido).
6. **Ao vivo existem votos completos por candidato em cinco níveis: Brasil, UF, Exterior, município (5.757 arquivos) e zona dentro do município (6.292 pares município-zona).** Todos têm o mesmo formato (EA20). Cada arquivo traz votos por candidato, brancos, nulos, comparecimento, abstenção, eleitorado das seções totalizadas, seções totalizadas e total, e a hora da última totalização. Dois arquivos de "acompanhamento" (EA14 e EA15) resumem o andamento (seções, eleitorado, comparecimento e hora, **sem votos**) de todas as UFs e, por UF, de todos os municípios. Eles servem de índice para saber quais municípios mudaram.
7. **Seção: os boletins de urna são publicados durante a apuração, mas atrasados e em binário.** O TSE diz que publica na internet os BUs enviados à totalização (documentado). No 1º turno de 2026, medi o atraso entre o recebimento do BU (`hr` no arquivo auxiliar) e a gravação do `bu.dat` no CDN (`Last-Modified`). Em AC, DF e RR (36 seções): mediana de 19 min, máximo de 40 min. Em **SP** (24 seções): **mediana de 117 min, máximo de 305 min.** O voto vem num arquivo binário ASN.1 (`bu.dat`, ~9 KB), um por seção. São ~500 mil seções, com duas requisições por seção. **Conclusão: o nível de seção não serve para a projeção na noite. A zona serve, e é tão rápida quanto o município.**
8. **Não há ambiente de teste público agora.** Os simulados do TSE foram em 15–17, 22–24 e 28–29/09/2026, em `resultados-sim.tse.jus.br/simulado/simulado2026`, que hoje responde "Access Denied" (medido). Para desenvolver, **os arquivos finais do 1º turno de 2026 (`6257`) continuam no ar no mesmo formato**, assim como os do 2º turno zerados (`6258`). Os de 2022 saíram do ar: o ciclo `ele2022` não consta mais no `ele-c.json` e as URLs dão `NoSuchKey`.
9. **No 1º turno, o arquivo nacional ao vivo ficou atrás da 1ª totalização por uma mediana de ~0,7 min (p90 de 1,0 min),** segundo a [medição do ticket 02](02-linha-do-tempo-apuracoes-passadas.md) com os snapshots de terceiros (só a partir de 85% das seções). Isso é compatível com o cache de ~60 s do CDN.

---

## 1. Onde ficam os arquivos e como descobrir os códigos

### 1.1 Estrutura das URLs

**Documentado** (página técnica do TSE, [cópia do Wayback de 04/10/2026](https://web.archive.org/web/20261004020301/https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados)): "url: https://resultados.tse.jus.br", "ambiente: oficial", e os valores de ciclo, eleição e pleito "poderão ser obtidos por meio do arquivo de configuração de eleições ele-c.json".

**Medido** (`ele-c.json`, campo `arq`):

```json
{ "tp" : "cm", "dir" : "<base>/<ambiente>/<ciclo>/<cd_eleicao>/config" },
{ "tp" : "ab", "dir" : "<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>" },
{ "tp" : "u",  "dir" : "<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>" },
{ "tp" : "cs", "dir" : "<base>/<ambiente>/<ciclo>/arquivo-urna/<cd_pleito>/config/<uf>" },
{ "tp" : "aux","dir" : "<base>/<ambiente>/<ciclo>/arquivo-urna/<cd_pleito>/dados/<uf>/<municipio>/<zona>/<secao>" }
```

**Código do app**, que monta os nomes assim (`kt(x,n)` completa com zeros à esquerda):

```js
// resultado unificado (EA20): UF, município ou zona
`${uf}${mun5}${zona ? "-z"+zona4 : ""}-c${cargo4}-e${eleicao6}-u.json`  // em [eleicao,"dados",uf,...]
// acompanhamento (EA14/EA15)
`br-e${eleicao6}-ab.json`, `${uf}-e${eleicao6}-ab.json`
// configuração de municípios (EA12)
`mun-e${eleicao6}-cm.json`                                              // em [eleicao,"config",...]
// índice de seções (EA16) e arquivo auxiliar da seção (EA18)
["arquivo-urna", pleito, "config", uf, `${uf}-p${pleito6}-cs.json`]
["arquivo-urna", pleito, "dados", uf, mun5, zona4, secao4, `p${pleito6}-${uf}-m${mun5}-z${zona4}-s${secao4}-aux.json`]
// arquivos da urna (BU etc.)
["arquivo-urna", pleito, "dados", uf, mun5, zona4, secao4, hash, nomeDoArquivo]
```

O prefixo de tudo é `https://resultados.tse.jus.br/oficial/ele2026/`. A configuração geral fica fora do ciclo, em `https://resultados.tse.jus.br/oficial/comum/config/ele-c.json`.

### 1.2 Códigos

**Medido** ([`ele-c.json`](https://resultados.tse.jus.br/oficial/comum/config/ele-c.json), gerado em 15/10/2026 09:35:49):

| Pleito (`pl.cd`) | Data | Eleição (`e.cd`) | Turno | Cargo | Observação |
|---|---|---|---|---|---|
| `3220` | 04/10/2026 | `6257` "Eleição Ordinária Federal - 2026 1º Turno" | 1 | `1` Presidente | `cdt2: "6258"` aponta o 2º turno |
| `3221` | 25/10/2026 | `6258` "Eleição Ordinária Federal - 2026 2º Turno" | 2 | `1` Presidente | abrangência `br` |
| `3221` | 25/10/2026 | `6260` "Eleição Ordinária Estadual - 2026 2º Turno" | 2 | `3` Governador | UFs com 2º turno (lista começa por AM, RN, DF) |

O pleito `3221` também agrupa eleições suplementares e consultas populares do mesmo dia (Itaguaí/RJ, Narandiba/SP etc.). Elas não importam para o Apurador.

**Como descobrir antes da noite:** leia `ele-c.json`, ache a eleição com `t = "2"` e `tp = "8"` (federal) cujo cargo é `cd = "1"`, ou siga o `cdt2` da eleição `6257`. O valor é `6258` e já está publicado. A página técnica de 04/10 só listava os códigos do 1º turno (documentado).

### 1.3 URLs exatas do 2º turno (todas medidas com 200 em 17 ou 18/10/2026)

| O quê | URL |
|---|---|
| Configuração geral | `https://resultados.tse.jus.br/oficial/comum/config/ele-c.json` |
| Brasil, Presidente | `https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json` |
| Acompanhamento Brasil (UFs) | `https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-e006258-ab.json` |
| UF (ex.: SP) | `https://resultados.tse.jus.br/oficial/ele2026/6258/dados/sp/sp-c0001-e006258-u.json` |
| Exterior | `https://resultados.tse.jus.br/oficial/ele2026/6258/dados/zz/zz-c0001-e006258-u.json` |
| Acompanhamento da UF (municípios) | `https://resultados.tse.jus.br/oficial/ele2026/6258/dados/sp/sp-e006258-ab.json` (também `zz-e006258-ab.json`) |
| Município (ex.: São Paulo, código TSE `71072`) | `https://resultados.tse.jus.br/oficial/ele2026/6258/dados/sp/sp71072-c0001-e006258-u.json` |
| Cidade do exterior (ex.: Abidjã, `29254`) | `https://resultados.tse.jus.br/oficial/ele2026/6258/dados/zz/zz29254-c0001-e006258-u.json` |
| Zona dentro do município | `https://resultados.tse.jus.br/oficial/ele2026/6258/dados/sp/sp71072-z0001-c0001-e006258-u.json` |
| Municípios e zonas (EA12) | `https://resultados.tse.jus.br/oficial/ele2026/6258/config/mun-e006258-cm.json` (534 KB) |
| Índice de seções da UF (EA16) | `https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3221/config/ac/ac-p003221-cs.json` |
| Versão assinada de qualquer `.json` | troque `.json` por `.jws` (ex.: `.../br-c0001-e006258-u.jws`) |

O código do município é o **código TSE de 5 dígitos**, não o do IBGE. O `mun-e006258-cm.json` traz os dois (`cd` e `cdi`) e a lista de zonas (`z`) de cada município. **Medido:** 28 "UFs" (27 + `zz`), 5.757 municípios (186 deles cidades do exterior) e 6.292 pares município-zona. Só 190 municípios têm mais de uma zona (725 pares), como São Paulo (57), Rio de Janeiro (49), Salvador (19), Brasília (19), Belo Horizonte (18) e Fortaleza (17).

---

## 2. O que existe ao vivo em cada nível

**Medido:** arquivos finais do 1º turno (`6257`) e zerados do 2º (`6258`). **Documentado:** EA14 (PDF de 10/06/2026, [cópia do Wayback](https://web.archive.org/web/20260802212105/https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea14-arquivo-de-acompanhamento-brasil/@@display-file/file/TSE-EA14-Arquivo-de-acompanhamento-Brasil.pdf)).

| Nível | Arquivo | Votos por candidato | Brancos | Nulos | Comparecimento / abstenção | Eleitorado apto das seções totalizadas | Seções totalizadas / total | Horário |
|---|---|---|---|---|---|---|---|---|
| Brasil | `br-c0001-e006258-u.json` (EA20) | sim (`vap`, `pvap`) | `vb` | `vn` (+ `vnt` técnicos, `tvn` total) | `e.c` / `e.a` | `e.est` (e `e.te` total) | `s.st` / `s.ts` | `dt`/`ht` (última totalização), `dg`/`hg` (geração) |
| Todas as UFs, resumo | `br-e006258-ab.json` (EA14) | **não** | não | não | `c` / `a` por UF | `est` por UF | `st` / `ts` por UF | `dt`/`ht` por UF |
| UF e Exterior | `<uf>-c0001-e006258-u.json` (EA20) | sim | sim | sim | sim | sim | sim | sim |
| Todos os municípios de uma UF, resumo | `<uf>-e006258-ab.json` (EA15) | **não** | não | não | `c` / `a` por município | `est` por município | `st` / `ts` por município | `dt`/`ht` por município |
| Município | `<uf><mun>-c0001-e006258-u.json` (EA20) | sim | sim | sim | sim | sim | sim | sim |
| Zona (no município) | `<uf><mun>-z<zona>-c0001-e006258-u.json` (EA20) | sim | sim | sim | sim | sim | sim | sim |
| Seção | `cs.json` (EA16, índice) + `aux.json` (EA18) + `bu.dat` | só dentro do `bu.dat` binário, que não decodifiquei | idem | idem | idem | idem | (uma seção) | `dr`/`hr` no `aux.json` (recebimento, inferência) e `da`/`ha` no EA16 (geração do `aux.json`) |

Notas:

- **Comparecimento e abstenção referem-se só às seções totalizadas e instaladas.** `esi = c + a` (documentado, EA14). Medido no município de São Paulo, 1º turno: `c 7.006.411 + a 2.138.713 = est 9.145.124`.
- **O "% de seções totalizadas" do glossário é `pst` / `pstn`** (`st / ts`). `pstn` tem 9 casas decimais e usa vírgula: `"pstn" : "100"`, `"pvapn" : "47,027772356"`. Todos os números vêm como **string**, com **vírgula decimal**.
- O horário (`dt`/`ht`, `dg`/`hg`) não traz fuso. Pelo ticket 02, os horários do TSE são de Brasília (inferência para estes arquivos).
- O 2º turno de Presidente não tem votos de legenda: `vv = vnom`. No 1º turno, `vv = vvc = vnom = 119.300.788` e `van = vansj = 0`.
- O arquivo de eleitos (EA10, `-e.json`) **não existe para Presidente**. O TSE diz que o resultado sai do EA20 Brasil (FAQ, documentado). No 1º turno, `-e.json` deu `NoSuchKey` (medido).
- Quando `and` vira `f`, segundo o FAQ (documentado): para Presidente, "Arquivo de abrangência municipal: and=f quando snt=0" e o mesmo vale para a abrangência estadual. Na federal, isso só acontece "quando houver totalização final".

---

## 3. Boletins por seção e resultados por zona na noite

Esta é a pergunta extra do ticket: dá para a projeção trabalhar abaixo do município?

### 3.1 O que o TSE diz

- **Documentado** ([notícia do TSE de 05/08/2026, cópia do Wayback](https://web.archive.org/web/20260806213627/https://www.tse.jus.br/comunicacao/noticias/2026/Agosto/resultados-das-eleicoes-2026-poderao-ser-acompanhados-em-tempo-real)): "o TSE disponibilizará na internet os boletins de urna enviados para a totalização, que podem ser comparados em tempo real". A divulgação "começará a partir das 17h, horário de Brasília", para todo o país e o exterior, no 1º e no 2º turno.
- **Documentado** ([notícia de 30/09/2026, cópia do Wayback](https://web.archive.org/web/20261001063737/https://www.tse.jus.br/comunicacao/noticias/2026/Setembro/faltam-4-dias-e-possivel-acompanhar-em-tempo-real-a-totalizacao-dos-votos)): o app permite consultar a totalização "por estado, município ou zona eleitoral".
- **Documentado** (FAQ da página técnica, [cópia de 04/10/2026](https://web.archive.org/web/20261004020301/https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados)):
  - Sobre se os BUs chegam ao CDN antes dos JSON: "Não necessariamente. Os boletins de urna são utilizados no processo de totalização que gera os arquivos JSON de divulgação."
  - Sobre o EA16: os atributos `da` e `ha` "informam, respectivamente, a data e a hora de geração do arquivo auxiliar da seção" e "podem ser utilizados para identificar a chegada dos arquivos de urna da seção eleitoral".
  - "Não está prevista a disponibilização de arquivos de índice para identificação de atualizações."

### 3.2 O que medi do 1º turno de 2026

**Formato (medido).** O índice `ac-p003220-cs.json` (146 KB para AC; **6,3 MB para SP**, com 103.904 seções) lista UF → município → zona → seção, com `da`/`ha`. O auxiliar de uma seção ([exemplo](https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3220/dados/ac/01066/0004/0077/p003220-ac-m01066-z0004-s0077-aux.json)) é este:

```json
{ "dg" : "05/10/2026", "hg" : "12:52:50", "idg" : "2879123", "f" : "o", "st" : "Totalizada", "hashes" : [
{ "hash" : "4a6b70…3d", "dr" : "04/10/2026", "hr" : "18:34:08", "st" : "Totalizado", "arq" : [
{ "nm" : "o03220ac0106600040077-bu.dat", "tp" : "bu" },
{ "nm" : "o03220ac0106600040077-vota.vsc", "tp" : "vota" },
{ "nm" : "o03220ac0106600040077-rdv.dat", "tp" : "rdv" },
{ "nm" : "o03220ac0106600040077-log.jez", "tp" : "log" } ] } ] }
```

O `bu.dat` fica em `.../0077/<hash>/o03220ac0106600040077-bu.dat`. Ele tem 9.019 bytes, `Content-Type: application/octet-stream`, é BER/ASN.1 (começa com `30 82 23 37`) e vem com CORS liberado e `Cache-Control: max-age=3600`. Não decodifiquei o conteúdo.

**Atraso (medido).** Comparei o `hr` do auxiliar (que interpreto como hora de recebimento do BU, em Brasília) com o `Last-Modified` do `bu.dat` (gravação no armazenamento por trás do CDN, convertida de GMT para Brasília). As seções foram sorteadas dos índices do 1º turno:

| UF | Seções | Mínimo | Mediana | Máximo |
|---|---|---|---|---|
| AC | 12 | 3,2 min | 12,2 min | 32,9 min |
| DF | 12 | 1,0 min | 20,1 min | 31,8 min |
| RR | 12 | 3,2 min | 19,1 min | 40,3 min |
| **SP** | 24 | 9,6 min | **117 min** | **305 min** |

Todos os `Last-Modified` caem na noite de 04/10: de 17:18 a 19:37 de Brasília em AC, DF e RR, e de 18:12 a 23:48 em SP. O recebimento dessas seções de SP foi das 18:00 às 20:49. Ressalvas: a amostra é pequena; o `Last-Modified` é a gravação na origem, não a chegada à borda do CDN; e não posso excluir que algum objeto tenha sido regravado depois. Os `da`/`ha` do EA16 hoje mostram só a última regeração: AC e RR às 21:0x de 04/10, SP entre 22:50 e 23:09, DF às 12:50 de 05/10. Por isso não servem para medir a chegada a posteriori.

Para comparar: segundo o ticket 02, o arquivo nacional ao vivo ficou ~0,7 min atrás da 1ª totalização (Terceiros + medido, ver o resumo).

### 3.3 Conclusão para a projeção

- **Seção: não.** O boletim chega ao CDN com minutos de atraso em UFs pequenas e horas em SP. Ele é binário e exige duas requisições por seção (auxiliar e `bu.dat`) para ~500 mil seções. Com 100 req/s por IP, uma varredura única leva ~2,8 h. O índice de SP sozinho tem 6,3 MB. Serve depois da noite (auditoria, refazer a curva), não para projetar ao vivo.
- **Zona: sim, e é barata.** O arquivo de zona tem o mesmo formato e os mesmos campos do municipal. Só 190 municípios têm mais de uma zona, então descer de município para zona custa ~535 arquivos a mais (6.292 contra 5.757). Esses municípios são justamente as grandes cidades, onde o "município" é grande demais para ser homogêneo (São Paulo tem 57 zonas). O app oficial oferece a zona na noite (documentado). Mas **não medi a defasagem ao vivo do arquivo de zona**, e não há arquivo de acompanhamento por zona: para saber se uma zona mudou, é preciso baixá-la ou ver o `dt`/`ht` do município.
- **Inferência:** a projeção pode ser por município, com zona para as ~190 cidades com várias zonas. Seção fica fora.

---

## 4. Frequência, cache, CDN e carga

**Medido** (cabeçalhos de 17 e 18/10/2026):

- `Akamai-GRN`, `cdn-cache-status: Hit/RefreshHit/Miss from child[, … from parent]` (Akamai com dois níveis). `x-amz-request-id` termina em `-default`, típico de Ceph RGW (inferência: origem S3 do próprio TSE).
- **TTL de ~60 s na borda.** `Expires` fica fixo e `max-age` cai a cada requisição: 51 → 47 → 43 em pedidos espaçados de 4 s, com o mesmo `Expires: 11:03:36 GMT`. Assim, a borda pode servir uma versão até ~60 s mais velha que a origem. Para o `ele-c.json` e o `cm.json`, `max-age` veio baixo (5–8 s), na mesma lógica. O `bu.dat` tem `max-age=3600`.
- **A query string não muda a chave de cache.** `?nocache=<timestamp>` (o app oficial usa) respondeu `RefreshHit`, e não `Miss`. Não adianta usar *cache-busting*.
- **Requisição condicional funciona:** `If-None-Match: <ETag>` e `If-Modified-Since` → `304 Not Modified`.
- **gzip:** `Accept-Encoding: gzip` → `Content-Encoding: gzip`. O nacional do 2º turno cai de 2.864 para 880 bytes. Tamanhos gzip (1º turno, final): Brasil `u` 2,5 KB; Brasil `ab` 3,1 KB; SP `ab` 45 KB; município de SP `u` 2,4 KB. No 2º turno zerado: SP `ab` 9,4 KB, MG `ab` 16,7 KB.
- `X-RateLimit-Limit: 5000, 5000;w=1` e `X-RateLimit-Remaining` vêm da origem e não caíram com as minhas requisições. **Inferência:** é um limite da origem, não o limite por IP documentado (100/s).

**Código do app:** o app oficial revalida o resultado unificado a cada 30 s durante a totalização parcial ("totalização parcial; guardando por 30 minutos, revalidando em 30 segundos") e a cada 3 min depois da final (`tf = "s"`).

**Documentado** (FAQ):

- Cadência: "Os arquivos são atualizados conforme a evolução do processo de totalização de cada abrangência". Não há intervalo fixo.
- Intervalo de *polling* recomendado: nenhum. O TSE diz que o verificaria no simulado e não publicou resultado.
- Os acompanhamentos servem de índice: "O EA14 permite identificar atualizações nas UFs, enquanto o EA15 possibilita acompanhar as atualizações dos municípios de uma determinada UF". Mas, "como os arquivos são gerados em paralelo e posteriormente sincronizados e distribuídos pela CDN, podem ocorrer diferenças no momento em que cada arquivo passa a refletir os dados atualizados".
- O `idg` é um identificador único por geração de arquivo. Não é um contador comum a uma carga.
- Carga: "A infraestrutura da CDN será dimensionada para suportar o volume esperado de acessos". Não há números.

**Comportamento sob carga:** não medi. A noite do 1º turno já passou e nada nos arquivos registra latência. **Terceiros:** um projeto paralelo ([robertomsgomide/eleicoes, `coletor.py`](https://github.com/robertomsgomide/eleicoes/blob/main/src/eleicoes/ao_vivo/coletor.py)) usa 3 coletores defasados em 20 s, cada um com intervalo de 60 s "(o TSE guarda os arquivos ~60 s)", até 400 municípios por rodada, e troca de máquina após 10 rodadas seguidas com 403. Isso sugere que eles temem bloqueio de IP de *datacenter*, mas não achei registro de bloqueio real no 1º turno.

**Orçamento de requisições (inferência):** uma rodada de 1 Brasil `u` + 1 Brasil `ab` + 28 `ab` de UF dá 30 requisições. Pelo `dt`/`ht` de cada município no EA15, baixa-se só o que mudou. Mesmo uma varredura completa (5.757 municípios + 535 zonas extras) cabe em ~63 s a 100 req/s. Com folga, a 20–30 req/s, leva 3–5 min. Com o cache de 60 s, não adianta consultar o mesmo arquivo mais de uma vez por minuto.

---

## 5. CORS e limites de acesso

**Medido** (`curl --max-time 30 -H "Origin: https://exemplo.pages.dev"`, 18/10/2026):

```
GET .../6258/dados/br/br-c0001-e006258-u.json
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://exemplo.pages.dev
Vary: Origin

OPTIONS (Access-Control-Request-Method: GET, -Headers: cache-control)
HTTP/1.1 200 OK
Access-Control-Allow-Methods: GET
Access-Control-Allow-Headers: cache-control
Access-Control-Max-Age: 600

HEAD (qualquer arquivo)
HTTP/1.1 403 Forbidden   (cdn-cache-status: Error from child)
```

O CORS vale igualmente para `ele-c.json`, `ab`, `u` de UF, município e zona, `cm`, `cs`, `aux` e `bu.dat`. Respondeu 200 com o user agent padrão do curl, sem cabeçalhos de navegador.

**Documentado** (página técnica e FAQ):

- "Será permitido um máximo de 100 requisições por IP por segundo. Caso esse limite seja ultrapassado, poderá haver um bloqueio de 10 minutos. Se uma nova tentativa for feita antes do término, o tempo de bloqueio será reiniciado."
- "Múltiplos erros 404 podem provocar o bloqueio temporário do endereço IP". "Não há um limiar divulgado." O código do município deve ter 5 dígitos, com zeros à esquerda.
- "As requisições que resultarem em HTTP 304 também são contabilizadas para fins de rate limit."
- Não há cadastro nem *whitelist* de IP: "Os resultados das eleições são disponibilizados publicamente".

**Consequências (inferência):**

- **Navegador direto:** é possível. Mas o limite é por IP, e milhares de visitantes atrás de um mesmo NAT (empresa, rede móvel) poderiam somar 100 req/s. Também não há como controlar a carga que o site gera no TSE. Um servidor próprio que consulta, agrega e publica um JSON no nosso CDN é mais seguro e permite calcular a projeção em um lugar só.
- **Servidor a cada N segundos:** pode, bem abaixo de 100 req/s, com `GET` (não `HEAD`), URLs geradas a partir do `cm.json` para não produzir 404, e `If-None-Match`. N < 60 s não traz dados mais novos de um mesmo arquivo.
- **Risco não verificado:** o `www.tse.jus.br` bloqueia robôs com "Access Denied". O `resultados.tse.jus.br` não bloqueou curl. Mas não testei a partir de faixas de IP de nuvem (GitHub Actions, Cloudflare Workers, AWS).

---

## 6. Ambiente de teste e arquivos do 1º turno

- **Simulados (documentado):** 15, 16 e 17/09; 22, 23 e 24/09; 28 e 29/09/2026, em `https://resultados-sim.tse.jus.br/simulado`, ambiente `simulado2026`, pleito `17801`, eleição federal `21270`. Exemplo: `https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json`. Os arquivos começavam zerados e evoluíam até 100% e a totalização final. Os cenários incluíam seções anuladas, não instaladas, candidatos com destinação "Anulado" (Presidente: BR) e eleição matematicamente definida.
- **Hoje (medido):** `resultados-sim.tse.jus.br` responde 403 "Access Denied"; `resultados-hmg.tse.jus.br` não resolve no DNS público; `resultados.tse.jus.br/simulado/...` responde 503 "DNS failure". **Não há simulado público disponível agora, nem anúncio de simulado para o 2º turno** (não encontrei).
- **1º turno de 2026 (medido):** todos os arquivos `6257` continuam no ar, no formato final: Brasil, UF, ZZ, município, zona, `ab`, `cm`, `cs` e `aux` do pleito `3220`, e `bu.dat`. Eles servem para desenvolver e testar o leitor. Mas mostram só o estado final (`and = "f"`, `tf = "s"`). Não há histórico das versões parciais no CDN.
- **2º turno zerado (medido):** todos os níveis já existem com zeros, candidatos (Lula `13`, `seq 1`; Flávio `22`, `seq 2`), `ts`/`te` preenchidos e `dt`/`ht` vazios. Servem para testar o estado "antes das 17h".
- **Para ensaiar a noite (inferência):** é preciso gerar nós mesmos uma sequência de arquivos parciais no formato EA20/EA15, a partir da reconstrução seção por seção do ticket 02. O TSE não oferece *replay*.
- **2022 (medido na 1ª tentativa, 17/10):** o ciclo `ele2022` não está mais no `ele-c.json`, e `oficial/ele2022/544/...` e `.../545/...` dão `NoSuchKey`.
- **Documentação (documentado):** EA10, EA11, EA12, EA14, EA15, EA16, EA18, EA20, "Instruções para download" (v1.0 de 25/05/2026) e "Manual de verificação dos arquivos jws", todos em `www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/` (bloqueado para robôs). O Wayback tem só o EA12, o EA14 e o manual JWS. **Não li o EA20, o EA15, o EA16, o EA18 nem as Instruções.** O dicionário abaixo vem do EA14, do código do app e da leitura dos arquivos.

---

## 7. Assinatura (JWS)

**Documentado** ([manual de verificação JWS, 16/09/2026, cópia do Wayback](https://web.archive.org/web/20261009105842/https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/manual-verificacao-jws/@@display-file/file/manual-verificacao-jws.pdf)): cada arquivo sai em par, `.json` e `.jws`. O `.jws` é o mesmo JSON assinado em EdDSA/Ed25519 (`cabecalho.dados.assinatura`, em Base64URL). A chave pública deve ficar fixa na configuração, nunca tirada do próprio arquivo.

**Código do app:** a chave de produção embutida é `{"kty":"OKP","alg":"EdDSA","kid":"sNbt9Q_fLS65zE1_ZLNV-XRRwPY","crv":"Ed25519","x":"kWlpNHjuws1csyQZwzn3Fhzbi3RD435RbpThtSr4hMc"}`. O app baixa o `.jws` e verifica a assinatura.

**Medido:** `br-c0001-e006258-u.jws` existe (3.993 bytes, contra 2.864 do `.json`). Verificar a assinatura é opcional para o Apurador.

---

## 8. Dicionário dos campos usados

Fonte: EA14 (documentado), nomes de propriedade no código do app e valores medidos.

**Raiz (EA20 e EA14/15)**

| Campo | Significado | Exemplo |
|---|---|---|
| `ele` | código da eleição | `"6258"` |
| `t` | turno | `"2"` |
| `f` | fase: `o` oficial, `s` simulada | `"o"` |
| `tpabr`, `cdabr` | tipo e código da abrangência: `br`/`br`, `uf`/`sp` (inclui `zz`), `mu`/`71072`, `zona`/`0001` | `"mu"`, `"71072"` |
| `dg`, `hg` | data e hora de **geração** do arquivo | `"15/10/2026"`, `"09:38:12"` |
| `idg` | id único da geração | `"3535426"` |
| `dt`, `ht` | data e hora da **última totalização** da abrangência. Vazio antes da 1ª | `""` |
| `and` | andamento: `n` não iniciada, `p` em andamento, `f` finalizada | `"n"` |
| `tf` | houve totalização final (`s`/`n`) | `"n"` |
| `dv`, `sup`, `esae`, `mnae` | não documentados no material que li | `"s"`, `"n"`, `"n"`, `[]` |

**Candidato (`carg[].agr[].par[].cand[]`)**

| Campo | Significado |
|---|---|
| `n` | número na urna (`22`, `13`) |
| `sqcand` | sequencial do candidato (chave estável entre turnos: Flávio `280002551544`, Lula `280002542548`) |
| `nm`, `nmu` | nome civil, nome de urna |
| `seq` | ordem de classificação (no 2º turno zerado, Lula `1`, Flávio `2`) |
| `e`, `st` | eleito (`s`/`n`), situação (`"2º turno"`, `"Não eleito"`, `""`) |
| `dvt` | destinação do voto (`"Válido"`) |
| `vap`, `pvap`, `pvapn` | votos apurados; % sobre votos válidos (2 casas; `n` = 9 casas) |

**Seções (`s`)**: `ts` total; `st` totalizadas; `snt` não totalizadas; `si`/`sni` instaladas/não instaladas; `sa`/`sna` apuradas/não apuradas. `p…` é o percentual e `p…n` o mesmo com 9 casas. `pst = st/ts`. `psi`, `psni` são sobre as totalizadas. `psa`, `psna` são sobre as instaladas.

**Eleitorado (`e`)**: `te` aptos da abrangência; `est` aptos das seções totalizadas; `esnt` das não totalizadas; `esi`, `esni`, `esa`, `esna` (mesma árvore das seções); `c` comparecimento e `a` abstenção, ambos das seções instaladas totalizadas (`esi = c + a`); `pc`, `pa` sobre `esi`.

**Votos (`v`)** (rótulos do código do app): `tv` total de votos; `vv` válidos; `vvc` "votos a votáveis concorrentes"; `vnom` nominais; `vl` de legenda (opcional); `vb` brancos; `tvn` total de nulos = `vn` nulos + `vnt` nulos técnicos; `van` anulados; `vansj` anulados sub judice; `vp` anulados e apurados em separado; `vsan`, `vscv` sem rótulo achado. `pvvc`, `pvb` e `ptvn` são percentuais sobre `tv`. `pvn` e `pvnt` são sobre `tvn`. `pvv` é sobre `vv` (conferido nos números do 1º turno).

**Acompanhamento (EA14/EA15)**: além de `s` e `e`, o EA14 (`tpabr: br`) tem `ufsnr`/`ufspt`/`ufsf` (UFs não iniciadas, em andamento e finalizadas). O EA15 (`tpabr: uf`) tem `munnr`/`munpt`/`munf`. Cada item de `abr` tem seu próprio `dt`/`ht` e `and`.

**Seção (EA16/EA18)**: `ns` número da seção; `da`/`ha` geração do auxiliar; `nsa`/`nsp` aparecem em ~1–6% das seções (provavelmente seções agregadas ou principais; inferência, não documentado no que li). No auxiliar: `st` situação; `hashes[].hash`, `dr`/`hr`, `st`, `arq[]` (`nm`, `tp`: `bu`, `vota`, `rdv`, `log`).

---

## 9. Trechos dos JSONs

Brasil, 2º turno, zerado ([URL](https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json)):

```json
{ "ele" : "6258", "t" : "2", "f" : "o", "sup" : "n", "tpabr" : "br", "cdabr" : "br", "dg" : "15/10/2026", "hg" : "09:38:12", "idg" : "3535426", "dt" : "", "ht" : "", "dv" : "s", "tf" : "n", "and" : "n", "carg" : [ …
{ "n" : "22", "sqcand" : "280002551544", "nm" : "FLAVIO NANTES BOLSONARO", "nmu" : "FLAVIO BOLSONARO", "seq" : "2", "e" : "n", "st" : "", "vap" : "0", "pvap" : "0,00", "pvapn" : "0", …
"s" : { "ts" : "499248", "st" : "0", "pst" : "0,00", "pstn" : "0", "snt" : "499248", … },
"e" : { "te" : "158745502", "est" : "0", … "c" : "0", "pc" : "0,00", "a" : "0", … }
```

Brasil, 1º turno, final ([URL](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json)):

```json
"dt" : "05/10/2026", "ht" : "12:51:05", "tf" : "s", "and" : "f",
"s" : { "ts" : "499248", "st" : "499248", "pst" : "100,00", "si" : "499207", "sni" : "41", … },
"e" : { "te" : "158745502", "est" : "158745502", "c" : "125275835", "pc" : "78,92", "a" : "33469244", … },
"v" : { "tv" : "125275835", "vv" : "119300788", "vb" : "2300798", "tvn" : "3674249", "vn" : "3669003", "vnt" : "5246", … }
```

Acompanhamento de SP, um município ([URL do 1º turno](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/sp/sp-e006257-ab.json)):

```json
{ "and" : "f", "tpabr" : "mun", "cdabr" : "61000", "dt" : "04/10/2026", "ht" : "18:49:26", "s" :
{ "ts" : "21", "st" : "21", "pst" : "100,00", … }, "e" :
{ "te" : "6336", "est" : "6336", … "c" : "4525", "pc" : "71,42", "a" : "1811", … } }
```

---

## 10. O que ficou sem resposta

- **A defasagem dos arquivos de zona e de município na noite.** Só há a medição do nacional (~0,7 min, ticket 02). O CDN não guarda versões parciais.
- **A latência e os erros sob carga** no pico (17h–19h). Não há dado do 1º turno, e o TSE não publicou intervalo de *polling* recomendado.
- **Se IPs de nuvem** (GitHub Actions, Cloudflare, AWS) são bloqueados pela Akamai em `resultados.tse.jus.br`. Testei só da máquina local do projeto.
- **O conteúdo do EA20, EA15, EA16, EA18 e das "Instruções para download"** (PDFs bloqueados e não arquivados). Os campos `dv`, `sup`, `esae`, `mnae`, `vsan`, `vscv`, `nsa` e `nsp` ficaram sem definição oficial.
- **O conteúdo do `bu.dat`** (não decodifiquei; formato ASN.1 do TSE). Também não confirmei se `hr` no auxiliar é o recebimento.
- **Se o TSE fará simulado antes do 2º turno.** Não encontrei anúncio.
- **Se o TTL de ~60 s do CDN** muda na noite. Medi fora da eleição.

## Fontes

- Arquivos medidos: `https://resultados.tse.jus.br/oficial/comum/config/ele-c.json` e `https://resultados.tse.jus.br/oficial/ele2026/{6257,6258}/...`, `.../arquivo-urna/{3220,3221}/...` (URLs nas seções 1.3 e 3.2).
- App oficial: `https://resultados.tse.jus.br/oficial/app/index.html` e chunks JS (versão `26.10.9`).
- TSE, [Informações técnicas sobre a divulgação de resultados 2026](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados), lida via [Wayback, 04/10/2026](https://web.archive.org/web/20261004020301/https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados).
- TSE, EA14 (10/06/2026) e Manual de verificação JWS (16/09/2026), via Wayback (links nas seções 2 e 7).
- TSE, notícias de [05/08/2026](https://web.archive.org/web/20260806213627/https://www.tse.jus.br/comunicacao/noticias/2026/Agosto/resultados-das-eleicoes-2026-poderao-ser-acompanhados-em-tempo-real) e [30/09/2026](https://web.archive.org/web/20261001063737/https://www.tse.jus.br/comunicacao/noticias/2026/Setembro/faltam-4-dias-e-possivel-acompanhar-em-tempo-real-a-totalizacao-dos-votos), via Wayback.
- Terceiros: [robertomsgomide/eleicoes](https://github.com/robertomsgomide/eleicoes) (`src/eleicoes/ao_vivo/coletor.py`, `.github/workflows/coletor.yml`).
- Interno: [ticket 02, linha do tempo de apurações passadas](02-linha-do-tempo-apuracoes-passadas.md) (defasagem do arquivo nacional no 1º turno).
