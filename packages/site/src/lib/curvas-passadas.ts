import { idDoTurno, type CurvasDoTurno } from "@apurador/pipeline";
import type { CurvasDoLugar, TurnoPassado } from "./curva-de-comparacao";

// As curvas de comparação dos turnos passados (`dados/curvas/`, do `npm run noites`), lidas só no build: cada lugar
// ganha o seu arquivo em `/curvas/<id>.json` e, na página, só a lista dos turnos que tem. Nenhuma ilha importa este
// módulo, ou os 3,6 MB das curvas iriam para o navegador.

/** As curvas de cada turno passado, do mais antigo ao mais recente. */
const CURVAS = Object.values(import.meta.glob<CurvasDoTurno>("../../../../dados/curvas/*.json", { eager: true, import: "default" })).sort(
  (a, b) => a.ano - b.ano || a.turno - b.turno,
);

const turnoPassado = (c: CurvasDoTurno): TurnoPassado => ({ id: idDoTurno(c), nome: `${c.ano} ${c.turno}T`, turno: c.turno, partidoDeBolsonaro: c.partidoDeBolsonaro });

/** As curvas de um lugar, nos turnos passados em que ele teve voto no PT ou no partido de Bolsonaro. */
export const curvasDoLugar = (id: string): CurvasDoLugar => Object.fromEntries(CURVAS.flatMap((c) => (c.lugares[id] ? [[idDoTurno(c), c.lugares[id]]] : [])));

/** Os turnos passados que o lugar tem, do mais antigo ao mais recente: os botões da curva de comparação na página dele. */
export const turnosDoLugar = (id: string): TurnoPassado[] => CURVAS.filter((c) => c.lugares[id]).map(turnoPassado);
