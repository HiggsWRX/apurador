import type { SinalDeVirada } from "@apurador/modelo";
import type { CandidatoDoResultado, ResultadoDoTse } from "@apurador/tse";
import type { AvisoPronto, ChavesDaNoite, Controle } from "./chaves.ts";
import type { EventoDaNarracao } from "./narracao.ts";

// Os arquivos ao vivo que a página lê (spec, "Contratos dos arquivos ao vivo"). O arquivo de rodada traz o que é
// nacional; o de cada lugar, os dados do TSE do próprio lugar, sem alteração e com as duas casas do TSE, a curva
// real e a narração, e o do Brasil, de cada UF e do Exterior, também a projeção. A projeção dos municípios fica numa
// tabela por UF, e o `mapa.json` traz os números do TSE de todos os lugares, para o mapa e a tabela de lugares (Volume
// de gravações na noite, decisão 1). Os votos, os percentuais e a projeção vão na ordem dos candidatos do arquivo de
// rodada. Os números da projeção vão como a página os mostra (decisão 2): projeção e margem com uma casa, chance e %
// da virada inteiros.

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
   * O peso das pesquisas na base "Apuração + pesquisas", em %, inteiro: um número só para o país (Combinação de
   * pesquisas e apuração, decisão 2). `null` com a chave da projeção ou a da base com pesquisas desligada.
   */
  pesoDasPesquisas: number | null;
  /**
   * Os eventos do Brasil que as páginas das UFs, do Exterior e dos municípios intercalam na narração delas (a virada,
   * "as pesquisas deixaram de pesar", a indicação do TSE e a totalização final), do mais novo ao mais antigo e sem
   * número na curva. Vazio no plano zero.
   */
  eventosDoBrasil: EventoDaNarracao[];
}

/** Um ponto da curva projetada: o % de seções do lugar, o % do 1º candidato e a margem de 95%, em pontos, com uma casa. */
export type PontoDaCurvaProjetada = [secoes: number, pct: number, margem: number];

/** A projeção de um lugar numa base da projeção. Os % são do 1º candidato do arquivo de rodada; os do 2º, o que falta para 100. */
export interface ProjecaoNaBase {
  /** O resultado final estimado, em % dos votos válidos, com uma casa. */
  projecao: number;
  /** A margem de 95%, em pontos, com uma casa. */
  margem: number;
  /** A chance de vitória, em %, inteira. */
  chance: number;
  /** A chance de vitória de quem está atrás no placar parcial, em %, inteira, ou `null` antes de alguém estar atrás. */
  chanceDeVirada: number | null;
  sinalDeVirada: SinalDeVirada | null;
  /** Do placar parcial de agora (se já há votos) até 100% das seções. */
  curva: PontoDaCurvaProjetada[];
  /**
   * A virada projetada, em % de seções inteiros: o ponto em que a curva cruza 50% e a faixa em que a virada é possível,
   * cada um `null` quando a curva não o tem. `null` quando a curva tem menos de dois pontos.
   */
  virada: { x: number | null; cedo: number | null; tarde: number | null } | null;
}

/** A projeção do Brasil, de uma UF ou do Exterior, nas bases que estão no ar. */
export interface ProjecaoDoLugar {
  soApuracao: ProjecaoNaBase;
  /** Só com a chave da base com pesquisas ligada. */
  comPesquisas?: ProjecaoNaBase;
  /** Se as duas bases já coincidem aqui (Combinação de pesquisas e apuração, decisão 5). Só com as duas. */
  coincidem?: boolean;
  /**
   * Com o que "A projeção, comparada" compara, em % do 1º candidato com uma casa (Telas da página de lugar, decisão 3): o
   * placar entre finalistas do lugar no 1º turno e a indicação das pesquisas do lugar.
   */
  comparacoes: { primeiroTurno: number; pesquisas: number };
}

/**
 * Uma base da projeção na tabela de projeções, em colunas: um valor por município, na ordem de `municipios`, com os
 * números de `ProjecaoNaBase`. Sem a curva: a página do município a desenha do placar parcial à projeção.
 */
export interface ColunasDaBase {
  projecao: number[];
  margem: number[];
  chance: number[];
  chanceDeVirada: (number | null)[];
  sinalDeVirada: (SinalDeVirada | null)[];
  /** A virada projetada, em % das seções do município, inteiros: o ponto e a faixa, cada um `null` quando não há. */
  virada: [x: number | null, cedo: number | null, tarde: number | null][];
}

/**
 * As projeções dos municípios de uma UF ou das cidades do Exterior, nas bases que estão no ar, na ordem dos municípios da
 * tabela. As colunas cabem a tabela de Minas Gerais, a maior, em ~10 KB com gzip: com um objeto por município, os nomes
 * dos campos se repetiriam 853 vezes.
 */
export interface ProjecoesDosMunicipios {
  /** A assinatura dos municípios em cuja ordem as colunas vêm (`MunicipiosDaTabela`): a página só junta os dois com a mesma. */
  assinatura: string;
  /**
   * Os votos válidos projetados de cada município, inteiros: os apurados mais o voto que falta. São os mesmos nas duas
   * bases, que só repartem diferente o voto que falta. Com eles e o placar parcial, a página desenha a curva projetada.
   */
  validos: number[];
  soApuracao: ColunasDaBase;
  /** Só com a chave da base com pesquisas ligada. */
  comPesquisas?: ColunasDaBase;
  /** Se as duas bases já coincidem em cada município. Só com as duas. */
  coincidem?: boolean[];
}

/**
 * A tabela de projeções de uma UF ou do Exterior (`tabelas/<UF>.json`), regravada quando muda. O que não muda na noite (os
 * municípios e as comparações) fica em `MunicipiosDaTabela`, gravado uma vez: repetido a cada rodada, custaria 38 KB com
 * gzip das 28 tabelas, ~50 MB numa noite.
 */
export interface TabelaDeProjecoes {
  /** A sigla da UF, ou `ZZ`. */
  uf: string;
  /** Com a projeção no ar; sem ela, a tabela é regravada vazia, para nenhuma projeção velha ficar no ar. */
  projecao?: ProjecoesDosMunicipios;
}

/** Os municípios da tabela de projeções de uma UF ou do Exterior (`tabelas/<UF>-municipios.json`): gravado uma vez, a partir das 17h. */
export interface MunicipiosDaTabela {
  /** A sigla da UF, ou `ZZ`. */
  uf: string;
  /** A assinatura de `municipios` (`assinaturaDosLugares`), que a tabela de projeções repete. */
  assinatura: string;
  /** O código do TSE de cada município, com 5 dígitos, na ordem da base do modelo: a das colunas da tabela. */
  municipios: string[];
  /** Com o que "A projeção, comparada" compara em cada município, como em `ProjecaoDoLugar`. */
  comparacoes: { primeiroTurno: number[]; pesquisas: number[] };
}

/**
 * O `mapa.json`: o % de seções e o placar de cada UF, do Exterior e de cada município, baixado só quando o cartão do mapa
 * entra na tela. Para caber em ~25 KB com gzip (20 KB no pico de 2022), ele segue a ordem dos lugares do site
 * (`dados/lugares.json`, sem o Brasil) sem repetir os ids, que sozinhos dariam ~17 KB, e só leva o % do 2º candidato
 * quando ele não é o que falta para 100,00.
 */
export interface ArquivoDoMapa {
  /** A assinatura da lista de lugares em que `tse` vem (`assinaturaDosLugares`): a página confere que é a dela. */
  assinatura: string;
  /**
   * De cada lugar, o % de seções e o do 1º candidato, como o TSE os publica, e o do 2º só quando a soma dos dois não dá
   * 100,00: o TSE arredonda cada um à parte, e numa seção sem votos válidos os dois são 0. `null` sem arquivo do TSE.
   */
  tse: ([secoes: number, primeiro: number, segundo?: number] | null)[];
  /** A projeção de cada UF e do Exterior, em % do 1º candidato com uma casa, nas bases no ar: a coluna da tabela do Brasil. */
  projecao?: { soApuracao: Record<string, number>; comPesquisas?: Record<string, number> };
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
  /** No Brasil, em cada UF e no Exterior, com a chave da projeção ligada. Os municípios não têm. */
  projecao?: ProjecaoDoLugar;
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

/** O arquivo do lugar a partir do resultado do TSE, com os candidatos na ordem do arquivo de rodada e, se houver, a projeção. */
export function arquivoDoLugar(
  lugar: string,
  resultado: ResultadoDoTse,
  ordem: number[],
  curva: PontoDaCurvaReal[],
  narracao: EventoDaNarracao[],
  projecao?: ProjecaoDoLugar,
): ArquivoDoLugar {
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
    ...(projecao ? { projecao } : {}),
  };
}

/**
 * O `mapa.json`, com o resultado de cada lugar do site na ordem dele (`undefined` num lugar sem arquivo do TSE), os
 * candidatos na ordem do arquivo de rodada e, com a projeção no ar, a das UFs e do Exterior.
 */
export function arquivoDoMapa(
  assinatura: string,
  resultados: (ResultadoDoTse | undefined)[],
  ordem: number[],
  projecao?: ArquivoDoMapa["projecao"],
): ArquivoDoMapa {
  const tse = resultados.map((r): ArquivoDoMapa["tse"][number] => {
    if (!r) return null;
    const [secoes, primeiro, segundo] = pontoDaCurvaReal(r, ordem) as [number, number, number];
    return Math.round(100 * primeiro) + Math.round(100 * segundo) === 10_000 ? [secoes, primeiro] : [secoes, primeiro, segundo];
  });
  return { assinatura, tse, ...(projecao ? { projecao } : {}) };
}

/**
 * O arquivo de rodada, com a hora da rodada e a da última novidade (ms do relógio do coletor) em ISO, o controle do
 * dono, o peso das pesquisas (de 0 a 1, ou `null` fora do ar) e os eventos do Brasil das outras páginas, que ficam de
 * fora no plano zero.
 */
export function arquivoDeRodada(
  rodada: number,
  fase: Fase,
  novidade: { totalizacao: string | null; vista: number | null },
  candidatos: CandidatoDoResultado[],
  controle: Controle,
  pesoDasPesquisas: number | null,
  eventosDoBrasil: EventoDaNarracao[],
): ArquivoDeRodada {
  return {
    rodada: new Date(rodada).toISOString(),
    fase,
    novidade: { totalizacao: novidade.totalizacao, vista: novidade.vista === null ? null : new Date(novidade.vista).toISOString() },
    candidatos: candidatos.map((c) => ({ numero: c.numero, nome: c.nomeUrna, partido: c.partido, sequencial: c.sequencial })),
    chaves: controle.chaves,
    aviso: controle.aviso,
    pesoDasPesquisas: pesoDasPesquisas === null ? null : Math.round(100 * pesoDasPesquisas),
    eventosDoBrasil: controle.chaves.nucleoMinimo ? eventosDoBrasil : [],
  };
}
