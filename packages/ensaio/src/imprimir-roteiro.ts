import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { roteiroEmHtml } from "./roteiro.ts";

// O roteiro da noite para imprimir e para o celular (Operação na noite, decisão 22).
// Uso: npm run roteiro
// Escreve .cache/roteiro/roteiro-da-noite.html e, com o Chrome (ou o Edge) instalado, o .pdf ao lado, em A4, pelo
// modo sem janela do navegador. Sem nenhum dos dois, o HTML imprime de qualquer navegador. O caminho de outro
// navegador vai em NAVEGADOR. A versão abaixo do título é o commit e a hora: a folha impressa precisa ser a última.

const RAIZ = new URL("../../../", import.meta.url);
const PASTA = new URL(".cache/roteiro/", RAIZ);
const html = fileURLToPath(new URL("roteiro-da-noite.html", PASTA));
const pdf = fileURLToPath(new URL("roteiro-da-noite.pdf", PASTA));

const git = (...argumentos: string[]) => execFileSync("git", argumentos, { cwd: RAIZ, encoding: "utf8" }).trim();
const commit = git("rev-parse", "--short", "HEAD");
const mudado = git("status", "--porcelain", "--", "docs/roteiro-da-noite.md") !== "";
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date());
const versao = `Gerado em ${hora}, do commit ${commit}${mudado ? " com mudanças ainda sem commit" : ""}.`;

mkdirSync(PASTA, { recursive: true });
writeFileSync(html, roteiroEmHtml(readFileSync(new URL("docs/roteiro-da-noite.md", RAIZ), "utf8"), versao));
console.log(`Roteiro: ${html}`);

const navegador = [
  process.env.NAVEGADOR,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((caminho): caminho is string => caminho !== undefined && existsSync(caminho));
if (navegador === undefined) {
  console.log("Sem o Chrome nem o Edge: imprima o HTML pelo navegador (Ctrl+P, A4).");
} else {
  execFileSync(navegador, ["--headless", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${pdf}`, pathToFileURL(html).href], { stdio: "ignore" });
  console.log(`PDF: ${pdf}`);
}
