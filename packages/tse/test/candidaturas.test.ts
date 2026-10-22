import { describe, expect, it } from "vitest";
import { lerCandidaturas, membroCandidaturasDoBrasil, urlCandidaturas } from "../src/index.ts";

// Cabeçalho e linhas copiados do `consulta_cand_2022_BRASIL.csv` real (gerado em 18/10/2026), em Latin-1.
// CPF, e-mail e título de eleitor foram trocados por "#NULO": o leitor não os usa, e o repositório não os guarda.
const latin1 = (texto: string) => new Uint8Array(Buffer.from(texto, "latin1"));

const CABECALHO =
  '"DT_GERACAO";"HH_GERACAO";"ANO_ELEICAO";"CD_TIPO_ELEICAO";"NM_TIPO_ELEICAO";"NR_TURNO";"CD_ELEICAO";"DS_ELEICAO";"DT_ELEICAO";"TP_ABRANGENCIA";"SG_UF";"SG_UE";"NM_UE";"CD_CARGO";"DS_CARGO";"SQ_CANDIDATO";"NR_CANDIDATO";"NM_CANDIDATO";"NM_URNA_CANDIDATO";"NM_SOCIAL_CANDIDATO";"NR_CPF_CANDIDATO";"DS_EMAIL";"CD_SITUACAO_CANDIDATURA";"DS_SITUACAO_CANDIDATURA";"TP_AGREMIACAO";"NR_PARTIDO";"SG_PARTIDO";"NM_PARTIDO";"NR_FEDERACAO";"NM_FEDERACAO";"SG_FEDERACAO";"DS_COMPOSICAO_FEDERACAO";"SQ_COLIGACAO";"NM_COLIGACAO";"DS_COMPOSICAO_COLIGACAO";"SG_UF_NASCIMENTO";"DT_NASCIMENTO";"NR_TITULO_ELEITORAL_CANDIDATO";"CD_GENERO";"DS_GENERO";"CD_GRAU_INSTRUCAO";"DS_GRAU_INSTRUCAO";"CD_ESTADO_CIVIL";"DS_ESTADO_CIVIL";"CD_COR_RACA";"DS_COR_RACA";"CD_OCUPACAO";"DS_OCUPACAO";"CD_SIT_TOT_TURNO";"DS_SIT_TOT_TURNO"';
const LINHAS = [
  '"18/10/2026";"03:16:38";2022;2;"ELEIÇÃO ORDINÁRIA";2;545;"Eleição Geral Federal 2022";"30/10/2022";"FEDERAL";"BR";"BR";"BRASIL";1;"PRESIDENTE";280001607829;13;"LUIZ INÁCIO LULA DA SILVA";"LULA";"#NULO";"#NULO";"#NULO";12;"APTO";"COLIGAÇÃO";13;"PT";"PARTIDO DOS TRABALHADORES";2;"Federação Brasil da Esperança - FE BRASIL";"PT/PC do B/PV";"PT/PC do B/PV";280001681359;"COLIGAÇÃO BRASIL DA ESPERANÇA";"Federação Brasil da Esperança - FE BRASIL (PT / PC do B / PV) / SOLIDARIEDADE / Federação PSOL REDE (PSOL / REDE) / PSB / AGIR / AVANTE / PROS";"PE";"06/10/1945";"#NULO";2;"MASCULINO";4;"ENSINO FUNDAMENTAL COMPLETO";3;"CASADO(A)";"01";"BRANCA";249;"TORNEIRO MECÂNICO";1;"ELEITO"',
  '"18/10/2026";"03:16:38";2022;2;"ELEIÇÃO ORDINÁRIA";2;545;"Eleição Geral Federal 2022";"30/10/2022";"FEDERAL";"BR";"BR";"BRASIL";2;"VICE-PRESIDENTE";280001618037;22;"WALTER SOUZA BRAGA NETTO";"BRAGA NETTO";"#NULO";"#NULO";"#NULO";12;"APTO";"COLIGAÇÃO";22;"PL";"PARTIDO LIBERAL";-1;"#NULO";"#NULO";"#NULO";280001682069;"Pelo bem do Brasil";"PP / REPUBLICANOS / PL";"MG";"11/03/1956";"#NULO";2;"MASCULINO";8;"SUPERIOR COMPLETO";9;"DIVORCIADO(A)";"01";"BRANCA";921;"MILITAR REFORMADO";4;"NÃO ELEITO"',
];

describe("lerCandidaturas", () => {
  it("lê o cadastro de cada candidatura, com partido, federação, coligação e data de nascimento", () => {
    const linhas = lerCandidaturas(latin1(`${CABECALHO}\r\n${LINHAS.join("\r\n")}\r\n`));

    expect(linhas).toEqual([
      {
        geracao: "18/10/2026 03:16:38",
        ano: 2022,
        turno: 2,
        cargo: 1,
        sequencial: "280001607829",
        numero: 13,
        nome: "LUIZ INÁCIO LULA DA SILVA",
        nomeUrna: "LULA",
        nascimento: "1945-10-06",
        partido: { numero: 13, sigla: "PT", nome: "PARTIDO DOS TRABALHADORES" },
        federacao: { numero: 2, nome: "Federação Brasil da Esperança - FE BRASIL", sigla: "PT/PC do B/PV", composicao: "PT/PC do B/PV" },
        agremiacao: "COLIGAÇÃO",
        coligacao: {
          sequencial: "280001681359",
          nome: "COLIGAÇÃO BRASIL DA ESPERANÇA",
          composicao:
            "Federação Brasil da Esperança - FE BRASIL (PT / PC do B / PV) / SOLIDARIEDADE / Federação PSOL REDE (PSOL / REDE) / PSB / AGIR / AVANTE / PROS",
        },
      },
      {
        geracao: "18/10/2026 03:16:38",
        ano: 2022,
        turno: 2,
        cargo: 2,
        sequencial: "280001618037",
        numero: 22,
        nome: "WALTER SOUZA BRAGA NETTO",
        nomeUrna: "BRAGA NETTO",
        nascimento: "1956-03-11",
        partido: { numero: 22, sigla: "PL", nome: "PARTIDO LIBERAL" },
        federacao: null,
        agremiacao: "COLIGAÇÃO",
        coligacao: { sequencial: "280001682069", nome: "Pelo bem do Brasil", composicao: "PP / REPUBLICANOS / PL" },
      },
    ]);
  });

  it("acha o zip do ano e, dentro dele, o membro com as candidaturas de abrangência nacional", () => {
    expect(urlCandidaturas(2022)).toBe("https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2022.zip");
    expect(membroCandidaturasDoBrasil("consulta_cand_2022_BRASIL.csv")).toBe(true);
    expect(membroCandidaturasDoBrasil("consulta_cand_2022_SP.csv")).toBe(false);
  });
});
