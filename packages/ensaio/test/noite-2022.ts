import { readFileSync } from "node:fs";
import { instanteDaNoite, lerCadastro, lerNoite, type Lugar } from "@apurador/pipeline";

// A noite do 2º turno de 2022 e o cadastro dela, como estão no repositório: é o que o TSE falso serve.
export const noite = lerNoite(new Uint8Array(readFileSync(new URL("../../../dados/noites/2022-2.json.gz", import.meta.url))));
export const cadastro = lerCadastro(readFileSync(new URL("../../../dados/cadastros/2022-2.json", import.meta.url), "utf8"));
/** Os lugares do site, com os nomes que a narração usa. */
export const lugaresDoSite = JSON.parse(readFileSync(new URL("../../../dados/lugares.json", import.meta.url), "utf8")) as Lugar[];

/** O instante da noite de uma data e hora de Brasília, `AAAA-MM-DD HH:MM:SS`. */
export const instante = (dataHora: string) => instanteDaNoite(noite, dataHora);
