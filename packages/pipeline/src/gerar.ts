import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { lerDetalheVotacaoMunzona, lerVotacaoCandidatoMunzona, urlDadosAbertos } from "@apurador/tse";
import { membroDePresidenteComCache, RAIZ } from "./fontes.ts";
import { atualizarManifesto, gravarManifesto, lerManifesto } from "./manifesto.ts";
import { resultadoDoTurno, type Turno } from "./turno.ts";

// Gera os dados derivados no repositório a partir dos arquivos do TSE.
// Uso: npm run dados [-- --atualizar]   (--atualizar baixa de novo, em vez de usar o cache)

const atualizar = process.argv.includes("--atualizar");
const DADOS = new URL("dados/", RAIZ);

const TURNOS = [{ ano: 2026, turno: 1 }];

const fontes = new Map<string, { url: string; membro: string; geracao: string[]; sha256: string; bytes: number; baixadoEm: string }>();
const derivados: { arquivo: string; sha256: string; fontes: string[] }[] = [];

for (const { ano, turno } of TURNOS) {
  const urlCandidatos = urlDadosAbertos("votacao_candidato_munzona", ano);
  const urlDetalhes = urlDadosAbertos("detalhe_votacao_munzona", ano);
  const [arqCandidatos, arqDetalhes] = await Promise.all([membroDePresidenteComCache(urlCandidatos, { atualizar }), membroDePresidenteComCache(urlDetalhes, { atualizar })]);
  const candidatos = lerVotacaoCandidatoMunzona(arqCandidatos.dados);
  const detalhes = lerDetalheVotacaoMunzona(arqDetalhes.dados);

  for (const [arq, linhas] of [
    [arqCandidatos, candidatos],
    [arqDetalhes, detalhes],
  ] as const) {
    const { dados: _, ...fonte } = arq;
    fontes.set(arq.url, { ...fonte, geracao: [...new Set(linhas.map((l) => l.geracao))].sort() });
  }

  const resultado = resultadoDoTurno({ ano, turno, candidatos, detalhes });
  const arquivo = `turnos/${ano}-${turno}.json`;
  const conteudo = serializarTurno(resultado);
  mkdirSync(new URL("turnos/", DADOS), { recursive: true });
  writeFileSync(new URL(arquivo, DADOS), conteudo);
  derivados.push({ arquivo, sha256: createHash("sha256").update(conteudo).digest("hex"), fontes: [urlCandidatos, urlDetalhes] });
  console.log(`${arquivo}: ${resultado.candidatos.length} candidatos, ${Object.keys(resultado.lugares).length} lugar(es)`);
}

// O manifesto também tem os derivados de outros geradores (`gerar-noites.ts`), que ficam como estão.
const manifesto = atualizarManifesto(lerManifesto(), { pastas: ["turnos/"], fontes: [...fontes.values()], derivados });
gravarManifesto(manifesto);
console.log(`manifesto.json: ${manifesto.fontes.length} fontes, ${derivados.length} derivados`);

/** JSON estável e legível no diff: um candidato e um lugar por linha. */
function serializarTurno(t: Turno): string {
  const linhas = (itens: string[]) => itens.map((s, i) => `    ${s}${i < itens.length - 1 ? "," : ""}`).join("\n");
  return [
    "{",
    `  "ano": ${t.ano},`,
    `  "turno": ${t.turno},`,
    `  "cargo": ${JSON.stringify(t.cargo)},`,
    `  "geracao": ${JSON.stringify(t.geracao)},`,
    `  "candidatos": [`,
    linhas(t.candidatos.map((c) => JSON.stringify(c))),
    "  ],",
    `  "lugares": {`,
    linhas(Object.entries(t.lugares).map(([chave, l]) => `${JSON.stringify(chave)}: ${JSON.stringify(l)}`)),
    "  }",
    "}",
    "",
  ].join("\n");
}
