import { describe, expect, it } from "vitest";
import { criarEscolhaDaComparacao, type CurvasDoLugar, type EstadoDaComparacao } from "../src/lib/curva-de-comparacao";
import { turnosDoLugar } from "../src/lib/curvas-passadas";

// A curva de comparação na ilha: o que a página baixa e quando, e os turnos passados de cada lugar. As curvas de um
// lugar ficam em `/curvas/<id>.json`, e a página só as baixa quando o visitante liga uma delas. O transporte é
// injetado, como no leitor ao vivo, e o que a ilha desenha é o que chega em `aoMudar`.

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

/** A escolha de São Paulo sobre o transporte, com os estados que a ilha recebe. */
function escolhaDeSaoPaulo(buscar: (url: string) => Promise<Response>) {
  const estados: EstadoDaComparacao[] = [];
  const escolha = criarEscolhaDaComparacao({ endereco: "/curvas/SP.json", buscar, aoMudar: (e) => estados.push(e) });
  return { escolha, estados, ultimo: () => estados.at(-1) };
}

describe("criarEscolhaDaComparacao", () => {
  it("não baixa nada até o visitante ligar uma curva; ligada a primeira, baixa as do lugar uma vez só", async () => {
    const { pedidos, buscar } = transporte(ok(CURVAS));
    const { escolha, estados, ultimo } = escolhaDeSaoPaulo(buscar);

    expect(pedidos).toEqual([]);
    expect(estados).toEqual([]);

    await escolha.alternar("2022-2");
    expect(pedidos).toEqual(["/curvas/SP.json"]);
    expect(estados).toEqual([
      { ligado: "2022-2", situacao: "baixando", curva: null },
      { ligado: "2022-2", situacao: "pronta", curva: CURVAS["2022-2"] },
    ]);

    await escolha.alternar("2018-2");
    expect(ultimo()).toEqual({ ligado: "2018-2", situacao: "pronta", curva: CURVAS["2018-2"] });
    expect(pedidos).toHaveLength(1);
  });

  it("o botão do turno ligado desliga a curva", async () => {
    const { escolha, ultimo } = escolhaDeSaoPaulo(transporte(ok(CURVAS)).buscar);

    await escolha.alternar("2022-2");
    await escolha.alternar("2022-2");

    expect(ultimo()).toEqual({ ligado: null, situacao: "desligada", curva: null });
  });

  it("sem rede ou sem o arquivo, diz que falhou e tenta de novo no próximo clique", async () => {
    const { pedidos, buscar } = transporte(semRede, () => Promise.resolve(new Response("", { status: 404 })), ok(CURVAS));
    const { escolha, ultimo } = escolhaDeSaoPaulo(buscar);

    await escolha.alternar("2022-2");
    expect(ultimo()).toEqual({ ligado: "2022-2", situacao: "falhou", curva: null });
    await escolha.alternar("2018-2");
    expect(ultimo()).toEqual({ ligado: "2018-2", situacao: "falhou", curva: null });
    await escolha.alternar("2022-2");
    expect(ultimo()).toEqual({ ligado: "2022-2", situacao: "pronta", curva: CURVAS["2022-2"] });
    expect(pedidos).toHaveLength(3);
  });

  it("trocar de turno enquanto as curvas chegam fica com o último escolhido, num pedido só", async () => {
    let entregar: (r: Response) => void = () => {};
    const { pedidos, buscar } = transporte(() => new Promise((resolver) => (entregar = resolver)));
    const { escolha, ultimo } = escolhaDeSaoPaulo(buscar);

    const primeiro = escolha.alternar("2022-2");
    const segundo = escolha.alternar("2018-2");
    expect(ultimo()).toEqual({ ligado: "2018-2", situacao: "baixando", curva: null });
    entregar(new Response(JSON.stringify(CURVAS)));
    await Promise.all([primeiro, segundo]);

    expect(ultimo()).toEqual({ ligado: "2018-2", situacao: "pronta", curva: CURVAS["2018-2"] });
    expect(pedidos).toHaveLength(1);
  });
});

describe("turnosDoLugar", () => {
  it("o Brasil tem os cinco turnos passados, do mais antigo ao mais recente, com o partido de Bolsonaro de cada um", () => {
    expect(turnosDoLugar("BR")).toEqual([
      { id: "2018-1", nome: "2018 1T", turno: 1, partidoDeBolsonaro: "PSL" },
      { id: "2018-2", nome: "2018 2T", turno: 2, partidoDeBolsonaro: "PSL" },
      { id: "2022-1", nome: "2022 1T", turno: 1, partidoDeBolsonaro: "PL" },
      { id: "2022-2", nome: "2022 2T", turno: 2, partidoDeBolsonaro: "PL" },
      { id: "2026-1", nome: "2026 1T", turno: 1, partidoDeBolsonaro: "PL" },
    ]);
  });

  it("Boa Esperança do Norte (MT), criada para 2026, só tem o 1º turno de 2026, e Abuja, sem voto no PT nem no PL, nenhum", () => {
    expect(turnosDoLugar("73709").map((t) => t.nome)).toEqual(["2026 1T"]);
    expect(turnosDoLugar("99198")).toEqual([]);
  });
});
