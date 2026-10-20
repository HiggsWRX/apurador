import { describe, expect, it } from "vitest";
import { sino } from "../src/lib/sino";

// O sino da página de metodologia (Página de metodologia, decisão 5): a distribuição do resultado final, em que a área
// de cada lado de 50% é a chance de vitória de cada candidato. As referências são as do agregado de 18/10 (ticket 04):
// Flávio 51,09% com incerteza de 1,84 ponto dá chance de ~72%.
const LARGURA = 340;
const xs = (caminho: string) => [...caminho.matchAll(/[ML](-?\d+(?:\.\d+)?),/g)].map((m) => Number(m[1]));

describe("sino", () => {
  const agregadoDe18de10 = sino({ valor: 51.09, incerteza: 1.84, largura: LARGURA, altura: 180 });

  it("dá a chance do primeiro finalista como a área à direita de 50%", () => {
    expect(agregadoDe18de10.chance).toBeCloseTo(0.723, 3);
    expect(sino({ valor: 50, incerteza: 1.5, largura: LARGURA, altura: 180 }).chance).toBeCloseTo(0.5, 6);
  });

  it("separa as duas áreas exatamente em 50%", () => {
    const [primeiro, segundo] = agregadoDe18de10.areas;
    const { x50 } = agregadoDe18de10;
    expect(xs(primeiro).length).toBeGreaterThan(10);
    expect(xs(segundo).length).toBeGreaterThan(10);
    expect(Math.min(...xs(primeiro))).toBeGreaterThanOrEqual(x50 - 0.01);
    expect(Math.max(...xs(segundo))).toBeLessThanOrEqual(x50 + 0.01);
    expect(primeiro).toMatch(/^M.*Z$/);
    expect(segundo).toMatch(/^M.*Z$/);
  });

  it("cobre pelo menos de 48% a 52% e 3,4 desvios para cada lado, com marcas nas pontas e em 50%", () => {
    expect(agregadoDe18de10.dominio[0]).toBeCloseTo(51.09 - 3.4 * 1.84, 6);
    expect(agregadoDe18de10.dominio[1]).toBeCloseTo(51.09 + 3.4 * 1.84, 6);
    expect(agregadoDe18de10.marcas.map((m) => m.valor)).toEqual([45, 50, 57]);

    const estreito = sino({ valor: 50.2, incerteza: 0.3, largura: LARGURA, altura: 180 });
    expect(estreito.dominio).toEqual([48, 52]);
    expect(estreito.marcas.map((m) => m.valor)).toEqual([48, 50, 52]);
  });

  it("põe 50% no meio do desenho quando o agregado é 50%", () => {
    const meio = sino({ valor: 50, incerteza: 1.5, largura: LARGURA, altura: 180 });
    expect(meio.x50).toBeCloseTo(LARGURA / 2, 6);
    expect(meio.marcas[1]!.x).toBeCloseTo(meio.x50, 6);
  });
});
