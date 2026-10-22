import { describe, expect, it } from "vitest";
import { caminhoDoSimulador, simuladorNoAr } from "../src/lib/simulador-antes-das-17h";

// Quando o simulador "e se" vai ao ar antes das 17h e como a caixa da projeção de cada lugar o abre (ticket 24). O build
// dos testes exercita só as chaves todas ligadas e todas desligadas; as outras combinações ficam aqui.

describe("o simulador antes das 17h", () => {
  it("vai ao ar só com a chave dele e a da projeção ligadas, com ou sem o agregado", () => {
    const casos: [boolean, boolean, boolean, boolean][] = [
      // agregado, projeção, simulador → no ar
      [true, true, true, true],
      [false, true, true, true],
      [true, true, false, false],
      [true, false, true, false],
      [false, false, true, false],
    ];
    for (const [agregado, projecao, simulador, noAr] of casos)
      expect(simuladorNoAr({ agregado, projecao, simulador }), JSON.stringify({ agregado, projecao, simulador })).toBe(noAr);
  });
});

describe("o link do simulador na caixa da projeção", () => {
  it("leva a base e, numa UF ou num município, a UF, para a região dela abrir expandida", () => {
    expect(caminhoDoSimulador("com-pesquisas")).toBe("/simulador/?base=com-pesquisas");
    expect(caminhoDoSimulador("so-apuracao", { tipo: "brasil" })).toBe("/simulador/?base=so-apuracao");
    expect(caminhoDoSimulador("com-pesquisas", { tipo: "uf", uf: "BA" })).toBe("/simulador/?base=com-pesquisas&de=ba");
    expect(caminhoDoSimulador("com-pesquisas", { tipo: "municipio", uf: "SP" })).toBe("/simulador/?base=com-pesquisas&de=sp");
    // o Exterior não tem região: segue o Brasil
    expect(caminhoDoSimulador("com-pesquisas", { tipo: "exterior", uf: "ZZ" })).toBe("/simulador/?base=com-pesquisas");
    expect(caminhoDoSimulador("com-pesquisas", { tipo: "municipio", uf: "ZZ" })).toBe("/simulador/?base=com-pesquisas");
  });
});
