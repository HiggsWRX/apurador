export { criarTseFalso, type EntradaDoRegistro, type Pedido, type Registro, type Resposta, type TseFalso } from "./tse-falso.ts";
export {
  relogioAcelerado,
  relogioDoReplay,
  relogioManual,
  RITMO_DO_ENSAIO,
  ritmoDesde,
  type Momento,
  type Relogio,
  type RelogioManual,
  type Trecho,
} from "./relogio.ts";
export { buscarNoTseFalso, servirTseFalso } from "./servidor.ts";
export { conferirPlacar, resultadosDoTseFalso, type PlacarPublicado } from "./conferencia.ts";
export { conferirPreditivos, type JsonPublico } from "./conferencia-dos-preditivos.ts";
export {
  calibrar,
  CANDIDATOS,
  casosDoK,
  erroDaCurva,
  escolherConstantesDoModelo,
  escolherK,
  escolherLimite,
  escolherOrdem,
  escolherZona,
  execucoesDoSinal,
  medirNoite,
  medirOrdem,
  medirSinal,
  noiteMomentoAMomento,
  placarReal,
  semSinalSeguidoDeVirada,
  type Calibracao,
  type CandidatoDoPasso1,
  type CasoDoK,
  type Execucao,
  type IncertezasEPeso,
  type LinhaMomentoAMomento,
  type LugarNoMomento,
  type MedidaDaNoite,
  type MedidaDoSinal,
} from "./calibracao.ts";
export { lerNoitesDaCalibracao, type NoiteDaCalibracao } from "./noites-da-calibracao.ts";
