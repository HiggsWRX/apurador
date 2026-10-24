import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NOMES_DAS_CHAVES, type ChavesDaNoite, type Controle } from "../src/chaves.ts";
import { aplicarComando, lerComando } from "../src/comandos.ts";

// O roteiro da noite (`docs/roteiro-da-noite.md`) escreve cada comando da noite e a palavra que ele pede exatamente como
// o dono os digita com o computador em apuros: uma chave com outro nome ou uma confirmação errada só apareceriam na
// hora. Aqui cada um é conferido contra o código que o lê. Os scripts e os caminhos do roteiro ficam com as conferências
// do repositório (`test/roteiro-da-noite.test.ts`).
const roteiro = readFileSync(new URL("../../../docs/roteiro-da-noite.md", import.meta.url), "utf8");

// Os comandos da noite com argumentos de verdade, sem os `<chave>` da tabela, com a posição de cada um no roteiro.
const comandosDaNoite = [...roteiro.matchAll(/npm run noite -- ([a-z0-9 -]+?)(?=`|\n|$)/gm)].map((achado) => ({
  argumentos: achado[1]!.trim(),
  posicao: achado.index,
}));

// Um controle em que o comando muda alguma coisa: as chaves no estado contrário (com a projeção ligada para o simulador
// poder ligar) e um aviso no ar só para retirá-lo.
function confirmacaoDe(argumentos: string): string {
  const comando = lerComando(argumentos.split(" "));
  const chaves = Object.fromEntries(NOMES_DAS_CHAVES.map((nome) => [nome, comando.tipo !== "ligar"])) as ChavesDaNoite;
  if (comando.tipo === "ligar" && comando.chave === "simulador") chaves.projecao = true;
  const controle: Controle = { chaves, aviso: comando.tipo === "retirar-aviso" ? 1 : null, planoB: false };
  return aplicarComando(controle, comando).confirmacao;
}

describe("o roteiro da noite", () => {
  it("escreve cada comando da noite como o comando o lê", () => {
    expect(comandosDaNoite.length).toBeGreaterThan(10);
    for (const { argumentos } of comandosDaNoite) expect(() => lerComando(argumentos.split(" ")), argumentos).not.toThrow();
  });

  it("dá na tabela a palavra que cada comando pede", () => {
    const linhas = [...roteiro.matchAll(/^\| [^|]+ \| `npm run noite -- ([a-z0-9 -]+)` \| `([a-z0-9-]+)` \|$/gm)];

    expect(linhas.length).toBeGreaterThan(4);
    for (const [, argumentos, palavra] of linhas) expect(palavra, argumentos).toBe(confirmacaoDe(argumentos!));
  });

  it("manda confirmar cada comando nos cartões com a palavra que ele pede", () => {
    // Nos cartões, o "confirmando com" vem antes do bloco do comando a que se refere.
    const mandadas = [...roteiro.matchAll(/confirm(?:ando|e) com `([^`]+)`/g)];

    expect(mandadas.length).toBeGreaterThan(5);
    for (const { 1: palavra, index } of mandadas) {
      const seguinte = comandosDaNoite.find(({ posicao }) => posicao > index);
      expect(seguinte && confirmacaoDe(seguinte.argumentos), `confirmar com ${palavra}`).toBe(palavra);
    }
  });
});
