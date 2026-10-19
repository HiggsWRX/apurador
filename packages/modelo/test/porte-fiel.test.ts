import { describe, expect, it } from "vitest";
import { curvaProjetada, momentosDaNoite, prepararModelo, projetar } from "../src/index.ts";
import { base2022, constantes, dadosDoPrototipo, fotoDoPrototipo, noite2022 } from "./dados.ts";
import { Projecao } from "./prototipo/projecao.js";

// O porte fiel: no 2º turno de 2022, com base no 1º turno de 2022 e as constantes provisórias, o modelo dá os
// números do módulo `Projecao` do protótipo (test/prototipo/projecao.js), rodado sobre os mesmos momentos da
// noite. Ficam de fora os momentos em que alguma UF usa o recuo "1º turno", a única diferença deliberada:
// o protótipo divide ali os votos dos eliminados meio a meio, e o modelo parte do placar entre finalistas.

const modelo = prepararModelo(base2022);
const momentos = [...momentosDaNoite(modelo, noite2022)];
const P = Projecao.preparar(dadosDoPrototipo(base2022, momentos[0]!.apuracao));
const prm = { tau: constantes.incertezaRegional, delta: constantes.incertezaNacional, k: constantes.pesoDoMunicipio };
const UM_CENTESIMO_DE_PONTO = 0.0001;

/** Os momentos em que todas as UFs têm uma referência apurada: o Brasil já passou do mínimo de votos válidos. */
const comReferencia = momentos.filter((m) => m.apuracao.reduce((s, a) => s + a.votos[0]! + a.votos[1]!, 0) >= constantes.minimoPorNivel);

const maiorDiferenca = (pares: [number, number][]) => Math.max(...pares.map(([a, b]) => Math.abs(a - b)));

describe("o porte fiel do protótipo no 2º turno de 2022", () => {
  it("usa o mesmo mínimo de votos por nível que o protótipo e compara a noite inteira", () => {
    expect(constantes.minimoPorNivel).toBe(2000);
    expect(comReferencia.length).toBeGreaterThanOrEqual(100);
    expect(comReferencia.at(-1)!.secoes).toBe(100);
  });

  it("dá a projeção, o desvio e a chance de vitória do Brasil do protótipo em cada momento", () => {
    const pares = comReferencia.map((m) => ({ modelo: projetar(modelo, m.apuracao, constantes).brasil, prototipo: Projecao.projetar(P, fotoDoPrototipo(m.apuracao), "transferencia", prm) }));

    expect(maiorDiferenca(pares.map((p) => [p.modelo.projecao, p.prototipo.P]))).toBeLessThan(UM_CENTESIMO_DE_PONTO);
    expect(maiorDiferenca(pares.map((p) => [p.modelo.desvio, p.prototipo.sigma]))).toBeLessThan(UM_CENTESIMO_DE_PONTO);
    expect(maiorDiferenca(pares.map((p) => [p.modelo.chance, p.prototipo.chance]))).toBeLessThan(UM_CENTESIMO_DE_PONTO);
    expect(maiorDiferenca(pares.map((p) => [p.modelo.validos, p.prototipo.Vp]))).toBeLessThan(1);
  });

  it("dá em cada UF os números do protótipo rodado só sobre ela, a mesma fórmula restrita ao voto que falta da UF", () => {
    // O protótipo só projeta o país. Rodado só sobre os municípios de uma UF, ele dá a fórmula restrita a ela,
    // desde que nada da UF venha do país: ela usa a própria referência, tem ao menos 5 municípios com votos (com
    // menos, a dispersão é a do país), e todo município com voto que falta já tem votos e 300 eleitores
    // apurados (com menos, o comparecimento é o do país).
    const daUf = (uf: string) => (_: unknown, i: number) => modelo.municipios[i]!.uf === uf;
    const comVotos = (a: { votos: number[] }) => a.votos[0]! + a.votos[1]! > 0;
    const casos = comReferencia.flatMap((m) => {
      const projecao = projetar(modelo, m.apuracao, constantes);
      return modelo.ufs
        .filter((uf) => projecao.ufs[uf]!.referencia === "UF" && projecao.ufs[uf]!.secoes < 100)
        .filter((uf) => m.apuracao.filter(daUf(uf)).filter(comVotos).length >= 5)
        .filter((uf) => m.apuracao.filter(daUf(uf)).every((a) => a.aptos >= a.aptosTotais || (a.aptos >= 300 && comVotos(a))))
        .map((uf) => {
          const apuracao = m.apuracao.filter(daUf(uf));
          const P = Projecao.preparar(dadosDoPrototipo({ ...base2022, municipios: base2022.municipios.filter(daUf(uf)) }, apuracao));
          return { modelo: projecao.ufs[uf]!, prototipo: Projecao.projetar(P, fotoDoPrototipo(apuracao), "transferencia", prm) };
        });
    });

    expect(casos.length).toBeGreaterThanOrEqual(100);
    expect(maiorDiferenca(casos.map((c) => [c.modelo.projecao, c.prototipo.P]))).toBeLessThan(UM_CENTESIMO_DE_PONTO);
    expect(maiorDiferenca(casos.map((c) => [c.modelo.desvio, c.prototipo.sigma]))).toBeLessThan(UM_CENTESIMO_DE_PONTO);
    expect(maiorDiferenca(casos.map((c) => [c.modelo.chance, c.prototipo.chance]))).toBeLessThan(UM_CENTESIMO_DE_PONTO);
  });

  it("dá a curva projetada do Brasil do protótipo, na ordem de chegada 'mistura', em cada momento", () => {
    const pares = comReferencia.map((m) => {
      const curva = curvaProjetada(modelo, m.apuracao, projetar(modelo, m.apuracao, constantes), constantes).brasil;
      const foto = fotoDoPrototipo(m.apuracao);
      return { modelo: curva.pontos, prototipo: Projecao.curvaProjetada(P, foto, Projecao.projetar(P, foto, "transferencia", prm), 50, "mistura") };
    });

    expect(constantes.ordemDeChegada).toBe("mistura");
    for (const p of pares) expect(p.modelo).toHaveLength(p.prototipo.length);
    const pontos = pares.flatMap((p) => p.modelo.map((ponto, i) => ({ modelo: ponto, prototipo: p.prototipo[i]! })));
    expect(maiorDiferenca(pontos.map((p) => [p.modelo.x, p.prototipo.x]))).toBeLessThan(0.01);
    expect(maiorDiferenca(pontos.map((p) => [p.modelo.y, p.prototipo.y]))).toBeLessThan(UM_CENTESIMO_DE_PONTO);
    expect(maiorDiferenca(pontos.map((p) => [p.modelo.desvio, p.prototipo.sd]))).toBeLessThan(UM_CENTESIMO_DE_PONTO);
  });

  it("dá a virada projetada do Brasil do protótipo, ponto e faixa, em cada momento", () => {
    const viradas = comReferencia.map((m) => {
      const foto = fotoDoPrototipo(m.apuracao);
      const doPrototipo = Projecao.viradaProjetada(Projecao.curvaProjetada(P, foto, Projecao.projetar(P, foto, "transferencia", prm), 50, "mistura"))!;
      return {
        modelo: curvaProjetada(modelo, m.apuracao, projetar(modelo, m.apuracao, constantes), constantes).brasil.virada!,
        // Lula é o 1º finalista da base de 2022
        prototipo: { ...doPrototipo, quem: doPrototipo.quem === "L" ? 0 : 1 },
      };
    });

    // a noite passa pelos três casos: virada à frente, virada só possível e nenhuma
    expect(viradas.some((v) => v.prototipo.x !== null && v.prototipo.quem === 0)).toBe(true);
    expect(viradas.some((v) => v.prototipo.x === null && v.prototipo.cedo !== null)).toBe(true);
    expect(viradas.some((v) => v.prototipo.x === null && v.prototipo.cedo === null)).toBe(true);
    for (const { modelo: v, prototipo: p } of viradas) {
      expect(v.quem).toBe(p.quem);
      for (const k of ["x", "cedo", "tarde"] as const) {
        expect(v[k] === null, k).toBe(p[k] === null);
        if (p[k] !== null) expect(Math.abs(v[k]! - p[k]), k).toBeLessThan(0.01);
      }
    }
  });
});
