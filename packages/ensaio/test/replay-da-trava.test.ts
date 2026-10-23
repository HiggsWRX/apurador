import { beforeAll, describe, expect, it } from "vitest";
import { criarContadorDeGravacoes, type RegistroDaRodada } from "@apurador/coletor";
import { conferirPlacar, resultadosDoTseFalso } from "../src/index.ts";
import { cadastro, instante, noite } from "./noite-2022.ts";
import { lugares, replay, TABELAS } from "./replay.ts";

// O replay automático (`replay.ts`): a trava de 90% das gravações do mês (Volume de gravações na noite, decisão 5). O
// contador começa o mês a mil gravações dela, somando os dois buckets, e a partida a frio a passa na segunda rodada.

const CINCO_MINUTOS = 5 * 60_000;
const ehMunicipio = (caminho: string) => /^lugares\/\d+\.json$/.test(caminho);

describe("a trava de 90% das gravações do mês", () => {
  const FIM = "2022-10-30 17:40:00";
  let r: Awaited<ReturnType<typeof replay>>;
  let travada: RegistroDaRodada;
  beforeAll(async () => {
    r = await replay("2022-10-30 16:50:00", FIM, {
      destinos: (agora) => ({
        contador: criarContadorDeGravacoes({ mes: "2022-10", buckets: { "apurador-ao-vivo": 898_100, "apurador-ensaio": 900 } }, agora),
      }),
    });
    travada = r.rodadas.find((x) => x.gravacoesTravadas)!;
  }, 300_000);
  const daTrava = () => r.gravacoes.filter((g) => g.quando > Date.parse(travada.inicio) + travada.duracao);

  it("liga sozinha na rodada que passa das 900 mil, e não desliga mais no mês", () => {
    expect(r.rodadas.indexOf(travada)).toBe(1);
    expect(r.rodadas.slice(1).every((x) => x.gravacoesTravadas)).toBe(true);
    expect(r.rodadas[0]!.gravacoesDoMes!.buckets["apurador-ao-vivo"]! + 900).toBeLessThan(900_000);
  });

  it("depois dela, grava cada município e o mapa.json no máximo a cada 5 min", () => {
    const ultima = new Map<string, number>();
    const cedo: string[] = [];
    for (const g of daTrava().filter((g) => ehMunicipio(g.caminho) || g.caminho === "mapa.json")) {
      if (g.quando - (ultima.get(g.caminho) ?? -Infinity) < CINCO_MINUTOS) cedo.push(g.caminho);
      ultima.set(g.caminho, g.quando);
    }
    expect(daTrava().filter((g) => ehMunicipio(g.caminho)).length).toBeGreaterThan(5_000);
    expect(cedo).toEqual([]);
  });

  it("o arquivo de rodada, o Brasil, as UFs e as tabelas seguem a cada rodada em que mudam", () => {
    const rodadas = r.rodadas.filter((x) => Date.parse(x.inicio) > Date.parse(travada.inicio));
    const vezes = (caminho: string) => daTrava().filter((g) => g.caminho === caminho).length;

    expect(vezes("rodada.json")).toBe(rodadas.length);
    expect(vezes("lugares/BR.json")).toBeGreaterThan(rodadas.length / 2);
    expect(vezes("lugares/SP.json")).toBeGreaterThan(rodadas.length / 3);
    expect(vezes(TABELAS.find((t) => t.endsWith("/SP.json"))!)).toBeGreaterThan(rodadas.length / 3);
  });

  it("os municípios ficam no máximo ~5 min atrás do TSE, com o placar do TSE falso", () => {
    const tse = resultadosDoTseFalso({ noite, cadastro });
    tse.avancarAte(instante("2022-10-30 17:33:00"));
    const atrasados = lugares.filter((l) => (r.publicado(l.caminho).tse.totalizacao ?? "") < (tse.resultado(l.abrangencia)!.ultimaTotalizacao ?? ""));

    expect(atrasados).toEqual([]);
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
  });
});
