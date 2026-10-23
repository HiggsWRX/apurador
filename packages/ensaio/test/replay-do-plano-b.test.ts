import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CONTROLE_INICIAL, criarContadorDeGravacoes, destinoR2, republicacaoDoWorker, type Buscar, type ContadorDeGravacoes } from "@apurador/coletor";
import { ms, replay, lugares, TABELAS, MUNICIPIOS_DAS_TABELAS } from "./replay.ts";

// O replay automático (`replay.ts`): o plano B, com os destinos de verdade.

describe("plano B", () => {
  // O R2 falha às 17:00 e o dono passa ao plano B (Operação na noite, decisão 14). Às 17:05 o arquivo de controle volta
  // a dizer "principal" (apagado, ou de um ensaio): o coletor não volta, porque o plano B fica até o fim da noite.
  const COMANDO = ms("2022-10-30 17:00:00");
  const noR2: { caminho: string; quando: number }[] = [];
  /** Quantos PUT o R2 tinha em andamento, no máximo: cada um leva 1 ms de verdade, como a ida e volta do R2 leva ~0,1 s. */
  let emVoo = 0;
  let maximoEmVoo = 0;
  const republicacoes: { quando: number; arquivos: string[] }[] = [];
  let pasta: string;
  let contador: ContadorDeGravacoes;
  let r: Awaited<ReturnType<typeof replay>>;
  const arquivosNaPasta = async () =>
    (await readdir(pasta, { recursive: true, withFileTypes: true }))
      .filter((a) => a.isFile())
      .map((a) =>
        join(a.parentPath, a.name)
          .slice(pasta.length + 1)
          .replaceAll("\\", "/"),
      )
      .sort();
  beforeAll(async () => {
    pasta = join(await mkdtemp(join(tmpdir(), "replay-plano-b-")), "arquivos");
    r = await replay("2022-10-30 16:50:00", "2022-10-30 17:08:00", {
      controle: (quando) => ({ ...CONTROLE_INICIAL, planoB: quando >= COMANDO && quando < ms("2022-10-30 17:05:00") }),
      destinos: (agora) => {
        contador = criarContadorDeGravacoes(null, agora);
        const r2: Buscar = async (url) => {
          noR2.push({ caminho: url.split("/apurador-ao-vivo/")[1]!, quando: agora() });
          maximoEmVoo = Math.max(maximoEmVoo, ++emVoo);
          await new Promise((pronto) => setTimeout(pronto, 1));
          emVoo--;
          return new Response(null, { status: 200 });
        };
        const publicar = async () => {
          const quando = agora();
          republicacoes.push({ quando, arquivos: await arquivosNaPasta() });
        };
        return {
          destino: destinoR2({
            conta: "conta",
            bucket: "apurador-ao-vivo",
            credenciais: { chave: "c", segredo: "s" },
            buscar: r2,
            contador,
            comprimir: true,
            agora: () => new Date(agora()),
          }),
          planoB: republicacaoDoWorker({ pasta, publicar, agora }),
          contador,
        };
      },
    });
  }, 120_000);
  afterAll(() => rm(join(pasta, ".."), { recursive: true, force: true }));
  const troca = () => r.rodadas.find((x) => x.destinoAtivo === "plano B")!;

  it("até o comando, publica no R2 e conta cada gravação dele; da rodada do comando em diante, nada vai ao R2", () => {
    expect(Date.parse(troca().inicio)).toBeGreaterThanOrEqual(COMANDO);
    expect(Date.parse(troca().inicio)).toBeLessThan(COMANDO + 20_000);
    expect(noR2.length).toBeGreaterThan(lugares.length);
    expect(noR2.every((g) => g.quando < Date.parse(troca().inicio))).toBe(true);
    // O contador bate com o que o R2 recebeu, e o registro de cada rodada o leva, para o painel e a trava de 90%.
    expect(r.rodadas.at(-1)!.gravacoesDoMes).toEqual({ mes: "2022-10", buckets: { "apurador-ao-vivo": noR2.length } });
  });

  it("grava os lugares no R2 várias ao mesmo tempo, até 32: uma por vez, as ~5.900 da partida a frio levariam 10 min", () => {
    expect(maximoEmVoo).toBe(32);
  });

  it("na rodada do comando, regrava todos os lugares no plano B, e cada republicação leva todos os arquivos ao vivo, dentro dos 20.000 por versão", () => {
    const todos = ["_headers", "rodada.json", "mapa.json", ...TABELAS, ...MUNICIPIOS_DAS_TABELAS, ...lugares.map((l) => l.caminho)].sort();
    expect(republicacoes[0]!.quando).toBeGreaterThanOrEqual(Date.parse(troca().inicio));
    expect(republicacoes[0]!.quando).toBeLessThan(Date.parse(troca().inicio) + 20_000);
    expect(troca().gravacoes).toBe(todos.length - 1);
    for (const p of republicacoes) expect(p.arquivos).toEqual(todos);
    expect(todos.length).toBeLessThan(20_000);
  });

  it("republica uma vez por minuto, e fica no plano B até o fim, mesmo com o arquivo de controle de volta ao principal", () => {
    // Do comando, às 17:00, ao fim do replay, às 17:08: uma republicação por minuto, a primeira na rodada do comando.
    const horas = republicacoes.map((p) =>
      new Date(p.quando).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
    );
    expect(horas).toEqual(["17:00", "17:01", "17:02", "17:03", "17:04", "17:05", "17:06", "17:07"]);
    const depois = r.rodadas.filter((x) => Date.parse(x.inicio) >= Date.parse(troca().inicio));
    expect(depois.every((x) => x.destinoAtivo === "plano B")).toBe(true);
    expect(depois.some((x) => !x.controle.planoB)).toBe(true);
    expect(r.rodadas.flatMap((x) => x.falhas)).toEqual([]);
  });
});
