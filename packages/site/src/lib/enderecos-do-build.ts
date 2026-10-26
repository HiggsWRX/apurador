import { enderecosDoBuild } from "./enderecos-ao-vivo";

// Os endereços dos arquivos ao vivo que o build dá às ilhas que leem (o bloco ao vivo das páginas de lugar e o
// simulador): no build, PUBLIC_AO_VIVO (o R2) e PUBLIC_AO_VIVO_PLANO_B (o Worker do plano B); no `astro dev`, as pastas
// que o coletor publica, servidas pela integração `ao-vivo-local`. Sem nenhum, as ilhas não leem nada e ficam no estado
// de antes das 17h. Só as páginas o importam, no build.

/** Os endereços dos arquivos ao vivo deste build, o principal primeiro. */
export const ENDERECOS_DO_BUILD = enderecosDoBuild(
  import.meta.env.PUBLIC_AO_VIVO ?? (typeof __AO_VIVO_LOCAL__ === "string" ? __AO_VIVO_LOCAL__ : null),
  import.meta.env.PUBLIC_AO_VIVO_PLANO_B ?? (typeof __AO_VIVO_LOCAL_PLANO_B__ === "string" ? __AO_VIVO_LOCAL_PLANO_B__ : null),
);
