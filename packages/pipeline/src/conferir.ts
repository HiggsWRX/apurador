import { readdirSync, readFileSync } from "node:fs";
import {
  lerDetalheVotacaoMunzona,
  lerMembroRemoto,
  lerVotacaoCandidatoMunzona,
  membroDePresidente,
  urlDadosAbertos,
  type ArquivoHistorico,
} from "@apurador/tse";
import { conferirTotais } from "./conferencia.ts";
import { RAIZ } from "./fontes.ts";
import { conferirResultadosHistoricos, type ResultadoHistorico } from "./resultados-historicos.ts";
import type { Turno } from "./turno.ts";

// A conferência automática do CI: os totais de cada turno do repositório, no Brasil e em cada UF, e o resultado
// nacional das eleições do histórico das pesquisas, contra os arquivos do TSE baixados agora, sem o cache. Falha se
// algo não bater.
// Uso: npm run conferir

const TURNOS = new URL("dados/turnos/", RAIZ);
const turnos = readdirSync(TURNOS)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(new URL(f, TURNOS), "utf8")) as Turno);
const historicos = (JSON.parse(readFileSync(new URL("dados/resultados-historicos.json", RAIZ), "utf8")) as { eleicoes: ResultadoHistorico[] }).eleicoes;

const baixar = async (arquivo: ArquivoHistorico, ano: number) =>
  (await lerMembroRemoto({ url: urlDadosAbertos(arquivo, ano), membro: membroDePresidente })).dados;

const oficiais = new Map(
  await Promise.all(
    [...new Set(turnos.map((t) => t.ano))].map(async (ano) => {
      const [candidatos, detalhes] = await Promise.all([baixar("votacao_candidato_munzona", ano), baixar("detalhe_votacao_munzona", ano)]);
      return [ano, { candidatos: lerVotacaoCandidatoMunzona(candidatos), detalhes: lerDetalheVotacaoMunzona(detalhes) }] as const;
    }),
  ),
);

let divergencias = 0;
for (const turno of turnos) {
  const doTurno = conferirTotais(turno, oficiais.get(turno.ano)!);
  divergencias += doTurno.length;
  console.log(`${turno.ano} ${turno.turno}º turno: ${doTurno.length === 0 ? "o Brasil, as 27 UFs e o Exterior batem com o TSE" : `${doTurno.length} divergência(s)`}`);
  for (const d of doTurno) console.log(`  ${d.lugar}, ${d.total}: repositório ${d.repositorio ?? "sem o lugar"}, TSE ${d.tse ?? "sem o lugar"}`);
}
if (divergencias > 0) {
  console.error("Os dados derivados não batem com os arquivos do TSE. Gere de novo com `npm run dados -- --atualizar` e confira a diferença.");
  process.exitCode = 1;
}

// Os anos de 2002 a 2014 só servem ao histórico das pesquisas: basta o arquivo dos candidatos.
const candidatosPorAno = new Map(
  await Promise.all(
    [...new Set(historicos.map((r) => r.ano))].map(
      async (ano) => [ano, oficiais.get(ano)?.candidatos ?? lerVotacaoCandidatoMunzona(await baixar("votacao_candidato_munzona", ano))] as const,
    ),
  ),
);
const doHistorico = conferirResultadosHistoricos(historicos, candidatosPorAno);
console.log(`Resultados do histórico das pesquisas: ${doHistorico.length === 0 ? `as ${historicos.length} eleições batem com o TSE` : `${doHistorico.length} divergência(s)`}`);
for (const d of doHistorico) console.log(`  ${d}`);
if (doHistorico.length > 0) {
  console.error("resultados-historicos.json não bate com os arquivos do TSE. Gere de novo com `npm run historico -- --atualizar` e confira a diferença.");
  process.exitCode = 1;
}
