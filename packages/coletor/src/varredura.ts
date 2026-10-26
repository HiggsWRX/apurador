import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";

// `npm run varredura`: a varredura do histórico do Git antes de o repositório ficar público (Plano de lançamento em
// fases, decisão 8; ticket 35). Lê cada arquivo de cada commit de todas as refs, uma vez por conteúdo, e cada mensagem
// de commit, e procura:
// - os segredos do `.env` do coletor (as chaves do R2, o token da Cloudflare, o tópico do ntfy), pelo valor: nenhum
//   pode aparecer;
// - um `.env` que tenha entrado num commit, um valor posto numa variável de segredo e o começo de uma chave privada;
// - os endereços e os nomes do ambiente do ensaio e das sentinelas, que ficam no código de propósito e levam a nada
//   depois de apagados, e os endereços `*.workers.dev` e os tópicos do ntfy, para o dono decidir.
// Nunca escreve um segredo: só o nome da variável e onde ela apareceu. Falha se achar um segredo, um `.env` ou uma
// chave privada. Os arquivos com gzip (`dados/noites/`) são procurados também descomprimidos.

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 30 });

// O `.env` fica no checkout principal, que um worktree divide.
const principal = dirname(git("rev-parse", "--path-format=absolute", "--git-common-dir").trim());
const arquivoDoEnv = join(principal, "packages/coletor/.env");
const segredos = existsSync(arquivoDoEnv)
  ? readFileSync(arquivoDoEnv, "utf8")
      .split(/\r?\n/)
      .flatMap((l) => {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"#\s]*)"?/.exec(l);
        // Um valor curto acharia qualquer coisa, e nenhum segredo daqui é curto.
        return m && m[2]!.length >= 8 ? [{ nome: m[1]!, valor: Buffer.from(m[2]!) }] : [];
      })
  : [];

/**
 * O domínio, os Workers e os buckets do ensaio e as sentinelas, que ficam no código e levam a nada depois de apagados
 * (ticket 30; `packages/coletor/cloudflare/README.md`).
 */
const DO_ENSAIO_E_DAS_SENTINELAS = [
  "ao-vivo-ensaio.apurador.org",
  "apurador-ensaio",
  "apurador-ensaio-plano-b",
  "apurador-ensaio-noite",
  "apurador-sentinela",
  "apurador-sentinela-ensaio",
];
const WORKERS_DEV = /[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/g;
const NTFY = /ntfy\.sh\/[A-Za-z0-9_-]+/g;
const CHAVE_PRIVADA = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
// Um valor posto numa variável de segredo, como num `.env` colado: pega também o token do CI, que não está no `.env`.
// As chaves do R2 e os tokens da Cloudflare têm de 32 a 64 caracteres; os de mentira dos testes, menos de 20.
const ATRIBUICAO = /\b(R2_[A-Z_]*(KEY|SECRET)[A-Z_]*|CLOUDFLARE_API_TOKEN|NTFY_TOPICO)[ \t]*[=:][ \t]*["']?[A-Za-z0-9_/+=-]{20,}/;
const ENV = /(^|\/)(\.env|\.dev\.vars)$/;

// Cada blob de todas as refs, com um caminho onde ele está.
const caminhos = new Map<string, string>();
for (const linha of git("rev-list", "--all", "--objects").split("\n")) {
  const [sha, ...caminho] = linha.split(" ");
  if (sha && caminho.length > 0 && !caminhos.has(sha)) caminhos.set(sha, caminho.join(" "));
}
const lote = spawnSync("git", ["cat-file", "--batch"], { input: [...caminhos.keys()].join("\n") + "\n", maxBuffer: 2 ** 31 });
if (lote.status !== 0) throw new Error(`git cat-file: ${lote.stderr.toString()}`);

const conteudos: { caminho: string; bytes: Buffer }[] = [];
for (let i = 0; i < lote.stdout.length;) {
  const fim = lote.stdout.indexOf(10, i);
  const [sha, tipo, tamanho] = lote.stdout.subarray(i, fim).toString().split(" ");
  i = fim + 1;
  if (tipo === undefined || tamanho === undefined) continue;
  const bytes = lote.stdout.subarray(i, i + Number(tamanho));
  i += Number(tamanho) + 1;
  if (tipo !== "blob") continue;
  conteudos.push({ caminho: caminhos.get(sha!)!, bytes });
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) conteudos.push({ caminho: `${caminhos.get(sha!)!} (descomprimido)`, bytes: gunzipSync(bytes) });
}
const commits = git("log", "--all", "--format=%H%x00%B%x00")
  .split("\0\n")
  .filter((c) => c.trim() !== "");
for (const c of commits) {
  const [sha, mensagem] = c.trim().split("\0");
  conteudos.push({ caminho: `mensagem do commit ${sha!.slice(0, 7)}`, bytes: Buffer.from(mensagem ?? "") });
}

const onde = (achou: (bytes: Buffer) => boolean) => [...new Set(conteudos.filter((c) => achou(c.bytes)).map((c) => c.caminho))];
const lista = (caminhosAchados: string[]) =>
  caminhosAchados.length <= 6 ? caminhosAchados.join(", ") : `${caminhosAchados.slice(0, 6).join(", ")} e mais ${caminhosAchados.length - 6}`;
// O que o padrão acha, com um segredo do .env trocado pelo nome dele.
const achados = (padrao: RegExp) =>
  [...new Set(conteudos.flatMap((c) => c.bytes.toString("latin1").match(padrao) ?? []))]
    .map((a) => segredos.find((s) => a.includes(s.valor.toString()))?.nome ?? a)
    .sort();

let falhas = 0;
/** Conta os achados de um segredo e diz onde estão, ou o que dizer sem nenhum. */
const segredo = (rotulo: string, em: string[], semNenhum: string) => {
  falhas += em.length;
  console.log(`${rotulo}: ${em.length === 0 ? semNenhum : `APARECE em ${lista(em)}`}`);
};
console.log(
  `${conteudos.length - commits.length} conteúdos de arquivo e ${commits.length} mensagens, em ${git("rev-list", "--all").trim().split("\n").length} commits`,
);

console.log(`\nSegredos do .env do coletor (${segredos.length}, de ${arquivoDoEnv}):`);
if (segredos.length === 0) console.log("  sem .env, ou sem valores: nada a procurar");
for (const { nome, valor } of segredos)
  segredo(
    `  ${nome}`,
    onde((b) => b.includes(valor)),
    "não aparece",
  );

console.log("");
segredo(".env num commit", [...new Set([...caminhos.values()].filter((c) => ENV.test(c)))], "nenhum");
segredo(
  "Valor numa variável de segredo",
  onde((b) => ATRIBUICAO.test(b.toString("latin1"))),
  "nenhum",
);
segredo(
  "Chave privada",
  onde((b) => CHAVE_PRIVADA.test(b.toString("latin1"))),
  "nenhuma",
);

console.log("\nEndereços e nomes do ensaio e das sentinelas (no código de propósito; levam a nada depois de apagados):");
for (const nome of DO_ENSAIO_E_DAS_SENTINELAS) {
  const em = onde((b) => b.includes(nome));
  console.log(`  ${nome}: ${em.length === 0 ? "não aparece" : `${em.length} arquivo(s), como ${lista(em.slice(0, 3))}`}`);
}
console.log(`\nEndereços *.workers.dev: ${achados(WORKERS_DEV).join(", ") || "nenhum"}`);
console.log(`Tópicos do ntfy: ${achados(NTFY).join(", ") || "nenhum"}`);

if (falhas > 0) {
  console.error(`\n${falhas} achado(s) de segredo: o repositório não pode ficar público assim.`);
  process.exitCode = 1;
} else console.log("\nNenhum segredo no histórico.");
