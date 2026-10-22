import {
  antesDaPrimeiraSecao,
  curvaProjetada,
  indicacaoDasPesquisas,
  placarEntreFinalistas,
  prepararModelo,
  projetarNasDuasBases,
  Z_95,
  type Agregado,
  type Apuracao,
  type BaseDoModelo,
  type Constantes,
  type CurvaDoLugar,
  type ResultadoDoLugar,
} from "@apurador/modelo";
import type { AbrangenciaDaDivulgacao, ResultadoDoTse } from "@apurador/tse";
import type { ProjecaoDoLugar, ProjecaoNaBase } from "./arquivos.ts";

// A projeção da noite no coletor (spec, "Rodada", passo 4): a cada rodada com resultado novo, o `modelo` roda nas duas
// bases sobre a apuração de cada município que o coletor guarda, e sai pronta para os JSONs do Brasil, de cada UF e do
// Exterior, nos números como a página os mostra. Antes da primeira seção do Brasil, a apuração é a do 1º turno, nada
// totalizado (`antesDaPrimeiraSecao`), como no painel de antes das 17h: assim a partida a frio, que chega aos poucos,
// não muda a projeção, e cada lugar é gravado uma vez. Depois dela, uma partida a frio espera ter os municípios: os que
// faltam entrariam sem seção nenhuma, e a projeção sairia errada. A base do modelo dá também o 1º turno de cada lugar,
// com que a projeção se compara. O modelo fala do 1º finalista da base; o arquivo, do 1º candidato do arquivo de rodada.

/** O que o coletor precisa para projetar: a base do modelo da noite, as constantes congeladas e o agregado de pesquisas. */
export interface EntradaDaProjecao {
  /** O 1º turno de cada município, com os dois finalistas da noite. */
  base: BaseDoModelo;
  constantes: Constantes;
  /** O agregado de pesquisas congelado da noite, em % do 1º finalista da base. */
  agregado: Pick<Agregado, "valor" | "incerteza">;
}

/** A projeção de uma rodada, pronta para os arquivos. */
export interface ProjecaoDaRodada {
  /** O peso das pesquisas na base com pesquisas, de 0 a 1. */
  pesoDasPesquisas: number;
  /** Se as duas bases já coincidem no Brasil: o evento "as pesquisas deixaram de pesar". */
  coincidemNoBrasil: boolean;
  /** A projeção do Brasil (`BR`), de uma UF ou do Exterior (`ZZ`), com ou sem a base com pesquisas; `undefined` num município. */
  doLugar(id: string, comPesquisas: boolean): ProjecaoDoLugar | undefined;
}

/** A projeção da noite, preparada uma vez: o modelo e o 1º turno de cada lugar. */
export interface ProjecaoDaNoite {
  /**
   * Projeta com o que o coletor guarda de cada município (`resultado`), com os candidatos na ordem do arquivo de rodada
   * (`ordem`, pelos números), ou dá `undefined` enquanto faltam municípios na partida a frio. Falha se os candidatos
   * não forem os finalistas da base.
   */
  projetar(resultado: (abrangencia: AbrangenciaDaDivulgacao) => ResultadoDoTse | undefined, ordem: number[]): ProjecaoDaRodada | undefined;
}

/**
 * A fração dos municípios da base que pode faltar depois da primeira seção: deixa de fora os poucos com um arquivo que o
 * leitor do TSE não aceita, que ficam como antes da primeira seção, sem segurar a projeção a noite toda.
 */
const PODEM_FALTAR = 0.01;

const umaCasa = (n: number) => Math.round(10 * n) / 10;
const inteiro = (n: number | null) => (n === null ? null : Math.round(n));

/** A projeção da noite sobre a base do modelo, as constantes e o agregado. */
export function criarProjecaoDaNoite({ base, constantes, agregado }: EntradaDaProjecao): ProjecaoDaNoite {
  const modelo = prepararModelo(base);
  const [primeiro, segundo] = modelo.finalistas as [number, number];
  const antes = antesDaPrimeiraSecao(base);

  // O placar entre finalistas de cada lugar no 1º turno, em % do 1º finalista da base.
  const votos = new Map<string, [number, number]>();
  for (const m of base.municipios) {
    for (const id of ["BR", m.uf]) {
      const v = votos.get(id) ?? [0, 0];
      v[0] += m.votos[0]!;
      v[1] += m.votos[1]!;
      votos.set(id, v);
    }
  }
  const primeiroTurno = (id: string) => placarEntreFinalistas(...(votos.get(id) ?? [0, 0])) ?? 50;
  const indicacao = (id: string) =>
    indicacaoDasPesquisas({ placarEntreFinalistasDoLugar: primeiroTurno(id), placarEntreFinalistasDoBrasil: primeiroTurno("BR"), agregado: agregado.valor });

  /**
   * A apuração de cada município pelo que o coletor guarda; um município que ele ainda não tem fica como no 1º turno.
   * `undefined` com mais municípios faltando do que podem faltar, depois da primeira seção.
   */
  function apuracao(resultado: (abrangencia: AbrangenciaDaDivulgacao) => ResultadoDoTse | undefined): Apuracao | undefined {
    if (!resultado({})?.secoes.totalizadas) return antes;
    let faltam = 0;
    const a = base.municipios.map((m, i) => {
      const r = resultado({ uf: m.uf, municipio: m.municipio });
      if (!r) {
        faltam++;
        return antes[i]!;
      }
      const doFinalista = (numero: number) => r.candidatos.find((c) => c.numero === numero)?.votos ?? 0;
      return {
        secoes: r.secoes.totalizadas,
        secoesTotais: r.secoes.total,
        aptos: r.eleitorado.totalizado,
        aptosTotais: r.eleitorado.total,
        votos: [doFinalista(primeiro), doFinalista(segundo)],
      };
    });
    return faltam > PODEM_FALTAR * base.municipios.length ? undefined : a;
  }

  return {
    projetar(resultado, ordem) {
      if (ordem.length !== 2 || !ordem.includes(primeiro) || !ordem.includes(segundo)) {
        throw new Error(`os candidatos da noite (${ordem.join(", ")}) não são os finalistas da base do modelo (${primeiro}, ${segundo})`);
      }
      // Uma fatia do 1º finalista da base, de 0 a 1, como % do 1º candidato do arquivo de rodada.
      const doPrimeiro = (fatia: number) => 100 * (ordem[0] === primeiro ? fatia : 1 - fatia);
      const a = apuracao(resultado);
      if (!a) return undefined;
      const duas = projetarNasDuasBases(modelo, a, constantes, agregado);
      const curvas = {
        soApuracao: curvaProjetada(modelo, a, duas.soApuracao, constantes),
        comPesquisas: curvaProjetada(modelo, a, duas.comPesquisas, constantes),
      };

      const naBase = (r: ResultadoDoLugar, curva: CurvaDoLugar): ProjecaoNaBase => ({
        projecao: umaCasa(doPrimeiro(r.projecao)),
        margem: umaCasa(100 * r.margem),
        chance: Math.round(doPrimeiro(r.chance)),
        chanceDeVirada: r.chanceDeVirada === null ? null : Math.round(100 * r.chanceDeVirada),
        sinalDeVirada: r.sinalDeVirada,
        curva: curva.pontos.map((p) => [umaCasa(p.x), umaCasa(doPrimeiro(p.y)), umaCasa(100 * Z_95 * p.desvio)]),
        virada: curva.virada && { x: inteiro(curva.virada.x), cedo: inteiro(curva.virada.cedo), tarde: inteiro(curva.virada.tarde) },
      });

      return {
        pesoDasPesquisas: duas.comPesquisas.pesoDasPesquisas,
        coincidemNoBrasil: duas.coincidem.brasil,
        doLugar(id, comPesquisas) {
          const doBrasil = id === "BR";
          if (!doBrasil && !(id in duas.soApuracao.ufs)) return undefined;
          const naBaseDoLugar = (qual: "soApuracao" | "comPesquisas") =>
            doBrasil ? naBase(duas[qual].brasil, curvas[qual].brasil) : naBase(duas[qual].ufs[id]!, curvas[qual].ufs[id]!);
          const comparacoes = { primeiroTurno: umaCasa(doPrimeiro(primeiroTurno(id) / 100)), pesquisas: umaCasa(doPrimeiro(indicacao(id) / 100)) };
          if (!comPesquisas) return { soApuracao: naBaseDoLugar("soApuracao"), comparacoes };
          const coincidem = doBrasil ? duas.coincidem.brasil : duas.coincidem.ufs[id]!;
          return { soApuracao: naBaseDoLugar("soApuracao"), comPesquisas: naBaseDoLugar("comPesquisas"), coincidem, comparacoes };
        },
      };
    },
  };
}
