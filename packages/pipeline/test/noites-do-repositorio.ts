import { readFileSync } from "node:fs";
import { dataHoraDoInstante, lerNoite, reproduzir, type Noite } from "../src/noite.ts";

// As noites reconstruídas que estão no repositório (`dados/noites/`), lidas uma vez só por arquivo de teste, e as
// contas que os testes delas comparam com as referências: o % com duas casas, como o TSE publica, e a hora dos marcos
// do % de seções, como a tabela da linha do tempo (.scratch/apurador-2026/research/02-linha-do-tempo-apuracoes-passadas.md).

export const DADOS = new URL("../../../dados/", import.meta.url);

/** O arquivo de uma noite no repositório, como `2018-2`. */
export const arquivoDaNoite = (noite: string) => new URL(`noites/${noite}.json.gz`, DADOS);

const lidas = new Map<string, Noite>();

/** A noite do repositório, lida na primeira vez que se pede. */
export function lerDoRepositorio(noite: string): Noite {
  if (!lidas.has(noite)) lidas.set(noite, lerNoite(new Uint8Array(readFileSync(arquivoDaNoite(noite)))));
  return lidas.get(noite)!;
}

/** parte ÷ todo em %, com duas casas, como texto ("55.13"). */
export const pct = (parte: number, todo: number) => ((100 * parte) / todo).toFixed(2);

/** Os votos válidos de um acumulado: a soma dos candidatos. */
export const validos = (t: { votos: number[] }) => t.votos.reduce((s, v) => s + v, 0);

/** A hora (`HH:MM`, no minuto mais próximo, como na tabela da linha do tempo) em que o país passa de cada marco do % de seções. */
export function marcos(n: Noite, lista: number[]): [number, string][] {
  const r = reproduzir(n);
  const total = r.total();
  const faltam = [...lista];
  const vistos: [number, string][] = [];
  for (const instante of new Set(n.chegadas.map((c) => c.instante))) {
    if (faltam.length === 0) break;
    r.avancarAte(instante);
    const minuto = dataHoraDoInstante(n, 60 * Math.round(instante / 60)).slice(11, 16);
    while (faltam.length > 0 && 100 * r.apurado().secoes >= faltam[0]! * total.secoes) vistos.push([faltam.shift()!, minuto]);
  }
  return vistos;
}
