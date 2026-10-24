import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aplicarComando, lerComando } from "../src/comandos.ts";
import { NOMES_DAS_CHAVES, type Controle } from "../src/chaves.ts";

// O roteiro da noite (`docs/roteiro-da-noite.md`) escreve cada comando exatamente como o dono o digita com o computador
// em apuros: um script que não existe, uma chave com outro nome ou uma palavra de confirmação errada só apareceriam na
// hora. Aqui cada um é conferido contra o código que o executa.
const RAIZ = new URL("../../../", import.meta.url);
const roteiro = readFileSync(new URL("docs/roteiro-da-noite.md", RAIZ), "utf8");
const { scripts } = JSON.parse(readFileSync(new URL("package.json", RAIZ), "utf8")) as { scripts: Record<string, string> };

// Os comandos da noite com argumentos de verdade, sem os `<chave>` da tabela.
const comandosDaNoite = [...roteiro.matchAll(/npm run noite -- ([a-z0-9 -]+?)(?=`|\n|$)/gm)].map(([, argumentos]) => argumentos!.trim());

// Um controle em que o comando muda alguma coisa: as chaves no estado contrário (com a projeção ligada para o simulador
// poder ligar) e um aviso no ar só para retirá-lo.
function confirmacaoDe(argumentos: string): string {
  const comando = lerComando(argumentos.split(" "));
  const chaves = Object.fromEntries(NOMES_DAS_CHAVES.map((nome) => [nome, comando.tipo !== "ligar"])) as Controle["chaves"];
  if (comando.tipo === "ligar" && comando.chave === "simulador") chaves.projecao = true;
  const controle: Controle = { chaves, aviso: comando.tipo === "retirar-aviso" ? 1 : null, planoB: false };
  return aplicarComando(controle, comando).confirmacao;
}

describe("o roteiro da noite", () => {
  it("só usa scripts que existem na raiz", () => {
    const usados = new Set([...roteiro.matchAll(/npm run ([a-z0-9-]+)/g)].map(([, nome]) => nome!));

    expect(usados.size).toBeGreaterThan(8);
    expect([...usados].filter((nome) => !(nome in scripts))).toEqual([]);
  });

  it("escreve cada comando da noite como o comando o lê", () => {
    expect(comandosDaNoite.length).toBeGreaterThan(10);
    for (const argumentos of comandosDaNoite) expect(() => lerComando(argumentos.split(" ")), argumentos).not.toThrow();
  });

  it("dá na tabela a palavra que cada comando pede", () => {
    const linhas = [...roteiro.matchAll(/^\| [^|]+ \| `npm run noite -- ([a-z0-9 -]+)` \| `([a-z0-9-]+)` \|$/gm)];

    expect(linhas.length).toBeGreaterThan(4);
    for (const [, argumentos, palavra] of linhas) expect(palavra, argumentos).toBe(confirmacaoDe(argumentos!));
  });

  it("só manda confirmar com uma palavra que algum comando do roteiro pede", () => {
    const pedidas = new Set(comandosDaNoite.map(confirmacaoDe));
    const mandadas = [...roteiro.matchAll(/confirm(?:ando|e) com `([^`]+)`/g)].map(([, palavra]) => palavra!);

    expect(mandadas.length).toBeGreaterThan(5);
    expect(mandadas.filter((palavra) => !pedidas.has(palavra))).toEqual([]);
  });

  it("só roda testes de projetos que existem", () => {
    const projetos = [...roteiro.matchAll(/--project (\S+)/g)].map(([, nome]) => nome!);

    expect(projetos.length).toBeGreaterThan(1);
    for (const projeto of projetos) expect(existsSync(new URL(`packages/${projeto.replace("@apurador/", "")}/package.json`, RAIZ)), projeto).toBe(true);
  });

  it("aponta só arquivos do repositório que existem", () => {
    // Os registros que o próprio roteiro manda criar, no ensaio 2 e no dia seguinte, e o `.env` do coletor, fora do Git.
    const aCriar = ["docs/ensaios/2026-10-24.md", "docs/noite/2026-10-25.md", "packages/coletor/.env"];
    const caminhos = [...roteiro.matchAll(/`((?:packages|dados|docs|\.github)[\\/][^`<*\s]+)`/g)].map(([, caminho]) => caminho!.replaceAll("\\", "/"));

    expect(caminhos.length).toBeGreaterThan(10);
    expect(caminhos.filter((caminho) => !aCriar.includes(caminho) && !existsSync(new URL(caminho, RAIZ)))).toEqual([]);
  });
});
