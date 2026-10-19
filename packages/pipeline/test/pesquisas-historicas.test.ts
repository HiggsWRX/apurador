import { describe, expect, it } from "vitest";
import { lerPesquisasHistoricas } from "../src/pesquisas-historicas.ts";

const CABECALHO =
  "ano,turno,instituto,contratante,registro,campo_inicio,campo_fim,divulgacao,entrevistas,base,votos_13,votos_22,votos_45,votos_outros,fonte,observacao";
// O Datafolha final de 2022, como está no repositório.
const DATAFOLHA = "2022,2,Datafolha,Folha de S.Paulo e TV Globo,BR-08297/2022,2022-10-28,2022-10-29,2022-10-29,8308,totais,49,45,,,https://g1.globo.com/a.ghtml,";
const ler = (...linhas: string[]) => lerPesquisasHistoricas([CABECALHO, ...linhas].join("\n"));
const trocar = (coluna: string, valor: string) => {
  const i = CABECALHO.split(",").indexOf(coluna);
  return DATAFOLHA.split(",").map((v, j) => (j === i ? valor : v)).join(",");
};

describe("lerPesquisasHistoricas", () => {
  it("lê uma linha, com os votos dos dois finalistas pelo número no TSE e os campos vazios como nulos", () => {
    expect(ler(DATAFOLHA)).toEqual([
      {
        ano: 2022,
        turno: 2,
        instituto: "Datafolha",
        contratante: "Folha de S.Paulo e TV Globo",
        registro: "BR-08297/2022",
        campoInicio: "2022-10-28",
        campoFim: "2022-10-29",
        divulgacao: "2022-10-29",
        entrevistas: 8308,
        base: "totais",
        votos: new Map([
          [13, 49],
          [22, 45],
        ]),
        outros: null,
        fonte: "https://g1.globo.com/a.ghtml",
        observacao: null,
      },
    ]);
  });

  it("aponta a linha de uma pesquisa sem os votos dos dois finalistas", () => {
    expect(() => ler(DATAFOLHA, trocar("votos_45", "3"))).toThrow(/linha 3: os votos são de 3 candidato/);
    expect(() => ler(trocar("votos_22", ""))).toThrow(/linha 2: os votos são de 1 candidato/);
  });

  it("exige a soma dos outros candidatos no 1º turno, e só nele", () => {
    expect(() => ler(trocar("votos_outros", "6"))).toThrow(/linha 2: votos_outros inválido: 6/);
    expect(() => ler(trocar("turno", "1"))).toThrow(/linha 2: votos_outros inválido/);
    expect(ler(trocar("turno", "1").replace(",45,,,", ",45,,6,"))[0]!.outros).toBe(6);
  });

  it("recusa divulgação antes do fim do campo, base desconhecida e fonte que não é endereço", () => {
    expect(() => ler(trocar("divulgacao", "2022-10-28"))).toThrow(/linha 2: a divulgação \(2022-10-28\) é anterior ao fim do campo/);
    expect(() => ler(trocar("base", "brutos"))).toThrow(/linha 2: base inválido/);
    expect(() => ler(trocar("fonte", "g1"))).toThrow(/linha 2: fonte inválido/);
  });
});
