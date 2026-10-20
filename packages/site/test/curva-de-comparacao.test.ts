import { describe, expect, it } from "vitest";
import { criarComparacao, type CurvasDoLugar, type EstadoDaComparacao } from "../src/lib/curva-de-comparacao";

// A curva de comparação na ilha: o que a página baixa e quando. As curvas de um lugar ficam em `/curvas/<id>.json`, e a
// página só as baixa quando o visitante liga uma delas. O transporte é injetado, como no leitor ao vivo.

const CURVAS: CurvasDoLugar = {
  "2018-2": { secoes: [0.1, 50, 100], pt: [12.5, 30.4, 32] },
  "2022-2": { secoes: [0.1, 50, 100], pt: [35, 43.2, 44.8] },
};

/** Um transporte que responde na ordem dada e anota os pedidos. */
function transporte(...respostas: (() => Promise<Response>)[]) {
  const pedidos: string[] = [];
  const buscar = (url: string) => {
    pedidos.push(url);
    return respostas.shift()!();
  };
  return { pedidos, buscar };
}
const ok = (corpo: unknown) => () => Promise.resolve(new Response(JSON.stringify(corpo), { status: 200 }));
const semRede = () => Promise.reject(new TypeError("Failed to fetch"));

describe("criarComparacao", () => {
  it("não baixa nada até o visitante ligar uma curva; ligada a primeira, baixa as do lugar uma vez só", async () => {
    const { pedidos, buscar } = transporte(ok(CURVAS));
    const vistos: EstadoDaComparacao["situacao"][] = [];
    const comparacao = criarComparacao({ endereco: "/curvas/SP.json", buscar, aoMudar: (e) => vistos.push(e.situacao) });

    expect(comparacao.estado()).toEqual({ ligado: null, situacao: "desligada", curva: null });
    expect(pedidos).toEqual([]);

    await comparacao.alternar("2022-2");
    expect(pedidos).toEqual(["/curvas/SP.json"]);
    expect(comparacao.estado()).toEqual({ ligado: "2022-2", situacao: "pronta", curva: CURVAS["2022-2"] });
    expect(vistos).toEqual(["baixando", "pronta"]);

    await comparacao.alternar("2018-2");
    expect(comparacao.estado()).toEqual({ ligado: "2018-2", situacao: "pronta", curva: CURVAS["2018-2"] });
    expect(pedidos).toHaveLength(1);
  });

  it("o botão do turno ligado desliga a curva", async () => {
    const comparacao = criarComparacao({ endereco: "/curvas/SP.json", buscar: transporte(ok(CURVAS)).buscar, aoMudar: () => {} });

    await comparacao.alternar("2022-2");
    await comparacao.alternar("2022-2");

    expect(comparacao.estado()).toEqual({ ligado: null, situacao: "desligada", curva: null });
  });

  it("sem rede ou sem o arquivo, diz que falhou e tenta de novo no próximo clique", async () => {
    const { pedidos, buscar } = transporte(semRede, () => Promise.resolve(new Response("", { status: 404 })), ok(CURVAS));
    const comparacao = criarComparacao({ endereco: "/curvas/SP.json", buscar, aoMudar: () => {} });

    await comparacao.alternar("2022-2");
    expect(comparacao.estado()).toEqual({ ligado: "2022-2", situacao: "falhou", curva: null });
    await comparacao.alternar("2018-2");
    expect(comparacao.estado()).toEqual({ ligado: "2018-2", situacao: "falhou", curva: null });
    await comparacao.alternar("2022-2");
    expect(comparacao.estado()).toEqual({ ligado: "2022-2", situacao: "pronta", curva: CURVAS["2022-2"] });
    expect(pedidos).toHaveLength(3);
  });

  it("trocar de turno enquanto as curvas chegam fica com o último escolhido, num pedido só", async () => {
    let entregar: (r: Response) => void = () => {};
    const { pedidos, buscar } = transporte(() => new Promise((resolver) => (entregar = resolver)));
    const comparacao = criarComparacao({ endereco: "/curvas/SP.json", buscar, aoMudar: () => {} });

    const primeiro = comparacao.alternar("2022-2");
    const segundo = comparacao.alternar("2018-2");
    expect(comparacao.estado()).toEqual({ ligado: "2018-2", situacao: "baixando", curva: null });
    entregar(new Response(JSON.stringify(CURVAS)));
    await Promise.all([primeiro, segundo]);

    expect(comparacao.estado()).toEqual({ ligado: "2018-2", situacao: "pronta", curva: CURVAS["2018-2"] });
    expect(pedidos).toHaveLength(1);
  });
});
