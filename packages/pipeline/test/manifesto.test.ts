import { describe, expect, it } from "vitest";
import { atualizarManifesto, type FonteDoManifesto } from "../src/manifesto.ts";

const fonte = (url: string): FonteDoManifesto => ({
  url,
  membro: `${url}.csv`,
  sha256: "0".repeat(64),
  bytes: 1,
  baixadoEm: "2026-10-19T00:00:00.000Z",
  geracao: ["19/10/2026 03:00:00"],
});

describe("atualizarManifesto", () => {
  const atual = {
    fontes: [fonte("munzona"), fonte("secao-velha"), fonte("secao")],
    derivados: [
      { arquivo: "turnos/2026-1.json", sha256: "a", fontes: ["munzona"] },
      { arquivo: "noites/2018-2.json.gz", sha256: "b", fontes: ["secao-velha"] },
      { arquivo: "noites/2022-2.json.gz", sha256: "c", fontes: ["secao"] },
    ],
  };

  it("troca os derivados das pastas do gerador e mantém os dos outros geradores", () => {
    const novo = atualizarManifesto(atual, {
      pastas: ["noites/", "bases/"],
      fontes: [fonte("secao"), fonte("bweb")],
      derivados: [
        { arquivo: "noites/2022-2.json.gz", sha256: "d", fontes: ["secao", "bweb"] },
        { arquivo: "bases/2022-2.json", sha256: "e", fontes: ["munzona", "secao"] },
      ],
    });

    // o que já estava fica no lugar, e o que é novo vem no fim: os outros geradores não veem o arquivo mexer
    expect(novo.derivados).toEqual([
      { arquivo: "turnos/2026-1.json", sha256: "a", fontes: ["munzona"] },
      { arquivo: "noites/2022-2.json.gz", sha256: "d", fontes: ["secao", "bweb"] },
      { arquivo: "bases/2022-2.json", sha256: "e", fontes: ["munzona", "secao"] },
    ]);
    // a fonte da noite que saiu fica de fora, e as outras ficam uma vez só
    expect(novo.fontes.map((f) => f.url)).toEqual(["munzona", "secao", "bweb"]);
  });

  it("avisa quando uma fonte mudou e ainda serve a derivados de outro gerador", () => {
    const avisos: string[] = [];

    atualizarManifesto(
      atual,
      {
        pastas: ["noites/"],
        fontes: [{ ...fonte("munzona"), sha256: "1".repeat(64) }, fonte("secao")],
        derivados: [{ arquivo: "noites/2022-2.json.gz", sha256: "d", fontes: ["secao", "munzona"] }],
      },
      (a) => avisos.push(a),
    );

    expect(avisos).toEqual([expect.stringMatching(/munzona.*turnos\/2026-1\.json/)]);
  });

  it("recusa um derivado sem a fonte de onde veio", () => {
    expect(() =>
      atualizarManifesto(atual, { pastas: ["bases/"], fontes: [], derivados: [{ arquivo: "bases/2022-2.json", sha256: "e", fontes: ["bweb"] }] }),
    ).toThrow(/bweb/);
  });
});
