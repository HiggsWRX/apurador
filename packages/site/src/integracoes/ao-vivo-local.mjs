import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

// No desenvolvimento (`astro dev`), a ilha do bloco ao vivo lê a pasta local que o coletor publica sobre o TSE falso,
// servida em /ao-vivo/ como a CDN serve: com ETag, 304 ao `If-None-Match` e o cabeçalho `Date`, que o Node põe em toda
// resposta. A pasta é a do coletor sem `--pasta` (`.cache/coletor/publicado`) ou a de APURADOR_PUBLICADO. Só o comando
// `dev` liga isto: o build (inclusive o dos testes) nunca lê a pasta local.
// Uso, em três terminais: npm run tse-falso -- --partida 16:58 · npm run coletor -- --tse http://127.0.0.1:8022/oficial · npm run dev -w @apurador/site

const PADRAO = fileURLToPath(new URL("../../../../.cache/coletor/publicado/", import.meta.url));
const CAMINHO = "/ao-vivo/";

/** A integração do Astro que, no `astro dev`, serve a pasta publicada e a dá à ilha como raiz dos arquivos ao vivo. */
export function aoVivoLocal() {
  return {
    name: "apurador:ao-vivo-local",
    hooks: {
      "astro:config:setup": ({ command, updateConfig }) => {
        if (command !== "dev") return;
        updateConfig({ vite: { plugins: [servirPasta(process.env.APURADOR_PUBLICADO ?? PADRAO)], define: { __AO_VIVO_LOCAL__: JSON.stringify(CAMINHO) } } });
      },
    },
  };
}

function servirPasta(pasta) {
  return {
    name: "apurador:ao-vivo-local",
    configureServer(servidor) {
      servidor.middlewares.use(CAMINHO, async (pedido, resposta) => {
        const caminho = normalize(decodeURIComponent((pedido.url ?? "/").split("?")[0])).replace(/^[/\\]+/, "");
        if (caminho.startsWith("..")) {
          resposta.statusCode = 403;
          return resposta.end();
        }
        let bytes;
        try {
          bytes = await readFile(join(pasta, caminho));
        } catch {
          resposta.statusCode = 404;
          return resposta.end();
        }
        const etag = `"${createHash("sha1").update(bytes).digest("hex")}"`;
        resposta.setHeader("ETag", etag);
        resposta.setHeader("Cache-Control", "no-cache");
        if (pedido.headers["if-none-match"] === etag) {
          resposta.statusCode = 304;
          return resposta.end();
        }
        resposta.setHeader("Content-Type", "application/json");
        resposta.end(bytes);
      });
    },
  };
}
