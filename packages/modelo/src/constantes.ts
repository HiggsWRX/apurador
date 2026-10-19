// As constantes do modelo: fixas, escolhidas pela calibração entre valores escritos antes, nunca treinadas. Ficam
// no arquivo de dados `constantes.json` deste pacote, e as funções do modelo as recebem como parâmetro.

/**
 * A ordem de chegada que dá a forma da curva projetada:
 * - `primeiro-turno`: cada município chega no ritmo em que chegou no 1º turno;
 * - `ritmo-da-noite`: cada UF continua no ritmo que mostrou até agora na noite;
 * - `mistura`: a média das duas.
 */
export type OrdemDeChegada = "mistura" | "primeiro-turno" | "ritmo-da-noite";

export interface Constantes {
  /** Quanto o voto que falta de uma UF inteira pode se afastar da referência, além do erro estatístico, em p.p. */
  incertezaRegional: number;
  /** O desvio comum a todo o voto que falta, como as seções tardias pendendo para um lado, em p.p. */
  incertezaNacional: number;
  /** Os votos válidos apurados com que o placar parcial do próprio município pesa metade na estimativa do voto que falta. */
  pesoDoMunicipio: number;
  /** Os votos válidos apurados mínimos para um nível (UF, região, Brasil) servir de referência da transferência de votos. */
  minimoPorNivel: number;
  ordemDeChegada: OrdemDeChegada;
  /** A partir de que chance de virada a virada é projetada e possível. Abaixo de `possivel`, não há sinal de virada. */
  sinalDeVirada: { projetada: number; possivel: number };
}

const ORDENS: OrdemDeChegada[] = ["mistura", "primeiro-turno", "ritmo-da-noite"];

/** As constantes do arquivo de dados, conferidas: um número fora do lugar falha aqui, e não no meio da noite. */
export function lerConstantes(dados: unknown): Constantes {
  const d = dados as Record<string, unknown>;
  const numero = (valor: unknown, nome: string, min: number, max: number) => {
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor < min || valor > max) throw new Error(`constantes do modelo: ${nome} deve ser um número de ${min} a ${max}, e é ${JSON.stringify(valor)}`);
    return valor;
  };
  if (!ORDENS.includes(d.ordemDeChegada as OrdemDeChegada)) throw new Error(`constantes do modelo: ordemDeChegada deve ser ${ORDENS.join(", ")}, e é ${JSON.stringify(d.ordemDeChegada)}`);
  const sinal = (d.sinalDeVirada ?? {}) as Record<string, unknown>;
  const constantes: Constantes = {
    incertezaRegional: numero(d.incertezaRegional, "incertezaRegional", 0, 10),
    incertezaNacional: numero(d.incertezaNacional, "incertezaNacional", 0, 10),
    pesoDoMunicipio: numero(d.pesoDoMunicipio, "pesoDoMunicipio", 0, 1e6),
    minimoPorNivel: numero(d.minimoPorNivel, "minimoPorNivel", 0, 1e6),
    ordemDeChegada: d.ordemDeChegada as OrdemDeChegada,
    sinalDeVirada: { projetada: numero(sinal.projetada, "sinalDeVirada.projetada", 0, 1), possivel: numero(sinal.possivel, "sinalDeVirada.possivel", 0, 1) },
  };
  if (constantes.sinalDeVirada.possivel > constantes.sinalDeVirada.projetada) throw new Error("constantes do modelo: o limite da virada possível passa o da virada projetada");
  return constantes;
}
