import { beforeAll, describe, expect, it } from "vitest";
import {
  CONTROLE_INICIAL,
  lerEstadoGuardado,
  reproduzirAProjecao,
  type ArquivoDoLugar,
  type Controle,
  type EventoDaNarracao,
  type TabelaDeProjecoes,
} from "@apurador/coletor";
import { conferirPlacar } from "../src/index.ts";
import { noColetor, noiteComQuedas, type Gravacao, type NoiteComQuedas } from "./noite-com-quedas.ts";
import { cadastro, noite, projecaoDe2022 } from "./noite-2022.ts";

// O replay com quedas (Ensaio geral, decisões 20 e 21; Operação na noite, decisões 4 e 15; Narração da noite, decisão
// 11): o coletor da noite de 2022 é derrubado em rodadas escolhidas e volta, como pelo supervisor, retomando do estado
// em disco ou, sem disco, do último objeto da noite. Ele não repete nem inventa eventos, não regrava o que não mudou, e
// rodar o modelo de novo sobre os objetos da noite dá os números publicados. As referências são a mesma noite sem queda,
// o TSE falso e a medição da narração de 2022 (.scratch/apurador-2026/research/14-narracao-noite-2t-2022.md). Como no
// ensaio geral, o relógio do coletor anda em 2026 e o do TSE falso na noite de 2022: o estado guarda horas dos dois.

/** Os lugares que o TSE falso de 2022 tem: o Brasil, as UFs, o Exterior e os municípios do cadastro. */
const LUGARES_DO_TSE = 1 + cadastro.ufs.reduce((soma, uf) => soma + 1 + uf.municipios.length, 0);
/** Os arquivos ao vivo: os lugares, as 28 tabelas de projeções e os municípios delas, o mapa.json e o arquivo de rodada. */
const ARQUIVOS_AO_VIVO = LUGARES_DO_TSE + 2 * cadastro.ufs.length + 2;

const doLugar = (id: string, eventos: EventoDaNarracao[]) => eventos.filter((e) => e.lugar === id);

/**
 * O que a retomada não pode fazer com a narração de nenhum lugar, em nenhuma gravação: perder um evento já publicado,
 * repetir um evento (um marco, o começo, o fim) ou publicar um evento com hora mais velha que um já publicado. Só a
 * virada aberta muda de texto, quando outra troca entra na janela dela.
 */
function conferirNarracao(r: NoiteComQuedas): string[] {
  const problemas: string[] = [];
  const antes = new Map<string, EventoDaNarracao[]>();
  for (const g of r.lugares()) {
    const id = g.conteudo.lugar;
    const eventos = doLugar(id, g.conteudo.narracao).sort((a, b) => a.numero! - b.numero!);
    const anteriores = antes.get(id) ?? [];
    for (const e of anteriores) {
      const agora = eventos.find((x) => x.numero === e.numero);
      if (!agora || agora.tipo !== e.tipo || agora.quando !== e.quando || (e.tipo !== "virada" && agora.texto !== e.texto))
        problemas.push(`${id}: o evento ${e.numero} (${e.tipo} ${e.quando}) mudou ou sumiu às ${new Date(g.quando).toISOString()}`);
    }
    const vistos = new Set<string>();
    eventos.forEach((e, i) => {
      if (e.numero !== i + 1) problemas.push(`${id}: o evento ${i + 1} tem o número ${e.numero}`);
      const chave = `${e.tipo} ${e.marco ?? ""}`;
      if (e.tipo !== "virada" && vistos.has(chave)) problemas.push(`${id}: ${chave} repetido`);
      vistos.add(chave);
      if (i > 0 && e.quando < eventos[i - 1]!.quando) problemas.push(`${id}: ${e.tipo} ${e.quando} depois de um evento das ${eventos[i - 1]!.quando}`);
    });
    antes.set(id, eventos);
  }
  return problemas;
}

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
    const tipos = (r: NoiteComQuedas) => doLugar("BR", r.publicado("BR")!.narracao).map((e) => (e.tipo === "marco" ? `${e.marco}%` : e.tipo));
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

  it("do objeto da noite, baixa de novo os lugares em ~10 rodadas, só regrava os que mudaram, e segura o mapa.json e as tabelas até pedir todos", () => {
    const depois = comQuedas.rodadas.slice(comQuedas.voltas[1]!.rodada).map((x) => comQuedas.daRodada(x.numero));
    const comMapa = (gravacoes: Gravacao[]) => gravacoes.some((g) => g.caminho === "mapa.json" || g.caminho.startsWith("tabelas/"));
    // Os ~6.300 arquivos de lugares e zonas, a ~600 pedidos por rodada (ticket 17: "São ~10 rodadas"): o mapa.json e as
    // tabelas voltam na 10ª, a que termina de pedir.
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
    const reproduzida = [
      ...reproduzirAProjecao(
        comQuedas.objetos.map((o) => lerEstadoGuardado(o.json)),
        projecaoDe2022,
      ),
    ];
    let conferidos = 0;
    const json = (x: unknown) => JSON.parse(JSON.stringify(x ?? null)) as unknown;
    comQuedas.objetos.forEach((objeto, i) => {
      const { projecao } = reproduzida[i]!;
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
    });
    expect(conferidos).toBeGreaterThan(1_000);
  }, 300_000);
});

describe("uma parada longa", () => {
  // O coletor parte a frio às 17:30, cai às 17:57, com o Brasil logo depois de 25%, e só volta às 19:37, do objeto da
  // noite. No meio, o Brasil passou de 50, 75, 90 e 95%, Lula passou à frente às 18:44 e Minas Gerais virou para
  // Bolsonaro às 17:58 e de volta para Lula às 19:35 (medição de 2022, seções 1 e 3).
  let r: NoiteComQuedas;
  beforeAll(async () => {
    r = await noiteComQuedas("2022-10-30 17:30:00", "2022-10-30 19:45:00", [{ em: "2022-10-30 17:57:00", de: "objeto da noite", fora: 100 * 60 }]);
  }, 600_000);

  it("parte a frio gravando cada arquivo ao vivo uma vez, e de novo só os municípios com novidade do TSE", () => {
    // A partida vai até todo lugar ter sido gravado, ao ritmo dos pedidos ao TSE.
    const vistos = new Set<string>();
    const fim = r.gravacoes.findIndex((g) => g.caminho.startsWith("lugares/") && vistos.add(g.caminho).size === LUGARES_DO_TSE);
    expect(fim).toBeGreaterThan(0);
    expect(new Set(r.gravacoes.slice(0, r.voltas[0]!.gravacao).map((g) => g.caminho)).size).toBe(ARQUIVOS_AO_VIVO);
    // Um município gravado de novo na partida é um que teve novidade do TSE nela: nenhum vai duas vezes com a mesma hora.
    const horas = new Map<string, Set<string | null>>();
    const municipios = r.gravacoes.slice(0, fim + 1).filter((g) => /^lugares\/\d+\.json$/.test(g.caminho)) as (Gravacao & { conteudo: ArquivoDoLugar })[];
    for (const g of municipios) horas.set(g.caminho, (horas.get(g.caminho) ?? new Set()).add(g.conteudo.tse.totalizacao));
    expect(municipios.length).toBe([...horas.values()].reduce((soma, h) => soma + h.size, 0));
  });

  it("na volta, narra no Brasil só o marco mais alto que ele cruzou e a virada, com o % e a hora observados", () => {
    const brasil = doLugar("BR", r.publicado("BR")!.narracao).reverse();
    expect(brasil.filter((e) => e.tipo === "marco").map((e) => e.marco)).toEqual([10, 25, 95]);
    const [marco, virada] = [brasil.find((e) => e.marco === 95)!, brasil.find((e) => e.tipo === "virada")!];
    expect(marco.quando >= "2022-10-30 19:36:00").toBe(true);
    expect(virada.quando >= "2022-10-30 19:36:00").toBe(true);
    expect(virada.texto).toMatch(/^Virada no Brasil: Lula passa à frente no placar parcial, com 9\d,\d\d% das seções totalizadas\.$/);
    expect(conferirNarracao(r)).toEqual([]);
  });

  it("uma virada que aconteceu e se desfez durante a parada não aparece: Minas Gerais", () => {
    expect(doLugar("MG", r.publicado("MG")!.narracao).filter((e) => e.tipo === "virada")).toEqual([]);
    expect(r.publicado("BR")!.narracao.filter((e) => e.lugar === "MG" && e.tipo === "virada")).toEqual([]);
  });
});

describe("uma queda no plano zero", () => {
  // O dono liga o plano zero às 17:05; o coletor cai às 17:12 e volta do objeto da noite, sem o disco; o dono religa o
  // núcleo mínimo às 17:20. Os lugares que mudaram no plano zero estavam por gravar quando ele caiu, e esperam o coletor
  // baixá-los de novo.
  const DE = "2022-10-30 16:50:00";
  let r: NoiteComQuedas;
  beforeAll(async () => {
    const planoZero = (quando: number): Controle =>
      quando >= noColetor(DE, "2022-10-30 17:05:00") && quando < noColetor(DE, "2022-10-30 17:20:00")
        ? { ...CONTROLE_INICIAL, chaves: { ...CONTROLE_INICIAL.chaves, nucleoMinimo: false } }
        : CONTROLE_INICIAL;
    r = await noiteComQuedas(DE, "2022-10-30 17:25:00", [{ em: "2022-10-30 17:12:00", de: "objeto da noite" }], { controle: planoZero });
  }, 300_000);

  it("volta sem derrubar nenhuma rodada e, religado o núcleo mínimo, publica de novo os lugares com o placar do TSE falso", () => {
    expect(r.rodadas.flatMap((x) => x.falhas)).toEqual([]);
    const depois = r.lugares().filter((g) => g.quando >= r.noColetor("2022-10-30 17:20:00"));
    expect(depois.length).toBeGreaterThan(1_000);
    expect(
      conferirPlacar(
        depois.map((g) => ({ candidatos: [22, 13], lugar: g.conteudo })),
        { noite, cadastro },
      ),
    ).toEqual([]);
    expect(conferirNarracao(r)).toEqual([]);
  }, 120_000);
});
