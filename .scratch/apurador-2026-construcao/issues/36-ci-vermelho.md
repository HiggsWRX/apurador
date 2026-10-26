# 36: CI vermelho na main

Status: ready-for-agent
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

- [ ] Os jobs `testes` e `replay` passam no GitHub sobre o código da `main` local, sem enfraquecer nenhum teste. A prova é um branch: um PR roda os testes sem deploy.
- [ ] Nenhum push na `main` sem o de acordo do dono.
- [ ] O tempo total do CI fica registrado. O roteiro diz "de 4,5 a 13 min" para a retirada de pesquisa, cuja meta é de 10 min.

## Comments
