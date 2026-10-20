import { idDoTurno, type CurvasDoTurno } from "@apurador/pipeline";
import type { CurvasDoLugar, TurnoPassado } from "./curva-de-comparacao";

// As curvas de comparação dos turnos passados (`dados/curvas/`, do `npm run noites`), lidas só no build: cada lugar
// ganha o seu arquivo em `/curvas/<id>.json` e, na página, só a lista dos turnos que tem. Nenhuma ilha importa este
// módulo, ou os 3,5 MB das curvas iriam para o navegador.

const TURNOS = Object.values(import.meta.glob<CurvasDoTurno>("../../../../dados/curvas/*.json", { eager: true, import: "default" })).sort(
  (a, b) => a.ano - b.ano || a.turno - b.turno,
);

/** Os turnos passados, do mais antigo ao mais recente: 2018 1T, 2018 2T, 2022 1T, 2022 2T e 2026 1T. */
export const TURNOS_PASSADOS: TurnoPassado[] = TURNOS.map((t) => ({ id: idDoTurno(t), nome: `${t.ano} ${t.turno}T`, partidos: t.partidos }));

/** As curvas de um lugar, nos turnos passados em que ele teve voto no PT ou no partido de Bolsonaro. */
export const curvasDoLugar = (id: string): CurvasDoLugar => Object.fromEntries(TURNOS.flatMap((t) => (t.lugares[id] ? [[idDoTurno(t), t.lugares[id]]] : [])));

/** Os turnos passados que o lugar tem: os botões da curva de comparação na página dele. */
export const turnosDoLugar = (id: string): TurnoPassado[] => TURNOS_PASSADOS.filter((_, i) => TURNOS[i]!.lugares[id]);
