import {
  CONSTANTES_PROVISORIAS,
  ELEICAO_DE_2026,
  historicoDoAgregado,
  lerConstantes,
  pesoDasPesquisas,
  raizDoErroQuadraticoMedio,
  type OrdemDeChegada,
} from "@apurador/modelo";
import constantesDoModelo from "@apurador/modelo/constantes.json";
import {
  agregadoDaNoite,
  eleicoesPassadas,
  finalistas,
  lerInstitutos,
  lerPesquisasHistoricas,
  type FinalistaDoResultado,
  type ResultadoHistorico,
} from "@apurador/pipeline";
import constantesCsv from "../../../../docs/calibracao/constantes.csv?raw";
import kCsv from "../../../../docs/calibracao/k.csv?raw";
import noite2018Csv from "../../../../docs/calibracao/noite-2018-2.csv?raw";
import noite2022Csv from "../../../../docs/calibracao/noite-2022-2.csv?raw";
import ordemCsv from "../../../../docs/calibracao/ordem-de-chegada.csv?raw";
import sinalCsv from "../../../../docs/calibracao/sinal-de-virada.csv?raw";
import zonaCsv from "../../../../docs/calibracao/zona.csv?raw";
import historicasCsv from "../../../../dados/pesquisas-historicas.csv?raw";
import institutosCsv from "../../../../dados/pesquisas-institutos.csv?raw";
import pesquisasCsv from "../../../../dados/pesquisas.csv?raw";
import resultadosHistoricos from "../../../../dados/resultados-historicos.json";
import { formatarNumero, formatarPctComCasas, formatarPontos, formatarVotos } from "./formato";
import { nomeCurto } from "./identidade";
import { PESQUISAS_DE_2026 } from "./pesquisas";

// Os números da página de metodologia que não são o agregado do dia (Página de metodologia, decisões 2, 3, 5 e 9): as
// constantes congeladas do modelo, a lista fechada de institutos, o erro do agregado nos 2º turnos passados, o viés do
// 1º turno de 2026, as noites reproduzidas e a calibração, todos calculados no build pelo mesmo código da noite sobre os
// dados do repositório. As noites e a calibração são as do `docs/calibracao/`, que o executor de noites grava com as
// constantes congeladas (`npm run calibracao`; o CI falha se elas mudarem). Nada vem do protótipo, e a página nunca lê
// dados ao vivo.

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

const historico = historicoDoAgregado(eleicoesPassadas(historicas, resultados));

/** O resumo do erro do agregado nos 2º turnos passados: quantos anos, o menor e o maior erro e o erro típico. */
export const ERRO_HISTORICO: ErroHistorico = (() => {
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
  const { turno, placarEntreFinalistasDoBrasil: resultado } = PESQUISAS_DE_2026;
  const pesquisas = agregadoDaNoite(historicas, resultados, { ano: turno.ano, turno: turno.turno }, finalistas(turno) as [number, number]).valor;
  return { pesquisas, resultado, diferenca: resultado - pesquisas };
})();

/** A incerteza do agregado no dia da eleição, em pontos: a da decisão 5, que o modelo usa. */
export const INCERTEZA_NA_ELEICAO = ELEICAO_DE_2026.incerteza;

/** O peso das pesquisas com um % de seções totalizadas no Brasil, com o K congelado, de 0 a 1. */
export const pesoDasPesquisasCom = (secoes: number) => pesoDasPesquisas(secoes, CONSTANTES);

/** As linhas de um CSV da calibração, coluna a coluna. Só o nome da execução, no `sinal-de-virada.csv`, vem entre aspas. */
function linhasDoCsv(texto: string): Record<string, string>[] {
  // Cada campo começa numa vírgula: a da frente da linha entra só para isso, e nenhum campo vazio some.
  const campos = (linha: string) => [...`,${linha}`.matchAll(/,(?:"((?:[^"]|"")*)"|([^,]*))/g)].map((m) => m[1]?.replace(/""/g, '"') ?? m[2]!);
  const [cabecalho, ...linhas] = texto
    .split(/\r?\n/)
    .filter((l) => l !== "")
    .map(campos);
  return linhas.map((l) => Object.fromEntries(cabecalho!.map((c, i) => [c, l[i] ?? ""])));
}

// Os nomes curtos dos finalistas dos 2º turnos passados, como a página os escreve; os de 2022 e 2026 saem do `nomeCurto`.
const NOMES_PASSADOS: Record<string, string> = {
  "JOSÉ SERRA": "Serra",
  "GERALDO ALCKMIN": "Alckmin",
  DILMA: "Dilma",
  "AÉCIO NEVES": "Aécio",
  "FERNANDO HADDAD": "Haddad",
};

/** Um finalista de um 2º turno passado, com o nome curto que a página escreve e o partido daquele ano. */
export interface FinalistaPassado {
  numero: number;
  nome: string;
  partido: string;
}

/** O finalista como a página o escreve. */
export const finalistaPassado = (f: Pick<FinalistaDoResultado, "numero" | "nomeUrna" | "partido">): FinalistaPassado => ({
  numero: f.numero,
  nome: NOMES_PASSADOS[f.nomeUrna] ?? nomeCurto(f.nomeUrna),
  partido: f.partido,
});

const resultadoDo2oTurno = (ano: number) => {
  const r = resultados.find((e) => e.ano === ano && e.turno === 2);
  if (!r) throw new Error(`${ano}, 2º turno: sem resultado em resultados-historicos.json`);
  return r;
};

/** A projeção de uma base num momento de uma noite reproduzida, em % do 1º finalista da noite. */
export interface ProjecaoReproduzida {
  projecao: number;
  /** A margem de 95%, em pontos: a faixa vai da projeção menos a margem à projeção mais a margem. */
  margem: number;
}

/** Um momento de uma noite reproduzida: uma fotografia do executor de noites. */
export interface MomentoReproduzido {
  /** `AAAA-MM-DD HH:MM:SS`, em Brasília; `null` antes da primeira seção. */
  hora: string | null;
  /** O % de seções totalizadas no Brasil. */
  secoes: number;
  /** O placar parcial do Brasil, em % do 1º finalista; `null` antes da primeira seção. */
  placar: number | null;
  soApuracao: ProjecaoReproduzida;
  comPesquisas: ProjecaoReproduzida;
  /** Em 2022, a base com pesquisas com o agregado deslocado 2 pontos para o 1º e para o 2º finalista. */
  deslocadas?: readonly [ProjecaoReproduzida, ProjecaoReproduzida];
}

/** Uma noite passada reproduzida pela calibração, momento a momento, no 1º finalista dela. */
export interface NoiteReproduzida {
  ano: number;
  /** O 1º finalista do 1º turno, em cujo % vêm o placar e as projeções, e o outro. */
  finalistas: readonly [FinalistaPassado, FinalistaPassado];
  momentos: MomentoReproduzido[];
  /** O resultado final, em % do 1º finalista: o placar parcial do último momento, com 100% das seções. */
  resultado: number;
  /** O agregado de pesquisas da noite: a base com pesquisas antes da primeira seção. */
  agregado: number;
}

/**
 * Lê o CSV momento a momento de uma noite, conferindo o finalista das colunas: o da calibração
 * (`docs/calibracao/noite-<ano>-2.csv`), nos finalistas do 2º turno daquele ano, ou o da noite publicada
 * (`docs/noite/<dia>.csv`), nos finalistas dados.
 */
export function lerNoiteReproduzida(
  ano: number,
  csv: string,
  [primeiro, segundo] = resultadoDo2oTurno(ano).finalistas.map(finalistaPassado) as [FinalistaPassado, FinalistaPassado],
): NoiteReproduzida {
  const linhas = linhasDoCsv(csv);
  const placar = `placar_${primeiro.numero}`;
  if (!(placar in linhas[0]!)) throw new Error(`O CSV da noite de ${ano}: o placar não é do 1º finalista (${primeiro.numero})`);
  const base = (l: Record<string, string>, b: string): ProjecaoReproduzida => ({
    projecao: Number(l[`${b}_projecao_${primeiro.numero}`]),
    margem: Number(l[`${b}_margem`]),
  });
  const comDeslocadas = `com_pesquisas_mais_2_${primeiro.numero}_projecao_${primeiro.numero}` in linhas[0]!;
  const momentos = linhas.map((l): MomentoReproduzido => ({
    hora: l.hora || null,
    secoes: Number(l.secoes),
    placar: l[placar] ? Number(l[placar]) : null,
    soApuracao: base(l, "so_apuracao"),
    comPesquisas: base(l, "com_pesquisas"),
    ...(comDeslocadas && {
      deslocadas: [base(l, `com_pesquisas_mais_2_${primeiro.numero}`), base(l, `com_pesquisas_mais_2_${segundo.numero}`)] as const,
    }),
  }));
  const ultimo = momentos[momentos.length - 1]!;
  if (ultimo.secoes !== 100 || ultimo.placar === null) throw new Error(`O CSV da noite de ${ano}: a noite não termina com 100% das seções`);
  return { ano, finalistas: [primeiro, segundo], momentos, resultado: ultimo.placar, agregado: momentos[0]!.comPesquisas.projecao };
}

/** As noites que a seção 6 mostra (Página de metodologia, decisão 3): o 2º turno de 2022 e o de 2018, em que as pesquisas erraram. */
export const NOITES_REPRODUZIDAS: NoiteReproduzida[] = [lerNoiteReproduzida(2022, noite2022Csv), lerNoiteReproduzida(2018, noite2018Csv)];

/**
 * O momento mais perto de um % de seções: a fotografia daquele ponto, que pode ficar até meia seção abaixo dele. Numa
 * noite publicada, o primeiro com o arquivo do Brasil mais perto, que pode ficar longe do ponto.
 */
const momentoEm = (noite: NoiteReproduzida, secoes: number) =>
  noite.momentos.reduce((melhor, m) => (Math.abs(m.secoes - secoes) < Math.abs(melhor.secoes - secoes) ? m : melhor));

/** Os % de seções da tabela de erros da seção 6. */
const SECOES_DO_ERRO = [5, 25, 50] as const;

/** O erro de uma noite com um % de seções, em pontos, contra o resultado final: no placar parcial e nas duas bases. */
export interface ErroDaNoite {
  /** O % de seções totalizadas: 5, 25 ou 50. */
  secoes: number;
  /** O % de seções do momento medido, o mais perto do ponto: na noite de 25/10, 4,80% no de 5%. */
  momento: number;
  placar: number;
  soApuracao: number;
  comPesquisas: number;
}

/** O erro, em módulo, do placar parcial e da projeção nas duas bases, com 5%, 25% e 50% das seções. */
export function errosDaNoite(noite: NoiteReproduzida): ErroDaNoite[] {
  const erro = (v: number) => Math.abs(v - noite.resultado);
  return SECOES_DO_ERRO.map((secoes) => {
    const m = momentoEm(noite, secoes);
    return { secoes, momento: m.secoes, placar: erro(m.placar!), soApuracao: erro(m.soApuracao.projecao), comPesquisas: erro(m.comPesquisas.projecao) };
  });
}

/**
 * A fração dos momentos com mais de 1% das seções em que o resultado fica dentro da faixa de 95%, em cada base, de 0 a
 * 1. "Mais de 1%" deixa de fora a fotografia de 1%, como na calibração (ticket 28), mesmo quando ela passa um pouco do ponto.
 */
export function coberturaDaNoite(noite: NoiteReproduzida): { soApuracao: number; comPesquisas: number } {
  const umPorCento = momentoEm(noite, 1).secoes;
  const momentos = noite.momentos.filter((m) => m.secoes > umPorCento);
  const dentro = (p: (m: MomentoReproduzido) => ProjecaoReproduzida) =>
    momentos.filter((m) => Math.abs(p(m).projecao - noite.resultado) <= p(m).margem).length / momentos.length;
  return { soApuracao: dentro((m) => m.soApuracao), comPesquisas: dentro((m) => m.comPesquisas) };
}

/** A noite com o agregado deslocado 2 pontos para cada lado, perto da base "Só apuração" (Combinação de pesquisas e apuração, decisão 4). */
export interface PesquisasDeslocadas {
  /** O erro com 5% das seções, em pontos, com +2 para o 1º e para o 2º finalista. */
  erroEm5: readonly [number, number];
  /** O % de seções a partir do qual as duas versões ficam a menos de 0,1 ponto da "Só apuração" até o fim da noite. */
  juntasDesde: number;
}

/** A diferença abaixo da qual duas projeções coincidem, em pontos, como no aviso "As duas bases já coincidem aqui". */
const JUNTAS = 0.1;

/** Como a noite se sai com o agregado deslocado 2 pontos para cada lado: só a de 2022 tem essas versões. */
export function deslocadasDaNoite(noite: NoiteReproduzida): PesquisasDeslocadas | undefined {
  const com5 = momentoEm(noite, 5).deslocadas;
  if (!com5) return undefined;
  const longe = noite.momentos.filter((m) => m.secoes > 0 && m.deslocadas!.some((d) => Math.abs(d.projecao - m.soApuracao.projecao) >= JUNTAS));
  const ultimoLonge = longe[longe.length - 1]?.secoes ?? 0;
  return {
    erroEm5: [Math.abs(com5[0].projecao - noite.resultado), Math.abs(com5[1].projecao - noite.resultado)],
    juntasDesde: noite.momentos.find((m) => m.secoes > ultimoLonge)!.secoes,
  };
}

/** Um 2º turno passado no gráfico do agregado contra o resultado, no 1º finalista do 1º turno daquele ano. */
export interface AnoDoAgregado {
  ano: number;
  /** Os nomes curtos do 1º e do 2º finalista. */
  finalistas: readonly [string, string];
  agregado: number;
  /** A incerteza daquele ano, medida nos outros anos, em pontos. */
  incerteza: number;
  /** A faixa de 95%. */
  faixa: readonly [number, number];
  resultado: number;
  /** O agregado menos o resultado, em pontos. */
  erro: number;
}

/** O agregado contra o resultado nos 2º turnos de 2002 a 2022 (Página de metodologia, decisão 2), com a incerteza de cada ano sem ele. */
export const AGREGADO_CONTRA_RESULTADO: AnoDoAgregado[] = historico.map((a) => ({
  ano: a.ano,
  finalistas: resultadoDo2oTurno(a.ano).finalistas.map((f) => finalistaPassado(f).nome) as [string, string],
  agregado: a.agregado.valor,
  incerteza: a.agregado.incerteza,
  faixa: a.agregado.faixa,
  resultado: a.resultado,
  erro: a.erro,
}));

/** Uma constante na tabela da calibração da seção 7, como a página a escreve. */
export interface ConstanteDaCalibracao {
  nome: string;
  /** Os valores candidatos, na ordem da lista escrita antes de rodar. */
  candidatos: string;
  /** O valor das decisões, de antes da calibração. */
  provisoria: string;
  escolhida: string;
}

/** Uma medida da calibração em cada noite, com as constantes escolhidas, como a página a escreve. */
export interface MedidaDaCalibracao {
  nome: string;
  /** Na ordem das noites da calibração. */
  porNoite: string[];
  /** Uma chance de vitória, que a página mostra atrás da chave da projeção, como toda chance. */
  chanceDeVitoria?: true;
}

/** Os números de cada candidato num passo da calibração, como a página os escreve. */
export interface PassoDaCalibracao {
  titulo: string;
  colunas: string[];
  /** Uma linha por candidato, na ordem da lista, com o escolhido marcado. */
  linhas: { valores: string[]; escolhido: boolean }[];
}

/** A tabela da calibração (Ensaio geral, decisão 26): as constantes, os números por noite e os de cada passo. */
export interface TabelaDaCalibracao {
  /** Os nomes das noites: o 2º turno de 2022, o de 2018 e o 1º turno de 2026. */
  noites: string[];
  constantes: ConstanteDaCalibracao[];
  medidas: MedidaDaCalibracao[];
  /** O passo 1 em números: os candidatos, os que passaram, os que empataram e a cobertura com os valores de antes, por noite. */
  passo1: { candidatos: number; passaram: number; empataram: number; coberturaDeAntes: string[] };
  /** Os passos da ordem de chegada, do K e do sinal de virada, com os números de cada candidato. */
  passos: PassoDaCalibracao[];
}

// As medidas da calibração vão com duas casas, porque os candidatos diferem em centésimos, e arredondadas como o
// registro as arredonda (`toFixed`, em `registro-da-calibracao.ts`): o 1,8250 do K de 1% é 1,82 nos dois, e não 1,83.
const duas = (v: string | number) => Number(v).toFixed(2).replace(".", ",");
const NOMES_DAS_ORDENS: Record<OrdemDeChegada, string> = { mistura: '"mistura"', "primeiro-turno": '"1º turno"', "ritmo-da-noite": '"ritmo da noite"' };
const unidade = (zona: boolean) => (zona ? "zona" : "município");

/**
 * A tabela da calibração, dos CSVs do `docs/calibracao/`: os candidatos saem deles, e o escolhido, do `constantes.json`
 * congelado. Se as linhas escolhidas dos CSVs não forem as constantes congeladas, o build para.
 */
function tabelaDaCalibracao(csvs: Record<"constantes" | "ordem" | "k" | "sinal" | "zona", string>): TabelaDaCalibracao {
  const [constantes, ordens, ks, sinais, zonas] = [csvs.constantes, csvs.ordem, csvs.k, csvs.sinal, csvs.zona].map(linhasDoCsv) as Record<string, string>[][];
  const unicos = (linhas: Record<string, string>[], coluna: string) => [...new Set(linhas!.map((l) => Number(l[coluna])))];
  const escolhida = constantes!.find((l) => l.escolhido === "sim")!;
  const ordem = ordens!.find((l) => l.escolhida === "sim")!;
  const k = ks!.find((l) => l.escolhido === "sim")!;
  const limite = sinais!.find((l) => l.escolhido === "sim")!.limite!;
  const escolhidas = CONSTANTES;
  const congeladas = [
    [Number(escolhida.incerteza_regional), escolhidas.incertezaRegional],
    [Number(escolhida.incerteza_nacional), escolhidas.incertezaNacional],
    [Number(escolhida.peso_do_municipio), escolhidas.pesoDoMunicipio],
    [ordem.ordem, escolhidas.ordemDeChegada],
    [Number(k.k), escolhidas.secoesDasPesquisas],
    [Number(limite), 100 * escolhidas.sinalDeVirada.possivel],
  ];
  if (congeladas.some(([csv, json]) => csv !== json)) throw new Error("docs/calibracao/: as linhas escolhidas não são as constantes do constantes.json");

  const provisorias = CONSTANTES_PROVISORIAS;
  const incerteza = (coluna: string) => `${unicos(constantes!, coluna).map(formatarNumero).join(" · ")} pontos`;
  const pct = (n: number) => `${formatarNumero(n)}%`;
  const NOITES = ["2022-2", "2018-2", "2026-1"];
  const porNoite = (f: (noite: string) => string) => NOITES.map(f);
  /** A maior fração dos momentos "sem sinal de virada" de municípios seguidos de virada, em %, entre as execuções dadas. */
  const municipiosQueViraram = (execucoes: Record<string, string>[]) =>
    Math.max(...execucoes.map((l) => (100 * Number(l.municipios_seguidos_de_virada)) / Number(l.municipios_sem_sinal)));
  const sinalNaNoite = (noite: string) => municipiosQueViraram(sinais!.filter((l) => l.limite === limite && l.execucao!.startsWith(NOMES_DAS_NOITES[noite]!)));
  const provisoria = constantes!.find(
    (l) =>
      Number(l.incerteza_regional) === provisorias.incertezaRegional &&
      Number(l.incerteza_nacional) === provisorias.incertezaNacional &&
      Number(l.peso_do_municipio) === provisorias.pesoDoMunicipio,
  )!;
  // As colunas do K com o agregado deslocado levam o número do finalista que ganha os 2 pontos (`_mais_2_13`).
  const deslocadas = Object.keys(k)
    .map((coluna) => /^maior_erro_ate_5_2022-2_mais_2_(\d+)$/.exec(coluna))
    .filter((m) => m !== null)
    .map((m) => ({ coluna: m[0], para: finalistaPassado(resultadoDo2oTurno(2022).finalistas.find((f) => f.numero === Number(m[1]))!).nome }));
  return {
    noites: NOITES.map((n) => NOMES_DAS_NOITES[n]!),
    constantes: [
      {
        nome: "Desvio de cada estado",
        candidatos: incerteza("incerteza_regional"),
        provisoria: formatarPontos(provisorias.incertezaRegional, true),
        escolhida: formatarPontos(escolhidas.incertezaRegional, true),
      },
      {
        nome: "Desvio comum do país",
        candidatos: incerteza("incerteza_nacional"),
        provisoria: formatarPontos(provisorias.incertezaNacional, true),
        escolhida: formatarPontos(escolhidas.incertezaNacional, true),
      },
      {
        nome: "Peso do próprio município",
        candidatos: `${unicos(constantes!, "peso_do_municipio").map(formatarVotos).join(" · ")} votos`,
        provisoria: `${formatarVotos(provisorias.pesoDoMunicipio)} votos`,
        escolhida: `${formatarVotos(escolhidas.pesoDoMunicipio)} votos`,
      },
      {
        nome: "Ordem de chegada",
        candidatos: ordens!.map((l) => NOMES_DAS_ORDENS[l.ordem as OrdemDeChegada]).join(" · "),
        provisoria: NOMES_DAS_ORDENS[provisorias.ordemDeChegada],
        escolhida: NOMES_DAS_ORDENS[escolhidas.ordemDeChegada],
      },
      {
        nome: "K, as seções que as pesquisas valem",
        candidatos: unicos(ks!, "k").map(pct).join(" · "),
        provisoria: pct(provisorias.secoesDasPesquisas),
        escolhida: pct(escolhidas.secoesDasPesquisas),
      },
      {
        nome: 'Limite de "sem sinal de virada"',
        candidatos: unicos(sinais!, "limite").map(pct).join(" · "),
        provisoria: pct(100 * provisorias.sinalDeVirada.possivel),
        escolhida: pct(100 * escolhidas.sinalDeVirada.possivel),
      },
      {
        nome: "Unidade do modelo",
        candidatos: [false, true].map(unidade).join(" · "),
        provisoria: unidade(provisorias.zona),
        escolhida: unidade(escolhidas.zona),
      },
    ],
    medidas: [
      {
        nome: "Resultado dentro da faixa de 95%, depois de 1% das seções",
        porNoite: porNoite((n) => formatarPctComCasas(Number(escolhida[`cobertura_${n}`]), 1)),
      },
      {
        nome: "Maior chance de vitória de quem perdeu, depois de 5% das seções",
        porNoite: porNoite((n) => formatarPctComCasas(Number(escolhida[`maior_chance_de_quem_perdeu_${n}`]), 1)),
        chanceDeVitoria: true,
      },
      { nome: "Erro médio da projeção, de 5% a 50% das seções", porNoite: porNoite((n) => duas(escolhida[`erro_medio_${n}`]!)) },
      { nome: "Margem de 95% média, de 5% a 50% das seções", porNoite: porNoite((n) => duas(escolhida[`margem_media_${n}`]!)) },
      { nome: "Erro da curva projetada, de 5% a 50% das seções", porNoite: porNoite((n) => duas(ordem[`erro_da_curva_${n}`]!)) },
      { nome: "Maior erro até 5% das seções, com pesquisas", porNoite: porNoite((n) => duas(k[`maior_erro_ate_5_${n}`]!)) },
      { nome: 'Municípios "sem sinal de virada" que viraram depois', porNoite: porNoite((n) => `${duas(sinalNaNoite(n))}%`) },
      { nome: "Erro médio com as zonas no lugar do município", porNoite: porNoite((n) => duas(zonas!.find((l) => l.noite === n)!.erro_medio_zonas!)) },
    ],
    passo1: {
      candidatos: constantes!.length,
      passaram: constantes!.filter((l) => l.passa === "sim").length,
      empataram: constantes!.filter((l) => l.empata === "sim").length,
      coberturaDeAntes: porNoite((n) => formatarPctComCasas(Number(provisoria[`cobertura_${n}`]), 1)),
    },
    passos: [
      {
        titulo: "Ordem de chegada: o erro da curva projetada, em pontos, de 5% a 50% das seções",
        colunas: ["Ordem", ...porNoite((n) => NOMES_DAS_NOITES[n]!), "Média"],
        linhas: ordens!.map((l) => ({
          valores: [NOMES_DAS_ORDENS[l.ordem as OrdemDeChegada], ...porNoite((n) => duas(l[`erro_da_curva_${n}`]!)), duas(l.erro_da_curva!)],
          escolhido: l.escolhida === "sim",
        })),
      },
      {
        titulo: "K: o maior erro, em pontos, de 0,1% a 5% das seções, na base Apuração + pesquisas",
        colunas: [
          "K",
          NOMES_DAS_NOITES["2022-2"]!,
          ...deslocadas.map((d) => `2022, +2 para ${d.para}`),
          NOMES_DAS_NOITES["2018-2"]!,
          NOMES_DAS_NOITES["2026-1"]!,
          "Pior caso",
        ],
        linhas: ks!.map((l) => ({
          valores: [
            pct(Number(l.k)),
            duas(l["maior_erro_ate_5_2022-2"]!),
            ...deslocadas.map((d) => duas(l[d.coluna]!)),
            duas(l["maior_erro_ate_5_2018-2"]!),
            duas(l["maior_erro_ate_5_2026-1"]!),
            duas(l.pior_caso!),
          ],
          escolhido: l.escolhido === "sim",
        })),
      },
      {
        titulo: 'Sinal de virada: os momentos "sem sinal de virada" seguidos de virada, nas oito execuções',
        colunas: ["Limite", "Brasil, estados e Exterior", "Municípios, no pior caso"],
        linhas: unicos(sinais!, "limite").map((valor) => {
          const execucoes = sinais!.filter((l) => Number(l.limite) === valor);
          const lugares = [...new Set(execucoes.flatMap((l) => l.lugares_de_cima_com_virada!.split(" ").filter((x) => x !== "")))];
          return {
            valores: [pct(valor), lugares.length > 0 ? lugares.join(", ") : "nenhum", `${duas(municipiosQueViraram(execucoes))}%`],
            escolhido: execucoes.some((l) => l.escolhido === "sim"),
          };
        }),
      },
    ],
  };
}

/** As noites da calibração pelo nome com que os CSVs e a página as escrevem. */
const NOMES_DAS_NOITES: Record<string, string> = { "2022-2": "2º turno de 2022", "2018-2": "2º turno de 2018", "2026-1": "1º turno de 2026" };

/** A tabela da calibração que a seção 7 mostra. */
export const CALIBRACAO = tabelaDaCalibracao({ constantes: constantesCsv, ordem: ordemCsv, k: kCsv, sinal: sinalCsv, zona: zonaCsv });

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

const noiteParaBaixar = (ano: number) =>
  `a noite do 2º turno de ${ano} reproduzida, momento a momento: o placar parcial e a projeção nas duas bases${ano === 2022 ? " e com as pesquisas deslocadas" : ""}`;

/**
 * Os CSVs para baixar (Página de metodologia, decisão 6): os mesmos arquivos do repositório, servidos em `/dados/` pelo
 * endpoint `pages/dados/[arquivo].csv.ts`. Um CSV novo entra só aqui. Das noites reproduzidas, só as de 2022 e de 2018,
 * as da seção 6: o 1º turno de 2026 aparece só na tabela da calibração (decisão 3).
 */
export const PARA_BAIXAR: ArquivoParaBaixar[] = [
  paraBaixar("pesquisas.csv", "as pesquisas da lista, com a fonte de cada uma", pesquisasCsv),
  paraBaixar(
    "pesquisas-historicas.csv",
    `as pesquisas finais dos 2º turnos de ${ERRO_HISTORICO.anos[0]} a ${ERRO_HISTORICO.anos[1]} e as do 1º turno de 2026, com a fonte`,
    historicasCsv,
  ),
  paraBaixar("noite-2022-2.csv", noiteParaBaixar(2022), noite2022Csv),
  paraBaixar("noite-2018-2.csv", noiteParaBaixar(2018), noite2018Csv),
  paraBaixar("calibracao-constantes.csv", "a calibração dos desvios e do peso do município: cada candidato, com os números por noite", constantesCsv),
  paraBaixar("calibracao-ordem-de-chegada.csv", "a calibração da ordem de chegada: o erro da curva projetada, por noite", ordemCsv),
  paraBaixar("calibracao-k.csv", "a calibração do K: o maior erro até 5% das seções, em cada caso", kCsv),
  paraBaixar("calibracao-sinal-de-virada.csv", 'a calibração do limite de "sem sinal de virada", por execução', sinalCsv),
  paraBaixar("calibracao-zona.csv", "a calibração da zona: o erro com o município inteiro e com as zonas, por noite", zonaCsv),
];
