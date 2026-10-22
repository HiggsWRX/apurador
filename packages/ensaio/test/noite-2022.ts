import { readFileSync } from "node:fs";
import { lerEntradaDaProjecao } from "@apurador/coletor";
import { instanteDaNoite, lerCadastro, lerNoite, type Lugar } from "@apurador/pipeline";

// A noite do 2º turno de 2022 e o cadastro dela, como estão no repositório: é o que o TSE falso serve.
const ler = (caminho: string) => readFileSync(new URL(`../../../${caminho}`, import.meta.url));
export const noite = lerNoite(new Uint8Array(ler("dados/noites/2022-2.json.gz")));
export const cadastro = lerCadastro(ler("dados/cadastros/2022-2.json").toString("utf8"));
/** Os lugares do site, com os nomes que a narração usa. */
export const lugaresDoSite = JSON.parse(ler("dados/lugares.json").toString("utf8")) as Lugar[];

/**
 * O que o coletor projeta na noite de 2022, como no ensaio geral: a base do modelo (o 1º turno de 2022 por município),
 * as constantes congeladas pela calibração, as que rodam na noite, e o agregado da véspera, no 1º finalista da base.
 */
export const projecaoDe2022 = lerEntradaDaProjecao("2022-2");

/** O instante da noite de uma data e hora de Brasília, `AAAA-MM-DD HH:MM:SS`. */
export const instante = (dataHora: string) => instanteDaNoite(noite, dataHora);
