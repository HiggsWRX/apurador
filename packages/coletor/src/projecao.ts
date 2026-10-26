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
  type Projecao,
  type ResultadoDoLugar,
} from "@apurador/modelo";
import { assinaturaDosLugares, idDoMunicipio } from "@apurador/pipeline";
import type { AbrangenciaDaDivulgacao, ResultadoDoTse } from "@apurador/tse";
import type {
  ApuracaoEmColunas,
  BaseDaProjecao,
  ColunasDaBase,
  MunicipiosDaTabela,
  NumerosDaProjecao,
  ProjecaoDoLugar,
  ProjecaoNaBase,
  ProjecoesDosMunicipios,
} from "./arquivos.ts";

// A projeção da noite no coletor (spec, "Rodada", passo 4): a cada rodada com resultado novo, o `modelo` roda nas duas
// bases sobre a apuração de cada município que o coletor guarda, e sai pronta para os JSONs do Brasil, de cada UF e do
// Exterior e para as tabelas de projeções dos municípios, nos números como a página os mostra. Antes da primeira seção
// do Brasil, a apuração é a do 1º turno, nada totalizado (`antesDaPrimeiraSecao`), como no painel de antes das 17h:
// assim a partida a frio, que chega aos poucos, não muda a projeção, e cada lugar é gravado uma vez. Depois dela, uma
// partida a frio espera ter os municípios: os que faltam entrariam sem seção nenhuma, e a projeção sairia errada. A base
// do modelo dá também o 1º turno de cada lugar, com que a projeção se compara. O modelo fala do 1º finalista da base; o
// arquivo, do 1º candidato do arquivo de rodada.

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
  /** A projeção dos municípios de uma UF ou das cidades do Exterior (`ZZ`), para a tabela de projeções dela. */
  dosMunicipios(uf: string, comPesquisas: boolean): ProjecoesDosMunicipios | undefined;
  /** Os municípios da tabela de projeções de uma UF, com as comparações de cada um: o que não muda na noite. */
  municipiosDaTabela(uf: string): MunicipiosDaTabela | undefined;
  /**
   * Os números de qualquer lugar (o Brasil, uma UF, o Exterior ou um município) numa base, sem a curva, como vão nos
   * arquivos: o que os textos preditivos da narração dizem. `undefined` num lugar fora da base do modelo.
   */
  numeros(id: string, base: BaseDaProjecao): NumerosDaProjecao | undefined;
  /** A apuração de cada município com que a rodada projetou, para o arquivo do simulador. */
  apuracao: ApuracaoEmColunas;
}

/** A projeção da noite, preparada uma vez: o modelo e o 1º turno de cada lugar. */
export interface ProjecaoDaNoite {
  /** A assinatura dos municípios da base do modelo, na ordem dela: a do arquivo do simulador. */
  assinatura: string;
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
  /** A indicação das pesquisas de um lugar com esse placar entre finalistas no 1º turno. */
  const indicacao = (placarDoLugar: number) =>
    indicacaoDasPesquisas({ placarEntreFinalistasDoLugar: placarDoLugar, placarEntreFinalistasDoBrasil: primeiroTurno("BR"), agregado: agregado.valor });
  // Os municípios de cada UF e do Exterior, pela posição na base, com o código do TSE e o 1º turno de cada um. A base da
  // noite é por município (ticket 28): cada um aparece uma vez.
  const municipiosDaUf = new Map<string, number[]>();
  base.municipios.forEach((m, i) => {
    if (!municipiosDaUf.has(m.uf)) municipiosDaUf.set(m.uf, []);
    municipiosDaUf.get(m.uf)!.push(i);
  });
  const idDe = base.municipios.map((m) => idDoMunicipio(m.municipio));
  const posicaoDe = new Map(idDe.map((id, i) => [id, i]));
  const primeiroTurnoDe = base.municipios.map((m) => placarEntreFinalistas(m.votos[0]!, m.votos[1]!) ?? 50);
  const assinaturaDaUf = new Map([...municipiosDaUf].map(([uf, indices]) => [uf, assinaturaDosLugares(indices.map((i) => idDe[i]!))]));

  /**
   * A apuração de cada município pelo que o coletor guarda; um município que ele ainda não tem fica como no 1º turno.
   * `undefined` com mais municípios faltando do que podem faltar, depois da primeira seção.
   */
  function apuracao(resultado: (abrangencia: AbrangenciaDaDivulgacao) => ResultadoDoTse | undefined): Apuracao | undefined {
    if (!resultado({})?.secoes.totalizadas) return antes;
    let faltam = 0;
    const porMunicipio = base.municipios.map((m, i) => {
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
    return faltam > PODEM_FALTAR * base.municipios.length ? undefined : porMunicipio;
  }

  return {
    assinatura: assinaturaDosLugares(idDe),
    projetar(resultado, ordem) {
      if (ordem.length !== 2 || !ordem.includes(primeiro) || !ordem.includes(segundo)) {
        throw new Error(`os candidatos da noite (${ordem.join(", ")}) não são os finalistas da base do modelo (${primeiro}, ${segundo})`);
      }
      // Uma fatia do 1º finalista da base, de 0 a 1, como % do 1º candidato do arquivo de rodada.
      const doPrimeiro = (fatia: number) => 100 * (ordem[0] === primeiro ? fatia : 1 - fatia);
      const daRodada = apuracao(resultado);
      if (!daRodada) return undefined;
      const nasDuasBases = projetarNasDuasBases(modelo, daRodada, constantes, agregado);
      const curvas = {
        soApuracao: curvaProjetada(modelo, daRodada, nasDuasBases.soApuracao, constantes),
        comPesquisas: curvaProjetada(modelo, daRodada, nasDuasBases.comPesquisas, constantes),
      };

      /** Os números de um lugar numa base, como a página os mostra, sem a curva nem a virada. */
      const numeros = (r: ResultadoDoLugar) => ({
        projecao: umaCasa(doPrimeiro(r.projecao)),
        margem: umaCasa(100 * r.margem),
        chance: Math.round(doPrimeiro(r.chance)),
        chanceDeVirada: r.chanceDeVirada === null ? null : Math.round(100 * r.chanceDeVirada),
        sinalDeVirada: r.sinalDeVirada,
      });
      const naBase = (r: ResultadoDoLugar, curva: CurvaDoLugar): ProjecaoNaBase => ({
        ...numeros(r),
        curva: curva.pontos.map((p) => [umaCasa(p.x), umaCasa(doPrimeiro(p.y)), umaCasa(100 * Z_95 * p.desvio)]),
        virada: curva.virada && { x: inteiro(curva.virada.x), cedo: inteiro(curva.virada.cedo), tarde: inteiro(curva.virada.tarde) },
      });
      // O placar entre finalistas como a página o escreve (retro do ticket 33): o do 1º candidato, o do partido de
      // Bolsonaro em 2022 e em 2026, com uma casa, e o do outro com o que falta para 100.
      const comparacoes = (placarDoLugar: number) => ({
        primeiroTurno: umaCasa(doPrimeiro(placarDoLugar / 100)),
        pesquisas: umaCasa(doPrimeiro(indicacao(placarDoLugar) / 100)),
      });
      /** Os municípios de uma UF numa base, em colunas. */
      const colunas = (projecao: Projecao, indices: number[]): ColunasDaBase => {
        const deCada = indices.map((i) => numeros(projecao.municipios[i]!));
        return {
          projecao: deCada.map((n) => n.projecao),
          margem: deCada.map((n) => n.margem),
          chance: deCada.map((n) => n.chance),
          chanceDeVirada: deCada.map((n) => n.chanceDeVirada),
          sinalDeVirada: deCada.map((n) => n.sinalDeVirada),
          virada: indices.map((i) => {
            const { x, cedo, tarde } = projecao.municipios[i]!.virada;
            return [inteiro(x), inteiro(cedo), inteiro(tarde)];
          }),
        };
      };

      return {
        pesoDasPesquisas: nasDuasBases.comPesquisas.pesoDasPesquisas,
        coincidemNoBrasil: nasDuasBases.coincidem.brasil,
        doLugar(id, comPesquisas) {
          const doBrasil = id === "BR";
          if (!doBrasil && !(id in nasDuasBases.soApuracao.ufs)) return undefined;
          const naBaseDoLugar = (qual: "soApuracao" | "comPesquisas") =>
            doBrasil ? naBase(nasDuasBases[qual].brasil, curvas[qual].brasil) : naBase(nasDuasBases[qual].ufs[id]!, curvas[qual].ufs[id]!);
          const comparadas = comparacoes(primeiroTurno(id));
          if (!comPesquisas) return { soApuracao: naBaseDoLugar("soApuracao"), comparacoes: comparadas };
          const coincidem = doBrasil ? nasDuasBases.coincidem.brasil : nasDuasBases.coincidem.ufs[id]!;
          return { soApuracao: naBaseDoLugar("soApuracao"), comPesquisas: naBaseDoLugar("comPesquisas"), coincidem, comparacoes: comparadas };
        },
        dosMunicipios(uf, comPesquisas) {
          const indices = municipiosDaUf.get(uf);
          if (!indices) return undefined;
          const projecoes: ProjecoesDosMunicipios = {
            assinatura: assinaturaDaUf.get(uf)!,
            validos: indices.map((i) => Math.round(nasDuasBases.soApuracao.municipios[i]!.validos)),
            soApuracao: colunas(nasDuasBases.soApuracao, indices),
          };
          if (!comPesquisas) return projecoes;
          return {
            ...projecoes,
            comPesquisas: colunas(nasDuasBases.comPesquisas, indices),
            coincidem: indices.map((i) => nasDuasBases.coincidem.municipios[i]!),
          };
        },
        numeros(id, qual) {
          const projecao = nasDuasBases[qual];
          if (id === "BR") return numeros(projecao.brasil);
          const i = posicaoDe.get(id);
          const doLugar = i === undefined ? projecao.ufs[id] : projecao.municipios[i];
          return doLugar && numeros(doLugar);
        },
        municipiosDaTabela(uf) {
          const indices = municipiosDaUf.get(uf);
          if (!indices) return undefined;
          const comparadas = indices.map((i) => comparacoes(primeiroTurnoDe[i]!));
          return {
            uf,
            assinatura: assinaturaDaUf.get(uf)!,
            municipios: indices.map((i) => idDe[i]!),
            comparacoes: { primeiroTurno: comparadas.map((c) => c.primeiroTurno), pesquisas: comparadas.map((c) => c.pesquisas) },
          };
        },
        apuracao: {
          secoes: daRodada.map((a) => a.secoes),
          secoesTotais: daRodada.map((a) => a.secoesTotais),
          aptos: daRodada.map((a) => a.aptos),
          aptosTotais: daRodada.map((a) => a.aptosTotais),
          votos: [daRodada.map((a) => a.votos[0]!), daRodada.map((a) => a.votos[1]!)],
        },
      };
    },
  };
}
