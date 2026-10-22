import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lerCadastro } from "../src/cadastro.ts";
import { lerNoite } from "../src/noite.ts";

// O cadastro da noite do 2º turno de 2022, que o TSE falso usa para escrever os arquivos da divulgação: os
// candidatos e a geografia como o TSE os escreve. As referências são o `consulta_cand_2022` do TSE (números
// sequenciais, nascimento, vices e coligações), a configuração de municípios da eleição 6258 (capitais) e a
// tabela `municipio_tse_ibge`.
const cadastro = lerCadastro(readFileSync(new URL("../../../dados/cadastros/2022-2.json", import.meta.url), "utf8"));
const noite = lerNoite(new Uint8Array(readFileSync(new URL("../../../dados/noites/2022-2.json.gz", import.meta.url))));

const municipios = cadastro.ufs.flatMap((uf) => uf.municipios.map((m) => ({ uf: uf.sigla, ...m })));
const municipio = (codigo: number) => municipios.find((m) => m.codigo === codigo);

describe("o cadastro da noite do 2º turno de 2022", () => {
  it("traz Lula e Bolsonaro com os números sequenciais, o nascimento, a coligação e o vice de 2022", () => {
    expect(cadastro.candidatos).toEqual([
      {
        numero: 13,
        sequencial: "280001607829",
        nome: "LUIZ INÁCIO LULA DA SILVA",
        nomeUrna: "LULA",
        nascimento: "1945-10-06",
        partido: { numero: 13, sigla: "PT", nome: "PARTIDO DOS TRABALHADORES" },
        federacao: {
          numero: 2,
          sigla: "PT/PC do B/PV",
          nome: "FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL",
          composicao: "PT/PC do B/PV",
          partidos: [13, 43, 65],
        },
        agremiacao: {
          tipo: "c",
          sequencial: "280001681359",
          nome: "COLIGAÇÃO BRASIL DA ESPERANÇA",
          composicao:
            "Federação Brasil da Esperança - FE BRASIL (PT / PC do B / PV) / SOLIDARIEDADE / Federação PSOL REDE (PSOL / REDE) / PSB / AGIR / AVANTE / PROS",
        },
        vice: { sequencial: "280001607830", nome: "GERALDO JOSÉ RODRIGUES ALCKMIN FILHO", nomeUrna: "GERALDO ALCKMIN", partido: "PSB" },
      },
      {
        numero: 22,
        sequencial: "280001618036",
        nome: "JAIR MESSIAS BOLSONARO",
        nomeUrna: "JAIR BOLSONARO",
        nascimento: "1955-03-21",
        partido: { numero: 22, sigla: "PL", nome: "PARTIDO LIBERAL" },
        federacao: null,
        agremiacao: { tipo: "c", sequencial: "280001682069", nome: "PELO BEM DO BRASIL", composicao: "PP / REPUBLICANOS / PL" },
        vice: { sequencial: "280001618037", nome: "WALTER SOUZA BRAGA NETTO", nomeUrna: "BRAGA NETTO", partido: "PL" },
      },
    ]);
  });

  it("os candidatos são os da noite, na mesma ordem", () => {
    expect(cadastro.candidatos.map((c) => c.numero)).toEqual(noite.candidatos.map((c) => c.numero));
  });

  it("tem exatamente os municípios que votaram na noite, com a geografia de 2022", () => {
    const daNoite = new Set(noite.zonas.map((z) => `${z.uf}/${z.municipio}`));
    expect(new Set(municipios.map((m) => `${m.uf}/${m.codigo}`))).toEqual(daNoite);
    // O posto do Vaticano votou em 2022; Boa Esperança do Norte (MT) só existe a partir de 2026.
    expect(municipio(99252)).toMatchObject({ uf: "ZZ", nome: "VATICANO", ibge: null, capital: false });
    expect(municipios.find((m) => m.nome === "BOA ESPERANÇA DO NORTE")).toBeUndefined();
  });

  it("as UFs e o Exterior vêm com o nome do TSE, em maiúsculas, na ordem da configuração de municípios", () => {
    expect(cadastro.ufs.map((uf) => uf.sigla).join(" ")).toBe("AC AL AP AM BA CE DF ES ZZ GO MA MT MS MG PR PB PA PE PI RJ RN RS RO RR SC SE SP TO");
    expect(cadastro.ufs.find((uf) => uf.sigla === "ZZ")?.nome).toBe("EXTERIOR");
    expect(cadastro.ufs.find((uf) => uf.sigla === "SP")?.nome).toBe("SÃO PAULO");
  });

  it("os municípios vêm com o nome do TSE, o código do IBGE e as 27 capitais", () => {
    expect(municipio(71072)).toEqual({ uf: "SP", codigo: 71072, ibge: 3550308, nome: "SÃO PAULO", capital: true });
    expect(municipio(1120)).toEqual({ uf: "AC", codigo: 1120, ibge: 1200013, nome: "ACRELÂNDIA", capital: false });
    expect(
      municipios
        .filter((m) => m.capital)
        .map((m) => m.codigo)
        .sort((a, b) => a - b),
    ).toEqual(
      [
        35, 1392, 3018, 4278, 6050, 9210, 2550, 12190, 13897, 17612, 20516, 25313, 27855, 31054, 38490, 41238, 57053, 60011, 71072, 73440, 75353, 81051, 88013,
        90514, 90670, 93734, 97012,
      ].sort((a, b) => a - b),
    );
    expect(municipios.filter((m) => m.uf !== "ZZ").every((m) => m.ibge !== null)).toBe(true);
  });
});
