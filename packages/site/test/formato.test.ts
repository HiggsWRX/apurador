import { describe, expect, it } from "vitest";
import { formatarMudanca } from "../src/lib/formato";

describe("formatarMudanca", () => {
  it("dá o sinal e uma casa, e nenhum sinal ao que arredonda para zero", () => {
    expect([1.94, -14.9, 0, 0.04, -0.03].map(formatarMudanca)).toEqual(["+1,9", "−14,9", "0,0", "0,0", "0,0"]);
  });
});
