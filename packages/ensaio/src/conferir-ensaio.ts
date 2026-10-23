import { existsSync, globSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { AMBIENTES, ARQUIVO_DO_CONTADOR, lerContadorDeGravacoes, lerEntradaDaProjecao, type EventoDaNarracao, type RegistroDaRodada } from "@apurador/coletor";
import { instanteDaNoite, lerCadastro, lerNoite, type Lugar } from "@apurador/pipeline";
import { conferirEnsaio } from "./conferencia-do-ensaio.ts";
import type { LeituraDoEnsaio } from "./leitor-do-ensaio.ts";
import { registroDoEnsaio } from "./registro-do-ensaio.ts";
import { ARQUIVO_DO_RELOGIO, type PartidaDoRelogio } from "./relogio.ts";
import { narracaoDoReplay } from "./replay-da-noite.ts";

// A conferência do ensaio geral, depois dele (conferencia-do-ensaio.ts): lê as leituras do `npm run ler-ensaio`, a
// partida do relógio do TSE falso, as rodadas que o coletor registrou nesse tempo e o contador de gravações, roda o
// replay da noite para a narração e escreve o trecho do registro com os números contra os critérios. O trecho vai para
// a tela e para .cache/ensaio/conferencia-<hora>.md; os números inteiros, com todas as divergências, para o .json ao lado.
// Uso: npm run conferir-ensaio [-- --leituras <arquivo> --painel-da-cloudflare <gravações> --excluir 21:40-21:52 --sem-replay]
//   --leituras: o arquivo do leitor (padrão: o mais novo de .cache/ensaio/).
//   --painel-da-cloudflare: as operações classe A do bucket do ensaio no mês, no painel (R2 → apurador-ensaio → Metrics).
//   --excluir: uma janela de hora real (do computador) fora do atraso, como uma queda provocada; pode repetir.
//   --sem-replay: sem a narração do replay (~1 min a menos).

const { values: opcoes } = parseArgs({
  options: {
    leituras: { type: "string" },
    relogio: { type: "string" },
    "painel-da-cloudflare": { type: "string" },
    excluir: { type: "string", multiple: true, default: [] },
    "sem-replay": { type: "boolean", default: false },
  },
});

const RAIZ = new URL("../../../", import.meta.url);
const caminho = (relativo: string) => fileURLToPath(new URL(relativo, RAIZ));
const linhas = <T>(arquivo: string): T[] =>
  readFileSync(arquivo, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as T);
const maisNovo = (padrao: string) =>
  globSync(padrao, { cwd: caminho(".") })
    .sort()
    .at(-1);

const maisNovaLeitura = maisNovo(".cache/ensaio/leituras-*.jsonl");
const arquivoDasLeituras = opcoes.leituras ?? (maisNovaLeitura && caminho(maisNovaLeitura));
if (!arquivoDasLeituras) throw new Error("Nenhuma leitura em .cache/ensaio/: rode npm run ler-ensaio durante o ensaio, ou passe --leituras");
const leituras = linhas<LeituraDoEnsaio>(arquivoDasLeituras);
if (leituras.length === 0) throw new Error(`${arquivoDasLeituras} está vazio`);
const [primeira, ultima] = [Math.min(...leituras.map((l) => l.quando)), Math.max(...leituras.map((l) => l.quando))];

const relogio = JSON.parse(readFileSync(opcoes.relogio ?? ARQUIVO_DO_RELOGIO, "utf8")) as PartidaDoRelogio;
const noite = lerNoite(new Uint8Array(readFileSync(new URL("dados/noites/2022-2.json.gz", RAIZ))));
const cadastro = lerCadastro(readFileSync(new URL("dados/cadastros/2022-2.json", RAIZ), "utf8"));

// As rodadas do coletor durante as leituras, de todos os registros: o coletor derrubado e reiniciado abre um novo.
const rodadas = globSync(".cache/coletor/rodadas-*.jsonl", { cwd: caminho(".") })
  .flatMap((arquivo) => linhas<RegistroDaRodada>(caminho(arquivo)))
  .filter((r) => Date.parse(r.inicio) >= primeira - 15 * 60_000 && Date.parse(r.inicio) <= ultima);

// Uma janela "HH:MM-HH:MM" na hora do computador, no dia da primeira leitura.
const excluir = opcoes.excluir.map((janela): [number, number] => {
  const m = /^(\d\d):(\d\d)-(\d\d):(\d\d)$/.exec(janela);
  if (!m) throw new Error(`--excluir deve ser HH:MM-HH:MM, e não ${janela}`);
  const dia = new Date(primeira);
  const as = (h: string, min: string) => new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Number(h), Number(min)).getTime();
  return [as(m[1]!, m[2]!), as(m[3]!, m[4]!)];
});

let contador: { coletor: number; painel: number } | undefined;
if (opcoes["painel-da-cloudflare"] !== undefined) {
  const gravacoes = existsSync(ARQUIVO_DO_CONTADOR) ? await lerContadorDeGravacoes(ARQUIVO_DO_CONTADOR) : null;
  contador = { coletor: gravacoes?.buckets[AMBIENTES.ensaio.bucket] ?? 0, painel: Number(opcoes["painel-da-cloudflare"]) };
}

let narracaoDoReplayDaNoite: EventoDaNarracao[] | undefined;
if (!opcoes["sem-replay"]) {
  console.log("Rodando o replay da noite para a narração de referência (~1 min)...");
  narracaoDoReplayDaNoite = await narracaoDoReplay({
    noite,
    cadastro,
    lugares: JSON.parse(readFileSync(new URL("dados/lugares.json", RAIZ), "utf8")) as Lugar[],
    projecao: lerEntradaDaProjecao("2022-2"),
    de: instanteDaNoite(noite, `${noite.dia} 16:50:00`),
  });
}

const numeros = conferirEnsaio({ leituras, fonte: { noite, cadastro }, relogio, rodadas, excluir, contador, narracaoDoReplay: narracaoDoReplayDaNoite });
const texto = registroDoEnsaio(numeros);
mkdirSync(new URL(".cache/ensaio/", RAIZ), { recursive: true });
const saida = new URL(`.cache/ensaio/conferencia-${new Date().toISOString().replace(/[:.]/g, "-")}`, RAIZ);
writeFileSync(`${fileURLToPath(saida)}.md`, texto);
writeFileSync(`${fileURLToPath(saida)}.json`, `${JSON.stringify(numeros, null, 2)}\n`);
console.log(`\n${texto}`);
console.log(`Leituras: ${arquivoDasLeituras}; ${rodadas.length} rodadas do coletor. Gravado em ${fileURLToPath(saida)}.md e .json.`);
