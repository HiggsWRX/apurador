import { describe, expect, it } from "vitest";
import { formatarChance, formatarMudanca, formatarPontos } from "../src/lib/formato";

describe("formatarMudanca", () => {
  it("dá o sinal e uma casa, e nenhum sinal ao que arredonda para zero", () => {
    expect([1.94, -14.9, 0, 0.04, -0.03].map(formatarMudanca)).toEqual(["+1,9", "−14,9", "0,0", "0,0", "0,0"]);
  });
});

describe("formatarPontos", () => {
  it("dá uma casa e o plural a partir de 2, ou as casas publicadas, até duas", () => {
    expect([1.88, 2.14, 0.08].map((n) => formatarPontos(n))).toEqual(["1,9 ponto", "2,1 pontos", "0,1 ponto"]);
    expect([1.792, 2, 0.7].map((n) => formatarPontos(n, true))).toEqual(["1,79 ponto", "2 pontos", "0,7 ponto"]);
  });
});

describe("formatarChance", () => {
  // Telas da página de lugar, decisão 3: inteiros, "<1%" e ">99%". 100% só existe com a indicação do TSE, por outro caminho.
  it("dá inteiros, e nunca 0% nem 100%", () => {
    expect([0.734185, 0.5885, 0.5, 0.004, 0.0051, 0.996, 0.9949, 0, 1].map(formatarChance)).toEqual([
      "73%",
      "59%",
      "50%",
      "<1%",
      "1%",
      ">99%",
      "99%",
      "<1%",
      ">99%",
    ]);
  });
});
