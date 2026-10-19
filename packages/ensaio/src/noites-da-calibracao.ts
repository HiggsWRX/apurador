import { readFileSync } from "node:fs";
import { prepararModelo, type Agregado, type BaseDoModelo, type Modelo } from "@apurador/modelo";
import { agregadoDaNoite, lerNoite, lerPesquisasHistoricas, type Noite, type ResultadoHistorico } from "@apurador/pipeline";

// As três noites da calibração (Ensaio geral, decisão 14), como estão no repositório, sem rede: a noite reconstruída
// do `dados/noites`, a base do modelo do `dados/bases` e o agregado de pesquisas da véspera, pela regra do agregado,
// no 1º finalista da base. As bases são do 1º turno de cada ano, e a do 1º turno de 2026 é o de 2022.

/** Uma noite da calibração, pronta para o executor de noites. */
export interface NoiteDaCalibracao {
  /** O nome dos arquivos em `dados/`: `2022-2`, `2018-2` e `2026-1`. */
  id: string;
  /** "2º turno de 2022". */
  nome: string;
  modelo: Modelo;
  noite: Noite;
  /** O agregado da véspera, em % do 1º finalista da base, com a incerteza de 1,5 ponto da noite. */
  agregado: Pick<Agregado, "valor" | "incerteza">;
  /** O nome de urna dos dois finalistas na noite, na ordem da base. */
  finalistas: [string, string];
}

const NOITES = [
  { id: "2022-2", ano: 2022, turno: 2 },
  { id: "2018-2", ano: 2018, turno: 2 },
  { id: "2026-1", ano: 2026, turno: 1 },
];

/** As noites da calibração, lidas do repositório em `raiz`. */
export function lerNoitesDaCalibracao(raiz: URL): NoiteDaCalibracao[] {
  const ler = (caminho: string) => readFileSync(new URL(caminho, raiz));
  const pesquisas = lerPesquisasHistoricas(ler("dados/pesquisas-historicas.csv").toString("utf8"));
  const resultados = (JSON.parse(ler("dados/resultados-historicos.json").toString("utf8")) as { eleicoes: ResultadoHistorico[] }).eleicoes;
  return NOITES.map(({ id, ano, turno }) => {
    const base = JSON.parse(ler(`dados/bases/${id}.json`).toString("utf8")) as BaseDoModelo;
    const noite = lerNoite(new Uint8Array(ler(`dados/noites/${id}.json.gz`)));
    const numeros = base.finalistas.map((f) => f.numero) as [number, number];
    const nomeUrna = (numero: number) => {
      const candidato = noite.candidatos.find((c) => c.numero === numero);
      if (!candidato) throw new Error(`${id}: o finalista ${numero} da base não é candidato na noite`);
      return candidato.nomeUrna;
    };
    return {
      id,
      nome: `${turno}º turno de ${ano}`,
      modelo: prepararModelo(base),
      noite,
      agregado: agregadoDaNoite(pesquisas, resultados, { ano, turno }, numeros),
      finalistas: [nomeUrna(numeros[0]), nomeUrna(numeros[1])],
    };
  });
}
