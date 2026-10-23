import mapshaper from "mapshaper";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Lugar } from "./lugares.ts";

// A malha do mapa (ticket 26): a Malha Municipal Digital 2024 do IBGE (CC BY 4.0), a única com os 5.571 municípios de
// 2026, com Boa Esperança do Norte (MT, IBGE 5101837). O mapshaper a simplifica para a web e a grava em TopoJSON, que
// divide as fronteiras entre os vizinhos. Cada município leva o id do site (o código do TSE), casado pelo código do
// IBGE que `dados/lugares.json` traz da tabela `municipio_tse_ibge` do TSE. A malha das UFs sai da mesma, dissolvida, e
// as duas têm as mesmas fronteiras simplificadas.

/** As duas áreas operacionais das lagoas do RS, que a malha traz como municípios e o TSE não tem. */
const LAGOAS_DO_RS = ["4300001", "4300002"];

/**
 * Quanto dos vértices fica, com cada município mantido (`keep-shapes`). Com 1% e a quantização abaixo, a malha dos
 * municípios dá 542 KB com gzip e a das UFs, 40 KB (gzip -9, medido em 23/10/2026); com 2%, ~760 KB, e com 3%, ~940 KB.
 */
const SIMPLIFICACAO = "1%";
const QUANTIZACAO = 1e5;

/** A malha dos municípios (objeto `municipios`, com o id do site) e a das UFs (objeto `ufs`, com a sigla). */
export interface MalhaDaWeb {
  municipios: Topology<{ municipios: GeometryCollection }>;
  ufs: Topology<{ ufs: GeometryCollection }>;
}

/**
 * A malha para a web a partir da do IBGE, lida pelo mapshaper de `entrada` (os arquivos pelo nome, como o .shp, o .dbf,
 * o .prj e o .cpg do shapefile) a partir de `arquivo`, com os campos `CD_MUN` e `SIGLA_UF`. Falha se um município do
 * site fica sem polígono ou se sobra um polígono que não é de nenhum município do site.
 */
export async function malhaDaWeb(entrada: Record<string, Uint8Array | string>, arquivo: string, lugares: Lugar[]): Promise<MalhaDaWeb> {
  const semLagoas = LAGOAS_DO_RS.map((c) => `CD_MUN != "${c}"`).join(" && ");
  const saida = await mapshaper.applyCommands(
    [
      `-i ${arquivo}`,
      `-filter '${semLagoas}'`,
      "-filter-fields CD_MUN,SIGLA_UF",
      `-simplify ${SIMPLIFICACAO} keep-shapes`,
      "-rename-layers municipios",
      "-dissolve SIGLA_UF + name=ufs",
      `-o format=topojson quantization=${QUANTIZACAO} id-field=CD_MUN drop-table target=municipios municipios.json`,
      `-o format=topojson quantization=${QUANTIZACAO} id-field=SIGLA_UF drop-table target=ufs ufs.json`,
    ].join(" "),
    // O mapshaper lê os arquivos auxiliares do shapefile com `Buffer.toString`: os bytes vão como Buffer, sem cópia.
    Object.fromEntries(Object.entries(entrada).map(([nome, v]) => [nome, typeof v === "string" ? v : Buffer.from(v.buffer, v.byteOffset, v.byteLength)])),
  );
  const ler = (nome: string) => {
    const conteudo = saida[nome]!;
    return JSON.parse(typeof conteudo === "string" ? conteudo : new TextDecoder().decode(conteudo));
  };
  const municipios = ler("municipios.json") as MalhaDaWeb["municipios"];
  const ufs = ler("ufs.json") as MalhaDaWeb["ufs"];

  const doSite = new Map(lugares.filter((l) => l.tipo === "municipio" && l.ibge !== undefined).map((l) => [String(l.ibge), l.id]));
  const semMunicipio: string[] = [];
  for (const g of municipios.objects.municipios.geometries) {
    const id = doSite.get(String(g.id));
    if (id === undefined) semMunicipio.push(String(g.id));
    else g.id = id;
  }
  const comPoligono = new Set(municipios.objects.municipios.geometries.map((g) => g.id));
  const semPoligono = [...doSite.values()].filter((id) => !comPoligono.has(id));
  const erros = [
    ...(semPoligono.length ? [`municípios do site sem polígono: ${semPoligono.join(", ")}`] : []),
    ...(semMunicipio.length ? [`polígonos sem município no site (código do IBGE): ${semMunicipio.join(", ")}`] : []),
    ...(comPoligono.size !== municipios.objects.municipios.geometries.length ? ["um município tem mais de um polígono"] : []),
  ];
  if (erros.length) throw new Error(`A malha do IBGE não casa com dados/lugares.json: ${erros.join("; ")}`);
  return { municipios, ufs };
}
