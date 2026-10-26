import { describe, expect, it } from "vitest";
import { pesquisasDoEnsaio } from "../src/lib/pesquisas";

// O painel de antes das 17h do ensaio geral (Ensaio geral, decisões 3 e 12): o agregado das pesquisas finais do 2º
// turno de 2022, no 1º finalista do 1º turno de 2022 (Lula), e a retirada de uma delas por deploy. As contas de
// referência são feitas à mão sobre os votos totais publicados (`dados/pesquisas-historicas.csv`): as 12 pesquisas dão
// a Lula 50,98% dos válidos, e sem a Datafolha (49 × 45), 50,88%.

describe("as pesquisas do ensaio geral", () => {
  it("dão o agregado de 2022 congelado na véspera, com Lula em 51,0%, e a tendência até ele", () => {
    const { pesquisas, noite } = pesquisasDoEnsaio([]);

    expect(pesquisas).toHaveLength(12);
    expect(noite.finalistas.map((c) => c.nomeUrna)).toEqual(["LULA", "JAIR BOLSONARO"]);
    expect(noite.agregado!.dia).toBe("2022-10-30");
    expect(noite.agregado!.valor).toBeCloseTo(50.98, 2);
    expect(noite.agregado!.pesquisas).toHaveLength(12);
    expect(noite.tendencia.at(-1)).toEqual(noite.agregado);
    expect(noite.calendario).toEqual({ inicio: "2022-10-03", dia: "2022-10-30" });
  });

  it("sem a pesquisa retirada, recalculam o agregado: sem a Datafolha, Lula com 50,9%", () => {
    const { pesquisas, noite } = pesquisasDoEnsaio(["BR-08297/2022"]);

    expect(pesquisas.map((p) => p.registro)).not.toContain("BR-08297/2022");
    expect(pesquisas).toHaveLength(11);
    expect(noite.agregado!.valor).toBeCloseTo(50.88, 2);
  });

  it("quebram o build com uma retirada que não é uma pesquisa do 2º turno de 2022", () => {
    expect(() => pesquisasDoEnsaio(["BR-08297/2026"])).toThrow(/BR-08297\/2026/);
  });
});
