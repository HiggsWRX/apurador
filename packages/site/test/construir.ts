import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { AGORA } from "./html";

// Os testes do site conferem o resultado do build, então o build roda antes deles: uma vez como vai ao ar, outra com
// as chaves desligadas e outra só com a projeção de antes das 17h desligada, para conferir que uma chave muda o site
// sem código novo.
export default function construir() {
  const opcoes = { cwd: fileURLToPath(new URL("..", import.meta.url)), stdio: "inherit", env: { ...process.env, APURADOR_AGORA: AGORA } } as const;
  execSync("npx astro build", opcoes);
  execSync("npx astro build --config test/chaves-desligadas/astro.config.mjs", opcoes);
  execSync("npx astro build --config test/projecao-desligada/astro.config.mjs", opcoes);
}
