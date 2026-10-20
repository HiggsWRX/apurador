import { describe, expect, it } from "vitest";
import { formatarChance, formatarMudanca } from "../src/lib/formato";

describe("formatarMudanca", () => {
  it("dá o sinal e uma casa, e nenhum sinal ao que arredonda para zero", () => {
    expect([1.94, -14.9, 0, 0.04, -0.03].map(formatarMudanca)).toEqual(["+1,9", "−14,9", "0,0", "0,0", "0,0"]);
  });
});

describe("formatarChance", () => {
  it("mostra inteiros, '<1%' e '>99%' (Telas da página de lugar, decisão 3)", () => {
    expect([0.723, 0.5, 0.004, 0.996, 0.0051, 0.9949].map(formatarChance)).toEqual(["72%", "50%", "<1%", ">99%", "1%", "99%"]);
  });
});
