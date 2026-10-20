import { REGIOES, type Hipoteses } from "@apurador/modelo";
import { formatarCalculo, formatarPontos, umaCasa } from "./formato";
import type { Cor } from "./identidade";
import { BASES_DA_PROJECAO, type IdDaBase } from "./bases-da-projecao";
import { semAcentos } from "./texto";

// As hipóteses do simulador "e se" como a tela as escreve e o link as guarda (Simulador "e se", decisões 2, 3, 9, 10 e
// 11). O voto vai em pontos para o 1º finalista da base do modelo, como no `modelo`, e a tela o escreve pelo nome curto
// de quem ganha ("Lula +2"). Sem DOM e sem dados do build: a ilha do simulador usa isto no navegador.

/** Um finalista como o simulador o mostra: o nome de urna nos números, o nome curto nas hipóteses, e a cor. */
export interface FinalistaDoSimulador {
  nomeUrna: string;
  nomeCurto: string;
  cor: Cor;
}

/** Os dois finalistas na ordem da base do modelo: as fatias e as hipóteses são do primeiro. */
export type FinalistasDoSimulador = readonly [FinalistaDoSimulador, FinalistaDoSimulador];

/** A faixa e o passo de um controle. */
export interface Faixa {
  min: number;
  max: number;
  passo: number;
}

/** As faixas dos controles (decisão 3): o voto no Brasil, mais de três vezes a incerteza das pesquisas, e em cada região, e o comparecimento. */
export const FAIXAS: { brasil: Faixa; regiao: Faixa; comparecimento: Faixa } = {
  brasil: { min: -5, max: 5, passo: 0.5 },
  regiao: { min: -10, max: 10, passo: 0.5 },
  comparecimento: { min: -10, max: 10, passo: 1 },
};

/**
 * O voto das hipóteses prontas, em pontos, como na decisão 9: os 1,4 ponto em que as pesquisas finais do 1º turno
 * subestimaram Flávio, a metade dos 2,8 na margem das 8 pesquisas de 1 a 3/10. A metodologia cita 2,1, pela regra do
 * agregado sobre 12 pesquisas (ticket 05): qual dos dois vale aqui é pergunta ao dono, no ticket 24.
 */
export const VOTO_DAS_HIPOTESES_PRONTAS = 1.4;

const ATE_UMA_CASA = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Quem ganha com um número de pontos para o 1º finalista: o 1º, se for positivo; o 2º, se negativo. */
const quemGanha = (pontos: number, finalistas: FinalistasDoSimulador) => finalistas[pontos > 0 ? 0 : 1];

/** O voto de uma hipótese como a tela o escreve: "Lula +2", "Flávio +1,4", ou "Como na projeção" no zero. */
export function rotuloDoVoto(pontos: number, finalistas: FinalistasDoSimulador): string {
  if (umaCasa(pontos) === 0) return "Como na projeção";
  return `${quemGanha(pontos, finalistas).nomeCurto} +${ATE_UMA_CASA.format(Math.abs(pontos))}`;
}

/** O comparecimento de uma hipótese: "+3 pontos percentuais", "−1 ponto percentual", ou "Como o modelo espera" no zero. */
export function rotuloDoComparecimento(pontos: number): string {
  if (pontos === 0) return "Como o modelo espera";
  return `${pontos > 0 ? "+" : "−"}${Math.abs(pontos)} ${Math.abs(pontos) === 1 ? "ponto percentual" : "pontos percentuais"}`;
}

/**
 * A hipótese de um lugar em relação ao 1º turno (decisão 2): o resultado final simulado (a fatia do 1º finalista) contra o
 * placar entre finalistas do 1º turno (em % do 1º finalista), nos números como a página os mostra, com uma casa.
 * `onde` vem com a preposição: "no Nordeste".
 */
export function traducao(simulada: number, primeiroTurno: number, onde: string, finalistas: FinalistasDoSimulador): string {
  const diferenca = umaCasa(umaCasa(100 * simulada) - umaCasa(primeiroTurno));
  if (diferenca === 0) return `isso fica igual ao 1º turno ${onde}`;
  return `isso dá ${quemGanha(diferenca, finalistas).nomeCurto} +${formatarCalculo(Math.abs(diferenca))} sobre o 1º turno ${onde}`;
}

/** A frase de "o que seria preciso" e o valor que "Aplicar" põe no controle do Brasil, ou `null` sem botão. */
export interface FraseDoQueSeriaPreciso {
  texto: string;
  aplicar: number | null;
}

/**
 * "O que seria preciso" (decisão 10), para quem está atrás no resultado final simulado do Brasil: o valor do controle do
 * Brasil que o leva a 50% (`preciso`, do `oQueSeriaPreciso` do `modelo`). Fora da faixa do controle, ou quando nem o
 * voto que falta todo bastaria, "mais de 5 pontos", nunca "impossível": o voto que falta também é estimado, e só o TSE
 * indica eleição matematicamente definida.
 */
export function fraseDoQueSeriaPreciso(simulada: number, preciso: number | null, finalistas: FinalistasDoSimulador): FraseDoQueSeriaPreciso {
  // Empatados como a página mostra, com uma casa, ninguém está atrás.
  if (umaCasa(100 * simulada) === 50) return { texto: "Na simulação, os dois terminam empatados.", aplicar: null };
  const atras = simulada < 0.5 ? 0 : 1;
  const nome = finalistas[atras].nomeCurto;
  const { max } = FAIXAS.brasil;
  if (preciso === null || Math.abs(preciso) > max)
    return { texto: `Para ${nome} passar à frente, o voto que falta precisaria pender mais de ${max} pontos para ele no país.`, aplicar: null };
  // Em pontos para quem está atrás: negativo quando ele passaria à frente mesmo com o Brasil pendendo para o outro.
  const paraQuemEstaAtras = atras === 0 ? preciso : -preciso;
  const texto =
    paraQuemEstaAtras >= 0
      ? `Para ${nome} passar à frente, o voto que falta precisaria pender mais ${formatarPontos(paraQuemEstaAtras)} para ele no país.`
      : `Para ${nome} passar à frente, o voto que falta no país precisaria pender menos de ${formatarPontos(-paraQuemEstaAtras)} para ${finalistas[1 - atras]!.nomeCurto}.`;
  return { texto, aplicar: preciso };
}

/** Uma hipótese pronta: o texto do botão e as hipóteses que ele põe. */
export interface HipotesePronta {
  rotulo: string;
  hipoteses: Hipoteses;
}

const soNoBrasil = (brasil: number): Hipoteses => ({ voto: { brasil, regioes: REGIOES.map(() => 0) }, comparecimento: REGIOES.map(() => 0) });

/**
 * O par simétrico de hipóteses prontas (decisão 9), em ordem alfabética, só antes da apuração e só na base Apuração +
 * pesquisas: o 1º finalista é o que as pesquisas subestimaram no 1º turno.
 */
export function hipotesesProntas(finalistas: FinalistasDoSimulador): HipotesePronta[] {
  return [
    { rotulo: `As pesquisas subestimam ${finalistas[0].nomeCurto} como no 1º turno`, hipoteses: soNoBrasil(VOTO_DAS_HIPOTESES_PRONTAS) },
    { rotulo: `As pesquisas subestimam ${finalistas[1].nomeCurto} na mesma medida`, hipoteses: soNoBrasil(-VOTO_DAS_HIPOTESES_PRONTAS) },
  ].sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}

/** Se alguma hipótese foi mexida: sem nenhuma, a simulação é a projeção. */
export const mexidas = (h: Hipoteses) => h.voto.brasil !== 0 || h.voto.regioes.some((v) => v !== 0) || h.comparecimento.some((v) => v !== 0);

/** Cada região como o link a escreve: "norte", "centro-oeste". */
const REGIOES_NO_LINK = REGIOES.map((r) => semAcentos(r));

/** O voto no link: o nome curto de quem ganha, sem acento, e os pontos, até duas casas ("lula2", "flavio1.4"). */
const votoNoLink = (pontos: number, finalistas: FinalistasDoSimulador) =>
  `${semAcentos(quemGanha(pontos, finalistas).nomeCurto)}${Number(Math.abs(pontos).toFixed(2))}`;

/**
 * O endereço de uma simulação, a partir de "?" (decisão 11): só a base e as hipóteses mexidas, sem dado pessoal, para
 * quem abrir recalcular com os dados do momento.
 */
export function enderecoDaSimulacao(base: IdDaBase, h: Hipoteses, finalistas: FinalistasDoSimulador): string {
  const partes: [string, string][] = [["base", base]];
  if (h.voto.brasil !== 0) partes.push(["brasil", votoNoLink(h.voto.brasil, finalistas)]);
  h.voto.regioes.forEach((v, r) => v !== 0 && partes.push([REGIOES_NO_LINK[r]!, votoNoLink(v, finalistas)]));
  h.comparecimento.forEach((v, r) => v !== 0 && partes.push([`comparecimento-${REGIOES_NO_LINK[r]}`, String(v)]));
  return `?${partes.map(([k, v]) => `${k}=${v}`).join("&")}`;
}

/** O que o endereço do simulador traz: a base, as hipóteses e, aberto de uma UF ou de um município, a UF. */
export interface EnderecoLido {
  base: IdDaBase | null;
  hipoteses: Hipoteses;
  /** A sigla da UF de onde o simulador foi aberto, para expandir a região dela. */
  de: string | null;
}

const naFaixa = (v: number, f: Faixa) => Math.min(f.max, Math.max(f.min, v));

/** Lê o endereço de uma simulação ou do link da caixa da projeção, ignorando o que não reconhece e pondo cada hipótese na faixa do controle dela. */
export function lerEndereco(busca: string, finalistas: FinalistasDoSimulador): EnderecoLido {
  const p = new URLSearchParams(busca);
  const nomes = finalistas.map((f) => semAcentos(f.nomeCurto));
  const voto = (valor: string | null, faixa: Faixa) => {
    const m = valor === null ? null : /^([a-z]+)(\d+(?:\.\d+)?)$/.exec(valor);
    const quem = m ? nomes.indexOf(m[1]!) : -1;
    // `|| 0` tira o −0 de "lula0"
    return quem < 0 ? 0 : naFaixa((quem === 0 ? 1 : -1) * Number(m![2]), faixa) || 0;
  };
  const comparecimento = (valor: string | null) => (valor !== null && /^-?\d+$/.test(valor) ? naFaixa(Number(valor), FAIXAS.comparecimento) : 0);
  const base = p.get("base");
  const de = p.get("de");
  return {
    base: BASES_DA_PROJECAO.find((b) => b === base) ?? null,
    hipoteses: {
      voto: { brasil: voto(p.get("brasil"), FAIXAS.brasil), regioes: REGIOES_NO_LINK.map((r) => voto(p.get(r), FAIXAS.regiao)) },
      comparecimento: REGIOES_NO_LINK.map((r) => comparecimento(p.get(`comparecimento-${r}`))),
    },
    de: de && /^[a-z]{2}$/i.test(de) ? de.toUpperCase() : null,
  };
}
