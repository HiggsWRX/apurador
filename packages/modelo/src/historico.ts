import { agregadoDePesquisas, type Agregado, type PesquisaDoAgregado } from "./agregado.ts";

// O agregado de pesquisas nos 2º turnos passados (Agregado de pesquisas e erro histórico, decisão 10): a mesma regra,
// aplicada na véspera de cada eleição, com a incerteza daquele ano medida nos outros anos, como a página de
// metodologia mostra o agregado contra o resultado.

/** Um 2º turno passado, com o resultado oficial e as pesquisas, na ordem dos finalistas do 1º turno. */
export interface EleicaoPassada {
  ano: number;
  /** O dia do 2º turno, `aaaa-mm-dd`. */
  dia: string;
  /** O % dos votos válidos do primeiro finalista, no resultado oficial. */
  resultado: number;
  pesquisas: readonly PesquisaDoAgregado[];
}

export interface AnoDoHistorico {
  ano: number;
  resultado: number;
  /** O agregado do dia da eleição (o congelado na véspera), com a incerteza medida nos outros anos. */
  agregado: Agregado;
  /** O agregado menos o resultado, em pontos do primeiro finalista. */
  erro: number;
}

/** O agregado de cada ano contra o resultado, com a incerteza de cada ano calculada sem aquele ano. */
export function historicoDoAgregado(eleicoes: readonly EleicaoPassada[]): AnoDoHistorico[] {
  // O valor do agregado não depende da incerteza: primeiro o erro de cada ano, depois a incerteza sem ele.
  const erros = eleicoes.map((e) => agregadoNaEleicao(e, 0).valor - e.resultado);
  return eleicoes.map((e, i) => {
    const agregado = agregadoNaEleicao(e, raizDoErroQuadraticoMedio(erros.filter((_, j) => j !== i)));
    return { ano: e.ano, resultado: e.resultado, agregado, erro: erros[i]! };
  });
}

/** A raiz do erro quadrático médio: o erro típico em torno do resultado, sem descontar a média dos erros. */
export const raizDoErroQuadraticoMedio = (erros: readonly number[]) => Math.sqrt(erros.reduce((s, e) => s + e * e, 0) / erros.length);

function agregadoNaEleicao(e: EleicaoPassada, incerteza: number): Agregado {
  const agregado = agregadoDePesquisas(e.pesquisas, e.dia, { dia: e.dia, incerteza });
  if (!agregado) throw new Error(`${e.ano}: nenhuma pesquisa cabe na janela do agregado de ${e.dia}`);
  return agregado;
}
