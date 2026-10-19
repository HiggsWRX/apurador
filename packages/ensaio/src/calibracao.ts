import { apuracaoAntesDaPrimeiraSecao, curvaProjetada, executarNoite, momentosDaNoite, projetar, Z_95, type Agregado, type Constantes, type OrdemDeChegada, type PontoDaCurva, type ResultadoDaNoite } from "@apurador/modelo";
import { dataHoraDoInstante } from "@apurador/pipeline";
import type { NoiteDaCalibracao } from "./noites-da-calibracao.ts";

// A calibração: escolhe as constantes fixas do modelo em três noites passadas, entre candidatos listados antes e pela
// regra escrita antes, em passos (docs/calibracao.md, registrado antes de rodar). Não treina nada: cada passo mede os
// candidatos nas noites e aplica a regra, e a liberação jurídica do modelo depende disso (Ensaio geral, decisão 13).
// As medidas são do Brasil, nas fotografias do executor de noites, que valem pelas "rodadas" da regra (decisão do
// dono, 19/10).

/** O que a regra olha de um candidato numa noite. */
export interface MedidaDaNoite {
  /** A fração dos momentos depois da fotografia de 1% das seções com o resultado final dentro da margem de 95%. */
  cobertura: number;
  /** A maior chance de vitória de quem perdeu a noite, nos momentos depois da fotografia de 5% das seções. */
  maiorChanceDeQuemPerdeu: number;
  /** O maior erro nos momentos de 0,1% a 5% das seções, em pontos percentuais: o que o K decide. */
  maiorErroNoComeco: number;
  /** A média do erro nos momentos de 5% a 50% das seções, em pontos percentuais. */
  erroMedio: number;
  /** A média da margem de 95% nos mesmos momentos, em pontos percentuais. */
  margemMedia: number;
}

const media = (valores: number[]) => valores.reduce((s, v) => s + v, 0) / valores.length;

/**
 * Se o momento é a fotografia de um ponto ou uma posterior. A fotografia alcança o número de seções arredondado e fica
 * até meia seção abaixo do ponto: a de 0,1% de 2022 tem 0,09998%.
 */
const desde = (secoes: number, ponto: number) => secoes >= ponto - 0.001;
/** Se o momento é a fotografia de um ponto ou uma anterior. A fotografia passa do ponto pela chegada que o alcança: a de 50% de 2018 tem 50,0077%. */
const ate = (secoes: number, ponto: number) => secoes <= ponto + 0.05;
/** Se o momento vem depois da fotografia de um ponto: "mais de 1%" deixa de fora a fotografia de 1%. */
const depois = (secoes: number, ponto: number) => !ate(secoes, ponto);

/** As medidas da regra sobre uma noite rodada pelo executor de noites. */
export function medirNoite(noite: ResultadoDaNoite): MedidaDaNoite {
  const vence = noite.final > 0.5;
  const de5a50 = noite.momentos.filter((m) => desde(m.secoes, 5) && ate(m.secoes, 50));
  const depoisDe1 = noite.momentos.filter((m) => depois(m.secoes, 1));
  return {
    // a cobertura do executor conta "mais de 1%" pelo % de seções, e a fotografia de 1% fica acima ou abaixo de 1 conforme a noite
    cobertura: depoisDe1.filter((m) => Math.abs(m.projecao - noite.final) <= Z_95 * m.desvio).length / depoisDe1.length,
    maiorChanceDeQuemPerdeu: Math.max(0, ...noite.momentos.filter((m) => depois(m.secoes, 5)).map((m) => (vence ? 1 - m.chance : m.chance))),
    maiorErroNoComeco: Math.max(0, ...noite.momentos.filter((m) => desde(m.secoes, 0.1) && ate(m.secoes, 5)).map((m) => m.erro)),
    erroMedio: media(de5a50.map((m) => m.erro)),
    margemMedia: media(de5a50.map((m) => 100 * Z_95 * m.desvio)),
  };
}

/** Os limites da regra (Ensaio geral, decisão 15). */
const COBERTURA = 0.95;
const CHANCE_DE_QUEM_PERDEU = 0.95;
/** Dois erros médios a menos disto empatam, em pontos percentuais. */
const EMPATE = 0.05;

/** Um candidato do passo 1, com as medidas nas noites e a média delas. */
export interface CandidatoDoPasso1<C> {
  candidato: C;
  porNoite: MedidaDaNoite[];
  /** A cobertura passa de 95% em cada noite. */
  passaCobertura: boolean;
  /** Quem perdeu nunca passa de 95% de chance, em cada noite. */
  passaChance: boolean;
  /** A média das noites, cada uma com o mesmo peso. */
  erroMedio: number;
  margemMedia: number;
  /** Passa e fica a menos de 0,05 p.p. do menor erro médio: entre os que empatam, fica a margem mais larga. */
  empata: boolean;
}

/**
 * O passo 1 da regra: tira quem não cobre 95% em alguma noite e quem dá mais de 95% a quem perdeu, fica com o menor
 * erro médio e, no empate, com a margem média mais larga. Sem ninguém que passe, não escolhe.
 */
export function escolherConstantesDoModelo<C>(avaliacoes: { candidato: C; porNoite: MedidaDaNoite[] }[]): { candidatos: CandidatoDoPasso1<C>[]; escolhido: C | null } {
  const candidatos: CandidatoDoPasso1<C>[] = avaliacoes.map(({ candidato, porNoite }) => ({
    candidato,
    porNoite,
    passaCobertura: porNoite.every((n) => n.cobertura >= COBERTURA),
    passaChance: porNoite.every((n) => n.maiorChanceDeQuemPerdeu <= CHANCE_DE_QUEM_PERDEU),
    erroMedio: media(porNoite.map((n) => n.erroMedio)),
    margemMedia: media(porNoite.map((n) => n.margemMedia)),
    empata: false,
  }));
  const passam = candidatos.filter((c) => c.passaCobertura && c.passaChance);
  if (passam.length === 0) return { candidatos, escolhido: null };
  const menor = Math.min(...passam.map((c) => c.erroMedio));
  const empatados = passam.filter((c) => c.erroMedio - menor < EMPATE);
  for (const c of empatados) c.empata = true;
  const escolhido = empatados.reduce((a, b) => (b.margemMedia > a.margemMedia ? b : a));
  return { candidatos, escolhido: escolhido.candidato };
}

/**
 * O placar parcial real da noite no Brasil, a fatia do 1º finalista da base, com x% das seções totalizadas: o da
 * primeira chegada que alcança x%, como nas fotografias do executor de noites.
 */
export function placarReal({ modelo, noite }: Pick<NoiteDaCalibracao, "modelo" | "noite">): (x: number) => number {
  const [a, b] = modelo.finalistas.map((numero) => noite.candidatos.findIndex((c) => c.numero === numero)) as [number, number];
  const total = noite.zonas.reduce((s, z) => s + z.secoes, 0);
  const secoes = new Float64Array(noite.chegadas.length);
  const votos1 = new Float64Array(noite.chegadas.length);
  const votos = new Float64Array(noite.chegadas.length);
  let [s, v1, v] = [0, 0, 0];
  noite.chegadas.forEach((c, i) => {
    secoes[i] = s += c.secoes;
    votos1[i] = v1 += c.votos[a]!;
    votos[i] = v += c.votos[a]! + c.votos[b]!;
  });
  return (x) => {
    const alvo = Math.min(s, Math.max(1, Math.round((x / 100) * total)));
    let [baixo, alto] = [0, secoes.length - 1];
    while (baixo < alto) {
      const meio = (baixo + alto) >> 1;
      if (secoes[meio]! >= alvo) alto = meio;
      else baixo = meio + 1;
    }
    return votos1[baixo]! / votos[baixo]!;
  };
}

/**
 * O erro de uma curva projetada contra o placar real: a distância média, em pontos percentuais, entre cada ponto da
 * curva e o placar real com o mesmo % de seções. O primeiro ponto, o placar de agora, fica de fora.
 */
export function erroDaCurva(pontos: PontoDaCurva[], real: (x: number) => number): number {
  return media(pontos.slice(1).map((p) => 100 * Math.abs(p.y - real(p.x))));
}

/** O erro da curva projetada do Brasil numa noite: a média do erro da curva nos momentos de 5% a 50% das seções. */
export function medirOrdem(noite: NoiteDaCalibracao, constantes: Constantes): number {
  const real = placarReal(noite);
  const erros: number[] = [];
  for (const { secoes, apuracao } of momentosDaNoite(noite.modelo, noite.noite)) {
    if (!desde(secoes, 5) || !ate(secoes, 50)) continue;
    const projecao = projetar(noite.modelo, apuracao, constantes);
    erros.push(erroDaCurva(curvaProjetada(noite.modelo, apuracao, projecao, constantes).brasil.pontos, real));
  }
  return media(erros);
}

/**
 * O passo 2 da regra: fica a ordem de chegada de menor erro da curva, na média das noites, salvo se a "mistura" errar
 * menos de 0,05 p.p. a mais que ela.
 */
export function escolherOrdem(avaliacoes: { candidato: OrdemDeChegada; porNoite: number[] }[]): {
  candidatos: { candidato: OrdemDeChegada; porNoite: number[]; erroDaCurva: number }[];
  escolhido: OrdemDeChegada;
} {
  const candidatos = avaliacoes.map(({ candidato, porNoite }) => ({ candidato, porNoite, erroDaCurva: media(porNoite) }));
  const melhor = candidatos.reduce((a, b) => (b.erroDaCurva < a.erroDaCurva ? b : a));
  const mistura = candidatos.find((c) => c.candidato === "mistura");
  return { candidatos, escolhido: mistura && mistura.erroDaCurva - melhor.erroDaCurva < EMPATE ? "mistura" : melhor.candidato };
}

/** Um caso de K: uma noite com um agregado de pesquisas, na base "Apuração + pesquisas". */
export interface CasoDoK {
  /** `2022-2`, ou `2022-2_mais_2_13` com o agregado deslocado 2 pontos para o candidato 13. */
  id: string;
  /** "2º turno de 2022, +2 para LULA". */
  nome: string;
  noite: NoiteDaCalibracao;
  agregado: Pick<Agregado, "valor" | "incerteza">;
}

/**
 * Os cinco casos de K (Ensaio geral, decisão 17): o 2º turno de 2022 com o agregado real e deslocado 2 pontos para cada
 * candidato, um erro do tamanho do de 2018, e as outras noites com o agregado real.
 */
export function casosDoK(noites: NoiteDaCalibracao[]): CasoDoK[] {
  return noites.flatMap((noite): CasoDoK[] => {
    const real = { id: noite.id, nome: noite.nome, noite, agregado: noite.agregado };
    if (noite.id !== "2022-2") return [real];
    // o agregado é a fatia do 1º finalista: +2 para ele, ou −2, que é +2 para o outro
    const deslocado = (finalista: 0 | 1): CasoDoK => ({
      id: `${noite.id}_mais_2_${noite.modelo.finalistas[finalista]}`,
      nome: `${noite.nome}, +2 para ${noite.finalistas[finalista]}`,
      noite,
      agregado: { ...noite.agregado, valor: noite.agregado.valor + (finalista === 0 ? 2 : -2) },
    });
    return [real, deslocado(0), deslocado(1)];
  });
}

/**
 * O passo 3 da regra: fica o K de menor erro no pior caso, o maior dos erros de 0,1% a 5% das seções nos casos, entre
 * os que cobrem 95% em todos os casos. Sem nenhum que cubra, não escolhe.
 */
export function escolherK(avaliacoes: { candidato: number; porCaso: MedidaDaNoite[] }[]): {
  candidatos: { candidato: number; porCaso: MedidaDaNoite[]; piorCaso: number; passaCobertura: boolean }[];
  escolhido: number | null;
} {
  const candidatos = avaliacoes.map(({ candidato, porCaso }) => ({
    candidato,
    porCaso,
    piorCaso: Math.max(...porCaso.map((c) => c.maiorErroNoComeco)),
    passaCobertura: porCaso.every((c) => c.cobertura >= COBERTURA),
  }));
  const passam = candidatos.filter((c) => c.passaCobertura);
  return { candidatos, escolhido: passam.length === 0 ? null : passam.reduce((a, b) => (b.piorCaso < a.piorCaso ? b : a)).candidato };
}

/** Um lugar num momento da noite, no que o teste do sinal de virada olha. */
export interface LugarNoMomento {
  /** O % de seções totalizadas do lugar. */
  secoes: number;
  /** O placar parcial, a fatia do 1º finalista, ou `null` sem votos apurados. */
  placar: number | null;
  chanceDeVirada: number | null;
}

/** Desde que % das seções do lugar uma troca de liderança conta como virada, como na narração (Narração da noite, ticket 14 do mapa). */
const VIRADA_DESDE = 3;
/** A fração dos momentos "sem sinal de virada" de municípios que pode ser seguida de virada (Ensaio geral, decisão 18). */
const SEGUIDOS_NOS_MUNICIPIOS = 0.05;

/**
 * Os momentos "sem sinal de virada" de um lugar com o limite dado, e quantos deles são seguidos de virada: em algum
 * momento seguinte, com pelo menos 3% das seções do lugar, quem lidera é outro, mesmo que a troca se desfaça depois.
 * Um momento sem seções, com o lugar terminado, com empate ou sem chance de virada não é "sem sinal de virada".
 */
export function semSinalSeguidoDeVirada(serie: LugarNoMomento[], limite: number): { semSinal: number; seguidosDeVirada: number } {
  const lider = ({ placar }: LugarNoMomento) => (placar === null || placar === 0.5 ? null : placar > 0.5 ? 0 : 1);
  // de trás para a frente, quem lidera em algum momento seguinte com 3% das seções do lugar
  const lideraDepois = [false, false];
  let semSinal = 0;
  let seguidosDeVirada = 0;
  for (let i = serie.length - 1; i >= 0; i--) {
    const m = serie[i]!;
    const l = lider(m);
    if (l === null) continue;
    if (m.secoes > 0 && m.secoes < 100 && m.chanceDeVirada !== null && m.chanceDeVirada < limite) {
      semSinal++;
      if (lideraDepois[1 - l]) seguidosDeVirada++;
    }
    if (m.secoes >= VIRADA_DESDE) lideraDepois[l] = true;
  }
  return { semSinal, seguidosDeVirada };
}

/** Uma execução de uma noite numa base da projeção: sem o agregado, a "Só apuração". */
export interface Execucao {
  /** `so_apuracao`, `com_pesquisas` ou, com o agregado deslocado, `com_pesquisas_mais_2_13`. */
  base: string;
  /** "2º turno de 2022, Só apuração". */
  nome: string;
  noite: NoiteDaCalibracao;
  agregado?: Pick<Agregado, "valor" | "incerteza">;
}

/** As oito execuções do sinal de virada: as três noites nas duas bases, mais 2022 com o agregado deslocado para cada lado. */
export function execucoesDoSinal(noites: NoiteDaCalibracao[]): Execucao[] {
  return [
    ...noites.map((noite) => ({ base: "so_apuracao", nome: `${noite.nome}, Só apuração`, noite })),
    ...casosDoK(noites).map(({ id, nome, noite, agregado }) => ({ base: `com_pesquisas${id.slice(noite.id.length)}`, nome: `${nome}, Apuração + pesquisas`, noite, agregado })),
  ];
}

/** O sinal de virada numa execução com um limite: no Brasil, nas UFs e no Exterior, somados, e nos municípios. */
export interface MedidaDoSinal {
  /** `lugares` são os que têm algum momento "sem sinal de virada" seguido de virada. */
  deCima: { semSinal: number; seguidosDeVirada: number; lugares: string[] };
  municipios: { semSinal: number; seguidosDeVirada: number };
}

/** Roda a execução momento a momento e mede o sinal de virada em cada lugar, com cada limite. */
export function medirSinal({ noite, agregado }: Execucao, constantes: Constantes, limites: number[]): MedidaDoSinal[] {
  const { modelo } = noite;
  const deCima = new Map<string, LugarNoMomento[]>([["Brasil", []], ...modelo.ufs.map((uf): [string, LugarNoMomento[]] => [uf, []])]);
  const municipios = modelo.municipios.map((): LugarNoMomento[] => []);
  const lugar = ({ secoes, placar, chanceDeVirada }: LugarNoMomento) => ({ secoes, placar, chanceDeVirada });
  for (const { apuracao } of momentosDaNoite(modelo, noite.noite)) {
    const projecao = projetar(modelo, apuracao, constantes, agregado);
    deCima.get("Brasil")!.push(lugar(projecao.brasil));
    for (const uf of modelo.ufs) deCima.get(uf)!.push(lugar(projecao.ufs[uf]!));
    projecao.municipios.forEach((m, i) => municipios[i]!.push(lugar(m)));
  }
  return limites.map((limite) => {
    const medida: MedidaDoSinal = { deCima: { semSinal: 0, seguidosDeVirada: 0, lugares: [] }, municipios: { semSinal: 0, seguidosDeVirada: 0 } };
    for (const [nome, serie] of deCima) {
      const { semSinal, seguidosDeVirada } = semSinalSeguidoDeVirada(serie, limite);
      medida.deCima.semSinal += semSinal;
      medida.deCima.seguidosDeVirada += seguidosDeVirada;
      if (seguidosDeVirada > 0) medida.deCima.lugares.push(nome);
    }
    for (const serie of municipios) {
      const { semSinal, seguidosDeVirada } = semSinalSeguidoDeVirada(serie, limite);
      medida.municipios.semSinal += semSinal;
      medida.municipios.seguidosDeVirada += seguidosDeVirada;
    }
    return medida;
  });
}

/**
 * O passo 4 da regra: fica o primeiro limite, na ordem dada, em que, em todas as execuções, nenhum momento "sem sinal
 * de virada" do Brasil, das UFs e do Exterior é seguido de virada, e no máximo 5% dos dos municípios.
 */
export function escolherLimite(avaliacoes: { candidato: number; porExecucao: MedidaDoSinal[] }[]): {
  candidatos: { candidato: number; porExecucao: MedidaDoSinal[]; passa: boolean }[];
  escolhido: number | null;
} {
  const candidatos = avaliacoes.map(({ candidato, porExecucao }) => ({
    candidato,
    porExecucao,
    passa: porExecucao.every((e) => e.deCima.seguidosDeVirada === 0 && e.municipios.seguidosDeVirada <= SEGUIDOS_NOS_MUNICIPIOS * e.municipios.semSinal),
  }));
  return { candidatos, escolhido: candidatos.find((c) => c.passa)?.candidato ?? null };
}

/** Um momento da noite nas bases da projeção, para a metodologia. As fatias são do 1º finalista da base. */
export interface LinhaMomentoAMomento {
  /** `AAAA-MM-DD HH:MM:SS`, em Brasília, ou `null` antes da primeira seção. */
  hora: string | null;
  /** O % de seções totalizadas no Brasil. */
  secoes: number;
  placar: number | null;
  /** Na ordem de `bases`. A margem de 95% e a chance de vitória são do 1º finalista, como a projeção. */
  bases: { pesoDasPesquisas: number; projecao: number; margem: number; chance: number }[];
}

/**
 * A noite momento a momento, nas duas bases e, em 2022, com o agregado deslocado (Página de metodologia, decisões 3
 * e 6): antes da primeira seção e em cada fotografia do executor de noites, até o fim.
 */
export function noiteMomentoAMomento(noite: NoiteDaCalibracao, constantes: Constantes): { bases: string[]; linhas: LinhaMomentoAMomento[] } {
  const execucoes = execucoesDoSinal([noite]);
  const antes = apuracaoAntesDaPrimeiraSecao(noite.modelo, noite.noite);
  const porBase = execucoes.map(({ agregado }) => ({ antes: projetar(noite.modelo, antes, constantes, agregado), noite: executarNoite(noite.modelo, noite.noite, constantes, { agregado }) }));
  const base = (pesoDasPesquisas: number, { projecao, desvio, chance }: { projecao: number; desvio: number; chance: number }) => ({ pesoDasPesquisas, projecao, margem: Z_95 * desvio, chance });
  return {
    bases: execucoes.map((e) => e.base),
    linhas: [
      { hora: null, secoes: 0, placar: null, bases: porBase.map(({ antes }) => base(antes.pesoDasPesquisas, antes.brasil)) },
      ...porBase[0]!.noite.momentos.map((m, i) => ({
        hora: dataHoraDoInstante(noite.noite, m.instante),
        secoes: m.secoes,
        placar: m.placar,
        bases: porBase.map(({ noite }) => base(noite.momentos[i]!.pesoDasPesquisas, noite.momentos[i]!)),
      })),
    ],
  };
}

/** Os candidatos de cada constante, escritos antes de rodar (docs/calibracao.md, "Candidatos"). */
export const CANDIDATOS = {
  incertezaRegional: [0.5, 1, 1.5, 2],
  incertezaNacional: [0.5, 1, 1.5, 2],
  pesoDoMunicipio: [1000, 3000, 10000],
  ordemDeChegada: ["mistura", "primeiro-turno", "ritmo-da-noite"] as OrdemDeChegada[],
  secoesDasPesquisas: [0.25, 0.5, 1, 2],
  /** Na ordem em que são postos à prova. */
  semSinalDeVirada: [0.05, 0.02, 0.01],
};

/** Um candidato do passo 1. */
export type IncertezasEPeso = Pick<Constantes, "incertezaRegional" | "incertezaNacional" | "pesoDoMunicipio">;

/** A calibração inteira: o que cada passo mediu e escolheu, e as constantes que saem dela. */
export interface Calibracao {
  /** As noites, na ordem das medidas por noite. */
  noites: { id: string; nome: string }[];
  passo1: ReturnType<typeof escolherConstantesDoModelo<IncertezasEPeso>>;
  passo2: ReturnType<typeof escolherOrdem>;
  /** Os casos, na ordem das medidas por caso. */
  casosDoK: { id: string; nome: string }[];
  passo3: ReturnType<typeof escolherK>;
  /** As execuções, na ordem das medidas por execução. */
  execucoes: { nome: string }[];
  passo4: ReturnType<typeof escolherLimite>;
  /** Na ordem das noites. */
  passo5: ReturnType<typeof escolherZona>;
  /**
   * As constantes escolhidas. Num passo que não escolheu, os passos seguintes seguem com o valor provisório, para o
   * registro ter os números, e o passo entra em `semEscolha`, para o dono decidir.
   */
  constantes: Constantes;
  semEscolha: string[];
}

/** Roda os cinco passos da regra nas noites, na ordem, cada um com as constantes dos anteriores. `aviso` recebe o andamento. */
export function calibrar(noites: NoiteDaCalibracao[], provisorias: Constantes, aviso: (texto: string) => void = () => {}): Calibracao {
  const semEscolha: string[] = [];

  aviso(`passo 1: ${CANDIDATOS.incertezaRegional.length * CANDIDATOS.incertezaNacional.length * CANDIDATOS.pesoDoMunicipio.length} candidatos nas ${noites.length} noites`);
  const candidatos1 = CANDIDATOS.incertezaRegional.flatMap((incertezaRegional) =>
    CANDIDATOS.incertezaNacional.flatMap((incertezaNacional) => CANDIDATOS.pesoDoMunicipio.map((pesoDoMunicipio): IncertezasEPeso => ({ incertezaRegional, incertezaNacional, pesoDoMunicipio }))),
  );
  const passo1 = escolherConstantesDoModelo(
    candidatos1.map((candidato) => ({ candidato, porNoite: noites.map((n) => medirNoite(executarNoite(n.modelo, n.noite, { ...provisorias, ...candidato }))) })),
  );
  if (!passo1.escolhido) semEscolha.push("passo 1: incertezas e peso do próprio município");
  const constantes1 = { ...provisorias, ...(passo1.escolhido ?? {}) };

  aviso("passo 2: ordem de chegada");
  const passo2 = escolherOrdem(CANDIDATOS.ordemDeChegada.map((ordemDeChegada) => ({ candidato: ordemDeChegada, porNoite: noites.map((n) => medirOrdem(n, { ...constantes1, ordemDeChegada })) })));
  const constantes2 = { ...constantes1, ordemDeChegada: passo2.escolhido };

  aviso("passo 3: K");
  const casos = casosDoK(noites);
  const passo3 = escolherK(
    CANDIDATOS.secoesDasPesquisas.map((secoesDasPesquisas) => ({
      candidato: secoesDasPesquisas,
      porCaso: casos.map(({ noite, agregado }) => medirNoite(executarNoite(noite.modelo, noite.noite, { ...constantes2, secoesDasPesquisas }, { agregado }))),
    })),
  );
  if (passo3.escolhido === null) semEscolha.push("passo 3: K");
  const constantes3 = { ...constantes2, secoesDasPesquisas: passo3.escolhido ?? provisorias.secoesDasPesquisas };

  aviso("passo 4: sinal de virada");
  const execucoes = execucoesDoSinal(noites);
  const porExecucao = execucoes.map((e) => medirSinal(e, constantes3, CANDIDATOS.semSinalDeVirada));
  const passo4 = escolherLimite(CANDIDATOS.semSinalDeVirada.map((candidato, i) => ({ candidato, porExecucao: porExecucao.map((limites) => limites[i]!) })));
  if (passo4.escolhido === null) semEscolha.push("passo 4: limite de 'sem sinal de virada'");
  const constantes4 = { ...constantes3, sinalDeVirada: { ...constantes3.sinalDeVirada, possivel: passo4.escolhido ?? provisorias.sinalDeVirada.possivel } };

  aviso("passo 5: zona");
  const passo5 = escolherZona(
    noites.map((n) => ({ municipio: medirNoite(executarNoite(n.modelo, n.noite, constantes3)), zona: medirNoite(executarNoite(n.modeloPorZona, n.noite, constantes3)) })),
  );
  const constantes = { ...constantes4, zona: passo5.escolhido };

  return {
    noites: noites.map(({ id, nome }) => ({ id, nome })),
    passo1,
    passo2,
    casosDoK: casos.map(({ id, nome }) => ({ id, nome })),
    passo3,
    execucoes: execucoes.map(({ nome }) => ({ nome })),
    passo4,
    passo5,
    constantes,
    semEscolha,
  };
}

/** A redução mínima do erro médio para a zona entrar, em pontos percentuais (Ensaio geral, decisão 16). */
const GANHO_DA_ZONA = 0.05;

/**
 * O passo 5 da regra: a zona entra só se, em cada noite, reduzir o erro médio em pelo menos 0,05 p.p. sem baixar a
 * cobertura, na base "Só apuração".
 */
export function escolherZona(porNoite: { municipio: MedidaDaNoite; zona: MedidaDaNoite }[]): {
  porNoite: { municipio: MedidaDaNoite; zona: MedidaDaNoite; reducao: number; passa: boolean }[];
  escolhido: boolean;
} {
  const noites = porNoite.map(({ municipio, zona }) => {
    const reducao = municipio.erroMedio - zona.erroMedio;
    return { municipio, zona, reducao, passa: reducao >= GANHO_DA_ZONA && zona.cobertura >= municipio.cobertura };
  });
  return { porNoite: noites, escolhido: noites.every((n) => n.passa) };
}
