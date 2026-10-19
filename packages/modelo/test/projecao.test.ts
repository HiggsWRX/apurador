import { instanteDaNoite } from "@apurador/pipeline";
import { describe, expect, it } from "vitest";
import {
  curvaProjetada,
  momentosDaNoite,
  prepararModelo,
  projetar,
  sinalDeVirada,
  type Apuracao,
  type BaseDoModelo,
  type PontoDaCurva,
  type ResultadoDoLugar,
} from "../src/index.ts";
import { base2022, base2026, constantes, noite2022 } from "./dados.ts";

// A projeção de cada lugar fora do que o protótipo cobre: antes da primeira seção, o recuo de cada UF, o fim
// da noite, o sinal de virada e a curva de cada UF e do Exterior. A noite é a do 2º turno de 2022.

const modelo2026 = prepararModelo(base2026);
const modelo2022 = prepararModelo(base2022);
const momentos = [...momentosDaNoite(modelo2022, noite2022)];
const noMomento = (secoes: number) => momentos.find((m) => m.secoes >= secoes)!;

/** A apuração de 25/10 antes da primeira seção: nada totalizado, com as seções e os eleitores do 1º turno. */
const antesDaPrimeiraSecao = (base: BaseDoModelo): Apuracao => base.municipios.map((m) => ({ secoes: 0, secoesTotais: m.secoes, aptos: 0, aptosTotais: m.aptos, votos: [0, 0] }));

/** O placar entre finalistas de um conjunto de municípios: a fatia do 1º finalista nos votos dos dois, no 1º turno. */
const placarEntreFinalistas = (municipios: BaseDoModelo["municipios"]) =>
  municipios.reduce((s, m) => s + m.votos[0]!, 0) / municipios.reduce((s, m) => s + m.votos[0]! + m.votos[1]!, 0);

describe("antes da primeira seção", () => {
  const projecao = projetar(modelo2026, antesDaPrimeiraSecao(base2026), constantes);
  // A fatia do voto que falta de cada município fica entre 1% e 99%, como no protótipo: os postos do Exterior
  // em que um finalista teve todos os votos afastam a soma do placar exato em menos de 0,0001 ponto.
  const ATE_UM_DECIMO_MILESIMO_DE_PONTO = 6;

  it("projeta o Brasil no placar entre finalistas do 1º turno: Flávio 51,0", () => {
    expect(base2026.finalistas[0]!.numero).toBe(22);
    expect(projecao.brasil.projecao).toBeCloseTo(0.5101, 4);
    expect(projecao.brasil.projecao).toBeCloseTo(placarEntreFinalistas(base2026.municipios), ATE_UM_DECIMO_MILESIMO_DE_PONTO);
  });

  it("projeta cada UF, o Exterior e cada município no placar entre finalistas dele", () => {
    for (const uf of modelo2026.ufs) expect(projecao.ufs[uf]!.projecao, uf).toBeCloseTo(placarEntreFinalistas(base2026.municipios.filter((m) => m.uf === uf)), ATE_UM_DECIMO_MILESIMO_DE_PONTO);
    base2026.municipios.forEach((m, i) => {
      const placar = placarEntreFinalistas([m]);
      // a fatia do voto que falta de um município fica entre 1% e 99%
      if (placar > 0.01 && placar < 0.99) expect(projecao.municipios[i]!.projecao, `${m.uf}/${m.municipio}`).toBeCloseTo(placar, 12);
    });
  });

  it("não tem placar parcial nem quem esteja atrás, e a margem é a mais larga: mais de 8 pontos no Brasil", () => {
    expect(projecao.brasil.placar).toBeNull();
    expect(projecao.brasil.chanceDeVirada).toBeNull();
    expect(projecao.brasil.sinalDeVirada).toBeNull();
    expect(projecao.brasil.margem).toBeGreaterThan(0.08);
    for (const uf of modelo2026.ufs) expect(projecao.ufs[uf]!.referencia).toBe("1º turno");
  });
});

describe("o recuo da referência de cada UF", () => {
  /** Só os municípios das UFs dadas totalizados, com os votos dos finalistas no 1º turno. */
  const soNas = (ufs: string[]): Apuracao =>
    base2026.municipios.map((m) =>
      ufs.includes(m.uf)
        ? { secoes: m.secoes, secoesTotais: m.secoes, aptos: m.aptos, aptosTotais: m.aptos, votos: [...m.votos] }
        : { secoes: 0, secoesTotais: m.secoes, aptos: 0, aptosTotais: m.aptos, votos: [0, 0] },
    );

  it("vai da UF à região e ao Brasil, e o Exterior, que não tem região, recua direto para o Brasil", () => {
    const { ufs } = projetar(modelo2026, soNas(["DF", "SP"]), constantes);

    expect(ufs.DF!.referencia).toBe("UF");
    expect(ufs.SP!.referencia).toBe("UF");
    expect(ufs.GO!.referencia).toBe("região");
    expect(ufs.RJ!.referencia).toBe("região");
    expect(ufs.BA!.referencia).toBe("Brasil");
    expect(ufs.ZZ!.referencia).toBe("Brasil");
  });

  it("dá ao Exterior a própria referência quando ele tem votos bastantes", () => {
    const { ufs } = projetar(modelo2026, soNas(["ZZ"]), constantes);

    expect(ufs.ZZ!.referencia).toBe("UF");
    expect(ufs.SP!.referencia).toBe("Brasil");
  });
});

describe("o fim da noite", () => {
  const projecao = projetar(modelo2022, momentos.at(-1)!.apuracao, constantes);
  const lugares: [string, ResultadoDoLugar][] = [
    ["Brasil", projecao.brasil],
    ...Object.entries(projecao.ufs),
    ...projecao.municipios.map((r, i): [string, ResultadoDoLugar] => [`${base2022.municipios[i]!.uf}/${base2022.municipios[i]!.municipio}`, r]),
  ];

  it("tem todas as seções totalizadas e a projeção igual ao placar, sem margem, em cada lugar", () => {
    for (const [nome, r] of lugares) {
      expect(r.secoes, nome).toBe(100);
      if (r.placar === null) continue;
      expect(r.projecao, nome).toBe(r.placar);
      expect(r.margem, nome).toBe(0);
    }
    expect(projecao.brasil.projecao).toBeCloseTo(0.509, 3);
  });

  it("dá a chance de vitória toda a quem está à frente, e nenhuma chance de virada", () => {
    for (const [nome, r] of lugares) {
      if (r.placar === null || r.placar === 0.5) continue;
      expect(r.chance, nome).toBe(r.placar > 0.5 ? 1 : 0);
      expect(r.chanceDeVirada, nome).toBe(0);
      expect(r.sinalDeVirada, nome).toBe("sem sinal de virada");
    }
  });
});

describe("o sinal de virada", () => {
  it("tem três estados, com os limites de 50% e 5% incluídos no estado de cima", () => {
    expect(sinalDeVirada(1, constantes)).toBe("virada projetada");
    expect(sinalDeVirada(0.5, constantes)).toBe("virada projetada");
    expect(sinalDeVirada(0.4999, constantes)).toBe("virada possível");
    expect(sinalDeVirada(0.05, constantes)).toBe("virada possível");
    expect(sinalDeVirada(0.0499, constantes)).toBe("sem sinal de virada");
    expect(sinalDeVirada(0, constantes)).toBe("sem sinal de virada");
  });

  it("segue os limites das constantes", () => {
    const limites = { sinalDeVirada: { projetada: 0.6, possivel: 0.02 } };

    expect(sinalDeVirada(0.55, limites)).toBe("virada possível");
    expect(sinalDeVirada(0.03, limites)).toBe("virada possível");
    expect(sinalDeVirada(0.019, limites)).toBe("sem sinal de virada");
  });

  it("usa a chance de vitória de quem está atrás no placar parcial, em cada lugar", () => {
    for (const secoes of [10, 30, 60, 80]) {
      const p = projetar(modelo2022, noMomento(secoes).apuracao, constantes);
      for (const r of [p.brasil, ...Object.values(p.ufs), ...p.municipios]) {
        if (r.placar === null || r.placar === 0.5) continue;
        // o 1º finalista da base de 2022 é Lula: quando ele está atrás, a chance de virada é a chance dele
        expect(r.chanceDeVirada).toBe(r.placar < 0.5 ? r.chance : 1 - r.chance);
        expect(r.sinalDeVirada).toBe(sinalDeVirada(r.chanceDeVirada!, constantes));
      }
    }
  });

  it("nunca diz 'sem sinal de virada' no Brasil antes da virada real de 2022, às 18:44", () => {
    const virada = instanteDaNoite(noite2022, "2022-10-30 18:44:04");
    const antes = momentos.filter((m) => m.instante < virada).map((m) => projetar(modelo2022, m.apuracao, constantes).brasil.sinalDeVirada);

    expect(antes.length).toBeGreaterThan(60);
    expect(antes).not.toContain("sem sinal de virada");
    expect(antes.filter((s) => s === "virada projetada").length).toBeGreaterThan(antes.length / 2);
  });
});

describe("a curva projetada de cada UF e do Exterior", () => {
  const momento = noMomento(30);
  const projecao = projetar(modelo2022, momento.apuracao, constantes);
  const curvas = curvaProjetada(modelo2022, momento.apuracao, projecao, constantes);

  it("vai do placar parcial do lugar até a projeção dele, com 100% das seções e a margem dela", () => {
    const lugares: [string, ResultadoDoLugar, PontoDaCurva[]][] = [
      ["Brasil", projecao.brasil, curvas.brasil.pontos],
      ...Object.entries(curvas.ufs).map(([uf, c]): [string, ResultadoDoLugar, PontoDaCurva[]] => [uf, projecao.ufs[uf]!, c.pontos]),
    ];
    for (const [uf, r, pontos] of lugares) {
      expect(pontos[0], uf).toEqual({ x: r.secoes, y: r.placar, desvio: 0 });
      expect(pontos.at(-1)!.x, uf).toBe(100);
      expect(pontos.at(-1)!.y, uf).toBeCloseTo(r.projecao, 12);
      expect(pontos.at(-1)!.desvio, uf).toBeCloseTo(r.desvio, 12);
      expect(pontos.length, uf).toBeLessThanOrEqual(51);
      for (let i = 1; i < pontos.length; i++) expect(pontos[i]!.x, uf).toBeGreaterThan(pontos[i - 1]!.x);
    }
    expect(Object.keys(curvas.ufs)).toContain("ZZ");
  });

  it("espalha os pontos por igual no % de seções do próprio lugar", () => {
    const { pontos } = curvas.ufs.SP!;
    const passo = (100 - pontos[0]!.x) / 50;

    expect(pontos.length).toBeGreaterThan(30);
    // até o salto final, em que chega de uma vez o que o ritmo da noite deixaria para depois de 100% do país
    for (let i = 1; i < pontos.length - 1; i++) expect(pontos[i]!.x - pontos[i - 1]!.x).toBeCloseTo(passo, 9);
  });

  it("dá a virada projetada com o ponto dentro da faixa", () => {
    const viradas = [curvas.brasil, ...Object.values(curvas.ufs)].map((c) => c.virada).filter((v) => v?.x != null);

    expect(viradas.length).toBeGreaterThan(0);
    for (const v of viradas) {
      expect(v!.cedo).not.toBeNull();
      expect(v!.cedo!).toBeLessThanOrEqual(v!.x!);
      if (v!.tarde !== null) expect(v!.tarde).toBeGreaterThanOrEqual(v!.x!);
    }
  });

  it("antes da apuração usa a ordem de chegada do 1º turno, de 0% a 100% das seções", () => {
    const apuracao = antesDaPrimeiraSecao(base2026);
    const projecao = projetar(modelo2026, apuracao, constantes);
    const mistura = curvaProjetada(modelo2026, apuracao, projecao, constantes);
    const primeiroTurno = curvaProjetada(modelo2026, apuracao, projecao, { ...constantes, ordemDeChegada: "primeiro-turno" });

    expect(mistura).toEqual(primeiroTurno);
    expect(mistura.brasil.pontos[0]!.x).toBeLessThan(3);
    expect(mistura.brasil.pontos.at(-1)).toMatchObject({ x: 100 });
    expect(mistura.brasil.pontos.at(-1)!.y).toBeCloseTo(projecao.brasil.projecao, 12);
    // como no 1º turno de 2026, Flávio sai na frente e Lula sobe com o Nordeste, que chega tarde
    expect(mistura.brasil.pontos[0]!.y).toBeGreaterThan(mistura.brasil.pontos.at(-1)!.y);
  });
});

describe("a virada projetada de cada município", () => {
  it("existe quando a projeção fica do outro lado de 50% do placar parcial, entre o % de agora e 100%", () => {
    const p = projetar(modelo2022, noMomento(40).apuracao, constantes);
    let viradas = 0;
    p.municipios.forEach((r, i) => {
      if (r.placar === null || r.secoes >= 100 || r.placar === 0.5) return;
      const vira = r.placar > 0.5 !== r.projecao > 0.5;
      expect(r.virada.x !== null, `${base2022.municipios[i]!.uf}/${base2022.municipios[i]!.municipio}`).toBe(vira);
      if (!vira) return;
      viradas++;
      expect(r.virada.quem).toBe(r.projecao > 0.5 ? 0 : 1);
      expect(r.virada.x!).toBeGreaterThan(r.secoes);
      expect(r.virada.x!).toBeLessThan(100);
      expect(r.virada.cedo!).toBeLessThanOrEqual(r.virada.x!);
      if (r.virada.tarde !== null) expect(r.virada.tarde).toBeGreaterThanOrEqual(r.virada.x!);
    });
    expect(viradas).toBeGreaterThan(10);
  });
});

describe("o desempenho", () => {
  it("faz uma projeção completa, com as curvas, sobre todos os municípios em poucos milissegundos", () => {
    const { apuracao } = noMomento(30);
    const rodar = () => curvaProjetada(modelo2022, apuracao, projetar(modelo2022, apuracao, constantes), constantes);
    for (let i = 0; i < 10; i++) rodar();
    const tempos = Array.from({ length: 15 }, () => {
      const t0 = performance.now();
      rodar();
      return performance.now() - t0;
    }).sort((a, b) => a - b);

    expect(modelo2022.municipios.length).toBe(5751);
    expect(tempos[7]).toBeLessThan(10);
  });
});
