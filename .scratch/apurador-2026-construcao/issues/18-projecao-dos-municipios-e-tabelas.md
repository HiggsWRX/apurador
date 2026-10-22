# 18: Projeção dos municípios e tabelas de lugares

Status: resolved
Blocked by: 17
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O coletor publica a projeção dos municípios numa tabela de projeções por UF (27 UFs mais o Exterior), sem inchar o JSON de cada município. Publica também o `mapa.json` compacto, com o placar e o % de seções de cada município e de cada UF.

A página de município mostra a própria projeção e desenha a própria curva projetada ligando o placar parcial à projeção, sem modelo no navegador. O cartão do mapa ganha a **Tabela** de lugares, ordenável. O mapa desenhado chega no [ticket 26](26-malha-e-mapa.md).

Decisões: [Volume de gravações na noite](../../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md) (decisões 1, 2 e 4), [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisão 8) e [Arquitetura e tecnologia](../../apurador-2026/issues/08-arquitetura-e-tecnologia.md) (decisão 18).

## Critérios de aceite

- [x] **Tabela de projeções por UF**: há uma para cada UF e uma para o Exterior, 28 no total. Para cada município, traz, nas duas bases, a projeção, a margem, a chance de vitória, a virada projetada e os votos válidos projetados. Cada tabela é gravada só quando os bytes mudam.
- [x] **JSON do município**: continua só com o que vem do arquivo do TSE dele e a narração dele.
- [x] **Página de município**: mostra o bloco da projeção e o rótulo do sinal de virada a partir da linha da tabela da UF. A curva projetada liga o placar parcial à projeção.
- [x] **`mapa.json`**: traz o placar e o % de seções de cada UF e de cada município, com duas casas, e fica em ~25 KB com gzip. Só é baixado quando o cartão do mapa ou da tabela entra na tela.
- [x] **Tabela**: no Brasil, traz os estados; na UF, os municípios; no Exterior, as cidades, sem mapa. As colunas são % de seções, placar e projeção, e dá para ordenar por qualquer uma.
- [x] Antes das 17h, a tabela mostra o placar entre finalistas do 1º turno de 2026.
- [x] A tabela leva "Cálculo do Apurador com dados do TSE" na projeção, e os números do TSE vão com duas casas.
- [x] **Replay de 2022**: as gravações da noite ficam na ordem das contas do ticket 24 (~135 mil), e o teto de 1.500 por rodada nunca é atingido.

## Comments

- 19/10/2026, do [ticket 28](28-calibracao.md):
  - O ticket 07 mediu a margem dos municípios estreita com as constantes provisórias: ela cobria o resultado em 72% dos momentos com 50% das seções e em 55% com 90%. As congeladas (incertezas de 2 e 2 p.p. e peso do próprio município de 10.000 votos) alargam a margem, mas a calibração mede só o Brasil. Vale medir de novo nos municípios antes de mostrar a margem deles.
  - A zona não entra: a projeção é por município.
- 21/10/2026, do [ticket 34](34-comparacao-de-dois-turnos.md), que deixou a nota só no próprio registro:
  - `lugaresAbaixo` (em `packages/site/src/lib/lugares.ts`) dá os lugares do mapa e da tabela de cada página. `PT` e `PARTIDO_DE_BOLSONARO` ficam em `packages/pipeline/src/partidos.ts` (`@apurador/pipeline/partidos`, que a página também importa, desde o ticket 33); `packages/site/src/lib/identidade.ts` os reexporta.
  - O placar entre finalistas vai com uma casa, o partido de Bolsonaro arredondado e o PT com o que falta para 100,0, como em `noTurno` (`packages/site/src/lib/comparacao.ts`): o mesmo lugar dá o mesmo placar em todo bloco. Uma segunda cópia da conta, na curva de comparação do ticket 33 (`packages/pipeline/src/curvas.ts`), errou 0,1 em 15 lugares até a revisão dele.
- 22/10/2026, do [ticket 17](17-projecao-ao-vivo.md):
  - **De onde sai**: a projeção da rodada é `criarProjecaoDaNoite(entrada).projetar(resultado, ordem)` (`packages/coletor/src/projecao.ts`), chamada por `projetar(d)` no `coletor.ts` a cada rodada com resultado novo. Por dentro, `duas` (o `projetarNasDuasBases`) já tem `soApuracao.municipios` e `comPesquisas.municipios`, na ordem da base e cada um com a `virada` do município, e `coincidem.municipios`. A tabela por UF sai daí, com os arredondamentos de `naBase` (uma casa; chance e virada inteiras) e os % do 1º candidato do arquivo de rodada (`doPrimeiro`).
  - **Gravação e chaves**: a tabela é mais um arquivo de `publicar()`, gravado pelo `gravarSeMudou`, e segue as chaves como o JSON do Brasil (`projecaoNoAr(d)`, que também a tira antes das 17h, e `controle.chaves.baseComPesquisas`).
  - **Partida a frio**: já tratada. `projetar` dá `undefined` enquanto falta o resultado de mais de 1% dos municípios da base, depois da primeira seção.
  - **Na página**: a caixa é `components/ProjecaoAoVivo.tsx`, e a lógica, `lib/projecao-ao-vivo.ts` (`projecaoNaPagina`, `rotuloDoSinal`, `curvaProjetadaAoVivo`). A `CurvaReal` desenha a curva projetada pela prop `projetada`, com as camadas da `CurvaProjetada` (`LinhasProjetadas`, `FaixaDaVirada`, `LosangoDaVirada`): a página de município pode passar ali a reta do placar à projeção.

**22/10/2026, resolvido:**

- **No coletor** (`publicar()`, em `coletor.ts`; os contratos em `arquivos.ts`):
  - **Tabela de projeções** (`tabelas/<UF>.json`, `TabelaDeProjecoes`): 28, uma por UF e uma do Exterior, montadas a cada rodada por `dosMunicipios(uf, comPesquisas)` (`projecao.ts`) e gravadas pelo `gravarSeMudou`.
    - **Colunas**: cada base (`ColunasDaBase`) traz, por município, `projecao`, `margem`, `chance`, `chanceDeVirada`, `sinalDeVirada` e `virada` (`[x, cedo, tarde]`), com os arredondamentos do JSON do Brasil (uma casa; chance e virada inteiras). Os `validos` projetados vão uma vez só: são os mesmos nas duas bases, que só repartem diferente o voto que falta.
    - **Chaves**: seguem as do JSON do Brasil (`projecaoNoAr`). Sem a projeção no ar (antes das 17h, chave desligada, partida a frio), a tabela é regravada vazia (`{ uf }`), para nenhuma projeção velha ficar no destino; com a base com pesquisas desligada, só a `soApuracao`.
  - **Os municípios da tabela** (`tabelas/<UF>-municipios.json`, `MunicipiosDaTabela`): o código de cada município, na ordem das colunas, e as comparações dele (o 1º turno pelo placar entre finalistas e a indicação das pesquisas, em % do 1º candidato, com uma casa). Gravado uma vez, a partir das 17h, com a projeção no ar. Os dois arquivos levam a mesma `assinatura` (a dos códigos).
  - **`mapa.json`** (`ArquivoDoMapa`): o % de seções e o placar de cada UF, do Exterior e de cada município, como o TSE os publica, e a projeção de cada UF e do Exterior nas bases no ar (a coluna da tabela do Brasil).
    - **Ordem**: a dos lugares do site (`ordemDoMapa`, em `packages/pipeline/src/lugares.ts`: `dados/lugares.json` sem o Brasil, que o coletor já recebe), sem os ids, com a assinatura da lista (`assinaturaDosLugares`). Um lugar do site sem arquivo do TSE vai `null` (os 9 que não votaram em 2022).
    - **Placar**: `[secoes, primeiro, segundo?]`; o % do 2º só vai quando os dois não somam 100,00 (o TSE arredonda cada um à parte). Quem escreve e quem lê usam a mesma regra (`lugarNoMapa`, também por `@apurador/coletor/arquivos`).
  - **Plano zero**: nem as tabelas, nem os municípios delas, nem o mapa.json.
- **Medido no replay de 2022** (16:50 até 30 min depois da totalização final, 1.435 rodadas):
  - **Gravações**: 124.053 na noite (rodada 1.435, lugares 109.925, tabelas 11.874, municípios das tabelas 28, mapa.json 791), e 629 na maior rodada.
  - **Tamanhos com gzip**: o mapa.json chega a 20,7 KB (só os ids dariam ~17 KB); as 28 tabelas, a 69,5 KB somadas (Minas Gerais 10,6 KB, São Paulo 6,8 KB).
- **Na página**:
  - **Leitor** (`lib/leitor-ao-vivo.ts`):
    - `tabelaDeProjecoes: { uf, desdeOInicio }` faz ele ler a tabela da UF e os municípios dela, e `incluirOCartao()` acrescenta o mapa.json (e, numa UF, a tabela) às leituras seguintes;
    - o quadro traz `tabelaDeProjecoes` (`TabelaDeProjecoesLida`: os municípios, as comparações e, com a mesma assinatura, as projeções) e `mapa`;
    - cada arquivo só é pedido quando pode aparecer, pela última rodada: o mapa.json da fase ao vivo em diante, fora do plano zero; a tabela também só na fase ao vivo, com a chave da projeção. A leitura que passa ao ao vivo pede os dois nela mesma.
  - **Projeção do município** (`projecaoDoLugar`, em `lib/projecao-ao-vivo.ts`): a linha dele na tabela vira uma `ProjecaoDoLugar`, e a caixa, o rótulo do sinal e a curva da `CurvaReal` saem sem mudança.
    - **A curva** liga o placar parcial à projeção em 21 pontos, pelos votos: com a fração f do voto que falta já chegada, cada candidato tem os votos de agora mais f × o que lhe falta, nos válidos projetados. A margem cresce de 0 à da projeção, como na `viradaDoMunicipio` do `modelo`, e a curva cruza 50% onde a virada projetada diz.
    - Antes da primeira seção do município, ela é a própria projeção, de 0% a 100%; terminado ele, um ponto só, e a curva projetada não aparece.
  - **Cartão do mapa** (`components/CartaoDoMapa.tsx`, ilha `client:visible`), embaixo, antes do histórico: no Brasil, "Estados e Exterior"; na UF, os municípios; no Exterior, as cidades; num município, os da UF dele, com ele destacado e a tabela rolada até ele. Quem escolhe a tabela de cada página é `lugarDaTabela` (`lib/lugares.ts`).
    - **A tabela** (`lib/tabela-dos-lugares.ts` e `components/TabelaDosLugares.tsx`): antes das 17h, no plano zero e sem um mapa.json da mesma assinatura, só o placar entre finalistas do 1º turno de 2026; na noite, o % de seções e o placar, com duas casas, e a projeção da base escolhida, com uma, só na fase ao vivo com a chave dela. Cada coluna ordena, nos dois sentidos, com os lugares sem número por último.
    - **Do build** (`/tabela-de-lugares/<id>.json`, `lib/tabelas-do-build.ts`): os lugares abaixo do Brasil, de cada UF e do Exterior, com o caminho, a posição no mapa.json e o 1º turno (`doPartidoDeBolsonaro`, em `lib/comparacao.ts`). A ilha o baixa quando o cartão chega perto da tela e avisa a do bloco ao vivo (`mostrarOCartao`, em `lib/quadro-da-pagina.ts`), que lê o mapa.json na hora: um leitor só por página. A base escolhida passa às outras ilhas por `publicarBase`/`useBaseDaPagina`.
  - **Vista na noite local** (`npm run noite-local -- --partida 18:35`, no `astro dev`): em Uberlândia (MG), a caixa, o rótulo "Sem sinal de virada · chance de virada <1%" e a curva projetada de 56,9% a 56,7% saíram da linha dela na tabela de Minas Gerais; a tabela dos 853 municípios a mostrou com os mesmos números, e a do Brasil, Minas Gerais com os do JSON dela.
- **Diferente do ticket**:
  - **Os municípios e as comparações saem da tabela** para um arquivo gravado uma vez. Repetidos a cada rodada, os códigos (16 KB) e as comparações (22 KB) levavam as 28 tabelas a 107 KB com gzip, ~50 MB a mais por noite, e a noite pelo celular passaria de 1 GB contando o dobro da Operação na noite.
  - **A projeção das UFs vai no mapa.json**, para a tabela do Brasil: o ticket não diz de onde ela vem, e ler os 28 JSONs das UFs custaria ~70 KB a cada 30 s.
- **Revisão** (`/code-review`, Standards e Spec).
  - **Corrigidos**:
    - o mesmo nome (`TabelaDosLugares`) exportado por dois módulos: o tipo passou a `ConteudoDaTabela`;
    - "tabela" para dois arquivos: a do build passou a tabela de lugares (`/tabela-de-lugares/<id>.json`, `ArquivoDaTabelaDeLugares`), e "tabela de projeções" ficou só para a do coletor;
    - `dono`, que no glossário é o operador, passou a `lugarDaTabela`;
    - regras escritas duas vezes: a ordem do mapa.json (agora `ordemDoMapa`), o % do 2º candidato omitido (`lugarNoMapa`) e o do outro finalista com uma casa (`oQueFaltaPara100`, em `lib/formato.ts`, que `noTurno` também usa);
    - a tabela e os municípios dela se juntavam em dois lugares; agora no leitor;
    - antes das 17h, cada página de município pedia a cada 30 s os municípios da tabela, que só existem a partir delas;
    - o município destacado ficava escondido no meio da tabela da UF;
    - sem a projeção, a tabela ficava sem "Cálculo do Apurador com dados do TSE";
    - dois testes que passavam por construção (o número de pontos da curva, as 28 tabelas contadas na lista do próprio teste) e a tolerância das tabelas, de 80 para 70 KB.
  - **Ficaram, por julgamento**:
    - os termos novos (tabela de projeções, tabela de lugares, cartão do mapa, assinatura) não estão no `GLOSSARY.md`: cabem no `/domain-modeling`;
    - o placar da tabela mostra quem lidera e o % dele, e ordena pelo % do 1º candidato, a ordem fixa do site;
    - o título do cartão e o cabeçalho "Estado/Município/Cidade" ainda escolhem pelo tipo do lugar, cada um no seu módulo.
- **Para o dono**:
  - **Tamanho das tabelas**: 69,5 KB somados com gzip, contra os 68 KB do ticket 24 e da spec (Minas Gerais 10,6 contra 9,7). O teste aceita até 70.
  - **A margem dos municípios** (comentário do ticket 28), medida na noite de 2022 com as constantes congeladas, um momento a cada 10 min das 17:10 às 20:30: o resultado do município fica dentro de projeção ± margem em 99,4% dos momentos com até 25% das seções dele, 93,8% de 25% a 50%, 88,5% de 45% a 55%, 81,0% de 50% a 75% e 61,2% de 85% a 95% (as duas bases dão o mesmo, a menos de 0,2 ponto). Antes, com as provisórias, eram 72% com 50% e 55% com 90%. A página mostra essa margem na caixa e na faixa da curva; mostrá-la assim, alargá-la no `modelo` ou tirá-la dos municípios é decisão do dono.
