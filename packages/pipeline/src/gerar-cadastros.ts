import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  lerCandidaturas,
  lerConfiguracaoDeMunicipios,
  lerDetalheVotacaoMunzona,
  lerMunicipioTseIbge,
  MEMBRO_MUNICIPIO_TSE_IBGE,
  membroCandidaturasDoBrasil,
  URL_MUNICIPIO_TSE_IBGE,
  urlCandidaturas,
  urlDadosAbertos,
} from "@apurador/tse";
import { cadastroDaNoite, gravarCadastro } from "./cadastro.ts";
import { arquivoComCache, membroComCache, membroDePresidenteComCache, RAIZ, type FonteBaixada } from "./fontes.ts";
import { atualizarManifesto, gravarManifesto, lerManifesto, type DerivadoDoManifesto, type FonteDoManifesto } from "./manifesto.ts";
import { lerNoite } from "./noite.ts";

// Gera o cadastro das noites que o TSE falso serve (`dados/cadastros/`), com o manifesto de origem. Lê a noite
// já reconstruída em `dados/noites/` (rode `npm run noites` antes, se ela mudar).
// Uso: npm run cadastros [-- --atualizar]   (--atualizar baixa de novo, em vez de usar o cache)

const atualizar = process.argv.includes("--atualizar");
const DADOS = new URL("dados/", RAIZ);

/** O TSE falso serve só a noite do ensaio geral. */
const NOITES = [{ ano: 2022, turno: 2 }];

/** A configuração de municípios da divulgação de 2026: dá os nomes das UFs e as capitais, que não mudaram desde 2022. */
const CONFIGURACAO = "https://resultados.tse.jus.br/oficial/ele2026/6258/config/mun-e006258-cm.json";

const fontes = new Map<string, FonteDoManifesto>();
const derivados: DerivadoDoManifesto[] = [];

function registrar(arquivo: FonteBaixada, geracao: Iterable<string>): string {
  const { dados: _, ...fonte } = arquivo;
  fontes.set(fonte.url, { ...fonte, geracao: [...new Set(geracao)].sort() });
  return fonte.url;
}

const arqConfiguracao = await arquivoComCache(CONFIGURACAO, { atualizar });
const configuracao = lerConfiguracaoDeMunicipios(arqConfiguracao.dados);
const arqIbge = await membroComCache(URL_MUNICIPIO_TSE_IBGE, MEMBRO_MUNICIPIO_TSE_IBGE, { atualizar });
const tseIbge = lerMunicipioTseIbge(arqIbge.dados);
const urlsComuns = [
  registrar(arqConfiguracao, [configuracao.geracao]),
  registrar(
    arqIbge,
    tseIbge.map((m) => m.geracao),
  ),
];

for (const { ano, turno } of NOITES) {
  const noite = lerNoite(new Uint8Array(readFileSync(new URL(`noites/${ano}-${turno}.json.gz`, DADOS))));
  const arqCandidaturas = await membroComCache(urlCandidaturas(ano), `consulta_cand_${ano}_BRASIL.csv`, { atualizar, casa: membroCandidaturasDoBrasil });
  const candidaturas = lerCandidaturas(arqCandidaturas.dados);
  const arqDetalhes = await membroDePresidenteComCache(urlDadosAbertos("detalhe_votacao_munzona", ano), { atualizar });
  const detalhes = lerDetalheVotacaoMunzona(arqDetalhes.dados);

  const cadastro = cadastroDaNoite({ noite, candidaturas, detalhes, tseIbge, configuracao });
  const arquivo = `cadastros/${ano}-${turno}.json`;
  const conteudo = gravarCadastro(cadastro);
  mkdirSync(new URL("cadastros/", DADOS), { recursive: true });
  writeFileSync(new URL(arquivo, DADOS), conteudo);
  derivados.push({
    arquivo,
    sha256: createHash("sha256").update(conteudo).digest("hex"),
    fontes: [
      registrar(
        arqCandidaturas,
        candidaturas.map((c) => c.geracao),
      ),
      registrar(
        arqDetalhes,
        detalhes.map((d) => d.geracao),
      ),
      ...urlsComuns,
    ],
  });
  const municipios = cadastro.ufs.reduce((s, uf) => s + uf.municipios.length, 0);
  console.log(`${arquivo}: ${cadastro.candidatos.length} candidatos, ${cadastro.ufs.length} UFs, ${municipios} municípios`);
}

const manifesto = atualizarManifesto(lerManifesto(), { pastas: ["cadastros/"], fontes: [...fontes.values()], derivados });
gravarManifesto(manifesto);
console.log(`manifesto.json: ${manifesto.fontes.length} fontes, ${manifesto.derivados.length} derivados`);
