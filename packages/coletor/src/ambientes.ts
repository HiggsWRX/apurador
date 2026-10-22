import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import type { Buscar } from "./coletor.ts";
import type { ContadorDeGravacoes } from "./contador.ts";
import { pastaLocal, type Destino } from "./destino.ts";
import { republicacaoDoWorker, type DestinoDoPlanoB } from "./plano-b.ts";
import { destinoR2 } from "./r2.ts";

// Os destinos do coletor, por configuração (Arquitetura e tecnologia, decisão 15; spec, "Uma interface de publicação"):
// o `--destino` escolhe o principal e o do plano B. Na produção, o R2 dos JSONs ao vivo e o Worker do plano B; no
// ensaio, os dele, que nunca são os de produção (Ensaio geral, decisão 5); na pasta local, que é o padrão e não pede
// chave, uma pasta e outra ao lado como plano B, sem republicação. Sem domínio (Operação na noite, decisão 14), só
// existe o Worker, que é o principal e o plano B. As chaves de escrita no R2 vêm só do `.env` do coletor, ignorado pelo
// Git, cada uma com o "Object Read & Write" de um bucket só: a do ensaio não grava na produção nem que o código erre. Os
// nomes do ensaio são os que o ticket 30 cria.

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

/** A produção (a noite e o 24/10) e o ensaio geral, com nomes, pastas e chaves que nunca se repetem entre os dois. */
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

/** Lê o `.env` do coletor sem pô-lo no ambiente do processo, ou nada se ele não existe. */
export function lerCredenciais(arquivo = ARQUIVO_DE_CREDENCIAIS): Record<string, string | undefined> {
  return existsSync(arquivo) ? parseEnv(readFileSync(arquivo, "utf8")) : {};
}

/** O valor do `--destino`: a produção, o ensaio ou a pasta local. */
export type NomeDoDestino = keyof typeof AMBIENTES | "pasta";

/** A pasta do plano B de `--destino pasta`: a pasta local com `-plano-b` no nome, ao lado dela. */
export const pastaDoPlanoBLocal = (pasta: string) => `${pasta.replace(/[\\/]+$/, "")}-plano-b`;

/** O que `criarColetor` recebe como `destino` e `planoB`; sem domínio, os dois são o mesmo Worker. */
export interface DestinosDoColetor {
  principal: Destino;
  planoB: DestinoDoPlanoB;
}

/** Os destinos do coletor para o `--destino`, com as chaves do `.env`. Falta de chave é erro antes da primeira rodada. */
export function destinosDoColetor(opcoes: {
  destino: NomeDoDestino;
  /** O `.env` do coletor, já lido (`lerCredenciais`). */
  env: Record<string, string | undefined>;
  /** A pasta local, para `--destino pasta`. */
  pasta: string;
  /** Grava os JSONs no R2 com gzip; `false` é o `--sem-gzip`. */
  comprimir: boolean;
  /** Sem domínio, só o Worker do plano B, já como principal, e sem chave do R2 (`--sem-dominio`). */
  semDominio?: boolean;
  buscar: Buscar;
  contador: ContadorDeGravacoes;
  /** A hora em ms, pelo relógio do coletor. */
  agora: () => number;
  /** Republica o Worker do plano B com a configuração dada e as variáveis a mais do wrangler (`implantarWorker`). */
  implantar: (configuracao: string, variaveis: Record<string, string>) => Promise<void>;
  /**
   * Os ambientes, padrão `AMBIENTES`. Os testes trocam as pastas do plano B por pastas temporárias: a republicação
   * esvazia a pasta, e a do repositório pode ser a de um ensaio em andamento.
   */
  ambientes?: Record<keyof typeof AMBIENTES, AmbienteDoR2>;
}): DestinosDoColetor {
  const { destino, env, agora } = opcoes;
  if (destino === "pasta")
    return { principal: pastaLocal(opcoes.pasta), planoB: republicacaoDoWorker({ pasta: pastaDoPlanoBLocal(opcoes.pasta), publicar: async () => {}, agora }) };
  const ambiente = (opcoes.ambientes ?? AMBIENTES)[destino];
  // Sem token no .env, o wrangler republica pelo login do computador (`npx wrangler login`).
  const token = env.CLOUDFLARE_API_TOKEN;
  const variaveis: Record<string, string> = token ? { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: CONTA_DA_CLOUDFLARE } : {};
  const planoB = republicacaoDoWorker({ pasta: ambiente.planoB.pasta, publicar: () => opcoes.implantar(ambiente.planoB.configuracao, variaveis), agora });
  if (opcoes.semDominio) return { principal: planoB, planoB };
  const chave = env[ambiente.variaveis.chave];
  const segredo = env[ambiente.variaveis.segredo];
  if (!chave || !segredo) throw new Error(`Falta ${ambiente.variaveis.chave} ou ${ambiente.variaveis.segredo} no .env do coletor (packages/coletor/.env)`);
  const principal = destinoR2({
    conta: CONTA_DA_CLOUDFLARE,
    bucket: ambiente.bucket,
    credenciais: { chave, segredo },
    buscar: opcoes.buscar,
    contador: opcoes.contador,
    comprimir: opcoes.comprimir,
  });
  return { principal, planoB };
}
