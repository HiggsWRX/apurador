import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  lerDetalheVotacaoMunzona,
  lerMunicipioTseIbge,
  lerVotacaoCandidatoMunzona,
  MEMBRO_MUNICIPIO_TSE_IBGE,
  URL_MUNICIPIO_TSE_IBGE,
  urlDadosAbertos,
  type DetalheMunzona,
} from "@apurador/tse";
import { membroComCache, membroDePresidenteComCache, RAIZ, ultimoEstadoDaNoite } from "./fontes.ts";
import { compararIds, indiceDeLugares, type Lugar } from "./lugares.ts";
import { atualizarManifesto, gravarManifesto, lerManifesto } from "./manifesto.ts";
import { doTurno, idDoTurno, resultadoDoTurno, turnoDoUltimoEstado, type Turno } from "./turno.ts";

// Gera os dados derivados no repositório a partir dos arquivos do TSE.
// Uso: npm run dados [-- --atualizar]   (--atualizar baixa de novo, em vez de usar o cache)
// O 2º turno de 2026, enquanto os arquivos oficiais não o trazem, sai do último estado da noite de 25/10 (o estado em
// disco do coletor da produção), provisório. Quando o TSE os publicar, `--atualizar` os baixa e o turno passa a eles.

const atualizar = process.argv.includes("--atualizar");
const DADOS = new URL("dados/", RAIZ);

const TURNOS = [
  { ano: 2018, turno: 1 },
  { ano: 2018, turno: 2 },
  { ano: 2022, turno: 1 },
  { ano: 2022, turno: 2 },
  { ano: 2026, turno: 1 },
  // O dia da noite, como o TSE escreve a data: o estado em disco tem de ser dela.
  { ano: 2026, turno: 2, noite: "25/10/2026" },
];

const manifestoAntes = lerManifesto();
const fontes = new Map<string, { url: string; membro: string; geracao: string[]; sha256: string; bytes: number; baixadoEm: string }>();
const derivados: { arquivo: string; sha256: string; fontes: string[] }[] = [];
const detalhesDosTurnos: DetalheMunzona[] = [];

for (const { ano, turno, noite: diaDaNoite } of TURNOS) {
  const urlCandidatos = urlDadosAbertos("votacao_candidato_munzona", ano);
  const urlDetalhes = urlDadosAbertos("detalhe_votacao_munzona", ano);
  const [arqCandidatos, arqDetalhes] = await Promise.all([
    membroDePresidenteComCache(urlCandidatos, { atualizar }),
    membroDePresidenteComCache(urlDetalhes, { atualizar }),
  ]);
  const candidatos = lerVotacaoCandidatoMunzona(arqCandidatos.dados);
  const detalhes = lerDetalheVotacaoMunzona(arqDetalhes.dados);

  for (const [arq, linhas] of [
    [arqCandidatos, candidatos],
    [arqDetalhes, detalhes],
  ] as const) {
    const { dados: _, ...fonte } = arq;
    fontes.set(arq.url, { ...fonte, geracao: [...new Set(linhas.map((l) => l.geracao))].sort() });
  }

  const arquivo = `turnos/${idDoTurno({ ano, turno })}.json`;
  let resultado: Turno;
  let fontesDoTurno = [urlCandidatos, urlDetalhes];
  if (diaDaNoite && !candidatos.some(doTurno(ano, turno))) {
    const noite = ultimoEstadoDaNoite(ano);
    if (!noite) {
      // Num checkout sem o estado em disco da noite (um clone), o turno provisório fica como o repositório o guarda.
      const guardado = manifestoAntes.derivados.find((d) => d.arquivo === arquivo);
      if (!guardado) throw new Error(`Os arquivos oficiais não têm o ${turno}º turno de ${ano}, e não há o último estado da noite nem ${arquivo}`);
      const fonteGuardada = (url: string) => manifestoAntes.fontes.find((f) => f.url === url)!;
      for (const url of guardado.fontes) fontes.set(url, fonteGuardada(url));
      derivados.push(guardado);
      console.log(`${arquivo}: provisório, mantido como está, porque este checkout não tem o último estado da noite`);
      continue;
    }
    resultado = turnoDoUltimoEstado({ ano, turno, resultados: noite.resultados });
    if (!resultado.geracao[0]!.startsWith(`${diaDaNoite} `))
      throw new Error(`O estado em disco da produção não é o de ${diaDaNoite}: a totalização final do Brasil é de ${resultado.geracao[0]}`);
    fontes.set(noite.fonte.url, { ...noite.fonte, geracao: resultado.geracao });
    fontesDoTurno = [noite.fonte.url];
  } else {
    detalhesDosTurnos.push(...detalhes.filter(doTurno(ano, turno)));
    resultado = resultadoDoTurno({ ano, turno, candidatos, detalhes });
  }
  const conteudo = serializarTurno(resultado);
  mkdirSync(new URL("turnos/", DADOS), { recursive: true });
  writeFileSync(new URL(arquivo, DADOS), conteudo);
  derivados.push({ arquivo, sha256: createHash("sha256").update(conteudo).digest("hex"), fontes: fontesDoTurno });
  console.log(
    `${arquivo}: ${resultado.candidatos.length} candidatos, ${Object.keys(resultado.lugares).length} lugar(es)${resultado.provisorio ? ", provisório, do último estado da noite" : ""}`,
  );
}

// O índice dos lugares: os que votaram em algum turno, com os municípios casados com o IBGE.
const arqIbge = await membroComCache(URL_MUNICIPIO_TSE_IBGE, MEMBRO_MUNICIPIO_TSE_IBGE, { atualizar });
const municipios = lerMunicipioTseIbge(arqIbge.dados);
{
  const { dados: _, ...fonte } = arqIbge;
  fontes.set(arqIbge.url, { ...fonte, geracao: [...new Set(municipios.map((m) => m.geracao))].sort() });
}
const lugares = indiceDeLugares({ municipios, detalhes: detalhesDosTurnos });
const conteudoLugares = serializarLugares(lugares);
writeFileSync(new URL("lugares.json", DADOS), conteudoLugares);
derivados.push({
  arquivo: "lugares.json",
  sha256: createHash("sha256").update(conteudoLugares).digest("hex"),
  fontes: [URL_MUNICIPIO_TSE_IBGE, ...new Set(TURNOS.map((t) => urlDadosAbertos("detalhe_votacao_munzona", t.ano)))],
});
console.log(`lugares.json: ${lugares.length} lugares`);

// O manifesto também tem os derivados de outros geradores (`gerar-noites.ts`), que ficam como estão.
const manifesto = atualizarManifesto(manifestoAntes, { pastas: ["turnos/", "lugares.json"], fontes: [...fontes.values()], derivados });
gravarManifesto(manifesto);
console.log(`manifesto.json: ${manifesto.fontes.length} fontes, ${derivados.length} derivados`);

/** JSON estável e legível no diff: um lugar por linha, na ordem do índice. */
function serializarLugares(lugares: Lugar[]): string {
  return `[\n${lugares.map((l) => `  ${JSON.stringify(l)}`).join(",\n")}\n]\n`;
}

/** JSON estável e legível no diff: um candidato e um lugar por linha, o Brasil e as UFs antes dos municípios. */
function serializarTurno(t: Turno): string {
  const linhas = (itens: string[]) => itens.map((s, i) => `    ${s}${i < itens.length - 1 ? "," : ""}`).join("\n");
  return [
    "{",
    `  "ano": ${t.ano},`,
    `  "turno": ${t.turno},`,
    `  "cargo": ${JSON.stringify(t.cargo)},`,
    `  "geracao": ${JSON.stringify(t.geracao)},`,
    ...(t.provisorio ? [`  "provisorio": true,`] : []),
    `  "candidatos": [`,
    linhas(t.candidatos.map((c) => JSON.stringify(c))),
    "  ],",
    `  "lugares": {`,
    linhas(
      Object.entries(t.lugares)
        .sort(([a], [b]) => compararIds(a, b))
        .map(([chave, l]) => `${JSON.stringify(chave)}: ${JSON.stringify(l)}`),
    ),
    "  }",
    "}",
    "",
  ].join("\n");
}
