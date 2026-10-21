import { CONSTANTES_PROVISORIAS, executarNoite, type LinhaDaNoite, type ResultadoDaNoite } from "@apurador/modelo";
import { describe, expect, it } from "vitest";
import { casosDoK, erroDaCurva, escolherConstantesDoModelo, escolherK, escolherLimite, escolherOrdem, escolherZona, execucoesDoSinal, lerNoitesDaCalibracao, medirNoite, medirSinal, noiteMomentoAMomento, placarReal, semSinalSeguidoDeVirada, type MedidaDaNoite } from "../src/index.ts";

// A calibração (docs/calibracao.md): as regras de escolha de cada passo, sobre medidas feitas à mão a partir do texto
// da regra, e as medidas, sobre resultados feitos à mão e sobre as três noites reais, com as referências dos tickets.

const noites = lerNoitesDaCalibracao(new URL("../../../", import.meta.url));

describe("as três noites da calibração", () => {
  it("são o 2º turno de 2022, o de 2018 e o 1º turno de 2026, com o agregado da véspera de cada uma", () => {
    // os agregados do ticket 05, no 1º finalista da base de cada noite, com a incerteza de 1,5 da noite
    expect(noites.map((n) => [n.id, n.finalistas[0], n.agregado.valor.toFixed(2), n.agregado.incerteza])).toEqual([
      ["2022-2", "LULA", "50.98", 1.5],
      ["2018-2", "JAIR BOLSONARO", "57.01", 1.5],
      ["2026-1", "FLAVIO BOLSONARO", "48.87", 1.5],
    ]);
  });

  it("terminam no resultado oficial, entre os dois finalistas", () => {
    // Lula 50,90% em 2022, Bolsonaro 55,13% em 2018 e Flávio 47,03 × Lula 45,16 em 2026
    const finais = noites.map((n) => executarNoite(n.modelo, n.noite, CONSTANTES_PROVISORIAS, { pontos: [] }).final);
    expect(finais[0]).toBeCloseTo(0.509, 4);
    expect(finais[1]).toBeCloseTo(0.5513, 4);
    expect(finais[2]).toBeCloseTo(47.03 / (47.03 + 45.16), 4);
  });
});

/** Um resultado do executor com os momentos dados, cada um na fotografia do seu % de seções. O 1º finalista termina com 52%. */
function resultado(momentos: Partial<LinhaDaNoite>[], coberturaDepoisDe1 = 1): ResultadoDaNoite {
  const linhas = momentos.map((m): LinhaDaNoite => ({ instante: 0, secoes: 0, placar: null, pesoDasPesquisas: 0, projecao: 0.52, desvio: 0.01, chance: 0.5, erro: 0, ...m, ponto: m.ponto ?? m.secoes ?? 0 }));
  return { final: 0.52, momentos: linhas, erroCom5: null, erroCom25: null, erroCom50: null, cobertura: 1, coberturaDepoisDe1, acertaDesde: null, chance95Desde: null, brier: 0 };
}

describe("a medida de uma noite", () => {
  const noite = medirNoite(
    resultado([
      { secoes: 1, erro: 9, projecao: 0.6, chance: 0.01 },
      { secoes: 4.9, erro: 9, chance: 0.01 },
      { secoes: 5, erro: 1, desvio: 0.005, chance: 0.03 },
      { secoes: 20, erro: 2, desvio: 0.01, chance: 0.6 },
      { secoes: 50, erro: 3, desvio: 0.015, chance: 0.8 },
      { secoes: 50.1, erro: 9, desvio: 0.1, chance: 0.04 },
      { secoes: 80, erro: 9, projecao: 0.6, desvio: 0.01, chance: 0.99 },
    ], 0.96),
  );

  it("traz a cobertura do executor, depois da fotografia de 1% das seções", () => {
    expect(noite.cobertura).toBe(0.96);
  });

  it("dá a maior chance de vitória de quem perdeu depois da fotografia de 5% das seções", () => {
    // o 1º finalista vence; com 50,1% das seções, quem perdeu tem 96%; na fotografia de 5% e antes, 97% e 99%, que não contam
    expect(noite.maiorChanceDeQuemPerdeu).toBeCloseTo(0.96, 12);
  });

  it("dá o maior erro nos momentos de 0,1% a 5% das seções", () => {
    expect(noite.maiorErroNoComeco).toBe(9);
    expect(medirNoite(resultado([{ secoes: 0.05, erro: 7 }, { secoes: 0.1, erro: 3 }, { secoes: 5, erro: 2 }, { secoes: 5.1, erro: 8 }])).maiorErroNoComeco).toBe(3);
  });

  it("dá o erro médio e a margem de 95% média nos momentos de 5% a 50% das seções", () => {
    expect(noite.erroMedio).toBeCloseTo(2, 12);
    // as margens são 1,96 × 0,5, 1,0 e 1,5 ponto
    expect(noite.margemMedia).toBeCloseTo(1.959964, 5);
  });
});

describe("a escolha das incertezas e do peso do próprio município (passo 1)", () => {
  /** As medidas de um candidato nas três noites, com a cobertura e a chance de quem perdeu que passam. */
  const nasTresNoites = (erros: number[], margem: number, mudar: Partial<MedidaDaNoite> = {}, emQualNoite = 0): MedidaDaNoite[] =>
    erros.map((erroMedio, i) => ({ cobertura: 0.97, maiorChanceDeQuemPerdeu: 0.9, maiorErroNoComeco: 1, erroMedio, margemMedia: margem, ...(i === emQualNoite ? mudar : {}) }));

  it("tira quem cobre menos de 95% em alguma noite e quem dá mais de 95% a quem perdeu, e fica com o menor erro médio", () => {
    const passo = escolherConstantesDoModelo([
      { candidato: "cobre pouco", porNoite: nasTresNoites([0.1, 0.1, 0.1], 2, { cobertura: 0.94 }, 2) },
      { candidato: "chance alta", porNoite: nasTresNoites([0.1, 0.1, 0.1], 2, { maiorChanceDeQuemPerdeu: 0.96 }, 1) },
      { candidato: "erra 0,3", porNoite: nasTresNoites([0.2, 0.3, 0.4], 2) },
      { candidato: "erra 0,4", porNoite: nasTresNoites([0.4, 0.4, 0.4], 3) },
    ]);
    expect(passo.escolhido).toBe("erra 0,3");
    expect(passo.candidatos.map((c) => [c.candidato, c.passaCobertura, c.passaChance])).toEqual([
      ["cobre pouco", false, true],
      ["chance alta", true, false],
      ["erra 0,3", true, true],
      ["erra 0,4", true, true],
    ]);
    expect(passo.candidatos[2]!.erroMedio).toBeCloseTo(0.3, 12);
  });

  it("aceita a cobertura de 95% e a chance de 95% exatas", () => {
    const passo = escolherConstantesDoModelo([{ candidato: "no limite", porNoite: nasTresNoites([0.3, 0.3, 0.3], 2, { cobertura: 0.95, maiorChanceDeQuemPerdeu: 0.95 }) }]);
    expect(passo.escolhido).toBe("no limite");
  });

  it("no empate, a menos de 0,05 p.p. do menor erro médio, fica a margem média mais larga", () => {
    const passo = escolherConstantesDoModelo([
      { candidato: "erra 0,30", porNoite: nasTresNoites([0.3, 0.3, 0.3], 2) },
      { candidato: "erra 0,34, mais larga", porNoite: nasTresNoites([0.34, 0.34, 0.34], 2.5) },
      { candidato: "erra 0,36, a mais larga", porNoite: nasTresNoites([0.36, 0.36, 0.36], 3) },
    ]);
    expect(passo.escolhido).toBe("erra 0,34, mais larga");
    expect(passo.candidatos.map((c) => c.empata)).toEqual([true, true, false]);
  });

  it("não escolhe ninguém quando nenhum candidato passa", () => {
    expect(escolherConstantesDoModelo([{ candidato: "cobre pouco", porNoite: nasTresNoites([0.1, 0.1, 0.1], 2, { cobertura: 0.9 }) }]).escolhido).toBeNull();
  });
});

describe("o placar parcial real de uma noite, pelo % de seções totalizadas", () => {
  it("em 2022, repete a virada do histórico oficial: Lula com 50,006% em 67,764% das seções, depois de Bolsonaro à frente (ticket 06)", () => {
    // as trocas de liderança vão de 18:42:53 a 18:44:50, com 68,32% das seções
    const placar = placarReal(noites[0]!);
    expect(placar(67)).toBeLessThan(0.5);
    expect(placar(67.764)).toBeCloseTo(0.50006, 4);
    expect(placar(68.4)).toBeGreaterThan(0.5);
  });

  it("em 2026, dá Flávio 51,22 × Lula 40,66 com 17,22% das seções, o placar publicado às 18:11:38 (ticket 27)", () => {
    expect(placarReal(noites[2]!)(17.22)).toBeCloseTo(51.22 / (51.22 + 40.66), 4);
  });
});

describe("o erro da curva projetada", () => {
  it("é a distância média, em pontos percentuais, entre cada ponto da curva depois do placar de agora e o placar real", () => {
    const pontos = [
      { x: 10, y: 0.5, desvio: 0 },
      { x: 40, y: 0.51, desvio: 0.01 },
      { x: 70, y: 0.5, desvio: 0.01 },
      { x: 100, y: 0.52, desvio: 0 },
    ];
    // o real fica em 50% até 50% das seções e em 51% depois: 1, 1 e 1 ponto
    expect(erroDaCurva(pontos, (x) => (x <= 50 ? 0.5 : 0.51))).toBeCloseTo(1, 12);
  });
});

describe("a escolha da ordem de chegada (passo 2)", () => {
  it("fica a de menor erro da curva, na média das três noites", () => {
    const passo = escolherOrdem([
      { candidato: "mistura", porNoite: [1.0, 1.1, 1.2] },
      { candidato: "primeiro-turno", porNoite: [0.8, 0.9, 1.0] },
      { candidato: "ritmo-da-noite", porNoite: [1.5, 1.5, 1.5] },
    ]);
    expect(passo.escolhido).toBe("primeiro-turno");
    expect(passo.candidatos.map((c) => c.erroDaCurva)).toEqual([expect.closeTo(1.1, 12), expect.closeTo(0.9, 12), expect.closeTo(1.5, 12)]);
  });

  it("fica a 'mistura' quando ela erra menos de 0,05 p.p. a mais que a melhor", () => {
    const passo = escolherOrdem([
      { candidato: "mistura", porNoite: [0.94, 0.94, 0.94] },
      { candidato: "primeiro-turno", porNoite: [0.9, 0.9, 0.9] },
      { candidato: "ritmo-da-noite", porNoite: [1.5, 1.5, 1.5] },
    ]);
    expect(passo.escolhido).toBe("mistura");
  });
});

describe("a escolha de K (passo 3)", () => {
  const caso = (maiorErroNoComeco: number, cobertura = 0.97): MedidaDaNoite => ({ cobertura, maiorChanceDeQuemPerdeu: 0.9, maiorErroNoComeco, erroMedio: 0.3, margemMedia: 2 });

  it("fica o K de menor erro no pior caso, entre os que cobrem 95% em todos os casos", () => {
    const passo = escolherK([
      { candidato: 0.25, porCaso: [caso(1.0), caso(1.8), caso(0.9)] },
      { candidato: 0.5, porCaso: [caso(1.2), caso(1.3), caso(1.4)] },
      { candidato: 1, porCaso: [caso(0.5), caso(0.6), caso(0.7, 0.94)] },
      { candidato: 2, porCaso: [caso(1.5), caso(1.5), caso(1.5)] },
    ]);
    expect(passo.escolhido).toBe(0.5);
    expect(passo.candidatos.map((c) => [c.candidato, c.piorCaso, c.passaCobertura])).toEqual([
      [0.25, 1.8, true],
      [0.5, 1.4, true],
      [1, 0.7, false],
      [2, 1.5, true],
    ]);
  });

  it("não escolhe nenhum K quando nenhum cobre 95% em todos os casos", () => {
    expect(escolherK([{ candidato: 0.5, porCaso: [caso(1, 0.9)] }]).escolhido).toBeNull();
  });
});

describe("os casos de K", () => {
  it("são 2022 com o agregado real e deslocado 2 pontos para cada candidato, 2018 e 2026, com o agregado real", () => {
    expect(casosDoK(noites).map((c) => [c.nome, c.agregado.valor.toFixed(2)])).toEqual([
      ["2º turno de 2022", "50.98"],
      ["2º turno de 2022, +2 para LULA", "52.98"],
      ["2º turno de 2022, +2 para JAIR BOLSONARO", "48.98"],
      ["2º turno de 2018", "57.01"],
      ["1º turno de 2026", "48.87"],
    ]);
  });

  // Os números do ticket 08, com a fotografia de 0,1% (0,09998% das seções em 2022), que ele deixou de fora sem
  // querer: com ela, o +2 para Bolsonaro erra 1,60, e não 1,03 (decisão do dono, 19/10). O 1,12 de lá é 1,1146.
  it("em 2022, com K = 0,5%, erram no máximo 1,11, 1,74 e 1,60 de 0,1% a 5% das seções, e a 'Só apuração', 1,74 (ticket 08)", () => {
    const [real, comLula, comBolsonaro] = casosDoK(noites);
    const maiorErro = (agregado?: { valor: number; incerteza: number }) => medirNoite(executarNoite(noites[0]!.modelo, noites[0]!.noite, CONSTANTES_PROVISORIAS, { agregado })).maiorErroNoComeco;
    expect(maiorErro()).toBeCloseTo(1.74, 2);
    expect(maiorErro(real!.agregado)).toBeCloseTo(1.11, 2);
    expect(maiorErro(comLula!.agregado)).toBeCloseTo(1.74, 2);
    expect(maiorErro(comBolsonaro!.agregado)).toBeCloseTo(1.6, 2);
  }, 30_000);
});

describe("os momentos 'sem sinal de virada' de um lugar e os seguidos de virada", () => {
  // O placar é a fatia do 1º finalista: acima de 50%, ele lidera.
  const momento = (secoes: number, placar: number | null, chanceDeVirada: number | null = 0.01) => ({ secoes, placar, chanceDeVirada });

  it("conta um momento com a chance de virada abaixo do limite, e se depois, com 3% das seções do lugar, outro lidera", () => {
    const serie = [momento(1, 0.6), momento(10, 0.55), momento(20, 0.45, 0.3), momento(30, 0.52, 0.2)];
    // com 5%, os dois primeiros não têm sinal, e o 1º finalista perde a liderança com 20%; mesmo voltando, conta
    expect(semSinalSeguidoDeVirada(serie, 0.05)).toEqual({ semSinal: 2, seguidosDeVirada: 2 });
    // com 0,5%, nenhum momento fica sem sinal
    expect(semSinalSeguidoDeVirada(serie, 0.005)).toEqual({ semSinal: 0, seguidosDeVirada: 0 });
  });

  it("não conta como virada a troca de liderança antes de 3% das seções do lugar, como a narração", () => {
    // o 1º finalista perde a liderança com 2% e a retoma com 2,9%: só o momento de 2% é seguido de virada
    expect(semSinalSeguidoDeVirada([momento(0.5, 0.6), momento(2, 0.4), momento(2.9, 0.6), momento(10, 0.6)], 0.05)).toEqual({ semSinal: 4, seguidosDeVirada: 1 });
  });

  it("deixa de fora o lugar sem seções, o que terminou, o empate e quem ainda não tem chance de virada", () => {
    const serie = [momento(0, null, null), momento(5, 0.5, null), momento(6, 0.6), momento(100, 0.4, 0)];
    // o fim, com 100% das seções, não é momento "sem sinal", mas a troca nele conta como virada do de 6%
    expect(semSinalSeguidoDeVirada(serie, 0.05)).toEqual({ semSinal: 1, seguidosDeVirada: 1 });
  });
});

describe("a escolha do limite de 'sem sinal de virada' (passo 4)", () => {
  const execucao = (seguidosDeCima: number, semSinal: number, seguidos: number) => ({ deCima: { semSinal: 100, seguidosDeVirada: seguidosDeCima, lugares: [] }, municipios: { semSinal, seguidosDeVirada: seguidos } });

  it("fica o primeiro limite, na ordem, sem virada depois de 'sem sinal' no Brasil, nas UFs e no Exterior e com até 5% nos municípios, em todas as execuções", () => {
    const passo = escolherLimite([
      { candidato: 0.05, porExecucao: [execucao(0, 1000, 40), execucao(1, 1000, 10)] },
      { candidato: 0.02, porExecucao: [execucao(0, 1000, 51), execucao(0, 1000, 10)] },
      { candidato: 0.01, porExecucao: [execucao(0, 1000, 50), execucao(0, 1000, 10)] },
    ]);
    expect(passo.candidatos.map((c) => c.passa)).toEqual([false, false, true]);
    expect(passo.escolhido).toBe(0.01);
  });

  it("não escolhe quando nem o de 1% passa", () => {
    expect(escolherLimite([{ candidato: 0.01, porExecucao: [execucao(2, 1000, 0)] }]).escolhido).toBeNull();
  });
});

describe("o sinal de virada numa noite real", () => {
  it("em 2022, com todo momento contando como 'sem sinal de virada', acha a virada do Brasil e as de MG, AP e AM (a medição da narração de 2022)", () => {
    const [soApuracao] = execucoesDoSinal(noites);
    const [medida] = medirSinal(soApuracao!, CONSTANTES_PROVISORIAS, [1.0001]);
    // a lista tem também as UFs em que a liderança dos primeiros momentos não é a de quando elas passam de 3% das seções
    expect(medida!.deCima.lugares).toEqual(expect.arrayContaining(["Brasil", "MG", "AP", "AM"]));
    expect(medida!.municipios.seguidosDeVirada).toBeGreaterThan(0);
  });
});

describe("as execuções do sinal de virada", () => {
  it("são as três noites nas duas bases e 2022 com o agregado deslocado para cada lado: oito", () => {
    expect(execucoesDoSinal(noites).map((e) => e.nome)).toEqual([
      "2º turno de 2022, Só apuração",
      "2º turno de 2018, Só apuração",
      "1º turno de 2026, Só apuração",
      "2º turno de 2022, Apuração + pesquisas",
      "2º turno de 2022, +2 para LULA, Apuração + pesquisas",
      "2º turno de 2022, +2 para JAIR BOLSONARO, Apuração + pesquisas",
      "2º turno de 2018, Apuração + pesquisas",
      "1º turno de 2026, Apuração + pesquisas",
    ]);
  });
});

describe("a noite momento a momento", () => {
  const noite = noiteMomentoAMomento(noites[0]!, CONSTANTES_PROVISORIAS);

  it("traz, em 2022, as duas bases e o agregado deslocado 2 pontos para cada candidato", () => {
    expect(noite.bases).toEqual(["so_apuracao", "com_pesquisas", "com_pesquisas_mais_2_13", "com_pesquisas_mais_2_22"]);
  });

  it("começa antes da primeira seção, com a 'Só apuração' no 1º turno (Lula 52,86) e a base com pesquisas no agregado (50,98), como no ticket 08", () => {
    const [antes] = noite.linhas;
    expect(antes).toMatchObject({ hora: null, secoes: 0, placar: null });
    expect(100 * antes!.bases[0]!.projecao).toBeCloseTo(52.86, 2);
    expect(100 * antes!.bases[1]!.projecao).toBeCloseTo(50.98, 2);
    expect(antes!.bases[1]!.pesoDasPesquisas).toBe(1);
  });

  it("segue pelas fotografias até o fim, no resultado oficial, com a hora de Brasília", () => {
    expect(noite.linhas).toHaveLength(107);
    expect(noite.linhas[1]).toMatchObject({ secoes: expect.closeTo(0.1, 2) });
    const fim = noite.linhas.at(-1)!;
    // o fim às 00:18:04 de 31/10, Lula com 50,90%
    expect(fim.hora).toBe("2022-10-31 00:18:04");
    for (const base of fim.bases) expect(100 * base.projecao).toBeCloseTo(50.9, 2);
  });
});

describe("a escolha da zona (passo 5)", () => {
  const medida = (erroMedio: number, cobertura: number): MedidaDaNoite => ({ cobertura, maiorChanceDeQuemPerdeu: 0.9, maiorErroNoComeco: 1, erroMedio, margemMedia: 2 });

  it("entra só se reduzir o erro médio em pelo menos 0,05 p.p. em todas as noites, sem baixar a cobertura", () => {
    const passa = (municipio: MedidaDaNoite, zona: MedidaDaNoite) => ({ municipio, zona });
    expect(escolherZona([passa(medida(0.4, 0.98), medida(0.34, 0.98)), passa(medida(0.7, 0.97), medida(0.6, 0.99))]).escolhido).toBe(true);
    // numa noite, a redução é de 0,04
    expect(escolherZona([passa(medida(0.4, 0.98), medida(0.36, 0.98)), passa(medida(0.7, 0.97), medida(0.6, 0.99))]).escolhido).toBe(false);
    // numa noite, a cobertura cai
    expect(escolherZona([passa(medida(0.4, 0.98), medida(0.3, 0.97)), passa(medida(0.7, 0.97), medida(0.6, 0.99))]).escolhido).toBe(false);
  });
});
