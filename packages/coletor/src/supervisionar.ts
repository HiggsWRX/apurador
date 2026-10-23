import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { supervisionar } from "./supervisor.ts";

// O supervisor no terminal, ou na tarefa do Agendador (`agendador/criar-tarefa.ps1`), que o inicia ao ligar o computador.
// Uso: npm run supervisor -- <os argumentos do coletor, como npm run coletor>
// O que o coletor escreve vai para o terminal e para .cache/coletor/coletor-<dia>.log: sem login, a tarefa não tem
// terminal, e o dono acompanha o log com
//   Get-Content .cache\coletor\coletor-<dia>.log -Wait -Tail 40
// Ctrl+C para o coletor depois da rodada (e o supervisor junto); Ctrl+C de novo para já.

const RAIZ = new URL("../../../", import.meta.url);
const CACHE = new URL(".cache/coletor/", RAIZ);
mkdirSync(CACHE, { recursive: true });
const arquivoDoLog = fileURLToPath(new URL(`coletor-${new Date().toISOString().slice(0, 10)}.log`, CACHE));
const escrever = (texto: string) => {
  process.stdout.write(texto);
  appendFileSync(arquivoDoLog, texto);
};

let parado = false;
let coletor: ReturnType<typeof spawn> | undefined;
process.on("SIGINT", () => {
  parado = true;
  coletor?.kill("SIGINT");
});

escrever(`Supervisor do coletor (${process.argv.slice(2).join(" ") || "sem argumentos"}). Log: ${arquivoDoLog}\n`);
await supervisionar({
  iniciar() {
    coletor = spawn(process.execPath, ["--import", "tsx", fileURLToPath(new URL("principal.ts", import.meta.url)), ...process.argv.slice(2)], {
      cwd: fileURLToPath(RAIZ),
      stdio: ["ignore", "pipe", "pipe"],
    });
    coletor.stdout!.on("data", (parte: Buffer) => escrever(parte.toString("utf8")));
    coletor.stderr!.on("data", (parte: Buffer) => escrever(parte.toString("utf8")));
    const atual = coletor;
    return { saida: new Promise((pronto) => atual.on("exit", (codigo) => pronto(codigo))) };
  },
  esperar: (ms) => new Promise((pronto) => setTimeout(pronto, ms)),
  registrar: (linha) => escrever(`${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })} ${linha}\n`),
  parado: () => parado,
  agora: () => Date.now(),
});
