import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DIST, elemento, elementos, existe, pagina, texto } from "../html";

// Confere o que o build gera: as páginas de lugar estáticas, com o histórico já no HTML.
const lugares = JSON.parse(readFileSync(new URL("../../../../dados/lugares.json", import.meta.url), "utf8")) as { id: string; tipo: string }[];

const turno = (html: string, id: string) => elemento(html, new RegExp(`<div[^>]*data-turno="${id}"`));
const barras = (html: string) =>
  elementos(html, /<li[^>]*data-barra/).map((b) => ({
    nome: texto(elemento(b, /<span class="b-nome"/).replace(/<small>[^<]*<\/small>/, "")),
    texto: texto(b),
    cor: /data-cor="([a-z]+)"/.exec(b)?.[1],
  }));

describe("páginas de lugar", () => {
  it("existem para o Brasil, as 27 UFs, o Exterior e todos os municípios", () => {
    // As páginas de metodologia e do simulador não são de lugar: ficam fora da conta.
    const paginas = readdirSync(DIST, { recursive: true, encoding: "utf8" }).filter(
      (f) => f.endsWith("index.html") && !f.startsWith("metodologia") && !f.startsWith("simulador"),
    );

    expect(paginas).toHaveLength(lugares.length);
    for (const caminho of ["/", "/sp/", "/df/", "/exterior/", "/sp/sao-paulo/", "/sp/campinas/", "/mt/boa-esperanca-do-norte/", "/exterior/lisboa/"]) {
      expect(existe(`${caminho}index.html`), caminho).toBe(true);
    }
  });

  it("dizem o nome do lugar sem ambiguidade", () => {
    expect(texto(elemento(pagina("/sp/"), /<h1/))).toBe("Estado de São Paulo");
    expect(texto(elemento(pagina("/sp/sao-paulo/"), /<h1/))).toBe("São Paulo (SP)");
    expect(texto(elemento(pagina("/exterior/lisboa/"), /<h1/))).toBe("Lisboa (Exterior)");
    expect(pagina("/sp/sao-paulo/")).toContain("<title>São Paulo (SP) · Apurador</title>");
  });

  it("trazem a trilha Brasil › UF › município no cabeçalho", () => {
    const trilha = elemento(pagina("/sp/campinas/"), /<nav[^>]*class="trilha"/);

    expect(texto(trilha)).toBe("Brasil › São Paulo › Campinas");
    expect(trilha).toContain('href="/"');
    expect(trilha).toContain('href="/sp/"');
    expect(texto(elemento(pagina("/exterior/lisboa/"), /<nav[^>]*class="trilha"/))).toBe("Brasil › Exterior › Lisboa");
    expect(texto(elemento(pagina("/ba/"), /<nav[^>]*class="trilha"/))).toBe("Brasil › Bahia");
  });

  it("têm a busca de município ou estado no topo, com o índice dos lugares publicado", () => {
    const topo = elemento(pagina("/rs/"), /<header[^>]*class="topo"/);

    expect(topo).toMatch(/<input[^>]*type="search"/);
    expect(texto(topo)).toContain("Buscar município ou estado");
    const indice = JSON.parse(readFileSync(new URL("busca.json", DIST), "utf8")) as [string, string, string][];
    expect(indice).toHaveLength(lugares.length);
    expect(indice).toContainEqual(["São Paulo (SP)", "/sp/sao-paulo/", "São Paulo"]);
    expect(indice).toContainEqual(["Estado de São Paulo", "/sp/", "São Paulo"]);
    expect(indice).toContainEqual(["Distrito Federal", "/df/", "Distrito Federal"]);
    expect(indice[0]).toEqual(["Brasil", "/", "Brasil"]);
  });

  it("reservam a coluna da narração ao lado da principal, numa ilha que sai com o texto de antes das 17h", () => {
    const html = pagina("/sp/campinas/");

    expect(html).toMatch(/<div[^>]*class="principal"/);
    const ilha = elemento(html, /<astro-island[^>]*component-url="[^"]*NarracaoDaNoite[^"]*"/);
    expect(texto(elemento(ilha, /<aside[^>]*id="narracao"/))).toBe(
      "Narração da noite A narração começa às 17h, com as primeiras seções totalizadas. Narração do Apurador com dados do TSE",
    );
  });
});

describe("histórico do lugar", () => {
  it("tem um botão por turno, do mais recente ao mais antigo, com o 2026 2T aberto", () => {
    const botoes = elementos(pagina("/sp/campinas/"), /<button[^>]*data-turno-botao/);

    expect(botoes.map(texto)).toEqual(["2026 2T", "2026 1T", "2022 2T", "2022 1T", "2018 2T", "2018 1T"]);
    expect(botoes[0]).toContain('aria-pressed="true"');
    expect(turno(pagina("/sp/campinas/"), "2026-2")).toContain("data-ativo");
  });

  it("mostra o 2026 2T do último estado da noite, com o aviso de provisório só nele", () => {
    // A totalização final do TSE na noite de 25/10 (docs/noite/2026-10-25.md, "Resultado").
    const brasil = turno(pagina("/"), "2026-2");
    expect(texto(brasil)).toContain("LULA PT 51,79% 64.256.232 votos");
    expect(texto(brasil)).toContain("FLAVIO BOLSONARO PL 48,21% 59.826.041 votos");
    expect(texto(elemento(brasil, /<p[^>]*data-provisorio/))).toBe("Provisório, até os arquivos oficiais do TSE. Vem da totalização final divulgada na noite.");

    expect(turno(pagina("/"), "2026-1")).not.toContain("data-provisorio");
    expect(turno(pagina("/sp/campinas/"), "2026-2")).toContain("data-provisorio");
  });

  it('mostra nos 1º turnos os 5 maiores e "demais", e nos 2º turnos os dois candidatos', () => {
    const html = pagina("/");

    expect(barras(turno(html, "2018-1"))).toHaveLength(6);
    expect(barras(turno(html, "2018-1"))[5]!.texto).toMatch(/^Demais candidatos \(8\)/);
    expect(barras(turno(html, "2022-1"))[5]!.texto).toMatch(/^Demais candidatos \(6\)/);
    expect(barras(turno(html, "2022-2"))).toHaveLength(2);
  });

  it("dá ao PT a cor de Lula, ao PSL e ao PL a de Flávio, e cinza aos demais", () => {
    const html = pagina("/");

    expect(barras(turno(html, "2018-2")).map((b) => [b.nome, b.cor])).toEqual([
      ["JAIR BOLSONARO", "flavio"],
      ["FERNANDO HADDAD", "lula"],
    ]);
    expect(barras(turno(html, "2026-1")).map((b) => b.cor)).toEqual(["flavio", "lula", "cinza", "cinza", "cinza", "cinza"]);
  });

  it("mantém em toda página a ordem dos candidatos do Brasil, com Flávio antes de Lula em 2026", () => {
    const nomes = (caminho: string, id: string) => barras(turno(pagina(caminho), id)).map((b) => b.nome);

    // Lula venceu na Bahia em 2026, e Bolsonaro no estado de São Paulo em 2022.
    expect(nomes("/ba/", "2026-1").slice(0, 2)).toEqual(["FLAVIO BOLSONARO", "LULA"]);
    expect(nomes("/ba/", "2026-1")).toEqual(nomes("/", "2026-1"));
    expect(nomes("/sp/", "2022-2")).toEqual(["LULA", "JAIR BOLSONARO"]);
  });

  it("mostra os números do TSE com duas casas", () => {
    const brasil = texto(turno(pagina("/"), "2022-2"));
    expect(brasil).toContain("LULA PT 50,90% 60.345.999 votos");
    expect(brasil).toContain("JAIR BOLSONARO PL 49,10% 58.206.354 votos");
    expect(brasil).toContain("Comparecimento 79,42%");
    expect(brasil).toContain("Aptos 156.454.011");

    expect(texto(turno(pagina("/sp/sao-paulo/"), "2022-2"))).toContain("LULA PT 53,54%");
  });

  it("avisa nos turnos em que o lugar não votou, como Boa Esperança do Norte (MT) antes de 2026", () => {
    const html = pagina("/mt/boa-esperanca-do-norte/");

    expect(barras(turno(html, "2026-1")).length).toBe(6);
    expect(texto(turno(html, "2022-2"))).toContain("Boa Esperança do Norte (MT) não teve votação neste turno.");
  });
});

describe("comparação de dois turnos", () => {
  const comparacao = (html: string) => elemento(html, /<div[^>]*data-comparacao/);
  const par = (html: string, id: string) => elemento(comparacao(html), new RegExp(`<div[^>]*data-par="${id}"`));
  const linhas = (html: string) => elementos(html, /<tr[^>]*data-cor/).map((l) => [texto(l), /data-cor="([a-z]+)"/.exec(l)?.[1]]);
  const mudou = (html: string) =>
    elementos(html, /<li[^>]*data-mudou/).map((m) => [texto(m), /href="([^"]+)"/.exec(m)?.[1], /data-cor="([a-z]+)"/.exec(m)?.[1]]);

  it("deixa escolher quaisquer dois dos seis turnos, com 2026 1T e 2026 2T de partida", () => {
    const html = pagina("/sp/campinas/");
    const escolhas = elementos(comparacao(html), /<select[^>]*data-comparar/);

    expect(escolhas).toHaveLength(2);
    for (const escolha of escolhas)
      expect(elementos(escolha, /<option/).map(texto)).toEqual(["2026 2T", "2026 1T", "2022 2T", "2022 1T", "2018 2T", "2018 1T"]);
    expect(escolhas.map((e) => /<option[^>]*value="([^"]+)"[^>]*selected/.exec(e)?.[1])).toEqual(["2026-1", "2026-2"]);
    // Os 15 pares de turnos já estão no HTML, e o de partida aparece.
    expect(elementos(comparacao(html), /<div[^>]*data-par=/)).toHaveLength(15);
    expect(par(html, "2026-1_2026-2")).toMatch(/^<div[^>]*data-ativo/);
    expect(par(html, "2018-1_2018-2")).not.toMatch(/^<div[^>]*data-ativo/);
  });

  it("avisa que o 2026 2T é provisório em todo par que o tem, e só neles", () => {
    const html = pagina("/");

    expect(texto(elemento(par(html, "2026-1_2026-2"), /<p[^>]*data-provisorio/))).toBe("2026 2T: provisório, até os arquivos oficiais do TSE.");
    expect(par(html, "2018-2_2026-2")).toContain("data-provisorio");
    expect(par(html, "2022-2_2026-1")).not.toContain("data-provisorio");
  });

  it("compara só o PT, na cor de Lula, e o partido de Bolsonaro, na de Flávio, rotulados pelo partido", () => {
    // Resultados oficiais: 2018 2T, Bolsonaro 55,13% e Haddad 44,87%; 2022 2T, Lula 50,90% e Bolsonaro 49,10%.
    const brasil = par(pagina("/"), "2018-2_2022-2");

    expect(texto(elemento(brasil, /<thead/))).toBe("Partido 2018 2T 2022 2T Mudança");
    expect(linhas(brasil)).toEqual([
      ["PSL/PL JAIR BOLSONARO 55,13% 49,10% −6,0", "flavio"],
      ["PT FERNANDO HADDAD → LULA 44,87% 50,90% +6,0", "lula"],
    ]);
  });

  it("usa nos 1º turnos o placar entre finalistas, um cálculo do Apurador, com uma casa", () => {
    // 2026 1T: Flávio 51,0 e Lula 49,0 entre os finalistas (GLOSSARY.md).
    expect(linhas(par(pagina("/"), "2022-2_2026-1"))).toEqual([
      ["PL JAIR BOLSONARO → FLAVIO BOLSONARO 49,10% 51,0% +1,9", "flavio"],
      ["PT LULA 50,90% 49,0% −1,9", "lula"],
    ]);
    expect(texto(comparacao(pagina("/")))).toContain("Cálculo do Apurador com dados do TSE");
  });

  it("mostra onde mais mudou: as UFs, na página do Brasil, e os municípios, na da UF", () => {
    // O % do PT no 2º turno de 2018 e no de 2022, nos resultados oficiais: Exterior 28,98 e 51,28; SP 32,03 e 44,76.
    const brasil = mudou(par(pagina("/"), "2018-2_2022-2"));
    expect(brasil.slice(0, 2)).toEqual([
      ["Exterior PT +22,3", "/exterior/", "lula"],
      ["São Paulo PT +12,7", "/sp/", "lula"],
    ]);
    expect(brasil).toHaveLength(5);

    const sp = par(pagina("/sp/"), "2022-2_2026-1");
    expect(mudou(sp)).toHaveLength(5);
    for (const [, caminho] of mudou(sp)) expect(caminho).toMatch(/^\/sp\/[a-z-]+\/$/);
    expect(texto(sp)).toContain("Entre os municípios com ao menos 3.000 votos nos dois partidos em cada turno.");

    expect(mudou(comparacao(pagina("/sp/campinas/")))).toEqual([]);
  });

  it("avisa quando o lugar não votou num dos dois turnos, ou em nenhum", () => {
    const html = pagina("/mt/boa-esperanca-do-norte/");

    expect(texto(par(html, "2022-2_2026-1"))).toContain("Boa Esperança do Norte (MT) não teve votação no 2º turno de 2022.");
    expect(texto(par(html, "2018-1_2022-1"))).toContain("Boa Esperança do Norte (MT) não teve votação no 1º turno de 2018 nem no 1º turno de 2022.");
  });
});

describe("rodapé", () => {
  const rodape = texto(elemento(pagina("/sp/campinas/"), /<footer/));

  it("traz o responsável, a independência, a atribuição do TSE e a da malha e o aviso sobre a projeção", () => {
    expect(rodape).toContain("Responsável: Hiago de Oliveira · contato@apurador.org");
    expect(rodape).toContain("independente do TSE, dos candidatos e dos partidos");
    expect(rodape).toMatch(/Fonte: TSE.*CC-BY/);
    expect(rodape).toContain("Malha: IBGE, Malha Municipal Digital 2024, CC BY 4.0, simplificada pelo Apurador");
    expect(rodape).toContain("Estimativa do Apurador. Não é resultado oficial nem garantia do resultado.");
  });

  it("não traz CPF nem endereço", () => {
    expect(rodape).not.toMatch(/CPF|\d{3}\.\d{3}\.\d{3}-\d{2}|CEP|Rua |Avenida /);
  });
});

describe("identidade visual", () => {
  const css = readdirSync(new URL("_astro/", DIST))
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(new URL(`_astro/${f}`, DIST), "utf8"))
    .join("\n");

  // Flávio passou de laranja a verde-azulado em 25/10, porque o laranja parecia vermelho (Telas da página de lugar, comentário de 25/10).
  it("usa verde-azulado para Flávio e roxo para Lula, nos temas claro e escuro", () => {
    for (const cor of ["#0d9488", "#1aa898", "#6d28d9", "#a68bf7"]) expect(css.toLowerCase()).toContain(cor);
  });

  it("segue o tema do sistema, com um botão para trocar", () => {
    expect(css).toContain("prefers-color-scheme:dark");
    expect(pagina("/")).toMatch(/<button[^>]*data-tema-botao/);
  });

  it("usa Source Serif nos títulos, Inter no resto e algarismos de largura fixa", () => {
    expect(css).toMatch(/font-family:\s*["']?Source Serif 4 Variable/);
    expect(css).toMatch(/font-family:\s*["']?Inter Variable/);
    expect(css).toContain("tabular-nums");
  });
});
