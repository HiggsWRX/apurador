// As constantes do modelo: fixas, escolhidas pela calibração entre valores escritos antes, nunca treinadas. Ficam
// no arquivo de dados `constantes.json` deste pacote, e as funções do modelo as recebem como parâmetro.

/**
 * A ordem de chegada que dá a forma da curva projetada:
 * - `primeiro-turno`: cada município chega no ritmo em que chegou no 1º turno;
 * - `ritmo-da-noite`: cada UF continua no ritmo que mostrou até agora na noite;
 * - `mistura`: a média das duas.
 */
export type OrdemDeChegada = "mistura" | "primeiro-turno" | "ritmo-da-noite";

/** As constantes do modelo, que a calibração escolhe e congela (`constantes.json`). */
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
  /** K: o % de seções totalizadas no Brasil que as pesquisas valem na base "Apuração + pesquisas". Com ele, elas pesam metade. */
  secoesDasPesquisas: number;
  /**
   * A incerteza local da indicação das pesquisas, independente entre lugares, por unidade da fatia dos eliminados no 1º
   * turno: a da UF e a do município em torno da UF. A nacional é a do agregado.
   */
  incertezaLocalDasPesquisas: { uf: number; municipio: number };
  /**
   * Se a base do modelo divide em zonas os municípios com mais de uma (Ensaio geral, decisão 16). O modelo não a lê: é a
   * escolha da calibração para quem montar a base da noite, que sem ela é por município.
   */
  zona: boolean;
}

/**
 * Os valores provisórios das decisões do mapa (Método de projeção só com a apuração, 09; Combinação de pesquisas e
 * apuração, 11; Sinal de virada, 23), de antes da calibração. O porte fiel e o registro da calibração os comparam.
 */
export const CONSTANTES_PROVISORIAS: Constantes = {
  incertezaRegional: 1,
  incertezaNacional: 1,
  pesoDoMunicipio: 3000,
  minimoPorNivel: 2000,
  ordemDeChegada: "mistura",
  sinalDeVirada: { projetada: 0.5, possivel: 0.05 },
  secoesDasPesquisas: 0.5,
  incertezaLocalDasPesquisas: { uf: 0.13, municipio: 0.15 },
  zona: false,
};

const ORDENS: OrdemDeChegada[] = ["mistura", "primeiro-turno", "ritmo-da-noite"];

/** As constantes do arquivo de dados, conferidas: um número fora do lugar falha aqui, e não no meio da noite. */
export function lerConstantes(dados: unknown): Constantes {
  const d = dados as Record<string, unknown>;
  const numero = (valor: unknown, nome: string, min: number, max: number) => {
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor < min || valor > max) throw new Error(`constantes do modelo: ${nome} deve ser um número de ${min} a ${max}, e é ${JSON.stringify(valor)}`);
    return valor;
  };
  if (typeof d.zona !== "boolean") throw new Error(`constantes do modelo: zona deve ser true ou false, e é ${JSON.stringify(d.zona)}`);
  if (!ORDENS.includes(d.ordemDeChegada as OrdemDeChegada)) throw new Error(`constantes do modelo: ordemDeChegada deve ser ${ORDENS.join(", ")}, e é ${JSON.stringify(d.ordemDeChegada)}`);
  const sinal = (d.sinalDeVirada ?? {}) as Record<string, unknown>;
  const local = (d.incertezaLocalDasPesquisas ?? {}) as Record<string, unknown>;
  const constantes: Constantes = {
    incertezaRegional: numero(d.incertezaRegional, "incertezaRegional", 0, 10),
    incertezaNacional: numero(d.incertezaNacional, "incertezaNacional", 0, 10),
    pesoDoMunicipio: numero(d.pesoDoMunicipio, "pesoDoMunicipio", 0, 1e6),
    minimoPorNivel: numero(d.minimoPorNivel, "minimoPorNivel", 0, 1e6),
    ordemDeChegada: d.ordemDeChegada as OrdemDeChegada,
    sinalDeVirada: { projetada: numero(sinal.projetada, "sinalDeVirada.projetada", 0, 1), possivel: numero(sinal.possivel, "sinalDeVirada.possivel", 0, 1) },
    // com K = 0, o peso das pesquisas antes da primeira seção seria 0 ÷ 0
    secoesDasPesquisas: numero(d.secoesDasPesquisas, "secoesDasPesquisas", 0.01, 100),
    incertezaLocalDasPesquisas: {
      uf: numero(local.uf, "incertezaLocalDasPesquisas.uf", 0, 1),
      municipio: numero(local.municipio, "incertezaLocalDasPesquisas.municipio", 0, 1),
    },
    zona: d.zona,
  };
  if (constantes.sinalDeVirada.possivel > constantes.sinalDeVirada.projetada) throw new Error("constantes do modelo: o limite da virada possível passa o da virada projetada");
  return constantes;
}
