# Coding standards

Judgement calls the reviewer checks in every diff. Mechanical rules live in the checks instead (`npm run typecheck`, `npm run lint`, `npm test`).

## Vocabulary

- Identifiers, comments, test names and messages are in Brazilian Portuguese, in the terms of `GLOSSARY.md`.
- A word the glossary lists under _Avoid_ stays out of a name that stands for that entry's concept, and a word another entry owns stays out of names for anything else: the clock that never waits is `relogioSemEspera`, because "simulado" is the TSE's and "simulação" the simulator's. The same word in its everyday sense is fine: the vote counts in `Contagem` are not the _apuração_ the glossary keeps "contagem" away from. The lint stops "simulado" and "simulada" in names and strings; the other _Avoid_ words are the reviewer's.
- An exported name means one thing across the packages. A new type or function takes a name no other package already exports with another meaning (`Recorte` is the pipeline's slice of the night; the coletor's tracked file is `Acompanhado`). `test/modulos.test.ts` fails on a name two modules export; whether they mean the same thing, and so belong on its list of exceptions, is the reviewer's call.

## Shape of a module

- Each module opens with a comment saying what it does and why it is built that way: the rule from the TSE, the decision ticket, the measurement. `test/modulos.test.ts` only checks that a `//` comment comes after the imports.
- Exported types and functions carry a one-line doc comment that says what the thing is, beyond its name; the lint (`jsdoc/require-jsdoc`) only checks that one is there. Fields carry one when the unit, the time zone or the source is not obvious (`AAAA-MM-DD HH:MM:SS`, em Brasília; ms do relógio do coletor).
- Comment density follows the surrounding code: the reason behind a choice and the gotcha no type confesses, never a restatement of the line.

## The page

- Every element that shows a chance de vitória carries `data-chance-de-vitoria` (the bar in `ChanceDeVitoria` and the sino do), and before 17h it sits behind `antesDas17h.projecao`, never only behind `antesDas17h.agregado`. The build with only the projeção off (`test/build/chance-de-vitoria.test.ts`) finds a chance by that mark and nothing else.

## Tests

The spec's "Decisões de teste" (`.scratch/apurador-2026-construcao/spec.md`) is the rule: behaviour at the boundary, expected values from an outside reference (official results, the research notes, the real TSE samples in `packages/ensaio/test/amostras/tse`), injected clock and transport. In review, look for:

- an expected value computed by the code under test, or by the same reader on both sides, where a literal from a reference exists;
- a test that asserts on internal state where a published file or a module's public interface shows the same behaviour;
- a test that only passes by construction (a limit asserted against the same constant that enforces it, a length asserted against the loop that built the list);
- a fixture with the coletor's clock and the TSE's hour on the same instant: a comparison between the two clocks passes by accident. In the ensaio geral they are years apart (the coletor in 2026, the night of 2022), and so are the fixtures, with the TSE's hour on the 2022 night (ticket 15);
- a tolerance wide enough to pass a number the ticket states otherwise (1,54 against the ticket's "1,5"), or a comment explaining the gap away: the code or the ticket is wrong, and the owner decides which.
