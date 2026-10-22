export { criarColetor, type Buscar, type Coletor, type OpcoesDoColetor, type RegistroDaRodada } from "./coletor.ts";
export {
  type ArquivoDeRodada,
  type ArquivoDoLugar,
  type Fase,
  type PontoDaCurvaProjetada,
  type PontoDaCurvaReal,
  type ProjecaoDoLugar,
  type ProjecaoNaBase,
} from "./arquivos.ts";
export { type EntradaDaProjecao } from "./projecao.ts";
export { lerEntradaDaProjecao, NOITES_DA_PROJECAO, type NoiteDaProjecao } from "./entrada-da-projecao.ts";
export { type EventoDaNarracao, type TipoDeEvento } from "./narracao.ts";
export { pastaLocal, type Destino } from "./destino.ts";
export { destinoR2, type CredenciaisDoR2 } from "./r2.ts";
export { republicacaoDoWorker } from "./plano-b.ts";
export { criarContadorDeGravacoes, type ContadorDeGravacoes, type GravacoesDoMes } from "./contador.ts";
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
