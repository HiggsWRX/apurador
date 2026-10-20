import { colunas, inteiro, lerCsvTse } from "./csv.ts";

// Leitor do CSV diário de registros de pesquisas eleitorais do TSE (PesqEle, portal de dados abertos).
// O TSE só publica o registro: datas, amostra, empresa e plano amostral. Nenhum percentual.

/** O zip de um ano. Tem um CSV por UF e o `*_BRASIL.csv`, com todos os registros, inclusive os de Presidente. */
export function urlRegistrosDePesquisas(ano: number): string {
  return `https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_${ano}.zip`;
}

/** O membro do zip de registros que traz as pesquisas nacionais. */
export const membroDoBrasil = (nome: string) => nome.endsWith("_BRASIL.csv");

/** O registro de uma pesquisa no TSE: datas, amostra, empresa e plano amostral. */
export interface RegistroDePesquisa {
  /** `DT_GERACAO HH_GERACAO`: o TSE regera o arquivo todo dia. */
  geracao: string;
  /** No formato da divulgação, `BR-00466/2026` (o arquivo traz `BR004662026`). */
  registro: string;
  cnpj: string;
  empresa: string;
  /** Nome fantasia, vazio quando o TSE não tem. */
  fantasia: string;
  cargo: string;
  /** Datas `aaaa-mm-dd`: o período de coleta registrado e a data a partir da qual a divulgação é permitida. */
  inicio: string;
  fim: string;
  divulgacao: string;
  entrevistas: number;
  metodologia: string;
  planoAmostral: string;
  /** `DS_DADO_MUNICIPIO`: a área física da coleta, quando a empresa a descreve. */
  municipios: string;
}

const COLUNAS = [
  "DT_GERACAO",
  "HH_GERACAO",
  "NR_PROTOCOLO_REGISTRO",
  "NR_CNPJ_EMPRESA",
  "NM_EMPRESA",
  "NM_EMPRESA_FANTASIA",
  "DS_CARGO",
  "DT_INICIO_PESQUISA",
  "DT_FIM_PESQUISA",
  "DT_DIVULGACAO",
  "QT_ENTREVISTADO",
  "DS_METODOLOGIA_PESQUISA",
  "DS_PLANO_AMOSTRAL",
  "DS_DADO_MUNICIPIO",
] as const;

/** Lê o CSV diário de registros de pesquisas do TSE. */
export function lerRegistrosDePesquisas(bytes: Uint8Array): RegistroDePesquisa[] {
  const { cabecalho, linhas } = lerCsvTse(bytes);
  const c = colunas(cabecalho, COLUNAS);
  const texto = (l: string[], coluna: (typeof COLUNAS)[number]) => {
    const valor = l[c[coluna]] ?? "";
    return valor === "#NULO#" ? "" : valor;
  };
  return linhas.map((l) => ({
    geracao: `${texto(l, "DT_GERACAO")} ${texto(l, "HH_GERACAO")}`,
    registro: formatarRegistro(texto(l, "NR_PROTOCOLO_REGISTRO")),
    cnpj: texto(l, "NR_CNPJ_EMPRESA"),
    empresa: texto(l, "NM_EMPRESA"),
    fantasia: texto(l, "NM_EMPRESA_FANTASIA"),
    cargo: texto(l, "DS_CARGO"),
    inicio: data(texto(l, "DT_INICIO_PESQUISA"), "DT_INICIO_PESQUISA"),
    fim: data(texto(l, "DT_FIM_PESQUISA"), "DT_FIM_PESQUISA"),
    divulgacao: data(texto(l, "DT_DIVULGACAO"), "DT_DIVULGACAO"),
    entrevistas: inteiro(texto(l, "QT_ENTREVISTADO"), "QT_ENTREVISTADO"),
    metodologia: texto(l, "DS_METODOLOGIA_PESQUISA"),
    planoAmostral: texto(l, "DS_PLANO_AMOSTRAL"),
    municipios: texto(l, "DS_DADO_MUNICIPIO"),
  }));
}

function formatarRegistro(protocolo: string): string {
  const partes = protocolo.match(/^([A-Z]{2})(\d{5})(\d{4})$/);
  if (!partes) throw new Error(`Valor inválido na coluna NR_PROTOCOLO_REGISTRO: ${protocolo}`);
  return `${partes[1]}-${partes[2]}/${partes[3]}`;
}

function data(valor: string, coluna: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(valor)) throw new Error(`Valor inválido na coluna ${coluna}: ${valor}`);
  return valor.slice(0, 10);
}

const UFS = [
  "acre", "alagoas", "amapa", "amazonas", "bahia", "ceara", "distrito federal", "espirito santo", "goias", "maranhao",
  "mato grosso", "mato grosso do sul", "minas gerais", "para", "paraiba", "parana", "pernambuco", "piaui", "rio de janeiro",
  "rio grande do norte", "rio grande do sul", "rondonia", "roraima", "santa catarina", "sao paulo", "sergipe", "tocantins",
];
const SIGLAS = "ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|sp|se|to";
const GENTILICOS = [
  "acreano", "alagoano", "amapaense", "amazonense", "baiano", "cearense", "brasiliense", "capixaba", "goiano", "maranhense",
  "mato-grossense", "sul-mato-grossense", "mineiro", "paraense", "paraibano", "paranaense", "pernambucano", "piauiense",
  "fluminense", "carioca", "potiguar", "gaucho", "rondoniense", "roraimense", "catarinense", "paulista", "sergipano", "tocantinense",
];
// "eleitorado do estado do Tocantins", "residente no Distrito Federal", "restrita ao Distrito Federal", "corresponde ao
// Distrito Federal", "estado do RN", "em todo o RN", "eleitorado potiguar"... A preposição antes da UF é obrigatória:
// sem ela, "eleitorado para o dimensionamento" seria o Pará.
const ESTADUAL = new RegExp(
  [
    `\\b(?:estado|territorio|eleitorado|eleitores|residentes?|realizada|restrita|votar|corresponde)\\s+(?:d[aeo]s?|n[aeo]s?|em|ao?)\\s+(?:estado\\s+d[aeo]\\s+)?(?:${UFS.join("|")})\\b`,
    `\\b(?:estado\\s+d[aeo]|todo\\s+o)\\s+(?:${SIGLAS})\\b`,
    `\\beleitorado\\s+(?:${GENTILICOS.join("|")})\\b`,
    `abrangencia[^.]{0,40}\\bestadual\\b`,
  ].join("|"),
);
const NACIONAL = /\bbrasil\b|\bbrasileir[ao]s?\b|\bnacional\b|\bpais\b|\b(?:cinco|5 \(cinco\)) (?:grandes )?regioes\b|\b27 unidades da federacao\b/;

/**
 * Se a pesquisa é nacional ou de uma UF. O TSE registra toda pesquisa para Presidente com UF "BR", e a área só
 * aparece no texto livre da metodologia, do plano amostral e da área física. Uma UF citada como universo da pesquisa
 * vence, porque as pesquisas estaduais também repetem trechos sobre a população brasileira.
 */
export function abrangenciaDoRegistro(r: Pick<RegistroDePesquisa, "metodologia" | "planoAmostral" | "municipios">): "nacional" | "estadual" | "indefinida" {
  const texto = [r.metodologia, r.planoAmostral, r.municipios]
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (ESTADUAL.test(texto)) return "estadual";
  if (NACIONAL.test(texto)) return "nacional";
  return "indefinida";
}
