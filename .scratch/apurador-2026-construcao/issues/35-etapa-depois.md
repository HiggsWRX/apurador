# 35: Etapa "Depois": como a projeção se saiu e 2º turno de 2026 no histórico

Status: ready-for-human
Blocked by: 02, 22
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

A partir da manhã de 26/10, o site vira registro da noite:

- a página de lugar ganha "Como a projeção se saiu", calculado com o mesmo código sobre os objetos da noite guardados no R2;
- o 2º turno de 2026 entra no histórico a partir do último estado da noite, com aviso de provisório. Quando o TSE publicar os arquivos oficiais, por volta de 27/10, o pipeline passa a usá-los, e o aviso sai.

O ticket inclui também a preparação para abrir o repositório. O dono confirma cada passo que apaga recursos ou torna algo público.

Decisões: [Plano de lançamento em fases](../../apurador-2026/issues/19-plano-de-lancamento-em-fases.md) (decisões 7 e 8), [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisão 13 e comentários) e [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md) (decisão 21).

## Critérios de aceite

- [x] **Depois da noite, na página de lugar**: ficam o placar final do TSE, a curva real completa e a narração como registro.
- [x] **"Como a projeção se saiu"**: mostra o erro das duas bases ao longo da noite, com a frase "com 5% das seções, a projeção errava X". É calculado pelo executor de noites sobre os objetos da noite. Sem os objetos da noite, sai do registro das rodadas, só no Brasil (registro de 26/10).
- [x] **2º turno de 2026 no histórico**: entra a partir do último estado da noite, com o aviso "provisório, até os arquivos oficiais do TSE".
- [ ] **Arquivos oficiais**: quando eles saem, o pipeline passa o 2º turno de 2026 a eles, a conferência de totais roda de novo, e o aviso sai. Pronto no código; falta o TSE publicá-los e o `npm run dados -- --atualizar`.
- [ ] **Preparação do repositório público**, com o de acordo do dono:
  - [x] uma varredura procura segredos e endereços de ensaio em todo o histórico do Git (endereço do ensaio, tópico do ntfy, nomes da sentinela);
  - [ ] o Worker e o bucket do ensaio são apagados;
  - [ ] a chave de escrita do R2 é revogada.
- [ ] Depois disso, o site só muda por deploy.

## Comments

- 20/10/2026, do [ticket 33](33-curva-de-comparacao.md): os turnos passados da curva de comparação são os arquivos de `dados/curvas/`, que o `npm run noites` gera de cada noite reconstruída da lista `NOITES` (`packages/pipeline/src/gerar-noites.ts`). O site os lê todos (`lib/curvas-passadas.ts`).
  - Se o 2º turno de 2026 for reconstruído e entrar nessa lista, o botão "2026 2T" aparece sozinho em toda página de lugar.
  - Decida se ele entra: depois da noite, a curva real da própria página já é esse turno.
- 21/10/2026, do [ticket 34](34-comparacao-de-dois-turnos.md), que deixou a nota só no próprio registro: com o `dados/turnos/2026-2.json`, a comparação de dois turnos passa a 15 pares, e a de partida vira 2026 1T e 2026 2T sem mudar o código. O aviso de provisório precisa aparecer também nela enquanto o turno vier do último estado da noite.

- 22/10/2026, do [ticket 29](29-metodologia-acerto-e-calibracao.md): a seção 6 da metodologia já mede uma noite passada como o "Como a projeção se saiu" vai medir a de 25/10. Em `packages/site/src/lib/metodologia.ts`, `errosDaNoite` dá o erro em módulo do placar parcial e das duas bases no momento mais perto de 5%, 25% e 50% das seções, e a página escreve "menos de 0,1 ponto" quando a uma casa dá 0,0. Em `lib/graficos-da-metodologia.ts`, `graficoDaNoite` desenha o placar parcial, a projeção da base Apuração + pesquisas com a faixa de 95% e o resultado, a partir de uma `NoiteReproduzida` (os momentos no 1º finalista); para a outra base, é dar a ela o seletor da base. As noites de lá vêm do CSV momento a momento do executor (`docs/calibracao/noite-*.csv`); os objetos da noite de 25/10 precisam virar o mesmo formato.

- 22/10/2026, do [ticket 30](30-ambiente-de-ensaio-e-conferencias.md): o ambiente do ensaio tem três Workers, não dois: o site `apurador-ensaio` (`packages/site/ensaio/wrangler.jsonc`), o plano B `apurador-ensaio-plano-b` e a sentinela `apurador-sentinela-ensaio`, além do bucket `apurador-ensaio` e do domínio `ao-vivo-ensaio.apurador.org`. Os comandos para apagar estão no fim de "O ambiente do ensaio geral" (`packages/coletor/cloudflare/README.md`). Os endereços do ensaio ficam no código (`AMBIENTES.ensaio`, `packages/site/ensaio/`, `cors-ao-vivo-ensaio.json`, `sentinela.jsonc`), então a varredura do histórico vai achá-los: depois de apagados, eles não levam a nada.
- 22/10/2026, do [ticket 22](22-retomada-e-objeto-da-noite.md):
  - **Os objetos da noite** ficam no bucket privado `apurador-noite`, sem domínio nem endereço público (decisão do dono em 22/10, registrada no ticket 22). A leitura vai pela API S3, assinada com a chave `R2_NOITE_*` do `packages/coletor/.env`, como em `objetosDaNoiteNoR2` (`packages/coletor/src/r2.ts`). Cada objeto, `noite/<hora em UTC, sem os dois-pontos>-r<rodada>.json.gz`, um por rodada, ~1.800 e ~1,7 GB na noite. Cada um é um `EstadoGuardado` (`packages/coletor/src/retomada.ts`) em JSON com gzip: o estado de retomada da rodada e os arquivos de resultado do TSE que chegaram nela, como texto, com a abrangência e a ETag. O primeiro objeto de cada coletor diz de onde ele partiu (`partida`).
  - **Rodar a projeção de novo**: `reproduzirAProjecao(objetos, entrada)` dá, para cada objeto em ordem, a `ProjecaoDaRodada` que o coletor publicou, com as retomadas. O replay com quedas confere que ela bate com os JSONs publicados (`packages/ensaio/test/retomada.test.ts`). "Como a projeção se saiu" e o CSV momento a momento do [ticket 29](29-metodologia-acerto-e-calibracao.md) saem dela. Ela supõe que a retomada do objeto da noite partiu do objeto anterior: com dois coletores na mesma noite (o computador principal de volta ao lado do notebook), o trecho deles não se reproduz. A leitura só tem o último objeto (`objetosDaNoiteNoR2(...).ultimo`): ler todos pede uma lista sem `start-after` e o GET de cada um.
  - **A chave**: o roteiro revoga a chave de escrita no dia seguinte. A do bucket da noite é também a de leitura: baixe os objetos antes, ou crie uma só de leitura.
  - **O último estado da noite**: o estado em disco, `.cache/coletor/estado-producao.json`, tem todos os arquivos do TSE da última rodada, e não só os que chegaram nela.
- 23/10/2026, do [ticket 23](23-protecoes-e-fim-da-noite.md): enquanto a conexão é o celular, o coletor não grava objeto da noite (Volume de gravações na noite, decisão 8). Os arquivos do TSE dessas rodadas vão no primeiro objeto com o cabo, ou no último da noite, que é gravado mesmo pelo celular. Nos objetos, essas rodadas faltam, e o objeto seguinte traz os arquivos de várias rodadas como se tivessem chegado nele: `reproduzirAProjecao` dá a projeção certa dele em diante, mas não a das rodadas que faltam. O estado em disco tem todos os arquivos do fim da noite.
- 26/10/2026, registro do ticket 35 (branch `ticket/35-etapa-depois`). O código está pronto; o que falta é do dono, ou espera os arquivos oficiais do TSE (por isso `ready-for-human`):
  - **De onde sai "Como a projeção se saiu"**: o bucket `apurador-noite` ficou vazio, sem os objetos da noite, e não há o que o executor de noites rodar de novo. A fonte é o registro das rodadas (`.cache/coletor/rodadas-2026-10-25T18-04-27-457Z.jsonl`, no checkout principal). Ele tem, por rodada, o placar do Brasil no arquivo do TSE e a projeção publicada nas duas bases, com uma casa. Só o Brasil, como o [registro da noite](../../../docs/noite/2026-10-25.md) combinou.
    - `npm run noite-publicada -- <registro .jsonl>` grava `docs/noite/2026-10-25.csv`. O caminho vai absoluto, porque o script roda em `packages/ensaio`. O formato é o do CSV momento a momento da calibração (`csvMomentoAMomento`): um momento a cada Brasil publicado diferente, desde a fase ao vivo, 321 de 1.593 rodadas.
    - A página do Brasil lê o CSV com o `lerNoiteReproduzida` da metodologia e mede com o mesmo `errosDaNoite`. O momento é o primeiro publicado mais perto de 5%, 25% e 50% das seções (4,80%, 25,19% e 50,76%), o mesmo da tabela do registro da noite.
    - Os números, em pontos:
      - com 5%, o placar parcial erra 0,6, a Só apuração 0,2 e a Apuração + pesquisas 0,1;
      - com 25%, 2,3, 0,7 e 0,8;
      - com 50%, 1,6, 0,3 e 0,3.
      - A projeção saía com uma casa, e o erro leva esse arredondamento.
    - O bloco abre os de baixo do bloco ao vivo, com a frase, a tabela e um gráfico por base, com a da noite aberta. O `NoitesReproduzidas` virou `GraficosDaNoite`, com o seletor de base que o ticket 29 sugeriu. O bloco some com a chave da projeção desligada e no build do ensaio; sem a da base com pesquisas, fica só a Só apuração.
  - **O 2º turno de 2026 no histórico**: `dados/turnos/2026-2.json`, com `"provisorio": true`, sai do estado em disco da produção (`.cache/coletor/estado-producao.json`, rodada 1.593), com o arquivo ao vivo de cada um dos 5.786 lugares.
    - O `npm run dados` o gera assim enquanto o zip do TSE de 2026 não tem o 2º turno. Num checkout sem o estado em disco (um clone), ele fica como está no repositório.
    - O `lerResultado` lê agora o nome completo (`nm`) e as abstenções (`a`). Sobre os arquivos finais do 1º turno, esse caminho dá os totais oficiais em cada lugar, menos as seções. O arquivo ao vivo conta 499.248 seções, e o oficial, 517.179, porque conta as agregadas à parte.
    - O site o mostra com "Provisório, até os arquivos oficiais do TSE." no turno e em todo par da comparação que o tem. A comparação de partida virou 2026 1T e 2026 2T, entre 15 pares.
    - **A curva de comparação de 2026 2T não entra** (a nota do ticket 33): na página, a curva real já é esse turno, e não há noite seção a seção para reconstruir.
  - **Quando o TSE publicar os arquivos oficiais**: o `npm run conferir` passa a falhar no 2026 2T, com "os arquivos oficiais do TSE já têm o turno. Gere de novo com `npm run dados -- --atualizar`".
    - No CI, ele roda a cada push e às 03:05 UTC, então a falha é o aviso, e o deploy pelo CI para até a regeneração. Uma mudança urgente vai pelo "Deploy pelo computador".
    - A falha lista o que não bate entre o último estado e os oficiais, menos as seções.
    - Rode o `npm run dados -- --atualizar` e confira a diferença: os votos do Brasil não devem mudar, as seções sim. Faça o commit: o aviso sai sozinho, e nenhum teste muda, porque o do aviso segue o `provisorio` do arquivo.
  - **O plano B**: na fase encerrada, a rodada parada já não leva a página a ler o plano B (achado 4 do registro da noite). Vale a partir do próximo deploy.
  - **A varredura** (`npm run varredura`): lê cada arquivo de todas as refs, os `.gz` também descomprimidos, e as mensagens de commit. Rodou em 26/10, sobre os 237 commits deste branch e dos outros, sem nenhum achado de segredo:
    - nenhum dos 3 valores do `.env` do coletor (as chaves `R2_PRODUCAO_*` e o `NTFY_TOPICO`; o `CLOUDFLARE_API_TOKEN` e as chaves do ensaio estão vazios lá);
    - nenhum `.env`, nenhum valor longo numa variável de segredo e nenhuma chave privada.
    - Achou, como esperado, os nomes do ensaio e das sentinelas e quatro endereços em `hicampos93.workers.dev`: `apurador`, `apurador-plano-b`, `apurador-ensaio` e `apurador-ensaio-plano-b`.
    - **Para o dono decidir**: com o repositório aberto, ficam públicos o `*.workers.dev` da produção e o do plano B, que a decisão 6 do [Plano de lançamento](../../apurador-2026/issues/19-plano-de-lancamento-em-fases.md) dizia "nunca divulgado". Depois da noite, o plano B não serve mais.
    - Ela só vê o que está commitado: rode de novo depois do merge, antes de abrir.
  - **Do dono, com o de acordo dele, nada feito aqui** (passos em `packages/coletor/cloudflare/README.md`, "O ambiente do ensaio geral" e "Os alertas e a sentinela"):
    - apagar os Workers do ensaio (`npx wrangler delete --name apurador-ensaio` e `--name apurador-ensaio-plano-b`), a sentinela do ensaio e a da noite (`apurador-sentinela`), o domínio `ao-vivo-ensaio.apurador.org` e os buckets `apurador-ensaio` e `apurador-ensaio-noite`;
    - revogar a chave de escrita do R2 (`apurador-ao-vivo`) no painel;
    - o merge deste branch, o push e a abertura do repositório.
    - Depois disso, nada escreve no R2, e o site muda só por deploy. Os JSONs ao vivo ficam como estão, e a página segue com o placar final, a curva real e a narração. Em 26/10, o `apurador.org` mostrava a fase encerrada, Flávio 48,21% e Lula 51,79% com 100% das seções, a curva real e a narração até a totalização final.
  - **Ficou para depois**: os eventos de fim das cidades do Exterior seguem com a hora local na narração guardada ([ticket 37](37-hora-do-exterior-na-narracao.md)). "Último estado da noite", "turno provisório" e "noite publicada" ainda não estão no `GLOSSARY.md`.
  - **Revisão** (`/code-review` contra a `main`):
    - **Na spec**:
      - o `npm run dados` falhava num clone sem o estado em disco (agora fica com o turno do repositório);
      - os testes do provisório tinham de mudar com os oficiais (agora seguem o `provisorio`);
      - as bases vinham em ordens diferentes no bloco (agora na do controle, com a da noite aberta);
      - a conferência listaria as seções, que nunca batem;
      - a varredura não descomprimia os `.gz`.
    - **Nos padrões**:
      - os nomes: `linhasDe`, `paraBytes`, `DO_ENSAIO_E_DAS_SENTINELAS`, `data-grafico` e `assunto`;
      - o `ArquivosOficiais` também em `conferirTotais`, o dia da noite no `TURNOS` do `gerar.ts` e a base obrigatória no `graficoDaNoite`;
      - o `erroDe` pelo `BASE_NOS_ARQUIVOS`.
      - O `NoiteReproduzida` ficou com o nome, com o doc dizendo que serve também à noite publicada.
  - **Checagem inteira**: no computador, 122 arquivos e 1.193 testes, mais typecheck, lint e prettier, antes e depois das correções da revisão. O `npm run conferir`, contra os arquivos do TSE de 26/10, passou com o 2026 2T provisório.
