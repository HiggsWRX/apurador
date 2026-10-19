import { beforeAll, describe, expect, it } from "vitest";
import { criarColetor, relogioSimulado, type ArquivoDaRodada, type ArquivoDoLugar, type RegistroDaRodada } from "@apurador/coletor";
import { reproduzir } from "@apurador/pipeline";
import { lerResultado } from "@apurador/tse";
import { criarDivulgacao } from "../src/divulgacao.ts";
import { escreverComoTse } from "../src/formato.ts";
import { buscarNoTseFalso, conferirPlacar, criarTseFalso, relogioDoReplay, type TseFalso } from "../src/index.ts";
import { cadastro, instante, noite } from "./noite-2022.ts";

// O replay automático: o coletor inteiro, rodada a rodada, sobre o TSE falso servindo o 2º turno de 2022, sem
// rede e na velocidade máxima (o relógio do coletor é simulado, e o do TSE falso anda com ele). As referências
// são o histórico oficial de totalização de 2022 e o próprio TSE falso, que o coletor tem de copiar sem alteração.

const BASE = "http://tse-falso.local/oficial";
/** Uma data e hora de Brasília, `AAAA-MM-DD HH:MM:SS`, em milissegundos. */
const ms = (dataHora: string) => Date.parse(`${dataHora.replace(" ", "T")}-03:00`);

interface Gravacao {
  caminho: string;
  conteudo: unknown;
  bytes: Uint8Array;
  /** O relógio do coletor, em ms. */
  quando: number;
}

/** `estragar`: os pedidos que recebem, no lugar do arquivo do TSE, uma página de erro com status 200. */
async function replay(de: string, ate: string | ((tse: TseFalso) => boolean), estragar: (url: string, quando: number) => boolean = () => false) {
  const relogio = relogioSimulado(ms(de));
  const tse = criarTseFalso({ noite, cadastro, relogio: relogioDoReplay(instante(de), relogio.agora) });
  const buscar = buscarNoTseFalso(tse);
  const pedidos: { url: string; quando: number }[] = [];
  const gravacoes: Gravacao[] = [];
  const arquivos = new Map<string, Gravacao>();
  const coletor = criarColetor({
    base: BASE,
    eleicao: "6258",
    relogio,
    buscar: async (url, init) => {
      pedidos.push({ url: String(url), quando: relogio.agora() });
      if (estragar(String(url), relogio.agora())) return new Response("<html>Erro</html>", { status: 200 });
      return buscar(url, init);
    },
    destino: {
      async gravar(caminho, bytes) {
        const g = { caminho, bytes, conteudo: JSON.parse(new TextDecoder().decode(bytes)), quando: relogio.agora() };
        gravacoes.push(g);
        arquivos.set(caminho, g);
      },
    },
  });
  const rodadas: RegistroDaRodada[] = [];
  const terminou = typeof ate === "string" ? () => relogio.agora() >= ms(ate) : () => ate(tse);
  await coletor.rodar({ ate: terminou, aoRodar: (r) => rodadas.push(r) });
  const publicado = <T = ArquivoDoLugar>(caminho: string) => arquivos.get(caminho)?.conteudo as T;
  const rodada = () => publicado<ArquivoDaRodada>("rodada.json");
  /** Cada gravação de um arquivo de lugar, para a conferência do placar. */
  const placares = () => {
    const candidatos = rodada().candidatos.map((c) => c.numero);
    return gravacoes.filter((g) => g.caminho.startsWith("lugares/")).map((g) => ({ candidatos, lugar: g.conteudo as ArquivoDoLugar }));
  };
  /** A fase de cada gravação do arquivo de rodada. */
  const fases = () => gravacoes.filter((g) => g.caminho === "rodada.json").map((g) => ({ fase: (g.conteudo as ArquivoDaRodada).fase, quando: g.quando }));
  return { tse, coletor, pedidos, gravacoes, rodadas, publicado, rodada, placares, fases };
}

describe("antes das 17h", () => {
  it("publica o arquivo de rodada na fase antes das 17h, com os candidatos em ordem alfabética, e o Brasil zerado", async () => {
    const { publicado, rodada } = await replay("2022-10-30 16:50:00", "2022-10-30 16:55:00");

    expect(rodada()).toMatchObject({
      fase: "antes-das-17h",
      novidade: { totalizacao: null },
      candidatos: [
        { numero: 22, nome: "JAIR BOLSONARO", partido: "PL" },
        { numero: 13, nome: "LULA", partido: "PT" },
      ],
    });
    expect(publicado("lugares/BR.json")).toEqual({
      lugar: "BR",
      tse: { totalizacao: null, secoes: { totalizadas: 0, total: 472_075, percentual: 0 }, votos: [0, 0], percentuais: [0, 0], final: false },
      curva: [],
    });
  }, 60_000);

  it("na partida, publica uma vez cada lugar: o Brasil, as 27 UFs, o Exterior e os municípios da configuração", async () => {
    const { gravacoes, tse } = await replay("2022-10-30 16:50:00", "2022-10-30 16:55:00");
    const municipios = cadastro.ufs.reduce((n, uf) => n + uf.municipios.length, 0);

    const lugares = gravacoes.filter((g) => g.caminho.startsWith("lugares/"));
    expect(new Set(lugares.map((g) => g.caminho)).size).toBe(1 + 28 + municipios);
    expect(lugares).toHaveLength(1 + 28 + municipios);
    expect(tse.registro().naoEncontrados).toEqual([]);
  }, 60_000);
});

describe("às 17h", () => {
  it("passa sozinho a ao vivo na primeira rodada depois das 17h do relógio do TSE", async () => {
    const fases = (await replay("2022-10-30 16:50:00", "2022-10-30 17:02:00")).fases();

    const primeira = fases.findIndex((f) => f.fase === "ao-vivo");
    expect(fases.slice(0, primeira).every((f) => f.fase === "antes-das-17h")).toBe(true);
    expect(fases.slice(primeira).every((f) => f.fase === "ao-vivo")).toBe(true);
    expect(fases[primeira]!.quando).toBeGreaterThanOrEqual(ms("2022-10-30 17:00:00"));
    expect(fases[primeira]!.quando).toBeLessThan(ms("2022-10-30 17:00:21"));
  }, 60_000);
});

describe("a primeira meia hora da apuração", () => {
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    r = await replay("2022-10-30 16:50:00", "2022-10-30 17:30:00");
  }, 120_000);

  it("publica em toda gravação o placar, o % de seções, o x de y e a hora do arquivo do TSE falso, sem divergência", () => {
    expect(r.placares().length).toBeGreaterThan(10_000);
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
  });

  it("não pede nenhuma URL inexistente nem passa do limite do TSE", () => {
    expect(r.tse.registro().naoEncontrados).toEqual([]);
    expect(r.tse.registro().violacoes).toEqual([]);
  });

  it("pede cada arquivo de resultado no máximo uma vez por minuto, e os 29 índices a cada rodada", () => {
    const ultimo = new Map<string, number>();
    const cedo: string[] = [];
    for (const p of r.pedidos.filter((p) => p.url.endsWith("-u.json"))) {
      const antes = ultimo.get(p.url);
      if (antes !== undefined && p.quando - antes < 60_000) cedo.push(p.url);
      ultimo.set(p.url, p.quando);
    }
    expect(cedo).toEqual([]);
    const indices = r.pedidos.filter((p) => p.url.endsWith("-ab.json")).length;
    expect(indices).toBe(29 * r.rodadas.length);
  });

  it("grava cada arquivo só quando os bytes mudam", () => {
    const anterior = new Map<string, string>();
    const repetidas: string[] = [];
    for (const g of r.gravacoes) {
      const texto = new TextDecoder().decode(g.bytes);
      if (anterior.get(g.caminho) === texto) repetidas.push(g.caminho);
      anterior.set(g.caminho, texto);
    }
    expect(repetidas).toEqual([]);
  });

  it("a curva real do Brasil é a sequência dos placares publicados, sem repetir um ponto, e a novidade é a hora do Brasil", () => {
    const brasil = r.gravacoes.filter((g) => g.caminho === "lugares/BR.json").map((g) => g.conteudo as ArquivoDoLugar);
    const ultimo = brasil.at(-1)!;
    // Uma totalização nova que não muda nenhum percentual de duas casas não é um ponto novo.
    const publicados = brasil
      .filter((b) => b.tse.secoes.totalizadas > 0)
      .map((b) => [b.tse.secoes.percentual, ...b.tse.percentuais])
      .filter((p, i, todos) => i === 0 || p.join() !== todos[i - 1]!.join());

    expect(ultimo.curva.length).toBeGreaterThan(20);
    expect(ultimo.curva).toEqual(publicados);
    expect(r.rodada().novidade.totalizacao).toBe(ultimo.tse.totalizacao);
  });
});

describe("um arquivo que o leitor não entende", () => {
  it("fica de fora: o Brasil mantém o último placar bom, a rodada registra a falha, e o coletor pede de novo", async () => {
    const BRASIL = "/dados/br/br-c0001-e006258-u.json";
    // Três minutos: com um pedido por minuto ao arquivo do Brasil, ele vem estragado pelo menos duas vezes.
    const [de, ate] = [ms("2022-10-30 17:03:00"), ms("2022-10-30 17:06:00")];
    const r = await replay("2022-10-30 16:50:00", "2022-10-30 17:09:00", (url, quando) => url.endsWith(BRASIL) && quando >= de && quando < ate);

    const falhas = r.rodadas.flatMap((x) => x.falhas).filter((f) => f.includes(BRASIL));
    expect(falhas.length).toBeGreaterThanOrEqual(2);
    expect(falhas[0]).toMatch(/não é JSON/);
    // Nada errado foi publicado, e o Brasil não muda enquanto o arquivo vem estragado.
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
    const brasil = r.gravacoes.filter((g) => g.caminho === "lugares/BR.json");
    expect(brasil.filter((g) => g.quando >= de + 1_000 && g.quando < ate)).toEqual([]);
    // Depois, o coletor volta a pedir e publica o Brasil de novo.
    expect(brasil.at(-1)!.quando).toBeGreaterThanOrEqual(ate);
  }, 60_000);
});

describe("a noite inteira", () => {
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    // Das 16:50 até 30 min depois da totalização final, quando o coletor para (ticket 23).
    r = await replay("2022-10-30 16:50:00", (tse) => tse.estado().momento.instante >= instante(tse.estado().dataHoraDaTotalizacaoFinal!) + 30 * 60);
  }, 600_000);

  it("publica em toda gravação de toda rodada o placar do TSE falso, sem divergência", () => {
    expect(r.placares().length).toBeGreaterThan(90_000);
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
  }, 120_000);

  it("termina com o resultado oficial em todos os lugares, e a fase encerrada", () => {
    const final = r.tse.estado().dataHoraDaTotalizacaoFinal!;
    const caminhos = new Set(r.gravacoes.filter((g) => g.caminho.startsWith("lugares/")).map((g) => g.caminho));
    const ultimos = [...caminhos].map((c) => r.publicado(c));

    expect(ultimos.filter((l) => !l.tse.final || l.tse.totalizacao !== final || l.tse.secoes.totalizadas !== l.tse.secoes.total)).toEqual([]);
    // O resultado oficial do 2º turno de 2022: Bolsonaro 58.206.354 e Lula 60.345.999.
    expect(r.publicado("lugares/BR.json").tse).toMatchObject({ secoes: { totalizadas: 472_075, total: 472_075, percentual: 100 }, votos: [58_206_354, 60_345_999] });
    expect(r.rodada().fase).toBe("encerrada");
  });

  it("passa a encerrada na primeira rodada depois da totalização final, e não sai mais dela", () => {
    const fases = r.fases();
    const primeira = fases.findIndex((f) => f.fase === "encerrada");

    expect(fases[primeira]!.quando - ms(r.tse.estado().dataHoraDaTotalizacaoFinal!)).toBeLessThan(80_000);
    expect(fases.slice(primeira).every((f) => f.fase === "encerrada")).toBe(true);
  });

  it("guarda as zonas dos municípios com mais de uma, iguais às do TSE falso no fim", () => {
    const zonasDoMunicipio = new Map<string, number[]>();
    for (const z of noite.zonas) zonasDoMunicipio.set(`${z.uf}/${z.municipio}`, [...(zonasDoMunicipio.get(`${z.uf}/${z.municipio}`) ?? []), z.zona]);
    const zonas = [...zonasDoMunicipio]
      .filter(([, zs]) => zs.length > 1)
      .flatMap(([k, zs]) => zs.map((zona) => ({ uf: k.split("/")[0]!, municipio: Number(k.split("/")[1]), zona })));
    // O arquivo de cada zona na totalização final, escrito direto pela divulgação do TSE falso, sem pedir a ele.
    const divulgacao = criarDivulgacao(noite, cadastro);
    const fim = reproduzir(noite);
    fim.avancarAte(Infinity);
    const noTseFalso = ({ uf, municipio, zona }: (typeof zonas)[number]) => {
      const u = uf.toLowerCase();
      const documento = divulgacao.documento(`/oficial/ele2026/6258/dados/${u}/${u}${String(municipio).padStart(5, "0")}-z${String(zona).padStart(4, "0")}-c0001-e006258-u.json`)!;
      return lerResultado(new TextEncoder().encode(escreverComoTse(divulgacao.escrever(documento, fim))));
    };

    expect(zonas.length).toBeGreaterThan(500);
    expect(zonas.filter((z) => JSON.stringify(r.coletor.resultado(z)) !== JSON.stringify(noTseFalso(z)))).toEqual([]);
  });

  it("registra o tempo de cada rodada, e nenhuma passa dos 20 s: nem a partida a frio, nem o pico de ~600 municípios, nem a varredura do fim", () => {
    const aoVivo = r.rodadas.filter((x) => x.fase === "ao-vivo");
    const pico = aoVivo.reduce((a, b) => (b.baixados.municipios > a.baixados.municipios ? b : a));

    expect(r.rodadas.every((x) => x.duracao > 0 && x.duracao <= 20_500)).toBe(true);
    expect(pico.baixados.municipios).toBeGreaterThan(400);
    // A partida a frio, com os ~6.500 arquivos, cabe em poucas rodadas antes das 17h.
    expect(r.rodadas.findIndex((x) => x.baixados.municipios === 0)).toBeLessThan(10);
  });

  it("não pede nenhuma URL inexistente nem passa do limite do TSE na noite toda", () => {
    expect(r.tse.registro().naoEncontrados).toEqual([]);
    expect(r.tse.registro().violacoes).toEqual([]);
  });
});
