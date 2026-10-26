import { beforeAll, describe, expect, it } from "vitest";
import type { ArquivoDoLugar } from "@apurador/coletor";
import { ARQUIVOS_AO_VIVO, conferirNarracao, soDoLugar, LUGARES_DO_TSE, noiteComQuedas, type Gravacao, type NoiteComQuedas } from "./noite-com-quedas.ts";

// Uma parada longa no replay com quedas (Narração da noite, decisão 11; Operação na noite, decisão 4): o coletor fica
// 100 min fora e volta do objeto da noite, numa outra máquina. Num arquivo próprio, pela memória (`noite-com-quedas.ts`).

describe("uma parada longa", () => {
  // O coletor parte a frio às 17:30, cai às 17:57, com o Brasil logo depois de 25%, e só volta às 19:37, do objeto da
  // noite. No meio, o Brasil passou de 50, 75, 90 e 95%, Lula passou à frente às 18:44 e Minas Gerais virou para
  // Bolsonaro às 17:58 e de volta para Lula às 19:35 (medição de 2022, seções 1 e 3).
  let r: NoiteComQuedas;
  beforeAll(async () => {
    r = await noiteComQuedas("2022-10-30 17:30:00", "2022-10-30 19:45:00", [{ em: "2022-10-30 17:57:00", de: "objeto da noite", fora: 100 * 60 }]);
  }, 600_000);

  it("parte a frio gravando cada arquivo ao vivo uma vez, e de novo só os municípios com novidade do TSE", () => {
    // A partida vai até todo lugar ter sido gravado, ao ritmo dos pedidos ao TSE.
    const vistos = new Set<string>();
    const fim = r.gravacoes.findIndex((g) => g.caminho.startsWith("lugares/") && vistos.add(g.caminho).size === LUGARES_DO_TSE);
    expect(fim).toBeGreaterThan(0);
    expect(new Set(r.gravacoes.slice(0, r.voltas[0]!.gravacao).map((g) => g.caminho)).size).toBe(ARQUIVOS_AO_VIVO);
    // Um município gravado de novo na partida é um que teve novidade do TSE nela: nenhum vai duas vezes com a mesma hora.
    const horas = new Map<string, Set<string | null>>();
    const municipios = r.gravacoes.slice(0, fim + 1).filter((g) => /^lugares\/\d+\.json$/.test(g.caminho)) as (Gravacao & { conteudo: ArquivoDoLugar })[];
    for (const g of municipios) horas.set(g.caminho, (horas.get(g.caminho) ?? new Set()).add(g.conteudo.tse.totalizacao));
    expect(municipios.length).toBe([...horas.values()].reduce((soma, h) => soma + h.size, 0));
  });

  it("na volta, narra no Brasil só o marco mais alto que ele cruzou e a virada, com o % e a hora observados", () => {
    const brasil = soDoLugar("BR", r.publicado("BR")!.narracao).reverse();
    expect(brasil.filter((e) => e.tipo === "marco").map((e) => e.marco)).toEqual([10, 25, 95]);
    const [marco, virada] = [brasil.find((e) => e.marco === 95)!, brasil.find((e) => e.tipo === "virada")!];
    expect(marco.quando >= "2022-10-30 19:36:00").toBe(true);
    expect(virada.quando >= "2022-10-30 19:36:00").toBe(true);
    expect(virada.texto).toMatch(/^Virada no Brasil: Lula passa à frente no placar parcial, com 9\d,\d\d% das seções totalizadas\.$/);
    expect(conferirNarracao(r)).toEqual([]);
  });

  it("uma virada que aconteceu e se desfez durante a parada não aparece: Minas Gerais", () => {
    expect(soDoLugar("MG", r.publicado("MG")!.narracao).filter((e) => e.tipo === "virada")).toEqual([]);
    expect(r.publicado("BR")!.narracao.filter((e) => e.lugar === "MG" && e.tipo === "virada")).toEqual([]);
  });
});
