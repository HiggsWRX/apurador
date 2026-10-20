import { fileURLToPath } from "node:url";
import { mergeConfig } from "astro/config";
import site from "../../astro.config.mjs";

// O site como vai ao ar, só com a projeção de antes das 17h desligada e o agregado ligado: o caso em que o advogado
// nega o item 1 da Confirmação dos textos preditivos. Nada no código do site muda; só o arquivo de chaves que ele lê.
export default mergeConfig(site, {
  root: fileURLToPath(new URL("../..", import.meta.url)),
  outDir: "./dist-projecao-desligada",
  vite: {
    resolve: {
      alias: [{ find: /^.*\/dados\/chaves\.json$/, replacement: fileURLToPath(new URL("./chaves.json", import.meta.url)) }],
    },
  },
});
