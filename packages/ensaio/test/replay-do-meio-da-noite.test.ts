import { describe, expect, it } from "vitest";
import { type ArquivoDeRodada, type ArquivoDoLugar } from "@apurador/coletor";
import { replay } from "./replay.ts";

// O replay automático (`replay.ts`): partindo a frio no meio da noite e com o relógio em outras fases.

describe("partindo a frio no meio da noite", () => {
  it("só publica a projeção quando tem os municípios: antes, ela pesaria os que faltam como se não tivessem seção", async () => {
    // Às 18:30, com ~58% das seções, as pesquisas pesam 0,25 ÷ (0,25 + 58), menos de 1% (K de 0,25%, ticket 28).
    const r = await replay("2022-10-30 18:30:00", "2022-10-30 18:36:00");
    const rodadas = r.gravacoes.filter((g) => g.caminho === "rodada.json").map((g) => g.conteudo as ArquivoDeRodada);
    const brasil = r.gravacoes.filter((g) => g.caminho === "lugares/BR.json").map((g) => g.conteudo as ArquivoDoLugar);

    expect(rodadas[0]!.pesoDasPesquisas).toBeNull();
    expect(brasil[0]!.projecao).toBeUndefined();
    expect(rodadas.at(-1)!.pesoDasPesquisas).toBe(0);
    expect(rodadas.filter((x) => x.pesoDasPesquisas !== null && x.pesoDasPesquisas > 0)).toEqual([]);
    expect(brasil.filter((b) => b.projecao && b.projecao.soApuracao.sinalDeVirada === null)).toEqual([]);
  }, 60_000);
});

describe("as fases do relógio do coletor", () => {
  // Lendo a cada 20 s, 7 das 20 fases veem 4 trocas no Brasil entre 18:42 e 18:45: com a fase de +8 ou +9 s, e de +13 a
  // +17 s (seção 2 da medição). O coletor lê o Brasil no máximo uma vez por minuto, e a 60 s nenhuma das 60 fases vê
  // mais que 2 trocas. A janela de 10 minutos fica no teste da narração, com a série ao segundo (spec, "Decisões de
  // teste"); aqui, duas fases conferem só que o Brasil tem uma virada: a de +8 s, uma das que viam 4 trocas a 20 s, e
  // uma de outro terço do minuto. O coletor parte a frio às 18:30 mais a fase.
  it.each([8, 35])(
    "com o relógio %i s depois da meia hora, dá uma virada só no Brasil",
    async (fase) => {
      const r = await replay(`2022-10-30 18:30:${String(fase).padStart(2, "0")}`, "2022-10-30 18:58:00");
      const viradas = r.publicado("lugares/BR.json").narracao.filter((e) => e.lugar === "BR" && e.tipo === "virada");

      expect(viradas).toHaveLength(1);
      expect(r.rodada().eventosDoBrasil.filter((e) => e.tipo === "virada")).toHaveLength(1);
    },
    120_000,
  );
});
