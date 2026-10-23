import type { Feature, MultiLineString } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, MultiPolygon, Polygon, Topology } from "topojson-specification";
import { caminhoDaTabelaDeLugares, TODOS_OS_MUNICIPIOS, type ArquivoDaTabelaDeLugares } from "./tabela-dos-lugares";

// A malha do mapa (ticket 26), em TopoJSON: a dos municípios (`dados/malha/municipios.json`, objeto `municipios`, com o
// id do site) e a das UFs (`dados/malha/ufs.json`, objeto `ufs`, com a sigla), que o pipeline simplifica da do IBGE. O
// build serve as duas e, para a página de cada UF e dos municípios dela, o recorte com só os municípios da UF. O cartão
// do mapa baixa a malha da vista que mostra, uma vez por página, e a decodifica em feições de GeoJSON para o d3-geo.

/** A malha dos municípios, com o id do site em cada um: a do Brasil inteiro, ou o recorte de uma UF. */
export type MalhaDosMunicipios = Topology<{ municipios: GeometryCollection }>;
/** A malha das 27 UFs, com a sigla em cada uma, dissolvida da dos municípios: as fronteiras são as mesmas. */
export type MalhaDasUfs = Topology<{ ufs: GeometryCollection }>;

/** O caminho de uma malha no site: `ufs` e `municipios` (o Brasil), ou a sigla de uma UF (os municípios dela). */
export const caminhoDaMalha = (nome: string) => `/malha/${nome}.json`;

/** Os anéis de arcos de um polígono ou de um multipolígono, trocados por `trocar`, na mesma forma da geometria. */
function comAneis<G extends GeometryCollection["geometries"][number]>(g: G, trocar: (anel: number[]) => number[]): G {
  if (g.type === "Polygon") return { ...g, arcs: (g as Polygon).arcs.map(trocar) };
  if (g.type === "MultiPolygon") return { ...g, arcs: (g as MultiPolygon).arcs.map((p) => p.map(trocar)) };
  return g;
}

/**
 * A malha só com os municípios de `ids`, e só com os arcos que eles usam, renumerados. Os arcos de uma malha quantizada
 * vêm cada um com o seu ponto inicial, então mudam de lugar sem mudar de forma. Um arco usado ao contrário é `~i`.
 */
export function recortarMalha(malha: MalhaDosMunicipios, ids: Set<string>): MalhaDosMunicipios {
  const geometrias = malha.objects.municipios.geometries.filter((g) => ids.has(String(g.id)));
  const novos = new Map<number, number>();
  const anotar = (anel: number[]) => {
    for (const a of anel) if (!novos.has(a < 0 ? ~a : a)) novos.set(a < 0 ? ~a : a, novos.size);
    return anel;
  };
  for (const g of geometrias) comAneis(g, anotar);
  const renumerar = (anel: number[]) => anel.map((a) => (a < 0 ? ~novos.get(~a)! : novos.get(a)!));
  return {
    type: "Topology",
    ...(malha.transform ? { transform: malha.transform } : {}),
    arcs: [...novos.keys()].map((a) => malha.arcs[a]!),
    objects: { municipios: { type: "GeometryCollection", geometries: geometrias.map((g) => comAneis(g, renumerar)) } },
  };
}

/** O que o mapa de uma malha desenha: as feições, as linhas por cima e a tabela de lugares delas. */
export interface VistaDoMapa {
  feicoes: Feature[];
  /** As fronteiras das UFs no Brasil por municípios; o contorno da UF na página dela; nada no Brasil por estados. */
  contorno: MultiLineString | null;
  tabela: ArquivoDaTabelaDeLugares;
}

/** Os arquivos do build que o cartão baixa, cada um uma vez por página. */
const baixados = new Map<string, Promise<unknown>>();

/** Um arquivo do build, baixado uma vez por página; um pedido que falhou não fica guardado, e o próximo tenta de novo. */
export function baixarDoBuild<T>(caminho: string): Promise<T> {
  let pedido = baixados.get(caminho);
  if (!pedido) {
    pedido = fetch(caminho).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
    baixados.set(caminho, pedido);
    pedido.catch(() => baixados.delete(caminho));
  }
  return pedido as Promise<T>;
}

/**
 * Baixa a malha `nome` e o que a vista dela precisa, a partir da tabela de lugares do cartão, e devolve quem a monta: a
 * decodificação fica com quem desenha, que conta o tempo dela. No Brasil por municípios, também as tabelas de lugares das
 * 27 UFs (a posição de cada município no mapa.json e o 1º turno dele) e a malha das UFs, para as fronteiras.
 */
export async function baixarVista(nome: string, arquivo: ArquivoDaTabelaDeLugares): Promise<() => VistaDoMapa> {
  if (nome === "ufs") {
    const ufs = await baixarDoBuild<MalhaDasUfs>(caminhoDaMalha("ufs"));
    return () => ({ feicoes: feature(ufs, ufs.objects.ufs).features, contorno: null, tabela: arquivo });
  }
  if (nome === "municipios") {
    const [municipios, ufs, tabelas] = await Promise.all([
      baixarDoBuild<MalhaDosMunicipios>(caminhoDaMalha("municipios")),
      baixarDoBuild<MalhaDasUfs>(caminhoDaMalha("ufs")),
      Promise.all(arquivo.linhas.filter((l) => l.id !== "ZZ").map((l) => baixarDoBuild<ArquivoDaTabelaDeLugares>(caminhoDaTabelaDeLugares(l.id)))),
    ]);
    return () => ({
      feicoes: feature(municipios, municipios.objects.municipios).features,
      contorno: mesh(ufs, ufs.objects.ufs, (a, b) => a !== b),
      tabela: { ...arquivo, lugar: TODOS_OS_MUNICIPIOS, linhas: tabelas.flatMap((t) => t.linhas) },
    });
  }
  const daUf = await baixarDoBuild<MalhaDosMunicipios>(caminhoDaMalha(nome));
  return () => ({
    feicoes: feature(daUf, daUf.objects.municipios).features,
    contorno: mesh(daUf, daUf.objects.municipios, (a, b) => a === b),
    tabela: arquivo,
  });
}
