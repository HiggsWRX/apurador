import { abrangenciaDoRegistro, type RegistroDePesquisa } from "@apurador/tse";
import { lerCsv } from "./csv.ts";
import type { Turno } from "./turno.ts";

// A lista das pesquisas nacionais do 2º turno de 2026 (`dados/pesquisas.csv`) e a conferência de cada uma contra o
// CSV diário de registros do TSE. Nada aqui lê disco ou rede: o site e o CI chamam as mesmas funções.

export type Modo = "presencial" | "telefone" | "internet" | "misto";

/** Uma linha do `pesquisas.csv`, com os números como a fonte os publicou. */
export interface Pesquisa {
  /** No formato da divulgação, `BR-00466/2026`. */
  registro: string;
  instituto: string;
  contratante: string;
  /** Período de coleta divulgado, `aaaa-mm-dd`. */
  campoInicio: string;
  campoFim: string;
  entrevistas: number;
  /** Margem de erro, em pontos percentuais, e nível de confiança, em %. */
  margem: number;
  confianca: number;
  modo: Modo;
  /** Votos totais (não os válidos) de cada candidato, em %, pelo número do candidato no TSE. */
  votos: Map<number, number>;
  /** Em %, ou `null` quando a fonte não os publica separados. */
  brancosNulos: number | null;
  indecisos: number | null;
  fonte: string;
  divulgacao: string;
}

/** Um CNPJ da lista fechada de institutos, com o instituto da lista a que pertence. */
export interface CnpjDaLista {
  /** O instituto como a decisão o nomeia (um dos 14). */
  institutoDaLista: string;
  /** O nome com que as pesquisas desse CNPJ são divulgadas, o mesmo da coluna `instituto` do `pesquisas.csv`. */
  instituto: string;
  cnpj: string;
  /** Onde esse CNPJ aparece como desse instituto. */
  origem: string;
}

/**
 * O extrato do CSV de registros do TSE guardado no repositório (`dados/pesquisas-tse.json`): os registros das
 * pesquisas da lista, como o TSE os publicou no dia da última conferência, e de que arquivo vieram.
 */
export interface ExtratoDoTse {
  fonte: { url: string; membro: string; geracao: string[]; sha256: string; bytes: number; conferidoEm: string };
  registros: RegistroDePesquisa[];
}

export interface ConferenciaDaPesquisa {
  pesquisa: Pesquisa;
  registro: RegistroDePesquisa | undefined;
  /** Vazio quando a pesquisa bate com o registro e cumpre o critério de inclusão. */
  divergencias: string[];
}

export function verificarPesquisas(entrada: {
  pesquisas: Pesquisa[];
  registros: RegistroDePesquisa[];
  institutos: CnpjDaLista[];
  /** Os números dos dois candidatos do 2º turno. */
  finalistas: number[];
  /** A data da conferência, `aaaa-mm-dd`. */
  dataDaConferencia: string;
}): ConferenciaDaPesquisa[] {
  const porRegistro = new Map(entrada.registros.map((r) => [r.registro, r]));
  const porCnpj = new Map(entrada.institutos.map((i) => [i.cnpj, i]));
  const vistos = new Set<string>();
  return entrada.pesquisas.map((pesquisa) => {
    const divergencias: string[] = [];
    if (vistos.has(pesquisa.registro)) divergencias.push(`o registro ${pesquisa.registro} aparece mais de uma vez na lista`);
    vistos.add(pesquisa.registro);
    divergencias.push(...divergenciasDosNumeros(pesquisa, entrada.finalistas));
    if (pesquisa.campoInicio < INICIO_DO_2O_TURNO) {
      divergencias.push(`o campo começa em ${dataBr(pesquisa.campoInicio)}, antes de ${dataBr(INICIO_DO_2O_TURNO)}: só entram pesquisas do 2º turno`);
    }
    if (pesquisa.campoFim >= DIA_DA_ELEICAO) divergencias.push("o campo vai até o dia da eleição: boca de urna nunca entra");
    if (pesquisa.divulgacao >= DIA_DA_ELEICAO) divergencias.push(`a divulgação (${dataBr(pesquisa.divulgacao)}) é do dia da eleição ou depois; o agregado congela em 24/10`);
    else if (pesquisa.divulgacao > entrada.dataDaConferencia) {
      divergencias.push(`a divulgação (${dataBr(pesquisa.divulgacao)}) é posterior à conferência no TSE (${dataBr(entrada.dataDaConferencia)})`);
    }

    const registro = porRegistro.get(pesquisa.registro);
    if (!registro) return { pesquisa, registro, divergencias: [...divergencias, `o registro ${pesquisa.registro} não está no CSV do TSE`] };

    if (!registro.cargo.split(", ").includes("Presidente")) divergencias.push(`o registro é para ${registro.cargo}, não para Presidente`);
    const abrangencia = abrangenciaDoRegistro(registro);
    if (abrangencia === "estadual") divergencias.push("o plano amostral registrado no TSE é de uma UF: só entram pesquisas nacionais");
    if (abrangencia === "indefinida") divergencias.push("o registro no TSE não diz se a pesquisa é nacional");
    if (/boca de urna/i.test(registro.metodologia)) divergencias.push("a metodologia registrada no TSE é de boca de urna, que nunca entra");
    if (pesquisa.divulgacao < registro.divulgacao) {
      divergencias.push(`a divulgação (${dataBr(pesquisa.divulgacao)}) é anterior à data liberada pelo TSE (${dataBr(registro.divulgacao)})`);
    }
    const instituto = porCnpj.get(registro.cnpj);
    if (!instituto) divergencias.push(`o CNPJ ${registro.cnpj} (${registro.empresa}) não está na lista fechada de institutos`);
    else if (instituto.instituto !== pesquisa.instituto) {
      divergencias.push(`o CNPJ ${registro.cnpj} do registro é do instituto ${instituto.instituto}, não de ${pesquisa.instituto}`);
    }
    if (pesquisa.campoInicio < registro.inicio || pesquisa.campoFim > registro.fim) {
      divergencias.push(
        `o campo divulgado (${dataBr(pesquisa.campoInicio)} a ${dataBr(pesquisa.campoFim)}) sai do registrado no TSE (${dataBr(registro.inicio)} a ${dataBr(registro.fim)})`,
      );
    }
    if (Math.abs(pesquisa.entrevistas - registro.entrevistas) > TOLERANCIA_DAS_ENTREVISTAS * registro.entrevistas) {
      divergencias.push(`as entrevistas divulgadas (${pesquisa.entrevistas}) diferem mais de ${100 * TOLERANCIA_DAS_ENTREVISTAS}% das registradas no TSE (${registro.entrevistas})`);
    }
    return { pesquisa, registro, divergencias };
  });
}

/**
 * A lista que vai ao site: o `pesquisas.csv` conferido contra o extrato do TSE do repositório, na data da última
 * conferência. Falha, em vez de esconder a linha, se qualquer pesquisa não bater: o build e o CI quebram.
 */
export function listaDasPesquisas(entrada: { pesquisas: string; institutos: string; extrato: ExtratoDoTse; turno: Turno }): Pesquisa[] {
  const conferencias = verificarPesquisas({
    pesquisas: lerPesquisas(entrada.pesquisas),
    registros: entrada.extrato.registros,
    institutos: lerInstitutos(entrada.institutos),
    finalistas: finalistas(entrada.turno),
    dataDaConferencia: dataEmBrasilia(new Date(entrada.extrato.fonte.conferidoEm)),
  });
  const divergentes = conferencias.filter((c) => c.divergencias.length > 0);
  if (divergentes.length > 0) {
    const linhas = divergentes.map((c) => `- ${c.pesquisa.registro} (${c.pesquisa.instituto}): ${c.divergencias.join("; ")}`);
    throw new Error(`pesquisas.csv não bate com o extrato do TSE de ${entrada.extrato.fonte.conferidoEm}:\n${linhas.join("\n")}`);
  }
  return conferencias.map((c) => c.pesquisa);
}

/** Os números dos dois candidatos do 2º turno: os mais votados no Brasil no 1º turno. */
export const finalistas = (primeiroTurno: Turno) => primeiroTurno.candidatos.slice(0, 2).map((c) => c.numero);

/** A data de um instante em Brasília (UTC−3, sem horário de verão desde 2019), `aaaa-mm-dd`. */
export const dataEmBrasilia = (instante: Date) => new Date(instante.getTime() - 3 * 3600_000).toISOString().slice(0, 10);

const COLUNAS_DAS_PESQUISAS = [
  "registro",
  "instituto",
  "contratante",
  "campo_inicio",
  "campo_fim",
  "entrevistas",
  "margem",
  "confianca",
  "modo",
  "brancos_nulos",
  "indecisos",
  "fonte",
  "divulgacao",
] as const;
const MODOS: readonly Modo[] = ["presencial", "telefone", "internet", "misto"];

/** Lê o `pesquisas.csv`. Os votos de cada candidato vêm nas colunas `votos_<número do candidato no TSE>`. */
export function lerPesquisas(texto: string): Pesquisa[] {
  return lerTabela(texto, "pesquisas.csv", COLUNAS_DAS_PESQUISAS, /^votos_\d+$/).map(({ valor, extras }) => ({
    registro: valor("registro", (v) => /^BR-\d{5}\/\d{4}$/.test(v), String),
    instituto: valor("instituto", naoVazio, String),
    contratante: valor("contratante", naoVazio, String),
    campoInicio: valor("campo_inicio", ehData, String),
    campoFim: valor("campo_fim", ehData, String),
    entrevistas: valor("entrevistas", (v) => /^\d+$/.test(v), Number),
    margem: valor("margem", ehDecimal, Number),
    confianca: valor("confianca", ehDecimal, Number),
    modo: valor("modo", (v) => MODOS.includes(v as Modo), (v) => v as Modo),
    votos: new Map(extras.map((coluna) => [Number(coluna.slice("votos_".length)), valor(coluna, ehDecimal, Number)])),
    brancosNulos: valor("brancos_nulos", (v) => v === "" || ehDecimal(v), opcional),
    indecisos: valor("indecisos", (v) => v === "" || ehDecimal(v), opcional),
    fonte: valor("fonte", (v) => /^https:\/\/\S+$/.test(v), String),
    divulgacao: valor("divulgacao", ehData, String),
  }));
}

/** Lê o `pesquisas-institutos.csv`, a lista fechada de institutos, com um CNPJ por linha. */
export function lerInstitutos(texto: string): CnpjDaLista[] {
  return lerTabela(texto, "pesquisas-institutos.csv", ["instituto_da_lista", "instituto", "cnpj", "origem"] as const).map(({ valor }) => ({
    institutoDaLista: valor("instituto_da_lista", naoVazio, String),
    instituto: valor("instituto", naoVazio, String),
    cnpj: valor("cnpj", (v) => /^\d{14}$/.test(v), String),
    origem: valor("origem", naoVazio, String),
  }));
}

const naoVazio = (v: string) => v.trim() !== "";
const ehDecimal = (v: string) => /^\d+(\.\d+)?$/.test(v);
const ehData = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const opcional = (v: string) => (v === "" ? null : Number(v));

/** As linhas de um CSV do repositório, com cada valor conferido na leitura, para o erro apontar a linha e a coluna. */
function lerTabela<C extends string>(texto: string, arquivo: string, colunas: readonly C[], extra?: RegExp) {
  const [cabecalho = [], ...linhas] = lerCsv(texto);
  const faltando = colunas.filter((c) => !cabecalho.includes(c));
  const desconhecidas = cabecalho.filter((c) => !colunas.includes(c as C) && !extra?.test(c));
  if (faltando.length > 0 || desconhecidas.length > 0) {
    throw new Error(`${arquivo}: colunas faltando (${faltando.join(", ")}) ou desconhecidas (${desconhecidas.join(", ")})`);
  }
  const extras = cabecalho.filter((c) => !colunas.includes(c as C));
  return linhas.map((linha, i) => ({
    extras,
    valor<T>(coluna: string, valido: (v: string) => boolean, converter: (v: string) => T): T {
      const v = linha[cabecalho.indexOf(coluna)] ?? "";
      if (!valido(v)) throw new Error(`${arquivo}, linha ${i + 2}: ${coluna} inválido: ${v}`);
      return converter(v);
    },
  }));
}

/** Os números divulgados, sem o registro: pega erro de digitação, que o TSE não tem como conferir. */
function divergenciasDosNumeros(p: Pesquisa, finalistas: number[]): string[] {
  const divergencias: string[] = [];
  const candidatos = [...p.votos.keys()];
  if (candidatos.length !== finalistas.length || !finalistas.every((n) => p.votos.has(n))) {
    divergencias.push(`os votos são de ${candidatos.join(" e ")}, mas os finalistas são ${finalistas.join(" e ")}`);
  }
  // Cada número vem arredondado pela fonte, então a soma passa um pouco de 100% ou fica um pouco abaixo.
  const soma = [...p.votos.values(), p.brancosNulos ?? 0, p.indecisos ?? 0].reduce((s, n) => s + n, 0);
  if (p.brancosNulos !== null && p.indecisos !== null && Math.abs(soma - 100) > 2) {
    divergencias.push(`votos, brancos e nulos e indecisos somam ${pct(soma)}, não perto de 100%`);
  } else if (soma > 101) divergencias.push(`votos, brancos e nulos e indecisos somam ${pct(soma)}, mais de 100%`);
  if (!(p.margem > 0 && p.margem <= 10)) divergencias.push(`a margem de erro (${p.margem}) não está entre 0 e 10 pontos`);
  if (!(p.confianca >= 90 && p.confianca < 100)) divergencias.push(`o nível de confiança (${p.confianca}%) não está entre 90% e 100%`);
  return divergencias;
}

const pct = (n: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(n)}%`;

// O 1º turno foi em 04/10. Uma pesquisa com campo antes de 05/10 ouviu eleitores antes do resultado.
const INICIO_DO_2O_TURNO = "2026-10-05";
const DIA_DA_ELEICAO = "2026-10-25";

// O registro é feito antes do campo e traz a amostra prevista. A realizada difere um pouco (a AtlasIntel de 3 a 8/10
// registrou 5.000 e divulgou 5.026), mas uma diferença maior é erro de digitação ou de registro.
const TOLERANCIA_DAS_ENTREVISTAS = 0.05;

const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
