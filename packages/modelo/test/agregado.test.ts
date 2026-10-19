import { describe, expect, it } from "vitest";
import { agregadoDePesquisas, diaDoAgregado, tendenciaDoAgregado, type PesquisaDoAgregado } from "../src/index.ts";

// As pesquisas do `pesquisas.csv` conferido em 19/10/2026, com o instituto da lista de cada uma (a Nexus conta como
// FSB) e os votos totais publicados de Flávio e de Lula. Referência: o comentário de 19/10 no ticket 04 e no ticket 10
// do mapa, que fazem a conta de 18/10 à mão.
const pesquisa = (registro: string, instituto: string, campoFim: string, divulgacao: string, flavio: number, lula: number): PesquisaDoAgregado => ({
  registro,
  instituto,
  campoFim,
  divulgacao,
  votos: [flavio, lula],
});
const PESQUISAS: PesquisaDoAgregado[] = [
  pesquisa("BR-04499/2026", "FSB", "2026-10-18", "2026-10-19", 46.5, 45.9),
  pesquisa("BR-02586/2026", "PoderData", "2026-10-18", "2026-10-19", 49, 46),
  pesquisa("BR-05187/2026", "Gerp", "2026-10-16", "2026-10-16", 50, 45),
  pesquisa("BR-01107/2026", "Veritá", "2026-10-16", "2026-10-17", 49.7, 47.7),
  pesquisa("BR-03764/2026", "Futura", "2026-10-15", "2026-10-16", 49, 47.5),
  pesquisa("BR-00466/2026", "Datafolha", "2026-10-15", "2026-10-15", 47, 45),
  pesquisa("BR-04258/2026", "PoderData", "2026-10-15", "2026-10-16", 47, 47),
  pesquisa("BR-00652/2026", "MDA", "2026-10-15", "2026-10-16", 46.8, 45.9),
  pesquisa("BR-00223/2026", "Ipespe", "2026-10-15", "2026-10-17", 48, 46),
  pesquisa("BR-08729/2026", "Quaest", "2026-10-13", "2026-10-14", 46, 44),
  pesquisa("BR-01209/2026", "PoderData", "2026-10-12", "2026-10-13", 48, 46),
  pesquisa("BR-07997/2026", "FSB", "2026-10-12", "2026-10-13", 48, 45),
  pesquisa("BR-07877/2026", "Gerp", "2026-10-12", "2026-10-13", 53, 44),
  pesquisa("BR-00650/2026", "Futura", "2026-10-10", "2026-10-13", 50, 46.6),
  pesquisa("BR-02949/2026", "Datafolha", "2026-10-08", "2026-10-08", 49, 45),
  pesquisa("BR-00933/2026", "Ipespe", "2026-10-08", "2026-10-10", 49, 44),
  pesquisa("BR-08134/2026", "PoderData", "2026-10-07", "2026-10-08", 49, 44),
];

describe("agregado de pesquisas", () => {
  it("confere a conta de 18/10: Flávio 51,1% com 9 institutos, incerteza de 1,84 ponto e chance de ~72%", () => {
    const agregado = agregadoDePesquisas(PESQUISAS, "2026-10-18")!;
    expect(agregado.valor).toBeCloseTo(51.09, 2);
    expect(agregado.pesquisas.map((p) => p.registro).sort()).toEqual(
      [
        "BR-05187/2026", // Gerp
        "BR-01107/2026", // Veritá
        "BR-03764/2026", // Futura
        "BR-00466/2026", // Datafolha
        "BR-04258/2026", // PoderData
        "BR-00652/2026", // MDA
        "BR-00223/2026", // Ipespe
        "BR-08729/2026", // Quaest
        "BR-07997/2026", // Nexus, que conta como FSB
      ].sort(),
    );
    expect(agregado.incerteza).toBeCloseTo(1.84, 2);
    expect(agregado.chance).toBeCloseTo(0.72, 2);
    expect(agregado.janela).toBe(7);
  });

  it("tem incerteza de 1,5 ponto em 25/10: com 51,0, a faixa de 95% vai de 48,1% a 53,9% e a chance é de ~75%", () => {
    // Decisão 5 do ticket 10 do mapa.
    const agregado = agregadoDePesquisas([pesquisa("BR-00001/2026", "Datafolha", "2026-10-23", "2026-10-24", 51, 49)], "2026-10-25")!;
    expect(agregado.incerteza).toBe(1.5);
    expect(agregado.faixa[0]).toBeCloseTo(48.1, 1);
    expect(agregado.faixa[1]).toBeCloseTo(53.9, 1);
    expect(agregado.chance).toBeCloseTo(0.75, 2);
  });

  describe("janela", () => {
    // Em 24/10, a janela de 7 dias é a do campo terminando de 17 a 23/10.
    const recentes = [
      pesquisa("BR-00001/2026", "Datafolha", "2026-10-23", "2026-10-24", 50, 50),
      pesquisa("BR-00002/2026", "Quaest", "2026-10-20", "2026-10-21", 60, 40),
      pesquisa("BR-00003/2026", "MDA", "2026-10-17", "2026-10-18", 55, 45),
    ];
    const antiga = pesquisa("BR-00004/2026", "Ipespe", "2026-10-12", "2026-10-13", 70, 30);

    it("passa a 14 dias com menos de 4 institutos em 7", () => {
      const agregado = agregadoDePesquisas([...recentes, antiga], "2026-10-24")!;
      expect(agregado.janela).toBe(14);
      expect(agregado.valor).toBeCloseTo((50 + 60 + 55 + 70) / 4, 10);
    });

    it("fica em 7 dias com 4 institutos", () => {
      const quarta = pesquisa("BR-00005/2026", "Futura", "2026-10-22", "2026-10-23", 45, 55);
      const agregado = agregadoDePesquisas([...recentes, quarta, antiga], "2026-10-24")!;
      expect(agregado.janela).toBe(7);
      expect(agregado.valor).toBeCloseTo((50 + 60 + 55 + 45) / 4, 10);
    });

    it("não conta o campo que termina no próprio dia do cálculo nem o que termina antes da janela de 14 dias", () => {
      const doDia = pesquisa("BR-00006/2026", "Futura", "2026-10-24", "2026-10-24", 45, 55);
      const velha = pesquisa("BR-00007/2026", "Veritá", "2026-10-09", "2026-10-10", 45, 55);
      expect(agregadoDePesquisas([...recentes, doDia, velha], "2026-10-24")!.valor).toBeCloseTo((50 + 60 + 55) / 3, 10);
    });
  });

  it("tem a tendência desde 05/10, dia a dia, a partir do primeiro dia com pesquisa", () => {
    const tendencia = tendenciaDoAgregado(PESQUISAS, "2026-10-19");
    // A primeira pesquisa do 2º turno (PoderData, campo de 5 a 7/10) saiu em 08/10.
    expect(tendencia.map((a) => a.dia)).toEqual(["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"].map((d) => `2026-10-${d}`));
    expect(tendencia[0]!.valor).toBeCloseTo(52.69, 2); // PoderData, 49 × 44
    expect(tendencia[1]!.valor).toBeCloseTo(52.41, 2); // mais o Datafolha de 6 a 8/10, 49 × 45
    expect(tendencia.find((a) => a.dia === "2026-10-18")!.valor).toBeCloseTo(51.09, 2);
  });

  describe("congelamento às 23h de 24/10", () => {
    it("calcula o agregado do dia em Brasília até as 23h de 24/10 e, dali em diante, o da noite, de 25/10", () => {
      const dia = (instante: string) => diaDoAgregado(new Date(instante));
      expect(dia("2026-10-19T10:00:00-03:00")).toBe("2026-10-19");
      expect(dia("2026-10-19T23:30:00-03:00")).toBe("2026-10-19");
      expect(dia("2026-10-24T22:59:59-03:00")).toBe("2026-10-24");
      expect(dia("2026-10-24T23:00:00-03:00")).toBe("2026-10-25");
      expect(dia("2026-10-25T16:00:00-03:00")).toBe("2026-10-25");
      expect(dia("2026-10-27T09:00:00-03:00")).toBe("2026-10-25");
    });

    // Na noite, a janela é a do campo terminando de 18 a 24/10.
    const daNoite = [
      pesquisa("BR-00001/2026", "Datafolha", "2026-10-23", "2026-10-24", 50, 50),
      pesquisa("BR-00002/2026", "Quaest", "2026-10-22", "2026-10-23", 60, 40),
      pesquisa("BR-00003/2026", "MDA", "2026-10-20", "2026-10-21", 55, 45),
      pesquisa("BR-00004/2026", "Ipespe", "2026-10-21", "2026-10-22", 45, 55),
      pesquisa("BR-00005/2026", "Futura", "2026-10-19", "2026-10-20", 52, 48),
    ];

    it("não aceita uma pesquisa divulgada em 25/10", () => {
      const nova = pesquisa("BR-00006/2026", "Gerp", "2026-10-24", "2026-10-25", 70, 30);
      expect(agregadoDePesquisas([...daNoite, nova], "2026-10-25")!.valor).toBeCloseTo((50 + 60 + 55 + 45 + 52) / 5, 10);
    });

    it("recalcula quando uma pesquisa é retirada, com a anterior do mesmo instituto no lugar dela se couber na janela", () => {
      const anteriorDaQuaest = pesquisa("BR-00007/2026", "Quaest", "2026-10-18", "2026-10-19", 40, 60);
      const comTodas = [...daNoite, anteriorDaQuaest];
      expect(agregadoDePesquisas(comTodas, "2026-10-25")!.valor).toBeCloseTo((50 + 60 + 55 + 45 + 52) / 5, 10);
      const semAUltimaDaQuaest = comTodas.filter((p) => p.registro !== "BR-00002/2026");
      expect(agregadoDePesquisas(semAUltimaDaQuaest, "2026-10-25")!.valor).toBeCloseTo((50 + 40 + 55 + 45 + 52) / 5, 10);
      const semADoMda = comTodas.filter((p) => p.registro !== "BR-00003/2026");
      expect(agregadoDePesquisas(semADoMda, "2026-10-25")!.valor).toBeCloseTo((50 + 60 + 45 + 52) / 4, 10);
    });
  });

  describe("numa eleição passada", () => {
    // O 2º turno de 2018, em 28/10, com Bolsonaro como primeiro finalista: as pesquisas finais da tabela 2.3 da
    // pesquisa do ticket 06 do mapa (votos totais publicados), mais duas anteriores dos mesmos institutos.
    const de2018 = [
      pesquisa("BR-02460/2018", "Datafolha", "2018-10-27", "2018-10-27", 47, 39),
      pesquisa("BR-05743/2018", "Datafolha", "2018-10-25", "2018-10-25", 48, 38),
      pesquisa("BR-02934/2018", "Ibope", "2018-10-27", "2018-10-27", 47, 41),
      pesquisa("BR-07272/2018", "Ibope", "2018-10-23", "2018-10-23", 50, 37),
      pesquisa("BR-06933/2018", "MDA", "2018-10-27", "2018-10-27", 48.5, 37),
      pesquisa("BR-06785/2018", "Paraná Pesquisas", "2018-10-25", "2018-10-26", 53, 35),
      pesquisa("BR-08980/2018", "Real Time Big Data", "2018-10-24", "2018-10-25", 49, 38),
      pesquisa("BR-08283/2018", "Ipespe", "2018-10-24", "2018-10-25", 51, 37),
      pesquisa("BR-03689/2018", "FSB", "2018-10-21", "2018-10-22", 52, 35),
    ];
    const eleicao = { dia: "2018-10-28", incerteza: 1.5 };

    it("aplica a mesma regra na véspera, com o dia e a incerteza daquela eleição: Bolsonaro com 57,0% e ~100% de chance", () => {
      const agregado = agregadoDePesquisas(de2018, "2018-10-28", eleicao)!;
      expect(agregado.valor).toBeCloseTo(57.0, 1);
      expect(agregado.janela).toBe(7);
      expect(agregado.pesquisas.map((p) => p.registro).sort()).toEqual(
        ["BR-02460/2018", "BR-02934/2018", "BR-06933/2018", "BR-06785/2018", "BR-08980/2018", "BR-08283/2018", "BR-03689/2018"].sort(),
      );
      expect(agregado.incerteza).toBe(1.5);
      expect(agregado.chance).toBeGreaterThan(0.9999);
    });

    it("não aceita a pesquisa divulgada no dia daquela eleição", () => {
      const doDia = pesquisa("BR-09614/2018", "Vox Populi", "2018-10-27", "2018-10-28", 30, 70);
      expect(agregadoDePesquisas([...de2018, doDia], "2018-10-28", eleicao)!.pesquisas.map((p) => p.instituto)).not.toContain("Vox Populi");
    });

    it("soma 0,4² por dia que falta àquela eleição, não a 25/10/2026", () => {
      expect(agregadoDePesquisas(de2018, "2018-10-24", eleicao)!.incerteza).toBeCloseTo(Math.sqrt(1.5 ** 2 + 0.4 ** 2 * 4), 10);
    });
  });

  it("usa a pesquisa de campo mais recente de cada instituto e, no empate, a divulgada por último", () => {
    const anterior = pesquisa("BR-00001/2026", "Datafolha", "2026-10-20", "2026-10-21", 60, 40);
    const empatada = pesquisa("BR-00002/2026", "Datafolha", "2026-10-22", "2026-10-23", 40, 60);
    const ultima = pesquisa("BR-00003/2026", "Datafolha", "2026-10-22", "2026-10-24", 55, 45);
    for (const ordem of [
      [anterior, empatada, ultima],
      [ultima, empatada, anterior],
    ]) {
      expect(agregadoDePesquisas(ordem, "2026-10-24")!.pesquisas.map((p) => p.registro)).toEqual(["BR-00003/2026"]);
    }
  });
});
