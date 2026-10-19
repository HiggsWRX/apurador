import { describe, expect, it } from "vitest";
import { historicoDoAgregado, raizDoErroQuadraticoMedio, type EleicaoPassada } from "../src/index.ts";

// Três eleições inventadas, cada uma com uma pesquisa só na véspera, para a conta sem cada ano caber de cabeça:
// os erros são +2, −1 e +2.
const eleicao = (ano: number, dia: string, vespera: string, primeiro: number, resultado: number): EleicaoPassada => ({
  ano,
  dia,
  resultado,
  pesquisas: [{ registro: `BR-00001/${ano}`, instituto: "Datafolha", campoFim: vespera, divulgacao: vespera, votos: [primeiro, 100 - primeiro] }],
});
const ELEICOES = [eleicao(2010, "2010-10-31", "2010-10-30", 52, 50), eleicao(2014, "2014-10-26", "2014-10-25", 49, 50), eleicao(2018, "2018-10-28", "2018-10-27", 55, 53)];

describe("histórico do agregado", () => {
  it("dá, em cada ano, o agregado congelado na véspera e o erro contra o resultado", () => {
    const historico = historicoDoAgregado(ELEICOES);
    expect(historico.map((a) => [a.ano, a.agregado.dia, a.agregado.valor, a.erro])).toEqual([
      [2010, "2010-10-31", 52, 2],
      [2014, "2014-10-26", 49, -1],
      [2018, "2018-10-28", 55, 2],
    ]);
  });

  it("calcula a incerteza de cada ano sem aquele ano: a raiz do erro quadrático médio dos outros", () => {
    const [de2010, de2014, de2018] = historicoDoAgregado(ELEICOES);
    // Sem 2010: √((1 + 4) ÷ 2). Sem 2014: √((4 + 4) ÷ 2). Sem 2018: √((4 + 1) ÷ 2).
    expect(de2010!.agregado.incerteza).toBeCloseTo(1.5811, 4);
    expect(de2014!.agregado.incerteza).toBeCloseTo(2, 10);
    expect(de2018!.agregado.incerteza).toBeCloseTo(1.5811, 4);
    expect(de2010!.agregado.faixa[0]).toBeCloseTo(52 - 1.959964 * 1.5811, 3);
    expect(de2014!.agregado.chance).toBeCloseTo(0.3085, 4); // Φ(−0,5)
  });

  it("dá a raiz do erro quadrático médio, sem tirar a média dos erros", () => {
    expect(raizDoErroQuadraticoMedio([2, -1, 2])).toBeCloseTo(Math.sqrt(3), 10);
  });

  it("quebra se um ano não tem pesquisa na janela", () => {
    const semPesquisa = { ...ELEICOES[1]!, pesquisas: [] };
    expect(() => historicoDoAgregado([ELEICOES[0]!, semPesquisa, ELEICOES[2]!])).toThrow(/2014/);
  });
});
