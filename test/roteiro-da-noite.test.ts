import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// O roteiro da noite (`docs/roteiro-da-noite.md`) manda o dono rodar scripts, testes e arquivos do repositório com o
// computador em apuros: um script renomeado ou um arquivo movido só apareceriam na hora. Os comandos da noite e as
// palavras de confirmação são conferidos no coletor (`packages/coletor/test/roteiro-da-noite.test.ts`).
const RAIZ = new URL("../", import.meta.url);
const roteiro = readFileSync(new URL("docs/roteiro-da-noite.md", RAIZ), "utf8");
const { scripts } = JSON.parse(readFileSync(new URL("package.json", RAIZ), "utf8")) as { scripts: Record<string, string> };

describe("o roteiro da noite", () => {
  it("só usa scripts que existem na raiz", () => {
    const usados = new Set([...roteiro.matchAll(/npm run ([a-z0-9-]+)/g)].map(([, nome]) => nome!));

    expect(usados.size).toBeGreaterThan(8);
    expect([...usados].filter((nome) => !(nome in scripts))).toEqual([]);
  });

  it("só roda testes de projetos que existem", () => {
    const projetos = [...roteiro.matchAll(/--project (\S+)/g)].map(([, nome]) => nome!);

    expect(projetos.length).toBeGreaterThan(1);
    for (const projeto of projetos) expect(existsSync(new URL(`packages/${projeto.replace("@apurador/", "")}/package.json`, RAIZ)), projeto).toBe(true);
  });

  it("aponta só arquivos do repositório que existem", () => {
    // Os registros que o próprio roteiro manda criar, no ensaio 2 e no dia seguinte, e o `.env` do coletor, fora do Git.
    const aCriar = ["docs/ensaios/2026-10-24.md", "docs/noite/2026-10-25.md", "packages/coletor/.env"];
    const caminhos = [...roteiro.matchAll(/`((?:packages|dados|docs|\.github)[\\/][^`<*\s]+)`/g)].map(([, caminho]) => caminho!.replaceAll("\\", "/"));

    expect(caminhos.length).toBeGreaterThan(10);
    expect(caminhos.filter((caminho) => !aCriar.includes(caminho) && !existsSync(new URL(caminho, RAIZ)))).toEqual([]);
  });
});
