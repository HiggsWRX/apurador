import { readFileSync } from "node:fs";
import type { Turno } from "@apurador/pipeline";
import { describe, expect, it } from "vitest";
import {
  curvaProjetada,
  HIPOTESES_ZERADAS,
  momentosDaNoite,
  oQueSeriaPreciso,
  prepararModelo,
  projetar,
  REGIOES,
  simular,
  type Hipoteses,
  type Modelo,
  type PartidaDaSimulacao,
  type Projecao,
} from "../src/index.ts";
import { agregado2022, antesDaPrimeiraSecao, base2022, base2026, constantes, noite2022 } from "./dados.ts";

// A simulação do simulador "e se" (Simulador "e se", .scratch/apurador-2026/issues/13, decisões 1 a 4 e 10): as
// hipóteses do visitante mexem só no voto que falta de cada município, por cima da projeção inteira de uma base, sem
// segunda cópia do modelo. As referências de fora são as decisões (o zero é a projeção, o voto desloca a fatia do voto
// que falta, o comparecimento multiplica os válidos que faltam, a incerteza é a da projeção e o exemplo de ~95% da
// chance com o viés do 1º turno inteiro) e o arquivo oficial do 1º turno de cada noite.

const lerTurno = (arquivo: string) => JSON.parse(readFileSync(new URL(`../../../dados/turnos/${arquivo}`, import.meta.url), "utf8")) as Turno;

/** Votantes, aptos e os votos dos dois finalistas de cada região no 1º turno, somando as UFs do arquivo oficial. */
function primeiroTurnoDasRegioes(modelo: Modelo, turno: Turno, finalistas: [number, number]) {
  const [a, b] = finalistas.map((n) => turno.candidatos.findIndex((c) => c.numero === n)) as [number, number];
  const somas = REGIOES.map(() => ({ votantes: 0, aptos: 0, primeiro: 0, segundo: 0 }));
  modelo.ufs.forEach((uf, u) => {
    const r = modelo.regiaoDaUf[u]!;
    if (r < 0) return;
    const l = turno.lugares[uf]!;
    Object.assign(somas[r]!, {
      votantes: somas[r]!.votantes + l.votantes,
      aptos: somas[r]!.aptos + l.aptos,
      primeiro: somas[r]!.primeiro + l.votos[a]!,
      segundo: somas[r]!.segundo + l.votos[b]!,
    });
  });
  return somas.map((s) => ({ comparecimento: s.votantes / s.aptos, placarEntreFinalistas: s.primeiro / (s.primeiro + s.segundo) }));
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
  const primeiroTurno = primeiroTurnoDasRegioes(modelo, lerTurno("2026-1.json"), [22, 13]);
  const partida = (projecao: Projecao): PartidaDaSimulacao => ({
    modelo,
    apuracao,
    projecao,
    constantes,
    comparecimentoEsperado: primeiroTurno.map((r) => r.comparecimento),
  });
  // Um agregado longe do placar entre finalistas do 1º turno (Flávio 51,0), com a incerteza do agregado na eleição.
  const comPesquisas = partida(projetar(modelo, apuracao, constantes, { valor: 52, incerteza: 1.5 }));
  const soApuracao = partida(projetar(modelo, apuracao, constantes));
  const projetado = comPesquisas.projecao;
  const lugares = (s: { brasil: { projecao: number }; ufs: Record<string, { projecao: number }> }) => [
    s.brasil.projecao,
    ...modelo.ufs.map((uf) => s.ufs[uf]!.projecao),
  ];

  it("com as hipóteses zeradas, reproduz a projeção: o Brasil, cada UF, as margens, as chances e a curva projetada", () => {
    for (const p of [comPesquisas, soApuracao]) {
      const s = simular(p, HIPOTESES_ZERADAS);
      for (const [daSimulacao, daProjecao] of [[s.brasil, p.projecao.brasil], ...modelo.ufs.map((uf) => [s.ufs[uf]!, p.projecao.ufs[uf]!] as const)] as const) {
        expect(daSimulacao.projecao).toBeCloseTo(daProjecao.projecao, 12);
        expect(daSimulacao.margem).toBeCloseTo(daProjecao.margem, 12);
        expect(daSimulacao.chance).toBeCloseTo(daProjecao.chance, 12);
        expect(daSimulacao.validos).toBeCloseTo(daProjecao.validos, 3);
      }
      expect([...s.votoQueFalta]).toEqual([...p.projecao.votoQueFalta]);
      expect([...s.fatiaDoQueFalta]).toEqual([...p.projecao.fatiaDoQueFalta]);
      const [daSimulacao, doSite] = [curvaProjetada(modelo, apuracao, s, constantes).brasil, curvaProjetada(modelo, apuracao, p.projecao, constantes).brasil];
      daSimulacao.pontos.forEach((ponto, i) => {
        expect(ponto.y).toBeCloseTo(doSite.pontos[i]!.y, 12);
        expect(ponto.desvio).toBeCloseTo(doSite.pontos[i]!.desvio, 12);
      });
    }
  });

  it("na Só apuração, sem hipóteses, dá a cada região o placar entre finalistas dela no 1º turno", () => {
    // Antes da primeira seção, a "Só apuração" parte do 1º turno de cada município (Método de projeção, decisão 1).
    const s = simular(soApuracao, HIPOTESES_ZERADAS);
    primeiroTurno.forEach((r, i) => expect(s.regioes[i]!.fatia, REGIOES[i]).toBeCloseTo(r.placarEntreFinalistas, 4));
    expect(primeiroTurno[NORDESTE]!.placarEntreFinalistas).toBeCloseTo(0.3261, 4);
  });

  it("dá resultados espelhados com o par simétrico das hipóteses prontas, Flávio +2,1 e Lula +2,1", () => {
    // Decisão 9, com o viés do 1º turno que a metodologia cita: as pesquisas subestimam Flávio como no 1º turno (2,1
    // pontos entre os dois), ou Lula na mesma medida.
    const [flavio, lula] = [2.1, -2.1].map((brasil) => simular(comPesquisas, hipoteses({ brasil })));
    const [deFlavio, deLula] = [lugares(flavio!), lugares(lula!)];
    lugares(projetado).forEach((p, i) => expect(deFlavio[i]! - p, modelo.ufs[i - 1] ?? "Brasil").toBeCloseTo(p - deLula[i]!, 6));
    const zerada = simular(comPesquisas, HIPOTESES_ZERADAS);
    zerada.regioes.forEach((r, i) => expect(flavio!.regioes[i]!.fatia - r.fatia, REGIOES[i]).toBeCloseTo(r.fatia - lula!.regioes[i]!.fatia, 6));
    // antes da primeira seção, todo o voto falta: o Brasil anda os 2,1 pontos inteiros, para cada lado
    expect(flavio!.brasil.projecao).toBeCloseTo(0.541, 4);
    expect(lula!.brasil.projecao).toBeCloseTo(0.499, 4);
  });

  it("mantém a incerteza da projeção: com o agregado em 51,0 e o viés do 1º turno inteiro, Flávio vai a ~95%", () => {
    // O exemplo da pergunta do Simulador "e se", com o viés do 1º turno como ela o media: com incerteza de 1,5, Flávio
    // +1,4 leva a chance a ~95%, Φ(2,4 ÷ 1,5).
    const s = simular(partida(projetar(modelo, apuracao, constantes, { valor: 51, incerteza: 1.5 })), hipoteses({ brasil: 1.4 }));
    expect(s.brasil.margem).toBeCloseTo(1.96 * 0.015, 4);
    expect(s.brasil.chance).toBeCloseTo(0.945, 2);
    const t = simular(comPesquisas, hipoteses({ brasil: -2, regioes: { Sul: 3 }, comparecimento: { Nordeste: 4 } }));
    expect(t.brasil.margem).toBe(projetado.brasil.margem);
    for (const uf of modelo.ufs) expect(t.ufs[uf]!.desvio, uf).toBe(projetado.ufs[uf]!.desvio);
  });

  it("soma a hipótese da região à do Brasil, e o Exterior segue só a do Brasil", () => {
    // Lula +1 no Brasil e mais 3 no Nordeste: cada município do Nordeste anda 4 pontos para Lula, os outros 1, e o
    // Exterior, sem região, também 1. Os postos do Exterior que não tiveram voto válido no 1º turno não têm voto que falta.
    const s = simular(comPesquisas, hipoteses({ brasil: -1, regioes: { Nordeste: -3 } }));
    base2026.municipios.forEach((m, i) => {
      if (projetado.votoQueFalta[i] === 0) return expect(s.fatiaDoQueFalta[i]).toBe(projetado.fatiaDoQueFalta[i]);
      const r = modelo.regiaoDaUf[modelo.ufDoMunicipio[i]!]!;
      const esperada = Math.min(1, Math.max(0, projetado.fatiaDoQueFalta[i]! - (r === NORDESTE ? 0.04 : 0.01)));
      expect(s.fatiaDoQueFalta[i], `${m.uf}/${m.municipio}`).toBeCloseTo(esperada, 12);
    });
    expect(s.ufs.BA!.projecao).toBeCloseTo(projetado.ufs.BA!.projecao - 0.04, 6);
    // No Exterior, os postos em que Lula quase não teve voto ficam em 1% e só andam até 0%: a UF anda pouco menos de 1 ponto.
    expect(s.ufs.ZZ!.projecao).toBeCloseTo(projetado.ufs.ZZ!.projecao - 0.01, 3);
  });

  it("limita a fatia do voto que falta de cada município a 0–100%", () => {
    const s = simular(comPesquisas, hipoteses({ brasil: 5, regioes: Object.fromEntries(REGIOES.map((r) => [r, 10])) }));
    expect(Math.max(...s.fatiaDoQueFalta)).toBe(1);
    expect(Math.min(...s.fatiaDoQueFalta)).toBeGreaterThanOrEqual(0);
    const t = simular(comPesquisas, hipoteses({ brasil: -5, regioes: Object.fromEntries(REGIOES.map((r) => [r, -10])) }));
    expect(Math.min(...t.fatiaDoQueFalta)).toBe(0);
  });

  it("multiplica os válidos que faltam da região pelo comparecimento dela, sem mudar o resultado da região, só o peso dela no Brasil", () => {
    // +4 pontos percentuais de comparecimento no Nordeste, que teve 81,6% no 1º turno: cada município de lá vota
    // (81,6 + 4) ÷ 81,6 do que o modelo espera.
    const esperado = comPesquisas.comparecimentoEsperado[NORDESTE]!;
    expect(esperado).toBeCloseTo(0.816, 3);
    const fator = (esperado + 0.04) / esperado;
    const s = simular(comPesquisas, hipoteses({ comparecimento: { Nordeste: 4 } }));
    const zerada = simular(comPesquisas, HIPOTESES_ZERADAS);
    base2026.municipios.forEach((m, i) => {
      const r = modelo.regiaoDaUf[modelo.ufDoMunicipio[i]!]!;
      expect(s.votoQueFalta[i], `${m.uf}/${m.municipio}`).toBeCloseTo(projetado.votoQueFalta[i]! * (r === NORDESTE ? fator : 1), 6);
    });
    expect(s.regioes[NORDESTE]!.fatia).toBeCloseTo(zerada.regioes[NORDESTE]!.fatia, 12);
    // O Nordeste dá mais a Lula: com mais votos de lá, o Brasil anda para ele, na média das regiões e do Exterior com o
    // Nordeste pesando o fator a mais.
    expect(zerada.regioes[NORDESTE]!.fatia).toBeLessThan(0.45);
    const partes = [
      ...zerada.regioes.map((r, i) => ({ fatia: r.fatia, validos: r.validos * (i === NORDESTE ? fator : 1) })),
      { fatia: zerada.ufs.ZZ!.projecao, validos: zerada.ufs.ZZ!.validos },
    ];
    expect(s.brasil.projecao).toBeCloseTo(partes.reduce((t, p) => t + p.validos * p.fatia, 0) / partes.reduce((t, p) => t + p.validos, 0), 12);
    expect(s.brasil.projecao).toBeLessThan(zerada.brasil.projecao - 0.002);
  });

  describe("o que seria preciso", () => {
    it("é o valor do controle Brasil que leva o resultado final da simulação no Brasil a 50%", () => {
      const casos = [
        hipoteses({}),
        hipoteses({ regioes: { Nordeste: -6, Sul: 4 }, comparecimento: { Sudeste: -3, Norte: 5 } }),
        hipoteses({ brasil: 3, regioes: { Sudeste: 10 } }),
      ];
      for (const p of [comPesquisas, soApuracao]) {
        for (const h of casos) {
          const preciso = oQueSeriaPreciso(p, h);
          expect(preciso).not.toBeNull();
          expect(simular(p, { ...h, voto: { ...h.voto, brasil: preciso! } }).brasil.projecao).toBeCloseTo(0.5, 6);
        }
      }
    });

    it("antes da primeira seção e sem outras hipóteses, é a distância da projeção a 50%: Flávio em 52,0 precisa de Lula +2,0", () => {
      expect(projetado.brasil.projecao).toBeCloseTo(0.52, 5);
      expect(oQueSeriaPreciso(comPesquisas, HIPOTESES_ZERADAS)).toBeCloseTo(-2, 3);
    });

    it("vai além da faixa do controle quando é preciso, sem dizer que é impossível", () => {
      // Sudeste e Sul +10 para Flávio: Lula precisaria de mais de 5 pontos no país, e o número sai assim mesmo.
      expect(oQueSeriaPreciso(comPesquisas, hipoteses({ regioes: { Sudeste: 10, Sul: 10 } }))).toBeLessThan(-5);
    });
  });
});

describe("a simulação durante a apuração, na noite de 2022", () => {
  const modelo = prepararModelo(base2022);
  const comparecimentoEsperado = primeiroTurnoDasRegioes(modelo, lerTurno("2022-1.json"), [13, 22]).map((r) => r.comparecimento);
  const momentos = [...momentosDaNoite(modelo, noite2022)];
  const naMetade = momentos.find((m) => m.secoes >= 50)!;
  const partida = (apuracao: typeof naMetade.apuracao): PartidaDaSimulacao => ({
    modelo,
    apuracao,
    projecao: projetar(modelo, apuracao, constantes, agregado2022),
    constantes,
    comparecimentoEsperado,
  });
  const comMetade = partida(naMetade.apuracao);
  const projetado = comMetade.projecao;

  it("mexe só no voto que falta: o placar parcial não muda, e o Brasil anda a hipótese vezes a fatia do voto que falta", () => {
    // Na base de 2022, o 1º finalista é Lula: +2 é Lula +2.
    const s = simular(comMetade, hipoteses({ brasil: 2 }));
    const falta = projetado.votoQueFalta.reduce((t, v) => t + v, 0);
    expect(s.brasil.placar).toBe(projetado.brasil.placar);
    expect(s.brasil.validos).toBeCloseTo(projetado.brasil.validos, 3);
    expect(s.brasil.projecao - projetado.brasil.projecao).toBeCloseTo((0.02 * falta) / projetado.brasil.validos, 5);
    // com metade das seções, o mesmo controle mexe bem menos que antes da apuração
    expect(s.brasil.projecao - projetado.brasil.projecao).toBeLessThan(0.012);
  });

  it("dá resultados espelhados com o par simétrico, e o que seria preciso leva o Brasil a 50%", () => {
    const [mais, menos] = [1.4, -1.4].map((brasil) => simular(comMetade, hipoteses({ brasil })));
    expect(mais!.brasil.projecao - projetado.brasil.projecao).toBeCloseTo(projetado.brasil.projecao - menos!.brasil.projecao, 6);
    const preciso = oQueSeriaPreciso(comMetade, HIPOTESES_ZERADAS)!;
    expect(simular(comMetade, hipoteses({ brasil: preciso })).brasil.projecao).toBeCloseTo(0.5, 6);
  });

  it("no fim da noite, sem voto que falta, não muda nada, e nada leva o Brasil a 50%", () => {
    const noFim = partida(momentos.at(-1)!.apuracao);
    expect(simular(noFim, hipoteses({ brasil: 5, regioes: { Sul: 10 } })).brasil.projecao).toBeCloseTo(noFim.projecao.brasil.projecao, 12);
    expect(oQueSeriaPreciso(noFim, HIPOTESES_ZERADAS)).toBeNull();
  });
});
