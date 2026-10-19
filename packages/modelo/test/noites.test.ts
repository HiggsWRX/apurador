import { describe, expect, it } from "vitest";
import { executarNoite, prepararModelo } from "../src/index.ts";
import { base2022, constantes, noite2022 } from "./dados.ts";

// O executor de noites no 2º turno de 2022, com base no 1º turno de 2022 e as constantes provisórias. A
// referência é a tabela do Método de projeção só com a apuração (.scratch/apurador-2026/issues/09), que o
// protótipo mediu nas mesmas fotografias da noite. Lá a noite foi cortada seção a seção; aqui, na chegada (as
// seções de uma zona no mesmo segundo) que alcança cada ponto. Por isso, a mesma ordem de grandeza.

describe("o executor de noites no 2º turno de 2022", () => {
  const noite = executarNoite(prepararModelo(base2022), noite2022, constantes);

  it("termina no resultado oficial: Lula com 50,90% dos votos válidos", () => {
    expect(noite.final).toBeCloseTo(0.509, 4);
  });

  it("entrega a noite momento a momento, das fotografias de 0,1% das seções até o fim", () => {
    expect(noite.momentos).toHaveLength(106);
    expect(noite.momentos[0]!.secoes).toBeCloseTo(0.1, 2);
    expect(noite.momentos.at(-1)).toMatchObject({ secoes: 100, placar: noite.final, projecao: noite.final, erro: 0 });
    for (let i = 1; i < noite.momentos.length; i++) expect(noite.momentos[i]!.secoes).toBeGreaterThan(noite.momentos[i - 1]!.secoes);
  });

  it("erra ~0,11, ~0,37 e ~0,47 ponto com 5, 25 e 50% das seções", () => {
    expect(Math.abs(noite.erroCom5! - 0.11)).toBeLessThan(0.05);
    expect(Math.abs(noite.erroCom25! - 0.37)).toBeLessThan(0.05);
    expect(Math.abs(noite.erroCom50! - 0.47)).toBeLessThan(0.05);
  });

  it("tem o resultado final dentro da margem de 95% em ~98% dos momentos", () => {
    expect(noite.cobertura).toBeGreaterThanOrEqual(0.96);
    expect(noite.cobertura).toBeLessThanOrEqual(1);
  });

  it("tem a chance honesta: acerta o vencedor desde o começo, dá 95% a ele desde ~68% das seções e Brier de ~0,03", () => {
    expect(noite.acertaDesde).toBeLessThan(1);
    expect(Math.abs(noite.chance95Desde! - 68)).toBeLessThan(3);
    expect(Math.abs(noite.brier - 0.032)).toBeLessThan(0.01);
  });
});
