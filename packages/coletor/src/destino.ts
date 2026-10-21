import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// Para onde o coletor publica os arquivos ao vivo, pela mesma interface nos quatro destinos (Arquitetura e tecnologia,
// decisão 15): a pasta local, que os testes da construção usam, o R2 de produção e o do ensaio (`r2.ts`) e a
// republicação do Worker do plano B (`plano-b.ts`). Qual deles vale numa execução é configuração (`ambientes.ts`).

/** Para onde o coletor publica os arquivos ao vivo. */
export interface Destino {
  /** Grava o arquivo no caminho (`rodada.json`, `lugares/BR.json`), trocando o que houver. */
  gravar(caminho: string, bytes: Uint8Array): Promise<void>;
  /**
   * Chamado no fim de cada rodada, depois das gravações, no destino que publica em lote (o Worker do plano B): não
   * espera a publicação terminar e devolve as falhas das que terminaram desde a rodada anterior.
   */
  fimDaRodada?(): Promise<string[]>;
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
