import { beforeAll, describe, expect, it } from "vitest";
import { lerEstadoGuardado, reproduzirAProjecao, type ArquivoDoLugar, type TabelaDeProjecoes } from "@apurador/coletor";
import { conferirPlacar } from "../src/index.ts";
import { ARQUIVOS_AO_VIVO, conferirNarracao, eventosDoLugar, LUGARES_DO_TSE, noiteComQuedas, type Gravacao, type NoiteComQuedas } from "./noite-com-quedas.ts";
import { cadastro, noite, projecaoDe2022 } from "./noite-2022.ts";

// O replay com quedas (Ensaio geral, decisões 20 e 21; Operação na noite, decisões 4 e 15; Narração da noite, decisão
// 11): o coletor da noite de 2022 é derrubado em rodadas escolhidas e volta, como pelo supervisor, retomando do estado
// em disco ou, sem disco, do último objeto da noite. Ele não repete nem inventa eventos, não regrava o que não mudou, e
// rodar o modelo de novo sobre os objetos da noite dá os números publicados. As referências são a mesma noite sem queda,
// o TSE falso e a medição da narração de 2022 (.scratch/apurador-2026/research/14-narracao-noite-2t-2022.md). Como no
// ensaio geral, o relógio do coletor anda em 2026 e o do TSE falso na noite de 2022: o estado guarda horas dos dois. A
// parada longa e a queda no plano zero ficam em arquivos próprios: as três noites juntas passavam dos 2 GB de memória
// do runner do CI.

describe("o replay com quedas", () => {
  // Das 16:50 às 17:50, com ~10% das seções: o coletor cai às 17:15 e volta do disco na rodada seguinte, como pelo
  // supervisor; cai de novo às 17:30 e volta do último objeto da noite, sem o disco, como numa outra máquina.
  let semQueda: NoiteComQuedas;
  let comQuedas: NoiteComQuedas;
  beforeAll(async () => {
    semQueda = await noiteComQuedas("2022-10-30 16:50:00", "2022-10-30 17:50:00");
    comQuedas = await noiteComQuedas("2022-10-30 16:50:00", "2022-10-30 17:50:00", [
      { em: "2022-10-30 17:15:00", de: "disco" },
      { em: "2022-10-30 17:30:00", de: "objeto da noite" },
    ]);
  }, 600_000);

  it("não perde, não repete e não publica evento retroativo em nenhum lugar, e o Brasil termina com a mesma narração da noite sem queda", () => {
    expect(conferirNarracao(comQuedas)).toEqual([]);
    const tipos = (r: NoiteComQuedas) => eventosDoLugar("BR", r.publicado("BR")!.narracao).map((e) => (e.tipo === "marco" ? `${e.marco}%` : e.tipo));
    expect(tipos(comQuedas)).toEqual(tipos(semQueda));
    expect(tipos(comQuedas)).toContain("10%");
  });

  it("publica em toda gravação o placar do TSE falso, sem divergência", () => {
    const candidatos = [22, 13];
    expect(
      conferirPlacar(
        comQuedas.lugares().map((g) => ({ candidatos, lugar: g.conteudo })),
        { noite, cadastro },
      ),
    ).toEqual([]);
  }, 120_000);

  it("do disco, volta como se não tivesse caído: até a queda seguinte, as mesmas gravações, nos mesmos instantes, que a noite sem queda", () => {
    const [disco, objeto] = comQuedas.voltas;
    const depois = comQuedas.gravacoes.slice(disco!.gravacao, objeto!.gravacao);
    const [de, ate] = [depois[0]!.quando, comQuedas.noColetor("2022-10-30 17:30:00")];
    expect(depois.length).toBeGreaterThan(1_000);
    expect(depois).toEqual(semQueda.gravacoes.filter((g) => g.quando >= de && g.quando < ate));
    // A primeira rodada pede o mesmo que a da noite sem queda: nem a configuração da eleição, que veio do disco.
    const volta = comQuedas.rodadas[disco!.rodada]!;
    expect(volta.pedidos).toBe(semQueda.rodadas.find((x) => x.inicio === volta.inicio)!.pedidos);
  });

  it("do objeto da noite, baixa de novo os lugares em ~10 rodadas, só regrava os que mudaram, e segura o mapa.json, o arquivo do simulador e as tabelas até pedir todos", () => {
    const depois = comQuedas.rodadas.slice(comQuedas.voltas[1]!.rodada).map((x) => comQuedas.daRodada(x.numero));
    const comMapa = (gravacoes: Gravacao[]) =>
      gravacoes.some((g) => g.caminho === "mapa.json" || g.caminho === "simulador.json" || g.caminho.startsWith("tabelas/"));
    // Os ~6.300 arquivos de lugares e zonas, a ~600 pedidos por rodada (ticket 17: "São ~10 rodadas"): o mapa.json, o
    // arquivo do simulador e as tabelas voltam na 10ª, a que termina de pedir.
    const semMapa = depois.findIndex(comMapa);
    expect(semMapa + 1).toBe(10);
    // Nessas rodadas, ele grava menos lugares do que a noite sem queda grava no mesmo tempo, porque grava cada um uma vez.
    const lugares = (gravacoes: Gravacao[]) => gravacoes.filter((g) => g.caminho.startsWith("lugares/")).length;
    const [de, ate] = [depois[0]![0]!.quando, depois[semMapa]![0]!.quando];
    expect(lugares(depois.slice(0, semMapa).flat())).toBeLessThanOrEqual(lugares(semQueda.gravacoes.filter((g) => g.quando >= de && g.quando < ate)));
  });

  it("grava um objeto da noite por rodada, com o estado de todos os lugares e arquivos ao vivo e os arquivos do TSE que chegaram nela", () => {
    expect(comQuedas.objetos.map((o) => o.numero)).toEqual(comQuedas.rodadas.map((x) => x.numero));
    const ultimo = lerEstadoGuardado(comQuedas.objetos.at(-1)!.json);
    expect(Object.keys(ultimo.estado.hashes)).toHaveLength(ARQUIVOS_AO_VIVO);
    expect(Object.keys(ultimo.estado.narracao.lugares)).toHaveLength(LUGARES_DO_TSE);
    for (const [i, objeto] of comQuedas.objetos.entries()) {
      const { baixados } = comQuedas.rodadas[i]!;
      expect(lerEstadoGuardado(objeto.json).arquivos, `rodada ${objeto.numero}`).toHaveLength(
        baixados.brasil + baixados.ufs + baixados.municipios + baixados.zonas,
      );
    }
  });

  it("é reprodutível: o modelo de novo sobre os objetos da noite dá os números publicados do Brasil, das UFs, do Exterior e das tabelas", () => {
    // Um objeto lido e projetado de cada vez: todos juntos passavam de 1 GB a mais na memória.
    const lidos = (function* () {
      for (const o of comQuedas.objetos) yield lerEstadoGuardado(o.json);
    })();
    let conferidos = 0;
    const json = (x: unknown) => JSON.parse(JSON.stringify(x ?? null)) as unknown;
    let i = 0;
    for (const { projecao } of reproduzirAProjecao(lidos, projecaoDe2022)) {
      const objeto = comQuedas.objetos[i++]!;
      for (const g of comQuedas.daRodada(objeto.numero)) {
        if (g.caminho.startsWith("lugares/") && "projecao" in (g.conteudo as ArquivoDoLugar)) {
          const lugar = g.conteudo as ArquivoDoLugar;
          expect(json(lugar.projecao), `${lugar.lugar} na rodada ${objeto.numero}`).toEqual(json(projecao?.doLugar(lugar.lugar, true)));
          conferidos++;
        }
        if (/^tabelas\/[A-Z]{2}\.json$/.test(g.caminho) && (g.conteudo as TabelaDeProjecoes).projecao) {
          const tabela = g.conteudo as TabelaDeProjecoes;
          expect(json(tabela.projecao), `${g.caminho} na rodada ${objeto.numero}`).toEqual(json(projecao?.dosMunicipios(tabela.uf, true)));
          conferidos++;
        }
      }
    }
    expect(i).toBe(comQuedas.objetos.length);
    expect(conferidos).toBeGreaterThan(1_000);
  }, 300_000);
});
