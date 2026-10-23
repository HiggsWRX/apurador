export {
  criarColetor,
  type Buscar,
  type Coletor,
  type OpcoesDoColetor,
  type ProjecaoDoBrasilNaRodada,
  type RegistroDaRodada,
  type TipoDoArquivoDoTse,
} from "./coletor.ts";
export { criarPainelDoColetor, type LeituraDeFora, type MedidaDoComputador, type OpcoesDoPainelDoColetor, type PainelDoColetor } from "./painel-do-coletor.ts";
export { despacharAlertas, LIMITES_DOS_ALERTAS, type Alerta, type IdDoAlerta, type LimitesDosAlertas, type NivelDoAlerta } from "./alertas.ts";
export { placarDoArquivoDoTse, type PlacarDoTse } from "./placar-conferido.ts";
export { enviarAoNtfy, type MensagemDoNtfy } from "./ntfy.ts";
export {
  type ArquivoDeRodada,
  type ArquivoDoLugar,
  type ArquivoDoMapa,
  type BaseDaProjecao,
  type ColunasDaBase,
  type Fase,
  type MunicipiosDaTabela,
  type NumerosDaProjecao,
  type PontoDaCurvaProjetada,
  type PontoDaCurvaReal,
  type ProjecaoDoLugar,
  type ProjecaoNaBase,
  type ProjecoesDosMunicipios,
  type TabelaDeProjecoes,
} from "./arquivos.ts";
export { type EntradaDaProjecao } from "./projecao.ts";
export { lerEntradaDaProjecao, NOITES_DA_PROJECAO, type NoiteDaProjecao } from "./entrada-da-projecao.ts";
export { ehPreditivo, TIPOS_PREDITIVOS, type EventoDaNarracao, type TipoDeEvento } from "./narracao.ts";
export { pastaLocal, type Destino } from "./destino.ts";
export { destinoR2, type CredenciaisDoR2 } from "./r2.ts";
export { republicacaoDoWorker, type DestinoDoPlanoB } from "./plano-b.ts";
export { AMBIENTES, type AmbienteDoR2 } from "./ambientes.ts";
export { ARQUIVO_DO_CONTADOR, criarContadorDeGravacoes, lerContadorDeGravacoes, type ContadorDeGravacoes, type GravacoesDoMes } from "./contador.ts";
export { relogioReal, relogioSemEspera, type RelogioDoColetor } from "./relogio.ts";
export {
  AVISOS_PRONTOS,
  CHAVES_DA_NOITE,
  chavesEfetivas,
  CONTROLE_INICIAL,
  lerChaves,
  lerControle,
  NOMES_DAS_CHAVES,
  TRECHO_COM_LINK_DO_TSE,
  type AvisoPronto,
  type ChavesDaNoite,
  type Controle,
  type NomeDaChave,
} from "./chaves.ts";
export { ARQUIVO_DE_CONTROLE, controleDoArquivoDeChaves, gravarArquivoDeControle, lerArquivoDeControle, type ArquivoDeControle } from "./controle.ts";
