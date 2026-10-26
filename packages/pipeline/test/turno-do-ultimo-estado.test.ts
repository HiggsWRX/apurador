import { readFileSync } from "node:fs";
import { lerResultado } from "@apurador/tse";
import { describe, expect, it } from "vitest";
import { turnoDoUltimoEstado, type Turno } from "../src/index.ts";

// O turno provisório do último estado da noite, sobre arquivos reais da divulgação de 2026: os finais do 1º turno
// (eleição 6257) e os zerados do 2º (6258), baixados em 19/10/2026. A referência é o resultado oficial do 1º turno,
// somado dos arquivos por município e zona (`dados/turnos/2026-1.json`), que não passa por este código.

const AMOSTRAS = new URL("../../ensaio/test/amostras/tse/", import.meta.url);
const amostra = (caminho: string) => lerResultado(new Uint8Array(readFileSync(new URL(caminho, AMOSTRAS))));
const OFICIAL = JSON.parse(readFileSync(new URL("../../../dados/turnos/2026-1.json", import.meta.url), "utf8")) as Turno;

// O Brasil, o Acre, Acrelândia (AC), São Paulo, o Exterior, Lisboa e uma zona de São Paulo, que não é lugar do turno.
const FINAIS_DO_1O_TURNO = [
  "br-c0001-e006257-u.json",
  "ac-c0001-e006257-u.json",
  "ac01120-c0001-e006257-u.json",
  "sp71072-c0001-e006257-u.json",
  "zz-c0001-e006257-u.json",
  "zz29254-c0001-e006257-u.json",
  "sp71072-z0001-c0001-e006257-u.json",
].map((arquivo) => amostra(`6257/${arquivo}`));

describe("turnoDoUltimoEstado", () => {
  const turno = turnoDoUltimoEstado({ ano: 2026, turno: 1, resultados: FINAIS_DO_1O_TURNO });

  it("dá, em cada lugar, o resultado oficial do turno, menos as seções, que o arquivo ao vivo conta de outro jeito", () => {
    expect(Object.keys(turno.lugares).sort()).toEqual(["01120", "29254", "71072", "AC", "BR", "ZZ"]);
    for (const [id, lugar] of Object.entries(turno.lugares)) {
      const { secoes: _, ...oficial } = OFICIAL.lugares[id]!;
      expect({ id, ...lugar, secoes: undefined }).toEqual({ id, ...oficial, secoes: undefined });
    }
  });

  it("tem os candidatos do turno, do mais ao menos votado no Brasil, e se diz provisório", () => {
    expect(turno).toMatchObject({ ano: 2026, turno: 1, cargo: "Presidente", candidatos: OFICIAL.candidatos, provisorio: true });
  });

  it("guarda a hora da totalização final do Brasil como a geração, no formato do TSE", () => {
    expect(turno.geracao).toEqual(["05/10/2026 12:51:05"]);
  });

  it("recusa um estado sem a totalização final do Brasil", () => {
    const zerados = ["br-c0001-e006258-u.json", "ac-c0001-e006258-u.json"].map((arquivo) => amostra(`6258/${arquivo}`));

    expect(() => turnoDoUltimoEstado({ ano: 2026, turno: 2, resultados: zerados })).toThrow("sem a totalização final do Brasil");
  });
});
