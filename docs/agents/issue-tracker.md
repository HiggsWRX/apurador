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
- Resolving a build ticket: what a later ticket needs to know (an interface, a file format, a gotcha, what was left for it) goes in that ticket's own `## Comments`, dated and linked back: `- 19/10/2026, do [ticket 12](12-coletor-minimo-e-replay.md): ...`. The resolved ticket keeps only its own record, so the next implementer finds the note by reading just the ticket in front of them.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed). For the Apurador build, the slug is `apurador-2026-construcao`.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body, a `Type:` line (`research`/`prototype`/`grilling`/`task`) and a `Map:` line linking back to `map.md`.
- **Status**: a `Status:` line, `open` → `claimed` → `resolved`; `closed` for a ticket ruled out of scope.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
