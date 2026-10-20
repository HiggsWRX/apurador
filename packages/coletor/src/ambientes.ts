import { fileURLToPath } from "node:url";
import type { Buscar } from "./coletor.ts";
import type { ContadorDeGravacoes } from "./contador.ts";
import { pastaLocal, type Destino } from "./destino.ts";
import { republicacaoDoWorker } from "./plano-b.ts";
import { destinoR2 } from "./r2.ts";

// Os destinos do coletor, por configuração (Arquitetura e tecnologia, decisão 15; spec, "Uma interface de publicação"):
// o `--destino` escolhe o principal e o do plano B. Na produção, o R2 dos JSONs ao vivo e o Worker do plano B; no
// ensaio, os dele, que nunca são os de produção (Ensaio geral, decisão 5); na pasta local, que é o padrão e não pede
// chave, uma pasta e outra ao lado como plano B, sem republicação. As chaves de escrita no R2 vêm só do `.env` do
// coletor, ignorado pelo Git, cada uma com o "Object Read & Write" de um bucket só: a do ensaio não grava na produção
// nem que o código erre. Os nomes do ensaio são os que o ticket 30 cria.

/** A conta da Cloudflare do projeto (Contas e acessos). Não é segredo. */
export const CONTA_DA_CLOUDFLARE = "40aa2d90c0ed3139d2e8a10389f509ec";

const RAIZ = new URL("../../../", import.meta.url);
const caminho = (relativo: string, base: URL | string = RAIZ) => fileURLToPath(new URL(relativo, base));

/** Um ambiente no R2: o bucket com o endereço público e o Worker do plano B. */
export interface AmbienteDoR2 {
  bucket: string;
  /** O endereço público do bucket, com a barra no fim: o `PUBLIC_AO_VIVO` do build do site. */
  endereco: string;
  /** Os nomes, no `.env` do coletor, do Access Key ID e do Secret Access Key da chave de escrita só neste bucket. */
  variaveis: { chave: string; segredo: string };
  planoB: {
    worker: string;
    /** A configuração do wrangler do Worker, no repositório. */
    configuracao: string;
    /** A pasta dos static assets, a do `assets.directory` da configuração. */
    pasta: string;
    /** O endereço do Worker, com a barra no fim: o `PUBLIC_AO_VIVO_PLANO_B` do build do site. */
    endereco: string;
  };
}

/** Os dois ambientes no R2. */
export const AMBIENTES = {
  producao: {
    bucket: "apurador-ao-vivo",
    endereco: "https://ao-vivo.apurador.org/",
    variaveis: { chave: "R2_PRODUCAO_ACCESS_KEY_ID", segredo: "R2_PRODUCAO_SECRET_ACCESS_KEY" },
    planoB: {
      worker: "apurador-plano-b",
      configuracao: caminho("../cloudflare/plano-b.jsonc", import.meta.url),
      pasta: caminho(".cache/coletor/plano-b/"),
      endereco: "https://apurador-plano-b.hicampos93.workers.dev/",
    },
  },
  ensaio: {
    bucket: "apurador-ensaio",
    endereco: "https://ao-vivo-ensaio.apurador.org/",
    variaveis: { chave: "R2_ENSAIO_ACCESS_KEY_ID", segredo: "R2_ENSAIO_SECRET_ACCESS_KEY" },
    planoB: {
      worker: "apurador-ensaio-plano-b",
      configuracao: caminho("../cloudflare/plano-b-ensaio.jsonc", import.meta.url),
      pasta: caminho(".cache/coletor/plano-b-ensaio/"),
      endereco: "https://apurador-ensaio-plano-b.hicampos93.workers.dev/",
    },
  },
} as const satisfies Record<string, AmbienteDoR2>;

/** O `.env` do coletor, onde ficam as chaves de escrita. */
export const ARQUIVO_DE_CREDENCIAIS = caminho("packages/coletor/.env");

/** O valor do `--destino`: a produção, o ensaio ou a pasta local. */
export type NomeDoDestino = keyof typeof AMBIENTES | "pasta";

/** A pasta do plano B de `--destino pasta`: a pasta local com `-plano-b` no nome, ao lado dela. */
export const pastaDoPlanoBLocal = (pasta: string) => `${pasta.replace(/[\\/]+$/, "")}-plano-b`;

/** Os destinos de uma execução do coletor. */
export interface DestinosDoColetor {
  principal: Destino;
  planoB: Destino;
}

/** Os destinos do coletor para o `--destino`, com as chaves do `.env`. Falta de chave é erro antes da primeira rodada. */
export function destinosDoColetor(opcoes: {
  destino: NomeDoDestino;
  /** O `.env` do coletor, já lido. */
  env: Record<string, string | undefined>;
  /** A pasta local, para `--destino pasta`. */
  pasta: string;
  /** Grava os JSONs no R2 com gzip; `false` é o `--sem-gzip`. */
  comprimir: boolean;
  buscar: Buscar;
  contador: ContadorDeGravacoes;
  /** A hora em ms, pelo relógio do coletor. */
  agora: () => number;
  /** Republica o Worker do plano B com a configuração dada (`implantarWorker`). */
  implantar: (configuracao: string) => Promise<void>;
  /**
   * Os ambientes, padrão `AMBIENTES`. Os testes trocam as pastas do plano B por pastas temporárias: a republicação
   * esvazia a pasta, e a do repositório pode ser a de um ensaio em andamento.
   */
  ambientes?: Record<keyof typeof AMBIENTES, AmbienteDoR2>;
}): DestinosDoColetor {
  const { destino, env, agora } = opcoes;
  if (destino === "pasta") return { principal: pastaLocal(opcoes.pasta), planoB: republicacaoDoWorker({ pasta: pastaDoPlanoBLocal(opcoes.pasta), publicar: async () => {}, agora }) };
  const ambiente = (opcoes.ambientes ?? AMBIENTES)[destino];
  const chave = env[ambiente.variaveis.chave];
  const segredo = env[ambiente.variaveis.segredo];
  if (!chave || !segredo) throw new Error(`Falta ${ambiente.variaveis.chave} ou ${ambiente.variaveis.segredo} no .env do coletor (packages/coletor/.env)`);
  return {
    principal: destinoR2({
      conta: CONTA_DA_CLOUDFLARE,
      bucket: ambiente.bucket,
      credenciais: { chave, segredo },
      buscar: opcoes.buscar,
      contador: opcoes.contador,
      comprimir: opcoes.comprimir,
    }),
    planoB: republicacaoDoWorker({ pasta: ambiente.planoB.pasta, publicar: () => opcoes.implantar(ambiente.planoB.configuracao), agora }),
  };
}
