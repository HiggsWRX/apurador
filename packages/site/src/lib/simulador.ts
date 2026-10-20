import {
  basesCoincidem,
  curvaProjetada,
  HIPOTESES_ZERADAS,
  oQueSeriaPreciso,
  prepararModelo,
  projetar,
  REGIOES,
  simular,
  type Apuracao,
  type BaseDoModelo,
  type Constantes,
  type CurvaDoLugar,
  type Hipoteses,
  type Modelo,
  type Projecao,
  type ResultadoDoLugar,
} from "@apurador/modelo";
import { descompactarBase, type ArquivoDoSimulador } from "./arquivo-do-simulador";
import type { IdDaBase } from "./bases-da-projecao";

// O simulador "e se" no navegador (Simulador "e se", decisões 4 a 7 e 10): a partir do arquivo que ele baixa ao abrir,
// a projeção do Apurador em cada base, uma vez, e, a cada hipótese, a simulação, a curva dela e "o que seria preciso".
// É o mesmo `modelo` que o build roda na página do Brasil, sobre os mesmos dados: aberto, o simulador mostra ao lado a
// mesma projeção da página. Sem DOM: a ilha (`components/Simulador.tsx`) guarda o estado e desenha.

/** Antes da primeira seção: nada totalizado, com as seções e os eleitores aptos do 1º turno de cada município. */
export const antesDaPrimeiraSecao = (base: BaseDoModelo): Apuracao =>
  base.municipios.map((m) => ({ secoes: 0, secoesTotais: m.secoes, aptos: 0, aptosTotais: m.aptos, votos: [0, 0] }));

/** Uma base da projeção no simulador: a projeção do Apurador, a curva projetada e o resultado de cada região. */
export interface BaseNoSimulador {
  id: IdDaBase;
  projecao: Projecao;
  curva: CurvaDoLugar;
  /** A fatia final projetada do 1º finalista em cada região, na ordem de `REGIOES`. */
  regioes: number[];
}

/** O que o simulador prepara ao abrir, para recalcular a cada hipótese. */
export interface DadosDoSimulador {
  modelo: Modelo;
  apuracao: Apuracao;
  constantes: Constantes;
  /** As bases que vão ao ar, na ordem do controle: só a "Só apuração" quando o arquivo vem sem o agregado. */
  bases: BaseNoSimulador[];
  /** Se as duas bases já coincidem no Brasil, ou `null` com uma só. */
  coincidem: boolean | null;
  placarEntreFinalistasDoBrasil: number;
  /** Na ordem de `REGIOES`: o placar entre finalistas do 1º turno, em % do 1º finalista, e o comparecimento dele, de 0 a 1. */
  regioes: ArquivoDoSimulador["regioes"];
}

/** Prepara o simulador com o arquivo baixado: a base do modelo e a projeção do Apurador em cada base. */
export function prepararSimulador(arquivo: ArquivoDoSimulador): DadosDoSimulador {
  const base = descompactarBase(arquivo.base);
  const modelo = prepararModelo(base);
  const apuracao = antesDaPrimeiraSecao(base);
  const { constantes } = arquivo;
  const comparecimento = arquivo.regioes.map((r) => r.comparecimento);
  const naBase = (id: IdDaBase, projecao: Projecao): BaseNoSimulador => ({
    id,
    projecao,
    curva: curvaProjetada(modelo, apuracao, projecao, constantes).brasil,
    regioes: simular(modelo, apuracao, projecao, constantes, HIPOTESES_ZERADAS, comparecimento).regioes.map((r) => r.projecao),
  });
  const soApuracao = naBase("so-apuracao", projetar(modelo, apuracao, constantes));
  const comPesquisas = arquivo.agregado ? naBase("com-pesquisas", projetar(modelo, apuracao, constantes, arquivo.agregado)) : null;
  return {
    modelo,
    apuracao,
    constantes,
    bases: comPesquisas ? [soApuracao, comPesquisas] : [soApuracao],
    coincidem: comPesquisas ? basesCoincidem(soApuracao.projecao.brasil, comPesquisas.projecao.brasil) : null,
    placarEntreFinalistasDoBrasil: arquivo.placarEntreFinalistasDoBrasil,
    regioes: arquivo.regioes,
  };
}

/** Uma linha da tabela das regiões: a simulação, a projeção do Apurador e o 1º turno, na fatia ou no % do 1º finalista. */
export interface RegiaoNaTela {
  nome: string;
  /** A fatia final simulada do 1º finalista, de 0 a 1. */
  simulada: number;
  /** A fatia final projetada pelo Apurador, de 0 a 1. */
  projetada: number;
  /** O placar entre finalistas do 1º turno, em %. */
  primeiroTurno: number;
}

/** O que a tela do simulador mostra para uma base e as hipóteses. */
export interface TelaDoSimulador {
  /** O Brasil na simulação e na projeção do Apurador, lado a lado. */
  simulada: ResultadoDoLugar;
  projetada: ResultadoDoLugar;
  curvaSimulada: CurvaDoLugar;
  /** A curva projetada do Apurador, que a da simulação desenha por baixo. */
  curvaDoSite: CurvaDoLugar;
  regioes: RegiaoNaTela[];
  /** O valor do controle do Brasil que leva o resultado simulado a 50% (`oQueSeriaPreciso`), ou `null`. */
  preciso: number | null;
  pesoDasPesquisas: number;
}

/** A base que vai ao ar com esse id, ou a primeira, quando ela não vai (o agregado fora do ar). */
export const baseNoSimulador = (dados: DadosDoSimulador, id: IdDaBase) => dados.bases.find((b) => b.id === id) ?? dados.bases[0]!;

/** A simulação de uma base com as hipóteses, como a tela a mostra, ao lado da projeção do Apurador. */
export function simularNaTela(dados: DadosDoSimulador, id: IdDaBase, hipoteses: Hipoteses): TelaDoSimulador {
  const { modelo, apuracao, constantes } = dados;
  const base = baseNoSimulador(dados, id);
  const comparecimento = dados.regioes.map((r) => r.comparecimento);
  const simulacao = simular(modelo, apuracao, base.projecao, constantes, hipoteses, comparecimento);
  return {
    simulada: simulacao.brasil,
    projetada: base.projecao.brasil,
    curvaSimulada: curvaProjetada(modelo, apuracao, simulacao, constantes).brasil,
    curvaDoSite: base.curva,
    regioes: REGIOES.map((nome, r) => ({
      nome,
      simulada: simulacao.regioes[r]!.projecao,
      projetada: base.regioes[r]!,
      primeiroTurno: dados.regioes[r]!.placarEntreFinalistas,
    })),
    preciso: oQueSeriaPreciso(modelo, apuracao, base.projecao, constantes, hipoteses, comparecimento),
    pesoDasPesquisas: base.projecao.pesoDasPesquisas,
  };
}

/** A região de uma UF (a posição em `REGIOES`), ou `null` no Exterior e numa sigla que a base não tem. */
export function regiaoDaUf(dados: Pick<DadosDoSimulador, "modelo">, uf: string): number | null {
  const u = dados.modelo.ufs.indexOf(uf);
  const r = u < 0 ? -1 : dados.modelo.regiaoDaUf[u]!;
  return r < 0 ? null : r;
}
