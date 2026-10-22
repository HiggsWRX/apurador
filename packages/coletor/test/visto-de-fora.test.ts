import { describe, expect, it } from "vitest";
import { lerPelosEnderecos } from "../src/visto-de-fora.ts";

// O visto de fora do painel do coletor (Operação na noite, decisão 6; ticket 20): o arquivo de rodada e o JSON do Brasil
// lidos pelo endereço público do destino ativo, com o `Origin` do site, como a página lê. A rede é injetada.

const PRINCIPAL = "https://ao-vivo.apurador.org/";
const PLANO_B = "https://apurador-plano-b.hicampos93.workers.dev/";
const DATA = "Sun, 25 Oct 2026 21:00:14 GMT";
const RODADA = { rodada: "2026-10-25T21:00:00.000Z", fase: "ao-vivo" };
const BRASIL = { lugar: "BR" };

function montar(arquivos: Record<string, unknown>) {
  const pedidos: { url: string; origem: string | null }[] = [];
  const ler = lerPelosEnderecos({
    enderecos: { principal: PRINCIPAL, "plano B": PLANO_B },
    agora: () => Date.parse("2026-10-25T21:00:20Z"),
    buscar: async (url, init) => {
      pedidos.push({ url, origem: new Headers(init?.headers).get("origin") });
      return url in arquivos ? Response.json(arquivos[url], { headers: { date: DATA } }) : new Response("Not Found", { status: 404 });
    },
  });
  return { ler, pedidos };
}

describe("o visto de fora", () => {
  it("lê o arquivo de rodada e o JSON do Brasil no principal, com o Origin do site, e a idade pelo Date da resposta", async () => {
    const { ler, pedidos } = montar({ [`${PRINCIPAL}rodada.json`]: RODADA, [`${PRINCIPAL}lugares/BR.json`]: BRASIL });

    expect(await ler("principal")).toEqual({ endereco: PRINCIPAL, rodada: RODADA, brasil: BRASIL, data: Date.parse(DATA) });
    expect(pedidos).toEqual([
      { url: `${PRINCIPAL}rodada.json`, origem: "https://apurador.org" },
      { url: `${PRINCIPAL}lugares/BR.json`, origem: "https://apurador.org" },
    ]);
  });

  it("depois do comando do plano B, lê no Worker", async () => {
    const { ler } = montar({ [`${PLANO_B}rodada.json`]: RODADA, [`${PLANO_B}lugares/BR.json`]: BRASIL });

    expect((await ler("plano B")).endereco).toBe(PLANO_B);
    expect((await ler("plano B")).rodada).toEqual(RODADA);
  });

  it("sem o arquivo de rodada no endereço, não lê o Brasil, e a idade fica pelo relógio do coletor", async () => {
    const { ler, pedidos } = montar({});

    expect(await ler("principal")).toEqual({ endereco: PRINCIPAL, rodada: null, brasil: null, data: Date.parse("2026-10-25T21:00:20Z") });
    expect(pedidos).toHaveLength(1);
  });
});
