import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { instanteDaNoite, lerCadastro, lerNoite } from "@apurador/pipeline";
import { relogioAcelerado, ritmoDesde } from "./relogio.ts";
import { servirTseFalso } from "./servidor.ts";
import { criarTseFalso } from "./tse-falso.ts";

// O TSE falso como servidor HTTP local, para o ensaio geral, com o relógio dele andando sozinho.
// Uso: npm run tse-falso [-- --porta 8022 --partida 16:50 --velocidade 1]
//   --partida: a hora da noite em que o relógio começa (padrão 16:50).
//   --velocidade: uma velocidade só para a noite toda; sem ela, o ritmo do ensaio (3x até 20:30, 30x depois).
// Comandos, digitados no terminal enquanto ele roda: "403 <segundos>", "liberar", "estado", "sair".
// O registro (404, 403 e violações do limite) vai para .cache/tse-falso/, uma linha JSON por entrada.

const { values: opcoes } = parseArgs({
  options: {
    porta: { type: "string", default: "8022" },
    host: { type: "string", default: "127.0.0.1" },
    partida: { type: "string", default: "16:50" },
    velocidade: { type: "string" },
  },
});

// O TSE falso serve a noite do ensaio geral, a única com cadastro.
const NOITE = "2022-2";
const RAIZ = new URL("../../../", import.meta.url);
const noite = lerNoite(new Uint8Array(readFileSync(new URL(`dados/noites/${NOITE}.json.gz`, RAIZ))));
const cadastro = lerCadastro(readFileSync(new URL(`dados/cadastros/${NOITE}.json`, RAIZ), "utf8"));

if (!/^\d\d:\d\d$/.test(opcoes.partida)) throw new Error(`--partida deve ser HH:MM, e não ${opcoes.partida}`);
const inicio = instanteDaNoite(noite, `${noite.dia} ${opcoes.partida}:00`);
const ritmo = opcoes.velocidade !== undefined ? [{ desde: inicio, velocidade: Number(opcoes.velocidade) }] : ritmoDesde(inicio);
if (ritmo.some((t) => !(t.velocidade > 0))) throw new Error(`--velocidade deve ser um número positivo, e não ${opcoes.velocidade}`);

const PASTA = new URL(".cache/tse-falso/", RAIZ);
mkdirSync(PASTA, { recursive: true });
const arquivoDoRegistro = new URL(`registro-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`, PASTA);
const relogio = relogioAcelerado({ partida: Date.now(), ritmo });
const tse = criarTseFalso({
  noite,
  cadastro,
  relogio,
  aoRegistrar(entrada) {
    appendFileSync(arquivoDoRegistro, `${JSON.stringify(entrada)}\n`);
    if (entrada.tipo === "violacao") console.log(`VIOLAÇÃO do limite às ${entrada.dataHora} (noite), de ${entrada.cliente}: ${entrada.detalhe}`);
  },
});
const servidor = await servirTseFalso(tse, { porta: Number(opcoes.porta), host: opcoes.host });

function estado() {
  const e = tse.estado();
  const r = tse.registro();
  const bloqueio = e.bloqueadoAte !== null && e.bloqueadoAte > e.momento.real ? `, 403 por mais ${Math.ceil((e.bloqueadoAte - e.momento.real) / 1000)} s` : "";
  console.log(`Noite: ${e.dataHora}${bloqueio}. Pedidos: ${r.pedidos} (${JSON.stringify(r.porStatus)}), 404: ${r.naoEncontrados.length}, violações: ${r.violacoes.length}.`);
}

console.log(`TSE falso da noite ${NOITE} em ${servidor.url}/oficial/ (base do coletor: ${servidor.url}/oficial)`);
console.log(`Relógio: ${ritmo.map((t) => `${Math.floor(t.desde / 3600)}:${String(Math.floor((t.desde % 3600) / 60)).padStart(2, "0")} a ${t.velocidade}x`).join(", ")}.`);
console.log(`Indicação do TSE: ${tse.estado().dataHoraDaIndicacao}. Totalização final: ${tse.estado().dataHoraDaTotalizacaoFinal}.`);
console.log(`Registro: ${fileURLToPath(arquivoDoRegistro)}`);
console.log(`Comandos: "403 <segundos>", "liberar", "estado", "sair".`);

const terminal = createInterface({ input: process.stdin });
terminal.on("line", async (linha) => {
  const [comando, argumento] = linha.trim().split(/\s+/);
  if (comando === "403") {
    const segundos = Number(argumento);
    if (!(segundos > 0)) return console.log('Use "403 <segundos>", por exemplo "403 600".');
    tse.bloquear(segundos);
    console.log(`Respondendo 403 a todos por ${segundos} s.`);
  } else if (comando === "liberar") {
    tse.desbloquear();
    console.log("Bloqueio desfeito.");
  } else if (comando === "estado") estado();
  else if (comando === "sair") {
    estado();
    terminal.close();
    await servidor.fechar();
  } else if (comando) console.log(`Comando desconhecido: ${comando}. Use "403 <segundos>", "liberar", "estado" ou "sair".`);
});
