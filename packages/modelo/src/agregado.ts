import { dataEmBrasilia, diasEntre, somarDias } from "./datas.ts";
import { phi, Z_95 } from "./normal.ts";

// O agregado de pesquisas do Brasil (Agregado de pesquisas e erro histórico, decisões 3 a 5): a média simples, em
// votos válidos, da pesquisa mais recente de cada instituto da lista, com campo terminando nos 7 dias anteriores ao
// dia do cálculo. A incerteza é normal, e a chance de vitória é a probabilidade de passar de 50%.

/** Uma pesquisa nacional do 2º turno, já conferida no TSE, como o agregado a lê. */
export interface PesquisaDoAgregado {
  /** No formato da divulgação, `BR-00466/2026`. */
  registro: string;
  /** O instituto da lista fechada (um dos 14), que sai do CNPJ do registro: duas pesquisas dele nunca entram juntas. */
  instituto: string;
  /** O último dia do campo, `aaaa-mm-dd`. */
  campoFim: string;
  /** O dia da divulgação, `aaaa-mm-dd`. */
  divulgacao: string;
  /** Os votos totais publicados, em %, do primeiro e do segundo finalista (Flávio e Lula). */
  votos: readonly [number, number];
}

/** O agregado de pesquisas de um dia: o valor, a incerteza, a janela e as pesquisas que entraram. */
export interface Agregado {
  /** O dia do cálculo, `aaaa-mm-dd`. */
  dia: string;
  /** O % dos votos válidos do primeiro finalista (Flávio): a média simples das pesquisas. */
  valor: number;
  /** O desvio padrão da distribuição normal do resultado, em pontos. */
  incerteza: number;
  /** A faixa de 95% do primeiro finalista, em %. */
  faixa: readonly [number, number];
  /** A chance de vitória do primeiro finalista, de 0 a 1: a probabilidade de passar de 50%. */
  chance: number;
  /** Em dias: 7, ou 14 quando a de 7 tem menos de 4 institutos. */
  janela: number;
  /** O primeiro e o último dia em que o campo de uma pesquisa pode terminar para entrar na janela. */
  campoEntre: readonly [string, string];
  /** A pesquisa de cada instituto que entrou na média. */
  pesquisas: PesquisaDoAgregado[];
}

/** O dia da eleição. */
export const DIA_DA_ELEICAO = "2026-10-25";
/**
 * O dia seguinte ao 1º turno, que foi em 04/10: só entram pesquisas com campo a partir dele (antes, elas ouviram
 * eleitores que não sabiam o resultado), e a tendência começa nele.
 */
export const INICIO_DO_2O_TURNO = "2026-10-05";
/**
 * O congelamento (decisão 8): às 23h de 24/10, o agregado passa a ser o da noite, o de 25/10, e fica nele. Pesquisas
 * divulgadas em 25/10 ficam de fora. Depois disso, só se retira pesquisa.
 */
export const CONGELAMENTO = "2026-10-24T23:00:00-03:00";

/** O dia do agregado num instante: o dia em Brasília (UTC−3, sem horário de verão) até o congelamento, e 25/10 dali em diante. */
export function diaDoAgregado(instante: Date): string {
  return instante.getTime() >= Date.parse(CONGELAMENTO) ? DIA_DA_ELEICAO : dataEmBrasilia(instante);
}

/**
 * A eleição de um agregado: o dia dela e a incerteza no próprio dia. A regra é uma só, a de 2026 e a dos 2º turnos
 * de 2002 a 2022 (decisão 10), que só mudam nestes dois valores.
 */
export interface EleicaoDoAgregado {
  /** O dia da eleição, `aaaa-mm-dd`. Pesquisa divulgada nele ou depois nunca entra. */
  dia: string;
  /** O desvio padrão no dia da eleição, em pontos, sem os dias que faltam. */
  incerteza: number;
}

/** O 2º turno de 2026. Decisão 5: 1,5 ponto na eleição. */
export const ELEICAO_DE_2026: EleicaoDoAgregado = { dia: DIA_DA_ELEICAO, incerteza: 1.5 };

/** Decisão 5: antes da eleição, a variância ganha o quadrado disto por dia que falta, em pontos. */
export const INCERTEZA_POR_DIA = 0.4;
// Decisão 3: 7 dias, ou 14 com menos de 4 institutos.
const JANELA = 7;
const JANELA_LARGA = 14;
const MINIMO_DE_INSTITUTOS = 4;

/** O agregado num dia, ou `undefined` se nenhuma pesquisa da lista cabe na janela. A eleição é a de 2026, salvo outra. */
export function agregadoDePesquisas(pesquisas: readonly PesquisaDoAgregado[], dia: string, eleicao = ELEICAO_DE_2026): Agregado | undefined {
  let janela = JANELA;
  let usadas = maisRecentePorInstituto(pesquisas, dia, janela, eleicao.dia);
  if (usadas.length < MINIMO_DE_INSTITUTOS) usadas = maisRecentePorInstituto(pesquisas, dia, (janela = JANELA_LARGA), eleicao.dia);
  if (usadas.length === 0) return undefined;

  const valor = usadas.reduce((s, p) => s + validosDoPrimeiro(p), 0) / usadas.length;
  const dias = Math.max(0, diasEntre(dia, eleicao.dia));
  const incerteza = Math.sqrt(eleicao.incerteza ** 2 + INCERTEZA_POR_DIA ** 2 * dias);
  return {
    dia,
    valor,
    incerteza,
    faixa: [valor - Z_95 * incerteza, valor + Z_95 * incerteza],
    chance: phi((valor - 50) / incerteza),
    janela,
    campoEntre: [somarDias(dia, -janela), somarDias(dia, -1)],
    pesquisas: usadas,
  };
}

/**
 * A tendência: o agregado de cada dia, do dia seguinte ao 1º turno (05/10, salvo outro) até o dia dado, com a mesma
 * regra. Os dias sem pesquisa ficam de fora. A eleição é a de 2026, salvo outra, como a do ensaio geral, em 2022.
 */
export function tendenciaDoAgregado(pesquisas: readonly PesquisaDoAgregado[], ate: string, eleicao = ELEICAO_DE_2026, desde = INICIO_DO_2O_TURNO): Agregado[] {
  const tendencia: Agregado[] = [];
  for (let dia = desde; dia <= ate; dia = somarDias(dia, 1)) {
    const agregado = agregadoDePesquisas(pesquisas, dia, eleicao);
    if (agregado) tendencia.push(agregado);
  }
  return tendencia;
}

/** A pesquisa de campo mais recente de cada instituto, entre as divulgadas até o dia, com campo terminando na janela. */
function maisRecentePorInstituto(pesquisas: readonly PesquisaDoAgregado[], dia: string, janela: number, diaDaEleicao: string): PesquisaDoAgregado[] {
  const inicio = somarDias(dia, -janela);
  const maisRecente = new Map<string, PesquisaDoAgregado>();
  for (const p of pesquisas) {
    if (p.divulgacao > dia || p.divulgacao >= diaDaEleicao || p.campoFim < inicio || p.campoFim >= dia) continue;
    const outra = maisRecente.get(p.instituto);
    if (!outra || p.campoFim > outra.campoFim || (p.campoFim === outra.campoFim && p.divulgacao > outra.divulgacao)) maisRecente.set(p.instituto, p);
  }
  return [...maisRecente.values()];
}

/** Os válidos saem dos votos totais publicados: Flávio ÷ (Flávio + Lula). */
const validosDoPrimeiro = (p: PesquisaDoAgregado) => (100 * p.votos[0]) / (p.votos[0] + p.votos[1]);
