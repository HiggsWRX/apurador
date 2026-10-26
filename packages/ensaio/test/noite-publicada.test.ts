import { readFileSync } from "node:fs";
import type { Fase } from "@apurador/coletor";
import { describe, expect, it } from "vitest";
import { csvDaNoitePublicada } from "../src/noite-publicada.ts";

// A noite de 25/10 momento a momento, do registro das rodadas do coletor, no formato do CSV da calibração. As rodadas
// daqui são as do registro real (`.cache/coletor/rodadas-2026-10-25T18-04-27-457Z.jsonl`), cortadas no que conta.

type Rodada = Parameters<typeof csvDaNoitePublicada>[0][number];
type Base = [projecao: number, margem: number, chance: number];

function rodada(fase: Fase, [totalizacao, secoes, flavio]: [string | null, number, number], [peso, so, com]: [number, Base, Base]): Rodada {
  const base = ([projecao, margem, chance]: Base) => ({ projecao, margem, chance });
  return {
    fase,
    placarDoTse: {
      totalizacao,
      secoes: { totalizadas: Math.round(4992.48 * secoes), percentual: secoes },
      candidatos: [
        { numero: 22, nome: "FLAVIO BOLSONARO", votos: 0, percentual: flavio },
        { numero: 13, nome: "LULA", votos: 0, percentual: totalizacao === null ? 0 : Number((100 - flavio).toFixed(2)) },
      ],
    },
    projecaoDoBrasil: { candidato: 22, pesoDasPesquisas: peso, soApuracao: base(so), comPesquisas: base(com) },
  };
}

const ANTES: [number, Base, Base] = [100, [51, 8.9, 59], [51.1, 2.9, 77]];
const NOITE: Rodada[] = [
  rodada("antes-das-17h", [null, 0, 0], ANTES),
  rodada("ao-vivo", [null, 0, 0], ANTES),
  rodada("ao-vivo", [null, 0, 0], ANTES),
  rodada("ao-vivo", ["2026-10-25 17:05:51", 0.21, 41.41], ANTES),
  rodada("ao-vivo", ["2026-10-25 19:05:07", 1.51, 47.73], [24, [48.8, 4.4, 30], [49.4, 3.4, 36]]),
  // O mesmo arquivo do Brasil, com a projeção já com outros municípios.
  rodada("ao-vivo", ["2026-10-25 19:05:07", 1.51, 47.73], [24, [48.9, 4.4, 30], [49.4, 3.4, 36]]),
  rodada("ao-vivo", ["2026-10-25 19:05:07", 1.51, 47.73], [24, [48.9, 4.4, 30], [49.4, 3.4, 36]]),
  rodada("encerrada", ["2026-10-25 23:26:38", 100, 48.21], [0, [48.2, 0, 0], [48.2, 0, 0]]),
];

describe("csvDaNoitePublicada", () => {
  it("dá um momento por Brasil publicado diferente, desde a fase ao vivo, com as duas bases no 1º candidato", () => {
    expect(csvDaNoitePublicada(NOITE).split("\n")).toEqual([
      "hora,secoes,placar_22,so_apuracao_peso_das_pesquisas,so_apuracao_projecao_22,so_apuracao_margem,so_apuracao_chance_22," +
        "com_pesquisas_peso_das_pesquisas,com_pesquisas_projecao_22,com_pesquisas_margem,com_pesquisas_chance_22",
      ",0.0000,,0.00,51.0000,8.9000,59.00,100.00,51.1000,2.9000,77.00",
      "2026-10-25 17:05:51,0.2100,41.4100,0.00,51.0000,8.9000,59.00,100.00,51.1000,2.9000,77.00",
      "2026-10-25 19:05:07,1.5100,47.7300,0.00,48.8000,4.4000,30.00,24.00,49.4000,3.4000,36.00",
      "2026-10-25 19:05:07,1.5100,47.7300,0.00,48.9000,4.4000,30.00,24.00,49.4000,3.4000,36.00",
      "2026-10-25 23:26:38,100.0000,48.2100,0.00,48.2000,0.0000,0.00,0.00,48.2000,0.0000,0.00",
      "",
    ]);
  });

  it("recusa um registro sem nenhuma rodada ao vivo", () => {
    expect(() => csvDaNoitePublicada(NOITE.slice(0, 1))).toThrow("nenhuma rodada ao vivo");
  });
});

describe("o CSV da noite de 25/10 no repositório", () => {
  // A tabela "A projeção contra o resultado" do registro da noite (docs/noite/2026-10-25.md), tirada à mão do mesmo
  // registro das rodadas em 26/10: o placar e as duas bases no primeiro momento com cada % de seções.
  const linhas = readFileSync(new URL("../../../docs/noite/2026-10-25.csv", import.meta.url), "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((l) => l.split(","));
  const em = (secoes: number) => linhas.find((l) => Number(l[1]) === secoes)!;
  const DO_REGISTRO = [
    [1.51, "19:05:07", 47.73, 48.8, 4.4, 49.4, 3.4],
    [4.8, "19:28:13", 48.78, 48.0, 4.1, 48.1, 3.9],
    [25.19, "20:03:14", 50.51, 48.9, 3.2, 49.0, 3.1],
    [89.74, "21:01:34", 48.44, 48.2, 0.5, 48.2, 0.5],
  ] as const;

  it.each(DO_REGISTRO)("com %s%% das seções, tem os números do registro da noite", (secoes, hora, placar, so, margemSo, com, margemCom) => {
    const l = em(secoes);

    expect([l[0]!.slice(11), ...[2, 4, 5, 8, 9].map((i) => Number(l[i]))]).toEqual([hora, placar, so, margemSo, com, margemCom]);
  });

  it("começa antes da primeira seção e termina na totalização final, com Flávio em 48,21%", () => {
    expect(linhas[0]!.slice(0, 3)).toEqual(["", "0.0000", ""]);
    expect(linhas.at(-1)!.slice(0, 3)).toEqual(["2026-10-25 23:26:38", "100.0000", "48.2100"]);
  });
});
