// A configuração de municípios e zonas da divulgação ao vivo (EA12, `mun-e<eleição>-cm.json`): as UFs,
// com o Exterior (`zz`), e os municípios de cada uma, com o código do IBGE, a capital e as zonas. É dela
// que saem as URLs dos arquivos de município e de zona, nunca adivinhadas.

import { ArquivoDoTseInvalido } from "./ao-vivo.ts";

export interface MunicipioDaConfiguracao {
  /** O código do TSE, como inteiro (o arquivo o escreve com 5 dígitos). */
  codigo: number;
  /** `null` no Exterior, que não tem código do IBGE. */
  ibge: number | null;
  nome: string;
  capital: boolean;
  /** Na ordem do arquivo. */
  zonas: number[];
}

export interface ConfiguracaoDeMunicipios {
  /** `DD/MM/AAAA HH:MM:SS`. */
  geracao: string;
  /** Na ordem do arquivo, com a sigla em maiúsculas (`ZZ` para o Exterior). */
  ufs: { sigla: string; nome: string; municipios: MunicipioDaConfiguracao[] }[];
}

type Bruto = Record<string, unknown>;

function campo<T>(objeto: unknown, nome: string, tipo: "string" | "array"): T {
  const valor = (objeto as Bruto | null)?.[nome];
  if (tipo === "array" ? !Array.isArray(valor) : typeof valor !== tipo) throw new ArquivoDoTseInvalido(`Configuração de municípios do TSE: campo "${nome}" ausente ou de outro tipo`);
  return valor as T;
}

function numero(texto: string, nome: string): number {
  const n = Number(texto);
  if (texto === "" || !Number.isInteger(n)) throw new ArquivoDoTseInvalido(`Configuração de municípios do TSE: "${nome}" inválido: ${texto}`);
  return n;
}

export function lerConfiguracaoDeMunicipios(bytes: Uint8Array): ConfiguracaoDeMunicipios {
  const raiz: unknown = JSON.parse(new TextDecoder().decode(bytes));
  return {
    geracao: `${campo<string>(raiz, "dg", "string")} ${campo<string>(raiz, "hg", "string")}`,
    ufs: campo<unknown[]>(raiz, "abr", "array").map((uf) => ({
      sigla: campo<string>(uf, "cd", "string").toUpperCase(),
      nome: campo<string>(uf, "ds", "string"),
      municipios: campo<unknown[]>(uf, "mu", "array").map((m) => {
        const ibge = campo<string>(m, "cdi", "string");
        return {
          codigo: numero(campo<string>(m, "cd", "string"), "cd"),
          ibge: ibge === "" ? null : numero(ibge, "cdi"),
          nome: campo<string>(m, "nm", "string"),
          capital: campo<string>(m, "c", "string") === "s",
          zonas: campo<string[]>(m, "z", "array").map((z) => numero(z, "z")),
        };
      }),
    })),
  };
}
