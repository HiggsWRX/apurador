import { readdirSync, readFileSync } from "node:fs";
import {
  lerDetalheVotacaoMunzona,
  lerMembroRemoto,
  lerVotacaoCandidatoMunzona,
  membroDePresidente,
  urlDadosAbertos,
  type ArquivoHistorico,
} from "@apurador/tse";
import { conferenciaDoTurno } from "./conferencia.ts";
import { RAIZ } from "./fontes.ts";
import { conferirResultadosHistoricos, type ResultadoHistorico } from "./resultados-historicos.ts";
import type { Turno } from "./turno.ts";

// A conferência automática do CI: os totais de cada turno do repositório, no Brasil e em cada UF, e o resultado
// nacional das eleições do histórico das pesquisas, contra os arquivos do TSE baixados agora, sem o cache. Falha se
// algo não bater, e também quando os arquivos oficiais trazem o turno provisório: é o aviso para gerá-lo de novo.
// Uso: npm run conferir

const TURNOS = new URL("dados/turnos/", RAIZ);
const turnos = readdirSync(TURNOS)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(new URL(f, TURNOS), "utf8")) as Turno);
const historicos = (JSON.parse(readFileSync(new URL("dados/resultados-historicos.json", RAIZ), "utf8")) as { eleicoes: ResultadoHistorico[] }).eleicoes;

const baixar = async (arquivo: ArquivoHistorico, ano: number) =>
  (await lerMembroRemoto({ url: urlDadosAbertos(arquivo, ano), membro: membroDePresidente })).dados;

// Os anos de 2002 a 2014 só servem ao histórico das pesquisas: basta o arquivo dos candidatos, baixado junto com os
// dos turnos.
const anosDosTurnos = [...new Set(turnos.map((t) => t.ano))];
const anosSoDoHistorico = [...new Set(historicos.map((r) => r.ano))].filter((ano) => !anosDosTurnos.includes(ano));
const [oficiais, soDoHistorico] = await Promise.all([
  Promise.all(
    anosDosTurnos.map(async (ano) => {
      const [candidatos, detalhes] = await Promise.all([baixar("votacao_candidato_munzona", ano), baixar("detalhe_votacao_munzona", ano)]);
      return [ano, { candidatos: lerVotacaoCandidatoMunzona(candidatos), detalhes: lerDetalheVotacaoMunzona(detalhes) }] as const;
    }),
  ).then((anos) => new Map(anos)),
  Promise.all(anosSoDoHistorico.map(async (ano) => [ano, lerVotacaoCandidatoMunzona(await baixar("votacao_candidato_munzona", ano))] as const)),
]);

let passam = true;
for (const turno of turnos) {
  const { passa, linhas } = conferenciaDoTurno(turno, oficiais.get(turno.ano)!);
  passam &&= passa;
  for (const linha of linhas) console.log(linha);
}
if (!passam) {
  console.error("Os dados derivados não batem com os arquivos do TSE. Gere de novo com `npm run dados -- --atualizar` e confira a diferença.");
  process.exitCode = 1;
}

const candidatosPorAno = new Map([...[...oficiais].map(([ano, o]) => [ano, o.candidatos] as const), ...soDoHistorico]);
const doHistorico = conferirResultadosHistoricos(historicos, candidatosPorAno);
console.log(
  `Resultados do histórico das pesquisas: ${doHistorico.length === 0 ? `as ${historicos.length} eleições batem com o TSE` : `${doHistorico.length} divergência(s)`}`,
);
for (const d of doHistorico) console.log(`  ${d}`);
if (doHistorico.length > 0) {
  console.error("resultados-historicos.json não bate com os arquivos do TSE. Gere de novo com `npm run historico -- --atualizar` e confira a diferença.");
  process.exitCode = 1;
}
