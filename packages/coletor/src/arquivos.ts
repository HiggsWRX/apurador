import type { CandidatoDoResultado, ResultadoDoTse } from "@apurador/tse";

// Os arquivos ao vivo que a página lê (spec, "Contratos dos arquivos ao vivo"). O arquivo de rodada traz o que é
// nacional; o de cada lugar, os dados do TSE do próprio lugar, sem alteração e com as duas casas do TSE, e a
// curva real. Os votos e os percentuais vão na ordem dos candidatos do arquivo de rodada.

/** O momento da noite que a página mostra. */
export type Fase = "antes-das-17h" | "ao-vivo" | "encerrada";

export interface ArquivoDeRodada {
  /** A hora da rodada, ISO, pelo relógio do coletor: a página a compara com o `Date` da CDN. */
  rodada: string;
  fase: Fase;
  /** A última totalização do Brasil (`AAAA-MM-DD HH:MM:SS`, Brasília) e quando o coletor a viu (ISO). */
  novidade: { totalizacao: string | null; vista: string | null };
  /** Em ordem alfabética do nome de urna, a ordem fixa do site. */
  candidatos: { numero: number; nome: string; partido: string; sequencial: string }[];
}

/** Um ponto da curva real: o % de seções totalizadas e o % de cada candidato, como o TSE os publica. */
export type PontoDaCurvaReal = number[];

export interface ArquivoDoLugar {
  /** `BR`, a sigla da UF, `ZZ` (o Exterior) ou o código do TSE do município, com 5 dígitos. */
  lugar: string;
  tse: {
    /** A hora da última totalização do lugar, `AAAA-MM-DD HH:MM:SS`, em Brasília. */
    totalizacao: string | null;
    secoes: { totalizadas: number; total: number; percentual: number };
    votos: number[];
    percentuais: number[];
    final: boolean;
  };
  curva: PontoDaCurvaReal[];
}

/** Os candidatos na ordem fixa do site: alfabética pelo nome de urna. */
export const emOrdem = (candidatos: CandidatoDoResultado[]) => [...candidatos].sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR"));

/** Os candidatos do resultado de um lugar na ordem dada pelos números. O coletor só guarda arquivos com os candidatos do Brasil. */
function naOrdem(resultado: ResultadoDoTse, ordem: number[]): CandidatoDoResultado[] {
  return ordem.map((numero) => {
    const c = resultado.candidatos.find((x) => x.numero === numero);
    if (!c) throw new Error(`O candidato ${numero} não está no arquivo ${resultado.abrangencia.tipo} ${resultado.abrangencia.codigo}`);
    return c;
  });
}

export function pontoDaCurvaReal(resultado: ResultadoDoTse, ordem: number[]): PontoDaCurvaReal {
  return [resultado.secoes.percentual, ...naOrdem(resultado, ordem).map((c) => c.percentual)];
}

export function arquivoDoLugar(lugar: string, resultado: ResultadoDoTse, ordem: number[], curva: PontoDaCurvaReal[]): ArquivoDoLugar {
  const candidatos = naOrdem(resultado, ordem);
  return {
    lugar,
    tse: {
      totalizacao: resultado.ultimaTotalizacao,
      secoes: resultado.secoes,
      votos: candidatos.map((c) => c.votos),
      percentuais: candidatos.map((c) => c.percentual),
      final: resultado.totalizacaoFinal,
    },
    curva,
  };
}

export function arquivoDeRodada(rodada: number, fase: Fase, novidade: { totalizacao: string | null; vista: number | null }, candidatos: CandidatoDoResultado[]): ArquivoDeRodada {
  return {
    rodada: new Date(rodada).toISOString(),
    fase,
    novidade: { totalizacao: novidade.totalizacao, vista: novidade.vista === null ? null : new Date(novidade.vista).toISOString() },
    candidatos: candidatos.map((c) => ({ numero: c.numero, nome: c.nomeUrna, partido: c.partido, sequencial: c.sequencial })),
  };
}
