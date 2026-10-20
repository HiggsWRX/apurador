import type { DetalheMunzona, MunicipioTseIbge } from "@apurador/tse";

// Os lugares do site: o Brasil, as 27 UFs, o Exterior e os municípios (no Exterior, as cidades com
// posto de votação, que o TSE trata como municípios da UF `ZZ`). Não há recorte menor que município.

/** O tipo de um lugar do site. */
export type TipoDeLugar = "brasil" | "uf" | "exterior" | "municipio";

/** O artigo do nome da UF: "o Acre", "a Bahia", "São Paulo". Serve a "estado do Acre" e "na Bahia". */
export type Artigo = "o" | "a" | "";

/** Um lugar do site: o Brasil, uma UF, o Exterior, um município ou uma cidade do exterior. */
export interface Lugar {
  /** `BR`, a sigla da UF, `ZZ` (o Exterior) ou o código do TSE do município, com 5 dígitos. */
  id: string;
  tipo: TipoDeLugar;
  /** O nome curto: "Brasil", "São Paulo", "Exterior", "Campinas", "Lisboa". */
  nome: string;
  /** A UF do lugar, ou `ZZ` no Exterior e nas cidades do exterior. O Brasil não tem. */
  uf?: string;
  /** Só nas UFs. */
  artigo?: Artigo;
  /** Só nos municípios do Brasil: o código do IBGE, pela tabela `municipio_tse_ibge` do TSE. */
  ibge?: number;
  /** Os aptos no turno mais recente em que o lugar votou. Ordena a busca. */
  aptos: number;
}

/** O id de um município nos dados: o código do TSE com 5 dígitos, como o TSE o escreve ("01015"). */
export const idDoMunicipio = (codigoTse: number) => String(codigoTse).padStart(5, "0");

/** Ordena os ids como os dados os listam: o Brasil, as UFs e o Exterior pela sigla, e os municípios pelo código. */
export const compararIds = (a: string, b: string) => (a === "BR" ? -1 : b === "BR" ? 1 : a.length - b.length || a.localeCompare(b));

const UFS: Record<string, { nome: string; artigo: Artigo }> = {
  AC: { nome: "Acre", artigo: "o" },
  AL: { nome: "Alagoas", artigo: "" },
  AM: { nome: "Amazonas", artigo: "o" },
  AP: { nome: "Amapá", artigo: "o" },
  BA: { nome: "Bahia", artigo: "a" },
  CE: { nome: "Ceará", artigo: "o" },
  DF: { nome: "Distrito Federal", artigo: "o" },
  ES: { nome: "Espírito Santo", artigo: "o" },
  GO: { nome: "Goiás", artigo: "" },
  MA: { nome: "Maranhão", artigo: "o" },
  MG: { nome: "Minas Gerais", artigo: "" },
  MS: { nome: "Mato Grosso do Sul", artigo: "" },
  MT: { nome: "Mato Grosso", artigo: "" },
  PA: { nome: "Pará", artigo: "o" },
  PB: { nome: "Paraíba", artigo: "a" },
  PE: { nome: "Pernambuco", artigo: "" },
  PI: { nome: "Piauí", artigo: "o" },
  PR: { nome: "Paraná", artigo: "o" },
  RJ: { nome: "Rio de Janeiro", artigo: "o" },
  RN: { nome: "Rio Grande do Norte", artigo: "o" },
  RO: { nome: "Rondônia", artigo: "" },
  RR: { nome: "Roraima", artigo: "" },
  RS: { nome: "Rio Grande do Sul", artigo: "o" },
  SC: { nome: "Santa Catarina", artigo: "" },
  SE: { nome: "Sergipe", artigo: "" },
  SP: { nome: "São Paulo", artigo: "" },
  TO: { nome: "Tocantins", artigo: "o" },
};

const EXTERIOR = "ZZ";

/**
 * O índice dos lugares que votaram em algum dos turnos, a partir das linhas de `detalhe_votacao_munzona`
 * de todos eles. Os municípios do Brasil casam com o IBGE pela tabela do TSE, e o nome é o do IBGE.
 */
export function indiceDeLugares(entrada: { municipios: MunicipioTseIbge[]; detalhes: DetalheMunzona[] }): Lugar[] {
  const ibge = new Map(entrada.municipios.map((m) => [m.municipio, m]));
  for (const m of entrada.municipios) {
    const uf = UFS[m.uf];
    if (!uf || grafiaDoNome(m.nomeUf) !== uf.nome) throw new Error(`UF ${m.uf} (${m.nomeUf}) da tabela do IBGE não bate com a lista de UFs`);
  }

  // Para cada lugar, o turno mais recente em que votou, com os aptos e o nome do município nele.
  const recente = new Map<string, { ordemDoTurno: number; aptos: number; nome: string; uf: string; municipio: number }>();
  for (const d of entrada.detalhes) {
    const ordemDoTurno = 10 * d.ano + d.turno;
    for (const id of ["BR", d.uf, idDoMunicipio(d.municipio)]) {
      const r = recente.get(id);
      if (!r || r.ordemDoTurno < ordemDoTurno) recente.set(id, { ordemDoTurno, aptos: d.aptos, nome: d.nomeMunicipio, uf: d.uf, municipio: d.municipio });
      else if (r.ordemDoTurno === ordemDoTurno) r.aptos += d.aptos;
    }
  }

  const lugares: Lugar[] = [];
  for (const [id, r] of recente) {
    if (id === "BR") lugares.push({ id, tipo: "brasil", nome: "Brasil", aptos: r.aptos });
    else if (id === EXTERIOR) lugares.push({ id, tipo: "exterior", nome: "Exterior", uf: EXTERIOR, aptos: r.aptos });
    else if (id.length === 2) {
      const uf = UFS[id];
      if (!uf) throw new Error(`UF ${id} desconhecida nos arquivos do TSE`);
      lugares.push({ id, tipo: "uf", nome: uf.nome, uf: id, artigo: uf.artigo, aptos: r.aptos });
    } else if (r.uf === EXTERIOR) {
      lugares.push({ id, tipo: "municipio", nome: grafiaDoNomeEmCaixaAlta(r.nome), uf: EXTERIOR, aptos: r.aptos });
    } else {
      const m = ibge.get(r.municipio);
      if (!m) throw new Error(`Município ${id} (${r.nome}, ${r.uf}) sem correspondência na tabela do IBGE`);
      lugares.push({ id, tipo: "municipio", nome: grafiaDoNome(m.nomeIbge), uf: m.uf, ibge: m.ibge, aptos: r.aptos });
    }
  }

  const ORDEM: Record<TipoDeLugar, number> = { brasil: 0, uf: 1, exterior: 2, municipio: 3 };
  return lugares.sort((a, b) => ORDEM[a.tipo] - ORDEM[b.tipo] || (a.uf ?? "").localeCompare(b.uf ?? "") || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** O nome do lugar sem ambiguidade: o estado com "estado" e o município com a UF entre parênteses. */
export function nomeCompleto(lugar: Lugar): string {
  if (lugar.tipo === "uf" && lugar.uf !== "DF") return `Estado ${lugar.artigo ? `d${lugar.artigo}` : "de"} ${lugar.nome}`;
  if (lugar.tipo === "municipio") return `${lugar.nome} (${lugar.uf === EXTERIOR ? "Exterior" : lugar.uf})`;
  return lugar.nome;
}

// O TSE escreve os nomes com as preposições em maiúscula ("Bom Jesus Da Lapa", "Olho D'Água", "Pedro Ii"),
// e os das cidades do exterior todo em maiúsculas ("CIDADE DO MÉXICO", "PORT OF SPAIN").
const PREPOSICOES = new Set(["de", "da", "do", "das", "dos", "e", "del", "es", "of"]);
const ROMANO = /^[ivx]{2,}$/i;

function grafiaDoNome(nome: string): string {
  return nome
    .split(/([ -])/)
    .map((palavra, i) => {
      if (i === 0) return palavra;
      if (ROMANO.test(palavra)) return palavra.toUpperCase();
      if (PREPOSICOES.has(palavra.toLocaleLowerCase("pt-BR"))) return palavra.toLocaleLowerCase("pt-BR");
      return palavra.replace(/^D'/, "d'");
    })
    .join("");
}

function grafiaDoNomeEmCaixaAlta(nome: string): string {
  const inicial = (s: string) => s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1);
  const palavras = nome.toLocaleLowerCase("pt-BR").split(/([ -])/).map((p) => (p.startsWith("d'") ? `d'${inicial(p.slice(2))}` : inicial(p)));
  return grafiaDoNome(palavras.join(""));
}
