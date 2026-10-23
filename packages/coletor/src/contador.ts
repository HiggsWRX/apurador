import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// O contador de gravações (Volume de gravações na noite, decisões 4 e 5): o plano gratuito do R2 dá 1 milhão de
// operações classe A por mês, somando os dois buckets da conta (o de produção e o do ensaio), e passar disso vira
// cobrança. O coletor conta cada gravação que o R2 aceitou, por bucket, e guarda o contador num arquivo que sobrevive a
// um reinício e é o mesmo para o ensaio e a noite, no mesmo checkout. O mês é o do relógio em UTC; o painel da
// Cloudflare é a referência, e o ensaio confere a diferença (até 1%). Com 90% do plano, o coletor trava as gravações
// (`TRAVA_DAS_GRAVACOES`). O estado de retomada e o objeto da noite também levam o contador: numa outra máquina, sem o
// arquivo, a retomada o junta a ele.

const RAIZ = new URL("../../../", import.meta.url);

/** O arquivo padrão do contador, na raiz do repositório, ao lado do arquivo de controle. */
export const ARQUIVO_DO_CONTADOR = fileURLToPath(new URL(".cache/coletor/gravacoes.json", RAIZ));

/** As gravações de um mês, por bucket. */
export interface GravacoesDoMes {
  /** `AAAA-MM`, em UTC. */
  mes: string;
  /** Quantas gravações cada bucket recebeu no mês, pelo nome do bucket. */
  buckets: Record<string, number>;
}

/** As gravações do mês somando os buckets: o que conta contra o 1 milhão do plano gratuito. */
export const somaDoMes = (gravacoes: GravacoesDoMes) => Object.values(gravacoes.buckets).reduce((soma, n) => soma + n, 0);

/**
 * A trava (Volume de gravações na noite, decisão 5): com 90% do plano gratuito no mês, 900 mil gravações, o coletor passa
 * sozinho a gravar só o essencial, porque a alternativa é cobrança.
 */
export const TRAVA_DAS_GRAVACOES = 900_000;

/** O contador de gravações nos buckets, que os destinos R2 alimentam. */
export interface ContadorDeGravacoes {
  /** Conta uma gravação aceita no bucket. */
  contar(bucket: string): void;
  /** As gravações do mês corrente: um mês novo começa do zero. */
  doMes(): GravacoesDoMes;
  /** Junta o contador do estado de que o coletor retoma (`juntarGravacoes`): numa outra máquina, é o único. */
  juntar(outro: GravacoesDoMes | null): void;
}

/** O contador, a partir do que estava guardado (ou do zero) e do relógio em ms. */
export function criarContadorDeGravacoes(guardado: GravacoesDoMes | null, agora: () => number): ContadorDeGravacoes {
  let atual: GravacoesDoMes = guardado ?? { mes: "", buckets: {} };
  const emDia = () => {
    const mes = new Date(agora()).toISOString().slice(0, 7);
    if (atual.mes !== mes) atual = { mes, buckets: {} };
    return atual;
  };
  return {
    contar(bucket) {
      const { buckets } = emDia();
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    },
    doMes: () => structuredClone(emDia()),
    juntar(outro) {
      atual = juntarGravacoes(emDia(), structuredClone(outro))!;
    },
  };
}

/** Lê o contador guardado, ou `null` se ainda não há arquivo. */
export async function lerContadorDeGravacoes(caminho: string): Promise<GravacoesDoMes | null> {
  let texto: string;
  try {
    texto = await readFile(caminho, "utf8");
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw erro;
  }
  const valor = JSON.parse(texto) as GravacoesDoMes;
  if (typeof valor.mes !== "string" || typeof valor.buckets !== "object" || valor.buckets === null)
    throw new Error(`O contador de gravações em ${caminho} não serve`);
  return valor;
}

/** Guarda o contador inteiro de uma vez, como o arquivo de controle: nunca fica um arquivo pela metade. */
export async function gravarContadorDeGravacoes(caminho: string, gravacoes: GravacoesDoMes): Promise<void> {
  await mkdir(dirname(caminho), { recursive: true });
  const provisorio = `${caminho}.tmp`;
  await writeFile(provisorio, `${JSON.stringify(gravacoes, null, 2)}\n`);
  await rename(provisorio, caminho);
}

/**
 * O contador de duas fontes, na retomada: o arquivo do contador e o estado de que o coletor retoma, que numa outra
 * máquina é o único. No mesmo mês, fica o maior de cada bucket; em meses diferentes, o mais novo.
 */
export function juntarGravacoes(a: GravacoesDoMes | null, b: GravacoesDoMes | null): GravacoesDoMes | null {
  if (!a || !b) return a ?? b;
  if (a.mes !== b.mes) return a.mes > b.mes ? a : b;
  const buckets = { ...a.buckets };
  for (const [bucket, n] of Object.entries(b.buckets)) buckets[bucket] = Math.max(buckets[bucket] ?? 0, n);
  return { mes: a.mes, buckets };
}
