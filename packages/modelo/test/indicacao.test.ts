import { describe, expect, it } from "vitest";
import { indicacaoDasPesquisas, placarEntreFinalistas } from "../src/index.ts";

describe("placar entre finalistas", () => {
  it("é o % do primeiro finalista sobre a soma dos dois: no Brasil, em 2026, 51,0 × 49,0, não 47,03 × 45,16", () => {
    // Votos válidos de Flávio e de Lula no 1º turno de 2026, no Brasil (TSE).
    expect(placarEntreFinalistas(56_104_503, 53_879_538)).toBeCloseTo(51.01, 2);
  });

  it("não existe num lugar sem voto para nenhum dos dois", () => {
    expect(placarEntreFinalistas(0, 0)).toBeUndefined();
  });
});

describe("indicação das pesquisas", () => {
  it("é o placar entre finalistas do lugar no 1º turno somado à mudança do agregado sobre o do Brasil", () => {
    expect(indicacaoDasPesquisas({ placarEntreFinalistasDoLugar: 30, placarEntreFinalistasDoBrasil: 51.01, agregado: 51.09 })).toBeCloseTo(30.08, 10);
    expect(indicacaoDasPesquisas({ placarEntreFinalistasDoLugar: 62.5, placarEntreFinalistasDoBrasil: 51.01, agregado: 49.51 })).toBeCloseTo(61, 10);
  });

  it("fica entre 0% e 100%", () => {
    expect(indicacaoDasPesquisas({ placarEntreFinalistasDoLugar: 99.8, placarEntreFinalistasDoBrasil: 51.01, agregado: 52.01 })).toBe(100);
    expect(indicacaoDasPesquisas({ placarEntreFinalistasDoLugar: 0.4, placarEntreFinalistasDoBrasil: 51.01, agregado: 50.01 })).toBe(0);
  });
});
