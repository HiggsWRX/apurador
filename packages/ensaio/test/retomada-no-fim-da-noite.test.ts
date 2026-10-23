import { beforeAll, describe, expect, it } from "vitest";
import { lerEstadoGuardado } from "@apurador/coletor";
import { chegaram, noColetor, noiteComQuedas, type NoiteComQuedas } from "./noite-com-quedas.ts";

// A noite com quedas (`noite-com-quedas.ts`) no fim da noite (Operação na noite, decisão 21; Volume de gravações na
// noite, decisão 8): 30 min depois da totalização final, o coletor para sozinho, também o que volta de uma queda, e a
// última rodada grava o objeto da noite mesmo pelo celular.

describe("quedas depois da totalização final", () => {
  // O coletor parte a frio às 23:58, 20 min antes da totalização final de 2022 (00:18:04). Cai às 00:30, nos 30 min
  // depois dela, e volta do disco; para sozinho e, posto de volta às 01:00 (o supervisor não o põe, mas a tarefa do
  // Agendador, ligada, põe num reinício do computador), não roda nenhuma rodada.
  let r: NoiteComQuedas;
  beforeAll(async () => {
    r = await noiteComQuedas("2022-10-30 23:58:00", "2022-10-31 01:10:00", [
      { em: "2022-10-31 00:30:00", de: "disco" },
      { em: "2022-10-31 01:00:00", de: "disco" },
    ]);
  }, 300_000);

  it("a queda nos 30 min não os recomeça, e o coletor posto de volta depois deles para sem rodada nenhuma", () => {
    const encerrada = r.rodadas.find((x) => x.fase === "encerrada")!;
    const para = Date.parse(encerrada.inicio) + 30 * 60_000;
    const ultima = r.rodadas.at(-1)!;

    expect(r.rodadas.indexOf(encerrada)).toBeLessThan(r.voltas[0]!.rodada);
    expect(r.voltas[0]!.rodada).toBeLessThan(r.rodadas.length);
    expect(Date.parse(ultima.inicio)).toBeLessThan(para);
    expect(Date.parse(ultima.inicio) + 20_000).toBeGreaterThanOrEqual(para);
    expect(r.voltas[1]!.rodada).toBe(r.rodadas.length);
  });
});

describe("o fim da noite pelo celular", () => {
  // A conexão passa ao celular às 00:10, antes da totalização final, e não volta ao cabo: a última rodada grava o objeto
  // da noite mesmo assim, com os arquivos que esperavam, para a noite ficar inteira no R2.
  const DE = "2022-10-30 23:58:00";
  let r: NoiteComQuedas;
  beforeAll(async () => {
    r = await noiteComQuedas(DE, "2022-10-31 01:10:00", [], {
      conexao: (quando) => ({ ip: "177.79.2.2", voltouEm: null, via: quando >= noColetor(DE, "2022-10-31 00:10:00") ? "celular" : "cabo" }),
    });
  }, 300_000);

  it("a última rodada antes de parar grava o objeto da noite, com todos os arquivos do TSE desde o último no cabo", () => {
    const ultima = r.rodadas.at(-1)!;
    const noCelular = r.rodadas.filter((x) => Date.parse(x.inicio) >= noColetor(DE, "2022-10-31 00:10:00"));
    const objeto = lerEstadoGuardado(r.objetos.at(-1)!.json);

    expect(ultima.encerraEm).not.toBeNull();
    expect(r.objetos.at(-1)!.numero).toBe(ultima.numero);
    expect(r.objetos.filter((o) => noCelular.some((x) => x.numero === o.numero)).map((o) => o.numero)).toEqual([ultima.numero]);
    expect(objeto.arquivos.length).toBe(chegaram(noCelular));
  });
});
