import { describe, expect, it } from "vitest";
import { institutosDaLista } from "../src/lib/metodologia";

// A lista fechada de institutos como a página de metodologia a mostra: um nome por instituto da lista, e não por
// CNPJ, porque três institutos entram por dois CNPJs (ticket 03) e a Nexus conta como FSB (decisão do dono, 19/10).
const CABECALHO = "instituto_da_lista,instituto,cnpj,origem";
const csv = (...linhas: string[]) => [CABECALHO, ...linhas].join("\n");

describe("institutosDaLista", () => {
  it("dá um nome por instituto da lista, em ordem alfabética, mesmo com dois CNPJs", () => {
    expect(
      institutosDaLista(
        csv(
          "Gerp,Gerp,32208779000121,2º turno de 2022: BR-05418/2022",
          "Datafolha,Datafolha,07630546000175,2º turno de 2022: BR-08297/2022",
          "Gerp,Gerp,05270800000146,GERP MERCADOLOGIA LTDA: o CNPJ das pesquisas Gerp de 2026",
          "AtlasIntel,AtlasIntel,19259002000128,2º turno de 2022: BR-04838/2022",
        ),
      ),
    ).toEqual(["AtlasIntel", "Datafolha", "Gerp"]);
  });

  it("diz o nome com que o instituto divulga hoje, quando ele mudou e não está no nome da lista", () => {
    expect(
      institutosDaLista(
        csv(
          "Ipec/Ibope,Ipec,40735589000190,2º turno de 2022: BR-05256/2022",
          "Ipec/Ibope,Ibope,68802370000186,2º turno de 2018: BR-02934/2018",
          "FSB,Nexus,11077560000160,2º turno de 2018: BR-03689/2018 (IPRI); o mesmo CNPJ passou a Nexus em 2024",
        ),
      ),
    ).toEqual(["FSB (hoje Nexus)", "Ipec/Ibope"]);
  });
});
