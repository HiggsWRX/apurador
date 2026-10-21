import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

// No desenvolvimento (`astro dev`), a ilha do bloco ao vivo lê a pasta local que o coletor publica sobre o TSE falso,
// servida em /ao-vivo/ como a CDN serve: com ETag, 304 ao `If-None-Match` e o cabeçalho `Date`, que o Node põe em toda
// resposta. A pasta é a do coletor sem `--pasta` (`.cache/coletor/publicado`) ou a de APURADOR_PUBLICADO. A do plano B,
// a mesma com `-plano-b` no nome, vai em /ao-vivo-plano-b/: depois de `npm run noite -- plano-b`, a página passa a ela
// como passaria ao Worker. Só o comando `dev` liga isto: o build (inclusive o dos testes) nunca lê a pasta local.
// Uso: npm run noite-local (o TSE falso e o coletor juntos) e npm run dev -w @apurador/site.

const PADRAO = fileURLToPath(new URL("../../../../.cache/coletor/publicado/", import.meta.url));
const CAMINHO = "/ao-vivo/";
const CAMINHO_DO_PLANO_B = "/ao-vivo-plano-b/";

/** A integração do Astro que, no `astro dev`, serve as pastas publicadas e as dá à ilha como endereços dos arquivos ao vivo. */
export function aoVivoLocal() {
  return {
    name: "apurador:ao-vivo-local",
    hooks: {
      "astro:config:setup": ({ command, updateConfig }) => {
        if (command !== "dev") return;
        const pasta = process.env.APURADOR_PUBLICADO ?? PADRAO;
        // A regra de `pastaDoPlanoBLocal`, no coletor (packages/coletor/src/ambientes.ts).
        const doPlanoB = `${pasta.replace(/[\\/]+$/, "")}-plano-b`;
        updateConfig({
          vite: {
            plugins: [servirPasta(CAMINHO, pasta), servirPasta(CAMINHO_DO_PLANO_B, doPlanoB)],
            define: { __AO_VIVO_LOCAL__: JSON.stringify(CAMINHO), __AO_VIVO_LOCAL_PLANO_B__: JSON.stringify(CAMINHO_DO_PLANO_B) },
          },
        });
      },
    },
  };
}

function servirPasta(raiz, pasta) {
  return {
    name: `apurador:ao-vivo-local${raiz}`,
    configureServer(servidor) {
      servidor.middlewares.use(raiz, async (pedido, resposta) => {
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
