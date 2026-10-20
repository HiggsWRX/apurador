# 14: Bloco ao vivo: placar oficial, curva real, fase e indicador ao vivo

Status: resolved
Blocked by: 02, 12
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

A ilha em Preact do bloco ao vivo, em cada página de lugar. Ela lê o JSON do lugar e o arquivo de rodada a cada 30 s, com `If-None-Match`, e mostra:

- o placar oficial e a linha fixa;
- a manchete factual;
- a curva real;
- o indicador ao vivo.

A fase vem do arquivo de rodada: a página passa sozinha de "antes das 17h" a "ao vivo", sem recarregar. O "interrompido" compara a hora da rodada com o cabeçalho `Date` da resposta, nunca com o relógio do aparelho. No desenvolvimento, a ilha lê a pasta local que o coletor publica sobre o TSE falso.

Decisões: [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisões 1, 2, 4, 5 e 12), [Simulador "e se"](../../apurador-2026/issues/13-simulador-e-se.md) (decisão 14: indicador ao vivo), [Narração da noite](../../apurador-2026/issues/14-narracao-da-noite.md) (decisão 9: manchete), [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisão 7) e [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md) (decisão 11).

## Critérios de aceite

- [x] **Cartão do placar oficial**: os dois candidatos lado a lado, com a foto oficial do TSE sem alteração, nome, partido, % com duas casas e votos.
  - Embaixo vêm a barra, o % de seções com "x de y", a hora da última totalização e "Fonte: TSE, sem alteração (CC-BY)".
  - A moldura é sólida, com o selo "Placar oficial · TSE".
- [x] **Linha fixa**: quando o placar sai da tela, uma linha fina no topo mostra só os números oficiais (Flávio %, Lula %, % de seções · TSE).
- [x] **Manchete factual**: começa sempre pelo placar oficial.
  - Antes das 17h: "A apuração do 2º turno começa às 17h".
  - Lugar sem seções: "A apuração ainda não começou neste estado" (ou "neste município").
  - Durante: "Flávio lidera com X% dos votos válidos e Y% das seções totalizadas".
  - Com diferença menor que 0,10 ponto, a diferença vai em votos.
  - Nunca há frase de projeção.
- [x] **Curva real**: as duas linhas espelhadas em torno de 50%. A escala ignora o começo instável, até 3% das seções, e a curva se estende a cada leitura.
- [x] **Os seis estados do indicador ao vivo**, como decidido:
  1. **Antes das 17h**: "A divulgação começa às 17h", com contagem regressiva na última hora.
  2. **Ao vivo**: ponto pulsante, anel de 30 s e "Atualiza sozinho, sem recarregar".
  3. **TSE sem novidade**: continua ao vivo, com "TSE sem novidade desde HH:MM" no detalhe.
  4. **Interrompido**: depois de 3 min sem rodada, "Atualizado às HH:MM, atualização interrompida". Depois de 10 min, entra o link para o app oficial do TSE, com os últimos dados à vista.
  5. **Sem conexão**: "Sem conexão · tentando de novo".
  6. **Encerrada**: "Apuração encerrada". Com essa fase, o "interrompido" nunca aparece.
- [x] **Indicador, forma**: um toque abre o detalhe com a última leitura e a última totalização. A cor é grafite. Com movimento reduzido, não há pulso nem pisca, e o anel vira "próxima leitura em N s".
- [x] Os números que mudaram piscam uma vez (1 s).
- [x] A passagem para o ao vivo acontece sem recarregar e só pelo arquivo de rodada.
- [x] **Leitor ao vivo**: a lógica da ilha que decide o que mostrar é testada com respostas simuladas (status, `Date`, ETag e corpo) e relógio injetado, cobrindo os seis estados e os 3 e 10 min.
- [ ] Placar e curva ficam visíveis em até 3 s num Android barato no 4G.

## Comments

- 19/10/2026, do [ticket 12](12-coletor-minimo-e-replay.md): o coletor publica `rodada.json` e `lugares/<id>.json`. O contrato está no comentário de resolução do 12.
  - `totalizacao` é a hora do TSE, em Brasília (`AAAA-MM-DD HH:MM:SS`). `rodada` e `novidade.vista` são ISO, no relógio do coletor: é `rodada` que se compara com o `Date` da resposta.
  - Os votos e os percentuais de cada lugar vão na ordem de `candidatos` do `rodada.json`: alfabética pelo nome de urna, com `sequencial` para a foto oficial.
  - A curva real é `[% de seções, % de cada candidato]`, com um ponto novo só quando algum número muda.
  - A pasta local do desenvolvimento sai de dois terminais: `npm run tse-falso -- --partida 16:58` e `npm run coletor -- --tse http://127.0.0.1:8022/oficial`. Sem `--pasta`, ela fica em `.cache/coletor/publicado`.

**19/10/2026, resolvido:**

- **Ilha** (`packages/site/src/components/BlocoAoVivo.tsx`, com `client:load` em `layouts/PaginaDeLugar.astro`): abre o conteúdo principal de toda página de lugar.
  - No build, ela sai desenhada no estado de antes das 17h, sem JavaScript.
  - No navegador, lê `<base>rodada.json` e `<base>lugares/<id>.json` a cada 30 s, contados do começo da leitura anterior e sem duas leituras ao mesmo tempo. Lê de novo na hora quando a aba volta a aparecer ou a internet volta.
  - **Endereço**:
    - no build, vem de `PUBLIC_AO_VIVO`, com a barra no fim; sem ele, a ilha não lê nada, que é o caso da etapa "Antes da noite";
    - no `astro dev`, a integração `src/integracoes/ao-vivo-local.mjs` serve em `/ao-vivo/` a pasta do coletor (`.cache/coletor/publicado`, ou `APURADOR_PUBLICADO`), com ETag, 304 e `Date`.
  - **Preact**: entra pelo `@astrojs/preact` 6.0.6, com o `preact` 10.29.8. É a linha 10; a 11 saiu em 30/09. O JavaScript da página soma ~16 KB com gzip.
- **Leitor ao vivo** (`lib/leitor-ao-vivo.ts`): `criarLeitorAoVivo({ base, lugar, buscar, relogio })`, com `ler()` e `quadro()`, decide o que mostrar.
  - **Pedidos**: vão com `If-None-Match` posto à mão e `cache: "no-store"`. Um 304, um erro ou um arquivo de lugar que falta mantêm os dados.
  - **Fase**: vem só do arquivo de rodada.
  - **Indicador**:
    - encerrada vence tudo, inclusive a falta de conexão;
    - sem resposta nenhuma do arquivo de rodada, é "sem conexão". Uma resposta de erro da CDN não é falta de conexão, e o `Date` dela conta;
    - com `Date` − rodada ≥ 3 min, é "interrompido", com o link do app do TSE a partir de 10 min. Vale na fase ao vivo e, se o coletor cair antes de passar a ela, depois das 17h do dia da eleição. Antes das 17h, a rodada velha de 24/10 não é interrupção;
    - com `Date` − `novidade.vista` ≥ 2 min, na fase ao vivo, é "TSE sem novidade desde HH:MM", com a hora da última totalização do Brasil. **Os 2 min são uma escolha deste ticket**: nenhuma decisão fixa o número. A nota está no [ticket 32](32-ensaios-gerais.md).
  - **Contagem regressiva**: a da última hora parte do `Date` da última resposta. O relógio do aparelho só soma o tempo desde ela.
  - **`mudaram`**: os números do placar que a última leitura mudou (as chaves de `NUMEROS_DO_PLACAR`). A primeira leitura não muda nada.
- **Vista** (`components/VistaDoBlocoAoVivo.tsx`, sem estado): desenha a manchete, a linha fixa (`LinhaFixa`), o placar (`PlacarOficial`), o indicador (`IndicadorAoVivo`) e a curva (`CurvaReal`).
  - **Manchete** (`manchete` em `lib/textos-ao-vivo.ts`): o líder sai dos votos, e a diferença dos % do TSE em centésimos. Escolhas deste ticket, fora da tabela da decisão 9:
    - no lugar sem seções: "no Brasil", "neste estado", "no Exterior", "neste município" e "nesta cidade" (cidade do exterior);
    - no empate em votos: "Flávio e Lula empatam com N votos cada, com …";
    - depois das 17h, sem o arquivo do lugar, não há manchete, e o placar diz "Aguardando os primeiros dados do TSE".
  - **Nomes**: o nome curto ("Flávio", "Lula" e, no TSE falso, "Bolsonaro") é `nomeCurto`, em `lib/identidade.ts`, pelo nome de urna. O placar mostra o nome de urna como o TSE o escreve.
  - **Indicador**:
    - o detalhe é um `<details>` e a cor é `--grafite`, clara no tema escuro;
    - o anel é um SVG que a ilha avança a cada segundo;
    - com movimento reduzido, não há pulso, pisca nem rodinha, e o anel vira "próxima leitura em N s";
    - o link vai para `https://resultados.tse.jus.br/oficial/app/index.html`;
    - no celular, ao vivo, a linha fixa leva só o ponto e o anel; os avisos aparecem inteiros nela.
  - **Curva**: a meia altura é a maior distância de 50% depois de 3% das seções, mais 1 ponto, em passos de 2, com mínimo de 4. O que passa é recortado, e o cartão leva "Cálculo do Apurador com dados do TSE".
- **Fotos oficiais**, por decisão do dono em 19/10: copiadas para o site, e não lidas do TSE pelo visitante.
  - `npm run fotos` (`packages/pipeline/src/gerar-fotos.ts`) grava `dados/fotos/<sequencial>.jpeg` byte a byte, com o manifesto de origem:
    - as de 2026 vêm da divulgação da eleição 6258 (`urlsDaDivulgacao(…).foto`);
    - as das noites do TSE falso vêm do zip de fotos do portal, porque a divulgação de 2022 dá 404.
  - O site as serve com nome de cache (`lib/fotos.ts`). Sem a foto de um sequencial, aparecem as iniciais.
- **Testes**:
  - leitor ao vivo, com um endereço ao vivo de mentira e o relógio injetado: `test/leitor-ao-vivo.test.ts`, 13;
  - vista renderizada em HTML: `test/vista-ao-vivo.test.tsx`, 24;
  - build: `test/bloco-ao-vivo.test.ts`, 5;
  - fotos: 2, em `packages/pipeline/test/dados.test.ts`.

  `npm test` passa: 57 arquivos, 545 testes.
- **Verificação ao vivo** (19/10), com o TSE falso, o coletor e o `astro dev`:
  - a página passou sozinha de antes das 17h ao ao vivo;
  - às 18:46 de 2022, deu "Lula à frente por 69.089 votos, com 69,87% das seções totalizadas";
  - com o coletor parado, deu "Atualizado às 21:47, atualização interrompida" depois de 3 min, com os últimos dados à vista;
  - a linha fixa apareceu abaixo do topo ao rolar;
  - não houve rolagem lateral a 375 px.
- **Não feito**: "visíveis em até 3 s num Android barato no 4G" não foi medido num aparelho; fica para o ensaio ([ticket 32](32-ensaios-gerais.md)).
- **Revisão** (Standards e Spec): as correções estão no commit "Corrige o que a revisão do bloco ao vivo achou".
  - **Deixados como estão, por julgamento**:
    - o nome "estado" do indicador, que é o da decisão 14;
    - os parâmetros que viajam juntos da ilha ao indicador;
    - os textos e os comportamentos pequenos fora da tabela, listados acima.
  - **Para o glossário** (`/domain-modeling`): "indicador ao vivo", "linha fixa", "placar oficial" e a "leitura" da página, que não é a rodada do coletor.
- As notas para os tickets 09, 15, 16, 17, 20, 25, 32 e 33 estão nos comentários deles.
