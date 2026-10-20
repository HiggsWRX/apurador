import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Confere o HTML que o build gera para a página do Brasil: o bloco da lista das pesquisas.
const DIST = new URL("../../dist/", import.meta.url);
const html = readFileSync(new URL("index.html", DIST), "utf8");
const bloco = html.match(/<section[^>]*data-bloco="lista-das-pesquisas"[\s\S]*?<\/section>/)?.[0] ?? "";
// Cada pesquisa vai do seu `data-pesquisa` até o da próxima (os dados do art. 10 são uma lista dentro do item).
const itens = bloco
  .split(/(?=<li[^>]*data-pesquisa=)/)
  .slice(1)
  .map((item) => ({
    registro: item.match(/data-pesquisa="([^"]+)"/)![1]!,
    item,
    texto: item.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "),
  }));
const registrosDoCsv = readFileSync(new URL("../../../../dados/pesquisas.csv", import.meta.url), "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((linha) => linha.split(",")[0]);

describe("lista das pesquisas na página do Brasil", () => {
  it("fica num bloco próprio, recolhido", () => {
    expect(bloco).toMatch(/<details(?![^>]*\bopen\b)[^>]*>/);
    expect(bloco).toMatch(/<summary[^>]*>[\s\S]*Pesquisas registradas no TSE/);
  });

  it("mostra uma pesquisa por linha do pesquisas.csv, e só elas", () => {
    expect(itens.map((i) => i.registro).sort()).toEqual([...registrosDoCsv].sort());
  });

  it("traz os seis dados do art. 10 e o link para a fonte em cada pesquisa", () => {
    expect(itens.length).toBeGreaterThan(0);
    for (const { registro, item, texto } of itens) {
      expect(texto, registro).toMatch(/Período de coleta: \d\d\/\d\d\/2026 a \d\d\/\d\d\/2026/);
      expect(texto, registro).toMatch(/Margem de erro: \d+(,\d+)? pontos? percentua(l|is), para mais ou para menos/);
      expect(texto, registro).toMatch(/Nível de confiança: \d+(,\d+)?%/);
      expect(texto, registro).toMatch(/Entrevistas: \d{1,2}(\.\d{3})*/);
      expect(texto, registro).toMatch(/Contratante: \S/);
      expect(texto, registro).toContain(`Registro no TSE: ${registro}`);
      expect(item, registro).toMatch(/<a[^>]+href="https:\/\/[^"]+"[^>]*>Fonte/);
    }
  });

  it("mostra cada pesquisa como a fonte a publicou (Datafolha de 13 a 15/10)", () => {
    const datafolha = itens.find((i) => i.registro === "BR-00466/2026")!;
    expect(datafolha.texto).toContain("Datafolha");
    expect(datafolha.texto).toContain("FLAVIO BOLSONARO 47%");
    expect(datafolha.texto).toContain("LULA 45%");
    expect(datafolha.texto).toContain("Brancos e nulos 6%");
    expect(datafolha.texto).toContain("Indecisos 2%");
    expect(datafolha.texto).toContain("Período de coleta: 13/10/2026 a 15/10/2026");
    expect(datafolha.texto).toContain("Margem de erro: 2 pontos percentuais, para mais ou para menos");
    expect(datafolha.texto).toContain("Nível de confiança: 95%");
    expect(datafolha.texto).toContain("Entrevistas: 2.520");
    expect(datafolha.texto).toContain("Contratante: Folha de S.Paulo");
    expect(datafolha.item).toContain('href="https://www.moneytimes.com.br/pesquisa-datafolha-15-de-outubro-gaep/"');
  });

  it("nunca mostra uma pesquisa fora do critério", () => {
    // Registradas e divulgadas, mas fora: a Paraná Pesquisas de 14 a 17/10 é do Tocantins, e a AtlasIntel de 3 a 8/10
    // começou o campo antes do 1º turno.
    expect(html).not.toContain("BR-09051/2026");
    expect(html).not.toContain("BR-03663/2026");
  });

  it("não publica o registro das conferências", () => {
    const arquivos = readdirSync(DIST, { recursive: true }).map(String);
    expect(arquivos.filter((a) => /verificac|pesquisas-tse/.test(a))).toEqual([]);
    for (const arquivo of arquivos.filter((a) => /\.(html|js|json|csv)$/.test(a))) {
      expect(readFileSync(new URL(arquivo.replace(/\\/g, "/"), DIST), "utf8"), arquivo).not.toMatch(/conferido_em|tse_sha256/);
    }
  });
});
