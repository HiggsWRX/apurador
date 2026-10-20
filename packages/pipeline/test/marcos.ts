import { dataHoraDoInstante, reproduzir, type Noite } from "../src/noite.ts";

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
