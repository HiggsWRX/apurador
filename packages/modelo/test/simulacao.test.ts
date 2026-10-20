import { readFileSync } from "node:fs";
import type { Turno } from "@apurador/pipeline";
import { describe, expect, it } from "vitest";
import { curvaProjetada, HIPOTESES_ZERADAS, momentosDaNoite, oQueSeriaPreciso, phi, prepararModelo, projetar, REGIOES, simular, type Hipoteses, type Modelo } from "../src/index.ts";
import { agregado2022, antesDaPrimeiraSecao, base2022, base2026, constantes, noite2022 } from "./dados.ts";

// A simulação do simulador "e se" (Simulador "e se", .scratch/apurador-2026/issues/13, decisões 1 a 4 e 10): as
// hipóteses do visitante mexem só no voto que falta de cada município, por cima da projeção inteira de uma base, sem
// segunda cópia do modelo. As referências de fora são as decisões: o zero é a projeção, o voto desloca a fatia do voto
// que falta, o comparecimento multiplica os válidos que faltam, e a incerteza é a da projeção.

const lerTurno = (arquivo: string) => JSON.parse(readFileSync(new URL(`../../../dados/turnos/${arquivo}`, import.meta.url), "utf8")) as Turno;

/** O comparecimento do 1º turno em cada região, do arquivo oficial do turno: votantes ÷ aptos das UFs dela. */
function comparecimentoDasRegioes(modelo: Modelo, turno: Turno): number[] {
  const somas = REGIOES.map(() => ({ votantes: 0, aptos: 0 }));
  modelo.ufs.forEach((uf, u) => {
    const r = modelo.regiaoDaUf[u]!;
    if (r < 0) return;
    somas[r]!.votantes += turno.lugares[uf]!.votantes;
    somas[r]!.aptos += turno.lugares[uf]!.aptos;
  });
  return somas.map((s) => s.votantes / s.aptos);
}

/** Hipóteses com só o que se mexeu, o resto zerado. */
const hipoteses = (h: { brasil?: number; regioes?: Partial<Record<string, number>>; comparecimento?: Partial<Record<string, number>> }): Hipoteses => ({
  voto: { brasil: h.brasil ?? 0, regioes: REGIOES.map((r) => h.regioes?.[r] ?? 0) },
  comparecimento: REGIOES.map((r) => h.comparecimento?.[r] ?? 0),
});

const NORDESTE = REGIOES.indexOf("Nordeste");

describe("a simulação antes da primeira seção, em 25/10", () => {
  const modelo = prepararModelo(base2026);
  const apuracao = antesDaPrimeiraSecao(base2026);
  const comparecimento = comparecimentoDasRegioes(modelo, lerTurno("2026-1.json"));
  // Um agregado longe do placar entre finalistas do 1º turno (Flávio 51,0), com a incerteza do agregado na eleição.
  const comPesquisas = projetar(modelo, apuracao, constantes, { valor: 52, incerteza: 1.5 });
  const soApuracao = projetar(modelo, apuracao, constantes);
  const lugares = (s: { brasil: { projecao: number }; ufs: Record<string, { projecao: number }> }) => [s.brasil.projecao, ...modelo.ufs.map((uf) => s.ufs[uf]!.projecao)];

  it("com as hipóteses zeradas, reproduz a projeção: o Brasil, cada UF, as margens, as chances e a curva projetada", () => {
    for (const projecao of [comPesquisas, soApuracao]) {
      const s = simular(modelo, apuracao, projecao, constantes, HIPOTESES_ZERADAS, comparecimento);
      for (const [simulado, projetado] of [[s.brasil, projecao.brasil], ...modelo.ufs.map((uf) => [s.ufs[uf]!, projecao.ufs[uf]!] as const)] as const) {
        expect(simulado.projecao).toBeCloseTo(projetado.projecao, 12);
        expect(simulado.margem).toBeCloseTo(projetado.margem, 12);
        expect(simulado.chance).toBeCloseTo(projetado.chance, 12);
        expect(simulado.validos).toBeCloseTo(projetado.validos, 3);
      }
      expect([...s.votoQueFalta]).toEqual([...projecao.votoQueFalta]);
      expect([...s.fatiaDoQueFalta]).toEqual([...projecao.fatiaDoQueFalta]);
      const [curvaSimulada, curvaProjetadaDoSite] = [curvaProjetada(modelo, apuracao, s, constantes).brasil, curvaProjetada(modelo, apuracao, projecao, constantes).brasil];
      curvaSimulada.pontos.forEach((p, i) => {
        expect(p.y).toBeCloseTo(curvaProjetadaDoSite.pontos[i]!.y, 12);
        expect(p.desvio).toBeCloseTo(curvaProjetadaDoSite.pontos[i]!.desvio, 12);
      });
    }
  });

  it("dá resultados espelhados com o par simétrico das hipóteses prontas, Flávio +1,4 e Lula +1,4", () => {
    // Decisão 9: as pesquisas subestimam Flávio como no 1º turno, ou Lula na mesma medida.
    const [flavio, lula] = [1.4, -1.4].map((brasil) => simular(modelo, apuracao, comPesquisas, constantes, hipoteses({ brasil }), comparecimento));
    const [projetado, deFlavio, deLula] = [lugares(comPesquisas), lugares(flavio!), lugares(lula!)];
    projetado.forEach((p, i) => expect(deFlavio[i]! - p, modelo.ufs[i - 1] ?? "Brasil").toBeCloseTo(p - deLula[i]!, 6));
    const zerada = simular(modelo, apuracao, comPesquisas, constantes, HIPOTESES_ZERADAS, comparecimento);
    zerada.regioes.forEach((r, i) => expect(flavio!.regioes[i]!.projecao - r.projecao, REGIOES[i]).toBeCloseTo(r.projecao - lula!.regioes[i]!.projecao, 6));
    // antes da primeira seção, todo o voto falta: o Brasil anda os 1,4 pontos inteiros, para cada lado
    expect(flavio!.brasil.projecao).toBeCloseTo(0.534, 4);
    expect(lula!.brasil.projecao).toBeCloseTo(0.506, 4);
  });

  it("mantém a incerteza da projeção e tira dela a chance de vitória", () => {
    const s = simular(modelo, apuracao, comPesquisas, constantes, hipoteses({ brasil: -2, regioes: { Sul: 3 }, comparecimento: { Nordeste: 4 } }), comparecimento);
    expect(s.brasil.margem).toBe(comPesquisas.brasil.margem);
    expect(s.brasil.chance).toBeCloseTo(phi((s.brasil.projecao - 0.5) / comPesquisas.brasil.desvio), 12);
    for (const uf of modelo.ufs) expect(s.ufs[uf]!.desvio, uf).toBe(comPesquisas.ufs[uf]!.desvio);
  });

  it("soma a hipótese da região à do Brasil, e o Exterior segue só a do Brasil", () => {
    // Lula +1 no Brasil e mais 3 no Nordeste: cada município do Nordeste anda 4 pontos para Lula, os outros 1, e o
    // Exterior, sem região, também 1. Os postos do Exterior que não tiveram voto válido no 1º turno não têm voto que falta.
    const s = simular(modelo, apuracao, comPesquisas, constantes, hipoteses({ brasil: -1, regioes: { Nordeste: -3 } }), comparecimento);
    base2026.municipios.forEach((m, i) => {
      if (comPesquisas.votoQueFalta[i] === 0) return expect(s.fatiaDoQueFalta[i]).toBe(comPesquisas.fatiaDoQueFalta[i]);
      const r = modelo.regiaoDaUf[modelo.ufDoMunicipio[i]!]!;
      const esperada = Math.min(1, Math.max(0, comPesquisas.fatiaDoQueFalta[i]! - (r === NORDESTE ? 0.04 : 0.01)));
      expect(s.fatiaDoQueFalta[i], `${m.uf}/${m.municipio}`).toBeCloseTo(esperada, 12);
    });
    expect(s.ufs.ZZ!.projecao).toBeCloseTo(comPesquisas.ufs.ZZ!.projecao - 0.01, 3);
    expect(s.ufs.BA!.projecao).toBeCloseTo(comPesquisas.ufs.BA!.projecao - 0.04, 6);
  });

  it("limita a fatia do voto que falta de cada município a 0–100%", () => {
    const s = simular(modelo, apuracao, comPesquisas, constantes, hipoteses({ brasil: 5, regioes: Object.fromEntries(REGIOES.map((r) => [r, 10])) }), comparecimento);
    expect(Math.max(...s.fatiaDoQueFalta)).toBe(1);
    expect(Math.min(...s.fatiaDoQueFalta)).toBeGreaterThanOrEqual(0);
    const t = simular(modelo, apuracao, comPesquisas, constantes, hipoteses({ brasil: -5, regioes: Object.fromEntries(REGIOES.map((r) => [r, -10])) }), comparecimento);
    expect(Math.min(...t.fatiaDoQueFalta)).toBe(0);
  });

  it("multiplica os válidos que faltam da região pelo comparecimento dela, sem mudar o resultado da região, só o peso dela no Brasil", () => {
    // +4 pontos percentuais de comparecimento no Nordeste, que teve 81,6% no 1º turno: cada município de lá vota
    // (81,6 + 4) ÷ 81,6 do que o modelo espera.
    expect(comparecimento[NORDESTE]).toBeCloseTo(0.816, 3);
    const s = simular(modelo, apuracao, comPesquisas, constantes, hipoteses({ comparecimento: { Nordeste: 4 } }), comparecimento);
    const zerada = simular(modelo, apuracao, comPesquisas, constantes, HIPOTESES_ZERADAS, comparecimento);
    base2026.municipios.forEach((m, i) => {
      const r = modelo.regiaoDaUf[modelo.ufDoMunicipio[i]!]!;
      const fator = r === NORDESTE ? (comparecimento[NORDESTE]! + 0.04) / comparecimento[NORDESTE]! : 1;
      expect(s.votoQueFalta[i], `${m.uf}/${m.municipio}`).toBeCloseTo(comPesquisas.votoQueFalta[i]! * fator, 6);
    });
    expect(s.regioes[NORDESTE]!.projecao).toBeCloseTo(zerada.regioes[NORDESTE]!.projecao, 12);
    // O Nordeste dá mais a Lula: com mais votos de lá, o Brasil anda para ele, na média das regiões e do Exterior com o
    // Nordeste pesando o fator a mais.
    expect(zerada.regioes[NORDESTE]!.projecao).toBeLessThan(0.45);
    const fator = (comparecimento[NORDESTE]! + 0.04) / comparecimento[NORDESTE]!;
    const partes = [...zerada.regioes.map((r, i) => ({ ...r, validos: r.validos * (i === NORDESTE ? fator : 1) })), zerada.ufs.ZZ!];
    const esperado = partes.reduce((t, p) => t + p.validos * p.projecao, 0) / partes.reduce((t, p) => t + p.validos, 0);
    expect(s.brasil.projecao).toBeCloseTo(esperado, 12);
    expect(s.brasil.projecao).toBeLessThan(zerada.brasil.projecao - 0.002);
  });

  it("dá cada região como a soma das suas UFs", () => {
    const s = simular(modelo, apuracao, comPesquisas, constantes, hipoteses({ regioes: { Sudeste: 2 } }), comparecimento);
    REGIOES.forEach((regiao, r) => {
      const ufs = modelo.ufs.filter((_, u) => modelo.regiaoDaUf[u] === r);
      const validos = ufs.reduce((t, uf) => t + s.ufs[uf]!.validos, 0);
      expect(s.regioes[r]!.validos, regiao).toBeCloseTo(validos, 3);
      expect(s.regioes[r]!.projecao, regiao).toBeCloseTo(ufs.reduce((t, uf) => t + s.ufs[uf]!.validos * s.ufs[uf]!.projecao, 0) / validos, 12);
    });
  });

  describe("o que seria preciso", () => {
    it("é o valor do controle Brasil que leva o resultado final simulado do Brasil a 50%", () => {
      const casos = [hipoteses({}), hipoteses({ regioes: { Nordeste: -6, Sul: 4 }, comparecimento: { Sudeste: -3, Norte: 5 } }), hipoteses({ brasil: 3, regioes: { Sudeste: 10 } })];
      for (const projecao of [comPesquisas, soApuracao]) {
        for (const h of casos) {
          const preciso = oQueSeriaPreciso(modelo, apuracao, projecao, constantes, h, comparecimento);
          expect(preciso).not.toBeNull();
          const s = simular(modelo, apuracao, projecao, constantes, { ...h, voto: { ...h.voto, brasil: preciso! } }, comparecimento);
          expect(s.brasil.projecao).toBeCloseTo(0.5, 6);
        }
      }
    });

    it("antes da primeira seção e sem outras hipóteses, é a distância da projeção a 50%: Flávio em 52,0 precisa de Lula +2,0", () => {
      expect(comPesquisas.brasil.projecao).toBeCloseTo(0.52, 5);
      expect(oQueSeriaPreciso(modelo, apuracao, comPesquisas, constantes, HIPOTESES_ZERADAS, comparecimento)).toBeCloseTo(-2, 3);
    });

    it("vai além da faixa do controle quando é preciso, sem dizer que é impossível", () => {
      // Sudeste +10 para Flávio: Lula precisaria de mais de 5 pontos no país, e o número sai assim mesmo.
      const preciso = oQueSeriaPreciso(modelo, apuracao, comPesquisas, constantes, hipoteses({ regioes: { Sudeste: 10, Sul: 10 } }), comparecimento);
      expect(preciso).toBeLessThan(-5);
    });
  });
});

describe("a simulação durante a apuração, na noite de 2022", () => {
  const modelo = prepararModelo(base2022);
  const comparecimento = comparecimentoDasRegioes(modelo, lerTurno("2022-1.json"));
  const momento = [...momentosDaNoite(modelo, noite2022)].find((m) => m.secoes >= 50)!;
  const projecao = projetar(modelo, momento.apuracao, constantes, agregado2022);

  it("mexe só no voto que falta: o placar parcial não muda, e o Brasil anda a hipótese vezes a fatia do voto que falta", () => {
    // Na base de 2022, o 1º finalista é Lula: +2 é Lula +2.
    const s = simular(modelo, momento.apuracao, projecao, constantes, hipoteses({ brasil: 2 }), comparecimento);
    const falta = projecao.votoQueFalta.reduce((t, v) => t + v, 0);
    expect(s.brasil.placar).toBe(projecao.brasil.placar);
    expect(s.brasil.validos).toBeCloseTo(projecao.brasil.validos, 3);
    expect(s.brasil.projecao - projecao.brasil.projecao).toBeCloseTo((0.02 * falta) / projecao.brasil.validos, 5);
    // com metade das seções, o mesmo controle mexe bem menos que antes da apuração
    expect(s.brasil.projecao - projecao.brasil.projecao).toBeLessThan(0.012);
  });

  it("dá resultados espelhados com o par simétrico, e o que seria preciso leva o Brasil a 50%", () => {
    const [mais, menos] = [1.4, -1.4].map((brasil) => simular(modelo, momento.apuracao, projecao, constantes, hipoteses({ brasil }), comparecimento));
    expect(mais!.brasil.projecao - projecao.brasil.projecao).toBeCloseTo(projecao.brasil.projecao - menos!.brasil.projecao, 6);
    const preciso = oQueSeriaPreciso(modelo, momento.apuracao, projecao, constantes, HIPOTESES_ZERADAS, comparecimento)!;
    expect(simular(modelo, momento.apuracao, projecao, constantes, hipoteses({ brasil: preciso }), comparecimento).brasil.projecao).toBeCloseTo(0.5, 6);
  });

  it("no fim da noite, sem voto que falta, não muda nada, e nada leva o Brasil a 50%", () => {
    const fim = [...momentosDaNoite(modelo, noite2022)].at(-1)!;
    const noFim = projetar(modelo, fim.apuracao, constantes, agregado2022);
    const s = simular(modelo, fim.apuracao, noFim, constantes, hipoteses({ brasil: 5, regioes: { Sul: 10 } }), comparecimento);
    expect(s.brasil.projecao).toBeCloseTo(noFim.brasil.projecao, 12);
    expect(oQueSeriaPreciso(modelo, fim.apuracao, noFim, constantes, HIPOTESES_ZERADAS, comparecimento)).toBeNull();
  });
});
