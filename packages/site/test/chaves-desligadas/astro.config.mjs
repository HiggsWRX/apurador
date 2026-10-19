import { fileURLToPath } from "node:url";
import { mergeConfig } from "astro/config";
import site from "../../astro.config.mjs";

// O site como vai ao ar, com um arquivo de chaves diferente: o deste diretório, com todas as chaves desligadas.
// Nada no código do site muda; só o arquivo de dados que ele lê.
export default mergeConfig(site, {
  root: fileURLToPath(new URL("../..", import.meta.url)),
  outDir: "./dist-chaves-desligadas",
  vite: {
    resolve: {
      alias: [{ find: /^.*\/dados\/chaves\.json$/, replacement: fileURLToPath(new URL("./chaves.json", import.meta.url)) }],
    },
  },
});
