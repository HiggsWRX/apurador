import {
  antesDaPrimeiraSecao,
  basesCoincidem,
  curvaProjetada,
  HIPOTESES_ZERADAS,
  oQueSeriaPreciso,
  prepararModelo,
  projetar,
  REGIOES,
  simular,
  type CurvaDoLugar,
  type Hipoteses,
  type Modelo,
  type PartidaDaSimulacao,
  type ResultadoDoLugar,
} from "@apurador/modelo";
import { descompactarBase, type ArquivoDoSimulador } from "./arquivo-do-simulador";
import type { IdDaBase } from "./bases-da-projecao";

// O simulador "e se" no navegador (Simulador "e se", decisões 4 a 7 e 10): a partir do arquivo que ele baixa ao abrir,
// a projeção do Apurador em cada base, uma vez, e, a cada hipótese, a simulação, a curva dela e "o que seria preciso".
// É o mesmo `modelo` que o build roda na página do Brasil, sobre os mesmos dados: aberto, o simulador mostra ao lado a
// mesma projeção da página. Sem DOM: a ilha (`components/Simulador.tsx`) guarda o estado e desenha.

/** Uma base da projeção no simulador: de onde a simulação parte, a curva projetada e o resultado de cada região. */
export interface BaseNoSimulador {
  id: IdDaBase;
  /** A projeção do Apurador nesta base, com o que a simulação precisa a mais. */
  partida: PartidaDaSimulacao;
  curva: CurvaDoLugar;
  /** A fatia final projetada do 1º finalista em cada região, de 0 a 1, na ordem de `REGIOES`. */
  regioes: number[];
}

/** O que o simulador prepara ao abrir, para recalcular a cada hipótese. */
export interface DadosDoSimulador {
  modelo: Modelo;
  /** As bases que vão ao ar, na ordem do controle: só a "Só apuração" quando o arquivo vem sem o agregado. */
  bases: BaseNoSimulador[];
  /** Se as duas bases já coincidem no Brasil, ou `null` com uma só. */
  coincidem: boolean | null;
  /** Em % do 1º finalista. */
  placarEntreFinalistasDoBrasil: number;
  /** Na ordem de `REGIOES`: o placar entre finalistas do 1º turno, em % do 1º finalista, e o comparecimento dele, de 0 a 1. */
  regioes: ArquivoDoSimulador["regioes"];
}

/** Prepara o simulador com o arquivo baixado: a base do modelo e a projeção do Apurador em cada base. */
export function prepararSimulador(arquivo: ArquivoDoSimulador): DadosDoSimulador {
  const baseDoModelo = descompactarBase(arquivo.base);
  const modelo = prepararModelo(baseDoModelo);
  const apuracao = antesDaPrimeiraSecao(baseDoModelo);
  const { constantes } = arquivo;
  const comparecimentoEsperado = arquivo.regioes.map((r) => r.comparecimento);
  const naBase = (id: IdDaBase, agregado?: ArquivoDoSimulador["agregado"]): BaseNoSimulador => {
    const projecao = agregado ? projetar(modelo, apuracao, constantes, agregado) : projetar(modelo, apuracao, constantes);
    const partida = { modelo, apuracao, projecao, constantes, comparecimentoEsperado };
    return {
      id,
      partida,
      curva: curvaProjetada(modelo, apuracao, projecao, constantes).brasil,
      regioes: simular(partida, HIPOTESES_ZERADAS).regioes.map((r) => r.fatia),
    };
  };
  const soApuracao = naBase("so-apuracao");
  const comPesquisas = arquivo.agregado ? naBase("com-pesquisas", arquivo.agregado) : null;
  return {
    modelo,
    bases: comPesquisas ? [soApuracao, comPesquisas] : [soApuracao],
    coincidem: comPesquisas ? basesCoincidem(soApuracao.partida.projecao.brasil, comPesquisas.partida.projecao.brasil) : null,
    placarEntreFinalistasDoBrasil: arquivo.placarEntreFinalistasDoBrasil,
    regioes: arquivo.regioes,
  };
}

/** Uma linha da tabela das regiões: a simulação e a projeção do Apurador, de 0 a 1, e o 1º turno, em %, do 1º finalista. */
export interface RegiaoNaTela {
  nome: string;
  naSimulacao: number;
  naProjecao: number;
  /** O placar entre finalistas do 1º turno, em %. */
  primeiroTurno: number;
}

/** O que a tela do simulador mostra para uma base e as hipóteses. */
export interface TelaDoSimulador {
  /** O Brasil na simulação e na projeção do Apurador, lado a lado. */
  brasilNaSimulacao: ResultadoDoLugar;
  brasilNaProjecao: ResultadoDoLugar;
  curvaDaSimulacao: CurvaDoLugar;
  /** A curva projetada do Apurador, que a da simulação desenha por cima. */
  curvaDoSite: CurvaDoLugar;
  regioes: RegiaoNaTela[];
  /** O valor do controle do Brasil que leva o resultado simulado a 50% (`oQueSeriaPreciso`), ou `null`. */
  preciso: number | null;
}

/** A base que vai ao ar com esse id, ou a primeira, quando ela não vai (o agregado fora do ar). */
export const baseNoSimulador = (dados: DadosDoSimulador, id: IdDaBase) => dados.bases.find((b) => b.id === id) ?? dados.bases[0]!;

/** A simulação de uma base com as hipóteses, como a tela a mostra, ao lado da projeção do Apurador. */
export function simularNaTela(dados: DadosDoSimulador, id: IdDaBase, hipoteses: Hipoteses): TelaDoSimulador {
  const escolhida = baseNoSimulador(dados, id);
  const { partida } = escolhida;
  const simulacao = simular(partida, hipoteses);
  return {
    brasilNaSimulacao: simulacao.brasil,
    brasilNaProjecao: partida.projecao.brasil,
    curvaDaSimulacao: curvaProjetada(partida.modelo, partida.apuracao, simulacao, partida.constantes).brasil,
    curvaDoSite: escolhida.curva,
    regioes: REGIOES.map((nome, r) => ({
      nome,
      naSimulacao: simulacao.regioes[r]!.fatia,
      naProjecao: escolhida.regioes[r]!,
      primeiroTurno: dados.regioes[r]!.placarEntreFinalistas,
    })),
    preciso: oQueSeriaPreciso(partida, hipoteses),
  };
}

/** A região de uma UF (a posição em `REGIOES`), ou `null` no Exterior e numa sigla que a base não tem. */
export function regiaoDaUf(dados: Pick<DadosDoSimulador, "modelo">, uf: string): number | null {
  const u = dados.modelo.ufs.indexOf(uf);
  const r = u < 0 ? -1 : dados.modelo.regiaoDaUf[u]!;
  return r < 0 ? null : r;
}
