# 26: Malha e mapa

Status: resolved
Blocked by: 16, 18
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O pipeline simplifica a malha do IBGE 2024 para a web. O cartão **Mapa | Tabela** ganha o mapa, desenhado com d3-geo e TopoJSON em SVG, sem bibliotecas de mapa com fundo, a partir do `mapa.json` do [ticket 18](18-projecao-dos-municipios-e-tabelas.md).

- **Brasil**: começa por estados e alterna para municípios.
- **UF**: mostra os municípios dela.
- **Município**: mostra a UF, com ele destacado.
- **Antes das 17h**: o mapa mostra o 1º turno de 2026, pelo placar entre finalistas.

O mapa desliga pela sua chave e, se não ficar rápido o bastante, dá lugar à tabela.

Decisões: [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisão 8 e comentários), [Arquitetura e tecnologia](../../apurador-2026/issues/08-arquitetura-e-tecnologia.md) (decisões 4 e 5), [Dados históricos por município e malhas](../../apurador-2026/issues/03-dados-historicos-e-malhas.md), [Segunda consulta jurídica](../../apurador-2026/issues/21-segunda-consulta-juridica.md) e [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisão 22).

## Critérios de aceite

- [x] **Malha**: a Malha Municipal Digital 2024 do IBGE é simplificada no pipeline. Inclui Boa Esperança do Norte (MT, IBGE 5101837), casa com os códigos do TSE pela `municipio_tse_ibge` e fica em TopoJSON, com 0,4 a 1 MB com gzip. A malha das UFs sai junto.
- [x] **Atribuição**: o rodapé traz "Malha: IBGE, Malha Municipal Digital 2024, CC BY 4.0, simplificada pelo Apurador".
- [x] **Cor**: a de quem lidera, mais forte com vantagem maior e mais transparente com menos seções. Cinza quando não há seções.
- [x] **Modo "Mudança desde o 1º turno"**: usa a projeção enquanto a apuração corre e o resultado depois do fim.
- [x] **Toque**: abre um cartão com os números (TSE com duas casas) e "Abrir a página →", sem navegar de primeira.
- [x] **Exterior**: não tem mapa, só a tabela das cidades.
- [x] **Download sob demanda**: a malha e o `mapa.json` só são baixados quando o cartão entra na tela.
- [x] **Desempenho**: no Android barato, o mapa desenha todos os municípios em até 2 s, sem travar a rolagem. Se falhar em SVG, passa para canvas. Se falhar de novo, a chave do mapa fica desligada.
- [x] **Chave do mapa**: desligada, o cartão mostra só a Tabela.
- [x] O mapa leva "Cálculo do Apurador com dados do TSE".

## Comments

- 20/10/2026, do [ticket 16](16-comandos-chaves-e-plano-zero.md):
  - **A chave** é `mapa` (`NOMES_DAS_CHAVES`, em `packages/coletor/src/chaves.ts`). O dono a desliga com `npm run noite -- desligar mapa` (confirmando com `mapa`), e o estado chega à página pelo `rodada.json` (`chaves.mapa`), em até 2 rodadas, sem recarregar.
  - **Na página**, a chave vale em `quadro.chaves.mapa` (`QuadroAoVivo`, `packages/site/src/lib/leitor-ao-vivo.ts`): até a primeira rodada, é a de `dados/chaves.json` (`noite.mapa`, que o build também lê por `CHAVES.noite` para o mapa do 1º turno antes das 17h); depois, a do arquivo de rodada. Desligada, o cartão mostra só a Tabela.
  - O cartão Mapa | Tabela fica fora da ilha do bloco ao vivo (`components/BlocoAoVivo.tsx`), que é quem tem o leitor. Ou o cartão entra na mesma ilha e recebe o quadro por prop, ou a ilha repassa o quadro a cada leitura (um evento no DOM, por exemplo `apurador:quadro`). O que não deve existir é um segundo `criarLeitorAoVivo` por visitante: dobraria os pedidos à CDN a cada 30 s. O mesmo vale para o simulador ([ticket 25](25-simulador-ao-vivo.md)).
  - A regra "se falhar em canvas, a chave do mapa fica desligada" é o dono rodando `desligar mapa` no ensaio, não código.
- 21/10/2026, do [ticket 34](34-comparacao-de-dois-turnos.md), que deixou a nota só no próprio registro:
  - `lugaresAbaixo` (em `packages/site/src/lib/lugares.ts`) dá os lugares do mapa e da tabela de cada página. `PT` e `PARTIDO_DE_BOLSONARO` ficam em `packages/pipeline/src/partidos.ts` (`@apurador/pipeline/partidos`, que a página também importa, desde o ticket 33); `packages/site/src/lib/identidade.ts` os reexporta.
  - O placar entre finalistas vai com uma casa, o partido de Bolsonaro arredondado e o PT com o que falta para 100,0, como em `noTurno` (`packages/site/src/lib/comparacao.ts`): o mesmo lugar dá o mesmo placar em todo bloco. Uma segunda cópia da conta, na curva de comparação do ticket 33 (`packages/pipeline/src/curvas.ts`), errou 0,1 em 15 lugares até a revisão dele.
- 22/10/2026, do [ticket 17](17-projecao-ao-vivo.md): o modo "Mudança desde o 1º turno" usa a conta de "A projeção, comparada" da caixa.
  - **No Brasil, nas UFs e no Exterior**: a referência é `projecao.comparacoes.primeiroTurno`, do JSON do lugar, em % do 1º candidato do arquivo de rodada com uma casa, e a conta é `mudancaEntre(candidatos, de, para)` (`packages/site/src/lib/projecao-ao-vivo.ts`).
  - **Nos municípios**: a referência vem com a tabela do [ticket 18](18-projecao-dos-municipios-e-tabelas.md).
- 22/10/2026, do [ticket 18](18-projecao-dos-municipios-e-tabelas.md):
  - **O cartão** é a ilha `components/CartaoDoMapa.tsx` (`client:visible`, embaixo, antes do histórico), que hoje só tem a tabela de lugares (`components/TabelaDosLugares.tsx`): o controle Mapa | Tabela e o mapa entram nela. Ela recebe o quadro e a base escolhida por `lib/quadro-da-pagina.ts` (`useQuadroDaPagina`, `useBaseDaPagina`) e, quando chega perto da tela, chama `mostrarOCartao()`: a ilha do bloco ao vivo passa a ler o mapa.json (`quadro.mapa`) e, numa UF ou no Exterior, a tabela de projeções dela (`quadro.tabelaDeProjecoes`), na hora e depois a cada leitura. A malha pode ser baixada no mesmo momento.
  - **`mapa.json`** (`ArquivoDoMapa`, em `packages/coletor/src/arquivos.ts`) não tem ids: segue a ordem de `ordemDoMapa` (`dados/lugares.json` sem o Brasil), com a assinatura dela, e a página só o lê com a assinatura do build. Cada lugar é `[secoes, primeiro, segundo?]`, e `lugarNoMapa` (`@apurador/coletor/arquivos`) devolve o % de seções e o placar com as duas casas do TSE; um lugar do site sem arquivo do TSE é `null`.
  - **A posição de cada lugar no mapa.json** só está, no build, nos `/tabela-de-lugares/<id>.json` do Brasil (as UFs e o Exterior), de cada UF e do Exterior (`indice`, com a `assinatura`). O mapa do Brasil por municípios precisaria de todos (as 28 tabelas de lugares, ou um arquivo só com a posição de cada município): escolha deste ticket.
  - **"Mudança desde o 1º turno"**:
    - **no Brasil por estados**, a projeção de cada UF e do Exterior está no `mapa.json` (`projecao.soApuracao`/`comPesquisas`, em % do 1º candidato do arquivo de rodada, com uma casa), e a referência, no JSON de cada UF (`projecao.comparacoes.primeiroTurno`);
    - **numa UF**, a projeção de cada município e a referência dele estão em `quadro.tabelaDeProjecoes` (`TabelaDeProjecoesLida`: `municipios`, `comparacoes.primeiroTurno` e, com a projeção no ar, `projecao`, tudo na mesma ordem); `projecaoDosLugares`, em `lib/tabela-dos-lugares.ts`, já as lê para a coluna da tabela;
    - **no Brasil por municípios**, seriam as 28 tabelas de projeções (~70 KB com gzip a cada leitura) e os 28 arquivos dos municípios delas: decisão deste ticket.
  - **Antes das 17h**, o placar entre finalistas do 1º turno de 2026 de cada lugar está nos mesmos `/tabela-de-lugares/<id>.json` (`primeiroTurno`, o % do partido de Bolsonaro com uma casa, pela regra de `noTurno`). O Brasil por municípios também precisaria dos 28.
  - **A tabela não olha a chave `mapa`**: ela é a alternativa ao mapa, sempre no ar.
- 23/10/2026, registro do ticket 26 (branch `ticket/26-malha-e-mapa`):
  - **Malha** (`npm run malha`, `packages/pipeline/src/gerar-malha.ts`; a conta em `malhaDaWeb`, `malha.ts`): do zip `BR_Municipios_2024.zip` do IBGE (199 MB) saem só os membros `.shp`, `.dbf`, `.prj` e `.cpg`, pelo leitor de zip remoto, para o cache `.cache/ibge/`, ao lado do `.cache/tse/` no checkout principal (`membroComCache` com `cache: CACHE_DO_IBGE`, `fontes.ts`). O mapshaper tira as duas áreas operacionais das lagoas do RS (IBGE 4300001 e 4300002), simplifica a 1% com `keep-shapes` e grava em TopoJSON com quantização 1e5:
    - `dados/malha/municipios.json`: os 5.571 municípios pelo id do site, com Boa Esperança do Norte (73709), 1.640 KB, 542 KB com gzip (`gzip -9`). Com 2%, seriam ~760 KB, e com 3%, ~940 KB.
    - `dados/malha/ufs.json`: as 27 UFs, dissolvidas da mesma malha (as fronteiras são as mesmas), 121 KB, 40 KB com gzip.
    - O casamento é pelo `ibge` de `dados/lugares.json`, que vem da `municipio_tse_ibge`: a geração falha se um município do site ficar sem polígono ou sobrar polígono sem município. No manifesto, a fonte é o `.shp` (sem data de geração: o IBGE não tem `DT_GERACAO`).
  - **No build**: `/malha/ufs.json` e `/malha/municipios.json` como estão no repositório e `/malha/<UF>.json`, o recorte com só os municípios da UF e os arcos deles (`recortarMalha`, `packages/site/src/lib/malha.ts`): SP 52 KB, MG 79 KB e DF 0,5 KB com gzip.
  - **Na página**: o cartão (`components/CartaoDoMapa.tsx`) abre no Mapa e alterna "Mapa | Tabela" (`components/Alternancia.tsx`); o mapa é `components/MapaDosLugares.tsx`, com os caminhos de d3-geo (`lib/desenho-do-mapa.ts`), a malha baixada e decodificada por `baixarVista` (`lib/malha.ts`) e as cores de `mapaDosLugares` (`lib/mapa-dos-lugares.ts`), que parte da tabela de lugares do mesmo quadro (`tabelaDosLugares`): os números de cada fase são os mesmos da tabela. A malha só é baixada depois que a tabela de lugares chega, quando o cartão entra na tela.
  - **Coletor** (o mínimo, em `projecaoDasUfs`, `packages/coletor/src/coletor.ts`, e no tipo `ArquivoDoMapa`): o `projecao` do `mapa.json` leva também `primeiroTurno`, o 1º turno com que a caixa de cada UF e do Exterior compara (`comparacoes.primeiroTurno` do JSON dela), ~0,3 KB a mais. O replay confere que é o mesmo do JSON de cada uma (`replay-ate-a-meia-hora.test.ts`). O campo é opcional: com um coletor de antes deste ticket ainda no ar quando o site novo vai ao ar, o Brasil por estados só deixa de oferecer o modo de mudança. O ticket 23 mexe no mesmo arquivo: a junção pode pedir cuidado ali.
  - **Escolhas deste ticket**:
    - **Brasil por municípios**: a posição de cada município no `mapa.json`, o nome, o caminho e o 1º turno vêm das 27 `/tabela-de-lugares/<UF>.json`, baixadas uma vez, só na troca para "Municípios": 565 KB, 127 KB com gzip (medido no `astro dev` em 23/10). Nenhum arquivo novo; a cada leitura, a página continua baixando só o `mapa.json`.
    - **Mudança no Brasil por municípios**: não é oferecida, nem depois do fim: precisaria das 28 tabelas de projeções a cada leitura (~70 KB com gzip a cada 30 s, pelo ticket 18), e o 1º turno do coletor de cada município vem com elas. No Brasil por estados, nas UFs e nos municípios, é oferecida com a projeção no ar e depois do fim.
    - **A referência da mudança** é a da caixa: o 1º turno do coletor, do `mapa.json` (as UFs) ou da tabela de projeções da UF (os municípios). No ensaio, o coletor roda sobre a base de 2022, e a referência é a de 2022, como na caixa; as tabelas de lugares do build têm sempre a de 2026. Antes das 17h, o mapa mostra o `primeiroTurno` das tabelas de lugares (o placar entre finalistas de 2026, com uma casa, pela regra de `noTurno`): é a fonte do 1º turno antes das 17h.
    - **Projeção e resultado**: enquanto a noite corre (fase ao vivo), a mudança compara a projeção, também num lugar que terminou, em que ela já é o resultado (é o que a caixa mostra, com uma casa, a partir dos votos); depois do fim (fase `encerrada`, sem a caixa), o resultado, que é o % do 1º candidato no `mapa.json`, com as duas casas do TSE, arredondado a uma.
    - **Cor**: a do candidato misturada ao fundo do cartão em 6 forças (vantagem a partir de 5, 10, 20, 30 e 40 pontos; mudança a partir de 0,5, 1, 2, 4 e 8), com opacidade de 0,4 + 0,6 × o % de seções. Sem seções (ou sem voto no 1º turno), o cinza do trilho; empate e "sem mudança", o cinza dos outros partidos, com a legenda quando há. As cores saem das variáveis do CSS e mudam com o tema.
    - **Canvas**: se o SVG levar mais de 2 s, o mapa passa ao canvas (os mesmos caminhos, em `Path2D`, com o toque por `isPointInPath`) e guarda isso no aparelho (`localStorage`, `apurador:mapa-em-canvas`). O tempo vai do começo da decodificação da malha (sem o download) ao segundo quadro depois de o SVG pintado entrar, e não vale se a página ficou escondida no meio (outra aba): os quadros param. `?mapa=canvas` e `?mapa=svg` escolhem à mão, para o ensaio. O elemento leva `data-desenho` e `data-ms`. A decisão 4 da arquitetura deixava a troca para depois do ensaio; feita pelo próprio mapa, ela já vale na noite, sem deploy. "Se falhar de novo, a chave do mapa fica desligada" fica com o dono no ensaio (ticket 16).
    - **A rolagem**: a conta dos caminhos e a entrada deles no SVG saem em fatias de 400, com `scheduler.yield()` entre elas (sem o mínimo de 4 ms do `setTimeout`: 28 pausas custavam ~100 ms), e a cada leitura só mudam as cores dos lugares que mudaram. O canvas redesenha tudo a cada leitura.
    - **O toque** abre o cartão do lugar embaixo do mapa, não flutuando sobre ele. O mapa não tem foco por lugar: a Tabela é a alternativa pelo teclado e pelo leitor de tela.
  - **Medido no computador** (Chrome, `astro dev`, antes das fatias no SVG): Brasil por estados, 27 caminhos; por municípios, 5.571 em 467 ms em SVG e 433 ms em canvas; SP, 645 em 41 ms. Com o painel do navegador escondido, os quadros andam a ~1 por segundo, e o tempo medido passa de 1,9 s: não serve de medida. O Android barato fica com o ensaio 2 (notas no [ticket 32](32-ensaios-gerais.md)).
  - **Revisão** (`/code-review` contra a `main`): a referência da mudança passou a ser a do coletor; o resultado só depois do fim; a guarda da página escondida; as fatias no SVG; e, nos padrões, o `oQueFaltaPara100` no lugar de quatro cópias da conta, `decimosEntre` dividido com `mudancaEntre`, o cache do IBGE pelo `membroComCache`, o controle e o download fora da ilha, e os botões com o feitio dos da página. Ficou de fora: "Malha" não entrou no `GLOSSARY.md` (é com o `/domain-modeling`).
  - **Checagem inteira**: passou antes da revisão (108 arquivos, 1.086 testes) e depois das correções (108 arquivos, 1.089 testes, 458 s).
  - **Fora daqui**: o 3D (Telas da página de lugar, decisão 9) não está nos critérios deste ticket.
