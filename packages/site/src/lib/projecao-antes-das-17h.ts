import {
  antesDaPrimeiraSecao,
  curvaProjetada,
  lerConstantes,
  prepararModelo,
  projetar,
  projetarNasDuasBases,
  REGIOES,
  type Apuracao,
  type BaseDoModelo,
  type CurvaDoLugar,
  type Projecao,
  type ResultadoDoLugar,
} from "@apurador/modelo";
import constantesDoModelo from "@apurador/modelo/constantes.json";
import { indicadoresDaBase } from "@apurador/pipeline";
import baseDe2022 from "../../../../dados/bases/2022-2.json";
import base from "../../../../dados/bases/2026-2.json";
import { NOME_DA_BASE, type IdDaBase } from "./bases-da-projecao";
import { CHAVES } from "./chaves";
import { ENSAIO } from "./ensaio";
import { AGREGADO, FINALISTAS } from "./pesquisas";

// A projeção e a curva projetada de antes das 17h (Telas da página de lugar, decisão 11; Combinação de pesquisas e
// apuração, decisão 6), calculadas no build pelo mesmo `modelo` que o coletor roda na noite: sobre a base do modelo
// de 25/10 (o 1º turno de 2026 por município), a apuração de antes da primeira seção (nada totalizado, com as seções
// e os aptos do 1º turno) e o agregado de pesquisas do dia, inteiro, porque a incerteza dele cresce com os dias que
// faltam. As constantes são as congeladas pela calibração. Só a página do Brasil mostra isto: os outros lugares ficam
// com a indicação das pesquisas. No build do ensaio geral, a base é a da noite de 2022 (o 1º turno de 2022 por
// município), a mesma do coletor com `--noite 2022-2`, com o agregado de 2022 (`pesquisas.ts`).

/** A projeção do Brasil numa base da projeção, antes das 17h, com a curva projetada de 0% a 100% das seções. */
export interface ProjecaoDeUmaBase {
  id: IdDaBase;
  /** O nome da base como a página o escreve: "Só apuração" ou "Apuração + pesquisas". */
  nome: string;
  brasil: ResultadoDoLugar;
  curva: CurvaDoLugar;
  /** O peso das pesquisas: 1 antes da apuração na base com pesquisas, 0 na "Só apuração". */
  pesoDasPesquisas: number;
}

/** A base do modelo de 25/10, o 1º turno de 2026 por município, ou, no ensaio, a de 2022. */
export const BASE_DO_MODELO = (ENSAIO ? baseDe2022 : base) as unknown as BaseDoModelo;
if (BASE_DO_MODELO.finalistas[0]?.numero !== FINALISTAS[0].numero) {
  throw new Error(`a base do modelo da noite tem o ${BASE_DO_MODELO.finalistas[0]?.numero} como 1º finalista, e o agregado dá o % do ${FINALISTAS[0].numero}`);
}
const CONSTANTES = lerConstantes(constantesDoModelo);
/** A base do modelo de 25/10 preparada para projetar. */
export const MODELO = prepararModelo(BASE_DO_MODELO);
const ANTES_DA_PRIMEIRA_SECAO: Apuracao = antesDaPrimeiraSecao(BASE_DO_MODELO);

function projetarAntesDas17h(): { bases: ProjecaoDeUmaBase[]; coincidem: boolean | null } | undefined {
  if (!CHAVES.antesDas17h.projecao) return undefined;
  const deUmaBase = (id: IdDaBase, projecao: Projecao): ProjecaoDeUmaBase => ({
    id,
    nome: NOME_DA_BASE[id],
    brasil: projecao.brasil,
    curva: curvaProjetada(MODELO, ANTES_DA_PRIMEIRA_SECAO, projecao, CONSTANTES).brasil,
    pesoDasPesquisas: projecao.pesoDasPesquisas,
  });
  // A base com pesquisas deriva do agregado, como a indicação das pesquisas: sem ele no ar (a chave dele desligada, ou
  // nenhuma pesquisa na janela), fica só a "Só apuração", sem o controle. Nenhuma decisão define esse caso.
  if (!CHAVES.antesDas17h.agregado || !AGREGADO)
    return { bases: [deUmaBase("so-apuracao", projetar(MODELO, ANTES_DA_PRIMEIRA_SECAO, CONSTANTES))], coincidem: null };
  const duas = projetarNasDuasBases(MODELO, ANTES_DA_PRIMEIRA_SECAO, CONSTANTES, AGREGADO);
  return { bases: [deUmaBase("so-apuracao", duas.soApuracao), deUmaBase("com-pesquisas", duas.comPesquisas)], coincidem: duas.coincidem.brasil };
}

/**
 * A projeção de antes das 17h no Brasil, nas bases que vão ao ar, ou `undefined` com a chave da projeção desligada.
 * `coincidem` diz se as duas bases já coincidem no Brasil, ou é `null` quando só há uma.
 */
export const PROJECAO_ANTES_DAS_17H = projetarAntesDas17h();

/** A base da projeção que a página abre: a "Apuração + pesquisas", quando ela existe. */
export const BASE_PADRAO: IdDaBase = PROJECAO_ANTES_DAS_17H?.bases.some((b) => b.id === "com-pesquisas") ? "com-pesquisas" : "so-apuracao";

/** Uma região com a fração das suas seções que o 1º turno de 2026 já tinha totalizado quando o país tinha metade das suas. */
export interface ChegadaDaRegiao {
  regiao: string;
  fracao: number;
}

/** Com que % das seções do país se mede a ordem de chegada das regiões: a metade. */
export const METADE_DAS_SECOES = 50;

/**
 * A ordem de chegada típica, pelo perfil de chegada do 1º turno de 2026: as cinco regiões, da que chega mais cedo à
 * que chega mais tarde, com a fração das seções de cada uma já totalizada quando o país tinha metade. O Exterior, com
 * poucas seções e sem região, fica de fora.
 */
export const ORDEM_DE_CHEGADA: ChegadaDaRegiao[] = (() => {
  const secoes = REGIOES.map(() => 0);
  const chegadas = REGIOES.map(() => 0);
  BASE_DO_MODELO.municipios.forEach((m, i) => {
    const regiao = MODELO.regiaoDaUf[MODELO.ufDoMunicipio[i]!]!;
    if (regiao < 0) return;
    secoes[regiao]! += m.secoes;
    chegadas[regiao]! += indicadoresDaBase(m).perfilDeChegada[METADE_DAS_SECOES]! * m.secoes;
  });
  return REGIOES.map((regiao, r) => ({ regiao, fracao: secoes[r]! > 0 ? chegadas[r]! / secoes[r]! : 0 })).sort((a, b) => b.fracao - a.fracao);
})();
