import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { describe, expect, it } from "vitest";
import { recortarMalha } from "../src/lib/malha";

// O recorte da malha dos municípios (ticket 26): a página de uma UF, e a de um município, baixa só os municípios da UF,
// e não a malha do Brasil inteiro. O recorte guarda só as fronteiras que eles usam, e cada um sai com a mesma forma.

/**
 * Três municípios em fila, A | B | C, com as fronteiras divididas: o arco 0 é a borda de baixo e a da esquerda de A, o 1
 * a divisa A|B, o 2 a borda de cima de A, e assim por diante. As coordenadas estão quantizadas, com deltas.
 */
const MALHA: Topology<{ municipios: GeometryCollection }> = {
  type: "Topology",
  transform: { scale: [0.01, 0.01], translate: [-50, -20] },
  arcs: [
    [
      [100, 0],
      [-100, 0],
      [0, 100],
    ], // 0: A, de baixo à esquerda até o alto
    [
      [100, 0],
      [0, 100],
    ], // 1: A|B, de baixo para cima
    [
      [0, 100],
      [100, 0],
    ], // 2: A, em cima
    [
      [200, 0],
      [-100, 0],
    ], // 3: B, embaixo
    [
      [200, 0],
      [0, 100],
    ], // 4: B|C
    [
      [100, 100],
      [100, 0],
    ], // 5: B, em cima
    [
      [300, 0],
      [-100, 0],
    ], // 6: C, embaixo
    [
      [300, 0],
      [0, 100],
      [-100, 0],
    ], // 7: C, à direita e em cima
  ],
  objects: {
    municipios: {
      type: "GeometryCollection",
      geometries: [
        { type: "Polygon", id: "A", arcs: [[0, 2, -2]] },
        { type: "Polygon", id: "B", arcs: [[3, 1, 5, -5]] },
        { type: "MultiPolygon", id: "C", arcs: [[[6, 4, -8]]] },
      ],
    },
  },
};

const formas = (malha: Topology<{ municipios: GeometryCollection }>) =>
  Object.fromEntries(feature(malha, malha.objects.municipios).features.map((f) => [f.id, f.geometry]));

describe("recorte da malha", () => {
  it("dá só os municípios pedidos, cada um com a mesma forma", () => {
    const recorte = recortarMalha(MALHA, new Set(["B", "C"]));
    const antes = formas(MALHA);
    expect(formas(recorte)).toEqual({ B: antes.B, C: antes.C });
  });

  it("guarda só as fronteiras que os municípios pedidos usam", () => {
    expect(recortarMalha(MALHA, new Set(["B", "C"])).arcs).toHaveLength(6);
    const deA = recortarMalha(MALHA, new Set(["A"])).arcs;
    expect(deA).toHaveLength(3);
    expect(deA).toEqual(expect.arrayContaining([MALHA.arcs[0], MALHA.arcs[1], MALHA.arcs[2]]));
  });
});
