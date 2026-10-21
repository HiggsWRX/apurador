import type { CandidatoDoResultado, ResultadoDoTse } from "@apurador/tse";
import type { AvisoPronto, ChavesDaNoite, Controle } from "./chaves.ts";
import type { EventoDaNarracao } from "./narracao.ts";

// Os arquivos ao vivo que a página lê (spec, "Contratos dos arquivos ao vivo"). O arquivo de rodada traz o que é
// nacional; o de cada lugar, os dados do TSE do próprio lugar, sem alteração e com as duas casas do TSE, a curva
// real e a narração. Os votos e os percentuais vão na ordem dos candidatos do arquivo de rodada.

/** O momento da noite que a página mostra. */
export type Fase = "antes-das-17h" | "ao-vivo" | "encerrada";

/** O arquivo de rodada (`rodada.json`): o que é nacional e vale para todo lugar, publicado a cada rodada. */
export interface ArquivoDeRodada {
  /** A hora da rodada, ISO, pelo relógio do coletor: a página a compara com o `Date` da CDN. */
  rodada: string;
  fase: Fase;
  /** A última totalização do Brasil (`AAAA-MM-DD HH:MM:SS`, Brasília) e quando o coletor a viu (ISO). */
  novidade: { totalizacao: string | null; vista: string | null };
  /** Em ordem alfabética do nome de urna, a ordem fixa do site. */
  candidatos: { numero: number; nome: string; partido: string; sequencial: string }[];
  /** O estado de cada chave de publicação, como vale: a página lê a sua daqui a partir da primeira rodada (ticket 16). */
  chaves: ChavesDaNoite;
  /** O aviso pronto que o dono publicou, pelo número, ou `null`. */
  aviso: AvisoPronto | null;
  /**
   * Os eventos do Brasil que as páginas das UFs, do Exterior e dos municípios intercalam na narração delas (a virada, a
   * indicação do TSE e a totalização final), do mais novo ao mais antigo e sem número na curva. Vazio no plano zero.
   */
  eventosDoBrasil: EventoDaNarracao[];
}

/** Um ponto da curva real: o % de seções totalizadas e o % de cada candidato, como o TSE os publica. */
export type PontoDaCurvaReal = number[];

/** O arquivo de um lugar (`lugares/<id>.json`): os dados do TSE do lugar e a curva real. */
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
  /** A narração do lugar, do evento mais novo ao mais antigo; no Brasil, com os eventos das UFs que entram nela. */
  narracao: EventoDaNarracao[];
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

/** O ponto da curva real de um resultado do TSE, com os candidatos na ordem dada pelos números. */
export function pontoDaCurvaReal(resultado: ResultadoDoTse, ordem: number[]): PontoDaCurvaReal {
  return [resultado.secoes.percentual, ...naOrdem(resultado, ordem).map((c) => c.percentual)];
}

/** O arquivo do lugar a partir do resultado do TSE, com os candidatos na ordem do arquivo de rodada. */
export function arquivoDoLugar(lugar: string, resultado: ResultadoDoTse, ordem: number[], curva: PontoDaCurvaReal[], narracao: EventoDaNarracao[]): ArquivoDoLugar {
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
    narracao,
  };
}

/**
 * O arquivo de rodada, com a hora da rodada e a da última novidade (ms do relógio do coletor) em ISO, o controle do
 * dono e os eventos do Brasil das outras páginas, que ficam de fora no plano zero.
 */
export function arquivoDeRodada(
  rodada: number,
  fase: Fase,
  novidade: { totalizacao: string | null; vista: number | null },
  candidatos: CandidatoDoResultado[],
  controle: Controle,
  eventosDoBrasil: EventoDaNarracao[],
): ArquivoDeRodada {
  return {
    rodada: new Date(rodada).toISOString(),
    fase,
    novidade: { totalizacao: novidade.totalizacao, vista: novidade.vista === null ? null : new Date(novidade.vista).toISOString() },
    candidatos: candidatos.map((c) => ({ numero: c.numero, nome: c.nomeUrna, partido: c.partido, sequencial: c.sequencial })),
    chaves: controle.chaves,
    aviso: controle.aviso,
    eventosDoBrasil: controle.chaves.nucleoMinimo ? eventosDoBrasil : [],
  };
}
