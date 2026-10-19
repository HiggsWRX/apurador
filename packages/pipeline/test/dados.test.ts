import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Lugar } from "../src/lugares.ts";
import type { Turno } from "../src/turno.ts";

// Conferência dos dados derivados que estão no repositório, sem rede: é o que o site lê.
const DADOS = new URL("../../../dados/", import.meta.url);
const ler = (arquivo: string) => readFileSync(new URL(arquivo, DADOS));
const lerTurno = (arquivo: string) => JSON.parse(ler(`turnos/${arquivo}.json`).toString("utf8")) as Turno;
const lugares = JSON.parse(ler("lugares.json").toString("utf8")) as Lugar[];
const TURNOS = ["2018-1", "2018-2", "2022-1", "2022-2", "2026-1"];

describe("dados derivados de cada turno", () => {
  // O resultado oficial do Brasil, com o Exterior, como o TSE o divulgou.
  const OFICIAL = [
    { turno: "2018-1", aptos: 147_306_295, votantes: 117_364_654, validos: 107_050_749, brancos: 3_106_937, nulos: 7_206_222, primeiros: [["JAIR BOLSONARO", 49_277_010, "46.03"], ["FERNANDO HADDAD", 31_342_051, "29.28"]] },
    { turno: "2018-2", aptos: 147_306_294, votantes: 115_933_451, validos: 104_838_753, brancos: 2_486_593, nulos: 8_608_105, primeiros: [["JAIR BOLSONARO", 57_797_847, "55.13"], ["FERNANDO HADDAD", 47_040_906, "44.87"]] },
    { turno: "2022-1", aptos: 156_454_011, votantes: 123_682_372, validos: 118_229_719, brancos: 1_964_779, nulos: 3_487_874, primeiros: [["LULA", 57_259_504, "48.43"], ["JAIR BOLSONARO", 51_072_345, "43.20"]] },
    { turno: "2022-2", aptos: 156_454_011, votantes: 124_252_796, validos: 118_552_353, brancos: 1_769_678, nulos: 3_930_765, primeiros: [["LULA", 60_345_999, "50.90"], ["JAIR BOLSONARO", 58_206_354, "49.10"]] },
    { turno: "2026-1", aptos: 158_745_502, votantes: 125_275_835, validos: 119_300_788, brancos: 2_300_798, nulos: 3_674_249, primeiros: [["FLAVIO BOLSONARO", 56_104_503, "47.03"], ["LULA", 53_879_538, "45.16"]] },
  ] as const;

  it.each(OFICIAL)("$turno bate com o resultado oficial do Brasil", ({ turno: arquivo, primeiros, ...totais }) => {
    const turno = lerTurno(arquivo);
    const br = turno.lugares.BR!;

    expect(br).toMatchObject(totais);
    turno.candidatos.slice(0, 2).forEach((c, i) => {
      const [nomeUrna, votos, pct] = primeiros[i]!;
      expect([c.nomeUrna, br.votos[i], ((100 * br.votos[i]!) / br.validos).toFixed(2)]).toEqual([nomeUrna, votos, pct]);
    });
  });

  // Os votos dados fora do país, medidos nos arquivos do TSE pela pesquisa dos dados históricos
  // (research/03-dados-historicos-e-malhas.md, seção 4). O total oficial do Brasil, acima, já os inclui.
  const EXTERIOR = [
    { turno: "2018-1", aptos: 500_340, votantes: 202_766, validos: 193_381 },
    { turno: "2022-1", aptos: 695_355, votantes: 304_032, validos: 294_525 },
    { turno: "2022-2", aptos: 695_578, votantes: 310_148, validos: 298_169 },
    { turno: "2026-1", aptos: 916_534, votantes: 341_766, validos: 330_882 },
  ];

  it.each(EXTERIOR)("$turno tem o Exterior como um lugar, com os votos dados fora do país", ({ turno: arquivo, ...totais }) => {
    expect(lerTurno(arquivo).lugares.ZZ).toMatchObject(totais);
  });

  it.each(TURNOS)("%s tem um resultado para cada UF", (arquivo) => {
    const { lugares: resultados } = lerTurno(arquivo);

    expect(lugares.filter((l) => l.tipo === "uf" && !resultados[l.id])).toEqual([]);
  });

  it.each(TURNOS)("%s só tem lugares do índice", (arquivo) => {
    const ids = new Set(lugares.map((l) => l.id));

    expect(Object.keys(lerTurno(arquivo).lugares).filter((id) => !ids.has(id))).toEqual([]);
  });
});

describe("índice dos lugares", () => {
  const municipiosDoBrasil = lugares.filter((l) => l.tipo === "municipio" && l.uf !== "ZZ");

  it("tem o Brasil, as 27 UFs, o Exterior e os 5.571 municípios de 2026, cada um casado com o IBGE", () => {
    expect(lugares.filter((l) => l.tipo === "brasil")).toHaveLength(1);
    expect(lugares.filter((l) => l.tipo === "uf")).toHaveLength(27);
    expect(lugares.filter((l) => l.tipo === "exterior")).toHaveLength(1);
    expect(municipiosDoBrasil).toHaveLength(5_571);
    expect(new Set(municipiosDoBrasil.map((l) => l.ibge)).size).toBe(5_571);
    expect(lugares.find((l) => l.id === "71072")).toMatchObject({ nome: "São Paulo", uf: "SP", ibge: 3550308 });
  });

  it("tem as cidades do Exterior que votaram em algum turno, sem código IBGE", () => {
    const cidades = lugares.filter((l) => l.tipo === "municipio" && l.uf === "ZZ");

    expect(cidades.length).toBeGreaterThanOrEqual(186);
    expect(cidades.every((l) => l.ibge === undefined)).toBe(true);
    expect(cidades.find((l) => l.nome === "Lisboa")).toBeDefined();
  });

  it("tem Boa Esperança do Norte (MT) só a partir de 2026", () => {
    expect(lugares.find((l) => l.id === "73709")).toMatchObject({ nome: "Boa Esperança do Norte", uf: "MT", ibge: 5101837 });
    expect(lerTurno("2026-1").lugares["73709"]).toMatchObject({ aptos: 4_326, secoes: 13 });
    for (const arquivo of ["2018-1", "2018-2", "2022-1", "2022-2"]) expect(lerTurno(arquivo).lugares["73709"]).toBeUndefined();
  });
});

describe("manifesto de origem", () => {
  const manifesto = JSON.parse(ler("manifesto.json").toString("utf8")) as {
    fontes: { url: string; membro: string; geracao: string[]; sha256: string }[];
    derivados: { arquivo: string; sha256: string; fontes: string[] }[];
  };
  const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

  it("lista cada arquivo derivado com o hash que ele tem no repositório", () => {
    // Os arquivos das pesquisas não são derivados dos geradores: o pesquisas.csv e o dos institutos são
    // preenchidos à mão, e a origem no TSE fica no próprio extrato (pesquisas-tse.json) e no registro das
    // verificações, que a conferência das pesquisas grava. O arquivo de chaves de publicação é do dono.
    const derivados = readdirSync(DADOS, { recursive: true, withFileTypes: true })
      .filter((f) => f.isFile() && f.name !== "manifesto.json" && f.name !== "chaves.json" && !f.name.startsWith("pesquisas"))
      .map((f) => `${f.parentPath.slice(fileURLToPath(DADOS).length).replaceAll("\\", "/")}/${f.name}`.replace(/^\//, ""));
    expect(manifesto.derivados.map((d) => d.arquivo).sort()).toEqual(derivados.sort());
    for (const d of manifesto.derivados) expect(sha256(ler(d.arquivo)), d.arquivo).toBe(d.sha256);
  });

  it("diz de que arquivo do TSE, de que data de geração e com que hash veio cada derivado", () => {
    for (const d of manifesto.derivados) {
      expect(d.fontes.length).toBeGreaterThan(0);
      for (const url of d.fontes) {
        const fonte = manifesto.fontes.find((f) => f.url === url);
        expect(fonte, url).toBeDefined();
        // Do portal de dados abertos vem um CSV de dentro de um zip; da divulgação ao vivo, um JSON solto (a
        // configuração de municípios, de onde o cadastro tira as capitais).
        const doPortal = /^https:\/\/cdn\.tse\.jus\.br\/.+\.zip$/.test(fonte!.url) && /\.csv$/.test(fonte!.membro);
        const daDivulgacao = /^https:\/\/resultados\.tse\.jus\.br\/oficial\/.+\.json$/.test(fonte!.url) && fonte!.url.endsWith(`/${fonte!.membro}`);
        expect(doPortal || daDivulgacao, url).toBe(true);
        expect(fonte!.geracao.length).toBeGreaterThan(0);
        expect(fonte!.sha256).toMatch(/^[0-9a-f]{64}$/);
      }
    }
  });
});
