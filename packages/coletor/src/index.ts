export { criarColetor, type Buscar, type Coletor, type OpcoesDoColetor, type RegistroDaRodada } from "./coletor.ts";
export { type ArquivoDeRodada, type ArquivoDoLugar, type Fase, type PontoDaCurvaReal } from "./arquivos.ts";
export { pastaLocal, type Destino } from "./destino.ts";
export { relogioReal, relogioSemEspera, type RelogioDoColetor } from "./relogio.ts";
export {
  AVISOS_PRONTOS,
  chavesEfetivas,
  CONTROLE_INICIAL,
  lerControle,
  NOMES_DAS_CHAVES,
  ROTULO_DA_CHAVE,
  TRECHO_COM_LINK_DO_TSE,
  type AvisoPronto,
  type ChavesDaNoite,
  type Controle,
  type NomeDaChave,
} from "./chaves.ts";
export { ARQUIVO_DE_CONTROLE, gravarArquivoDeControle, lerArquivoDeControle, type ArquivoDeControle } from "./controle.ts";
export { aplicarComando, lerComando, NOME_NO_COMANDO, type ComandoDaNoite } from "./comandos.ts";
