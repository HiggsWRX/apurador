import type { BaseDoModelo, Constantes } from "@apurador/modelo";

// O arquivo que o simulador "e se" baixa ao abrir (Simulador "e se", decisão 5; Arquitetura e tecnologia, decisão 18):
// tudo o que o `modelo` precisa para projetar no navegador antes das 17h, gerado no build. A base do modelo vai em
// colunas, com os degraus de chegada em diferenças: com gzip, fica em pouco mais da metade da base como o pipeline a
// grava, e é o maior peso da tela do simulador (ticket 24, a abertura em até 5 s). Sem DOM e sem dados do build: o
// endpoint do build monta o arquivo, e a ilha o lê.

/** A base do modelo em colunas, um valor por município em cada uma, na ordem da base. */
export interface BaseCompacta {
  /** Os números dos dois finalistas, na ordem da base. */
  finalistas: number[];
  /** As UFs, na ordem em que aparecem; `uf` dá a posição de cada município aqui. */
  ufs: string[];
  uf: number[];
  /** O código de cada município, em diferenças do anterior. */
  municipio: number[];
  aptos: number[];
  secoes: number[];
  validos: number[];
  votos: [number[], number[]];
  /** Os degraus de chegada de cada município, `[x, seções, x, seções…]`, cada número em diferença do anterior do mesmo tipo. */
  degraus: number[][];
}

/** O arquivo do simulador antes das 17h: a base do modelo, o agregado, as constantes e o 1º turno de cada região. */
export interface ArquivoDoSimulador {
  base: BaseCompacta;
  /** O agregado de pesquisas do instante do build (em % do 1º finalista), ou `null` sem ele no ar: fica só a "Só apuração". */
  agregado: { valor: number; incerteza: number } | null;
  constantes: Constantes;
  /** O placar entre finalistas do Brasil no 1º turno, em % do 1º finalista: a referência da tradução do controle do Brasil. */
  placarEntreFinalistasDoBrasil: number;
  /**
   * Cada região, na ordem de `REGIOES`, no 1º turno: o placar entre finalistas, em % do 1º finalista, e o comparecimento,
   * de 0 a 1, que o modelo supõe para o voto que falta.
   */
  regioes: { placarEntreFinalistas: number; comparecimento: number }[];
}

/** Os números em diferenças do anterior: o primeiro como é. */
const emDiferencas = (numeros: number[]) => numeros.map((n, i) => (i === 0 ? n : n - numeros[i - 1]!));
/** Desfaz `emDiferencas`. */
const somadas = (diferencas: number[]) => {
  let soma = 0;
  return diferencas.map((d) => (soma += d));
};

/** A base do modelo em colunas, como o arquivo do simulador a leva. */
export function compactarBase(base: BaseDoModelo): BaseCompacta {
  if (base.municipios.some((m) => m.zona !== undefined)) throw new Error("o arquivo do simulador leva a base por município, sem zona");
  const ufs = [...new Set(base.municipios.map((m) => m.uf))];
  return {
    finalistas: base.finalistas.map((f) => f.numero),
    ufs,
    uf: base.municipios.map((m) => ufs.indexOf(m.uf)),
    municipio: emDiferencas(base.municipios.map((m) => m.municipio)),
    aptos: base.municipios.map((m) => m.aptos),
    secoes: base.municipios.map((m) => m.secoes),
    validos: base.municipios.map((m) => m.validos),
    votos: [base.municipios.map((m) => m.votos[0]!), base.municipios.map((m) => m.votos[1]!)],
    degraus: base.municipios.map((m) => {
      const [x, secoes] = [emDiferencas(m.degrausDeChegada.map((d) => d[0])), emDiferencas(m.degrausDeChegada.map((d) => d[1]))];
      return x.flatMap((dx, i) => [dx, secoes[i]!]);
    }),
  };
}

/** A base do modelo de volta, a partir das colunas do arquivo do simulador. */
export function descompactarBase(c: BaseCompacta): BaseDoModelo {
  const municipios = somadas(c.municipio);
  return {
    finalistas: c.finalistas.map((numero) => ({ numero })),
    municipios: c.uf.map((u, i) => {
      const pares = c.degraus[i]!;
      const x = somadas(pares.filter((_, j) => j % 2 === 0));
      const secoes = somadas(pares.filter((_, j) => j % 2 === 1));
      return {
        uf: c.ufs[u]!,
        municipio: municipios[i]!,
        aptos: c.aptos[i]!,
        secoes: c.secoes[i]!,
        validos: c.validos[i]!,
        votos: [c.votos[0][i]!, c.votos[1][i]!],
        degrausDeChegada: x.map((xi, j): [number, number] => [xi, secoes[j]!]),
      };
    }),
  };
}
