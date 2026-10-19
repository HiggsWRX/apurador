import { readFileSync } from "node:fs";
import { agregadoDaNoite, indicadoresDaBase, lerNoite, lerPesquisasHistoricas, type ResultadoHistorico } from "@apurador/pipeline";
import { CONSTANTES_PROVISORIAS, type Apuracao, type BaseDoModelo } from "../src/index.ts";
import type { DadosDoPrototipo, FotoDoPrototipo } from "./prototipo/projecao.js";

// Os dados que os testes do modelo usam, do repositório e sem rede: a noite do 2º turno de 2022 reconstruída,
// as bases do 1º turno (de 2022, para ela, também por zona, e de 2026, para 25/10), o agregado de 2022 e as
// constantes provisórias. Os números de referência do porte fiel e do executor são das provisórias, e não das
// constantes congeladas pela calibração.

const lerJson = (caminho: string) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), "utf8")) as unknown;

export const constantes = CONSTANTES_PROVISORIAS;
export const base2022 = lerJson("../../../dados/bases/2022-2.json") as BaseDoModelo;
/** A base de 2022 com os municípios de mais de uma zona divididos nas zonas da noite, para o teste da zona. */
export const base2022PorZona = lerJson("../../../dados/bases/2022-2-zonas.json") as BaseDoModelo;
export const base2026 = lerJson("../../../dados/bases/2026-2.json") as BaseDoModelo;
export const noite2022 = lerNoite(new Uint8Array(readFileSync(new URL("../../../dados/noites/2022-2.json.gz", import.meta.url))));

/** O agregado de 2022 congelado na véspera, no 1º finalista da base (Lula), com a incerteza de 1,5 da noite. */
export const agregado2022 = agregadoDaNoite(
  lerPesquisasHistoricas(readFileSync(new URL("../../../dados/pesquisas-historicas.csv", import.meta.url), "utf8")),
  (lerJson("../../../dados/resultados-historicos.json") as { eleicoes: ResultadoHistorico[] }).eleicoes,
  { ano: 2022, turno: 2 },
  base2022.finalistas.map((f) => f.numero) as [number, number],
);

/** A apuração antes da primeira seção: nada totalizado, com as seções e os eleitores do 1º turno. */
export const antesDaPrimeiraSecao = (base: BaseDoModelo): Apuracao => base.municipios.map((m) => ({ secoes: 0, secoesTotais: m.secoes, aptos: 0, aptosTotais: m.aptos, votos: [0, 0] }));

/** O placar entre finalistas de um conjunto de municípios: a fatia do 1º finalista nos votos dos dois, no 1º turno. */
export const placarEntreFinalistasDos = (municipios: BaseDoModelo["municipios"]) =>
  municipios.reduce((s, m) => s + m.votos[0]!, 0) / municipios.reduce((s, m) => s + m.votos[0]! + m.votos[1]!, 0);

// O protótipo recebe os dados num formato próprio, com Lula ("L") e Bolsonaro ("B"), e as regiões com o
// Exterior numa região só dele (o que, com o recuo UF → região → Brasil, dá no mesmo que pular a região).
const REGIOES: [string, string][] = [
  ["Norte", "AC AM AP PA RO RR TO"],
  ["Nordeste", "AL BA CE MA PB PE PI RN SE"],
  ["Centro-Oeste", "DF GO MS MT"],
  ["Sudeste", "ES MG RJ SP"],
  ["Sul", "PR RS SC"],
  ["Exterior", "ZZ"],
];

/** Os dados do protótipo para uma noite: o 1º turno da base e os totais de seções e aptos de cada município na noite. */
export function dadosDoPrototipo(base: BaseDoModelo, apuracao: Apuracao): DadosDoPrototipo {
  if (base.finalistas[0]!.numero !== 13 || base.finalistas[1]!.numero !== 22) throw new Error("o protótipo dá a fatia de Lula: a base precisa ter Lula como 1º finalista");
  const ufs = [...new Set(base.municipios.map((m) => m.uf))];
  const S = apuracao.map((a) => a.secoesTotais);
  return {
    N: S.reduce((a, s) => a + s, 0),
    ufs,
    ufRegiao: ufs.map((uf) => REGIOES.findIndex(([, ufs]) => ufs.split(" ").includes(uf))),
    regioes: REGIOES.map(([r]) => r),
    mun: {
      uf: base.municipios.map((m) => ufs.indexOf(m.uf)),
      S,
      A: apuracao.map((a) => a.aptosTotais),
      aptos1: base.municipios.map((m) => m.aptos),
      L1: base.municipios.map((m) => m.votos[0]!),
      B1: base.municipios.map((m) => m.votos[1]!),
      O1: base.municipios.map((m) => m.validos - m.votos[0]! - m.votos[1]!),
    },
    // o perfil de chegada a cada 1% das seções do país, por mil, como o protótipo o lê
    perfilQ: Array.from({ length: 101 }, (_, x) => x),
    perfil1T: base.municipios.flatMap((m) => indicadoresDaBase(m).perfilDeChegada.map((f) => 1000 * f)),
  };
}

/** A apuração de um momento, como o protótipo a lê. */
export const fotoDoPrototipo = (apuracao: Apuracao): FotoDoPrototipo => ({
  k: 0,
  sec: Float64Array.from(apuracao, (a) => a.secoes),
  aptos: Float64Array.from(apuracao, (a) => a.aptos),
  L: Float64Array.from(apuracao, (a) => a.votos[0]!),
  B: Float64Array.from(apuracao, (a) => a.votos[1]!),
});
