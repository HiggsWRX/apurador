import type { Constantes } from "./constantes.ts";
import {
  fatiaFinal,
  REGIOES,
  resultadoComDesvio,
  semVotos,
  somarVotos,
  type Apuracao,
  type Modelo,
  type Projecao,
  type ResultadoDaUf,
  type ResultadoDoLugar,
} from "./projecao.ts";

// A simulação do simulador "e se" (Simulador "e se", decisões 1 a 4 e 10): as hipóteses do visitante mexem só no voto
// que falta de cada município, por cima da projeção inteira de uma base, inclusive da correção pelo próprio município.
// Não há segunda cópia do modelo: a simulação parte do voto que falta que a `Projecao` dá (`votoQueFalta` e
// `fatiaDoQueFalta`), desloca a fatia e multiplica os válidos, e soma os lugares de novo. A incerteza é a da projeção,
// então a margem não muda e a chance de vitória sai do mesmo desvio. O que já foi totalizado é oficial e não muda.

/**
 * As hipóteses do visitante, sempre em relação à projeção do Apurador: o zero é a projeção. O voto, em pontos de votos
 * válidos para o 1º finalista da base (negativo, para o outro); o comparecimento, em pontos percentuais.
 */
export interface Hipoteses {
  /** Quanto o voto que falta pende além da projeção, no Brasil e em cada região, na ordem de `REGIOES`. A região soma ao Brasil, e o Exterior segue o Brasil. */
  voto: { brasil: number; regioes: readonly number[] };
  /** Quantos pontos percentuais de comparecimento a mais ou a menos do que o modelo espera em cada região, na ordem de `REGIOES`. */
  comparecimento: readonly number[];
}

/** Nenhuma hipótese mexida: a simulação é a projeção. */
export const HIPOTESES_ZERADAS: Hipoteses = Object.freeze({
  voto: Object.freeze({ brasil: 0, regioes: Object.freeze(REGIOES.map(() => 0)) }),
  comparecimento: Object.freeze(REGIOES.map(() => 0)),
});

/** De onde a simulação parte: a projeção de uma base sobre a apuração de agora, com o que ela precisa a mais. */
export interface PartidaDaSimulacao {
  modelo: Modelo;
  apuracao: Apuracao;
  projecao: Projecao;
  constantes: Constantes;
  /**
   * O comparecimento que o modelo supõe em cada região, de 0 a 1, na ordem de `REGIOES`: o do 1º turno. Com ele, +4 pontos
   * percentuais de comparecimento multiplicam os válidos que faltam da região por (comparecimento + 0,04) ÷ comparecimento.
   */
  comparecimentoEsperado: readonly number[];
}

/** O resultado final de uma região, somado das UFs dela. */
export interface ResultadoDaRegiao {
  /** A fatia final do 1º finalista nos válidos dos dois, de 0 a 1. */
  fatia: number;
  validos: number;
}

/** A simulação: o Brasil, cada UF e o Exterior, cada região e o voto que falta de cada município, com as hipóteses. */
export interface Simulacao {
  brasil: ResultadoDoLugar;
  ufs: Record<string, ResultadoDaUf>;
  /** Na ordem de `REGIOES`. */
  regioes: ResultadoDaRegiao[];
  /** Por município, os votos válidos que faltam com o comparecimento da simulação. */
  votoQueFalta: Float64Array;
  /** Por município, a fatia do 1º finalista no voto que falta com o voto da simulação, de 0 a 1. */
  fatiaDoQueFalta: Float64Array;
}

const limitar = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

/** A simulação de uma base, com as hipóteses. */
export function simular(partida: PartidaDaSimulacao, hipoteses: Hipoteses): Simulacao {
  const { modelo, apuracao, projecao, constantes, comparecimentoEsperado } = partida;
  const n = modelo.municipios.length;
  if (apuracao.length !== n) throw new Error(`a apuração tem ${apuracao.length} municípios, e a base, ${n}`);
  const deslocamento = Float64Array.from(modelo.ufs, (_, u) => {
    const r = modelo.regiaoDaUf[u]!;
    return (hipoteses.voto.brasil + (r >= 0 ? hipoteses.voto.regioes[r]! : 0)) / 100;
  });
  const fator = Float64Array.from(modelo.ufs, (_, u) => {
    const r = modelo.regiaoDaUf[u]!;
    return r >= 0 && hipoteses.comparecimento[r] !== 0 ? 1 + hipoteses.comparecimento[r]! / 100 / comparecimentoEsperado[r]! : 1;
  });

  const votoQueFalta = new Float64Array(n);
  const fatiaDoQueFalta = new Float64Array(n);
  const porUf = modelo.ufs.map(semVotos);
  apuracao.forEach((a, m) => {
    const u = modelo.ufDoMunicipio[m]!;
    const falta = projecao.votoQueFalta[m]! * fator[u]!;
    // Sem voto que falta, a fatia fica a da projeção: não há o que deslocar.
    const fatia = projecao.votoQueFalta[m]! > 0 ? limitar(projecao.fatiaDoQueFalta[m]! + deslocamento[u]!, 0, 1) : projecao.fatiaDoQueFalta[m]!;
    votoQueFalta[m] = falta;
    fatiaDoQueFalta[m] = fatia;
    somarVotos(porUf[u]!, {
      votos1: a.votos[0]!,
      votos: a.votos[0]! + a.votos[1]!,
      secoes: a.secoes,
      secoesTotais: a.secoesTotais,
      falta,
      falta1: falta * fatia,
    });
  });

  const brasil = semVotos();
  const regioes = REGIOES.map(semVotos);
  const ufs: Record<string, ResultadoDaUf> = {};
  modelo.ufs.forEach((sigla, u) => {
    const somas = porUf[u]!;
    const projetada = projecao.ufs[sigla]!;
    ufs[sigla] = { ...resultadoComDesvio(somas, projetada.desvio, constantes), referencia: projetada.referencia };
    somarVotos(brasil, somas);
    const r = modelo.regiaoDaUf[u]!;
    if (r >= 0) somarVotos(regioes[r]!, somas);
  });

  return {
    brasil: resultadoComDesvio(brasil, projecao.brasil.desvio, constantes),
    ufs,
    regioes: regioes.map((s) => ({ fatia: fatiaFinal(s), validos: s.votos + s.falta })),
    votoQueFalta,
    fatiaDoQueFalta,
  };
}

/** Quantas vezes a busca de "o que seria preciso" divide o intervalo: de ±100 pontos a menos de 10⁻⁷ ponto. */
const PASSOS_DA_BUSCA = 31;

/**
 * "O que seria preciso" (decisão 10): o valor do controle do Brasil, em pontos para o 1º finalista, com que o resultado
 * final da simulação no Brasil fica em 50%, com as outras hipóteses paradas. Uma busca binária sobre o controle, que pode
 * passar da faixa dele (a página diz então "mais de 5 pontos"). `null` só quando nem todo o voto que falta para um lado
 * leva o Brasil a 50%, como no fim da apuração.
 */
export function oQueSeriaPreciso(partida: PartidaDaSimulacao, hipoteses: Hipoteses): number | null {
  const acima = (brasil: number) => simular(partida, { ...hipoteses, voto: { ...hipoteses.voto, brasil } }).brasil.projecao - 0.5;
  // Com ±100 pontos, todo o voto que falta vai para um lado: o resultado do Brasil cresce com o controle até aí.
  let [baixo, alto] = [-100, 100];
  if (acima(baixo) > 0 || acima(alto) < 0) return null;
  for (let passo = 0; passo < PASSOS_DA_BUSCA; passo++) {
    const meio = (baixo + alto) / 2;
    if (acima(meio) < 0) baixo = meio;
    else alto = meio;
  }
  return (baixo + alto) / 2;
}
