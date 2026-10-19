import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ArquivoDoTseInvalido, eleicaoDaConfiguracao, lerAcompanhamento, lerResultado, urlDasEleicoes, urlsDaDivulgacao } from "../src/index.ts";

// Os arquivos reais da divulgação de 2026, baixados de resultados.tse.jus.br em 19/10/2026 (os do TSE falso
// são conferidos com os mesmos): os finais do 1º turno (eleição 6257) e os zerados do 2º (6258). Os números
// esperados são os da pesquisa da API ao vivo (.scratch/apurador-2026/research/01-api-ao-vivo-tse.md, seção 9).

const AMOSTRAS = new URL("../../ensaio/test/amostras/tse/", import.meta.url);
const amostra = (caminho: string) => new Uint8Array(readFileSync(new URL(caminho, AMOSTRAS)));

describe("lerResultado", () => {
  it("lê o Brasil do 1º turno na totalização final: a hora, as seções, o eleitorado, os votos e cada candidato", () => {
    const brasil = lerResultado(amostra("6257/br-c0001-e006257-u.json"));

    expect(brasil).toMatchObject({
      eleicao: "6257",
      abrangencia: { tipo: "br", codigo: "br" },
      ultimaTotalizacao: "2026-10-05 12:51:05",
      totalizacaoFinal: true,
      indicacao: false,
      secoes: { totalizadas: 499_248, total: 499_248, percentual: 100 },
      eleitorado: { total: 158_745_502, totalizado: 158_745_502, comparecimento: 125_275_835 },
      votos: { validos: 119_300_788, brancos: 2_300_798, nulos: 3_674_249 },
    });
    expect(brasil.candidatos.find((c) => c.numero === 22)).toEqual({
      numero: 22,
      sequencial: "280002551544",
      nomeUrna: "FLAVIO BOLSONARO",
      partido: "PL",
      votos: 56_104_503,
      percentual: 47.03,
    });
    expect(brasil.candidatos.find((c) => c.numero === 13)).toMatchObject({ nomeUrna: "LULA", partido: "PT", votos: 53_879_538, percentual: 45.16 });
  });

  it("lê o Brasil do 2º turno zerado: sem hora de totalização, sem indicação e com os dois candidatos a zero", () => {
    const brasil = lerResultado(amostra("6258/br-c0001-e006258-u.json"));

    expect(brasil).toMatchObject({
      eleicao: "6258",
      ultimaTotalizacao: null,
      totalizacaoFinal: false,
      indicacao: false,
      secoes: { totalizadas: 0, total: 499_248, percentual: 0 },
    });
    expect(brasil.candidatos.map((c) => [c.numero, c.nomeUrna, c.votos, c.percentual])).toEqual(
      expect.arrayContaining([
        [22, "FLAVIO BOLSONARO", 0, 0],
        [13, "LULA", 0, 0],
      ]),
    );
    expect(brasil.candidatos).toHaveLength(2);
  });

  it("lê a zona com a abrangência e o código de quatro dígitos", () => {
    const zona = lerResultado(amostra("6257/sp71072-z0001-c0001-e006257-u.json"));

    expect(zona).toMatchObject({ abrangencia: { tipo: "zona", codigo: "0001" }, secoes: { totalizadas: 449, total: 449, percentual: 100 } });
  });

  // O TSE falso só escreve `md = "e"`; o TSE de verdade pode mandar `md = "n"` antes da indicação (ticket 15).
  it('só `md = "e"` é a indicação do TSE', () => {
    const zerado = new TextDecoder().decode(amostra("6258/br-c0001-e006258-u.json"));
    const comMd = (md: string) => new TextEncoder().encode(zerado.replace(`"and" : "n", `, `"and" : "p", "md" : "${md}", `));

    expect(lerResultado(comMd("e")).indicacao).toBe(true);
    expect(lerResultado(comMd("n")).indicacao).toBe(false);
  });

  it("falha com um erro tipado num arquivo de outro formato, em vez de devolver um placar errado", () => {
    const zerado = new TextDecoder().decode(amostra("6258/br-c0001-e006258-u.json"));

    expect(() => lerResultado(new TextEncoder().encode(zerado.replace(`"pst" : "0,00"`, `"pst" : "0.00"`)))).toThrow(ArquivoDoTseInvalido);
    expect(() => lerResultado(new TextEncoder().encode(zerado.replace(`"s" :`, `"x" :`)))).toThrow(ArquivoDoTseInvalido);
    expect(() => lerResultado(new TextEncoder().encode("<?xml"))).toThrow(ArquivoDoTseInvalido);
  });
});

describe("lerAcompanhamento", () => {
  it("lê o índice do Brasil: cada UF, com o Exterior, e o próprio Brasil, com a hora da última totalização e as seções", () => {
    const indice = lerAcompanhamento(amostra("6257/br-e006257-ab.json"));

    expect(indice.eleicao).toBe("6257");
    expect(indice.itens).toHaveLength(29);
    expect(indice.itens.slice(-2)).toEqual([
      { abrangencia: { tipo: "uf", codigo: "zz" }, ultimaTotalizacao: "2026-10-05 09:19:47", secoes: { totalizadas: 1351, total: 1351, percentual: 100 } },
      { abrangencia: { tipo: "br", codigo: "br" }, ultimaTotalizacao: "2026-10-05 12:51:05", secoes: { totalizadas: 499_248, total: 499_248, percentual: 100 } },
    ]);
  });

  it("lê o índice de uma UF: os municípios, com o código de cinco dígitos, e a UF por último", () => {
    const indice = lerAcompanhamento(amostra("6257/ac-e006257-ab.json"));

    expect(indice.itens[0]).toEqual({
      abrangencia: { tipo: "mu", codigo: "01007" },
      ultimaTotalizacao: "2026-10-04 17:17:32",
      secoes: { totalizadas: 41, total: 41, percentual: 100 },
    });
    expect(indice.itens.at(-1)!.abrangencia).toEqual({ tipo: "uf", codigo: "ac" });
  });

  it("no 2º turno zerado, nenhum lugar tem hora de totalização", () => {
    const indice = lerAcompanhamento(amostra("6258/br-e006258-ab.json"));

    expect(indice.itens.every((i) => i.ultimaTotalizacao === null && i.secoes.totalizadas === 0)).toBe(true);
  });
});

describe("eleicaoDaConfiguracao", () => {
  it("acha no ele-c.json o ciclo, o pleito, o dia e o turno de uma eleição", () => {
    expect(eleicaoDaConfiguracao(amostra("comum/ele-c.json"), "6258")).toEqual({ codigo: "6258", ciclo: "ele2026", pleito: "3221", dia: "2026-10-25", turno: 2 });
  });

  it("falha com uma eleição que não está na configuração", () => {
    expect(() => eleicaoDaConfiguracao(amostra("comum/ele-c.json"), "9999")).toThrow(ArquivoDoTseInvalido);
  });
});

describe("urlsDaDivulgacao", () => {
  // As URLs medidas com 200 em 17 e 18/10/2026 (pesquisa da API ao vivo, seção 1.3).
  it("monta as URLs do 2º turno a partir da base, do ciclo e da eleição", () => {
    const base = "https://resultados.tse.jus.br/oficial";
    const urls = urlsDaDivulgacao(base, { codigo: "6258", ciclo: "ele2026" });

    expect(urlDasEleicoes(base)).toBe("https://resultados.tse.jus.br/oficial/comum/config/ele-c.json");
    expect(urls.municipios).toBe("https://resultados.tse.jus.br/oficial/ele2026/6258/config/mun-e006258-cm.json");
    expect(urls.acompanhamento(null)).toBe("https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-e006258-ab.json");
    expect(urls.acompanhamento("SP")).toBe("https://resultados.tse.jus.br/oficial/ele2026/6258/dados/sp/sp-e006258-ab.json");
    expect(urls.resultado({})).toBe("https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json");
    expect(urls.resultado({ uf: "ZZ" })).toBe("https://resultados.tse.jus.br/oficial/ele2026/6258/dados/zz/zz-c0001-e006258-u.json");
    expect(urls.resultado({ uf: "SP", municipio: 71072 })).toBe("https://resultados.tse.jus.br/oficial/ele2026/6258/dados/sp/sp71072-c0001-e006258-u.json");
    expect(urls.resultado({ uf: "ZZ", municipio: 29254 })).toBe("https://resultados.tse.jus.br/oficial/ele2026/6258/dados/zz/zz29254-c0001-e006258-u.json");
    expect(urls.resultado({ uf: "SP", municipio: 71072, zona: 1 })).toBe("https://resultados.tse.jus.br/oficial/ele2026/6258/dados/sp/sp71072-z0001-c0001-e006258-u.json");
    expect(urls.resultado({ uf: "AC", municipio: 1120 })).toBe("https://resultados.tse.jus.br/oficial/ele2026/6258/dados/ac/ac01120-c0001-e006258-u.json");
  });
});
