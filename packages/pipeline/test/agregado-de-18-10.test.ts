import { readFileSync } from "node:fs";
import { agregadoDePesquisas } from "@apurador/modelo";
import { describe, expect, it } from "vitest";
import { listaDasPesquisas, pesquisasDoAgregado, type ExtratoDoTse } from "../src/pesquisas.ts";
import type { Turno } from "../src/turno.ts";

// O agregado de 18/10 de ponta a ponta, sobre os arquivos das pesquisas como estavam na conferência de 19/10 (uma
// cópia, para que a retirada de uma pesquisa do dados/ não quebre a referência): o instituto da lista sai do CNPJ do
// registro, e a conta é a do comentário de 19/10 no ticket 04 e no ticket 10 do mapa.
const AMOSTRA = new URL("./amostras/pesquisas-19-10/", import.meta.url);
const ler = (arquivo: string, raiz = AMOSTRA) => readFileSync(new URL(arquivo, raiz), "utf8");
const turno = JSON.parse(ler("turnos/2026-1.json", new URL("../../../dados/", import.meta.url))) as Turno;
const lista = listaDasPesquisas({
  pesquisas: ler("pesquisas.csv"),
  institutos: ler("pesquisas-institutos.csv"),
  extrato: JSON.parse(ler("pesquisas-tse.json")) as ExtratoDoTse,
  verificacoes: ler("pesquisas-verificacoes.csv"),
  turno,
});

describe("agregado de 18/10 sobre o pesquisas.csv", () => {
  it("dá Flávio 51,09% com as 9 pesquisas do comentário, a Nexus como FSB", () => {
    const agregado = agregadoDePesquisas(pesquisasDoAgregado(lista, turno), "2026-10-18")!;
    expect(agregado.valor).toBeCloseTo(51.09, 2);
    expect(agregado.incerteza).toBeCloseTo(1.84, 2);
    expect(agregado.chance).toBeCloseTo(0.72, 2);
    expect(agregado.pesquisas.map((p) => [p.instituto, p.registro]).sort()).toEqual(
      [
        ["Gerp", "BR-05187/2026"],
        ["Veritá", "BR-01107/2026"],
        ["Futura", "BR-03764/2026"],
        ["Datafolha", "BR-00466/2026"],
        ["PoderData", "BR-04258/2026"],
        ["MDA", "BR-00652/2026"],
        ["Ipespe", "BR-00223/2026"],
        ["Quaest", "BR-08729/2026"],
        ["FSB", "BR-07997/2026"],
      ].sort(),
    );
  });
});
