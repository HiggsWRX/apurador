import type { Candidatura, ConfiguracaoDeMunicipios, DetalheMunzona, MunicipioTseIbge } from "@apurador/tse";
import type { Noite } from "./noite.ts";

// O cadastro de uma noite: o que o TSE divulga de uma eleição além dos votos. São os candidatos, com o número
// sequencial, o partido, a federação, a coligação e o vice, e a geografia, com os nomes como o TSE os escreve,
// o código do IBGE e as capitais. A noite reconstruída traz só os códigos; o TSE falso precisa do cadastro
// para servir a noite no formato da divulgação, com os candidatos e a geografia daquele ano.

export interface MunicipioDoCadastro {
  /** O código do TSE. */
  codigo: number;
  /** `null` no Exterior. */
  ibge: number | null;
  nome: string;
  capital: boolean;
}

export interface UfDoCadastro {
  /** A sigla, ou `ZZ` para o Exterior. */
  sigla: string;
  nome: string;
  /** Pelo nome, como na configuração de municípios do TSE. */
  municipios: MunicipioDoCadastro[];
}

export interface CandidatoDoCadastro {
  numero: number;
  /** O `sqcand` da divulgação. */
  sequencial: string;
  nome: string;
  nomeUrna: string;
  /** `AAAA-MM-DD`. */
  nascimento: string;
  partido: { numero: number; sigla: string; nome: string };
  /** Os partidos da federação vão pelo número, em ordem. */
  federacao: { numero: number; sigla: string; nome: string; composicao: string; partidos: number[] } | null;
  /** O tipo é o da divulgação: `c` coligação, `i` partido isolado, `f` federação. */
  agremiacao: { tipo: "c" | "i" | "f"; sequencial: string; nome: string; composicao: string };
  vice: { sequencial: string; nome: string; nomeUrna: string; partido: string };
}

export interface Cadastro {
  ano: number;
  turno: number;
  /** Na ordem da configuração de municípios do TSE: pelo nome, com o Exterior entre as UFs. */
  ufs: UfDoCadastro[];
  /** Na ordem de `Noite.candidatos`. */
  candidatos: CandidatoDoCadastro[];
}

const TIPO_DA_AGREMIACAO: Record<string, "c" | "i" | "f"> = { COLIGAÇÃO: "c", "PARTIDO ISOLADO": "i", FEDERAÇÃO: "f" };

/** A ordem do TSE para os nomes: a dos caracteres, sem regra de idioma ("MÂNCIO LIMA" depois de "MARECHAL"). */
const pelaOrdemDoTse = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function cadastroDaNoite(entrada: {
  noite: Pick<Noite, "ano" | "turno" | "candidatos" | "zonas">;
  /** Todas as candidaturas do ano com abrangência nacional (`consulta_cand_<ano>_BRASIL.csv`). */
  candidaturas: Candidatura[];
  /** O detalhe por município e zona do ano: dá o nome de cada município como o TSE o escrevia na noite. */
  detalhes: DetalheMunzona[];
  tseIbge: MunicipioTseIbge[];
  /** Uma configuração de municípios da divulgação ao vivo: dá os nomes das UFs e as capitais. */
  configuracao: ConfiguracaoDeMunicipios;
}): Cadastro {
  const { noite, candidaturas } = entrada;

  const candidaturaDoTurno = (cargo: number, numero: number) => {
    const c = candidaturas.filter((x) => x.ano === noite.ano && x.turno === noite.turno && x.cargo === cargo && x.numero === numero);
    if (c.length !== 1) throw new Error(`${noite.ano}, ${noite.turno}º turno: ${c.length} candidaturas ao cargo ${cargo} com o número ${numero}`);
    return c[0]!;
  };
  const numeroDoPartido = new Map(candidaturas.map((c) => [c.partido.sigla, c.partido.numero]));
  const candidatos = noite.candidatos.map(({ numero }): CandidatoDoCadastro => {
    const titular = candidaturaDoTurno(1, numero);
    const vice = candidaturaDoTurno(2, numero);
    const tipo = TIPO_DA_AGREMIACAO[titular.agremiacao];
    if (!tipo) throw new Error(`Tipo de agremiação desconhecido: ${titular.agremiacao}`);
    const f = titular.federacao;
    if (titular.nascimento === null) throw new Error(`${titular.nomeUrna}: candidatura sem data de nascimento`);
    return {
      numero,
      sequencial: titular.sequencial,
      nome: titular.nome,
      nomeUrna: titular.nomeUrna,
      nascimento: titular.nascimento,
      partido: { ...titular.partido, nome: titular.partido.nome.toUpperCase() },
      federacao: f && {
        numero: f.numero,
        sigla: f.sigla,
        nome: f.nome.toUpperCase(),
        composicao: f.composicao,
        partidos: f.composicao
          .split("/")
          .map((sigla) => {
            const n = numeroDoPartido.get(sigla.trim());
            if (n === undefined) throw new Error(`Partido ${sigla} da federação ${f.nome} sem número nas candidaturas`);
            return n;
          })
          .sort((a, b) => a - b),
      },
      agremiacao: { tipo, sequencial: titular.coligacao.sequencial, nome: titular.coligacao.nome.toUpperCase(), composicao: titular.coligacao.composicao },
      vice: { sequencial: vice.sequencial, nome: vice.nome, nomeUrna: vice.nomeUrna, partido: vice.partido.sigla },
    };
  });

  const nomeNaNoite = new Map(entrada.detalhes.filter((d) => d.ano === noite.ano && d.turno === noite.turno).map((d) => [`${d.uf}/${d.municipio}`, d.nomeMunicipio]));
  const ibge = new Map(entrada.tseIbge.map((m) => [m.municipio, m.ibge]));
  const capitais = new Set(entrada.configuracao.ufs.flatMap((uf) => uf.municipios.filter((m) => m.capital).map((m) => m.codigo)));
  const municipiosDaUf = new Map<string, Set<number>>();
  for (const z of noite.zonas) municipiosDaUf.set(z.uf, (municipiosDaUf.get(z.uf) ?? new Set()).add(z.municipio));

  const ufs = entrada.configuracao.ufs
    .filter((uf) => municipiosDaUf.has(uf.sigla))
    .map(({ sigla, nome }): UfDoCadastro => ({
      sigla,
      nome,
      municipios: [...municipiosDaUf.get(sigla)!]
        .map((codigo) => {
          const nomeDoMunicipio = nomeNaNoite.get(`${sigla}/${codigo}`);
          if (nomeDoMunicipio === undefined) throw new Error(`${sigla}/${codigo}: município da noite sem nome no detalhe por município e zona`);
          const doIbge = sigla === "ZZ" ? null : ibge.get(codigo);
          if (doIbge === undefined) throw new Error(`${sigla}/${codigo}: município sem código do IBGE na tabela do TSE`);
          return { codigo, ibge: doIbge, nome: nomeDoMunicipio, capital: capitais.has(codigo) };
        })
        .sort((a, b) => pelaOrdemDoTse(a.nome, b.nome)),
    }));
  const semNome = [...municipiosDaUf.keys()].filter((uf) => !ufs.some((u) => u.sigla === uf));
  if (semNome.length > 0) throw new Error(`UF(s) da noite fora da configuração de municípios: ${semNome.join(", ")}`);

  return { ano: noite.ano, turno: noite.turno, ufs, candidatos };
}

/** O cadastro como fica no repositório: JSON legível no diff, um município por linha. */
export function gravarCadastro(cadastro: Cadastro): string {
  const { ufs, candidatos, ...cabecalho } = cadastro;
  const linhas = [
    ...Object.entries(cabecalho).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`),
    `"candidatos":[\n${candidatos.map((c) => JSON.stringify(c)).join(",\n")}\n]`,
    `"ufs":[\n${ufs
      .map(({ municipios, ...uf }) => `{${Object.entries(uf).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(",")},"municipios":[\n${municipios.map((m) => JSON.stringify(m)).join(",\n")}\n]}`)
      .join(",\n")}\n]`,
  ];
  return `{${linhas.join(",\n")}}\n`;
}

export const lerCadastro = (texto: string): Cadastro => JSON.parse(texto) as Cadastro;
