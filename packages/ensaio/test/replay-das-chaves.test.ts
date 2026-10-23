import { beforeAll, describe, expect, it } from "vitest";
import {
  CONTROLE_INICIAL,
  type ArquivoDeRodada,
  type ArquivoDoLugar,
  type ArquivoDoMapa,
  type ArquivoDoSimuladorAoVivo,
  type Controle,
  type TabelaDeProjecoes,
} from "@apurador/coletor";
import { conferirPlacar, conferirPreditivos } from "../src/index.ts";
import { cadastro, noite } from "./noite-2022.ts";
import { ms, replay, lugares, TABELAS, BASES } from "./replay.ts";

// O replay automático (`replay.ts`): as chaves, os avisos prontos e os textos preditivos, pelo arquivo de controle.

describe("as chaves de publicação e os avisos prontos, pelo arquivo de controle", () => {
  // O dono age em rodadas escolhidas: desliga a base com pesquisas às 17:02 e a religa às 17:05, quando desliga a
  // projeção; publica o aviso 1 às 17:10, liga o plano zero às 17:15 e, às 17:20, religa o núcleo mínimo e retira o
  // aviso. A projeção fica desligada até o fim.
  const comChaves = (parte: Partial<Controle["chaves"]>, resto: Partial<Controle> = {}): Controle => ({
    ...CONTROLE_INICIAL,
    chaves: { ...CONTROLE_INICIAL.chaves, ...parte },
    ...resto,
  });
  const comandos = [
    { desde: ms("2022-10-30 17:02:00"), controle: comChaves({ baseComPesquisas: false }) },
    { desde: ms("2022-10-30 17:05:00"), controle: comChaves({ projecao: false }) },
    { desde: ms("2022-10-30 17:10:00"), controle: comChaves({ projecao: false }, { aviso: 1 }) },
    { desde: ms("2022-10-30 17:15:00"), controle: comChaves({ projecao: false, nucleoMinimo: false }, { aviso: 1 }) },
    { desde: ms("2022-10-30 17:20:00"), controle: comChaves({ projecao: false }) },
  ];
  /** O critério do Ensaio geral (decisão 20): a chave aparece no site em até 2 rodadas mais o cache. */
  const DUAS_RODADAS = 2 * 20_000;
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    r = await replay("2022-10-30 16:50:00", "2022-10-30 17:26:00", {
      controle: (quando) => comandos.filter((c) => c.desde <= quando).at(-1)?.controle ?? CONTROLE_INICIAL,
    });
  }, 120_000);
  const rodadas = () => r.gravacoes.filter((g) => g.caminho === "rodada.json").map((g) => ({ ...(g.conteudo as ArquivoDeRodada), quando: g.quando }));
  const entre = (de: string, ate: string) => rodadas().filter((x) => x.quando >= ms(de) && x.quando < ms(ate));

  it("sem comando, publica todas as chaves ligadas menos os textos preditivos, e nenhum aviso", () => {
    expect(rodadas()[0]).toMatchObject({
      chaves: { nucleoMinimo: true, projecao: true, baseComPesquisas: true, simulador: true, mapa: true, textosPreditivos: false },
      aviso: null,
    });
  });

  it("uma chave desligada aparece no arquivo de rodada em até 2 rodadas, e desligar a projeção desliga junto o simulador", () => {
    expect(entre("2022-10-30 16:50:00", "2022-10-30 17:05:00").every((x) => x.chaves.projecao && x.chaves.simulador)).toBe(true);
    const primeira = rodadas().find((x) => !x.chaves.projecao)!;
    expect(primeira.quando).toBeGreaterThanOrEqual(ms("2022-10-30 17:05:00"));
    expect(primeira.quando).toBeLessThan(ms("2022-10-30 17:05:00") + DUAS_RODADAS);
    expect(primeira.chaves).toMatchObject({ projecao: false, simulador: false, nucleoMinimo: true, baseComPesquisas: true, mapa: true });
    expect(
      rodadas()
        .filter((x) => x.quando >= primeira.quando)
        .every((x) => !x.chaves.projecao && !x.chaves.simulador),
    ).toBe(true);
  });

  it('desligada a base com pesquisas, o Brasil e as UFs saem só com a "Só apuração" em até 2 rodadas, e o arquivo de rodada sem o peso das pesquisas', () => {
    const brasil = r.gravacoes.filter((g) => g.caminho === "lugares/BR.json").map((g) => ({ ...(g.conteudo as ArquivoDoLugar), quando: g.quando }));
    // A projeção vai ao ar com a fase ao vivo, na primeira rodada depois das 17h, antes das 17:00:21.
    const comAsDuas = brasil.filter((b) => b.quando >= ms("2022-10-30 17:00:21") && b.quando < ms("2022-10-30 17:02:00"));
    const semPesquisas = brasil.filter((b) => b.quando >= ms("2022-10-30 17:02:00") + DUAS_RODADAS && b.quando < ms("2022-10-30 17:05:00"));
    expect(comAsDuas.length).toBeGreaterThan(0);
    expect(comAsDuas.filter((b) => b.projecao?.comPesquisas === undefined || b.projecao.coincidem === undefined)).toEqual([]);
    expect(semPesquisas.length).toBeGreaterThan(0);
    expect(semPesquisas.map((b) => Object.keys(b.projecao!).sort())).toEqual(semPesquisas.map(() => ["comparacoes", "soApuracao"]));
    // As tabelas e o mapa.json também.
    const depois = r.gravacoes.filter(
      (g) =>
        (TABELAS.includes(g.caminho) || g.caminho === "mapa.json") &&
        g.quando >= ms("2022-10-30 17:02:00") + DUAS_RODADAS &&
        g.quando < ms("2022-10-30 17:05:00"),
    );
    expect(depois.filter((g) => TABELAS.includes(g.caminho)).length).toBeGreaterThanOrEqual(28);
    expect(depois.filter((g) => g.caminho === "mapa.json").length).toBeGreaterThan(0);
    expect(
      depois.filter((g) => {
        const { projecao } = g.conteudo as TabelaDeProjecoes | ArquivoDoMapa;
        return !projecao || "comPesquisas" in projecao || "coincidem" in projecao || !("soApuracao" in projecao);
      }),
    ).toEqual([]);
    const pesosComAsDuas = entre("2022-10-30 17:00:21", "2022-10-30 17:02:00").map((x) => x.pesoDasPesquisas);
    const pesosSemPesquisas = entre("2022-10-30 17:02:40", "2022-10-30 17:05:00").map((x) => x.pesoDasPesquisas);
    expect(pesosComAsDuas.length).toBeGreaterThan(3);
    expect(pesosComAsDuas.filter((p) => p === null)).toEqual([]);
    expect(pesosSemPesquisas.length).toBeGreaterThan(3);
    expect(pesosSemPesquisas.filter((p) => p !== null)).toEqual([]);
  });

  it("desligada a projeção, nenhum JSON a leva em até 2 rodadas, nem o arquivo de rodada o peso das pesquisas", () => {
    const depois = r.gravacoes.filter((g) => g.caminho !== "rodada.json" && g.quando >= ms("2022-10-30 17:05:00") + DUAS_RODADAS);
    expect(depois.length).toBeGreaterThan(100);
    // As tabelas de projeções são regravadas sem ela, para nenhuma ficar com a projeção de antes no destino.
    expect(TABELAS.filter((caminho) => r.publicado<TabelaDeProjecoes>(caminho).projecao !== undefined)).toEqual([]);
    expect(depois.filter((g) => g.caminho === "mapa.json").length).toBeGreaterThan(0);
    expect(depois.filter((g) => "projecao" in (g.conteudo as ArquivoDoLugar | TabelaDeProjecoes | ArquivoDoMapa))).toEqual([]);
    const pesos = entre("2022-10-30 17:05:40", "2022-10-30 17:26:00").map((x) => x.pesoDasPesquisas);
    expect(pesos.length).toBeGreaterThan(50);
    expect(pesos.filter((p) => p !== null)).toEqual([]);
  });

  it("o arquivo do simulador perde o agregado sem a base com pesquisas, e a apuração sem a projeção, em até 2 rodadas", () => {
    const doSimulador = r.gravacoes
      .filter((g) => g.caminho === "simulador.json")
      .map((g) => ({ ...(g.conteudo as ArquivoDoSimuladorAoVivo), quando: g.quando }));
    const entreAs = (de: number, ate: number) => doSimulador.filter((s) => s.quando >= de && s.quando < ate);
    const comAsDuas = entreAs(ms("2022-10-30 17:00:21"), ms("2022-10-30 17:02:00"));
    const semPesquisas = entreAs(ms("2022-10-30 17:02:00") + DUAS_RODADAS, ms("2022-10-30 17:05:00"));
    const semProjecao = entreAs(ms("2022-10-30 17:05:00"), Infinity);
    expect(comAsDuas.length).toBeGreaterThan(0);
    expect(comAsDuas.filter((s) => !s.apuracao || !s.agregado)).toEqual([]);
    expect(semPesquisas.length).toBeGreaterThan(0);
    expect(semPesquisas.filter((s) => !s.apuracao || s.agregado)).toEqual([]);
    // Regravado uma vez só com a assinatura, ele não muda mais até a projeção voltar.
    expect(semProjecao.map((s) => Object.keys(s))).toEqual([["assinatura", "quando"]]);
    expect(semProjecao[0]!.quando).toBeLessThan(ms("2022-10-30 17:05:00") + DUAS_RODADAS);
  });

  it("o aviso pronto entra e sai do arquivo de rodada nas rodadas escolhidas", () => {
    const comAviso = rodadas().filter((x) => x.aviso !== null);
    expect(comAviso[0]!.quando).toBeGreaterThanOrEqual(ms("2022-10-30 17:10:00"));
    expect(comAviso[0]!.quando).toBeLessThan(ms("2022-10-30 17:10:00") + DUAS_RODADAS);
    expect(comAviso.every((x) => x.aviso === 1)).toBe(true);
    expect(comAviso.at(-1)!.quando).toBeGreaterThanOrEqual(ms("2022-10-30 17:20:00") - 20_000);
    expect(comAviso.at(-1)!.quando).toBeLessThan(ms("2022-10-30 17:20:00") + DUAS_RODADAS);
    expect(entre("2022-10-30 17:10:40", "2022-10-30 17:20:00").every((x) => x.aviso === 1)).toBe(true);
  });

  it("no plano zero, o coletor publica só o arquivo de rodada, a cada rodada, ainda na fase ao vivo", () => {
    const planoZero = rodadas().filter((x) => !x.chaves.nucleoMinimo);
    const [inicio, fim] = [planoZero[0]!.quando, planoZero.at(-1)!.quando];
    expect(inicio).toBeGreaterThanOrEqual(ms("2022-10-30 17:15:00"));
    expect(inicio).toBeLessThan(ms("2022-10-30 17:15:00") + DUAS_RODADAS);
    expect(fim).toBeGreaterThanOrEqual(ms("2022-10-30 17:20:00") - 20_000);
    // Cinco minutos de rodadas de 20 s, uma gravação do arquivo de rodada em cada: a página continua sabendo a fase e
    // os candidatos, e nada mais sai.
    expect(planoZero).toHaveLength(15);
    expect(planoZero.every((x) => x.fase === "ao-vivo" && x.candidatos.length === 2)).toBe(true);
    expect(r.gravacoes.filter((g) => g.caminho !== "rodada.json" && g.quando >= inicio && g.quando <= fim)).toEqual([]);
  });

  it("religado o núcleo mínimo, os lugares voltam em até 2 rodadas, com o placar do TSE e a curva do Brasil inteira", () => {
    const brasil = r.gravacoes.filter((g) => g.caminho === "lugares/BR.json");
    const antes = brasil.filter((g) => g.quando < ms("2022-10-30 17:15:00")).at(-1)!;
    const depois = brasil.find((g) => g.quando > antes.quando)!;
    expect(depois.quando).toBeGreaterThanOrEqual(ms("2022-10-30 17:20:00"));
    expect(depois.quando).toBeLessThan(ms("2022-10-30 17:20:00") + DUAS_RODADAS);

    // A curva não tem buraco: cada Brasil que o coletor baixou no plano zero (no máximo um por minuto, quando o índice
    // muda; às 17h, cada um muda o % de seções) virou um ponto, e ela volta inteira.
    const curvaAntes = (antes.conteudo as ArquivoDoLugar).curva;
    const curvaDepois = (depois.conteudo as ArquivoDoLugar).curva;
    expect(curvaDepois.slice(0, curvaAntes.length)).toEqual(curvaAntes);
    const primeiraRodadaNoPlanoZero = Date.parse(r.rodadas.find((x) => !x.controle.chaves.nucleoMinimo)!.inicio);
    const baixadosDoBrasil = r.rodadas
      .filter((x) => Date.parse(x.inicio) >= primeiraRodadaNoPlanoZero && Date.parse(x.inicio) <= depois.quando)
      .reduce((n, x) => n + x.baixados.brasil, 0);
    expect(baixadosDoBrasil).toBeGreaterThanOrEqual(3);
    expect(curvaDepois.slice(curvaAntes.length)).toHaveLength(baixadosDoBrasil);
    expect(curvaDepois.every((p, i) => i === 0 || p[0]! >= curvaDepois[i - 1]![0]!)).toBe(true);
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
  });

  it("no plano zero, nem os eventos do Brasil vão no arquivo de rodada: a narração é do núcleo mínimo", async () => {
    // Depois da virada de 2022 (~18:44), o dono liga o plano zero às 18:50.
    const planoZero = { ...CONTROLE_INICIAL, chaves: { ...CONTROLE_INICIAL.chaves, nucleoMinimo: false } };
    const comPlanoZero = await replay("2022-10-30 18:30:00", "2022-10-30 18:53:00", {
      controle: (quando) => (quando >= ms("2022-10-30 18:50:00") ? planoZero : CONTROLE_INICIAL),
    });
    const rodadas = comPlanoZero.gravacoes.filter((g) => g.caminho === "rodada.json").map((g) => g.conteudo as ArquivoDeRodada);

    // Partindo a frio às 18:30, o coletor já acha as duas bases coincidindo, e "as pesquisas deixaram de pesar" entra.
    expect(
      rodadas
        .filter((x) => x.chaves.nucleoMinimo)
        .at(-1)!
        .eventosDoBrasil.map((e) => e.tipo),
    ).toEqual(["virada", "pesquisas"]);
    const noPlanoZero = rodadas.filter((x) => !x.chaves.nucleoMinimo);
    expect(noPlanoZero.length).toBeGreaterThan(5);
    expect(noPlanoZero.filter((x) => x.eventosDoBrasil.length > 0)).toEqual([]);
  }, 120_000);
});

describe("os textos preditivos, pela chave", () => {
  // O dono liga a chave às 17:10 e a desliga às 17:30 (Narração da noite, decisões 5 e 6); no meio, desliga a projeção das
  // 17:18 às 17:22. A conferência é a do ensaio geral (decisão 22): desligada, nenhum preditivo no ar; ligada no meio,
  // nada de antes; desligada de novo, somem todos.
  const LIGA = ms("2022-10-30 17:10:00");
  const SEM_PROJECAO = ms("2022-10-30 17:18:00");
  const COM_PROJECAO = ms("2022-10-30 17:22:00");
  const DESLIGA = ms("2022-10-30 17:30:00");
  /** O critério do Ensaio geral (decisão 20): a chave aparece no site em até 2 rodadas mais o cache. */
  const DUAS_RODADAS = 2 * 20_000;
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    r = await replay("2022-10-30 16:50:00", "2022-10-30 17:40:00", {
      controle: (quando) => ({
        ...CONTROLE_INICIAL,
        chaves: {
          ...CONTROLE_INICIAL.chaves,
          projecao: quando < SEM_PROJECAO || quando >= COM_PROJECAO,
          textosPreditivos: quando >= LIGA && quando < DESLIGA,
        },
      }),
    });
  }, 180_000);
  const lugaresEntre = (de: number, ate: number) =>
    r.gravacoes.filter((g) => g.caminho.startsWith("lugares/") && g.quando >= de && g.quando < ate).map((g) => g.conteudo as ArquivoDoLugar);

  it("a conferência dos preditivos não acusa nada na noite em que a chave liga e desliga", () => {
    expect(conferirPreditivos(r.gravacoes)).toEqual([]);
  });

  it("desligada a projeção, os preditivos saem dos JSONs em até 2 rodadas e voltam com ela, regravados em até 2 rodadas", () => {
    const comPreditivos = (l: ArquivoDoLugar) => l.narracao.filter((e) => e.base || e.linhaDaProjecao).map((e) => `${e.lugar} ${e.tipo} ${e.base} ${e.quando}`);
    const semProjecao = lugaresEntre(SEM_PROJECAO + DUAS_RODADAS, COM_PROJECAO);
    expect(semProjecao.length).toBeGreaterThan(100);
    expect(semProjecao.filter((l) => comPreditivos(l).length > 0)).toEqual([]);
    // Cada lugar com preditivos no ar antes de a projeção sair volta a tê-los, todos, em até 2 rodadas da volta dela.
    const antes = new Map(lugaresEntre(LIGA, SEM_PROJECAO).map((l) => [l.lugar, comPreditivos(l)]));
    const depois = new Map(lugaresEntre(COM_PROJECAO, COM_PROJECAO + DUAS_RODADAS).map((l) => [l.lugar, comPreditivos(l)]));
    const comAlgum = [...antes].filter(([, eventos]) => eventos.length > 0);
    expect(comAlgum.length).toBeGreaterThan(28);
    expect(comAlgum.filter(([id, eventos]) => !eventos.every((e) => depois.get(id)?.includes(e)))).toEqual([]);
  });

  it("ligada, entram os preditivos do Brasil, das UFs e dos municípios, nas duas bases, sem número na curva, e a linha da projeção nos marcos", () => {
    const ligada = lugaresEntre(LIGA, DESLIGA);
    const preditivos = ligada.flatMap((l) => l.narracao.filter((e) => e.base !== undefined).map((e) => ({ ...e, de: l.lugar })));
    expect(new Set(preditivos.map((e) => e.tipo))).toEqual(new Set(["sinal-de-virada", "chance"]));
    expect(new Set(preditivos.map((e) => e.base))).toEqual(new Set(BASES));
    expect(preditivos.some((e) => e.lugar === "BR")).toBe(true);
    expect(preditivos.some((e) => e.lugar.length === 2 && e.lugar !== "BR")).toBe(true);
    expect(preditivos.some((e) => e.lugar.length === 5)).toBe(true);
    // Cada um na narração do próprio lugar, com o texto da decisão 8, e nenhum na curva.
    expect(preditivos.filter((e) => e.lugar !== e.de || "numero" in e || "ponto" in e || !e.texto.startsWith("Projeção do Apurador: "))).toEqual([]);
    expect(
      preditivos.filter(
        (e) =>
          !/^Projeção do Apurador: (virada projetada|virada possível|sem sinal de virada)\. (Bolsonaro|Lula) à frente no placar parcial; chance de virada de (Bolsonaro|Lula) (<1|>99|\d\d?)%\.$/.test(
            e.texto,
          ) && !/^Projeção do Apurador: chance de vitória de (Bolsonaro|Lula) passa de (90|99)%\.$/.test(e.texto),
      ),
    ).toEqual([]);
    const linhas = ligada.flatMap((l) => l.narracao.filter((e) => e.linhaDaProjecao));
    expect(linhas.length).toBeGreaterThan(0);
    expect(linhas.every((e) => e.tipo === "marco" && Object.keys(e.linhaDaProjecao!).sort().join() === "comPesquisas,soApuracao")).toBe(true);
    expect(
      linhas
        .flatMap((e) => Object.values(e.linhaDaProjecao!))
        .filter((t) => !/^Projeção do Apurador: Bolsonaro \d\d,\d% ± \d+,\d, Lula \d\d,\d% ± \d+,\d\.$/.test(t)),
    ).toEqual([]);
  });

  it("desligada de novo, os lugares com preditivos são regravados sem eles na rodada seguinte, e nenhum fica no ar", () => {
    // Todo lugar com preditivos no ar às 17:30 é regravado antes das 17:30:40, e o último JSON de cada lugar não tem nenhum.
    const comPreditivos = new Set(
      lugaresEntre(LIGA, DESLIGA)
        .filter((l) => l.narracao.some((e) => e.base || e.linhaDaProjecao))
        .map((l) => l.lugar),
    );
    const regravados = new Set(lugaresEntre(DESLIGA, DESLIGA + 40_000).map((l) => l.lugar));
    // Mais que o Brasil e as 27 UFs: municípios também.
    expect(comPreditivos.size).toBeGreaterThan(28);
    expect([...comPreditivos].filter((id) => !regravados.has(id))).toEqual([]);
    expect(lugares.filter((l) => r.publicado(l.caminho).narracao.some((e) => e.base || e.linhaDaProjecao))).toEqual([]);
  });
});
