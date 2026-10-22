export { doTurno, idDoTurno, resultadoDoTurno, TOTAIS, type CandidatoDoTurno, type ResultadoOficialDoLugar, type Turno } from "./turno.ts";
export {
  assinaturaDosLugares,
  compararIds,
  idDoMunicipio,
  indiceDeLugares,
  nomeCompleto,
  ordemDoMapa,
  type Artigo,
  type Lugar,
  type TipoDeLugar,
} from "./lugares.ts";
export { conferirTotais, type Divergencia } from "./conferencia.ts";
export {
  dataHoraDoInstante,
  instanteDaNoite,
  lerNoite,
  reconstruirNoite,
  reproduzir,
  type Chegada,
  type Noite,
  type Recorte,
  type Reproducao,
  type Totais,
  type ZonaDaNoite,
} from "./noite.ts";
export { baseDoModelo, indicadoresDaBase, type BaseDoModelo, type BaseDoMunicipio } from "./base.ts";
export type { CurvaDeComparacao, CurvasDoTurno } from "./curvas.ts";
export {
  finalistas,
  lerInstitutos,
  listaDasPesquisas,
  pesquisasDoAgregado,
  type CnpjDaLista,
  type ExtratoDoTse,
  type Modo,
  type Pesquisa,
  type PesquisaDaLista,
} from "./pesquisas.ts";
export { agregadoDaNoite, eleicoesPassadas, lerPesquisasHistoricas, type PesquisaHistorica } from "./pesquisas-historicas.ts";
export { conferirResultadosHistoricos, resultadoHistorico, type FinalistaDoResultado, type ResultadoHistorico } from "./resultados-historicos.ts";
export { cadastroDaNoite, lerCadastro, type Cadastro, type CandidatoDoCadastro, type MunicipioDoCadastro, type UfDoCadastro } from "./cadastro.ts";
