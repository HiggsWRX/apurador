import { describe, expect, it } from "vitest";
import { graficoDaNoite, graficoDoAgregado, graficoDoErro, graficoDoPeso } from "../src/lib/graficos-da-metodologia";
import { AGREGADO_CONTRA_RESULTADO, NOITES_REPRODUZIDAS, pesoDasPesquisasCom } from "../src/lib/metodologia";

// A geometria dos gráficos das seções 4 e 6 da página de metodologia (Página de metodologia, decisão 2). As referências
// são as linhas do docs/calibracao/noite-2022-2.csv (o placar parcial mais baixo, 43,68 com 1% das seções; o mais
// alto, 54,34 com 0,1%), o resultado oficial (Lula 50,90%) e o peso das pesquisas da seção 4 (metade com 0,25% das
// seções e 4,8% com 5%, com o K congelado).
const TAMANHO = { largura: 340, altura: 220 };
const [de2022, de2018] = NOITES_REPRODUZIDAS as [(typeof NOITES_REPRODUZIDAS)[number], (typeof NOITES_REPRODUZIDAS)[number]];
const numeros = (d: string) => [...d.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);

describe("graficoDaNoite", () => {
  const g = graficoDaNoite(de2022, (m) => m.comPesquisas, TAMANHO);

  it("cobre o placar parcial da noite inteira, com as marcas de 4 em 4 pontos em volta de 50% e o nome de quem está à frente", () => {
    expect(g.dominio).toEqual([42, 56]);
    expect(g.marcasY.map((m) => m.rotulo)).toEqual(["Bolsonaro 58%", "Bolsonaro 54%", "50%", "Lula 54%"]);
    expect(g.marcasX.map((m) => m.rotulo)).toEqual(["0%", "25%", "50%", "75%", "100%"]);
  });

  it("põe o resultado entre 50% e 54% de Lula, e o placar e a projeção terminam nele", () => {
    expect(g.yResultado).toBeLessThan(g.y50);
    expect(g.yResultado).toBeGreaterThan(g.marcasY[3]!.posicao);
    expect(numeros(g.placar).at(-1)![1]).toBeCloseTo(g.yResultado, 1);
    expect(numeros(g.projecao).at(-1)![1]).toBeCloseTo(g.yResultado, 1);
    expect(numeros(g.placar).at(-1)![0]).toBeCloseTo(g.area.direita, 1);
  });

  it("começa o placar parcial na primeira seção e recorta a faixa larga do começo no eixo", () => {
    expect(numeros(g.placar)).toHaveLength(de2022.momentos.length - 1);
    expect(numeros(g.projecao)).toHaveLength(de2022.momentos.length);
    for (const [, y] of numeros(g.faixa)) {
      expect(y).toBeGreaterThanOrEqual(g.area.topo - 0.01);
      expect(y).toBeLessThanOrEqual(g.area.base + 0.01);
    }
  });
});

describe("graficoDoErro", () => {
  it("desenha o erro até 30% das seções, com o zero no meio", () => {
    const g = graficoDoErro(de2022, TAMANHO);
    expect(g.marcasY.map((m) => m.rotulo)).toEqual(["−2", "−1", "0", "+1", "+2"]);
    expect(g.y0).toBeCloseTo((g.area.topo + g.area.base) / 2, 6);
    expect(Math.max(...numeros(g.soApuracao).map(([x]) => x))).toBeCloseTo(g.area.direita, 1);
  });

  it("só existe para a noite com o agregado deslocado", () => {
    expect(() => graficoDoErro(de2018, TAMANHO)).toThrow(/2018/);
  });
});

describe("graficoDoAgregado", () => {
  const g = graficoDoAgregado(AGREGADO_CONTRA_RESULTADO, 340);

  it("tem uma linha por ano, com o resultado dentro da faixa de 95%", () => {
    expect(g.linhas.map((l) => l.ano.ano)).toEqual([2002, 2006, 2010, 2014, 2018, 2022]);
    for (const l of g.linhas) {
      expect(l.resultado, String(l.ano.ano)).toBeGreaterThan(l.faixa[0]);
      expect(l.resultado, String(l.ano.ano)).toBeLessThan(l.faixa[1]);
    }
  });

  it("vai de 5 em 5 pontos e passa por 50%", () => {
    expect(g.marcasX.map((m) => m.valor)).toContain(50);
    expect(g.marcasX.every((m) => m.valor % 5 === 0)).toBe(true);
    expect(g.x50).toBeCloseTo(g.marcasX.find((m) => m.valor === 50)!.posicao, 6);
  });
});

describe("graficoDoPeso", () => {
  it("marca a metade com K e o peso com 5% das seções", () => {
    const g = graficoDoPeso(pesoDasPesquisasCom, 0.25, TAMANHO);
    expect(g.pontos.map((p) => [p.secoes, Number((100 * p.peso).toFixed(1))])).toEqual([
      [0.25, 50],
      [5, 4.8],
    ]);
    expect(g.pontos[0]!.y).toBeCloseTo(g.marcasY[1]!.posicao, 6);
  });
});
