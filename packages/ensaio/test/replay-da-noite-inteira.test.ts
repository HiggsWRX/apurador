import { gzipSync } from "node:zlib";
import { beforeAll, describe, expect, it } from "vitest";
import { type ArquivoDeRodada, type ArquivoDoLugar, type EventoDaNarracao, type MunicipiosDaTabela, type TabelaDeProjecoes } from "@apurador/coletor";
import { conferirPlacar, conferirPreditivos, resultadosDoTseFalso } from "../src/index.ts";
import { cadastro, instante, noite } from "./noite-2022.ts";
import { ms, replay, lugares, TABELAS, MUNICIPIOS_DAS_TABELAS, BASES, comUmaCasa, inteiro, zonas } from "./replay.ts";

// O replay automático (`replay.ts`): a noite inteira, até 30 min depois da totalização final.

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

  it("com a chave dos textos preditivos desligada a noite toda, nenhum preditivo em nenhum JSON público de nenhuma rodada", () => {
    expect(r.gravacoes.every((g) => g.caminho !== "rodada.json" || !(g.conteudo as ArquivoDeRodada).chaves.textosPreditivos)).toBe(true);
    expect(conferirPreditivos(r.gravacoes)).toEqual([]);
  }, 120_000);

  it("termina com o resultado oficial em todos os lugares, e a fase encerrada", () => {
    const final = r.tse.estado().dataHoraDaTotalizacaoFinal!;
    const ultimos = lugares.map((l) => r.publicado(l.caminho));

    expect(ultimos.filter((l) => !l.tse.final || l.tse.totalizacao !== final || l.tse.secoes.totalizadas !== l.tse.secoes.total)).toEqual([]);
    // O resultado oficial do 2º turno de 2022: Bolsonaro 58.206.354 e Lula 60.345.999.
    expect(r.publicado("lugares/BR.json").tse).toMatchObject({
      secoes: { totalizadas: 472_075, total: 472_075, percentual: 100 },
      votos: [58_206_354, 60_345_999],
    });
    expect(r.rodada().fase).toBe("encerrada");
  });

  it("passa a encerrada na primeira rodada depois da totalização final, e não sai mais dela", () => {
    const fases = r.fases();
    const primeira = fases.findIndex((f) => f.fase === "encerrada");

    expect(fases[primeira]!.quando - ms(r.tse.estado().dataHoraDaTotalizacaoFinal!)).toBeLessThan(80_000);
    expect(fases.slice(primeira).every((f) => f.fase === "encerrada")).toBe(true);
  });

  it("guarda as zonas dos municípios com mais de uma, iguais às do TSE falso no fim", () => {
    const tse = resultadosDoTseFalso({ noite, cadastro });
    tse.avancarAte(Infinity);

    expect(zonas.length).toBeGreaterThan(500);
    expect(zonas.filter((z) => JSON.stringify(r.coletor.resultado(z)) !== JSON.stringify(tse.resultado(z)))).toEqual([]);
  });

  it("registra o tempo de cada rodada, e nenhuma passa dos 15 s: nem a partida a frio, nem o pico de ~600 municípios, nem a varredura do fim", () => {
    const pico = r.rodadas.filter((x) => x.fase === "ao-vivo").reduce((a, b) => (b.baixados.municipios > a.baixados.municipios ? b : a));

    expect(r.rodadas.every((x) => x.duracao > 0 && x.duracao <= 15_000)).toBe(true);
    expect(pico.baixados.municipios).toBeGreaterThan(400);
    // O custo de calcular a rodada do pico, no relógio do computador, fica muito abaixo dos 15 s.
    expect(pico.processamento).toBeLessThan(5_000);
    // A partida a frio, com os ~6.500 arquivos, cabe em poucas rodadas antes das 17h.
    expect(r.rodadas.findIndex((x) => x.baixados.municipios === 0)).toBeLessThan(15);
  });

  it("grava na ordem das contas do ticket 24, ~135 mil na noite, e nenhuma rodada chega ao teto de 1.500", () => {
    // Volume de gravações na noite: ~135 mil na noite, com a meta do ensaio 1 abaixo de 200 mil (decisão 9), e no
    // máximo 1.500 por rodada (decisão 5), com o pico esperado em ~700. Em 22/10/2026: 124.053, e 629 na maior rodada.
    expect(r.gravacoes.length).toBeGreaterThan(100_000);
    expect(r.gravacoes.length).toBeLessThan(200_000);
    expect(Math.max(...r.rodadas.map((x) => x.gravacoes))).toBeLessThan(1_500);
  });

  it("o mapa.json fica em ~25 KB com gzip, e as 28 tabelas de projeções na ordem dos 68 KB somados", () => {
    // Uma gravação em cada 20: o mapa.json muda quase a cada rodada. O gzip é o do destino R2 (`r2.ts`). Em 22/10/2026,
    // o mapa.json chegou a 20,7 KB, e as tabelas a 69,5 KB somadas (Minas Gerais 10,6 KB e São Paulo 6,8 KB).
    const gz = (g: { bytes: Uint8Array }) => gzipSync(g.bytes).length / 1024;
    const mapas = r.gravacoes.filter((g) => g.caminho === "mapa.json").filter((_, i) => i % 20 === 0);
    expect(mapas.length).toBeGreaterThan(30);
    expect(Math.max(...mapas.map(gz))).toBeLessThan(25);
    // As 28 no maior momento delas, cada uma no seu.
    const maiores = new Map<string, number>();
    for (const g of r.gravacoes.filter((g) => TABELAS.includes(g.caminho)).filter((_, i) => i % 20 === 0)) {
      maiores.set(g.caminho, Math.max(maiores.get(g.caminho) ?? 0, gz(g)));
    }
    expect([...maiores.values()].reduce((s, t) => s + t, 0)).toBeLessThan(70);
  }, 60_000);

  it("no fim, a projeção de cada município é o resultado dele, sem margem, e os válidos projetados são os votos dos dois", () => {
    const longe = TABELAS.flatMap((caminho, j) => {
      const { projecao } = r.publicado<TabelaDeProjecoes>(caminho);
      return r.publicado<MunicipiosDaTabela>(MUNICIPIOS_DAS_TABELAS[j]!).municipios.flatMap((id, i) => {
        const [primeiro, segundo] = r.publicado(`lugares/${id}.json`).tse.votos as [number, number];
        const resultado = primeiro + segundo > 0 ? Math.round((1000 * primeiro) / (primeiro + segundo)) / 10 : 50;
        return BASES.flatMap((base) => {
          const p = projecao![base]!;
          const certo = p.projecao[i] === resultado && p.margem[i] === 0 && projecao!.validos[i] === primeiro + segundo;
          return certo ? [] : [`${id} ${base}: ${p.projecao[i]} ± ${p.margem[i]} com ${projecao!.validos[i]} válidos; o resultado, ${resultado}`];
        });
      });
    });
    expect(longe).toEqual([]);
  });

  it("nunca passa de 50 pedidos num segundo, o limite que alerta o dono, nem pede URL inexistente", () => {
    let maximo = 0;
    for (let fim = 0, inicio = 0; fim < r.pedidos.length; fim++) {
      while (r.pedidos[fim]!.quando - r.pedidos[inicio]!.quando >= 1000) inicio++;
      maximo = Math.max(maximo, fim - inicio + 1);
    }
    expect(maximo).toBeLessThanOrEqual(50);
    expect(r.tse.registro().naoEncontrados).toEqual([]);
    expect(r.tse.registro().violacoes).toEqual([]);
  });

  describe("a narração factual", () => {
    // As referências são a medição da narração de 2022 (.scratch/apurador-2026/research/14-narracao-noite-2t-2022.md):
    // os marcos e as trocas de líder do Brasil (seções 1 e 2), as trocas por UF depois de 3% (seção 3), as UFs que
    // terminam (seção 4) e onde estão as seções que faltam (seção 6). O coletor vê o Brasil no máximo uma vez por minuto.
    const narracao = (id: string) => r.publicado(`lugares/${id}.json`).narracao;
    const doBrasil = () => narracao("BR").filter((e) => e.lugar === "BR");
    const dasUfs = (tipo: EventoDaNarracao["tipo"]) => narracao("BR").filter((e) => e.lugar !== "BR" && e.tipo === tipo);
    const UFS_E_EXTERIOR = cadastro.ufs.map((uf) => uf.sigla);

    it('no Brasil, tem ~50 eventos: o começo, "as pesquisas deixaram de pesar", os 7 marcos, uma virada, a indicação do TSE, a totalização final e os das UFs', () => {
      expect(
        doBrasil()
          .map((e) => (e.tipo === "marco" ? `${e.marco}%` : e.tipo))
          .reverse(),
      ).toEqual(["comeco", "pesquisas", "10%", "25%", "50%", "virada", "75%", "90%", "95%", "indicacao", "99%", "totalizacao-final"]);
      // As 4 viradas em UF depois de 3% das seções da UF, na ordem da noite, cada UF que termina e os 50% dos 8 maiores eleitorados.
      expect(
        dasUfs("virada")
          .map((e) => e.lugar)
          .reverse(),
      ).toEqual(["MG", "AP", "AM", "MG"]);
      expect(
        dasUfs("fim")
          .map((e) => e.lugar)
          .sort(),
      ).toEqual([...UFS_E_EXTERIOR].sort());
      expect(
        dasUfs("marco")
          .map((e) => `${e.lugar} ${e.marco}%`)
          .sort(),
      ).toEqual(["BA 50%", "CE 50%", "MG 50%", "PE 50%", "PR 50%", "RJ 50%", "RS 50%", "SP 50%"]);
      expect(narracao("BR")).toHaveLength(12 + 4 + 28 + 8);
      // Nenhum evento de município entra.
      expect(narracao("BR").filter((e) => e.lugar.length > 2)).toEqual([]);
    });

    it("tem uma única virada no Brasil, às ~18:44, sem a troca de 0,26% das 17:08", () => {
      const [virada, ...outras] = doBrasil().filter((e) => e.tipo === "virada");
      expect(outras).toEqual([]);
      // A primeira troca para Lula depois de 3% é às 18:42:53, com 66,78%; a última, às 18:44:50, com 68,32%. O
      // coletor lê o Brasil uma vez por minuto: a virada sai na primeira leitura com Lula à frente, até 18:45:50.
      expect(virada!.quando >= "2022-10-30 18:42:53" && virada!.quando <= "2022-10-30 18:45:50").toBe(true);
      expect(virada!.texto).toMatch(/^Virada no Brasil: Lula passa à frente no placar parcial, com 6[678],\d\d% das seções totalizadas\.$/);
      expect(virada!.ponto![0]).toBeGreaterThanOrEqual(66.78);
    });

    it("dá a indicação do TSE quando o arquivo a traz, e a totalização final com o resultado oficial", () => {
      const indicacao = doBrasil().find((e) => e.tipo === "indicacao")!;
      // O campo aparece às 19:56:20, com 98,78% das seções (ticket 11); o coletor o vê na leitura seguinte do Brasil.
      expect(indicacao.quando >= "2022-10-30 19:56:20" && indicacao.quando < "2022-10-30 19:58:00").toBe(true);
      expect(indicacao.texto).toMatch(/^O TSE indica Lula eleito: eleição matematicamente definida, com 98,(7[89]|8\d)% das seções totalizadas\.$/);
      expect(doBrasil()[0]).toMatchObject({
        tipo: "totalizacao-final",
        quando: "2022-10-31 00:18:04",
        texto: "Totalização final: Lula eleito com 50,90% dos votos válidos.",
      });
    });

    it("cada marco do Brasil diz o % observado e que o que falta está mais no Sudeste e no Nordeste", () => {
      const marcos = doBrasil().filter((e) => e.tipo === "marco");
      expect(marcos).toHaveLength(7);
      for (const m of marcos) {
        expect(m.ponto![0]).toBeGreaterThanOrEqual(m.marco!);
        expect(m.texto).toMatch(
          /^Passa de \d\d% das seções totalizadas no Brasil: \d\d,\d\d%\. Bolsonaro \d\d,\d\d%, Lula \d\d,\d\d%\. Das seções que faltam, \d\d% são do Sudeste e \d\d% do Nordeste\.$/,
        );
      }
      // Com 50%, faltam 51% no Sudeste e 30% no Nordeste (seção 6).
      expect(marcos.find((m) => m.marco === 50)!.texto).toMatch(/Das seções que faltam, 51% são do Sudeste e 30% do Nordeste\.$/);
    });

    it("numera na curva só os eventos do próprio lugar, na ordem da noite", () => {
      expect(
        doBrasil()
          .map((e) => e.numero)
          .reverse(),
      ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      expect(narracao("BR").filter((e) => e.lugar !== "BR" && (e.numero !== undefined || e.ponto !== undefined))).toEqual([]);
      // Minas Gerais na ordem da medição: a virada para Bolsonaro com 15,8% (seção 3), entre os 10% e os 25% (18:14:54,
      // seção 7); a volta de Lula com 93,1%, depois dos 90% (19:26:44) e antes dos 95%; os 99% às 20:36:42.
      const mg = [...narracao("MG")].reverse().map((e) => [e.numero, e.tipo === "marco" ? `${e.marco}%` : e.tipo]);
      expect(mg).toEqual([
        [1, "comeco"],
        [2, "10%"],
        [3, "virada"],
        [4, "25%"],
        [5, "50%"],
        [6, "75%"],
        [7, "90%"],
        [8, "virada"],
        [9, "95%"],
        [10, "99%"],
        [11, "fim"],
      ]);
    });

    it('nas outras páginas, o arquivo de rodada leva a virada, "as pesquisas deixaram de pesar", a indicação do TSE e a totalização final do Brasil, sem número', () => {
      const eventos = r.rodada().eventosDoBrasil;
      expect(eventos.map((e) => e.tipo)).toEqual(["totalizacao-final", "indicacao", "virada", "pesquisas"]);
      expect(eventos.filter((e) => e.lugar !== "BR" || "numero" in e || "ponto" in e)).toEqual([]);
      expect(eventos[0]).toEqual({
        lugar: "BR",
        tipo: "totalizacao-final",
        quando: "2022-10-31 00:18:04",
        texto: "Totalização final: Lula eleito com 50,90% dos votos válidos.",
      });
      expect(eventos[1]!.texto).toMatch(/^O TSE indica Lula eleito: /);
      expect(eventos[2]!.texto).toMatch(/^Virada no Brasil: Lula passa à frente /);
    });

    it('nomeia o estado e o município sem ambiguidade, e cada município termina com "terminou" e só tem o marco de 50%', () => {
      expect(narracao("SP")[0]!.texto).toMatch(/^O estado de São Paulo terminou a totalização\./);
      expect(narracao("71072")[0]!.texto).toMatch(/^São Paulo \(SP\) terminou a totalização\./);
      const municipios = lugares.filter((l) => l.caminho.length > "lugares/XX.json".length).map((l) => narracao(l.caminho.slice(8, -5)));
      // Os 5.570 municípios e as 181 cidades do exterior (seção 5).
      expect(municipios).toHaveLength(5_751);
      // Um "terminou" em cada um, por último: uma virada vista na mesma rodada vem antes dele, pela prioridade.
      expect(municipios.filter((n) => n.filter((e) => e.tipo === "fim").length !== 1 || n.find((e) => e.tipo === "fim")!.quando !== n[0]!.quando)).toEqual([]);
      expect(municipios.flat().filter((e) => e.tipo === "marco" && e.marco !== 50)).toEqual([]);
    });

    // O TSE falso para de mudar na final: a trava, com um arquivo que chega depois dela, está no teste da narração.
    it("para de crescer na totalização final: nenhum evento depois dela", () => {
      const final = r.tse.estado().dataHoraDaTotalizacaoFinal!;
      const todos = lugares.flatMap((l) => r.publicado(l.caminho).narracao);
      expect(todos.filter((e) => e.quando > final)).toEqual([]);
    });
  });

  describe("a projeção", () => {
    // Os critérios do Ensaio geral (decisão 21) sobre cada JSON do Brasil publicado, nas duas bases, com as constantes
    // congeladas, as que o coletor roda na noite. A referência é o resultado oficial do 2º turno de 2022 como o TSE o
    // publica, Bolsonaro com 49,10% dos válidos, e a conta é na precisão da página, em centésimos: a projeção e a margem
    // com uma casa. Os números publicados são os de Bolsonaro, o 1º candidato do arquivo de rodada.
    const FINAL_EM_CENTESIMOS = 4910;
    const erroEmCentesimos = (p: { projecao: number }) => Math.abs(10 * Math.round(10 * p.projecao) - FINAL_EM_CENTESIMOS);
    /** As gravações de um lugar com a projeção: a partir das 17h. */
    const publicadosEm = (caminho: string) =>
      r.gravacoes.filter((g) => g.caminho === caminho && "projecao" in (g.conteudo as ArquivoDoLugar)).map((g) => g.conteudo as ArquivoDoLugar);
    /** Cada projeção do Brasil publicada, em cada base, com o % de seções e a hora do TSE do arquivo. */
    const doBrasil = () =>
      publicadosEm("lugares/BR.json").flatMap((b) =>
        BASES.map((base) => ({ base, secoes: b.tse.secoes.percentual, totalizacao: b.tse.totalizacao ?? "", ...b.projecao![base]! })),
      );
    const UFS_E_EXTERIOR = cadastro.ufs.map((uf) => `lugares/${uf.sigla}.json`);

    it("o Brasil, cada UF e o Exterior trazem as duas bases, as comparações e se elas coincidem; os municípios, nada", () => {
      const comProjecao = lugares.filter((l) => r.publicado(l.caminho).projecao !== undefined).map((l) => l.caminho);
      expect(comProjecao).toEqual(["lugares/BR.json", ...UFS_E_EXTERIOR]);
      for (const caminho of comProjecao) {
        const { projecao } = r.publicado(caminho);
        expect(Object.keys(projecao!).sort()).toEqual(["coincidem", "comPesquisas", "comparacoes", "soApuracao"]);
        for (const base of BASES) {
          expect(Object.keys(projecao![base]!).sort()).toEqual(["chance", "chanceDeVirada", "curva", "margem", "projecao", "sinalDeVirada", "virada"]);
        }
      }
    });

    it("leva os números como a página os mostra: projeção, margem e curva com uma casa, chance, chance de virada e % da virada inteiros", () => {
      const publicados = ["lugares/BR.json", ...UFS_E_EXTERIOR].flatMap(publicadosEm);
      expect(publicados.length).toBeGreaterThan(1_000);
      const fora = publicados
        .flatMap((l) => BASES.map((base) => ({ lugar: l.lugar, ...l.projecao![base]! })))
        .filter(
          (p) =>
            !comUmaCasa(p.projecao) ||
            !comUmaCasa(p.margem) ||
            !p.curva.flat().every(comUmaCasa) ||
            !inteiro(p.chance) ||
            !inteiro(p.chanceDeVirada) ||
            ![p.virada?.x ?? null, p.virada?.cedo ?? null, p.virada?.tarde ?? null].every(inteiro),
        );
      expect(fora).toEqual([]);
      const pesos = r.gravacoes
        .flatMap((g) => (g.caminho === "rodada.json" ? [(g.conteudo as ArquivoDeRodada).pesoDasPesquisas] : []))
        .filter((p) => p !== null);
      expect(pesos.length).toBeGreaterThan(1_000);
      expect(pesos.filter((p) => !Number.isInteger(p))).toEqual([]);
    });

    it("erra até 0,5 p.p. depois de 5% das seções, nas duas bases", () => {
      const depois = doBrasil().filter((p) => p.secoes > 5);
      expect(depois.length).toBeGreaterThan(100);
      expect(depois.filter((p) => erroEmCentesimos(p) > 50)).toEqual([]);
    });

    it("tem o resultado dentro da margem de 95% depois de 1% das seções, nas duas bases", () => {
      expect(doBrasil().filter((p) => p.secoes > 1 && erroEmCentesimos(p) > 10 * Math.round(10 * p.margem))).toEqual([]);
    });

    it('nunca diz "sem sinal de virada" no Brasil antes da virada das 18:44, e tem o sinal da primeira seção em diante', () => {
      const antes = doBrasil().filter((p) => p.secoes > 0 && p.totalizacao < "2022-10-30 18:44:00");
      expect(antes.length).toBeGreaterThan(50);
      expect(antes.filter((p) => p.sinalDeVirada === null || p.sinalDeVirada === "sem sinal de virada")).toEqual([]);
    });

    it('narra "as pesquisas deixaram de pesar" uma vez, antes dos ~12% das seções, e o peso das pesquisas cai de 100% a 0%', () => {
      const pesquisas = r.publicado("lugares/BR.json").narracao.filter((e) => e.tipo === "pesquisas");
      expect(pesquisas).toHaveLength(1);
      // Com K de 0,25%, antes dos ~12% medidos com K de 0,5% (tickets 08 e 28).
      expect(pesquisas[0]!.ponto![0]).toBeLessThan(12);
      expect(pesquisas[0]!.texto).toMatch(
        /^As pesquisas deixaram de pesar na projeção: com \d+,\d\d% das seções totalizadas no Brasil, as duas bases coincidem\.$/,
      );
      // Antes das 17h, o peso não vai no arquivo de rodada.
      const pesos = r.gravacoes
        .flatMap((g) => (g.caminho === "rodada.json" ? [(g.conteudo as ArquivoDeRodada).pesoDasPesquisas] : []))
        .filter((p) => p !== null);
      expect([pesos[0], pesos.at(-1)]).toEqual([100, 0]);
    });
  });
});
