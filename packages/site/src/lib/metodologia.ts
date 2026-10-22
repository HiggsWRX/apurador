import { ELEICAO_DE_2026, historicoDoAgregado, lerConstantes, pesoDasPesquisas, raizDoErroQuadraticoMedio } from "@apurador/modelo";
import constantesDoModelo from "@apurador/modelo/constantes.json";
import { agregadoDaNoite, eleicoesPassadas, finalistas, lerInstitutos, lerPesquisasHistoricas, type ResultadoHistorico } from "@apurador/pipeline";
import historicasCsv from "../../../../dados/pesquisas-historicas.csv?raw";
import institutosCsv from "../../../../dados/pesquisas-institutos.csv?raw";
import pesquisasCsv from "../../../../dados/pesquisas.csv?raw";
import resultadosHistoricos from "../../../../dados/resultados-historicos.json";
import { PLACAR_ENTRE_FINALISTAS_DO_BRASIL, TURNO } from "./pesquisas";

// Os números da página de metodologia que não são o agregado do dia (Página de metodologia, decisões 5 e 9): as
// constantes congeladas do modelo, a lista fechada de institutos, o erro do agregado nos 2º turnos passados e o viés do
// 1º turno de 2026, todos calculados no build pelo mesmo código da noite sobre os dados do repositório. Nada vem do
// protótipo, e a página nunca lê dados ao vivo.

/** As constantes do modelo que a calibração congelou: a página as cita, em vez de repetir os números das decisões. */
export const CONSTANTES = lerConstantes(constantesDoModelo);

/**
 * Os institutos da lista fechada, um nome por instituto e em ordem alfabética, mesmo que um instituto entre por dois
 * CNPJs. Quando as pesquisas de um CNPJ saem com outro nome, que não está no da lista, ele aparece ao lado: "FSB (hoje
 * Nexus)", porque a Nexus conta como FSB (ticket 03).
 */
export function institutosDaLista(csv: string): string[] {
  const porInstituto = Map.groupBy(lerInstitutos(csv), (c) => c.institutoDaLista);
  return [...porInstituto]
    .map(([nome, cnpjs]) => {
      const outrosNomes = [...new Set(cnpjs.map((c) => c.instituto))].filter((n) => !nome.includes(n));
      return outrosNomes.length > 0 ? `${nome} (hoje ${outrosNomes.join(", ")})` : nome;
    })
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Os institutos da lista fechada, como a seção 1 os lista. */
export const INSTITUTOS = institutosDaLista(institutosCsv);

const historicas = lerPesquisasHistoricas(historicasCsv);
const resultados = (resultadosHistoricos as { eleicoes: ResultadoHistorico[] }).eleicoes;

/** O erro do agregado nos 2º turnos passados, pela regra de 2026, em pontos do primeiro finalista: o que a seção 1 resume. */
export interface ErroHistorico {
  /** O primeiro e o último ano. */
  anos: [number, number];
  quantidade: number;
  /** O menor e o maior erro, em módulo. */
  menor: number;
  maior: number;
  /** A raiz do erro quadrático médio dos anos: o erro típico da média. */
  raiz: number;
  /** A incerteza do agregado no dia da eleição (decisão 5 do agregado): √(raiz² + 0,7²), arredondada nas decisões. */
  incertezaNaEleicao: number;
}

/** A dúvida sobre o viés do 1º turno que entra na incerteza da noite, em pontos (Agregado de pesquisas e erro histórico, decisão 5). */
export const DUVIDA_DO_VIES = 0.7;

/** O resumo do erro do agregado nos 2º turnos passados: quantos anos, o menor e o maior erro e o erro típico. */
export const ERRO_HISTORICO: ErroHistorico = (() => {
  const historico = historicoDoAgregado(eleicoesPassadas(historicas, resultados));
  const erros = historico.map((a) => Math.abs(a.erro));
  const raiz = raizDoErroQuadraticoMedio(erros);
  return {
    anos: [historico[0]!.ano, historico[historico.length - 1]!.ano],
    quantidade: historico.length,
    menor: Math.min(...erros),
    maior: Math.max(...erros),
    raiz,
    incertezaNaEleicao: Math.sqrt(raiz ** 2 + DUVIDA_DO_VIES ** 2),
  };
})();

/** O viés do 1º turno de 2026, entre os dois finalistas, em % do primeiro: o que as pesquisas davam e o que ele teve. */
export interface ViesDoPrimeiroTurno {
  /** O agregado das pesquisas finais do 1º turno, pela regra do agregado, entre os dois finalistas. */
  pesquisas: number;
  /** O placar entre finalistas do Brasil no 1º turno. */
  resultado: number;
  /** Resultado menos pesquisas: positivo quando as pesquisas subestimaram o primeiro finalista. */
  diferenca: number;
}

/** O viés do 1º turno de 2026, pela regra do agregado sobre as pesquisas finais do 1º turno (ticket 05). */
export const VIES_DO_PRIMEIRO_TURNO: ViesDoPrimeiroTurno = (() => {
  const pesquisas = agregadoDaNoite(historicas, resultados, { ano: TURNO.ano, turno: TURNO.turno }, finalistas(TURNO) as [number, number]).valor;
  return { pesquisas, resultado: PLACAR_ENTRE_FINALISTAS_DO_BRASIL, diferenca: PLACAR_ENTRE_FINALISTAS_DO_BRASIL - pesquisas };
})();

/** A incerteza do agregado no dia da eleição, em pontos: a da decisão 5, que o modelo usa. */
export const INCERTEZA_NA_ELEICAO = ELEICAO_DE_2026.incerteza;

/** O peso das pesquisas com um % de seções totalizadas no Brasil, com o K congelado, de 0 a 1. */
export const pesoDasPesquisasCom = (secoes: number) => pesoDasPesquisas(secoes, CONSTANTES);

/** Um arquivo para baixar na seção 9: o caminho no site, o que ele é, o tamanho e o texto que o endpoint serve. */
export interface ArquivoParaBaixar {
  /** `/dados/<nome>`. */
  caminho: string;
  /** O nome do arquivo, `pesquisas.csv`. */
  nome: string;
  descricao: string;
  /** Em KB, arredondado para cima, nunca 0. */
  kb: number;
  /** O CSV, como está no repositório. */
  texto: string;
}

const kb = (texto: string) => Math.max(1, Math.ceil(new TextEncoder().encode(texto).length / 1024));

const paraBaixar = (nome: string, descricao: string, texto: string): ArquivoParaBaixar => ({
  caminho: `/dados/${nome}`,
  nome,
  descricao,
  kb: kb(texto),
  texto,
});

/**
 * Os CSVs para baixar (Página de metodologia, decisão 6): os mesmos arquivos do repositório, servidos em `/dados/` pelo
 * endpoint `pages/dados/[arquivo].csv.ts`. Um CSV novo entra só aqui.
 */
export const PARA_BAIXAR: ArquivoParaBaixar[] = [
  paraBaixar("pesquisas.csv", "as pesquisas da lista, com a fonte de cada uma", pesquisasCsv),
  paraBaixar(
    "pesquisas-historicas.csv",
    `as pesquisas finais dos 2º turnos de ${ERRO_HISTORICO.anos[0]} a ${ERRO_HISTORICO.anos[1]} e as do 1º turno de 2026, com a fonte`,
    historicasCsv,
  ),
];
