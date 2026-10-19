import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { lerVotacaoCandidatoMunzona, urlDadosAbertos } from "@apurador/tse";
import { membroDePresidenteComCache, RAIZ } from "./fontes.ts";
import { atualizarManifesto, gravarManifesto, lerManifesto, type FonteDoManifesto } from "./manifesto.ts";
import { resultadoHistorico, type ResultadoHistorico } from "./resultados-historicos.ts";

// Gera `dados/resultados-historicos.json`: o resultado nacional de cada eleição do histórico das pesquisas, somado
// dos arquivos do TSE. É a conferência dos resultados de 2002 a 2018, que antes vinham de tabelas secundárias.
// Uso: npm run historico [-- --atualizar]   (--atualizar baixa de novo, em vez de usar o cache)

const atualizar = process.argv.includes("--atualizar");
const ARQUIVO = "resultados-historicos.json";

/** Os seis 2º turnos do histórico do agregado e o 1º turno de 2026, das pesquisas do caso do K na calibração. */
const ELEICOES_DO_HISTORICO = [
  { ano: 2002, turno: 2 },
  { ano: 2006, turno: 2 },
  { ano: 2010, turno: 2 },
  { ano: 2014, turno: 2 },
  { ano: 2018, turno: 2 },
  { ano: 2022, turno: 2 },
  { ano: 2026, turno: 1 },
];

const fontes: FonteDoManifesto[] = [];
const resultados: ResultadoHistorico[] = [];
for (const eleicao of ELEICOES_DO_HISTORICO) {
  const url = urlDadosAbertos("votacao_candidato_munzona", eleicao.ano);
  const { dados, ...fonte } = await membroDePresidenteComCache(url, { atualizar });
  const candidatos = lerVotacaoCandidatoMunzona(dados);
  fontes.push({ ...fonte, geracao: [...new Set(candidatos.map((l) => l.geracao))].sort() });
  const resultado = resultadoHistorico(candidatos, eleicao);
  resultados.push(resultado);
  const [a, b] = resultado.finalistas;
  console.log(`${eleicao.ano}, ${eleicao.turno}º turno (${resultado.dia}): ${a.nomeUrna} ${pct(a.votos, resultado.validos)}, ${b.nomeUrna} ${pct(b.votos, resultado.validos)} dos válidos`);
}

// Um resultado por linha, para o diff mostrar o ano que mudou.
const conteudo = `{\n  "eleicoes": [\n${resultados.map((r) => `    ${JSON.stringify(r)}`).join(",\n")}\n  ]\n}\n`;
writeFileSync(new URL(`dados/${ARQUIVO}`, RAIZ), conteudo);
const derivado = { arquivo: ARQUIVO, sha256: createHash("sha256").update(conteudo).digest("hex"), fontes: fontes.map((f) => f.url) };
gravarManifesto(atualizarManifesto(lerManifesto(), { pastas: [ARQUIVO], fontes, derivados: [derivado] }));
console.log(`${ARQUIVO}: ${resultados.length} eleições`);

function pct(votos: number, validos: number): string {
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((100 * votos) / validos)}%`;
}
