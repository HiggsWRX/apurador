import { describe, expect, it } from "vitest";
import { graficoDaNoite, graficoDoAgregado, graficoDoErro, graficoDoPeso } from "../src/lib/graficos-da-metodologia";
import { AGREGADO_CONTRA_RESULTADO, NOITES_REPRODUZIDAS, pesoDasPesquisasCom } from "../src/lib/metodologia";

// A geometria dos gráficos das seções 4 e 6 da página de metodologia (Página de metodologia, decisão 2). As referências
// são as linhas do docs/calibracao/noite-2022-2.csv (o placar parcial mais baixo, 43,68 com 1% das seções; o mais
// alto, 54,34 com 0,1%; a Só apuração 0,0432 acima do resultado com 5%), o resultado oficial (Lula 50,90%), o registro
// do ticket 05 (a faixa mais baixa, a de 2014, começa em 47,7, e a mais alta, a de 2002, acaba em 65,4; em 2018, o
// agregado passou do resultado) e o peso das pesquisas da seção 4 (metade com 0,25% das seções e 4,8% com 5%).
const TAMANHO = { largura: 340, altura: 220 };
const [de2022, de2018] = NOITES_REPRODUZIDAS as [(typeof NOITES_REPRODUZIDAS)[number], (typeof NOITES_REPRODUZIDAS)[number]];
const pontos = (d: string) => [...d.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);

describe("graficoDaNoite", () => {
  const g = graficoDaNoite(de2022, TAMANHO);

  it("cobre o placar parcial da noite inteira, com as marcas de 4 em 4 pontos em volta de 50% e o nome de quem está à frente", () => {
    expect(g.dominio).toEqual([42, 56]);
    expect(g.marcasY.map((m) => m.rotulo)).toEqual(["Bolsonaro 58%", "Bolsonaro 54%", "50%", "Lula 54%"]);
    expect(g.marcasX.map((m) => m.rotulo)).toEqual(["0%", "25%", "50%", "75%", "100%"]);
  });

  it("põe o resultado entre 50% e 54% de Lula, e a projeção termina nele", () => {
    expect(g.yResultado).toBeLessThan(g.y50);
    expect(g.yResultado).toBeGreaterThan(g.marcasY[3]!.posicao);
    expect(pontos(g.projecao).at(-1)![1]).toBeCloseTo(g.yResultado, 1);
  });

  it("põe o rótulo do resultado do lado de onde o placar parcial não vem", () => {
    // Com 50% das seções, o placar parcial de 2022 está abaixo do resultado (49,70 contra 50,90), e o de 2018, acima
    // (56,14 contra 55,13).
    expect(g.rotuloAbaixo).toBe(false);
    expect(graficoDaNoite(de2018, TAMANHO).rotuloAbaixo).toBe(true);
  });

  it("deixa o placar parcial de fora antes da primeira seção e recorta a faixa larga do começo no eixo", () => {
    expect(pontos(g.placar)[0]![0]).toBeGreaterThan(g.area.esquerda);
    expect(pontos(g.projecao)[0]![0]).toBeCloseTo(g.area.esquerda, 6);
    for (const [, y] of pontos(g.faixa)) {
      expect(y).toBeGreaterThanOrEqual(g.area.topo - 0.01);
      expect(y).toBeLessThanOrEqual(g.area.base + 0.01);
    }
  });
});

describe("graficoDoErro", () => {
  const g = graficoDoErro(de2022, TAMANHO);

  it("desenha o erro até 30% das seções, com o erro a favor de Lula acima de zero", () => {
    expect(g.marcasY.map((m) => m.rotulo)).toEqual(["−2", "−1", "0", "+1", "+2"]);
    expect(Math.max(...pontos(g.soApuracao).map(([x]) => x))).toBeCloseTo(g.area.direita, 1);
    // Com 5% das seções, a Só apuração está 0,0432 acima de Lula: um pouco acima do zero, e longe do +1.
    const x5 = g.marcasX.find((m) => m.valor === 5)!.posicao;
    const [, y5] = pontos(g.soApuracao).find(([x]) => Math.abs(x - x5) < 0.5)!;
    expect(y5).toBeLessThan(g.y0);
    expect(y5).toBeGreaterThan(g.marcasY[3]!.posicao);
  });

  it("só existe para a noite com o agregado deslocado", () => {
    expect(() => graficoDoErro(de2018, TAMANHO)).toThrow(/2018/);
  });
});

describe("graficoDoAgregado", () => {
  const g = graficoDoAgregado(AGREGADO_CONTRA_RESULTADO, 340);

  it("tem uma linha por ano, num eixo de 5 em 5 pontos que cobre todas as faixas", () => {
    expect(g.linhas.map((l) => l.doAno.ano)).toEqual([2002, 2006, 2010, 2014, 2018, 2022]);
    expect(g.marcasX.map((m) => m.rotulo)).toEqual(["45%", "50%", "55%", "60%", "65%", "70%"]);
  });

  it("põe o agregado de 2018 à direita do resultado, porque ele passou do resultado", () => {
    const de2018NoGrafico = g.linhas.find((l) => l.doAno.ano === 2018)!;
    expect(de2018NoGrafico.xAgregado).toBeGreaterThan(de2018NoGrafico.xResultado);
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
