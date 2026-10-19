import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  boletimDeUrna,
  historicoDeTotalizacao,
  lerBoletimDeUrna,
  lerDetalheVotacaoMunzona,
  lerDetalheVotacaoSecao,
  lerHistoricoDeTotalizacao,
  lerVotacaoCandidatoMunzona,
  urlDadosAbertos,
  type VotoSecao,
} from "@apurador/tse";
import { baseDoModelo, gravarBase } from "./base.ts";
import { membroComCache, membroDePresidenteComCache, RAIZ, type FonteBaixada } from "./fontes.ts";
import { atualizarManifesto, gravarManifesto, lerManifesto, type DerivadoDoManifesto, type FonteDoManifesto } from "./manifesto.ts";
import { divergenciasDoHistorico, divergenciasDoResultado, gravarNoite, reconstruirNoite, type Noite } from "./noite.ts";
import { PRESIDENTE } from "./presidente.ts";
import { resultadoDoTurno } from "./turno.ts";

// Gera no repositório as noites reconstruídas seção por seção (`dados/noites/`) e as bases do modelo
// (`dados/bases/`), com o manifesto de origem. Os arquivos por seção têm centenas de MB e ficam no cache.
// Uso: npm run noites [-- --atualizar]   (--atualizar baixa de novo, em vez de usar o cache)

const atualizar = process.argv.includes("--atualizar");
const DADOS = new URL("dados/", RAIZ);

/**
 * As noites a reconstruir. O carimbo é a data de geração que o TSE põe no nome dos zips do boletim de urna
 * do turno. Só 2022 tem o histórico oficial de totalização para conferir a noite instante a instante.
 */
const NOITES = [{ ano: 2022, turno: 2, carimboDoBoletim: "311020221535", historicoOficial: true }];

/** As bases do modelo: a noite que cada uma serve e o turno de onde vêm os números. */
const BASES = [
  { noite: { ano: 2022, turno: 2 }, turnoDaBase: { ano: 2022, turno: 1 } },
  { noite: { ano: 2026, turno: 2 }, turnoDaBase: { ano: 2026, turno: 1 } },
];

const fontes = new Map<string, FonteDoManifesto>();
const derivados: DerivadoDoManifesto[] = [];

function registrar(arquivo: FonteBaixada, geracao: Iterable<string>): string {
  const { dados: _, ...fonte } = arquivo;
  fontes.set(fonte.url, { ...fonte, geracao: [...new Set(geracao)].sort() });
  return fonte.url;
}

function gravar(arquivo: string, conteudo: string | Uint8Array, deOnde: string[]) {
  mkdirSync(new URL(arquivo.replace(/[^/]+$/, ""), DADOS), { recursive: true });
  writeFileSync(new URL(arquivo, DADOS), conteudo);
  derivados.push({ arquivo, sha256: createHash("sha256").update(conteudo).digest("hex"), fontes: deOnde });
}

/** Cada arquivo do TSE é lido uma vez só, mesmo quando serve a uma noite e a uma base. */
function umaVezPorAno<T>(ler: (ano: number) => Promise<T>): (ano: number) => Promise<T> {
  const lidos = new Map<number, Promise<T>>();
  return (ano) => {
    if (!lidos.has(ano)) lidos.set(ano, ler(ano));
    return lidos.get(ano)!;
  };
}

/** O resultado oficial por município e zona de um ano, os dois turnos. */
const resultadoPorZona = umaVezPorAno(async (ano) => {
  const [c, d] = await Promise.all([
    membroDePresidenteComCache(urlDadosAbertos("votacao_candidato_munzona", ano), { atualizar }),
    membroDePresidenteComCache(urlDadosAbertos("detalhe_votacao_munzona", ano), { atualizar }),
  ]);
  const candidatos = lerVotacaoCandidatoMunzona(c.dados);
  const detalhes = lerDetalheVotacaoMunzona(d.dados);
  return { urls: [registrar(c, candidatos.map((l) => l.geracao)), registrar(d, detalhes.map((l) => l.geracao))], candidatos, detalhes };
});

/** O detalhe de cada seção de um ano, os dois turnos. */
const detalheDasSecoes = umaVezPorAno(async (ano) => {
  const arquivo = await membroDePresidenteComCache(urlDadosAbertos("detalhe_votacao_secao", ano), { atualizar });
  const secoes = [...lerDetalheVotacaoSecao(arquivo.dados)];
  return { url: registrar(arquivo, secoes.map((s) => s.geracao)), secoes };
});

const reconstruidas = new Map<string, Noite>();

for (const n of NOITES) {
  const inicio = Date.now();
  const oficial = await resultadoPorZona(n.ano);
  const { candidatos } = resultadoDoTurno({ ano: n.ano, turno: n.turno, ...oficial });
  const detalhe = await detalheDasSecoes(n.ano);
  const secoesDoTurno = detalhe.secoes.filter((s) => s.turno === n.turno);

  // Um boletim de urna por UF (e o Exterior), lido um por vez (o de SP tem quase 400 MB). Dele ficam na
  // memória só os votos para Presidente, uns 2 milhões de linhas.
  const votos: VotoSecao[] = [];
  const urlsDosBoletins: string[] = [];
  for (const uf of [...new Set(secoesDoTurno.map((s) => s.uf))].sort()) {
    const { url, membro } = boletimDeUrna({ ano: n.ano, turno: n.turno, uf, carimbo: n.carimboDoBoletim });
    const arquivo = await membroComCache(url, membro, { atualizar });
    const geracao = new Set<string>();
    for (const v of lerBoletimDeUrna(arquivo.dados)) {
      geracao.add(v.geracao);
      if (v.cargo === PRESIDENTE) votos.push(v);
    }
    urlsDosBoletins.push(registrar(arquivo, geracao));
  }

  const noite = reconstruirNoite({ ano: n.ano, turno: n.turno, candidatos, secoes: secoesDoTurno, votos });
  const divergencias = divergenciasDoResultado(noite, oficial);
  if (n.historicoOficial) {
    const { url, membro } = historicoDeTotalizacao(n.ano, n.turno);
    const historico = await membroComCache(url, membro, { atualizar });
    divergencias.push(...divergenciasDoHistorico(noite, lerHistoricoDeTotalizacao(historico.dados)));
  }
  if (divergencias.length > 0) throw new Error(`A noite de ${n.ano} (${n.turno}º turno) não bate com o TSE:\n${divergencias.slice(0, 20).join("\n")}`);
  reconstruidas.set(`${n.ano}-${n.turno}`, noite);

  const arquivo = `noites/${n.ano}-${n.turno}.json.gz`;
  const gravada = gravarNoite(noite);
  gravar(arquivo, gravada, [detalhe.url, ...urlsDosBoletins, ...oficial.urls]);
  console.log(`${arquivo}: ${noite.chegadas.length} chegadas em ${noite.zonas.length} zonas, ${(gravada.length / 1e6).toFixed(2)} MB, em ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
}

for (const b of BASES) {
  const daBase = await resultadoPorZona(b.turnoDaBase.ano);
  const detalhe = await detalheDasSecoes(b.turnoDaBase.ano);
  // Os finalistas são os candidatos da noite, quando ela já tem resultado, ou os dois mais votados da base.
  const daNoite = resultadoDoTurno({ ...b.noite, ...(await resultadoPorZona(b.noite.ano)) }).candidatos;
  const finalistas = (daNoite.length > 0 ? daNoite : resultadoDoTurno({ ...b.turnoDaBase, ...daBase }).candidatos).slice(0, 2).map((c) => c.numero);
  // A geografia é a da noite, quando ela foi reconstruída; a de 25/10 só se conhece na noite.
  const noite = reconstruidas.get(`${b.noite.ano}-${b.noite.turno}`);
  const municipios = noite && [...new Map(noite.zonas.map((z) => [`${z.uf}/${z.municipio}`, { uf: z.uf, municipio: z.municipio }])).values()];

  const base = baseDoModelo({ ...b, finalistas, candidatos: daBase.candidatos, detalhes: daBase.detalhes, secoes: detalhe.secoes, municipios });
  const arquivo = `bases/${b.noite.ano}-${b.noite.turno}.json`;
  const conteudo = gravarBase(base);
  gravar(arquivo, conteudo, [...daBase.urls, detalhe.url]);
  console.log(`${arquivo}: ${base.municipios.length} municípios, ${(conteudo.length / 1e6).toFixed(2)} MB`);
}

const manifesto = atualizarManifesto(lerManifesto(), { pastas: ["noites/", "bases/"], fontes: [...fontes.values()], derivados });
gravarManifesto(manifesto);
console.log(`manifesto.json: ${manifesto.fontes.length} fontes, ${manifesto.derivados.length} derivados`);
