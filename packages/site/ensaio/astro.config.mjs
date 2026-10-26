import { fileURLToPath } from "node:url";
import { mergeConfig } from "astro/config";
import site from "../astro.config.mjs";

// O build do site do ensaio geral (Ensaio geral, decisão 5; ticket 30): o mesmo código, com `PUBLIC_ENSAIO` (noindex,
// tarja, sem Web Analytics e o painel de antes das 17h com as pesquisas de 2022, `src/lib/ensaio.ts`), os endereços dos
// arquivos ao vivo do ambiente do ensaio e um `_headers` próprio, com `noindex` no Worker dele. Sai em `dist-ensaio/`,
// que `wrangler.jsonc`, ao lado, publica no Worker `apurador-ensaio`, nunca no `apurador` da noite.
// Uso: npm run deploy-ensaio. Sem o domínio `ao-vivo-ensaio.apurador.org`, com APURADOR_SEM_DOMINIO=1: só o plano B.
// Os endereços são os de `AMBIENTES.ensaio` (packages/coletor/src/ambientes.ts), que o teste do build confere.
const semDominio = process.env.APURADOR_SEM_DOMINIO === "1";
process.env.PUBLIC_ENSAIO = "1";
process.env.PUBLIC_AO_VIVO = semDominio ? "" : "https://ao-vivo-ensaio.apurador.org/";
process.env.PUBLIC_AO_VIVO_PLANO_B = "https://apurador-ensaio-plano-b.hicampos93.workers.dev/";

export default mergeConfig(site, {
  root: fileURLToPath(new URL("..", import.meta.url)),
  outDir: "./dist-ensaio",
  publicDir: "./ensaio/public",
});
