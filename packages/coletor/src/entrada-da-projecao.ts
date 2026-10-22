import { readFileSync } from "node:fs";
import { agregadoDePesquisas, DIA_DA_ELEICAO, lerConstantes, type BaseDoModelo } from "@apurador/modelo";
import {
  agregadoDaNoite,
  finalistas,
  lerPesquisasHistoricas,
  listaDasPesquisas,
  pesquisasDoAgregado,
  type ExtratoDoTse,
  type ResultadoHistorico,
  type Turno,
} from "@apurador/pipeline";
import type { EntradaDaProjecao } from "./projecao.ts";

// O que o coletor projeta em cada noite, lido do repositório quando ele parte: a base do modelo da noite (o 1º turno
// por município, `dados/bases`), as constantes congeladas pela calibração e o agregado de pesquisas da noite, no 1º
// finalista da base. Na de 2026, o agregado é o do pesquisas.csv no dia da eleição, com a incerteza de 1,5 ponto, o
// mesmo que a página mostra depois do congelamento; uma pesquisa retirada na noite só entra num coletor reiniciado.
// Na de 2022, que o TSE falso serve no ensaio geral e no replay, é o da véspera pela regra do agregado, como na
// calibração.

/** As noites que o coletor projeta: o 2º turno de 2026 e o de 2022, o do TSE falso. */
export type NoiteDaProjecao = "2026-2" | "2022-2";

/** As noites, na ordem em que o `--noite` do coletor as aceita. */
export const NOITES_DA_PROJECAO: NoiteDaProjecao[] = ["2026-2", "2022-2"];

const RAIZ = new URL("../../../", import.meta.url);

/** A entrada da projeção de uma noite, com os arquivos do repositório em `raiz`. */
export function lerEntradaDaProjecao(noite: NoiteDaProjecao, raiz: URL = RAIZ): EntradaDaProjecao {
  const ler = (caminho: string) => readFileSync(new URL(caminho, raiz), "utf8");
  const base = JSON.parse(ler(`dados/bases/${noite}.json`)) as BaseDoModelo;
  const constantes = lerConstantes(JSON.parse(ler("packages/modelo/constantes.json")));
  const numeros = base.finalistas.map((f) => f.numero) as [number, number];
  if (noite === "2022-2") {
    const pesquisas = lerPesquisasHistoricas(ler("dados/pesquisas-historicas.csv"));
    const resultados = (JSON.parse(ler("dados/resultados-historicos.json")) as { eleicoes: ResultadoHistorico[] }).eleicoes;
    return { base, constantes, agregado: agregadoDaNoite(pesquisas, resultados, { ano: 2022, turno: 2 }, numeros) };
  }
  const turno = JSON.parse(ler("dados/turnos/2026-1.json")) as Turno;
  // O agregado dá o % do 1º finalista do 1º turno: a base tem de tê-lo na mesma posição.
  if (finalistas(turno)[0] !== numeros[0])
    throw new Error(`a base do modelo de ${noite} tem o ${numeros[0]} como 1º finalista, e o agregado dá o % do ${finalistas(turno)[0]}`);
  const lista = listaDasPesquisas({
    pesquisas: ler("dados/pesquisas.csv"),
    institutos: ler("dados/pesquisas-institutos.csv"),
    extrato: JSON.parse(ler("dados/pesquisas-tse.json")) as ExtratoDoTse,
    verificacoes: ler("dados/pesquisas-verificacoes.csv"),
    turno,
  });
  const agregado = agregadoDePesquisas(pesquisasDoAgregado(lista, turno), DIA_DA_ELEICAO);
  if (!agregado) throw new Error(`nenhuma pesquisa na janela do agregado de ${DIA_DA_ELEICAO}`);
  return { base, constantes, agregado };
}
