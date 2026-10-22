import { describe, expect, it } from "vitest";
import { buscarLugares, type ItemDaBusca } from "../src/lib/busca";

// Um pedaço do índice da busca, como o build o publica: do maior para o menor eleitorado.
const indice: ItemDaBusca[] = [
  ["Estado de São Paulo", "/sp/", "São Paulo"],
  ["Estado do Paraná", "/pr/", "Paraná"],
  ["São Paulo (SP)", "/sp/sao-paulo/", "São Paulo"],
  ["Campinas (SP)", "/sp/campinas/", "Campinas"],
  ["Paranaguá (PR)", "/pr/paranagua/", "Paranaguá"],
  ["Bom Jesus de Goiás (GO)", "/go/bom-jesus-de-goias/", "Bom Jesus de Goiás"],
  ["Campinas do Sul (RS)", "/rs/campinas-do-sul/", "Campinas do Sul"],
  ["Lisboa (Exterior)", "/exterior/lisboa/", "Lisboa"],
  ["São Paulo das Missões (RS)", "/rs/sao-paulo-das-missoes/", "São Paulo das Missões"],
  ["Paraná (RN)", "/rn/parana/", "Paraná"],
];
const rotulos = (consulta: string) => buscarLugares(indice, consulta).map(([rotulo]) => rotulo);

describe("buscarLugares", () => {
  it("acha o lugar sem acento nem maiúscula, com o estado e os municípios do mesmo nome", () => {
    expect(rotulos("sao paulo")).toEqual(["Estado de São Paulo", "São Paulo (SP)", "São Paulo das Missões (RS)"]);
  });

  it("põe primeiro o nome exato e depois os maiores eleitorados", () => {
    expect(rotulos("Paraná")).toEqual(["Estado do Paraná", "Paraná (RN)", "Paranaguá (PR)"]);
  });

  it("acha pelo começo de qualquer palavra e aceita a UF depois do nome", () => {
    expect(rotulos("jesus")).toEqual(["Bom Jesus de Goiás (GO)"]);
    expect(rotulos("campinas sp")).toEqual(["Campinas (SP)"]);
    expect(rotulos("lisb")).toEqual(["Lisboa (Exterior)"]);
  });

  it("só busca a partir de 2 letras e devolve no máximo 8 lugares", () => {
    expect(rotulos("s")).toEqual([]);
    expect(
      buscarLugares(
        Array.from({ length: 20 }, (_, i) => [`Santa ${i} (SC)`, `/sc/santa-${i}/`, `Santa ${i}`] as ItemDaBusca),
        "santa",
      ),
    ).toHaveLength(8);
  });
});
