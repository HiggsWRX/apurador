import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DIST, DIST_CHAVES_DESLIGADAS, elemento, pagina, texto } from "../html";

// Confere o que o build gera para o bloco ao vivo: a ilha em cada página de lugar, já desenhada no estado de antes das
// 17h, e as fotos oficiais servidas pelo próprio site, sem alteração.

const lugares = JSON.parse(readFileSync(new URL("../../../../dados/lugares.json", import.meta.url), "utf8")) as { id: string; nome: string; uf?: string }[];
const campinas = lugares.find((l) => l.nome === "Campinas" && l.uf === "SP")!;

/** A ilha do bloco ao vivo na página, com as props que o Astro serializa para o navegador. */
function ilha(html: string) {
  const elementoDaIlha = elemento(html, /<astro-island[^>]*component-url="[^"]*BlocoAoVivo[^"]*"/);
  const atributo = /props="([^"]*)"/.exec(elementoDaIlha)?.[1] ?? "{}";
  const bruto = JSON.parse(atributo.replaceAll("&quot;", '"').replaceAll("&amp;", "&")) as Record<string, unknown>;
  // O Astro guarda cada valor como [tipo, valor]; 0 é um valor simples, e os objetos repetem o formato por dentro.
  const valor = (v: unknown): unknown => (Array.isArray(v) && v[0] === 0 ? (typeof v[1] === "object" && v[1] !== null ? objeto(v[1] as Record<string, unknown>) : v[1]) : v);
  const objeto = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, valor(v)]));
  return { html: elementoDaIlha, props: objeto(bruto) as { id: string; tipo: string; fotos: Record<string, string>; base: string | null; chaves: Record<string, boolean> } };
}

describe("bloco ao vivo no build", () => {
  it("está em toda página de lugar, com o id do lugar nos arquivos ao vivo", () => {
    expect(ilha(pagina("/")).props).toMatchObject({ id: "BR", tipo: "brasil" });
    expect(ilha(pagina("/sp/")).props).toMatchObject({ id: "SP", tipo: "uf" });
    expect(ilha(pagina("/exterior/")).props).toMatchObject({ id: "ZZ", tipo: "exterior" });
    expect(ilha(pagina("/sp/campinas/")).props).toMatchObject({ id: campinas.id, tipo: "municipio" });
  });

  it("sai desenhado no estado de antes das 17h, sem depender de JavaScript", () => {
    const { html } = ilha(pagina("/sp/campinas/"));
    expect(texto(elemento(html, /<p[^>]*data-manchete/))).toBe("A apuração do 2º turno começa às 17h");
    expect(texto(elemento(html, /<section[^>]*data-placar-oficial/))).toContain("A divulgação começa às 17h");
  });

  it("vem antes do resto do conteúdo principal", () => {
    const principal = elemento(pagina("/"), /<div class="principal"/);
    expect(principal.indexOf("<astro-island")).toBeLessThan(principal.indexOf("data-bloco"));
  });

  it("sem endereço ao vivo no build, não lê nada: fica no estado de antes das 17h", () => {
    expect(ilha(pagina("/")).props.base).toBeNull();
  });

  it("leva as chaves da noite do arquivo de chaves, que valem na página até a primeira rodada do coletor, com os textos preditivos desligados", () => {
    const { noite } = JSON.parse(readFileSync(new URL("../../../../dados/chaves.json", import.meta.url), "utf8")) as { noite: Record<string, boolean> };
    expect(Object.keys(noite).sort()).toEqual(["baseComPesquisas", "mapa", "nucleoMinimo", "projecao", "simulador", "textosPreditivos"]);
    // Desligados até a confirmação por escrito (Segunda consulta jurídica).
    expect(noite.textosPreditivos).toBe(false);
    expect(ilha(pagina("/")).props.chaves).toEqual(noite);
    expect(ilha(pagina("/sp/campinas/")).props.chaves).toEqual(noite);
    // Com o arquivo de chaves desligadas, todas chegam desligadas à ilha, sem código novo.
    const desligadas = ilha(readFileSync(new URL("./index.html", DIST_CHAVES_DESLIGADAS), "utf8")).props.chaves;
    expect(Object.values(desligadas)).toEqual(Object.keys(noite).map(() => false));
  });

  it("serve as fotos oficiais pelo próprio site, iguais às do TSE", () => {
    const { fotos } = ilha(pagina("/")).props;
    for (const sequencial of ["280002551544", "280002542548", "280001607829", "280001618036"]) {
      const url = fotos[sequencial];
      expect(url, sequencial).toMatch(/^\//);
      const servida = readFileSync(new URL(`.${url}`, DIST));
      expect(servida.equals(readFileSync(new URL(`../../../../dados/fotos/${sequencial}.jpeg`, import.meta.url))), sequencial).toBe(true);
    }
  });
});
