import { beforeAll, describe, expect, it } from "vitest";
import { CONTROLE_INICIAL, type Controle } from "@apurador/coletor";
import { conferirPlacar } from "../src/index.ts";
import { conferirNarracao, noColetor, noiteComQuedas, type NoiteComQuedas } from "./noite-com-quedas.ts";
import { cadastro, noite } from "./noite-2022.ts";

// Uma queda no plano zero (Operação na noite, decisões 9 e 15): o coletor cai com o núcleo mínimo desligado e volta do
// objeto da noite. Num arquivo próprio, porque a noite guarda os objetos de todas as rodadas, e com as outras noites com
// quedas num processo só ela passava dos 2 GB do runner do CI.

describe("uma queda no plano zero", () => {
  // O dono liga o plano zero às 17:05; o coletor cai às 17:12 e volta do objeto da noite, sem o disco; o dono religa o
  // núcleo mínimo às 17:20. Os lugares que mudaram no plano zero estavam por gravar quando ele caiu, e esperam o coletor
  // baixá-los de novo.
  const DE = "2022-10-30 16:50:00";
  let r: NoiteComQuedas;
  beforeAll(async () => {
    const planoZero = (quando: number): Controle =>
      quando >= noColetor(DE, "2022-10-30 17:05:00") && quando < noColetor(DE, "2022-10-30 17:20:00")
        ? { ...CONTROLE_INICIAL, chaves: { ...CONTROLE_INICIAL.chaves, nucleoMinimo: false } }
        : CONTROLE_INICIAL;
    r = await noiteComQuedas(DE, "2022-10-30 17:25:00", [{ em: "2022-10-30 17:12:00", de: "objeto da noite" }], { controle: planoZero });
  }, 300_000);

  it("volta sem derrubar nenhuma rodada e, religado o núcleo mínimo, publica de novo os lugares com o placar do TSE falso", () => {
    expect(r.rodadas.flatMap((x) => x.falhas)).toEqual([]);
    const depois = r.lugares().filter((g) => g.quando >= r.noColetor("2022-10-30 17:20:00"));
    expect(depois.length).toBeGreaterThan(1_000);
    expect(
      conferirPlacar(
        depois.map((g) => ({ candidatos: [22, 13], lugar: g.conteudo })),
        { noite, cadastro },
      ),
    ).toEqual([]);
    expect(conferirNarracao(r)).toEqual([]);
  }, 120_000);
});
