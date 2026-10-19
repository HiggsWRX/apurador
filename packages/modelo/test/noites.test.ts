import { describe, expect, it } from "vitest";
import { executarNoite, prepararModelo, type ResultadoDaNoite } from "../src/index.ts";
import { agregado2022, base2022, constantes, noite2022 } from "./dados.ts";

// O executor de noites no 2º turno de 2022, com base no 1º turno de 2022 e as constantes provisórias. A
// referência é a tabela do Método de projeção só com a apuração (.scratch/apurador-2026/issues/09), que o
// protótipo mediu nas mesmas fotografias da noite. Lá a noite foi cortada seção a seção; aqui, na chegada (as
// seções de uma zona no mesmo segundo) que alcança cada ponto. Por isso, a mesma ordem de grandeza.

describe("o executor de noites no 2º turno de 2022", () => {
  const noite = executarNoite(prepararModelo(base2022), noite2022, constantes);

  it("termina no resultado oficial: Lula com 50,90% dos votos válidos", () => {
    expect(noite.final).toBeCloseTo(0.509, 4);
  });

  it("entrega a noite momento a momento, das fotografias de 0,1% das seções até o fim", () => {
    expect(noite.momentos).toHaveLength(106);
    expect(noite.momentos[0]!.secoes).toBeCloseTo(0.1, 2);
    expect(noite.momentos.at(-1)).toMatchObject({ secoes: 100, placar: noite.final, projecao: noite.final, erro: 0 });
    for (let i = 1; i < noite.momentos.length; i++) expect(noite.momentos[i]!.secoes).toBeGreaterThan(noite.momentos[i - 1]!.secoes);
  });

  it("erra ~0,11, ~0,37 e ~0,47 ponto com 5, 25 e 50% das seções", () => {
    expect(Math.abs(noite.erroCom5! - 0.11)).toBeLessThan(0.05);
    expect(Math.abs(noite.erroCom25! - 0.37)).toBeLessThan(0.05);
    expect(Math.abs(noite.erroCom50! - 0.47)).toBeLessThan(0.05);
  });

  it("tem o resultado final dentro da margem de 95% em ~98% dos momentos, também depois de 1% das seções", () => {
    for (const cobertura of [noite.cobertura, noite.coberturaDepoisDe1]) {
      expect(cobertura).toBeGreaterThanOrEqual(0.96);
      expect(cobertura).toBeLessThanOrEqual(1);
    }
  });

  it("tem a chance honesta: acerta o vencedor desde o começo, dá 95% a ele desde ~68% das seções e Brier de ~0,03", () => {
    expect(noite.acertaDesde).toBeLessThan(1);
    expect(Math.abs(noite.chance95Desde! - 68)).toBeLessThan(3);
    expect(Math.abs(noite.brier - 0.032)).toBeLessThan(0.01);
  });
});

describe("o executor de noites na base 'Apuração + pesquisas', no 2º turno de 2022", () => {
  // O agregado da véspera de 2022 (Lula com 50,98%), real e deslocado 2 pontos para cada candidato: um erro do tamanho
  // do de 2018 (Combinação de pesquisas e apuração, decisão 4). A referência é a série de 2022 do protótipo da página
  // de metodologia (prototipos/pagina-metodologia/serie2022.json), medida nas fotografias seção a seção.
  const modelo = prepararModelo(base2022);
  const so = executarNoite(modelo, noite2022, constantes);
  const deslocado = (pontos: number) => executarNoite(modelo, noite2022, constantes, { agregado: { ...agregado2022, valor: agregado2022.valor + pontos } });
  const [real, comLula, comBolsonaro] = [deslocado(0), deslocado(2), deslocado(-2)];
  /** O % de seções desde o qual a noite fica a menos de 0,1 ponto da "Só apuração" até o fim. */
  const juntaDesde = (noite: ResultadoDaNoite) => {
    let inicio: number | null = null;
    noite.momentos.forEach((m, i) => (inicio = Math.abs(m.projecao - so.momentos[i]!.projecao) < 0.001 ? (inicio ?? m.secoes) : null));
    return inicio;
  };

  it("entrega a noite nos mesmos momentos da 'Só apuração', com o placar parcial, o peso das pesquisas e a projeção com a incerteza", () => {
    for (const noite of [real, comLula, comBolsonaro]) {
      expect(noite.final).toBe(so.final);
      expect(noite.momentos).toHaveLength(so.momentos.length);
      noite.momentos.forEach((m, i) => expect(m).toMatchObject({ instante: so.momentos[i]!.instante, secoes: so.momentos[i]!.secoes, placar: so.momentos[i]!.placar }));
      expect(noite.momentos.at(-1)).toMatchObject({ projecao: noite.final, erro: 0 });
    }
    expect(so.momentos.every((m) => m.pesoDasPesquisas === 0)).toBe(true);
    // na série do protótipo, as pesquisas pesam 83% com 0,1% das seções e 9% com 5%
    expect(real.momentos[0]!.pesoDasPesquisas).toBeCloseTo(0.833, 2);
    expect(real.momentos.find((m) => m.secoes >= 5)!.pesoDasPesquisas).toBeCloseTo(0.091, 2);
  });

  it("erra com 5% das seções como no protótipo: ~0,10 ponto com o agregado real, ~0,23 deslocado para Lula e ~0,03 para Bolsonaro", () => {
    expect(Math.abs(real.erroCom5! - 0.1)).toBeLessThan(0.05);
    expect(Math.abs(comLula.erroCom5! - 0.23)).toBeLessThan(0.05);
    expect(Math.abs(comBolsonaro.erroCom5! - 0.03)).toBeLessThan(0.05);
  });

  it("com o agregado deslocado, fica a menos de 0,1 ponto da 'Só apuração' a partir de ~7% das seções, como no protótipo", () => {
    expect(juntaDesde(real)).toBeLessThan(juntaDesde(comLula)!);
    expect(Math.abs(Math.max(juntaDesde(comLula)!, juntaDesde(comBolsonaro)!) - 7)).toBeLessThan(1);
  });
});
