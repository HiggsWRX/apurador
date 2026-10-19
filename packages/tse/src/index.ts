export { lerMembroRemoto, type Buscar, type MembroRemoto } from "./zip-remoto.ts";
export {
  lerDetalheVotacaoMunzona,
  lerVotacaoCandidatoMunzona,
  membroDePresidente,
  urlDadosAbertos,
  type ArquivoHistorico,
  type DetalheMunzona,
  type VotoCandidatoMunzona,
} from "./historico.ts";
export { boletimDeUrna, lerBoletimDeUrna, lerDetalheVotacaoSecao, lerVotacaoSecao, votacaoSecao, type DetalheSecao, type VotoSecao } from "./secao.ts";
export { historicoDeTotalizacao, lerHistoricoDeTotalizacao, type LinhaDoHistorico } from "./totalizacao.ts";
export { lerMunicipioTseIbge, MEMBRO_MUNICIPIO_TSE_IBGE, URL_MUNICIPIO_TSE_IBGE, type MunicipioTseIbge } from "./municipio-tse-ibge.ts";
export { abrangenciaDoRegistro, lerRegistrosDePesquisas, membroDoBrasil, urlRegistrosDePesquisas, type RegistroDePesquisa } from "./pesquisas.ts";
export { lerCandidaturas, membroCandidaturasDoBrasil, urlCandidaturas, type Candidatura } from "./candidaturas.ts";
export { lerConfiguracaoDeMunicipios, type ConfiguracaoDeMunicipios, type MunicipioDaConfiguracao } from "./configuracao.ts";
export {
  ArquivoDoTseInvalido,
  eleicaoDaConfiguracao,
  lerAcompanhamento,
  lerResultado,
  urlDasEleicoes,
  urlsDaDivulgacao,
  type AbrangenciaDaDivulgacao,
  type AcompanhamentoDoTse,
  type CandidatoDoResultado,
  type EleicaoDaDivulgacao,
  type ItemDoAcompanhamento,
  type ResultadoDoTse,
  type SecoesDoTse,
} from "./ao-vivo.ts";
