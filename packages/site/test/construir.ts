import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Os testes do site conferem o resultado do build, então o build roda antes deles.
export default function construir() {
  execSync("npx astro build", { cwd: fileURLToPath(new URL("..", import.meta.url)), stdio: "inherit" });
}
