import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

// A noite local: o TSE falso e o coletor juntos, para ver a página ao vivo no `astro dev`, que lê a pasta publicada em
// /ao-vivo/ (packages/site/src/integracoes/ao-vivo-local.mjs). Os dois rodam como processos `node` diretos, sem o `npm`
// no meio: no Windows, parar um `npm run` deixa o `node` de baixo vivo. Os pids ficam em .cache/noite-local.json, e
// `--parar` encerra os dois mesmo quando o terminal que os iniciou já se foi.
// Uso: npm run noite-local [-- --partida 16:58 --velocidade 3 --minutos 30 --porta 8022]
//      npm run noite-local -- --parar
//   --partida: a hora da noite de 2022 em que o relógio do TSE falso começa. 16:58 mostra a passagem das 17h; 18:35, a
//              virada do Brasil (~18:44 da noite, ~3 min depois a 3x).
//   --minutos: o coletor para sozinho depois desse tempo, e o TSE falso com ele (padrão 30).
// As linhas digitadas aqui vão para o TSE falso ("403 600", "liberar", "estado").

const { values: opcoes } = parseArgs({
  options: {
    partida: { type: "string", default: "16:58" },
    velocidade: { type: "string" },
    minutos: { type: "string", default: "30" },
    porta: { type: "string", default: "8022" },
    parar: { type: "boolean", default: false },
  },
});

const RAIZ = new URL("../../../", import.meta.url);
const ARQUIVO_DOS_PIDS = new URL(".cache/noite-local.json", RAIZ);
/** A pasta que o coletor publica sem `--pasta` e que o `astro dev` serve em /ao-vivo/. */
const PUBLICADO = new URL(".cache/coletor/publicado/", RAIZ);

interface Pids {
  noite: number;
  tseFalso?: number;
  coletor?: number;
}

function encerrar(pid: number | undefined): void {
  if (pid === undefined) return;
  try {
    process.kill(pid);
  } catch {
    // Já tinha terminado.
  }
}

if (opcoes.parar) {
  if (!existsSync(ARQUIVO_DOS_PIDS)) {
    console.log("Nenhuma noite local rodando.");
  } else {
    const pids = JSON.parse(readFileSync(ARQUIVO_DOS_PIDS, "utf8")) as Pids;
    for (const pid of [pids.coletor, pids.tseFalso, pids.noite]) encerrar(pid);
    rmSync(ARQUIVO_DOS_PIDS);
    console.log(`Noite local parada (coletor ${pids.coletor}, TSE falso ${pids.tseFalso}).`);
  }
  process.exit(0);
}

if (existsSync(ARQUIVO_DOS_PIDS)) {
  const { noite } = JSON.parse(readFileSync(ARQUIVO_DOS_PIDS, "utf8")) as Pids;
  let viva = true;
  try {
    process.kill(noite, 0);
  } catch {
    viva = false;
  }
  if (viva) throw new Error(`Uma noite local já roda (pid ${noite}). Pare-a antes: npm run noite-local -- --parar`);
}

// O coletor parte sem estado: arquivos de uma noite anterior na pasta se misturariam aos novos até ele regravar tudo.
rmSync(PUBLICADO, { recursive: true, force: true });
mkdirSync(new URL(".cache/", RAIZ), { recursive: true });

const pids: Pids = { noite: process.pid };
const gravarPids = () => writeFileSync(ARQUIVO_DOS_PIDS, `${JSON.stringify(pids)}\n`);
gravarPids();

/** Um processo `node` com o tsx, com a saída prefixada pelo nome. */
function iniciar(nome: string, script: URL, argumentos: string[]): ChildProcess {
  const filho = spawn(process.execPath, ["--import", "tsx", fileURLToPath(script), ...argumentos], {
    cwd: fileURLToPath(RAIZ),
    stdio: ["pipe", "pipe", "pipe"],
  });
  for (const saida of [filho.stdout, filho.stderr]) createInterface({ input: saida }).on("line", (linha) => console.log(`[${nome}] ${linha}`));
  return filho;
}

const porta = opcoes.porta;
const argumentosDoTse = ["--porta", porta, "--partida", opcoes.partida, ...(opcoes.velocidade ? ["--velocidade", opcoes.velocidade] : [])];
const tseFalso = iniciar("tse-falso", new URL("servir.ts", import.meta.url), argumentosDoTse);
pids.tseFalso = tseFalso.pid;
gravarPids();

let coletor: ChildProcess | undefined;
let parando = false;
function parar(motivo: string): void {
  if (parando) return;
  parando = true;
  console.log(`Parando a noite local: ${motivo}.`);
  encerrar(coletor?.pid);
  encerrar(tseFalso.pid);
  rmSync(ARQUIVO_DOS_PIDS, { force: true });
  process.exit(0);
}

// O coletor só começa quando o TSE falso responde: antes, as primeiras rodadas falhariam.
const pronto = createInterface({ input: tseFalso.stdout! });
pronto.on("line", (linha) => {
  if (coletor || !linha.startsWith("TSE falso da noite")) return;
  coletor = iniciar("coletor", new URL("../../coletor/src/principal.ts", import.meta.url), [
    "--tse",
    `http://127.0.0.1:${porta}/oficial`,
    "--minutos",
    opcoes.minutos,
    "--noite",
    "2022-2",
  ]);
  pids.coletor = coletor.pid;
  gravarPids();
  coletor.on("exit", () => parar("o coletor terminou"));
  console.log(
    `Publicando em ${fileURLToPath(PUBLICADO)}. A página: npm run dev -w @apurador/site, em /. Para parar: Ctrl+C ou npm run noite-local -- --parar.`,
  );
});
tseFalso.on("exit", () => parar("o TSE falso terminou"));

createInterface({ input: process.stdin }).on("line", (linha) => tseFalso.stdin?.write(`${linha}\n`));
process.on("SIGINT", () => parar("Ctrl+C"));
process.on("SIGTERM", () => parar("pedido de parada"));
