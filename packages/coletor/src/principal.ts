import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs, parseEnv } from "node:util";
import { AMBIENTES, ARQUIVO_DE_CREDENCIAIS, destinosDoColetor, pastaDoPlanoBLocal, type NomeDoDestino } from "./ambientes.ts";
import { CHAVES_DA_NOITE, NOMES_DAS_CHAVES } from "./chaves.ts";
import { criarColetor, type RegistroDaRodada } from "./coletor.ts";
import { ARQUIVO_DO_CONTADOR, criarContadorDeGravacoes, gravarContadorDeGravacoes, lerContadorDeGravacoes } from "./contador.ts";
import { ARQUIVO_DE_CONTROLE, controleDoArquivoDeChaves, lerArquivoDeControle } from "./controle.ts";
import { implantarWorker } from "./plano-b.ts";
import { relogioReal } from "./relogio.ts";

// O coletor no terminal.
// Uso: npm run coletor -- [--destino pasta|ensaio|producao] [--sem-gzip] [--tse <base>] [--eleicao 6258] [--pasta <pasta>]
//                         [--pedidos-por-segundo 45] [--minutos 15] [--controle <arquivo>] [--gravacoes <arquivo>]
//   --destino: onde publicar (ambientes.ts). `pasta`, o padrão, grava em --pasta, com o plano B numa pasta ao lado;
//              `ensaio` e `producao` gravam no R2 do ensaio e no de produção, com as chaves de packages/coletor/.env, e
//              o plano B republica o Worker do ambiente pelo login do wrangler. O plano B só vale depois do comando
//              `npm run noite -- plano-b`.
//   --sem-gzip: grava os JSONs no R2 sem compressão, se a conferência da entrega (npm run conferir-entrega) falhar.
//   --tse: a base do TSE; padrão, o TSE de verdade (https://resultados.tse.jus.br/oficial). Para o TSE falso,
//          a base que `npm run tse-falso` mostra (http://127.0.0.1:8022/oficial).
//   --minutos: para sozinho depois desse tempo; sem ele, roda até Ctrl+C.
//   --controle: o arquivo de controle que `npm run noite` grava (padrão: .cache/coletor/controle.json), lido a cada rodada.
//   --gravacoes: o contador de gravações nos buckets (padrão: .cache/coletor/gravacoes.json), guardado a cada rodada.
// O registro de cada rodada vai para .cache/coletor/, uma linha JSON por rodada.

const { values: opcoes } = parseArgs({
  options: {
    tse: { type: "string", default: "https://resultados.tse.jus.br/oficial" },
    eleicao: { type: "string", default: "6258" },
    pasta: { type: "string" },
    "pedidos-por-segundo": { type: "string", default: "45" },
    minutos: { type: "string" },
    controle: { type: "string", default: ARQUIVO_DE_CONTROLE },
    destino: { type: "string", default: "pasta" },
    "sem-gzip": { type: "boolean", default: false },
    gravacoes: { type: "string", default: ARQUIVO_DO_CONTADOR },
  },
});

const RAIZ = new URL("../../../", import.meta.url);
const CACHE = new URL(".cache/coletor/", RAIZ);
const pasta = opcoes.pasta ?? fileURLToPath(new URL("publicado/", CACHE));
const pedidosPorSegundo = Number(opcoes["pedidos-por-segundo"]);
// Acima de 50 pedidos num segundo o dono recebe um alerta, e a fila do coletor recupera até 4 pedidos atrasados.
if (!(pedidosPorSegundo > 0 && pedidosPorSegundo <= 45)) throw new Error(`--pedidos-por-segundo deve ficar entre 0 e 45, e não ${opcoes["pedidos-por-segundo"]}`);
const fim = opcoes.minutos === undefined ? Infinity : Date.now() + Number(opcoes.minutos) * 60_000;
if (Number.isNaN(fim)) throw new Error(`--minutos deve ser um número, e não ${opcoes.minutos}`);
const destino = opcoes.destino as NomeDoDestino;
if (destino !== "pasta" && !(destino in AMBIENTES)) throw new Error(`--destino deve ser pasta, ensaio ou producao, e não ${opcoes.destino}`);

// As chaves de escrita ficam só no .env do coletor, fora do Git, e só são lidas quando o destino é o R2.
const env = destino !== "pasta" && existsSync(ARQUIVO_DE_CREDENCIAIS) ? parseEnv(readFileSync(ARQUIVO_DE_CREDENCIAIS, "utf8")) : {};
const contador = criarContadorDeGravacoes(await lerContadorDeGravacoes(opcoes.gravacoes), relogioReal.agora);
const destinos = destinosDoColetor({ destino, env, pasta, comprimir: !opcoes["sem-gzip"], buscar: fetch, contador, agora: relogioReal.agora, implantar: implantarWorker });

mkdirSync(CACHE, { recursive: true });
const arquivoDoRegistro = new URL(`rodadas-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`, CACHE);

let parar = false;
process.on("SIGINT", () => {
  if (parar) process.exit(130);
  parar = true;
  console.log("Parando depois desta rodada (Ctrl+C de novo para sair já).");
});

function resumo(r: RegistroDaRodada): string {
  const hora = new Date(r.inicio).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const respostas = Object.entries(r.respostas).map(([status, n]) => `${status}: ${n}`).join(", ");
  const { brasil, ufs, municipios, zonas } = r.baixados;
  const falhas = r.falhas.length === 0 ? "" : ` · ${r.falhas.length} falhas (${r.falhas.slice(0, 3).join("; ")})`;
  // O controle do dono só aparece no que foge do inicial: o que está desligado, o aviso no ar e o plano B.
  const desligadas = NOMES_DAS_CHAVES.filter((nome) => !r.controle.chaves[nome]).map((nome) => CHAVES_DA_NOITE[nome].rotulo);
  const controle = [desligadas.length === 0 ? "" : ` · desligadas: ${desligadas.join(", ")}`, r.controle.aviso === null ? "" : ` · aviso ${r.controle.aviso}`, r.destino === "plano B" ? " · plano B" : ""].join("");
  const doMes = r.gravacoesDoMes && destino !== "pasta" ? ` (${Object.values(r.gravacoesDoMes.buckets).reduce((a, n) => a + n, 0)} no mês)` : "";
  return `#${r.numero} ${hora} ${r.fase ?? "sem fase"} · ${(r.duracao / 1000).toFixed(1)} s · ${r.pedidos} pedidos (${respostas}) · novos: Brasil ${brasil}, UFs ${ufs}, municípios ${municipios}, zonas ${zonas} · ${r.gravacoes} gravações${doMes}${controle}${falhas}`;
}

const ondePublica =
  destino === "pasta"
    ? `${pasta} (plano B: ${pastaDoPlanoBLocal(pasta)})`
    : `R2 ${AMBIENTES[destino].bucket}, ${opcoes["sem-gzip"] ? "sem" : "com"} gzip (plano B: Worker ${AMBIENTES[destino].planoB.worker})`;
console.log(`Coletor da eleição ${opcoes.eleicao} em ${opcoes.tse}, a ${pedidosPorSegundo} pedidos por segundo.`);
console.log(`${destino === "producao" ? "PRODUÇÃO. " : ""}Publica em ${ondePublica}. Registro: ${fileURLToPath(arquivoDoRegistro)}`);
console.log(`Controle: ${opcoes.controle}, lido a cada rodada (npm run noite -- <comando>). Sem o arquivo, valem as chaves de dados/chaves.json.`);

// Sem arquivo de controle, as chaves são as do arquivo de chaves do site, lidas de novo a cada rodada: um deploy que
// mude o arquivo vale no coletor que já roda, até o primeiro comando.
const coletor = criarColetor({
  base: opcoes.tse,
  eleicao: opcoes.eleicao,
  buscar: fetch,
  relogio: relogioReal,
  destino: destinos.principal,
  planoB: destinos.planoB,
  contador,
  pedidosPorSegundo,
  controle: async () => (await lerArquivoDeControle(opcoes.controle)) ?? (await controleDoArquivoDeChaves()),
});
await coletor.rodar({
  ate: () => parar || Date.now() >= fim,
  aoRodar(registro) {
    appendFileSync(arquivoDoRegistro, `${JSON.stringify(registro)}\n`);
    if (registro.gravacoesDoMes) {
      gravarContadorDeGravacoes(opcoes.gravacoes, registro.gravacoesDoMes).catch((erro: Error) => console.log(`O contador de gravações não foi guardado: ${erro.message}`));
    }
    console.log(resumo(registro));
  },
});
