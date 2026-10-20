// As chaves de publicação da noite, os avisos prontos e o controle do dono: o vocabulário que o comando da noite grava no
// arquivo de controle, que o coletor lê a cada rodada e publica no arquivo de rodada, e que a página lê de lá (Ensaio
// geral, decisão 19; Operação na noite, decisões 9 e 10). Este módulo não importa nada do Node: a página importa os
// valores por `@apurador/coletor/chaves`, e o resto do coletor, pelo índice.

/**
 * Cada chave de publicação da noite, uma por bloco, na ordem em que o comando as lista: como o terminal a escreve
 * (`rotulo`), o nome no comando, que é também a palavra de confirmação (`comando`), e o gênero do rótulo, para as frases.
 */
export const CHAVES_DA_NOITE = {
  nucleoMinimo: { rotulo: "núcleo mínimo", comando: "nucleo-minimo", genero: "o" },
  projecao: { rotulo: "projeção", comando: "projecao", genero: "a" },
  baseComPesquisas: { rotulo: "base Apuração + pesquisas", comando: "base-com-pesquisas", genero: "a" },
  simulador: { rotulo: "simulador", comando: "simulador", genero: "o" },
  mapa: { rotulo: "mapa", comando: "mapa", genero: "o" },
  textosPreditivos: { rotulo: "textos preditivos", comando: "textos-preditivos", genero: "os" },
} as const satisfies Record<string, { rotulo: string; comando: string; genero: "o" | "a" | "os" }>;

/** O nome de uma chave de publicação da noite, como vai no arquivo de rodada. */
export type NomeDaChave = keyof typeof CHAVES_DA_NOITE;

/** Os nomes das seis chaves, na ordem do comando. */
export const NOMES_DAS_CHAVES = Object.keys(CHAVES_DA_NOITE) as NomeDaChave[];

/** O estado das chaves de publicação da noite: `true` é ligada. Desligar o núcleo mínimo é o plano zero. */
export type ChavesDaNoite = Record<NomeDaChave, boolean>;

/** Os três avisos prontos (Operação na noite, decisão 10), pelo número que o arquivo de rodada leva. Não há texto livre. */
export const AVISOS_PRONTOS = {
  1: "O TSE está demorando a divulgar novos dados. Os números abaixo são os mais recentes divulgados.",
  2: "O Apurador está com instabilidade. Acompanhe também no app oficial do TSE.",
  3: "A projeção do Apurador está suspensa. O placar oficial do TSE continua atualizado.",
} as const;

/** O número de um aviso pronto. */
export type AvisoPronto = keyof typeof AVISOS_PRONTOS;

/** O trecho do aviso 2 que leva o link do app oficial do TSE: fica ao lado do texto para a página nunca procurar outro. */
export const TRECHO_COM_LINK_DO_TSE = "app oficial do TSE";

/** O que o dono controla na noite, de um conjunto fechado: cada chave, o aviso pronto ativo e o destino. */
export interface Controle {
  chaves: ChavesDaNoite;
  /** O aviso pronto publicado, ou `null` sem aviso. Só há um por vez. */
  aviso: AvisoPronto | null;
  /** O destino passou ao plano B (Operação na noite, decisão 14). Só vai, e o efeito é do ticket 20. */
  planoB: boolean;
}

/**
 * O controle de um coletor que não lê arquivo de controle nenhum (o replay e os testes): tudo ligado, menos os textos
 * preditivos, desligados até a confirmação por escrito (Segunda consulta jurídica). O coletor de verdade, sem arquivo
 * de controle, parte das chaves do arquivo de chaves do site (`controle.ts`), que a página também usa antes dele.
 */
export const CONTROLE_INICIAL: Controle = {
  chaves: { nucleoMinimo: true, projecao: true, baseComPesquisas: true, simulador: true, mapa: true, textosPreditivos: false },
  aviso: null,
  planoB: false,
};

/** As chaves como valem: o simulador parte da projeção e só fica ligado com ela (Operação na noite, decisão 9). */
export function chavesEfetivas(chaves: ChavesDaNoite): ChavesDaNoite {
  return { ...chaves, simulador: chaves.simulador && chaves.projecao };
}

/** `true` quando o valor é um dos números dos avisos prontos. */
export const ehAvisoPronto = (valor: unknown): valor is AvisoPronto => typeof valor === "number" && valor in AVISOS_PRONTOS;

const ehObjeto = (valor: unknown): valor is Record<string, unknown> => typeof valor === "object" && valor !== null && !Array.isArray(valor);

/**
 * Lê as chaves da noite de um valor desconhecido (o arquivo de controle ou a seção `noite` do arquivo de chaves do
 * site), recusando chave faltando, desconhecida ou que não seja `true` ou `false`: um erro de digitação nunca liga um
 * bloco sem querer.
 */
export function lerChaves(valor: unknown): ChavesDaNoite {
  if (!ehObjeto(valor)) throw new Error("As chaves deveriam ser um objeto");
  const faltando = NOMES_DAS_CHAVES.filter((nome) => !(nome in valor));
  const desconhecidas = Object.keys(valor).filter((nome) => !NOMES_DAS_CHAVES.includes(nome as NomeDaChave));
  if (faltando.length > 0 || desconhecidas.length > 0) {
    throw new Error(`Chaves faltando (${faltando.join(", ")}) ou desconhecidas (${desconhecidas.join(", ")})`);
  }
  const chaves = {} as ChavesDaNoite;
  for (const nome of NOMES_DAS_CHAVES) {
    const v = valor[nome];
    if (typeof v !== "boolean") throw new Error(`A chave ${nome} deveria ser true ou false, não ${JSON.stringify(v)}`);
    chaves[nome] = v;
  }
  return chaves;
}

/** Lê um controle de um valor desconhecido (o arquivo de controle), com a mesma recusa de `lerChaves`, e aplica as dependências. */
export function lerControle(valor: unknown): Controle {
  if (!ehObjeto(valor)) throw new Error("O controle deveria ser um objeto com `chaves`");
  const chaves = lerChaves(valor.chaves);
  if (valor.aviso !== null && !ehAvisoPronto(valor.aviso)) throw new Error(`O aviso deveria ser null, 1, 2 ou 3, não ${JSON.stringify(valor.aviso)}`);
  if (typeof valor.planoB !== "boolean") throw new Error(`planoB deveria ser true ou false, não ${JSON.stringify(valor.planoB)}`);
  return { chaves: chavesEfetivas(chaves), aviso: valor.aviso, planoB: valor.planoB };
}
