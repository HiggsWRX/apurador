import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import type { Lugar } from "@apurador/pipeline";
import { despacharAlertas } from "./alertas.ts";
import { AMBIENTES, destinosDoColetor, lerCredenciais, pastaDoPlanoBLocal, type NomeDoDestino } from "./ambientes.ts";
import type { ArquivoDeRodada, ArquivoDoLugar } from "./arquivos.ts";
import { CHAVES_DA_NOITE, NOMES_DAS_CHAVES } from "./chaves.ts";
import { criarColetor, type RegistroDaRodada } from "./coletor.ts";
import { medidorDoComputador, tocarNoComputador } from "./computador.ts";
import { horaDeBrasilia } from "./formatos.ts";
import { ARQUIVO_DO_CONTADOR, criarContadorDeGravacoes, gravarContadorDeGravacoes, lerContadorDeGravacoes, somaDoMes } from "./contador.ts";
import { ARQUIVO_DE_CONTROLE, controleDoArquivoDeChaves, gravarArquivoDeControle, lerArquivoDeControle } from "./controle.ts";
import { lerEntradaDaProjecao, NOITES_DA_PROJECAO, type NoiteDaProjecao } from "./entrada-da-projecao.ts";
import { enviarAoNtfy } from "./ntfy.ts";
import { criarPainelDoColetor, type LeituraDeFora } from "./painel-do-coletor.ts";
import { implantarWorker } from "./plano-b.ts";
import { relogioReal } from "./relogio.ts";
import { arquivoDoEstado, escolherRetomada, gravarEstadoNoDisco, lerEstadoDoDisco, OUTRA_NOITE, type Retomada } from "./retomada.ts";
import { lerPelosEnderecos } from "./visto-de-fora.ts";

// O coletor no terminal.
// Uso: npm run coletor -- [--destino pasta|ensaio|producao] [--sem-gzip] [--sem-dominio] [--tse <base>] [--eleicao 6258] [--pasta <pasta>]
//                         [--pedidos-por-segundo 45] [--minutos 15] [--controle <arquivo>] [--gravacoes <arquivo>] [--noite 2026-2]
//   --destino: onde publicar (ambientes.ts). `pasta`, o padrão, grava em --pasta, com o plano B numa pasta ao lado;
//              `ensaio` e `producao` gravam no R2 do ensaio e no de produção, com as chaves de packages/coletor/.env, e
//              o plano B republica o Worker do ambiente pelo login do wrangler (ou pelo CLOUDFLARE_API_TOKEN do .env).
//              O plano B só vale depois do comando `npm run noite -- plano-b`.
//   --sem-gzip: grava os JSONs no R2 sem compressão, se a conferência da entrega (npm run conferir-entrega) falhar.
//   --sem-dominio: com ensaio ou producao, só o Worker do plano B, desde a primeira rodada e sem chave do R2.
//   --tse: a base do TSE; padrão, o TSE de verdade (https://resultados.tse.jus.br/oficial). Para o TSE falso,
//          a base que `npm run tse-falso` mostra (http://127.0.0.1:8022/oficial).
//   --minutos: para sozinho depois desse tempo; sem ele, roda até Ctrl+C.
//   --controle: o arquivo de controle que `npm run noite` grava (padrão: .cache/coletor/controle.json), lido a cada rodada.
//   --gravacoes: o contador de gravações nos buckets (padrão: .cache/coletor/gravacoes.json), guardado a cada rodada.
//   --noite: a noite que a projeção usa (entrada-da-projecao.ts): 2026-2, o padrão, ou 2022-2, a do TSE falso.
//   --partida: `retomada`, o padrão com ensaio ou producao, retoma do estado em disco (.cache/coletor/estado-<destino>.json)
//              ou, sem ele, do último objeto da noite, se forem desta noite (menos de 6 h); `a-frio`, o padrão com pasta,
//              ignora os dois e regrava tudo uma vez. Para começar outra noite ou outro ensaio menos de 6 h depois do
//              anterior, `--partida a-frio`.
// A cada rodada, o coletor grava o objeto da noite (no R2, no bucket da noite do destino, com a chave dele no .env; na
// pasta local, nenhum) e o estado em disco (retomada.ts).
// O registro de cada rodada vai para .cache/coletor/, uma linha JSON por rodada, e o painel do coletor, para
// .cache/coletor/painel.html, que o dono abre no navegador. Os alertas críticos vão ao celular pelo ntfy, com o tópico
// NTFY_TOPICO do packages/coletor/.env; sem ele, ficam no computador.

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
    "sem-dominio": { type: "boolean", default: false },
    gravacoes: { type: "string", default: ARQUIVO_DO_CONTADOR },
    noite: { type: "string", default: "2026-2" },
    partida: { type: "string" },
  },
});

const RAIZ = new URL("../../../", import.meta.url);
const CACHE = new URL(".cache/coletor/", RAIZ);
const pasta = opcoes.pasta ?? fileURLToPath(new URL("publicado/", CACHE));
const pedidosPorSegundo = Number(opcoes["pedidos-por-segundo"]);
// Acima de 50 pedidos num segundo o dono recebe um alerta, e a fila do coletor recupera até 4 pedidos atrasados.
if (!(pedidosPorSegundo > 0 && pedidosPorSegundo <= 45))
  throw new Error(`--pedidos-por-segundo deve ficar entre 0 e 45, e não ${opcoes["pedidos-por-segundo"]}`);
const fim = opcoes.minutos === undefined ? Infinity : Date.now() + Number(opcoes.minutos) * 60_000;
if (Number.isNaN(fim)) throw new Error(`--minutos deve ser um número, e não ${opcoes.minutos}`);
const destino = opcoes.destino as NomeDoDestino;
if (destino !== "pasta" && !(destino in AMBIENTES)) throw new Error(`--destino deve ser pasta, ensaio ou producao, e não ${opcoes.destino}`);
const noite = opcoes.noite as NoiteDaProjecao;
if (!NOITES_DA_PROJECAO.includes(noite)) throw new Error(`--noite deve ser ${NOITES_DA_PROJECAO.join(" ou ")}, e não ${opcoes.noite}`);
const projecao = lerEntradaDaProjecao(noite);
const partida = opcoes.partida ?? (destino === "pasta" ? "a-frio" : "retomada");
if (partida !== "retomada" && partida !== "a-frio") throw new Error(`--partida deve ser retomada ou a-frio, e não ${partida}`);

// As chaves de escrita ficam só no .env do coletor, fora do Git, e só valem fora da pasta local; o tópico do ntfy vale
// em todo destino.
const credenciais = lerCredenciais();
const env = destino === "pasta" ? {} : credenciais;
const contador = criarContadorDeGravacoes(await lerContadorDeGravacoes(opcoes.gravacoes), relogioReal.agora);
const destinos = destinosDoColetor({
  destino,
  env,
  pasta,
  comprimir: !opcoes["sem-gzip"],
  semDominio: opcoes["sem-dominio"],
  buscar: fetch,
  contador,
  agora: relogioReal.agora,
  implantar: implantarWorker,
});

// A retomada: do estado em disco ou do último objeto da noite, o mais novo desta noite. Uma leitura que falha não
// segura o coletor: ele segue com o outro, ou a frio.
const arquivoDoEstadoEmDisco = arquivoDoEstado(destino);
const lerOuNulo = <T>(onde: string, leitura: () => Promise<T | null>) =>
  leitura().catch((erro: Error) => {
    console.log(`Não deu para ler ${onde}: ${erro.message}`);
    return null;
  });
const retomada: Retomada =
  partida === "a-frio"
    ? { partida: "a frio", guardado: null }
    : escolherRetomada({
        disco: await lerOuNulo("o estado em disco", () => lerEstadoDoDisco(arquivoDoEstadoEmDisco)),
        objetoDaNoite:
          destinos.objetosDaNoite && (await lerOuNulo("o último objeto da noite", () => destinos.objetosDaNoite!.ultimo(Date.now() - OUTRA_NOITE))),
        eleicao: opcoes.eleicao,
        agora: Date.now(),
      });
if (retomada.partida !== "a frio") {
  const { estado } = retomada.guardado;
  contador.juntar(estado.gravacoesDoMes);
  // Numa outra máquina, sem o arquivo de controle, as chaves do dono vêm do estado, e não do arquivo de chaves do site.
  if (!existsSync(opcoes.controle)) await gravarArquivoDeControle(opcoes.controle, estado.controle, new Date());
  console.log(`Retoma do ${retomada.partida} da rodada ${estado.numero}, de ${horaDeBrasilia(Date.parse(estado.quando))}.`);
} else {
  console.log(
    `Parte a frio: grava todos os arquivos ao vivo uma vez${partida === "a-frio" ? " (--partida a-frio)" : ", sem estado desta noite no disco nem no R2"}.`,
  );
}
if (destino !== "pasta" && !destinos.objetosDaNoite) {
  const { variaveis } = AMBIENTES[destino].noite;
  console.log(`Sem ${variaveis.chave} ou ${variaveis.segredo} no .env: o coletor não grava o objeto da noite e só retoma do disco.`);
}

mkdirSync(CACHE, { recursive: true });
const arquivoDoRegistro = new URL(`rodadas-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`, CACHE);
const arquivoDoPainel = fileURLToPath(new URL("painel.html", CACHE));

let parar = false;
process.on("SIGINT", () => {
  if (parar) process.exit(130);
  parar = true;
  console.log("Parando depois desta rodada (Ctrl+C de novo para sair já).");
});

function resumo(r: RegistroDaRodada): string {
  const hora = new Date(r.inicio).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const respostas = Object.entries(r.respostas)
    .map(([status, n]) => `${status}: ${n}`)
    .join(", ");
  const { brasil, ufs, municipios, zonas } = r.baixados;
  const falhas = r.falhas.length === 0 ? "" : ` · ${r.falhas.length} falhas (${r.falhas.slice(0, 3).join("; ")})`;
  // O controle do dono só aparece no que foge do inicial: o que está desligado, o aviso no ar e o plano B.
  const desligadas = NOMES_DAS_CHAVES.filter((nome) => !r.controle.chaves[nome]).map((nome) => CHAVES_DA_NOITE[nome].rotulo);
  const controle = [
    desligadas.length === 0 ? "" : ` · desligadas: ${desligadas.join(", ")}`,
    r.controle.aviso === null ? "" : ` · aviso ${r.controle.aviso}`,
    r.destinoAtivo === "plano B" ? " · plano B" : "",
  ].join("");
  const doMes = r.gravacoesDoMes && destino !== "pasta" ? ` (${somaDoMes(r.gravacoesDoMes)} no mês)` : "";
  return `#${r.numero} ${hora} ${r.fase ?? "sem fase"} · ${(r.duracao / 1000).toFixed(1)} s · ${r.pedidos} pedidos (${respostas}) · novos: Brasil ${brasil}, UFs ${ufs}, municípios ${municipios}, zonas ${zonas} · ${r.gravacoes} gravações${doMes}${controle}${falhas}`;
}

const ondePublica =
  destino === "pasta"
    ? `${pasta} (plano B: ${pastaDoPlanoBLocal(pasta)})`
    : opcoes["sem-dominio"]
      ? `só no Worker ${AMBIENTES[destino].planoB.worker}, sem domínio`
      : `R2 ${AMBIENTES[destino].bucket}, ${opcoes["sem-gzip"] ? "sem" : "com"} gzip (plano B: Worker ${AMBIENTES[destino].planoB.worker})`;
console.log(`Coletor da eleição ${opcoes.eleicao} em ${opcoes.tse}, a ${pedidosPorSegundo} pedidos por segundo.`);
console.log(`${destino === "producao" ? "PRODUÇÃO. " : ""}Publica em ${ondePublica}. Registro: ${fileURLToPath(arquivoDoRegistro)}`);
console.log(`Controle: ${opcoes.controle}, lido a cada rodada (npm run noite -- <comando>). Sem o arquivo, valem as chaves de dados/chaves.json.`);
console.log(
  `Projeção da noite ${noite}: agregado de ${projecao.agregado.valor.toFixed(2)} ± ${projecao.agregado.incerteza} para o ${projecao.base.finalistas[0]!.numero}.`,
);

// O painel do coletor: lê o site visto de fora no endereço público do destino ativo (na pasta local, os arquivos dela),
// mede o computador e grava a página a cada rodada e a cada 5 s. O desvio do relógio só vale contra o TSE de verdade.
const topico = credenciais.NTFY_TOPICO;
const enderecos =
  destino === "pasta"
    ? null
    : { principal: opcoes["sem-dominio"] ? AMBIENTES[destino].planoB.endereco : AMBIENTES[destino].endereco, "plano B": AMBIENTES[destino].planoB.endereco };
let erroDoPainel = "";
const painel = criarPainelDoColetor({
  agora: relogioReal.agora,
  lerDeFora: enderecos ? lerPelosEnderecos({ enderecos, buscar: fetch, agora: relogioReal.agora }) : lerDaPasta,
  medirComputador: medidorDoComputador({ pasta: fileURLToPath(RAIZ), agora: relogioReal.agora }),
  notificar: despacharAlertas({ ntfy: topico ? enviarAoNtfy({ topico, buscar: fetch }) : undefined, tocar: tocarNoComputador, registrar: console.log }),
  gravar: async (html) => {
    // Inteiro de uma vez, como o arquivo de controle: o navegador nunca lê um painel pela metade. Se o Windows segurar o
    // arquivo enquanto o navegador o lê, grava por cima.
    try {
      await writeFile(`${arquivoDoPainel}.tmp`, html);
      await rename(`${arquivoDoPainel}.tmp`, arquivoDoPainel).catch(() => writeFile(arquivoDoPainel, html));
      erroDoPainel = "";
    } catch (erro) {
      if ((erro as Error).message !== erroDoPainel) console.log(`O painel do coletor não foi gravado: ${(erroDoPainel = (erro as Error).message)}`);
    }
  },
  conferirRelogio: new URL(opcoes.tse).hostname === "resultados.tse.jus.br",
});
console.log(`Painel do coletor: ${pathToFileURL(arquivoDoPainel).href} (abra no navegador; ele se recarrega a cada 5 s).`);
console.log(topico ? "Alertas críticos no celular pelo ntfy." : "Sem NTFY_TOPICO no packages/coletor/.env: os alertas ficam só no computador.");

/** O visto de fora da pasta local (`--destino pasta`): os arquivos que a página do `npm run dev` lê. */
async function lerDaPasta(destinoAtivo: RegistroDaRodada["destinoAtivo"]): Promise<LeituraDeFora> {
  const raiz = destinoAtivo === "principal" ? pasta : pastaDoPlanoBLocal(pasta);
  const ler = async <T>(caminho: string) => {
    try {
      return JSON.parse(await readFile(join(raiz, caminho), "utf8")) as T;
    } catch {
      return null;
    }
  };
  return { endereco: raiz, rodada: await ler<ArquivoDeRodada>("rodada.json"), brasil: await ler<ArquivoDoLugar>("lugares/BR.json"), data: Date.now() };
}

// Sem arquivo de controle, as chaves são as do arquivo de chaves do site, lidas de novo a cada rodada: um deploy que
// mude o arquivo vale no coletor que já roda, até o primeiro comando.
const coletor = criarColetor({
  base: opcoes.tse,
  eleicao: opcoes.eleicao,
  lugares: JSON.parse(readFileSync(new URL("dados/lugares.json", RAIZ), "utf8")) as Lugar[],
  buscar: fetch,
  relogio: relogioReal,
  destino: destinos.principal,
  planoB: destinos.planoB,
  contador,
  pedidosPorSegundo,
  controle: async () => (await lerArquivoDeControle(opcoes.controle)) ?? (await controleDoArquivoDeChaves()),
  projecao,
  ...(retomada.partida !== "a frio" && { retomada }),
  guardar: {
    ...(destinos.objetosDaNoite && { objetoDaNoite: destinos.objetosDaNoite.gravar }),
    disco: (json) => gravarEstadoNoDisco(arquivoDoEstadoEmDisco, json),
  },
});
const temporizador = setInterval(() => void painel.atualizar(), 5_000);
await coletor.rodar({
  ate: () => parar || Date.now() >= fim,
  aoRodar(registro) {
    appendFileSync(arquivoDoRegistro, `${JSON.stringify(registro)}\n`);
    if (registro.gravacoesDoMes) {
      gravarContadorDeGravacoes(opcoes.gravacoes, registro.gravacoesDoMes).catch((erro: Error) =>
        console.log(`O contador de gravações não foi guardado: ${erro.message}`),
      );
    }
    console.log(resumo(registro));
    painel.registrar(registro, { republicacaoDoPlanoB: destinos.planoB.ultimaRepublicacaoBoa() });
  },
});
clearInterval(temporizador);
await painel.atualizar();
