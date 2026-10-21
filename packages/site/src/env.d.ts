/** A raiz dos arquivos ao vivo no `astro dev`, posta pela integração `ao-vivo-local`. Fora dele, não existe. */
declare const __AO_VIVO_LOCAL__: string | undefined;
/** A raiz da pasta do plano B local no `astro dev`, posta pela mesma integração. */
declare const __AO_VIVO_LOCAL_PLANO_B__: string | undefined;

interface ImportMetaEnv {
  /** A raiz pública dos arquivos ao vivo no build, com a barra no fim. Sem ela, a ilha não lê nada. */
  readonly PUBLIC_AO_VIVO?: string;
  /** O endereço do Worker do plano B, com a barra no fim. Sem PUBLIC_AO_VIVO (sem domínio), é o único que a ilha lê. */
  readonly PUBLIC_AO_VIVO_PLANO_B?: string;
}
