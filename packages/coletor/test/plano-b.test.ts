import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { republicacaoDoWorker } from "../src/plano-b.ts";

// O destino do plano B (Operação na noite, decisão 14): os arquivos ao vivo vão para a pasta de static assets de um
// Worker, que é republicado no fim da rodada, no máximo uma vez por minuto. A republicação de verdade é um
// `wrangler deploy`; aqui ela é injetada, e os testes decidem quando ela termina e se falha. Os testes de que ela
// leva todos os arquivos e sai a cada minuto da noite estão no replay (`packages/ensaio/test/replay.test.ts`).

let pasta: string;
beforeEach(async () => {
  pasta = join(await mkdtemp(join(tmpdir(), "plano-b-")), "arquivos");
});
afterEach(() => rm(join(pasta, ".."), { recursive: true, force: true }));

const BYTES = new TextEncoder().encode('{"rodada":"2026-10-25T21:00:00.000Z"}');

/** Uma republicação que só termina quando o teste manda, com o que havia na pasta quando começou. */
function republicacoes() {
  const feitas: { arquivos: string[]; terminar: (erro?: Error) => void }[] = [];
  const publicar = async () => {
    const arquivos = (await readdir(pasta, { recursive: true, withFileTypes: true })).filter((a) => a.isFile()).map((a) => join(a.parentPath, a.name).slice(pasta.length + 1).replaceAll("\\", "/"));
    return new Promise<void>((pronto, falhou) => feitas.push({ arquivos: arquivos.sort(), terminar: (erro) => (erro ? falhou(erro) : pronto()) }));
  };
  return { feitas, publicar };
}

function montar() {
  let agora = Date.parse("2026-10-25T21:00:00-03:00");
  const r = republicacoes();
  const destino = republicacaoDoWorker({ pasta, publicar: r.publicar, agora: () => agora });
  /** Espera as gravações e a leitura da pasta da republicação que começou. */
  const assentar = () => new Promise((pronto) => setTimeout(pronto, 50));
  return { ...r, destino, passar: (s: number) => (agora += s * 1000), assentar };
}

describe("a republicação do Worker do plano B", () => {
  it("na primeira gravação, a pasta fica só com os arquivos ao vivo e o `_headers` do CORS, sem os de uma noite anterior", async () => {
    await mkdir(join(pasta, "lugares"), { recursive: true });
    await writeFile(join(pasta, "lugares", "35157.json"), "do ensaio de 22/10");
    const { destino, feitas, assentar } = montar();

    await destino.gravar("rodada.json", BYTES);
    await destino.gravar("lugares/BR.json", BYTES);
    expect(await destino.fimDaRodada!()).toEqual([]);
    await assentar();

    expect(feitas).toHaveLength(1);
    expect(feitas[0]!.arquivos).toEqual(["_headers", "lugares/BR.json", "rodada.json"]);
    // Os static assets respondem 405 a todo OPTIONS (medido em 20/10/2026): a página lê o plano B sem preflight, e o
    // `_headers` só precisa liberar a origem e expor o `Date` e a ETag.
    expect(await readFile(join(pasta, "_headers"), "utf8")).toBe("/*\n  Access-Control-Allow-Origin: *\n  Access-Control-Expose-Headers: Date, ETag\n  X-Robots-Tag: noindex\n");
  });

  it("republica no fim da rodada, uma vez por minuto e só com algo novo na pasta", async () => {
    const { destino, feitas, passar, assentar } = montar();
    const rodada = async (gravar: boolean) => {
      if (gravar) await destino.gravar("rodada.json", BYTES);
      await destino.fimDaRodada!();
      await assentar();
      feitas.at(-1)?.terminar();
      await assentar();
    };

    await rodada(true); // 21:00:00, a primeira
    passar(20);
    await rodada(true); // 21:00:20, menos de 1 min depois
    passar(20);
    await rodada(false); // 21:00:40
    expect(feitas).toHaveLength(1);
    passar(20);
    await rodada(false); // 21:01:00: o que mudou às 21:00:20 sai agora
    expect(feitas).toHaveLength(2);
    passar(60);
    await rodada(false); // 21:02:00, sem nada novo
    expect(feitas).toHaveLength(2);
  });

  it("uma republicação demorada não segura a rodada nem corre junto com outra", async () => {
    const { destino, feitas, passar, assentar } = montar();
    await destino.gravar("rodada.json", BYTES);
    await destino.fimDaRodada!();
    await assentar();

    for (let i = 0; i < 4; i++) {
      passar(20);
      await destino.gravar("rodada.json", BYTES);
      await destino.fimDaRodada!();
      await assentar();
    }
    expect(feitas).toHaveLength(1);

    feitas[0]!.terminar();
    await assentar();
    passar(20);
    await destino.fimDaRodada!();
    await assentar();
    expect(feitas).toHaveLength(2);
  });

  it("uma republicação que falhou vira falha da rodada seguinte e é tentada de novo nela", async () => {
    const { destino, feitas, passar, assentar } = montar();
    await destino.gravar("rodada.json", BYTES);
    await destino.fimDaRodada!();
    await assentar();
    feitas[0]!.terminar(new Error("wrangler saiu com 1: Authentication error [code: 10000]"));
    await assentar();

    passar(20);
    expect(await destino.fimDaRodada!()).toEqual(["republicar o plano B: wrangler saiu com 1: Authentication error [code: 10000]"]);
    await assentar();
    expect(feitas).toHaveLength(2);
  });

  it("um erro antes de a republicação começar (o wrangler que não se acha) também vira falha, e não trava as seguintes", async () => {
    let tentativas = 0;
    let agora = Date.parse("2026-10-25T21:00:00-03:00");
    const destino = republicacaoDoWorker({
      pasta,
      agora: () => agora,
      publicar: () => {
        tentativas++;
        throw new Error("Cannot find module 'wrangler/package.json'");
      },
    });
    await destino.gravar("rodada.json", BYTES);
    expect(await destino.fimDaRodada!()).toEqual([]);
    await new Promise((pronto) => setTimeout(pronto, 10));

    agora += 20_000;
    expect(await destino.fimDaRodada!()).toEqual(["republicar o plano B: Cannot find module 'wrangler/package.json'"]);
    expect(tentativas).toBe(2);
  });
});
