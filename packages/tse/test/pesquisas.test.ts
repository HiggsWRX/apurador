import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { abrangenciaDoRegistro, lerRegistrosDePesquisas } from "../src/pesquisas.ts";

// Linhas reais do CSV de registros de pesquisas do TSE (`pesquisa_eleitoral_2026_BRASIL.csv`, gerado em 18/10/2026),
// copiadas no formato do arquivo: Latin-1, `;`, CRLF e `#NULO#` para vazio.
const amostra = new Uint8Array(readFileSync(new URL("amostras/pesquisa_eleitoral_2026_BRASIL.csv", import.meta.url)));
const registros = lerRegistrosDePesquisas(amostra);
const registro = (numero: string) => registros.find((r) => r.registro === numero)!;

describe("lerRegistrosDePesquisas", () => {
  it("lê o registro como o TSE o publica, com o número no formato da divulgação", () => {
    expect(registros).toHaveLength(10);
    expect(registro("BR-00466/2026")).toMatchObject({
      geracao: "18/10/2026 05:46:37",
      cnpj: "07630546000175",
      empresa: "DATAFOLHA INSTITUTO DE PESQUISAS LTDA.",
      fantasia: "",
      cargo: "Presidente",
      inicio: "2026-10-13",
      fim: "2026-10-15",
      divulgacao: "2026-10-15",
      entrevistas: 2520,
    });
    expect(registro("BR-00466/2026").planoAmostral).toMatch(/^Universo: Eleitorado brasileiro/);
    expect(registro("BR-02952/2026").fantasia).toBe("REAL TIME BIG DATA");
  });
});

describe("abrangenciaDoRegistro", () => {
  // Toda pesquisa para Presidente é registrada com UF "BR": a abrangência só aparece no texto livre.
  it.each(["BR-00466/2026", "BR-02418/2026", "BR-02952/2026", "BR-05187/2026"])("%s é nacional", (numero) => {
    expect(abrangenciaDoRegistro(registro(numero))).toBe("nacional");
  });

  it.each([
    ["BR-09051/2026", "Tocantins"],
    ["BR-03163/2026", "Distrito Federal"],
    ["BR-07193/2026", "Amazonas"],
    ["BR-03826/2026", "Tocantins"],
    ["BR-02367/2026", '"em todo o RN"'],
    ["BR-04487/2026", '"estado do RN"'],
  ])("%s é estadual (%s)", (numero) => {
    expect(abrangenciaDoRegistro(registro(numero))).toBe("estadual");
  });

  it("é estadual quando o plano diz que a pesquisa é restrita a uma UF", () => {
    // Plano amostral do registro BR-07065/2018 da Real Time Big Data.
    const restrita = {
      metodologia: "Pesquisa quantitativa, que consiste na realização de entrevistas por telefone.",
      planoAmostral: "Pesquisa restrita ao Distrito Federal: Universo: 2.084.356 eleitores (TSE).",
      municipios: "",
    };
    expect(abrangenciaDoRegistro(restrita)).toBe("estadual");
  });

  // Trechos de registros reais de 2026.
  it.each([
    ["a área diz só a UF (BR-03326/2026)", "A área de abrangência da coleta corresponde ao Distrito Federal (Brasília)."],
    ["o eleitorado vem pelo gentílico", "Amostra representativa do eleitorado potiguar, com 16 anos ou mais."],
  ])("é estadual quando %s", (_, municipios) => {
    expect(abrangenciaDoRegistro({ metodologia: "Pesquisa quantitativa por telefone.", planoAmostral: "Amostra por cotas.", municipios })).toBe("estadual");
  });

  it('não confunde a preposição "para" com o Pará', () => {
    const nacional = {
      metodologia: "Universo: eleitorado brasileiro.",
      planoAmostral: "Usamos o eleitorado para o dimensionamento da amostra.",
      municipios: "",
    };
    expect(abrangenciaDoRegistro(nacional)).toBe("nacional");
  });

  it("fica indefinida quando o texto não diz a área", () => {
    const semArea = { ...registro("BR-00466/2026"), metodologia: "Pesquisa quantitativa.", planoAmostral: "Amostra por cotas.", municipios: "" };
    expect(abrangenciaDoRegistro(semArea)).toBe("indefinida");
  });
});
