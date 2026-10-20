import { readFileSync } from "node:fs";
import { agregadoDePesquisas, diaDoAgregado } from "@apurador/modelo";
import { listaDasPesquisas, pesquisasDoAgregado, type ExtratoDoTse, type Turno } from "@apurador/pipeline";
import { AGORA } from "./html";

// Os dados do repositório lidos por fora do site, para os testes do build calcularem o que a página deve mostrar com
// o `modelo` e o `pipeline`, no mesmo relógio fixo dos builds (AGORA). As referências externas dos números ficam nos
// testes do modelo e do pipeline (o agregado de 18/10, a projeção antes da primeira seção).

export const DADOS = new URL("../../../dados/", import.meta.url);
export const ler = (arquivo: string) => readFileSync(new URL(arquivo, DADOS), "utf8");

export const TURNO = JSON.parse(ler("turnos/2026-1.json")) as Turno;
export const LISTA = listaDasPesquisas({
  pesquisas: ler("pesquisas.csv"),
  institutos: ler("pesquisas-institutos.csv"),
  extrato: JSON.parse(ler("pesquisas-tse.json")) as ExtratoDoTse,
  verificacoes: ler("pesquisas-verificacoes.csv"),
  turno: TURNO,
});
/** O dia do agregado no relógio dos builds. */
export const DIA = diaDoAgregado(new Date(AGORA));
export const PESQUISAS_DO_AGREGADO = pesquisasDoAgregado(LISTA, TURNO);
/** O agregado que a página do Brasil mostra: o do dia de AGORA, sobre o mesmo pesquisas.csv. */
export const AGREGADO = agregadoDePesquisas(PESQUISAS_DO_AGREGADO, DIA)!;
