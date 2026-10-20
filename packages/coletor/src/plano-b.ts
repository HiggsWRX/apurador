import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Destino } from "./destino.ts";
import { pastaLocal } from "./destino.ts";

// O plano B (Arquitetura e tecnologia, decisão 15; Operação na noite, decisão 14): um Worker só com os arquivos ao
// vivo como static assets, que funciona em `*.workers.dev` sem o domínio nem o R2. O coletor grava os arquivos na pasta
// dos assets e, no fim da rodada, republica o Worker, uma vez por minuto. Cada versão leva a pasta inteira, os ~5.820
// arquivos (dentro dos 20.000 por versão do Workers Free), e o `wrangler deploy` só sobe os que mudaram.
//
// A republicação não segura a rodada: ela começa no fim de uma e termina quando terminar, e a falha chega na rodada
// seguinte, que tenta de novo. A pasta é esvaziada na primeira gravação: o coletor regrava tudo ao passar ao plano B,
// e nada de um ensaio anterior pode ir junto.
//
// Os static assets respondem 405 a todo `OPTIONS` (medido no Worker do site em 20/10/2026), então não atendem o
// preflight do CORS: a página lê o plano B sem cabeçalho próprio (`enderecos-ao-vivo.ts`, no site), e o `_headers` só
// libera a origem e expõe o `Date` e a ETag, que ela lê.

/** O `_headers` da pasta do plano B, que o Worker aplica a todo arquivo. */
const CABECALHOS_DO_PLANO_B = ["/*", "  Access-Control-Allow-Origin: *", "  Access-Control-Expose-Headers: Date, ETag", "  X-Robots-Tag: noindex", ""].join("\n");

/**
 * O tempo desde a republicação anterior a partir do qual o fim da rodada republica: um minuto menos meia rodada. O fim
 * da rodada anda com a duração dela (de 0,5 a 15 s), e com o minuto cheio a cadência cairia para 60 a 80 s; assim ela
 * fica em uma a cada 3 rodadas de 20 s.
 */
const CADENCIA = 50_000;

/** O destino do plano B: a pasta dos static assets do Worker, republicado no fim da rodada. */
export function republicacaoDoWorker(opcoes: {
  /** A pasta dos static assets, a do `assets.directory` da configuração do Worker. */
  pasta: string;
  /** Republica o Worker com o que está na pasta (`implantarWorker`); rejeita se falhar. */
  publicar: () => Promise<void>;
  /** A hora em ms, pelo relógio do coletor. */
  agora: () => number;
}): Destino {
  const { pasta, publicar, agora } = opcoes;
  const local = pastaLocal(pasta);
  let preparada: Promise<void> | undefined;
  /** Há na pasta algo que a última republicação não levou. */
  let novidade = false;
  let emAndamento = false;
  let ultima = -Infinity;
  let falhas: string[] = [];

  return {
    async gravar(caminho, bytes) {
      preparada ??= (async () => {
        await rm(pasta, { recursive: true, force: true });
        await mkdir(pasta, { recursive: true });
        await writeFile(join(pasta, "_headers"), CABECALHOS_DO_PLANO_B);
      })();
      await preparada;
      await local.gravar(caminho, bytes);
      novidade = true;
    },
    async fimDaRodada() {
      const terminadas = falhas;
      falhas = [];
      if (novidade && !emAndamento && agora() - ultima >= CADENCIA) {
        emAndamento = true;
        novidade = false;
        ultima = agora();
        // Pelo `then`, até um erro síncrono de `publicar` vira rejeição, e a republicação nunca fica presa em andamento.
        Promise.resolve()
          .then(publicar)
          .catch((erro: unknown) => {
            falhas.push(`republicar o plano B: ${(erro as Error).message}`);
            // O que estava na pasta não chegou ao Worker: a rodada seguinte tenta de novo, sem esperar o minuto.
            novidade = true;
            ultima = -Infinity;
          })
          .finally(() => (emAndamento = false));
      }
      return terminadas;
    },
  };
}

/** O tempo máximo de uma republicação: um `wrangler deploy` preso não pode impedir as seguintes. */
const TEMPO_DA_REPUBLICACAO = 120_000;

/**
 * Republica o Worker do plano B com `wrangler deploy --config <configuracao>`, pelo login do wrangler no computador
 * (ou `CLOUDFLARE_API_TOKEN`, se estiver no ambiente). Roda o `node` direto, sem o `npx` no meio, e rejeita com as
 * últimas linhas da saída se o wrangler falhar ou passar de 2 min.
 */
export function implantarWorker(configuracao: string): Promise<void> {
  const wrangler = join(dirname(createRequire(import.meta.url).resolve("wrangler/package.json")), "bin", "wrangler.js");
  return new Promise((pronto, falhou) => {
    const processo = spawn(process.execPath, [wrangler, "deploy", "--config", configuracao], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
    let saida = "";
    const juntar = (parte: Buffer) => (saida = (saida + parte.toString()).slice(-4000));
    processo.stdout.on("data", juntar);
    processo.stderr.on("data", juntar);
    const limite = setTimeout(() => processo.kill(), TEMPO_DA_REPUBLICACAO);
    processo.on("error", (erro) => {
      clearTimeout(limite);
      falhou(erro);
    });
    processo.on("close", (codigo) => {
      clearTimeout(limite);
      if (codigo === 0) return pronto();
      const ultimas = saida.trim().split("\n").filter((l) => l.trim()).slice(-3).join(" | ");
      falhou(new Error(`wrangler saiu com ${codigo ?? "o processo parado"}: ${ultimas}`));
    });
  });
}
