import type { DetalheMunzona, VotoCandidatoMunzona } from "@apurador/tse";
import { compararIds } from "./lugares.ts";
import { doTurno, TOTAIS, type Turno } from "./turno.ts";

// A conferência automática: os totais de um turno que o repositório guarda, no Brasil e em cada UF
// (com o Exterior), contra os arquivos do TSE. A soma aqui é feita à parte, linha a linha, sem passar
// pelo código que gerou os dados.

export interface Divergencia {
  lugar: string;
  total: string;
  /** `undefined` quando o repositório não tem o lugar. */
  repositorio: number | undefined;
  /** `undefined` quando os arquivos do TSE não têm o lugar. */
  tse: number | undefined;
}

const votosDo = (c: { numero: number; partido: string }) => `votos do ${c.numero} (${c.partido})`;

export function conferirTotais(turno: Turno, oficial: { candidatos: VotoCandidatoMunzona[]; detalhes: DetalheMunzona[] }): Divergencia[] {
  // Os totais de cada lugar, dos dois lados: no TSE, somados das linhas; no repositório, como estão.
  const tse = new Map<string, Map<string, number>>();
  const somar = (lugar: string, total: string, n: number) => {
    const totais = tse.get(lugar) ?? new Map<string, number>();
    totais.set(total, (totais.get(total) ?? 0) + n);
    tse.set(lugar, totais);
  };
  const doTurnoConferido = doTurno(turno.ano, turno.turno);
  for (const d of oficial.detalhes.filter(doTurnoConferido)) for (const lugar of ["BR", d.uf]) for (const t of TOTAIS) somar(lugar, t, d[t]);
  for (const v of oficial.candidatos.filter(doTurnoConferido)) for (const lugar of ["BR", v.uf]) somar(lugar, votosDo(v), v.votos);

  const repositorio = new Map<string, Map<string, number>>();
  for (const [lugar, r] of Object.entries(turno.lugares)) {
    if (lugar !== "BR" && lugar.length !== 2) continue;
    const totais = new Map<string, number>(TOTAIS.map((t) => [t, r[t]]));
    turno.candidatos.forEach((c, i) => totais.set(votosDo(c), r.votos[i]!));
    repositorio.set(lugar, totais);
  }

  const lugares = [...new Set([...tse.keys(), ...repositorio.keys()])].sort(compararIds);
  const divergencias: Divergencia[] = [];
  for (const lugar of lugares) {
    const doTse = tse.get(lugar);
    const doRepositorio = repositorio.get(lugar);
    const totais = new Set([...(doTse?.keys() ?? []), ...(doRepositorio?.keys() ?? [])]);
    for (const total of totais) {
      // Um candidato sem voto num lugar pode não ter linha no TSE: conta como zero, se o lugar existe.
      const valor = (lado: Map<string, number> | undefined) => (lado ? (lado.get(total) ?? (total.startsWith("votos") ? 0 : undefined)) : undefined);
      const [t, r] = [valor(doTse), valor(doRepositorio)];
      if (t !== r) divergencias.push({ lugar, total, repositorio: r, tse: t });
    }
  }
  return divergencias;
}
