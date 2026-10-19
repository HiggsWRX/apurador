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
import type { Turno } from "./turno.ts";

// A conferência automática do CI: os totais de cada turno do repositório, no Brasil e em cada UF,
// contra os arquivos do TSE baixados agora, sem o cache. Falha se algo não bater.
// Uso: npm run conferir

const TURNOS = new URL("dados/turnos/", RAIZ);
const turnos = readdirSync(TURNOS)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(new URL(f, TURNOS), "utf8")) as Turno);

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
