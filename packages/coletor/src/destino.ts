import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// Para onde o coletor publica os arquivos ao vivo. Os testes da construção publicam na pasta local; o R2 de
// produção, o do ensaio e a republicação do plano B entram pela mesma interface (ticket 20).

/** Para onde o coletor publica os arquivos ao vivo. */
export interface Destino {
  /** Grava o arquivo no caminho (`rodada.json`, `lugares/BR.json`), trocando o que houver. */
  gravar(caminho: string, bytes: Uint8Array): Promise<void>;
}

/** Uma pasta do computador, com os caminhos como subpastas. */
export function pastaLocal(pasta: string): Destino {
  return {
    async gravar(caminho, bytes) {
      const arquivo = join(pasta, caminho);
      await mkdir(dirname(arquivo), { recursive: true });
      await writeFile(arquivo, bytes);
    },
  };
}
