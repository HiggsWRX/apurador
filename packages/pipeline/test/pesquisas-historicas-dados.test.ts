import { readFileSync } from "node:fs";
import { historicoDoAgregado, raizDoErroQuadraticoMedio } from "@apurador/modelo";
import { describe, expect, it } from "vitest";
import { agregadoDaNoite, eleicoesPassadas, lerPesquisasHistoricas, type PesquisaHistorica } from "../src/pesquisas-historicas.ts";
import type { ResultadoHistorico } from "../src/resultados-historicos.ts";
import type { BaseDoModelo } from "../src/base.ts";
import type { Turno } from "../src/turno.ts";

// O histórico das pesquisas do repositório (`dados/pesquisas-historicas.csv`) sobre os resultados somados dos arquivos
// do TSE (`dados/resultados-historicos.json`, conferido no CI). As referências são a tabela 2.3 e a seção 2.4 da
// pesquisa do ticket 06 do mapa e a conta prévia da decisão 10 do ticket 10.
const DADOS = new URL("../../../dados/", import.meta.url);
const ler = (arquivo: string) => readFileSync(new URL(arquivo, DADOS), "utf8");
const pesquisas = lerPesquisasHistoricas(ler("pesquisas-historicas.csv"));
const resultados = (JSON.parse(ler("resultados-historicos.json")) as { eleicoes: ResultadoHistorico[] }).eleicoes;
const historico = historicoDoAgregado(eleicoesPassadas(pesquisas, resultados));
const doAno = (ano: number) => historico.find((a) => a.ano === ano)!;
const finalistasDaBase = (noite: string) => (JSON.parse(ler(`bases/${noite}.json`)) as BaseDoModelo).finalistas.map((f) => f.numero) as [number, number];

describe("pesquisas-historicas.csv", () => {
  it("cobre os seis 2º turnos de 2002 a 2022 e o 1º turno de 2026, só com pesquisas nacionais e uma fonte por linha", () => {
    expect([...new Set(pesquisas.map((p) => `${p.ano}-${p.turno}`))]).toEqual(["2002-2", "2006-2", "2010-2", "2014-2", "2018-2", "2022-2", "2026-1"]);
    for (const p of pesquisas) expect(p.fonte, `${p.ano} ${p.instituto}`).toMatch(/^https?:\/\/\S+$/);
  });

  it("não traz erro por UF nem por instituto: só o que a fonte publicou", () => {
    const [cabecalho] = ler("pesquisas-historicas.csv").split("\n");
    expect(cabecalho).not.toMatch(/erro|uf/i);
  });
});

describe("resultados conferidos no TSE", () => {
  it("dão, nos válidos, os números da tabela 2.3: o PT com 61,27, 60,83, 56,05, 51,64, 44,87 e 50,90", () => {
    const doPt = resultados
      .filter((r) => r.turno === 2)
      .map((r) => {
        const pt = r.finalistas.find((f) => f.partido === "PT")!;
        return [r.ano, Number(((100 * pt.votos) / r.validos).toFixed(2))];
      });
    expect(doPt).toEqual([
      [2002, 61.27],
      [2006, 60.83],
      [2010, 56.05],
      [2014, 51.64],
      [2018, 44.87],
      [2022, 50.9],
    ]);
  });

  it("batem com os turnos do repositório em 2018, 2022 e no 1º turno de 2026", () => {
    for (const r of resultados.filter((r) => r.ano >= 2018)) {
      const turno = JSON.parse(ler(`turnos/${r.ano}-${r.turno}.json`)) as Turno;
      const votos = (n: number) => turno.lugares.BR!.votos[turno.candidatos.findIndex((c) => c.numero === n)];
      expect(
        r.finalistas.map((f) => f.votos),
        `${r.ano}`,
      ).toEqual(r.finalistas.map((f) => votos(f.numero)));
      expect(r.validos, `${r.ano}`).toBe(turno.lugares.BR!.validos);
    }
  });
});

describe("a regra do agregado nos seis 2º turnos", () => {
  it("confere a conta prévia: Bolsonaro com ~100% de chance em 2018 (57,0% contra 55,1%) e Lula com ~75% em 2022 (51,0% contra 50,9%)", () => {
    expect(doAno(2018).agregado.valor).toBeCloseTo(57.0, 1);
    expect(doAno(2018).resultado).toBeCloseTo(55.13, 2);
    expect(doAno(2018).agregado.chance).toBeGreaterThan(0.999);
    expect(doAno(2022).agregado.valor).toBeCloseTo(51.0, 1);
    expect(doAno(2022).resultado).toBeCloseTo(50.9, 2);
    expect(doAno(2022).agregado.chance).toBeCloseTo(0.75, 2);
  });

  it("usa, em cada ano, a pesquisa final de cada instituto: 1 média em 2002, 3 em 2006, 5 em 2010, 6 em 2014, 7 em 2018 e 12 em 2022", () => {
    expect(historico.map((a) => [a.ano, a.agregado.pesquisas.length, a.agregado.janela])).toEqual([
      [2002, 1, 14],
      [2006, 3, 14],
      [2010, 5, 7],
      [2014, 6, 7],
      [2018, 7, 7],
      [2022, 12, 7],
    ]);
  });

  it("erra, no primeiro finalista, +1,8 em 2002, +1,2 em 2006, −0,3 em 2010, −1,5 em 2014, +1,9 em 2018 e +0,1 em 2022", () => {
    // A tabela 2.3 dá −0,8 em 2014 sem a Veritá de 17 a 20/10; o resto bate com ela (2018 com o sinal de Bolsonaro).
    expect(historico.map((a) => [a.ano, Number(a.erro.toFixed(1))])).toEqual([
      [2002, 1.8],
      [2006, 1.2],
      [2010, -0.3],
      [2014, -1.5],
      [2018, 1.9],
      [2022, 0.1],
    ]);
  });

  it("dá cerca de 1,3 ponto de raiz do erro quadrático médio na participação, sem lado fixo", () => {
    const erros = historico.map((a) => a.erro);
    expect(raizDoErroQuadraticoMedio(erros)).toBeCloseTo(1.3, 1);
    // Sem lado fixo: o PT foi superestimado em três anos e subestimado em três.
    const doPt = historico.map((a) => (resultados.find((r) => r.ano === a.ano)!.finalistas[0].partido === "PT" ? a.erro : -a.erro));
    expect(doPt.filter((e) => e > 0)).toHaveLength(3);
    expect(doPt.filter((e) => e < 0)).toHaveLength(3);
  });

  it("calcula a incerteza de cada ano sem aquele ano, e o resultado de todos cai na faixa de 95%", () => {
    expect(historico.map((a) => [a.ano, Number(a.agregado.incerteza.toFixed(2))])).toEqual([
      [2002, 1.19],
      [2006, 1.33],
      [2010, 1.42],
      [2014, 1.26],
      [2018, 1.15],
      [2022, 1.43],
    ]);
    for (const a of historico) {
      expect(a.resultado, `${a.ano}`).toBeGreaterThan(a.agregado.faixa[0]);
      expect(a.resultado, `${a.ano}`).toBeLessThan(a.agregado.faixa[1]);
    }
  });
});

describe("agregados das noites do replay, da calibração e do ensaio geral", () => {
  it("dá o de 2022, congelado na véspera, no primeiro finalista da base da noite (Lula), com a incerteza de 1,5 da noite", () => {
    const agregado = agregadoDaNoite(pesquisas, resultados, { ano: 2022, turno: 2 }, finalistasDaBase("2022-2"));
    expect(agregado.dia).toBe("2022-10-30");
    expect(agregado.valor).toBeCloseTo(50.98, 2);
    expect(agregado.incerteza).toBe(1.5);
    expect(agregado.pesquisas).toHaveLength(12);
  });

  it("dá o de 2018 no primeiro finalista da base (Bolsonaro)", () => {
    const agregado = agregadoDaNoite(pesquisas, resultados, { ano: 2018, turno: 2 }, finalistasDaBase("2018-2"));
    expect(agregado.dia).toBe("2018-10-28");
    expect(agregado.valor).toBeCloseTo(57.0, 1);
  });

  it("dá o mesmo valor com os finalistas na ordem trocada, do outro lado", () => {
    const [a, b] = finalistasDaBase("2022-2");
    expect(agregadoDaNoite(pesquisas, resultados, { ano: 2022, turno: 2 }, [b, a]).valor).toBeCloseTo(100 - 50.98, 2);
  });

  it("quebra com finalistas que não são os da eleição", () => {
    expect(() => agregadoDaNoite(pesquisas, resultados, { ano: 2022, turno: 2 }, [13, 45])).toThrow(/2022/);
  });
});

describe("pesquisas do 1º turno de 2026 entre os dois finalistas", () => {
  const doPrimeiroTurno = pesquisas.filter((p) => p.ano === 2026 && p.turno === 1);
  const resultado = resultados.find((r) => r.ano === 2026 && r.turno === 1)!;
  const [flavio, lula] = resultado.finalistas;
  // A margem de Flávio sobre Lula nos válidos, com todos os candidatos: na pesquisa e no resultado.
  const margem = (p: PesquisaHistorica) => (100 * (p.votos.get(22)! - p.votos.get(13)!)) / (p.votos.get(22)! + p.votos.get(13)! + p.outros!);
  const erroMedioNaMargem = (ps: PesquisaHistorica[]) =>
    ps.reduce((s, p) => s + margem(p), 0) / ps.length - (100 * (flavio.votos - lula.votos)) / resultado.validos;

  it("confere os 2,8 pontos contra Flávio na margem, nas 8 finais da seção 2.4 (campo terminando de 1 a 3/10)", () => {
    const finais = doPrimeiroTurno.filter((p) => p.campoFim >= "2026-10-01");
    expect(finais.map((p) => p.instituto).sort()).toEqual(["AtlasIntel", "Datafolha", "Futura", "MDA", "Palver", "PoderData", "Quaest", "Vox Brasil"]);
    expect(erroMedioNaMargem(finais)).toBeCloseTo(-2.8, 1);
  });

  it("dá, pela regra do agregado (12 institutos com campo terminando de 27/09 a 03/10), Flávio com 48,9% entre os dois, contra 51,0%", () => {
    const agregado = agregadoDaNoite(pesquisas, resultados, { ano: 2026, turno: 1 }, finalistasDaBase("2026-1"));
    expect(agregado.dia).toBe("2026-10-04");
    expect(agregado.pesquisas).toHaveLength(12);
    expect(agregado.valor).toBeCloseTo(48.87, 2);
    expect((100 * flavio.votos) / (flavio.votos + lula.votos)).toBeCloseTo(51.01, 2);
    // Com as 12, o erro na margem nos válidos passa a −3,8.
    expect(erroMedioNaMargem(doPrimeiroTurno)).toBeCloseTo(-3.8, 1);
  });
});
