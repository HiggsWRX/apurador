import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { cacheDoTse } from "../src/fontes.ts";

// O cache dos arquivos do TSE fica no checkout principal, e os worktrees de cada ticket o dividem: as noites leem
// gigabytes do TSE, e um worktree novo não os baixa de novo. A raiz é montada numa pasta temporária.

const pasta = (caminho: string) => pathToFileURL(caminho.endsWith("/") ? caminho : `${caminho}/`);

describe("o cache dos arquivos do TSE", () => {
  const raiz = mkdtempSync(join(tmpdir(), "apurador-"));

  it("fica em .cache/tse/ na raiz do checkout principal", () => {
    const principal = join(raiz, "principal");
    mkdirSync(join(principal, ".git"), { recursive: true });

    expect(cacheDoTse(pasta(principal)).href).toBe(pasta(join(principal, ".cache", "tse")).href);
  });

  it("num worktree, é o do checkout principal, para onde aponta o arquivo .git do worktree", () => {
    const worktree = join(raiz, "apurador-wt", "28");
    mkdirSync(worktree, { recursive: true });
    writeFileSync(join(worktree, ".git"), `gitdir: ${join(raiz, "principal", ".git", "worktrees", "28").replaceAll("\\", "/")}\n`);

    expect(cacheDoTse(pasta(worktree)).href).toBe(pasta(join(raiz, "principal", ".cache", "tse")).href);
  });
});
