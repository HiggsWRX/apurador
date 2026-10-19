import { readFileSync } from "node:fs";
import { lerRegistrosDePesquisas } from "@apurador/tse";
import { describe, expect, it } from "vitest";
import { lerInstitutos, lerPesquisas, verificarPesquisas, type CnpjDaLista, type Pesquisa } from "../src/pesquisas.ts";

// Registros reais do TSE (CSV de 18/10/2026), os mesmos da amostra do leitor do `tse`.
const registros = lerRegistrosDePesquisas(new Uint8Array(readFileSync(new URL("../../tse/test/amostras/pesquisa_eleitoral_2026_BRASIL.csv", import.meta.url))));

const institutos: CnpjDaLista[] = [
  { institutoDaLista: "Datafolha", instituto: "Datafolha", cnpj: "07630546000175", origem: "2º turno de 2022: BR-08297/2022" },
  { institutoDaLista: "Gerp", instituto: "Gerp", cnpj: "05270800000146", origem: "Gerp Mercadologia, nome da Gerp nos registros de 2026" },
  { institutoDaLista: "Paraná Pesquisas", instituto: "Paraná Pesquisas", cnpj: "81908345000140", origem: "2º turno de 2022: BR-09573/2022" },
];

// O Datafolha de 13 a 15/10 (BR-00466/2026), como o Money Times publicou: a mesma linha do dados/pesquisas.csv.
const datafolha: Pesquisa = {
  registro: "BR-00466/2026",
  instituto: "Datafolha",
  contratante: "Folha de S.Paulo",
  campoInicio: "2026-10-13",
  campoFim: "2026-10-15",
  entrevistas: 2520,
  margem: 2,
  confianca: 95,
  modo: "presencial",
  votos: new Map([
    [22, 47],
    [13, 45],
  ]),
  brancosNulos: 6,
  indecisos: 2,
  fonte: "https://www.moneytimes.com.br/pesquisa-datafolha-15-de-outubro-gaep/",
  divulgacao: "2026-10-15",
};

const conferir = (...pesquisas: Pesquisa[]) => verificarPesquisas({ pesquisas, registros, institutos, finalistas: [22, 13], conferidoEm: "2026-10-18T12:00:00Z" });
const divergencias = (p: Partial<Pesquisa>) => conferir({ ...datafolha, ...p })[0]!.divergencias;

describe("verificarPesquisas", () => {
  it("aceita uma pesquisa que bate com o registro do TSE", () => {
    expect(conferir(datafolha)).toEqual([
      { pesquisa: datafolha, registro: expect.objectContaining({ registro: "BR-00466/2026" }), institutoDaLista: "Datafolha", divergencias: [] },
    ]);
  });

  it("dá o instituto da lista pelo CNPJ do registro: a Nexus conta como FSB", () => {
    const nexus = { institutoDaLista: "FSB", instituto: "Nexus", cnpj: "11077560000160", origem: "IPRI, Instituto FSB Pesquisa" };
    const doIpri = registros.map((r) => (r.registro === datafolha.registro ? { ...r, cnpj: nexus.cnpj } : r));
    const [conferencia] = verificarPesquisas({
      pesquisas: [{ ...datafolha, instituto: "Nexus" }],
      registros: doIpri,
      institutos: [...institutos, nexus],
      finalistas: [22, 13],
      conferidoEm: "2026-10-18T12:00:00Z",
    });
    expect(conferencia!.divergencias).toEqual([]);
    expect(conferencia!.institutoDaLista).toBe("FSB");
  });

  it("recusa um registro que não está no CSV do TSE", () => {
    expect(divergencias({ registro: "BR-00949/2026" })).toEqual(["o registro BR-00949/2026 não está no CSV do TSE"]);
  });

  it("recusa um CNPJ fora da lista fechada de institutos", () => {
    // BR-02952/2026 é da Real Time Mídia, que não está na lista deste teste.
    expect(divergencias({ registro: "BR-02952/2026", instituto: "Real Time Big Data" })).toContain(
      "o CNPJ 22345021000181 (REAL TIME MIDIA LTDA) não está na lista fechada de institutos",
    );
  });

  it("aceita um campo divulgado dentro do registrado e recusa um que sai dele", () => {
    expect(divergencias({ campoInicio: "2026-10-14", campoFim: "2026-10-15" })).toEqual([]);
    expect(divergencias({ campoFim: "2026-10-16" })).toEqual(["o campo divulgado (13/10/2026 a 16/10/2026) sai do registrado no TSE (13/10/2026 a 15/10/2026)"]);
    expect(divergencias({ campoInicio: "2026-10-12" })).toEqual(["o campo divulgado (12/10/2026 a 15/10/2026) sai do registrado no TSE (13/10/2026 a 15/10/2026)"]);
  });

  it("aceita entrevistas um pouco diferentes das registradas, que são as previstas, e recusa uma diferença maior", () => {
    // O registro traz a amostra prevista: a AtlasIntel de 3 a 8/10 (BR-03663/2026) registrou 5.000 e divulgou 5.026.
    expect(divergencias({ entrevistas: 2580 })).toEqual([]);
    expect(divergencias({ entrevistas: 2700 })).toEqual(["as entrevistas divulgadas (2700) diferem mais de 5% das registradas no TSE (2520)"]);
    expect(divergencias({ entrevistas: 2000 })).toEqual(["as entrevistas divulgadas (2000) diferem mais de 5% das registradas no TSE (2520)"]);
  });

  it("recusa uma divulgação antes da data liberada pelo TSE", () => {
    expect(divergencias({ divulgacao: "2026-10-14" })).toEqual(["a divulgação (14/10/2026) é anterior à data liberada pelo TSE (15/10/2026)"]);
  });

  it("recusa uma divulgação posterior à conferência", () => {
    expect(divergencias({ divulgacao: "2026-10-19" })).toEqual(["a divulgação (19/10/2026) é posterior à conferência no TSE (18/10/2026)"]);
  });

  it("deixa de fora as pesquisas divulgadas em 25/10", () => {
    const naEleicao = verificarPesquisas({
      pesquisas: [{ ...datafolha, divulgacao: "2026-10-25" }],
      registros,
      institutos,
      finalistas: [22, 13],
      conferidoEm: "2026-10-25T12:00:00Z",
      primeiraConferencia: new Map([[datafolha.registro, "2026-10-24T12:00:00Z"]]),
    });
    expect(naEleicao[0]!.divergencias).toEqual(["a divulgação (25/10/2026) é do dia da eleição ou depois; o agregado congela em 24/10"]);
  });

  describe("congelamento às 23h de 24/10", () => {
    // Cada pesquisa entra na lista na primeira conferência em que aparece. Depois do congelamento, só se retira.
    const conferirEm = (conferidoEm: string, primeiraConferencia?: Map<string, string>) =>
      verificarPesquisas({ pesquisas: [datafolha], registros, institutos, finalistas: [22, 13], conferidoEm, primeiraConferencia })[0]!.divergencias;
    const RECUSA = "a pesquisa entrou na lista depois do congelamento do agregado, às 23h de 24/10/2026: depois dele, só se retira pesquisa";

    it("aceita uma pesquisa incluída até as 23h de 24/10", () => {
      expect(conferirEm("2026-10-24T22:59:00-03:00")).toEqual([]);
    });

    it("aceita, depois do congelamento, uma pesquisa já conferida antes dele", () => {
      expect(conferirEm("2026-10-25T08:00:00-03:00", new Map([[datafolha.registro, "2026-10-24T20:00:00-03:00"]]))).toEqual([]);
    });

    it("recusa uma pesquisa que entra na lista depois do congelamento", () => {
      expect(conferirEm("2026-10-24T23:00:00-03:00")).toEqual([RECUSA]);
      expect(conferirEm("2026-10-25T08:00:00-03:00", new Map([[datafolha.registro, "2026-10-24T23:30:00-03:00"]]))).toEqual([RECUSA]);
    });
  });

  describe("só entram pesquisas nacionais de Presidente do 2º turno, nunca boca de urna", () => {
    const comRegistro = (mudanca: Partial<(typeof registros)[number]>, p: Partial<Pesquisa> = {}) => {
      const alterados = registros.map((r) => (r.registro === datafolha.registro ? { ...r, ...mudanca } : r));
      return verificarPesquisas({ pesquisas: [{ ...datafolha, ...p }], registros: alterados, institutos, finalistas: [22, 13], conferidoEm: "2026-10-18T12:00:00Z" })[0]!.divergencias;
    };

    it("recusa outro cargo", () => {
      expect(comRegistro({ cargo: "Governador" })).toEqual(["o registro é para Governador, não para Presidente"]);
    });

    it("recusa uma pesquisa estadual, pelo plano amostral registrado", () => {
      // A Paraná Pesquisas de 14 a 17/10 é do Tocantins, embora o registro diga UF "BR".
      const parana: Pesquisa = { ...datafolha, registro: "BR-09051/2026", instituto: "Paraná Pesquisas", campoInicio: "2026-10-14", campoFim: "2026-10-17", entrevistas: 1500, divulgacao: "2026-10-19" };
      const [conferencia] = verificarPesquisas({ pesquisas: [parana], registros, institutos, finalistas: [22, 13], conferidoEm: "2026-10-19T12:00:00Z" });
      expect(conferencia!.divergencias).toEqual(["o plano amostral registrado no TSE é de uma UF: só entram pesquisas nacionais"]);
    });

    it("recusa um registro que não diz se a pesquisa é nacional", () => {
      expect(comRegistro({ metodologia: "Pesquisa quantitativa.", planoAmostral: "Amostra por cotas.", municipios: "" })).toEqual([
        "o registro no TSE não diz se a pesquisa é nacional",
      ]);
    });

    it("recusa um campo que começa antes de 05/10", () => {
      expect(comRegistro({ inicio: "2026-10-03" }, { campoInicio: "2026-10-03" })).toEqual(["o campo começa em 03/10/2026, antes de 05/10/2026: só entram pesquisas do 2º turno"]);
    });

    it("recusa boca de urna, pelo campo no dia da eleição ou pela metodologia registrada", () => {
      expect(comRegistro({ fim: "2026-10-25" }, { campoFim: "2026-10-25" })).toContain("o campo vai até o dia da eleição: boca de urna nunca entra");
      expect(comRegistro({ metodologia: "Pesquisa de boca de urna, com entrevistas na saída das seções. Universo: eleitorado brasileiro." })).toEqual([
        "a metodologia registrada no TSE é de boca de urna, que nunca entra",
      ]);
    });
  });

  describe("pega erros de digitação nos números divulgados", () => {
    it("exige os votos dos dois finalistas", () => {
      expect(divergencias({ votos: new Map([[22, 47], [10, 45]]) })).toEqual(["os votos são de 22 e 10, mas os finalistas são 22 e 13"]);
    });

    it("exige que votos, brancos e nulos e indecisos somem perto de 100%", () => {
      expect(divergencias({ votos: new Map([[22, 4.7], [13, 45]]) })).toEqual(["votos, brancos e nulos e indecisos somam 57,7%, não perto de 100%"]);
      expect(divergencias({ brancosNulos: null, indecisos: null })).toEqual([]);
      expect(divergencias({ brancosNulos: null, indecisos: null, votos: new Map([[22, 57], [13, 45]]) })).toEqual(["votos, brancos e nulos e indecisos somam 102%, mais de 100%"]);
    });

    it("exige margem de erro e nível de confiança plausíveis", () => {
      expect(divergencias({ margem: 95, confianca: 2 })).toEqual(["a margem de erro (95) não está entre 0 e 10 pontos", "o nível de confiança (2%) não está entre 90% e 100%"]);
    });
  });

  it("recusa a mesma pesquisa duas vezes", () => {
    expect(conferir(datafolha, datafolha).map((c) => c.divergencias)).toEqual([[], ["o registro BR-00466/2026 aparece mais de uma vez na lista"]]);
  });

  it("recusa uma pesquisa atribuída a outro instituto que não o do CNPJ registrado", () => {
    expect(divergencias({ instituto: "Gerp" })).toEqual(["o CNPJ 07630546000175 do registro é do instituto Datafolha, não de Gerp"]);
  });
});

describe("lerPesquisas", () => {
  const cabecalho = "registro,instituto,contratante,campo_inicio,campo_fim,entrevistas,margem,confianca,modo,votos_22,votos_13,brancos_nulos,indecisos,fonte,divulgacao";
  const linha =
    'BR-00466/2026,Datafolha,"Folha de S.Paulo, TV Globo",2026-10-13,2026-10-15,2520,2,95,presencial,47,45,6,2,https://www.moneytimes.com.br/pesquisa-datafolha-15-de-outubro-gaep/,2026-10-15';

  it("lê cada linha com os votos pelo número do candidato", () => {
    const [p, semSeparados] = lerPesquisas(`${cabecalho}\n${linha}\n${linha.replace("BR-00466", "BR-00467").replace(",6,2,", ",,,")}\n`);
    expect(p).toEqual({ ...datafolha, contratante: "Folha de S.Paulo, TV Globo" });
    expect(semSeparados).toMatchObject({ registro: "BR-00467/2026", brancosNulos: null, indecisos: null });
  });

  it("aceita CRLF e linhas vazias no fim", () => {
    expect(lerPesquisas(`${cabecalho}\r\n${linha}\r\n\r\n`)).toHaveLength(1);
  });

  it("aponta a linha e a coluna de um valor inválido", () => {
    expect(() => lerPesquisas(`${cabecalho}\n${linha.replace(",2520,", ",2.520,")}`)).toThrow("pesquisas.csv, linha 2: entrevistas inválido: 2.520");
    expect(() => lerPesquisas(`${cabecalho}\n${linha.replace(",presencial,", ",boca de urna,")}`)).toThrow("pesquisas.csv, linha 2: modo inválido: boca de urna");
    expect(() => lerPesquisas(`${cabecalho}\n${linha.replace("2026-10-15,2520", "15/10/2026,2520")}`)).toThrow("pesquisas.csv, linha 2: campo_fim inválido: 15/10/2026");
    expect(() => lerPesquisas(`${cabecalho}\n${linha.replace("BR-00466/2026", "BR-0466/2026")}`)).toThrow("pesquisas.csv, linha 2: registro inválido: BR-0466/2026");
    expect(() => lerPesquisas(`${cabecalho}\n${linha.replace("https://www", "www")}`)).toThrow(/pesquisas.csv, linha 2: fonte inválido: www\.moneytimes/);
  });

  it("recusa um cabeçalho sem as colunas esperadas", () => {
    expect(() => lerPesquisas(cabecalho.replace(",margem", ",margem_de_erro"))).toThrow("pesquisas.csv: colunas faltando (margem) ou desconhecidas (margem_de_erro)");
  });
});

describe("lerInstitutos", () => {
  it("lê um CNPJ por linha, com o instituto da lista a que pertence", () => {
    const texto = 'instituto_da_lista,instituto,cnpj,origem\nFSB,Nexus,11077560000160,"Instituto FSB Pesquisa (IPRI), 2º turno de 2018: BR-03689/2018"\n';
    expect(lerInstitutos(texto)).toEqual([{ institutoDaLista: "FSB", instituto: "Nexus", cnpj: "11077560000160", origem: "Instituto FSB Pesquisa (IPRI), 2º turno de 2018: BR-03689/2018" }]);
    expect(() => lerInstitutos("instituto_da_lista,instituto,cnpj,origem\nFSB,Nexus,11.077.560/0001-60,x\n")).toThrow("pesquisas-institutos.csv, linha 2: cnpj inválido: 11.077.560/0001-60");
  });
});
