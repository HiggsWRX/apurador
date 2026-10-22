import type { DetalheMunzona, MunicipioTseIbge } from "@apurador/tse";
import { describe, expect, it } from "vitest";
import { indiceDeLugares, nomeCompleto, type Lugar } from "../src/lugares.ts";

const detalhe = (ano: number, uf: string, municipio: number, nomeMunicipio: string, aptos: number): DetalheMunzona => ({
  geracao: "18/10/2026 16:32:58",
  ano,
  turno: 1,
  cargo: 1,
  uf,
  municipio,
  nomeMunicipio,
  zona: 1,
  aptos,
  votantes: 0,
  abstencoes: aptos,
  validos: 0,
  brancos: 0,
  nulos: 0,
  secoes: 1,
});

// Linhas copiadas do `municipio_tse_ibge.csv` real, com os nomes como o TSE os escreve.
const ibge = (uf: string, nomeUf: string, municipio: number, codigoIbge: number, nomeIbge: string): MunicipioTseIbge => ({
  geracao: "18/10/2026 09:00:10",
  uf,
  nomeUf,
  municipio,
  nomeTse: nomeIbge,
  ibge: codigoIbge,
  nomeIbge,
});

const municipios = [
  ibge("GO", "Goiás", 92690, 5203500, "Bom Jesus De Goiás"),
  ibge("AL", "Alagoas", 28134, 2705705, "Olho D'Água Das Flores"),
  ibge("MG", "Minas Gerais", 41203, 3145455, "Olhos-D'Água"),
  ibge("MT", "Mato Grosso", 73709, 5101837, "Boa Esperança Do Norte"),
  ibge("PI", "Piauí", 11576, 2207900, "Pedro Ii"),
];

describe("indiceDeLugares", () => {
  // 2022 e 2026: Boa Esperança do Norte só vota em 2026; o posto de Vaticano só em 2022.
  const detalhes = [
    detalhe(2022, "GO", 92690, "BOM JESUS DE GOIÁS", 18_000),
    detalhe(2022, "ZZ", 29998, "VATICANO", 40),
    detalhe(2022, "ZZ", 29351, "CIDADE DO MEXICO", 900),
    detalhe(2022, "ZZ", 30260, "PORT OF SPAIN", 30),
    detalhe(2026, "GO", 92690, "BOM JESUS", 19_000),
    detalhe(2026, "MT", 73709, "BOA ESPERANÇA DO NORTE", 4_326),
    detalhe(2026, "AL", 28134, "OLHO D'ÁGUA DAS FLORES", 17_000),
    detalhe(2026, "MG", 41203, "OLHOS-D'ÁGUA", 5_000),
    detalhe(2026, "PI", 11576, "PEDRO II", 30_000),
    detalhe(2026, "ZZ", 29351, "CIDADE DO MÉXICO", 1_000),
  ];
  const lugares = indiceDeLugares({ municipios, detalhes });
  const lugar = (id: string) => lugares.find((l) => l.id === id);

  it("reúne o Brasil, as UFs, o Exterior e os municípios que votaram em algum turno", () => {
    expect(lugares.map((l) => [l.id, l.tipo])).toEqual([
      ["BR", "brasil"],
      ["AL", "uf"],
      ["GO", "uf"],
      ["MG", "uf"],
      ["MT", "uf"],
      ["PI", "uf"],
      ["ZZ", "exterior"],
      ["28134", "municipio"],
      ["92690", "municipio"],
      ["41203", "municipio"],
      ["73709", "municipio"],
      ["11576", "municipio"],
      ["29351", "municipio"],
      ["30260", "municipio"],
      ["29998", "municipio"],
    ]);
  });

  it("casa os municípios com o IBGE e usa o nome do IBGE, com as preposições em minúscula", () => {
    expect(lugar("92690")).toMatchObject({ nome: "Bom Jesus de Goiás", uf: "GO", ibge: 5203500 });
    expect(lugar("28134")).toMatchObject({ nome: "Olho d'Água das Flores", uf: "AL", ibge: 2705705 });
    expect(lugar("41203")).toMatchObject({ nome: "Olhos-d'Água", uf: "MG", ibge: 3145455 });
    expect(lugar("73709")).toMatchObject({ nome: "Boa Esperança do Norte", uf: "MT", ibge: 5101837 });
    expect(lugar("11576")).toMatchObject({ nome: "Pedro II", uf: "PI", ibge: 2207900 });
  });

  it("dá às cidades do Exterior o nome mais recente do TSE, sem as maiúsculas, e nenhum código IBGE", () => {
    expect(lugar("29351")).toEqual({ id: "29351", tipo: "municipio", nome: "Cidade do México", uf: "ZZ", aptos: 1_000 });
    expect(lugar("29998")).toMatchObject({ nome: "Vaticano", uf: "ZZ" });
    expect(lugar("30260")).toMatchObject({ nome: "Port of Spain", uf: "ZZ" });
  });

  it("dá às UFs o nome e o artigo, e ao Exterior e ao Brasil os seus nomes", () => {
    expect(lugar("AL")).toMatchObject({ nome: "Alagoas", artigo: "", uf: "AL" });
    expect(lugar("MT")).toMatchObject({ nome: "Mato Grosso", artigo: "", uf: "MT" });
    expect(lugar("ZZ")).toMatchObject({ nome: "Exterior", uf: "ZZ" });
    expect(lugar("BR")).toMatchObject({ nome: "Brasil" });
  });

  it("guarda os aptos do turno mais recente em que o lugar votou, para ordenar a busca", () => {
    expect(lugar("92690")!.aptos).toBe(19_000);
    expect(lugar("29998")!.aptos).toBe(40);
    expect(lugar("ZZ")!.aptos).toBe(1_000);
    expect(lugar("BR")!.aptos).toBe(19_000 + 4_326 + 17_000 + 5_000 + 30_000 + 1_000);
  });

  it("recusa um município do Brasil sem correspondência na tabela do IBGE", () => {
    const sem = [...detalhes, detalhe(2026, "SP", 71072, "SÃO PAULO", 9_000_000)];

    expect(() => indiceDeLugares({ municipios, detalhes: sem })).toThrow(/71072.*IBGE/);
  });
});

describe("nomeCompleto", () => {
  const l = (lugar: Partial<Lugar> & Pick<Lugar, "tipo" | "nome">): Lugar => ({ id: "X", aptos: 0, ...lugar });

  it('diz o nome sem ambiguidade: o estado com "estado" e o município com a UF entre parênteses', () => {
    expect(nomeCompleto(l({ tipo: "brasil", nome: "Brasil" }))).toBe("Brasil");
    expect(nomeCompleto(l({ tipo: "uf", nome: "São Paulo", uf: "SP", artigo: "" }))).toBe("Estado de São Paulo");
    expect(nomeCompleto(l({ tipo: "uf", nome: "Bahia", uf: "BA", artigo: "a" }))).toBe("Estado da Bahia");
    expect(nomeCompleto(l({ tipo: "uf", nome: "Acre", uf: "AC", artigo: "o" }))).toBe("Estado do Acre");
    expect(nomeCompleto(l({ tipo: "uf", nome: "Distrito Federal", uf: "DF", artigo: "o" }))).toBe("Distrito Federal");
    expect(nomeCompleto(l({ tipo: "exterior", nome: "Exterior", uf: "ZZ" }))).toBe("Exterior");
    expect(nomeCompleto(l({ tipo: "municipio", nome: "São Paulo", uf: "SP" }))).toBe("São Paulo (SP)");
    expect(nomeCompleto(l({ tipo: "municipio", nome: "Lisboa", uf: "ZZ" }))).toBe("Lisboa (Exterior)");
  });
});
