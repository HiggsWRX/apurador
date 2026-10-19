import { describe, expect, it } from "vitest";
import { basesCoincidem, curvaProjetada, indicacaoDasPesquisas, momentosDaNoite, pesoDasPesquisas, prepararModelo, projetar } from "../src/index.ts";
import { agregado2022, antesDaPrimeiraSecao, base2022, base2026, constantes, noite2022, placarEntreFinalistasDos } from "./dados.ts";

// A base "Apuração + pesquisas" (Combinação de pesquisas e apuração, .scratch/apurador-2026/issues/11): o mesmo
// modelo da "Só apuração", que parte da indicação das pesquisas e a perde conforme o Brasil é apurado.

describe("o peso das pesquisas", () => {
  // Decisão 2: com K = 0,5% (provisório), as pesquisas valem tanto quanto 0,5% das seções.
  it("é 100% antes da primeira seção, metade com 0,5% das seções e menos de 10% depois de 5%", () => {
    expect(constantes.secoesDasPesquisas).toBe(0.5);
    expect(pesoDasPesquisas(0, constantes)).toBe(1);
    expect(pesoDasPesquisas(0.5, constantes)).toBe(0.5);
    expect(pesoDasPesquisas(5, constantes)).toBeLessThan(0.1);
    expect(pesoDasPesquisas(5.01, constantes)).toBeLessThan(pesoDasPesquisas(5, constantes));
    expect(pesoDasPesquisas(100, constantes)).toBeCloseTo(0.005, 3);
  });
});

describe("antes da primeira seção, em 25/10", () => {
  const modelo = prepararModelo(base2026);
  const apuracao = antesDaPrimeiraSecao(base2026);
  // Um agregado longe do placar entre finalistas do 1º turno (Flávio 51,0), para a mudança nacional aparecer, com a
  // incerteza do agregado na eleição (Agregado de pesquisas e erro histórico, decisão 5).
  const agregado = { valor: 52, incerteza: 1.5 };
  const projecao = projetar(modelo, apuracao, constantes, agregado);
  const doBrasil = 100 * placarEntreFinalistasDos(base2026.municipios);
  const indicacao = (municipios: typeof base2026.municipios) =>
    indicacaoDasPesquisas({ placarEntreFinalistasDoLugar: 100 * placarEntreFinalistasDos(municipios), placarEntreFinalistasDoBrasil: doBrasil, agregado: agregado.valor }) / 100;
  // Como na "Só apuração", a fatia do voto que falta de cada município fica entre 1% e 99%: os postos do Exterior
  // em que um finalista teve quase todos os votos afastam a soma da indicação exata.
  const ATE_UM_MILESIMO_DE_PONTO = 5;

  it("dá às pesquisas peso 100% e projeta o Brasil no agregado", () => {
    expect(base2026.finalistas[0]!.numero).toBe(22);
    expect(projecao.pesoDasPesquisas).toBe(1);
    expect(projecao.brasil.projecao).toBeCloseTo(0.52, ATE_UM_MILESIMO_DE_PONTO);
    // A chance do agregado é Φ((52 − 50) ÷ 1,5) = 90,9%. A da projeção fica a menos de 1 ponto dela: as partes locais
    // das UFs e dos municípios somam um pouco à incerteza nacional.
    expect(Math.abs(projecao.brasil.chance - 0.909)).toBeLessThan(0.01);
  });

  it("projeta cada UF, o Exterior e cada município na indicação das pesquisas dele", () => {
    for (const uf of modelo.ufs) expect(projecao.ufs[uf]!.projecao, uf).toBeCloseTo(indicacao(base2026.municipios.filter((m) => m.uf === uf)), ATE_UM_MILESIMO_DE_PONTO);
    base2026.municipios.forEach((m, i) => {
      const esperada = indicacao([m]);
      if (esperada > 0.01 && esperada < 0.99) expect(projecao.municipios[i]!.projecao, `${m.uf}/${m.municipio}`).toBeCloseTo(esperada, 12);
    });
  });

  it("tem a incerteza das pesquisas: 1,5 ponto no Brasil, ~1,8 na UF média e ~2,5 em Goiás", () => {
    // Decisão 3: 1,5 nacional, mais 0,13 × a fatia dos eliminados da UF, que é de ~7,8% em média e de 15,3% em Goiás.
    // A decisão arredonda sem as partes locais dos municípios, que somam até ~0,06 ponto.
    const ufs = modelo.ufs.filter((uf) => uf !== "ZZ");
    const media = ufs.reduce((s, uf) => s + projecao.ufs[uf]!.desvio, 0) / ufs.length;

    expect(ufs).toHaveLength(27);
    expect(Math.abs(projecao.brasil.desvio - 0.015)).toBeLessThan(0.0005);
    expect(Math.abs(media - 0.018)).toBeLessThan(0.001);
    expect(Math.abs(projecao.ufs.GO!.desvio - 0.025)).toBeLessThan(0.001);
    // e a "Só apuração", que parte do 1º turno sem pesquisas, tem a margem bem mais larga
    expect(projetar(modelo, apuracao, constantes).brasil.desvio).toBeGreaterThan(2 * projecao.brasil.desvio);
  });

  it("dá a cada município a incerteza nacional, a local da UF e a local dele, 0,15 × a fatia dos eliminados no 1º turno dele", () => {
    const eliminados = (municipios: typeof base2026.municipios) =>
      municipios.reduce((s, m) => s + m.validos - m.votos[0]! - m.votos[1]!, 0) / municipios.reduce((s, m) => s + m.validos, 0);
    const daUf = new Map(modelo.ufs.map((uf) => [uf, eliminados(base2026.municipios.filter((m) => m.uf === uf))]));
    base2026.municipios.forEach((m, i) => {
      if (m.validos <= 0) return;
      const esperado = Math.sqrt(0.015 ** 2 + (0.13 * daUf.get(m.uf)!) ** 2 + (0.15 * eliminados([m])) ** 2);
      expect(projecao.municipios[i]!.desvio, `${m.uf}/${m.municipio}`).toBeCloseTo(esperado, 12);
    });
    // o Distrito Federal é um município só: as duas partes locais, com 10,6% de eliminados, dão ~2,6 pontos
    expect(projecao.ufs.DF!.desvio).toBeCloseTo(0.0258, 4);
  });
});

describe("durante a apuração, na noite de 2022", () => {
  const modelo = prepararModelo(base2022);
  const momentos = [...momentosDaNoite(modelo, noite2022)];
  const noMomento = (secoes: number) => momentos.find((m) => m.secoes >= secoes)!;
  // o agregado deslocado 2 pontos para Lula, para a diferença entre as bases aparecer
  const agregado = { ...agregado2022, valor: agregado2022.valor + 2 };

  it("estima o voto que falta de cada município com peso × indicação das pesquisas + (1 − peso) × a estimativa da apuração, corrigido pelo próprio placar", () => {
    const { apuracao } = noMomento(1);
    const soApuracao = projetar(modelo, apuracao, constantes);
    const comPesquisas = projetar(modelo, apuracao, constantes, agregado);
    const peso = comPesquisas.pesoDasPesquisas;
    const doBrasil = 100 * placarEntreFinalistasDos(base2022.municipios);
    let conferidos = 0;
    let corrigidos = 0;

    expect(peso).toBeCloseTo(1 / 3, 2);
    base2022.municipios.forEach((m, i) => {
      const fatia = soApuracao.fatiaDoQueFalta[i]!;
      if (comPesquisas.votoQueFalta[i]! <= 0 || fatia <= 0.01 || fatia >= 0.99) return;
      // Na "Só apuração", fatia = (1 − w) × estimativa + w × placar, com w = votos ÷ (votos + 3.000). Com pesquisas, o
      // ponto de partida passa a ser peso × indicação + (1 − peso) × estimativa, e a correção w fica por cima.
      const votos = apuracao[i]!.votos[0]! + apuracao[i]!.votos[1]!;
      const w = votos / (votos + constantes.pesoDoMunicipio);
      const placar = votos > 0 ? apuracao[i]!.votos[0]! / votos : 0;
      const indicacao = indicacaoDasPesquisas({ placarEntreFinalistasDoLugar: 100 * placarEntreFinalistasDos([m]), placarEntreFinalistasDoBrasil: doBrasil, agregado: agregado.valor }) / 100;
      const esperada = peso * ((1 - w) * indicacao + w * placar) + (1 - peso) * fatia;
      if (esperada <= 0.01 || esperada >= 0.99) return;
      expect(comPesquisas.fatiaDoQueFalta[i], `${m.uf}/${m.municipio}`).toBeCloseTo(esperada, 12);
      expect(comPesquisas.votoQueFalta[i]).toBe(soApuracao.votoQueFalta[i]);
      conferidos++;
      if (votos > 0) corrigidos++;
    });

    expect(conferidos).toBeGreaterThan(5000);
    expect(corrigidos).toBeGreaterThan(100);
  });
});

describe("as duas bases coincidem", () => {
  // Decisão 5: menos de 0,1 p.p. na projeção e menos de 1 ponto na chance de vitória.
  const lugar = { projecao: 0.5, chance: 0.5 };

  it("quando diferem em menos de 0,1 ponto na projeção e de 1 ponto na chance de vitória", () => {
    expect(basesCoincidem(lugar, lugar)).toBe(true);
    expect(basesCoincidem(lugar, { projecao: 0.50099, chance: 0.5099 })).toBe(true);
    expect(basesCoincidem(lugar, { projecao: 0.49901, chance: 0.4901 })).toBe(true);
  });

  it("não coincidem com 0,1 ponto ou mais na projeção, nem com 1 ponto ou mais na chance", () => {
    expect(basesCoincidem(lugar, { projecao: 0.5011, chance: 0.5 })).toBe(false);
    expect(basesCoincidem(lugar, { projecao: 0.4989, chance: 0.5 })).toBe(false);
    expect(basesCoincidem(lugar, { projecao: 0.5, chance: 0.5101 })).toBe(false);
    expect(basesCoincidem(lugar, { projecao: 0.5, chance: 0.4899 })).toBe(false);
  });

  it("não coincidem no Brasil antes da primeira seção com as pesquisas deslocadas, e coincidem em todo lugar no fim da noite de 2022", () => {
    const modelo = prepararModelo(base2022);
    const fim = [...momentosDaNoite(modelo, noite2022)].at(-1)!.apuracao;
    const deslocado = { ...agregado2022, valor: agregado2022.valor - 2 };
    const [so, com] = [projetar(modelo, fim, constantes), projetar(modelo, fim, constantes, deslocado)];
    const lugares = (p: typeof so) => [p.brasil, ...modelo.ufs.map((uf) => p.ufs[uf]!), ...p.municipios];
    const antes = antesDaPrimeiraSecao(base2022);

    expect(basesCoincidem(projetar(modelo, antes, constantes).brasil, projetar(modelo, antes, constantes, deslocado).brasil)).toBe(false);
    lugares(so).forEach((r, i) => expect(basesCoincidem(r, lugares(com)[i]!)).toBe(true));
  });
});

describe("a curva projetada antes da apuração", () => {
  // Decisão 6: as duas bases desenham "O que esperar da noite", de 0% a 100%, na ordem de chegada do 1º turno. A base
  // é o 1º turno de 2022, com Lula em 52,86% entre os finalistas, e o agregado da véspera de 2022 o põe em 50,98%.
  const modelo = prepararModelo(base2022);
  const apuracao = antesDaPrimeiraSecao(base2022);
  const curvas = (agregado?: typeof agregado2022) => {
    const projecao = projetar(modelo, apuracao, constantes, agregado);
    const ordens = (["mistura", "primeiro-turno", "ritmo-da-noite"] as const).map((ordemDeChegada) => curvaProjetada(modelo, apuracao, projecao, { ...constantes, ordemDeChegada }));
    return { projecao, curva: ordens[0]!, ordens };
  };
  const so = curvas();
  const com = curvas(agregado2022);

  it("vai de 0% a 100% das seções nas duas bases, na ordem do 1º turno, até a projeção de cada uma", () => {
    expect(so.projecao.brasil.projecao).toBeCloseTo(0.5286, 4);
    expect(com.projecao.brasil.projecao).toBeCloseTo(0.5098, 4);
    for (const { projecao, curva, ordens } of [so, com]) {
      expect(ordens[1]).toEqual(curva);
      expect(ordens[2]).toEqual(curva);
      expect(curva.brasil.pontos[0]!.x).toBeLessThan(3);
      expect(curva.brasil.pontos.at(-1)!.x).toBe(100);
      expect(curva.brasil.pontos.at(-1)!.y).toBeCloseTo(projecao.brasil.projecao, 12);
      expect(curva.brasil.pontos.at(-1)!.desvio).toBeCloseTo(projecao.brasil.desvio, 12);
      for (const uf of modelo.ufs) expect(curva.ufs[uf]!.pontos.at(-1)!.y, uf).toBeCloseTo(projecao.ufs[uf]!.projecao, 12);
    }
  });

  it("dá a virada projetada de Lula nas duas bases, mais tarde com as pesquisas, que o deixam mais perto de 50%", () => {
    // como em 2022, Bolsonaro sai na frente, e Lula sobe com o Nordeste, que chega tarde
    for (const { curva } of [so, com]) {
      expect(curva.brasil.pontos[0]!.y).toBeLessThan(0.5);
      expect(curva.brasil.virada).toMatchObject({ quem: 0 });
    }
    expect(so.curva.brasil.virada!.x!).toBeLessThan(com.curva.brasil.virada!.x!);
    expect(com.curva.brasil.virada!.cedo!).toBeLessThan(com.curva.brasil.virada!.x!);
  });
});
