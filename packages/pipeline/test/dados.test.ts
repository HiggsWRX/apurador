import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Turno } from "../src/turno.ts";

// Conferência dos dados derivados que estão no repositório, sem rede: é o que o site lê.
const DADOS = new URL("../../../dados/", import.meta.url);
const ler = (arquivo: string) => readFileSync(new URL(arquivo, DADOS));

describe("dados derivados do 1º turno de 2026", () => {
  const turno = JSON.parse(ler("turnos/2026-1.json").toString("utf8")) as Turno;
  const br = turno.lugares.BR!;
  const votosDe = (nomeUrna: string) => br.votos[turno.candidatos.findIndex((c) => c.nomeUrna === nomeUrna)]!;
  const pct = (votos: number) => ((100 * votos) / br.validos).toFixed(2);

  it("batem com o resultado oficial do Brasil (TSE, 04/10/2026)", () => {
    expect(br).toMatchObject({ aptos: 158_745_502, votantes: 125_275_835, validos: 119_300_788, brancos: 2_300_798, nulos: 3_674_249 });
    expect(votosDe("FLAVIO BOLSONARO")).toBe(56_104_503);
    expect(votosDe("LULA")).toBe(53_879_538);
    expect(pct(votosDe("FLAVIO BOLSONARO"))).toBe("47.03");
    expect(pct(votosDe("LULA"))).toBe("45.16");
  });
});

describe("manifesto de origem", () => {
  const manifesto = JSON.parse(ler("manifesto.json").toString("utf8")) as {
    fontes: { url: string; membro: string; geracao: string[]; sha256: string }[];
    derivados: { arquivo: string; sha256: string; fontes: string[] }[];
  };
  const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

  it("lista cada arquivo derivado com o hash que ele tem no repositório", () => {
    const turnos = readdirSync(new URL("turnos/", DADOS)).map((f) => `turnos/${f}`);
    expect(manifesto.derivados.map((d) => d.arquivo).sort()).toEqual(turnos.sort());
    for (const d of manifesto.derivados) expect(sha256(ler(d.arquivo)), d.arquivo).toBe(d.sha256);
  });

  it("diz de que arquivo do TSE, de que data de geração e com que hash veio cada derivado", () => {
    for (const d of manifesto.derivados) {
      expect(d.fontes.length).toBeGreaterThan(0);
      for (const url of d.fontes) {
        const fonte = manifesto.fontes.find((f) => f.url === url);
        expect(fonte, url).toBeDefined();
        expect(fonte!.url).toMatch(/^https:\/\/cdn\.tse\.jus\.br\/.+\.zip$/);
        expect(fonte!.membro).toMatch(/_BR\.csv$/);
        expect(fonte!.geracao.length).toBeGreaterThan(0);
        expect(fonte!.sha256).toMatch(/^[0-9a-f]{64}$/);
      }
    }
  });
});
