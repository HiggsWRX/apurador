import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// O contador de gravações (Volume de gravações na noite, decisões 4 e 5): o plano gratuito do R2 dá 1 milhão de
// operações classe A por mês, somando os dois buckets da conta (o de produção e o do ensaio), e passar disso vira
// cobrança. O coletor conta cada gravação que o R2 aceitou, por bucket, e guarda o contador num arquivo que sobrevive a
// um reinício e é o mesmo para o ensaio e a noite, no mesmo checkout. O mês é o do relógio em UTC; o painel da
// Cloudflare é a referência, e o ensaio confere a diferença (até 1%). A trava de 90% é do ticket 23; o estado de
// retomada e o objeto da noite, que também levam o contador, são do ticket 22.

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

/** O contador de gravações nos buckets, que os destinos R2 alimentam. */
export interface ContadorDeGravacoes {
  /** Conta uma gravação aceita no bucket. */
  contar(bucket: string): void;
  /** As gravações do mês corrente: um mês novo começa do zero. */
  doMes(): GravacoesDoMes;
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
  if (typeof valor.mes !== "string" || typeof valor.buckets !== "object" || valor.buckets === null) throw new Error(`O contador de gravações em ${caminho} não serve`);
  return valor;
}

/** Guarda o contador inteiro de uma vez, como o arquivo de controle: nunca fica um arquivo pela metade. */
export async function gravarContadorDeGravacoes(caminho: string, gravacoes: GravacoesDoMes): Promise<void> {
  await mkdir(dirname(caminho), { recursive: true });
  const provisorio = `${caminho}.tmp`;
  await writeFile(provisorio, `${JSON.stringify(gravacoes, null, 2)}\n`);
  await rename(provisorio, caminho);
}
