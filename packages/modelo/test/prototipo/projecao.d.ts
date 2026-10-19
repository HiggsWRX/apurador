// Os tipos do módulo `Projecao` do protótipo, só no que os testes do porte fiel usam. Lula é "L", e o protótipo
// dá sempre a fatia de Lula nos votos dos dois finalistas.

export interface DadosDoPrototipo {
  N: number;
  ufs: string[];
  ufRegiao: number[];
  regioes: string[];
  mun: { uf: number[]; S: number[]; A: number[]; aptos1: number[]; L1: number[]; B1: number[]; O1: number[] };
  perfilQ: number[];
  perfil1T: number[];
}

export interface FotoDoPrototipo {
  k: number;
  sec: Float64Array;
  aptos: Float64Array;
  L: Float64Array;
  B: Float64Array;
}

export interface ProjecaoDoPrototipo {
  P: number;
  sigma: number;
  chance: number;
  R: Float64Array;
  shat: Float64Array;
  Rtot: number;
  Vp: number;
}

export interface PontoDoPrototipo {
  x: number;
  y: number;
  sd: number;
}

export interface ViradaDoPrototipo {
  x: number | null;
  quem: "L" | "B";
  cedo: number | null;
  tarde: number | null;
}

export declare const Projecao: {
  preparar(D: DadosDoPrototipo): unknown;
  projetar(P: unknown, E: FotoDoPrototipo, metodo: "transferencia", prm: { tau: number; delta: number; k: number }): ProjecaoDoPrototipo;
  curvaProjetada(P: unknown, E: FotoDoPrototipo, pr: ProjecaoDoPrototipo, passos: number, ordem: "mistura" | "turno1" | "ritmo"): PontoDoPrototipo[];
  viradaProjetada(pts: PontoDoPrototipo[]): ViradaDoPrototipo | null;
};
