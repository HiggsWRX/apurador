import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Duas regras do CODING_STANDARDS.md ("Shape of a module" e "Vocabulary") que são mecânicas e que a revisão do ticket 33
// ainda cobrou à mão: cada módulo abre com um comentário, e um nome exportado não se repete entre os módulos. Aqui só se
// confere que o comentário existe e que o nome é único; o que o comentário diz, e se dois nomes iguais são mesmo a mesma
// coisa, o revisor julga.
const RAIZ = fileURLToPath(new URL("../", import.meta.url));
const arquivos = (padrao: string) => globSync(padrao, { cwd: RAIZ }).map((caminho) => caminho.replaceAll("\\", "/"));
const ler = (arquivo: string) => readFileSync(`${RAIZ}/${arquivo}`, "utf8");

// O código depois dos imports, que podem ocupar várias linhas.
const depoisDosImports = (codigo: string) => codigo.replace(/^﻿?(?:\s*import\b[\s\S]*?["'];?[ \t]*\r?\n)*\s*/, "");

describe("os módulos dos pacotes", () => {
  it("abrem com um comentário de linha depois dos imports", () => {
    // O código e os auxiliares dos testes. Os `index.ts` só reexportam, e o doc de um exportado (`/** */`) não é o do módulo.
    const modulos = arquivos("packages/*/{src,test}/**/*.{ts,tsx}").filter((arquivo) => !/(\.test\.tsx?|\.d\.ts|\/src\/index\.ts)$/.test(arquivo));

    expect(modulos.length).toBeGreaterThan(50);
    expect(modulos.filter((arquivo) => !depoisDosImports(ler(arquivo)).startsWith("//"))).toEqual([]);
  });

  // O mesmo nome em dois módulos, cada um com o motivo.
  const REPETIDOS: Record<string, string> = {
    Buscar: "a mesma função de rede, com a forma do `fetch`, no tse e no coletor",
    BaseDoModelo: "a base que o pipeline grava e a parte dela que o modelo lê",
    ResultadoDoLugar: "dois sentidos (o resultado oficial no pipeline, a projeção no modelo): um deles muda de nome quando os tickets abertos entrarem",
  };

  it("exportam cada nome de um módulo só", () => {
    // As rotas do Astro exportam `GET` por contrato, então as páginas ficam de fora.
    const modulos = arquivos("packages/*/src/**/*.{ts,tsx}").filter((arquivo) => !arquivo.includes("/src/pages/"));
    const ondeEsta = new Map<string, string[]>();
    for (const arquivo of modulos) {
      for (const [, nome] of ler(arquivo).matchAll(/^export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|function\*?|type|interface|class|enum)\s+([A-Za-z_$][\w$]*)/gm)) {
        ondeEsta.set(nome!, [...(ondeEsta.get(nome!) ?? []), arquivo]);
      }
    }
    const repetidos = [...ondeEsta].filter(([, onde]) => onde.length > 1).map(([nome]) => nome);

    expect(repetidos.filter((nome) => !(nome in REPETIDOS))).toEqual([]);
    // Um motivo que não vale mais sai da lista.
    expect(Object.keys(REPETIDOS).filter((nome) => !repetidos.includes(nome))).toEqual([]);
  });
});
