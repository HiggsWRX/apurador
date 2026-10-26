import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { type ArquivoDeRodada, type ArquivoDoLugar, type ArquivoDoMapa, type MunicipiosDaTabela, type TabelaDeProjecoes } from "@apurador/coletor";
import { assinaturaDosLugares, idDoMunicipio } from "@apurador/pipeline";
import { conferirPlacar } from "../src/index.ts";
import { cadastro, noite } from "./noite-2022.ts";
import { ms, BRASIL, replay, lugares, TABELAS, MUNICIPIOS_DAS_TABELAS, DO_MAPA, BASES, comUmaCasa, inteiro } from "./replay.ts";

// O replay automático (`replay.ts`): de antes das 17h até a primeira meia hora da apuração, e o arquivo que o coletor não aceita.

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
      eventosDoBrasil: [],
    });
    expect(publicado("lugares/BR.json")).toEqual({
      lugar: "BR",
      tse: { totalizacao: null, secoes: { totalizadas: 0, total: 472_075, percentual: 0 }, votos: [0, 0], percentuais: [0, 0], final: false },
      curva: [],
      narracao: [],
    });
  }, 60_000);

  it("não publica a projeção nem o peso das pesquisas: antes das 17h, a projeção é a do painel, atrás das chaves de antes das 17h", async () => {
    const { gravacoes } = await replay("2022-10-30 16:50:00", "2022-10-30 16:55:00");

    expect(gravacoes.filter((g) => g.caminho.startsWith("lugares/")).length).toBeGreaterThan(5_000);
    // Nem os lugares, nem as tabelas de projeções, nem o mapa.json; os municípios das tabelas, com as comparações, nem saem.
    expect(gravacoes.filter((g) => TABELAS.includes(g.caminho)).length).toBeGreaterThanOrEqual(TABELAS.length);
    expect(gravacoes.filter((g) => g.caminho === "mapa.json").length).toBeGreaterThan(0);
    expect(gravacoes.filter((g) => MUNICIPIOS_DAS_TABELAS.includes(g.caminho))).toEqual([]);
    expect(gravacoes.filter((g) => "projecao" in (g.conteudo as ArquivoDoLugar))).toEqual([]);
    expect(gravacoes.filter((g) => g.caminho === "rodada.json" && (g.conteudo as ArquivoDeRodada).pesoDasPesquisas !== null)).toEqual([]);
  }, 60_000);

  it("na partida, publica uma vez cada lugar; depois, sem novidade, só os índices, com ETag e 304", async () => {
    const { gravacoes, rodadas, tse } = await replay("2022-10-30 16:50:00", "2022-10-30 16:58:00");

    const publicados = gravacoes.filter((g) => g.caminho.startsWith("lugares/"));
    expect(new Set(publicados.map((g) => g.caminho))).toEqual(new Set(lugares.map((l) => l.caminho)));
    expect(publicados).toHaveLength(lugares.length);
    expect(tse.registro().naoEncontrados).toEqual([]);
    const depois = rodadas.slice(rodadas.findIndex((x) => x.baixados.municipios + x.baixados.zonas === 0));
    expect(depois.length).toBeGreaterThan(3);
    expect(depois.map((x) => x.respostas)).toEqual(depois.map(() => ({ 304: 29 })));
  }, 60_000);
});

describe("entre as 17h e a primeira seção", () => {
  it("projeta como o painel de antes das 17h: as pesquisas pesam 100%, e a base com pesquisas é a indicação delas", async () => {
    // O Brasil tem a primeira seção às 17:00:51; até lá, o coletor já está na fase ao vivo.
    const { gravacoes } = await replay("2022-10-30 16:50:00", "2022-10-30 17:00:45");
    const zerados = gravacoes.filter(
      (g) => g.caminho === "lugares/BR.json" && g.quando >= ms("2022-10-30 17:00:00") && (g.conteudo as ArquivoDoLugar).tse.secoes.totalizadas === 0,
    );
    const rodadas = gravacoes.filter((g) => g.caminho === "rodada.json" && g.quando >= ms("2022-10-30 17:00:00"));
    expect(zerados.length).toBeGreaterThan(0);
    expect(rodadas.length).toBeGreaterThan(0);
    const { projecao } = zerados.at(-1)!.conteudo as ArquivoDoLugar;

    expect(rodadas.map((g) => (g.conteudo as ArquivoDeRodada).pesoDasPesquisas)).toEqual(rodadas.map(() => 100));
    // As referências: o 1º turno de 2022 (Bolsonaro 51.072.345 e Lula 57.259.504 votos, 47,1% entre os dois) e o agregado
    // da véspera, com Lula em 50,98 (ticket 08), Bolsonaro em 49,0. Antes da primeira seção, a "Só apuração" parte do 1º
    // turno, e a base com pesquisas, da indicação delas.
    expect(projecao!.comparacoes).toEqual({ primeiroTurno: 47.1, pesquisas: 49.0 });
    expect(projecao!.soApuracao.projecao).toBe(47.1);
    expect(projecao!.comPesquisas!.projecao).toBe(49.0);
    // Ninguém está atrás num placar sem votos: não há chance de virada nem sinal.
    expect(projecao!.comPesquisas).toMatchObject({ chanceDeVirada: null, sinalDeVirada: null });
    // A curva vai até 100% das seções e termina na projeção, com a margem dela.
    expect(projecao!.comPesquisas!.curva[0]![0]).toBeGreaterThan(0);
    expect(projecao!.comPesquisas!.curva.at(-1)).toEqual([100, 49.0, projecao!.comPesquisas!.margem]);
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
  }, 30_000);

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

  describe("a tabela de projeções de cada UF e do Exterior", () => {
    // Volume de gravações na noite, decisão 1: as projeções dos municípios ficam numa tabela por UF, nas duas bases, e o
    // JSON do município fica só com o que vem do arquivo do TSE dele e a narração dele.
    const tabela = (caminho: string) => r.publicado<TabelaDeProjecoes>(caminho);
    const municipios = (i: number) => r.publicado<MunicipiosDaTabela>(MUNICIPIOS_DAS_TABELAS[i]!);
    const comProjecao = () => r.gravacoes.filter((g) => TABELAS.includes(g.caminho) && (g.conteudo as TabelaDeProjecoes).projecao);

    it("há 28, uma para cada UF e uma para o Exterior, cada uma com os municípios dela nas duas bases", () => {
      const gravadas = new Set(r.gravacoes.filter((g) => /^tabelas\/[A-Z]{2}\.json$/.test(g.caminho)).map((g) => g.caminho));
      expect([...gravadas].sort()).toEqual([...TABELAS].sort());
      expect(gravadas.size).toBe(28);
      for (const [i, uf] of cadastro.ufs.entries()) {
        const { uf: sigla, projecao } = tabela(TABELAS[i]!);
        const daTabela = municipios(i);
        expect([sigla, daTabela.uf]).toEqual([uf.sigla, uf.sigla]);
        expect([...daTabela.municipios].sort()).toEqual(uf.municipios.map((m) => idDoMunicipio(m.codigo)).sort());
        expect([daTabela.assinatura, projecao!.assinatura]).toEqual(Array(2).fill(assinaturaDosLugares(daTabela.municipios)));
        expect(Object.keys(projecao!).sort()).toEqual(["assinatura", "coincidem", "comPesquisas", "soApuracao", "validos"]);
        const n = daTabela.municipios.length;
        for (const base of BASES) {
          expect(Object.keys(projecao![base]!).sort()).toEqual(["chance", "chanceDeVirada", "margem", "projecao", "sinalDeVirada", "virada"]);
          expect(Object.values(projecao![base]!).map((coluna) => coluna.length)).toEqual(Array(6).fill(n));
        }
        expect([projecao!.validos, projecao!.coincidem!, daTabela.comparacoes.primeiroTurno, daTabela.comparacoes.pesquisas].map((c) => c.length)).toEqual(
          Array(4).fill(n),
        );
      }
    });

    it("grava os municípios de cada tabela, com as comparações, uma vez só, a partir das 17h", () => {
      const gravados = r.gravacoes.filter((g) => MUNICIPIOS_DAS_TABELAS.includes(g.caminho));
      expect(gravados.map((g) => g.caminho).sort()).toEqual([...MUNICIPIOS_DAS_TABELAS].sort());
      expect(gravados.every((g) => g.quando >= ms("2022-10-30 17:00:00"))).toBe(true);
    });

    it("leva os números como a página os mostra: projeção, margem e comparações com uma casa; chance, chance de virada, % da virada e válidos inteiros", () => {
      const publicadas = comProjecao().map((g) => (g.conteudo as TabelaDeProjecoes).projecao!);
      expect(publicadas.length).toBeGreaterThan(28 * 50);
      const fora = publicadas.filter(
        (p) =>
          !p.validos.every(inteiro) ||
          !BASES.every(
            (base) =>
              [...p[base]!.projecao, ...p[base]!.margem].every(comUmaCasa) &&
              [...p[base]!.chance, ...p[base]!.chanceDeVirada, ...p[base]!.virada.flat()].every(inteiro),
          ),
      );
      expect(fora).toEqual([]);
      const comparacoes = cadastro.ufs.flatMap((_, i) => [...municipios(i).comparacoes.primeiroTurno, ...municipios(i).comparacoes.pesquisas]);
      expect(comparacoes.filter((c) => !comUmaCasa(c))).toEqual([]);
    });

    it("a projeção de cada UF é a dos municípios dela, pesados pelos votos válidos projetados, nas duas bases", () => {
      // Cada município entra com uma casa: a média pesada fica a menos de 0,05 da conta sem arredondar, e a da UF também.
      const longe = TABELAS.flatMap((caminho, i) => {
        const { projecao } = tabela(caminho);
        const daUf = r.publicado(`lugares/${cadastro.ufs[i]!.sigla}.json`).projecao!;
        const total = projecao!.validos.reduce((s, v) => s + v, 0);
        return BASES.flatMap((base) => {
          const media = projecao![base]!.projecao.reduce((s, p, j) => s + p * projecao!.validos[j]!, 0) / total;
          return Math.abs(media - daUf[base]!.projecao) > 0.1 ? [`${caminho} ${base}: ${media.toFixed(3)} × ${daUf[base]!.projecao}`] : [];
        });
      });
      expect(longe).toEqual([]);
    });

    it("o JSON do município continua só com o que vem do arquivo do TSE dele e a narração dele", () => {
      const municipios = lugares.filter((l) => l.abrangencia.municipio !== undefined).map((l) => r.publicado(l.caminho));
      expect(municipios.filter((m) => Object.keys(m).sort().join() !== "curva,lugar,narracao,tse")).toEqual([]);
    });
  });

  describe("o mapa.json", () => {
    it("traz o % de seções e o placar de cada UF e de cada município, com as duas casas do TSE, iguais aos dos JSONs publicados", () => {
      const mapa = r.publicado<ArquivoDoMapa>("mapa.json");
      // Na ordem dos lugares do site, que a página confere pela assinatura; os do site que não votaram em 2022 ficam vazios.
      expect(mapa.assinatura).toBe(assinaturaDosLugares(DO_MAPA.map((l) => l.id)));
      expect(mapa.tse).toHaveLength(DO_MAPA.length);
      // O % do 2º candidato só vai quando não é o que falta para 100,00.
      const lido = (ponto: ArquivoDoMapa["tse"][number]) => ponto && [ponto[0], ponto[1], ponto[2] ?? (10_000 - Math.round(100 * ponto[1])) / 100];
      const diferentes = DO_MAPA.flatMap((l, i) => {
        const publicado = r.publicado(`lugares/${l.id}.json`);
        const esperado = publicado ? [publicado.tse.secoes.percentual, ...publicado.tse.percentuais] : null;
        return JSON.stringify(lido(mapa.tse[i]!)) === JSON.stringify(esperado) ? [] : [l.id];
      });
      expect(diferentes).toEqual([]);
      expect(mapa.tse.filter((x) => x?.length === 2).length).toBeGreaterThan(1_000);
      expect(mapa.tse.filter((x) => x === null)).toHaveLength(DO_MAPA.length - lugares.length + 1);
      expect(mapa.tse.filter((x) => x !== null && x[0]! > 0).length).toBeGreaterThan(1_000);
    });

    it("traz a projeção de cada UF e do Exterior nas duas bases, a mesma do JSON dela: a coluna da tabela do Brasil", () => {
      const { projecao } = r.publicado<ArquivoDoMapa>("mapa.json");
      for (const base of BASES) {
        expect(projecao![base]).toEqual(
          Object.fromEntries(cadastro.ufs.map((uf) => [uf.sigla, r.publicado(`lugares/${uf.sigla}.json`).projecao![base]!.projecao])),
        );
      }
    });

    it("traz o 1º turno com que a projeção de cada UF e do Exterior se compara, o mesmo do JSON dela: o modo de mudança do mapa", () => {
      const { projecao } = r.publicado<ArquivoDoMapa>("mapa.json");
      expect(projecao!.primeiroTurno).toEqual(
        Object.fromEntries(cadastro.ufs.map((uf) => [uf.sigla, r.publicado(`lugares/${uf.sigla}.json`).projecao!.comparacoes.primeiroTurno])),
      );
    });
  });
});

describe("um arquivo que o coletor não aceita", () => {
  // Três minutos: com um pedido por minuto ao arquivo do Brasil, ele vem estragado pelo menos duas vezes.
  const [de, ate] = [ms("2022-10-30 17:03:00"), ms("2022-10-30 17:06:00")];

  async function comBrasilTrocado(corpo: string) {
    const r = await replay("2022-10-30 16:50:00", "2022-10-30 17:09:00", {
      trocar: (url, quando) => (url.endsWith(BRASIL) && quando >= de && quando < ate ? corpo : undefined),
    });
    // O JSON do Brasil muda também com a projeção, que anda com os municípios: o que não pode mudar é o placar.
    const brasil = r.gravacoes.filter((g) => g.caminho === "lugares/BR.json");
    const placar = (g: (typeof brasil)[number]) => JSON.stringify((g.conteudo as ArquivoDoLugar).tse);
    const ultimoBom = placar(brasil.filter((g) => g.quando < de + 1_000).at(-1)!);
    return {
      r,
      falhas: r.rodadas.flatMap((x) => x.falhas).filter((f) => f.includes(BRASIL)),
      /** As gravações do Brasil com outro placar enquanto o arquivo vem estragado. */
      mudouNaJanela: brasil.filter((g) => g.quando >= de + 1_000 && g.quando < ate && placar(g) !== ultimoBom),
      /** A primeira gravação do Brasil com placar novo depois da janela. */
      placarNovo: brasil.find((g) => g.quando >= ate && placar(g) !== ultimoBom),
    };
  }

  it("fica de fora quando o leitor não o entende: o Brasil mantém o último placar bom, e o coletor pede de novo", async () => {
    const { r, falhas, mudouNaJanela, placarNovo } = await comBrasilTrocado("<html>Erro</html>");

    expect(falhas.length).toBeGreaterThanOrEqual(2);
    expect(falhas[0]).toMatch(/não é JSON/);
    // Nada errado foi publicado, e o placar do Brasil não muda enquanto o arquivo vem estragado.
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
    expect(mudouNaJanela).toEqual([]);
    // Depois, o coletor volta a pedir e publica o placar novo do Brasil.
    expect(placarNovo).toBeDefined();
  }, 60_000);

  it("fica de fora quando não traz os mesmos candidatos, sem derrubar o coletor", async () => {
    // O Brasil zerado de 2026, só com o candidato 22: falta o 13.
    const real = JSON.parse(readFileSync(new URL("amostras/tse/6258/br-c0001-e006258-u.json", import.meta.url), "utf8"));
    for (const agremiacao of real.carg[0].agr) for (const partido of agremiacao.par) partido.cand = partido.cand.filter((c: { n: string }) => c.n !== "13");
    const { r, falhas, mudouNaJanela, placarNovo } = await comBrasilTrocado(JSON.stringify(real));

    expect(falhas.length).toBeGreaterThanOrEqual(2);
    expect(falhas[0]).toMatch(/candidatos \(22\) não são os do Brasil \(13, 22\)/);
    expect(conferirPlacar(r.placares(), { noite, cadastro })).toEqual([]);
    expect(mudouNaJanela).toEqual([]);
    expect(r.rodadas.at(-1)!.falhas).toEqual([]);
    expect(placarNovo).toBeDefined();
  }, 60_000);
});
