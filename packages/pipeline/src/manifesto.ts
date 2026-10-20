import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { RAIZ } from "./fontes.ts";

// O manifesto de origem dos dados derivados (`dados/manifesto.json`): de que arquivo do TSE, de que data de
// geração e com que hash veio cada derivado. Mais de um gerador escreve nele, cada um nas suas pastas.

/** Um arquivo do TSE de onde saiu algum derivado. */
export interface FonteDoManifesto {
  url: string;
  membro: string;
  /** Hash do membro extraído (o CSV), não do zip inteiro, que nunca é baixado. */
  sha256: string;
  bytes: number;
  baixadoEm: string;
  /** As datas de geração do TSE no arquivo (`DT_GERACAO HH_GERACAO`). */
  geracao: string[];
}

/** Um arquivo derivado do repositório, com o hash e as fontes. */
export interface DerivadoDoManifesto {
  /** O caminho dentro de `dados/`. */
  arquivo: string;
  sha256: string;
  /** As URLs das fontes. */
  fontes: string[];
}

/** O manifesto de origem dos dados derivados (`dados/manifesto.json`). */
export interface Manifesto {
  fontes: FonteDoManifesto[];
  derivados: DerivadoDoManifesto[];
}

const ARQUIVO = new URL("dados/manifesto.json", RAIZ);

/**
 * O manifesto depois de um gerador regravar os seus derivados: troca tudo o que está nas pastas dele, mantém
 * o que os outros geradores gravaram e só guarda as fontes que algum derivado usa. O que já estava fica no
 * lugar, e o que é novo vem no fim.
 *
 * Uma fonte é identificada pela URL. Se ela mudou (o TSE regera os arquivos) e ainda serve a derivados de
 * outro gerador, esses derivados ficam velhos: o aviso pede para rodar o outro gerador também.
 */
export function atualizarManifesto(
  atual: Manifesto,
  gerado: { pastas: string[]; fontes: FonteDoManifesto[]; derivados: DerivadoDoManifesto[] },
  avisar: (aviso: string) => void = console.warn,
): Manifesto {
  const doGerador = (d: DerivadoDoManifesto) => gerado.pastas.some((p) => d.arquivo.startsWith(p));
  const novos = new Map(gerado.derivados.map((d) => [d.arquivo, d]));
  const outros = atual.derivados.filter((d) => !doGerador(d));
  const derivados = [
    ...atual.derivados.flatMap((d) => (!doGerador(d) ? [d] : novos.has(d.arquivo) ? [novos.get(d.arquivo)!] : [])),
    ...gerado.derivados.filter((d) => !atual.derivados.some((a) => a.arquivo === d.arquivo)),
  ];

  const fontes = new Map(atual.fontes.map((f) => [f.url, f]));
  for (const f of gerado.fontes) {
    const antes = fontes.get(f.url);
    const afetados = outros.filter((d) => d.fontes.includes(f.url)).map((d) => d.arquivo);
    if (antes && antes.sha256 !== f.sha256 && afetados.length > 0) avisar(`A fonte ${f.url} mudou e ainda serve a ${afetados.join(", ")}: rode também o gerador desses derivados`);
    fontes.set(f.url, f);
  }
  const usadas = new Set(derivados.flatMap((d) => d.fontes));
  for (const url of usadas) if (!fontes.has(url)) throw new Error(`Um derivado usa a fonte ${url}, que não está no manifesto`);

  return { fontes: [...fontes.values()].filter((f) => usadas.has(f.url)), derivados };
}

/** O manifesto do repositório, ou um vazio se ele ainda não existe. */
export function lerManifesto(): Manifesto {
  return existsSync(ARQUIVO) ? (JSON.parse(readFileSync(ARQUIVO, "utf8")) as Manifesto) : { fontes: [], derivados: [] };
}

/** Grava o manifesto em `dados/manifesto.json`. */
export function gravarManifesto(manifesto: Manifesto): void {
  writeFileSync(ARQUIVO, `${JSON.stringify(manifesto, null, 2)}\n`);
}
