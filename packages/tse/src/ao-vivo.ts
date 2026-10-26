// Os arquivos da divulgação ao vivo (`resultados.tse.jus.br/oficial`): a configuração das eleições
// (`ele-c.json`), os acompanhamentos do Brasil e de cada UF (EA14 e EA15, os índices `-ab.json`) e o resultado
// de Brasil, UF, Exterior, município e zona (EA20, `-u.json`). Todo número vem como texto, com vírgula decimal,
// e as horas, em Brasília, sem fuso. Dicionário: .scratch/apurador-2026/research/01-api-ao-vivo-tse.md, seção 8.

/** Um arquivo do TSE que o leitor não entende. O coletor fica com o último arquivo bom e alerta o dono. */
export class ArquivoDoTseInvalido extends Error {
  override name = "ArquivoDoTseInvalido";
}

/** Um candidato no arquivo de resultado de um lugar, com os votos e o % do TSE. */
export interface CandidatoDoResultado {
  numero: number;
  /** O sequencial do candidato (`sqcand`), que dá a foto oficial. */
  sequencial: string;
  /** O nome completo (`nm`). */
  nome: string;
  nomeUrna: string;
  /** A sigla do partido. */
  partido: string;
  votos: number;
  /** O % dos votos válidos, com as duas casas do TSE. */
  percentual: number;
}

/** As seções de um lugar: as totalizadas, o total e o percentual com as duas casas do TSE (`pst`). */
export interface SecoesDoTse {
  totalizadas: number;
  total: number;
  percentual: number;
}

/** O arquivo de resultado de um lugar (EA20), normalizado. */
export interface ResultadoDoTse {
  eleicao: string;
  abrangencia: { tipo: "br" | "uf" | "mu" | "zona"; codigo: string };
  /** `AAAA-MM-DD HH:MM:SS`, em Brasília, ou `null` antes da primeira totalização. */
  ultimaTotalizacao: string | null;
  totalizacaoFinal: boolean;
  /** A indicação do TSE (`md = "e"`): a eleição matematicamente definida, com eleito. Só no Brasil. */
  indicacao: boolean;
  secoes: SecoesDoTse;
  /**
   * Os aptos do lugar, os das seções totalizadas, quantos deles votaram e as abstenções, que o TSE conta só nas seções
   * instaladas, como nos arquivos oficiais por município e zona.
   */
  eleitorado: { total: number; totalizado: number; comparecimento: number; abstencao: number };
  /** Os nulos incluem os técnicos. */
  votos: { validos: number; brancos: number; nulos: number };
  /** Na ordem do arquivo. */
  candidatos: CandidatoDoResultado[];
}

type Bruto = Record<string, unknown>;

function campo(objeto: unknown, nome: string): string {
  const valor = (objeto as Bruto | null)?.[nome];
  if (typeof valor !== "string") throw new ArquivoDoTseInvalido(`Arquivo do TSE: campo "${nome}" ausente ou de outro tipo`);
  return valor;
}

function lista(objeto: unknown, nome: string): unknown[] {
  const valor = (objeto as Bruto | null)?.[nome];
  if (!Array.isArray(valor)) throw new ArquivoDoTseInvalido(`Arquivo do TSE: lista "${nome}" ausente ou de outro tipo`);
  return valor;
}

function inteiro(objeto: unknown, nome: string): number {
  const texto = campo(objeto, nome);
  if (!/^\d+$/.test(texto)) throw new ArquivoDoTseInvalido(`Arquivo do TSE: "${nome}" não é um inteiro: ${texto}`);
  return Number(texto);
}

/** "47,03" → 47.03. */
function percentual(objeto: unknown, nome: string): number {
  const texto = campo(objeto, nome);
  if (!/^\d+(,\d+)?$/.test(texto)) throw new ArquivoDoTseInvalido(`Arquivo do TSE: "${nome}" não é um percentual: ${texto}`);
  return Number(texto.replace(",", "."));
}

/** `DD/MM/AAAA` como `AAAA-MM-DD`. */
function data(objeto: unknown, nome: string): string {
  const texto = campo(objeto, nome);
  const m = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(texto);
  if (!m) throw new ArquivoDoTseInvalido(`Arquivo do TSE: "${nome}" não é uma data: ${texto}`);
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** `dt` e `ht` (`DD/MM/AAAA` e `HH:MM:SS`) como `AAAA-MM-DD HH:MM:SS`, ou `null` se vierem vazios. */
function dataHora(objeto: unknown, nomeDaData: string, nomeDaHora: string): string | null {
  const hora = campo(objeto, nomeDaHora);
  if (campo(objeto, nomeDaData) === "" && hora === "") return null;
  if (!/^\d\d:\d\d:\d\d$/.test(hora)) throw new ArquivoDoTseInvalido(`Arquivo do TSE: "${nomeDaHora}" não é uma hora: ${hora}`);
  return `${data(objeto, nomeDaData)} ${hora}`;
}

function secoes(objeto: unknown): SecoesDoTse {
  return { totalizadas: inteiro(objeto, "st"), total: inteiro(objeto, "ts"), percentual: percentual(objeto, "pst") };
}

const TIPOS = ["br", "uf", "mu", "zona"] as const;

function abrangencia(objeto: unknown): ResultadoDoTse["abrangencia"] {
  const tipo = campo(objeto, "tpabr");
  if (!(TIPOS as readonly string[]).includes(tipo)) throw new ArquivoDoTseInvalido(`Arquivo do TSE: abrangência desconhecida: ${tipo}`);
  return { tipo: tipo as (typeof TIPOS)[number], codigo: campo(objeto, "cdabr") };
}

function ler(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (erro) {
    throw new ArquivoDoTseInvalido(`Arquivo do TSE: não é JSON (${(erro as Error).message})`);
  }
}

/** O resultado de um lugar (EA20). */
export function lerResultado(bytes: Uint8Array): ResultadoDoTse {
  const raiz = ler(bytes);
  const [s, e, v] = ["s", "e", "v"].map((nome) => {
    const parte = (raiz as Bruto | null)?.[nome];
    if (typeof parte !== "object" || parte === null) throw new ArquivoDoTseInvalido(`Arquivo do TSE: bloco "${nome}" ausente`);
    return parte;
  });
  const candidatos = lista(raiz, "carg").flatMap((cargo) =>
    lista(cargo, "agr").flatMap((agremiacao) =>
      lista(agremiacao, "par").flatMap((partido) =>
        lista(partido, "cand").map((c) => ({
          numero: inteiro(c, "n"),
          sequencial: campo(c, "sqcand"),
          nome: campo(c, "nm"),
          nomeUrna: campo(c, "nmu"),
          partido: campo(partido, "sg"),
          votos: inteiro(c, "vap"),
          percentual: percentual(c, "pvap"),
        })),
      ),
    ),
  );
  return {
    eleicao: campo(raiz, "ele"),
    abrangencia: abrangencia(raiz),
    ultimaTotalizacao: dataHora(raiz, "dt", "ht"),
    totalizacaoFinal: campo(raiz, "tf") === "s",
    indicacao: (raiz as Bruto)["md"] === "e",
    secoes: secoes(s),
    eleitorado: { total: inteiro(e, "te"), totalizado: inteiro(e, "est"), comparecimento: inteiro(e, "c"), abstencao: inteiro(e, "a") },
    votos: { validos: inteiro(v, "vv"), brancos: inteiro(v, "vb"), nulos: inteiro(v, "tvn") },
    candidatos,
  };
}

/** Um lugar no índice de acompanhamento, com a hora da última totalização dele. */
export interface ItemDoAcompanhamento {
  abrangencia: { tipo: "br" | "uf" | "mu"; codigo: string };
  /** `AAAA-MM-DD HH:MM:SS`, em Brasília, ou `null` antes da primeira totalização. */
  ultimaTotalizacao: string | null;
  secoes: SecoesDoTse;
}

/** O índice de acompanhamento (EA14 e EA15): o que mudou no Brasil ou numa UF. */
export interface AcompanhamentoDoTse {
  eleicao: string;
  /** Na ordem do arquivo: os municípios (ou as UFs) e, por último, o lugar do índice. */
  itens: ItemDoAcompanhamento[];
}

/** O acompanhamento do Brasil (EA14, com as UFs) ou de uma UF (EA15, com os municípios): o índice do que mudou. */
export function lerAcompanhamento(bytes: Uint8Array): AcompanhamentoDoTse {
  const raiz = ler(bytes);
  return {
    eleicao: campo(raiz, "ele"),
    itens: lista(raiz, "abr").map((item) => {
      const tipo = campo(item, "tpabr");
      if (!["br", "uf", "mun"].includes(tipo)) throw new ArquivoDoTseInvalido(`Acompanhamento do TSE: abrangência desconhecida: ${tipo}`);
      return {
        // O índice escreve o município como `mun`; o resultado, como `mu`.
        abrangencia: { tipo: tipo === "mun" ? "mu" : (tipo as "br" | "uf"), codigo: campo(item, "cdabr") },
        ultimaTotalizacao: dataHora(item, "dt", "ht"),
        secoes: secoes((item as Bruto)["s"]),
      };
    }),
  };
}

/** Uma eleição na configuração das eleições: o código, o ciclo, o pleito, o dia e o turno. */
export interface EleicaoDaDivulgacao {
  codigo: string;
  /** O ciclo da divulgação, que entra nas URLs (`ele2026`). */
  ciclo: string;
  pleito: string;
  /** O dia da eleição, `AAAA-MM-DD`. */
  dia: string;
  turno: number;
}

/** Uma eleição na configuração das eleições (`oficial/comum/config/ele-c.json`). */
export function eleicaoDaConfiguracao(bytes: Uint8Array, codigo: string): EleicaoDaDivulgacao {
  for (const pleito of lista(ler(bytes), "pl")) {
    const eleicao = lista(pleito, "e").find((e) => campo(e, "cd") === codigo);
    if (!eleicao) continue;
    return { codigo, ciclo: campo(pleito, "c"), pleito: campo(pleito, "cd"), dia: data(pleito, "dt"), turno: inteiro(eleicao, "t") };
  }
  throw new ArquivoDoTseInvalido(`Configuração das eleições: a eleição ${codigo} não está no arquivo`);
}

/** A configuração das eleições, fora do ciclo. A base é a do ambiente, como `https://resultados.tse.jus.br/oficial`. */
export const urlDasEleicoes = (base: string) => `${base}/comum/config/ele-c.json`;

/** Um lugar da divulgação: Brasil (`{}`), UF (`{ uf }`, com `ZZ` para o Exterior), município ou zona. */
export interface AbrangenciaDaDivulgacao {
  uf?: string;
  /** O código do TSE. */
  municipio?: number;
  zona?: number;
}

/**
 * As URLs dos arquivos de Presidente (cargo 1) de uma eleição, como o app oficial as monta. Os municípios e as
 * zonas saem da configuração de municípios (`municipios`), nunca adivinhados: muitos 404 bloqueiam o IP.
 */
export function urlsDaDivulgacao(base: string, eleicao: Pick<EleicaoDaDivulgacao, "codigo" | "ciclo">) {
  const eleicao6 = eleicao.codigo.padStart(6, "0");
  const raiz = `${base}/${eleicao.ciclo}/${eleicao.codigo}`;
  const pasta = (uf: string | null | undefined) => (uf ?? "br").toLowerCase();
  return {
    municipios: `${raiz}/config/mun-e${eleicao6}-cm.json`,
    /** O do Brasil (`null`, com as UFs) ou o de uma UF (com os municípios). */
    acompanhamento: (uf: string | null) => `${raiz}/dados/${pasta(uf)}/${pasta(uf)}-e${eleicao6}-ab.json`,
    resultado({ uf, municipio, zona }: AbrangenciaDaDivulgacao) {
      const lugar = `${pasta(uf)}${municipio === undefined ? "" : String(municipio).padStart(5, "0")}${zona === undefined ? "" : `-z${String(zona).padStart(4, "0")}`}`;
      return `${raiz}/dados/${pasta(uf)}/${lugar}-c0001-e${eleicao6}-u.json`;
    },
    /** A foto oficial de um candidato a Presidente, pelo sequencial (`sqcand`). */
    foto: (sequencial: string) => `${raiz}/fotos/br/${sequencial}.jpeg`,
  };
}
