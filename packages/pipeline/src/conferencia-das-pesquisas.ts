import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { lerMembroRemoto, lerRegistrosDePesquisas, membroDoBrasil, urlRegistrosDePesquisas, type Buscar } from "@apurador/tse";
import { escreverCsv } from "./csv.ts";
import { finalistas, lerInstitutos, lerPesquisas, primeiraConferencia, verificarPesquisas, type ConferenciaDaPesquisa, type ExtratoDoTse } from "./pesquisas.ts";
import type { Turno } from "./turno.ts";

// A conferência diária do `pesquisas.csv` contra o CSV de registros do TSE do dia. Ela guarda no repositório o
// extrato do TSE que o CI e o site usam (`pesquisas-tse.json`) e acrescenta ao `pesquisas-verificacoes.csv` uma linha
// datada por pesquisa conferida, com a fonte e o resultado. O site nunca mostra esse registro.

const CABECALHO_DAS_VERIFICACOES = ["conferido_em", "registro", "instituto", "fonte", "tse_arquivo", "tse_geracao", "tse_sha256", "resultado"];

export async function conferirNoTse(opcoes: { dados: URL; agora: Date; buscar?: Buscar }): Promise<ConferenciaDaPesquisa[]> {
  const { dados, agora } = opcoes;
  const ler = (arquivo: string) => readFileSync(new URL(arquivo, dados), "utf8");
  const pesquisas = lerPesquisas(ler("pesquisas.csv"));
  const institutos = lerInstitutos(ler("pesquisas-institutos.csv"));
  const turno = JSON.parse(ler("turnos/2026-1.json")) as Turno;

  // Sempre da rede: a conferência vale pelo CSV do dia, que o TSE regera toda madrugada.
  const url = urlRegistrosDePesquisas(2026);
  const membro = await lerMembroRemoto({ url, membro: membroDoBrasil, buscar: opcoes.buscar });
  const registros = lerRegistrosDePesquisas(membro.dados);

  // O registro das conferências diz quando cada pesquisa entrou na lista: depois do congelamento, nenhuma entra.
  const verificacoes = new URL("pesquisas-verificacoes.csv", dados);
  const conferencias = verificarPesquisas({
    pesquisas,
    registros,
    institutos,
    finalistas: finalistas(turno),
    conferidoEm: agora.toISOString(),
    primeiraConferencia: existsSync(verificacoes) ? primeiraConferencia(readFileSync(verificacoes, "utf8")) : new Map(),
  });

  const extrato: ExtratoDoTse = {
    fonte: {
      url,
      membro: membro.nome,
      geracao: [...new Set(registros.map((r) => r.geracao))].sort(),
      sha256: createHash("sha256").update(membro.dados).digest("hex"),
      bytes: membro.dados.length,
      conferidoEm: agora.toISOString(),
    },
    registros: conferencias.flatMap((c) => (c.registro ? [c.registro] : [])).sort((a, b) => a.registro.localeCompare(b.registro)),
  };
  writeFileSync(new URL("pesquisas-tse.json", dados), `${JSON.stringify(extrato, null, 2)}\n`);

  const linhas = conferencias.map((c) => [
    extrato.fonte.conferidoEm,
    c.pesquisa.registro,
    c.pesquisa.instituto,
    c.pesquisa.fonte,
    extrato.fonte.url,
    extrato.fonte.geracao.join("; "),
    extrato.fonte.sha256,
    c.divergencias.length === 0 ? "ok" : `divergente: ${c.divergencias.join("; ")}`,
  ]);
  appendFileSync(verificacoes, escreverCsv(existsSync(verificacoes) ? linhas : [CABECALHO_DAS_VERIFICACOES, ...linhas]));
  return conferencias;
}
