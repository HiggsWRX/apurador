/** A raiz dos arquivos ao vivo no `astro dev`, posta pela integração `ao-vivo-local`. Fora dele, não existe. */
declare const __AO_VIVO_LOCAL__: string | undefined;

interface ImportMetaEnv {
  /** A raiz pública dos arquivos ao vivo no build, com a barra no fim. Sem ela, a ilha não lê nada. */
  readonly PUBLIC_AO_VIVO?: string;
}
