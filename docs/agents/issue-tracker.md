# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`. The GitHub remote (`HiggsWRX/apurador`) holds code only: never create GitHub issues.

Issues, specs and comments are written in Brazilian Portuguese, using the terms in `GLOSSARY.md`.

## Current efforts

- `.scratch/apurador-2026/`: the wayfinder map (`map.md`) and its decision tickets (`issues/01`–`24`). Planning only: no build tickets go here.
- `.scratch/apurador-2026-construcao/`: the spec (`spec.md`) and build tickets (`issues/NN-<slug>.md`) for the Apurador site, made by `/to-spec` and `/to-tickets` from the map. The spec links back to the map.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## Working a build ticket

- **Next ticket**: the frontier is every `ready-for-agent` ticket whose `Blocked by` tickets are all `resolved`. Pick from it by the spec's `## Notas`: first a ticket that `Calendário` dates before the others (the calibração on 20 and 21/10), then the one highest in `Prioridade` (núcleo mínimo first), then the lowest number. Tickets run in parallel only when they change different modules: 15 and 20 both changed `publicar` in `coletor.ts`, and the merge was left to the owner.
- **Where**: `git worktree add ../apurador-wt/NN -b ticket/NN-<slug> main`, then `npm ci` inside it. That branch is the "current branch" a skill commits to; the owner reviews it and merges it into `main` (`Junta …`).
- **The loop** (what `/implement` does; only the owner can invoke that skill): `/tdd` at the seams the ticket names; `npm run typecheck` and the one test file as you go; the whole check; then `/code-review` against `main`, with this ticket as the spec. Three commits on the branch: `Monta …` (the build), `Corrige o que a revisão … achou`, and `Resolve … (ticket NN)` (see **Resolving**).
- **The whole check** (`npm run typecheck && npm run lint && npm test`) runs before `/code-review` and once more after its fixes. `npm test` already runs the replay (`@apurador/ensaio`) and the site builds, so don't run those two on their own just before it.
  - When it fails, fix and rerun only the project that failed (`npx vitest run --project <name>`).
  - The `Resolve …` commit only touches `.scratch/` and skips it.
  - It runs in the background (`run_in_background`), and its end and the reviewers' reports arrive as notifications. Meanwhile, write the ticket's record and the notes for the next tickets, and end the turn. A foreground `until` or `tail -f` holds the notifications until it returns: ticket 15 lost ~42 min that way, and 33, 7.5 min.
  - Alone it takes ~6.5 min: the four site builds come first (~3.3 min, and every test waits for them), then the slowest ensaio files (~3 min). With other ticket sessions checking at the same time, longer.
- **Replay tests**: the 2022 replays are `packages/ensaio/test/replay-*.test.ts`, one file per stretch of the night, so vitest runs them in parallel; `replay()` is in `packages/ensaio/test/replay.ts`. A test that replays a stretch none of them covers goes in a file of its own: in one file, they took ~6 min. The ensaio, modelo and pipeline projects have a 30 s test timeout, because with the replays running in parallel a test that walks the whole night passes the 5 s default.
- **TSE cache**: `npm run noites` and `npm run dados` read the TSE files from `.cache/tse/` in the main checkout, which every worktree shares (`cacheDoTse` in `packages/pipeline/src/fontes.ts`). A worktree needs no cache of its own.
- **Site tests**: the ones that read the build live in `packages/site/test/build/` and run three `astro build`s first (as it goes live, with every chave off, and with only the projeção before 17h off). Everything else in `packages/site/test/` runs without the build in ~4 s: `npx vitest run --project @apurador/site-unidade`, from the worktree root (inside a package, `--project` matches nothing). After changing only a build test, `APURADOR_SEM_BUILD=1 npx vitest run --project @apurador/site test/build/<file>` reads the `dist*/` already there; a `dist/` built by hand for these tests takes their clock, `APURADOR_AGORA=2026-10-19T12:00:00-03:00` (`AGORA` in `test/html.ts`).
- **The page live**: `npm run noite-local -- --partida 18:35` runs the TSE falso and the coletor together on the 2022 night (the Brasil turns over ~3 min later), publishing where `npm run dev -w @apurador/site` reads it. `npm run noite-local -- --parar` stops both, also from a shell that did not start them.
- **Chaves and avisos while it runs**: `npm run noite -- <comando>` (`ligar`/`desligar <chave>`, `aviso <1|2|3>`, `retirar-aviso`, `plano-b`) asks for the block's name and writes `.cache/coletor/controle.json`, which the coletor reads at the start of every rodada; the page follows within two rodadas. `npm run noite` alone prints the current state and the names. The vocabulary is `packages/coletor/src/chaves.ts`.
- **Measurement scripts**: a one-off script that measures something on the real data goes in `tmp/` at the worktree root, which Git ignores and where the `@apurador/*` packages resolve.
- **Resolving**: the last commit marks the criteria, sets `Status: resolved` and leaves the ticket's own record in its `## Comments`. What a later ticket needs to know (an interface, a file format, a gotcha, what was left for it) goes in that ticket's own `## Comments`, dated and linked back: `- 19/10/2026, do [ticket 12](12-coletor-minimo-e-replay.md): ...`. The resolved ticket keeps only its own record, so the next implementer finds the note by reading just the ticket in front of them. A number or a wording the ticket settles differently from a decision ticket or another ticket goes, dated, into the `## Comments` of every ticket that still quotes the old one: search `.scratch/` for it (ticket 24 built the +1,4 of the decision ticket while the methodology already said 2,1).
- **Numbers in a record**: round once, from the full value, to the places the record shows (1,1146 is 1,11, never 1,12 by way of 1,115). Later tickets take these numbers as test references.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed). For the Apurador build, the slug is `apurador-2026-construcao`.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly; "the next ticket" follows **Next ticket** above.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body, a `Type:` line (`research`/`prototype`/`grilling`/`task`) and a `Map:` line linking back to `map.md`.
- **Status**: a `Status:` line, `open` → `claimed` → `resolved`; `closed` for a ticket ruled out of scope.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
