import { agregadoDaVespera, ELEICAO_DE_2026, type Agregado, type EleicaoPassada, type PesquisaDoAgregado } from "@apurador/modelo";
import { ehData, ehDecimal, lerTabela, naoVazio } from "./csv.ts";
import type { ResultadoHistorico } from "./resultados-historicos.ts";

// O histórico das pesquisas (`dados/pesquisas-historicas.csv`, Agregado de pesquisas e erro histórico, decisão 10):
// as pesquisas nacionais finais dos 2º turnos de 2002 a 2022 e as do 1º turno de 2026, cada uma com a fonte. Sobre
// elas, a regra do agregado de 2026 dá o histórico da metodologia e os agregados das noites passadas.

/** Uma linha do `pesquisas-historicas.csv`, com os números como a fonte os publicou. */
export interface PesquisaHistorica {
  ano: number;
  turno: number;
  /** Em 2002, a média de Jennings e Wlezien, sem o nome dos institutos, conta como um instituto só. */
  instituto: string;
  contratante: string | null;
  /** No formato da divulgação, `BR-08297/2022`, quando o registro no TSE é conhecido. */
  registro: string | null;
  campoInicio: string;
  campoFim: string;
  /** `null` quando a fonte não dá o dia: a pesquisa conta como divulgada no último dia do campo. */
  divulgacao: string | null;
  entrevistas: number | null;
  /** Se os números são de votos totais ou de válidos. A conta entre os dois finalistas é a mesma. */
  base: "totais" | "validos";
  /** Os votos dos dois finalistas, em %, pelo número do candidato no TSE. */
  votos: Map<number, number>;
  /** No 1º turno, a soma dos outros candidatos, na mesma base: os válidos são a soma de todos. */
  outros: number | null;
  fonte: string;
  observacao: string | null;
}

const ARQUIVO = "pesquisas-historicas.csv";
const COLUNAS = [
  "ano",
  "turno",
  "instituto",
  "contratante",
  "registro",
  "campo_inicio",
  "campo_fim",
  "divulgacao",
  "entrevistas",
  "base",
  "votos_outros",
  "fonte",
  "observacao",
] as const;
const BASES = ["totais", "validos"] as const;

const ou = (valido: (v: string) => boolean) => (v: string) => v === "" || valido(v);
const textoOuNulo = (v: string) => (v === "" ? null : v);

/** Lê o `pesquisas-historicas.csv`. Os votos de cada finalista vêm nas colunas `votos_<número do candidato no TSE>`. */
export function lerPesquisasHistoricas(texto: string): PesquisaHistorica[] {
  return lerTabela(texto, ARQUIVO, COLUNAS, /^votos_\d+$/).map(({ valor, extras }, i) => {
    const turno = valor("turno", (v) => v === "1" || v === "2", Number);
    const p: PesquisaHistorica = {
      ano: valor("ano", (v) => /^\d{4}$/.test(v), Number),
      turno,
      instituto: valor("instituto", naoVazio, String),
      contratante: valor("contratante", () => true, textoOuNulo),
      registro: valor(
        "registro",
        ou((v) => /^BR-\d{5}\/\d{4}$/.test(v)),
        textoOuNulo,
      ),
      campoInicio: valor("campo_inicio", ehData, String),
      campoFim: valor("campo_fim", ehData, String),
      divulgacao: valor("divulgacao", ou(ehData), textoOuNulo),
      entrevistas: valor(
        "entrevistas",
        ou((v) => /^\d+$/.test(v)),
        (v) => (v === "" ? null : Number(v)),
      ),
      base: valor(
        "base",
        (v) => (BASES as readonly string[]).includes(v),
        (v) => v as PesquisaHistorica["base"],
      ),
      votos: new Map(
        extras.flatMap((c) => {
          const votos = valor(c, ou(ehDecimal), textoOuNulo);
          return votos === null ? [] : [[Number(c.slice("votos_".length)), Number(votos)] as const];
        }),
      ),
      // Só o 1º turno tem outros candidatos, e a margem nos válidos precisa deles.
      outros: valor("votos_outros", turno === 1 ? ehDecimal : (v) => v === "", (v) => (v === "" ? null : Number(v))),
      fonte: valor("fonte", (v) => /^https?:\/\/\S+$/.test(v), String),
      observacao: valor("observacao", () => true, textoOuNulo),
    };
    const erro = (motivo: string) => new Error(`${ARQUIVO}, linha ${i + 2}: ${motivo}`);
    if (p.votos.size !== 2) throw erro(`os votos são de ${p.votos.size} candidato(s), não dos dois finalistas`);
    if (p.campoInicio > p.campoFim) throw erro(`o campo começa (${p.campoInicio}) depois de terminar (${p.campoFim})`);
    if (p.divulgacao !== null && p.divulgacao < p.campoFim) throw erro(`a divulgação (${p.divulgacao}) é anterior ao fim do campo (${p.campoFim})`);
    return p;
  });
}

/** Os 2º turnos do histórico, na ordem dos anos, com as pesquisas e o resultado no primeiro finalista do 1º turno. */
export function eleicoesPassadas(pesquisas: readonly PesquisaHistorica[], resultados: readonly ResultadoHistorico[]): EleicaoPassada[] {
  exigirResultados(pesquisas, resultados);
  return resultados
    .filter((r) => r.turno === 2)
    .sort((a, b) => a.ano - b.ano)
    .map((r) => {
      const [primeiro, segundo] = r.finalistas;
      return {
        ano: r.ano,
        dia: r.dia,
        resultado: (100 * primeiro.votos) / (primeiro.votos + segundo.votos),
        pesquisas: pesquisasDaEleicao(pesquisas, r, [primeiro.numero, segundo.numero]),
      };
    });
}

/**
 * O agregado de uma noite passada, congelado na véspera (o do dia da eleição), no primeiro dos finalistas dados, que
 * são os da base da noite: o replay, a calibração e o ensaio geral partem dele. A incerteza é a da noite de 2026.
 */
export function agregadoDaNoite(
  pesquisas: readonly PesquisaHistorica[],
  resultados: readonly ResultadoHistorico[],
  noite: { ano: number; turno: number },
  finalistas: readonly [number, number],
): Agregado {
  exigirResultados(pesquisas, resultados);
  const resultado = resultados.find((r) => r.ano === noite.ano && r.turno === noite.turno);
  if (!resultado) throw new Error(`${noite.ano}, ${noite.turno}º turno: sem resultado em resultados-historicos.json`);
  return agregadoDaVespera(pesquisasDaEleicao(pesquisas, resultado, finalistas), resultado.dia, ELEICAO_DE_2026.incerteza);
}

/** Toda pesquisa tem de ser de uma eleição com resultado: um ano digitado errado não some da conta calado. */
function exigirResultados(pesquisas: readonly PesquisaHistorica[], resultados: readonly ResultadoHistorico[]): void {
  const semResultado = pesquisas.filter((p) => !resultados.some((r) => r.ano === p.ano && r.turno === p.turno));
  if (semResultado.length > 0) {
    throw new Error(`${semResultado.map((p) => `${p.ano}, ${p.turno}º turno, ${p.instituto}`).join("; ")}: sem resultado em resultados-historicos.json`);
  }
}

/** As pesquisas de uma eleição como o agregado as lê, com os votos na ordem dos finalistas dados. */
function pesquisasDaEleicao(
  pesquisas: readonly PesquisaHistorica[],
  resultado: ResultadoHistorico,
  [primeiro, segundo]: readonly [number, number],
): PesquisaDoAgregado[] {
  const rotulo = `${resultado.ano}, ${resultado.turno}º turno`;
  const daEleicao = new Set(resultado.finalistas.map((f) => f.numero));
  if (!daEleicao.has(primeiro) || !daEleicao.has(segundo) || primeiro === segundo) {
    throw new Error(`${rotulo}: os finalistas são ${[...daEleicao].join(" e ")}, não ${primeiro} e ${segundo}`);
  }
  return pesquisas
    .filter((p) => p.ano === resultado.ano && p.turno === resultado.turno)
    .map((p) => {
      const [a, b] = [p.votos.get(primeiro), p.votos.get(segundo)];
      if (a === undefined || b === undefined) throw new Error(`${rotulo}, ${p.instituto}: os votos não são dos finalistas ${primeiro} e ${segundo}`);
      return {
        registro: p.registro ?? `${p.instituto}, campo até ${p.campoFim}`,
        instituto: p.instituto,
        campoFim: p.campoFim,
        divulgacao: p.divulgacao ?? p.campoFim,
        votos: [a, b] as const,
      };
    });
}
