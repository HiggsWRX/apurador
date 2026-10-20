import arquivo from "../../../../dados/chaves.json";

// As chaves de publicação: cada bloco sensível liga e desliga sem código novo. Antes de o coletor existir, elas vêm do
// arquivo de chaves (`dados/chaves.json`), publicado com o site: mudar uma chave é um deploy só desse arquivo. Com o
// coletor no ar, elas vêm do arquivo de rodada.

/** As chaves de publicação que o site conhece, cada uma `true` (ligada) ou `false`. */
export interface Chaves {
  antesDas17h: {
    /** O agregado de pesquisas e a tendência, e com eles a indicação das pesquisas nos outros lugares, que deriva do agregado. */
    agregado: boolean;
    /** A projeção, a chance de vitória e a curva projetada antes das 17h, na página do Brasil. */
    projecao: boolean;
  };
}

const ESPERADAS: Chaves = { antesDas17h: { agregado: false, projecao: false } };

/**
 * Confere o arquivo de chaves contra as chaves que o site conhece: uma chave faltando, desconhecida ou que não seja
 * `true` ou `false` quebra o build. Um erro de digitação nunca deixa um bloco ligado sem querer.
 */
function conferir(valor: unknown, esperado: object, caminho: string): void {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new Error(`dados/chaves.json: ${caminho} deveria ser um objeto`);
  const faltando = Object.keys(esperado).filter((k) => !(k in valor));
  const desconhecidas = Object.keys(valor).filter((k) => !(k in esperado));
  if (faltando.length > 0 || desconhecidas.length > 0) {
    throw new Error(`dados/chaves.json: em ${caminho}, chaves faltando (${faltando.join(", ")}) ou desconhecidas (${desconhecidas.join(", ")})`);
  }
  for (const [k, e] of Object.entries(esperado)) {
    const v = (valor as Record<string, unknown>)[k];
    if (typeof e === "boolean") {
      if (typeof v !== "boolean") throw new Error(`dados/chaves.json: ${caminho}.${k} deveria ser true ou false, não ${JSON.stringify(v)}`);
    } else conferir(v, e as object, `${caminho}.${k}`);
  }
}

conferir(arquivo, ESPERADAS, "chaves");
export const CHAVES = arquivo as Chaves;
