import { beforeAll, describe, expect, it } from "vitest";
import { conferirPlacar, resultadosDoTseFalso } from "../src/index.ts";
import { cadastro, instante, noite } from "./noite-2022.ts";
import { replay, lugares, zonas } from "./replay.ts";

// O replay automático (`replay.ts`): com o cache de 60 s da borda do TSE, até as 21h.

describe("com o cache de 60 s da borda do TSE", () => {
  // Na borda, um arquivo pode vir até 60 s mais velho que o índice, e uma zona, mais velha que o município dela.
  // O TSE falso do ensaio geral não tem borda: só o replay põe o coletor diante dela antes da noite.
  const FIM = "2022-10-30 21:00:00";
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    r = await replay("2022-10-30 16:50:00", FIM, { borda: 60 });
  }, 300_000);

  it("publica só placares do TSE falso, mesmo com cópias velhas na borda", () => {
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
  }, 120_000);

  it("alcança o TSE em até 5 min: os lugares, e as zonas dos municípios que pararam de mudar, estão em dia", () => {
    const tse = resultadosDoTseFalso({ noite, cadastro });
    const limite = instante(FIM) - 5 * 60;
    tse.avancarAte(limite);
    const atrasados = lugares.filter((l) => (r.publicado(l.caminho).tse.totalizacao ?? "") < (tse.resultado(l.abrangencia)!.ultimaTotalizacao ?? ""));
    expect(atrasados).toEqual([]);

    tse.avancarAte(instante(FIM));
    const paradas = zonas.filter((z) => {
      const municipio = tse.resultado({ uf: z.uf, municipio: z.municipio })!.ultimaTotalizacao;
      return municipio !== null && instante(municipio) <= limite;
    });
    expect(paradas.length).toBeGreaterThan(100);
    expect(paradas.filter((z) => JSON.stringify(r.coletor.resultado(z)) !== JSON.stringify(tse.resultado(z)))).toEqual([]);
  });
});
