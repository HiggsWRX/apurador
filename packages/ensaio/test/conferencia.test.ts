import { describe, expect, it } from "vitest";
import { conferirPlacar, type PlacarPublicado } from "../src/index.ts";
import { cadastro, noite } from "./noite-2022.ts";

// O script que confere o placar publicado contra o TSE falso, o mesmo no replay automático e no ensaio geral.
// Os números certos são os do histórico oficial de totalização de 2022, às 18:44:04 (a virada).

const VIRADA: PlacarPublicado = {
  candidatos: [22, 13],
  lugar: {
    lugar: "BR",
    tse: {
      totalizacao: "2022-10-30 18:44:04",
      secoes: { totalizadas: 319_895, total: 472_075, percentual: 67.76 },
      votos: [40_074_362, 40_083_190],
      percentuais: [49.99, 50.01],
      final: false,
    },
  },
};

describe("conferirPlacar", () => {
  it("não acusa nada quando o placar, o % de seções, o x de y e a hora são os do TSE falso naquela hora", () => {
    expect(conferirPlacar([VIRADA], { noite, cadastro })).toEqual([]);
  });

  it("acusa cada campo diferente, com o lugar e a hora", () => {
    const errado = structuredClone(VIRADA);
    errado.lugar.tse.percentuais = [50.01, 49.99];
    errado.lugar.tse.secoes.totalizadas = 319_894;

    const divergencias = conferirPlacar([VIRADA, errado], { noite, cadastro });

    expect(divergencias).toHaveLength(2);
    expect(divergencias.join("\n")).toMatch(/BR.*2022-10-30 18:44:04.*percentuais/);
    expect(divergencias.join("\n")).toMatch(/BR.*seções totalizadas/);
  });

  it("confere um município e um lugar ainda zerado", () => {
    // Acrelândia (AC, 01120) antes da primeira seção: 0 de todas, sem hora.
    const zerado: PlacarPublicado = {
      candidatos: [22, 13],
      lugar: { lugar: "01120", tse: { totalizacao: null, secoes: { totalizadas: 0, total: 0, percentual: 0 }, votos: [0, 0], percentuais: [0, 0], final: false } },
    };

    const [divergencia] = conferirPlacar([zerado], { noite, cadastro });

    // O total de seções de Acrelândia não é 0: a conferência acusa só ele.
    expect(divergencia).toMatch(/01120.*total de seções/);
  });
});
