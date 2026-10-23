import type { GeometryCollection, MultiPolygon, Polygon, Topology } from "topojson-specification";

// A malha do mapa (ticket 26), em TopoJSON: a dos municípios (`dados/malha/municipios.json`, objeto `municipios`, com o
// id do site) e a das UFs (`dados/malha/ufs.json`, objeto `ufs`, com a sigla), que o pipeline simplifica da do IBGE. O
// build serve as duas e, para a página de cada UF e dos municípios dela, o recorte com só os municípios da UF.

/** A malha dos municípios, ou um recorte dela. */
export type MalhaDosMunicipios = Topology<{ municipios: GeometryCollection }>;
/** A malha das UFs. */
export type MalhaDasUfs = Topology<{ ufs: GeometryCollection }>;

/** O caminho de uma malha no site: `ufs` e `municipios` (o Brasil), ou a sigla de uma UF (os municípios dela). */
export const caminhoDaMalha = (nome: string) => `/malha/${nome}.json`;

/** Os anéis de arcos de um polígono ou de um multipolígono. */
const aneis = (g: GeometryCollection["geometries"][number]): number[][] =>
  g.type === "Polygon" ? (g as Polygon).arcs : g.type === "MultiPolygon" ? (g as MultiPolygon).arcs.flat() : [];

/**
 * A malha só com os municípios de `ids`, e só com os arcos que eles usam, renumerados. Os arcos de uma malha quantizada
 * vêm cada um com o seu ponto inicial, então mudam de lugar sem mudar de forma. Um arco usado ao contrário é `~i`.
 */
export function recortarMalha(malha: MalhaDosMunicipios, ids: Set<string>): MalhaDosMunicipios {
  const geometrias = malha.objects.municipios.geometries.filter((g) => ids.has(String(g.id)));
  const novos = new Map<number, number>();
  for (const anel of geometrias.flatMap(aneis)) for (const a of anel) if (!novos.has(a < 0 ? ~a : a)) novos.set(a < 0 ? ~a : a, novos.size);
  const renumerar = (anel: number[]) => anel.map((a) => (a < 0 ? ~novos.get(~a)! : novos.get(a)!));
  return {
    type: "Topology",
    ...(malha.transform ? { transform: malha.transform } : {}),
    arcs: [...novos.keys()].map((a) => malha.arcs[a]!),
    objects: {
      municipios: {
        type: "GeometryCollection",
        geometries: geometrias.map((g) =>
          g.type === "Polygon"
            ? { ...g, arcs: (g as Polygon).arcs.map(renumerar) }
            : g.type === "MultiPolygon"
              ? { ...g, arcs: (g as MultiPolygon).arcs.map((p) => p.map(renumerar)) }
              : g,
        ),
      },
    },
  };
}
