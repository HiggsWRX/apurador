// O build do ensaio geral (Ensaio geral, decisão 5; ticket 30): o mesmo site, num Worker próprio, com `noindex`, a
// tarja fixa em toda página e sem o Web Analytics, lendo os arquivos ao vivo do ambiente do ensaio, e o painel de antes
// das 17h com as pesquisas de 2022 (`pesquisas.ts`). Liga com `PUBLIC_ENSAIO=1`, que a configuração do build do ensaio
// (`ensaio/astro.config.mjs`) põe; o build da noite nunca a tem.

/** O build é o do ensaio geral. */
export const ENSAIO = import.meta.env.PUBLIC_ENSAIO === "1";

/** A eleição no subtítulo das páginas: a de 25/10 ou, no ensaio, a que ele reproduz. */
export const SUBTITULO_DA_ELEICAO = `Eleição para Presidente · 2º turno ${ENSAIO ? "de 30 de outubro de 2022, reproduzido no ensaio" : "em 25 de outubro de 2026"}`;

/** A tarja de toda página do ensaio, para nenhum print dele circular como resultado (Ensaio geral, decisão 5). */
export const TARJA_DO_ENSAIO = "Ensaio: reprodução da apuração de 30/10/2022. Não é resultado de 2026.";
