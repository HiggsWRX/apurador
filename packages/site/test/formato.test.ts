import { describe, expect, it } from "vitest";
import { formatarChance, formatarMudanca } from "../src/lib/formato";

describe("formatarMudanca", () => {
  it("dá o sinal e uma casa, e nenhum sinal ao que arredonda para zero", () => {
    expect([1.94, -14.9, 0, 0.04, -0.03].map(formatarMudanca)).toEqual(["+1,9", "−14,9", "0,0", "0,0", "0,0"]);
  });
});

describe("formatarChance", () => {
  // Telas da página de lugar, decisão 3: inteiros, "<1%" e ">99%". 100% só existe com a indicação do TSE, por outro caminho.
  it("dá inteiros, e nunca 0% nem 100%", () => {
    expect([0.734185, 0.5885, 0.5, 0.004, 0.0051, 0.996, 0.9949, 0, 1].map(formatarChance)).toEqual(["73%", "59%", "50%", "<1%", "1%", ">99%", "99%", "<1%", ">99%"]);
  });
});
