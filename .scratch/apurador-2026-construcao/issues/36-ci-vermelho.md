# 36: CI vermelho na main

Status: resolved
Blocked by: —
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O CI da `main` no GitHub (`.github/workflows/ci.yml`) está vermelho desde 22/10, e o job `deploy` pula. Sem ele, nada vai ao ar pelos caminhos do roteiro (`docs/roteiro-da-noite.md`):

- o push da `main` aprovada no ensaio 2, até as 18h de 24/10;
- o passo das 19h40, com os endereços ao vivo;
- as pesquisas até as 23h;
- o CI rodado à mão às 23h01;
- as retiradas de pesquisa de 25/10.

O roteiro tem o "Deploy pelo computador" como saída, mas ele pula os testes. Achado na revisão do [ticket 31](31-roteiro-da-noite.md). O dono o deixou para depois.

## O que se sabe

- **Job `replay`**: ficou sem memória nas duas execuções da `4f51901` (o push de 22/10 18:49 UTC e o agendado de 23/10 08:22 UTC), com "JavaScript heap out of memory" e SIGABRT em `packages/ensaio/test/replay.test.ts`. A `main` local já quebrou esse arquivo em `replay-*.test.ts` (`fbef13b`), que rodam em paralelo. O CI ainda não rodou essa versão, que pode gastar mais ou menos memória num runner de 2 núcleos.
- **Job `testes`**, em 23/10: o `npm run conferir` deu `Z_DATA_ERROR` "invalid stored block lengths", provavelmente num arquivo do TSE baixado pela metade. Em 22/10, esse passo passou.
- `gh run list --workflow ci.yml` e `gh run view <id> --log-failed` mostram os dois.
- O `origin/main` está em `4f51901`. A `main` local está à frente, sem push, com os tickets 22, 23, 25, 26, 30 e 31. O `apurador.org` está no deploy de 22/10, 15:44 UTC (o CI da `9f3444b`, ticket 18).
- O agendado do CI (cron das 03:05 UTC) rodou ~5 h atrasado de 20 a 23/10. O roteiro já não depende dele.

## Critérios de aceite

- [x] Os jobs `testes` e `replay` passam no GitHub sobre o código da `main` local, sem enfraquecer nenhum teste. A prova é um branch: um PR roda os testes sem deploy.
- [x] Nenhum push na `main` sem o de acordo do dono.
- [x] O tempo total do CI fica registrado. O roteiro diz "de 4,5 a 13 min" para a retirada de pesquisa, cuja meta é de 10 min.

## Comments

- 26/10/2026, registro do ticket 36 (branch `ticket/36-ci-vermelho`, [HiggsWRX/apurador#1](https://github.com/HiggsWRX/apurador/pull/1), juntado em `ad641fa`):
  - **O `replay`**: o runner (2 núcleos, 7 GB) dá ~2 GB de heap ao Node. Com `NODE_OPTIONS=--max-old-space-size=2048`, o estouro se reproduzia no computador, em `packages/ensaio/test/retomada.test.ts`. O arquivo rodava três noites com quedas num processo só, e a reprodutibilidade lia todos os objetos da noite num array.
    - **O que mudou**: a parada longa e a queda no plano zero foram para `retomada-da-parada-longa.test.ts` e `retomada-no-plano-zero.test.ts`. Os auxiliares comuns foram para `noite-com-quedas.ts` (`LUGARES_DO_TSE`, `ARQUIVOS_AO_VIVO`, `soDoLugar`, `conferirNarracao`). A reprodutibilidade agora lê um objeto de cada vez, pelo gerador do `reproduzirAProjecao`.
    - **Quanto ficou**: pelo `--logHeapUsage` (o heap no fim de cada teste, não o pico), o `retomada` caiu de ~3,6 para ~2,6 GB. O `replay-da-noite-inteira` fica em ~2,3 GB e passa com 2 GB; os outros arquivos, até 1,5 GB. O `retomada` ainda estoura com 2 GB, então o job `replay` ganhou `NODE_OPTIONS: --max-old-space-size=3072`. O vitest usa um núcleo a menos que o runner: um arquivo por vez.
  - **O `conferir`**: em 23/10, ele caiu com `Z_DATA_ERROR`, num membro que não descomprimia. O TSE regera os zips em horas variáveis (o de votação de 2022 em 24/10 às 06:52 e 07:24 UTC, pelo `Last-Modified`), e o CI agendado roda de manhã. A causa provável é o zip ter mudado entre os pedidos por Range, mas isso não ficou provado.
    - **O que mudou**: `lerMembroRemoto` (`packages/tse/src/zip-remoto.ts`) manda `If-Range` com a ETag da cauda. Um 200 a esse pedido ("o zip mudou") ou um membro que chega corrompido refaz a leitura do começo, até 3 vezes.
    - **No CDN do TSE**, conferido pela revisão com pedidos só de leitura: ETag forte, 206 ao `If-Range` igual e 200 ao diferente.
    - **Os testes**: o zip que muda com ETag, o que muda sem ETag (o caso de 23/10), o que muda a cada pedido (desiste na 3ª leitura) e o membro corrompido de verdade ("chegou corrompido").
  - **Também entrou**:
    - o teste do build das cores, que ainda esperava o laranja de Flávio (quebrado pela troca de 25/10, porque só os testes do site sem build tinham rodado);
    - o comentário do `global.css`;
    - o `npm run replay`, que apontava para um `replay.test.ts` que não existe mais e agora roda os `replay-*` do ensaio.
  - **Tempos do CI**:
    - **No PR**, em 26/10: `testes` 3 min 32 s e `replay` 13 min 35 s, em paralelo, com total de 13 min 38 s.
    - **Na `main`** (`ad641fa`, o merge): `testes` 3 min 43 s, `replay` 10 min 54 s e `deploy` 1 min 22 s, com total de 12 min 20 s do push ao site. O deploy saiu às 14:15:26 UTC, com os endereços ao vivo: o `apurador.org` lê o `rodada.json` do R2 e mostra a página encerrada, a cor nova de Flávio e nenhum preditivo.
    - Com o deploy, uma mudança de pesquisa leva mais que os 13 min do roteiro. A meta de 10 min para a retirada de pesquisa não fecha pelo CI: daqui em diante, a retirada urgente vai pelo "Deploy pelo computador".
  - **Revisão** (`/code-review` contra a `main`):
    - **Na spec**: a causa escrita não conferia (o `conferir` lê os zips de votação, e o erro foi às 08:24 UTC); faltavam o caminho sem ETag e a contagem das leituras; um membro corrompido de verdade saía como "o zip mudou"; o comentário do CI falava em dois workers.
    - **Nos padrões**: o doc e o nome de `eventosDoLugar` (agora `soDoLugar`, porque o site já exporta um `eventosDoLugar`); a mensagem repetida no `ZipMudou` (agora `LeituraInvalida(url, motivo)`); o fecho `faixa(range)` no lugar de `buscar, url, etag` repetidos; o contador `i` da reprodutibilidade, trocado pelo `numero` do gerador; e o motivo da memória repetido em cinco lugares.
  - **Checagem inteira**: no computador, com 3 GB de heap, 120 arquivos e 1.163 testes, mais typecheck, lint e prettier. No GitHub, o PR passou nos dois jobs.
