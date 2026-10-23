import { gzipSync } from "node:zlib";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CONTROLE_INICIAL,
  criarColetor,
  lerEstadoGuardado,
  relogioSemEspera,
  reproduzirAProjecao,
  type ArquivoDoLugar,
  type Controle,
  type EventoDaNarracao,
  type OpcoesDoColetor,
  type RegistroDaRodada,
  type TabelaDeProjecoes,
} from "@apurador/coletor";
import { buscarNoTseFalso, conferirPlacar, criarTseFalso, relogioDoReplay } from "../src/index.ts";
import { cadastro, instante, lugaresDoSite, noite, projecaoDe2022 } from "./noite-2022.ts";

// O replay com quedas (Ensaio geral, decisões 20 e 21; Operação na noite, decisões 4 e 15; Narração da noite, decisão
// 11): o coletor da noite de 2022 é derrubado em rodadas escolhidas e volta, como pelo supervisor, retomando do estado
// em disco ou, sem disco, do último objeto da noite. Ele não repete nem inventa eventos, não regrava o que não mudou, e
// rodar o modelo de novo sobre os objetos da noite dá os números publicados. As referências são a mesma noite sem queda,
// o TSE falso e a medição da narração de 2022 (.scratch/apurador-2026/research/14-narracao-noite-2t-2022.md).

const BASE = "http://tse-falso.local/oficial";
/** Uma data e hora de Brasília, `AAAA-MM-DD HH:MM:SS`, em milissegundos. */
const ms = (dataHora: string) => Date.parse(`${dataHora.replace(" ", "T")}-03:00`);

interface Gravacao {
  caminho: string;
  conteudo: unknown;
  /** O relógio do coletor, em ms. */
  quando: number;
}

/** Uma queda: o coletor cai depois da última rodada antes de `em` e volta `fora` segundos depois da seguinte. */
interface Queda {
  em: string;
  de: "disco" | "objeto da noite";
  fora?: number;
}

/** A noite de `de` a `ate`, com as quedas e, se dado, o arquivo de controle pelo relógio do coletor (ms). */
async function noiteComQuedas(de: string, ate: string, quedas: Queda[] = [], controle?: (quando: number) => Controle) {
  const relogio = relogioSemEspera(ms(de));
  const tse = criarTseFalso({ noite, cadastro, relogio: relogioDoReplay(instante(de), relogio.agora) });
  const buscar = buscarNoTseFalso(tse);
  const gravacoes: Gravacao[] = [];
  /** O objeto da noite de cada rodada, com quantas gravações tinham sido feitas até ele. */
  const objetos: { json: string; numero: number; gravacoes: number }[] = [];
  let disco: string | undefined;
  const rodadas: RegistroDaRodada[] = [];
  /** Onde cada retomada começa: a primeira gravação e a primeira rodada depois da volta. */
  const voltas: { gravacao: number; rodada: number }[] = [];
  let retomada: OpcoesDoColetor["retomada"];
  for (const [i, ateAQueda] of [...quedas.map((q) => q.em), ate].entries()) {
    const coletor = criarColetor({
      base: BASE,
      eleicao: "6258",
      lugares: lugaresDoSite,
      relogio,
      buscar,
      projecao: projecaoDe2022,
      destino: {
        async gravar(caminho, bytes) {
          gravacoes.push({ caminho, conteudo: JSON.parse(new TextDecoder().decode(bytes)), quando: relogio.agora() });
        },
      },
      retomada,
      ...(controle && { controle: async () => controle(relogio.agora()) }),
      guardar: {
        async objetoDaNoite(json, { numero }) {
          objetos.push({ json, numero, gravacoes: gravacoes.length });
        },
        async disco(json) {
          disco = json;
        },
      },
    });
    await coletor.rodar({ ate: () => relogio.agora() >= ms(ateAQueda), aoRodar: (r) => rodadas.push(r) });
    const queda = quedas[i];
    if (!queda) break;
    await relogio.esperar((queda.fora ?? 0) * 1000);
    retomada = { partida: queda.de, guardado: lerEstadoGuardado(queda.de === "disco" ? disco! : objetos.at(-1)!.json) };
    voltas.push({ gravacao: gravacoes.length, rodada: rodadas.length });
  }
  const lugares = (de = 0, ate = gravacoes.length) =>
    gravacoes.slice(de, ate).filter((g) => g.caminho.startsWith("lugares/")) as (Gravacao & { conteudo: ArquivoDoLugar })[];
  /** O último JSON publicado de um lugar até a gravação `ate`. */
  const publicado = (id: string, ate = gravacoes.length) => lugares(0, ate).findLast((g) => g.caminho === `lugares/${id}.json`)?.conteudo;
  return { tse, gravacoes, objetos, rodadas, voltas, lugares, publicado };
}

type Noite = Awaited<ReturnType<typeof noiteComQuedas>>;
const doLugar = (id: string, eventos: EventoDaNarracao[]) => eventos.filter((e) => e.lugar === id);

/**
 * O que a retomada não pode fazer com a narração de nenhum lugar, em nenhuma gravação: perder um evento já publicado,
 * repetir um evento (um marco, o começo, o fim) ou publicar um evento com hora mais velha que um já publicado. Só a
 * virada aberta muda de texto, quando outra troca entra na janela dela.
 */
function conferirNarracao(r: Noite): string[] {
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
  let semQueda: Noite;
  let comQuedas: Noite;
  beforeAll(async () => {
    semQueda = await noiteComQuedas("2022-10-30 16:50:00", "2022-10-30 17:50:00");
    comQuedas = await noiteComQuedas("2022-10-30 16:50:00", "2022-10-30 17:50:00", [
      { em: "2022-10-30 17:15:00", de: "disco" },
      { em: "2022-10-30 17:30:00", de: "objeto da noite" },
    ]);
  }, 600_000);

  it("não perde, não repete e não publica evento retroativo em nenhum lugar, e o Brasil termina com a mesma narração da noite sem queda", () => {
    expect(conferirNarracao(comQuedas)).toEqual([]);
    const tipos = (r: Noite) => doLugar("BR", r.publicado("BR")!.narracao).map((e) => (e.tipo === "marco" ? `${e.marco}%` : e.tipo));
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

  it("do disco, volta com tudo: a primeira rodada só pede ao TSE e grava o que mudou, como a noite sem queda", () => {
    const { rodada } = comQuedas.voltas[0]!;
    const volta = comQuedas.rodadas[rodada]!;
    const mesma = semQueda.rodadas.find((x) => x.inicio === volta.inicio)!;
    const baixados = (x: RegistroDaRodada) => x.baixados.brasil + x.baixados.ufs + x.baixados.municipios + x.baixados.zonas;
    expect(volta.numero).toBe(mesma.numero);
    // A configuração da eleição, que todo coletor lê ao partir, empurra os pedidos da rodada em ~44 ms: o TSE falso pode
    // ter um município a mais nesse tempo.
    expect(Math.abs(baixados(volta) - baixados(mesma)), `${baixados(volta)} e ${baixados(mesma)} baixados`).toBeLessThanOrEqual(3);
    expect(Math.abs(volta.gravacoes - mesma.gravacoes), `${volta.gravacoes} e ${mesma.gravacoes} gravações`).toBeLessThanOrEqual(5);
  });

  it("do objeto da noite, baixa de novo os lugares em poucos minutos, regravando só o que mudou, e segura o mapa.json e as tabelas até ter todos", () => {
    const { rodada, gravacao } = comQuedas.voltas[1]!;
    const depois = comQuedas.rodadas.slice(rodada);
    const ate = depois.findIndex((x) => x.baixados.municipios < 100);
    // ~5.700 lugares e zonas a ~630 pedidos por rodada.
    expect(ate).toBeGreaterThan(5);
    expect(ate).toBeLessThan(15);
    const gravadas = comQuedas.gravacoes.slice(gravacao, comQuedas.objetos.find((o) => o.numero === depois[ate]!.numero)!.gravacoes);
    expect(gravadas.length).toBeLessThan(1_500);
    const lugaresDaVolta = gravadas.filter((g) => g.caminho.startsWith("lugares/")).length;
    console.log(`Retomada do objeto da noite: ${ate} rodadas para baixar tudo de novo, ${gravadas.length} gravações (${lugaresDaVolta} de lugares).`);
    // Até a última rodada da nova baixa, nem o mapa.json nem as tabelas.
    const primeiraDoMapa = comQuedas.gravacoes.findIndex((g, i) => i >= gravacao && (g.caminho === "mapa.json" || g.caminho.startsWith("tabelas/")));
    expect(primeiraDoMapa).toBeGreaterThan(gravacao + gravadas.length - 200);
  });

  it("grava um objeto da noite por rodada, comprimido, com o estado e os arquivos do TSE que chegaram nela", () => {
    expect(comQuedas.objetos.map((o) => o.numero)).toEqual(comQuedas.rodadas.map((x) => x.numero));
    const tamanhos = comQuedas.objetos.map((o) => gzipSync(o.json).length);
    const ultimo = lerEstadoGuardado(comQuedas.objetos.at(-1)!.json);
    expect(Object.keys(ultimo.estado.hashes).length).toBeGreaterThan(5_800);
    const media = tamanhos.reduce((a, b) => a + b, 0) / tamanhos.length;
    console.log(`Objeto da noite: ${Math.round(media / 1024)} KB em média, ${Math.round(Math.max(...tamanhos) / 1024)} KB no maior, comprimidos.`);
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
      for (const g of comQuedas.gravacoes.slice(i === 0 ? 0 : comQuedas.objetos[i - 1]!.gravacoes, objeto.gravacoes)) {
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
  let r: Noite;
  beforeAll(async () => {
    r = await noiteComQuedas("2022-10-30 17:30:00", "2022-10-30 19:45:00", [{ em: "2022-10-30 17:57:00", de: "objeto da noite", fora: 100 * 60 }]);
  }, 600_000);

  it("parte a frio gravando cada arquivo ao vivo uma vez, ~5.900 gravações", () => {
    // Os lugares que o TSE falso de 2022 tem: o Brasil, as UFs, o Exterior e os municípios do cadastro.
    const doTse = 1 + cadastro.ufs.reduce((soma, uf) => soma + 1 + uf.municipios.length, 0);
    // A partida vai até todo lugar ter sido gravado (~10 rodadas, ao ritmo dos pedidos ao TSE).
    const vistos = new Set<string>();
    const fim = r.gravacoes.findIndex((g) => g.caminho.startsWith("lugares/") && vistos.add(g.caminho).size === doTse);
    expect(fim).toBeGreaterThan(0);
    // Até a queda, cada arquivo ao vivo: os lugares, as 28 tabelas de projeções e os municípios delas, o mapa.json e o
    // arquivo de rodada.
    const arquivos = new Set(r.gravacoes.slice(0, r.voltas[0]!.gravacao).map((g) => g.caminho));
    expect(arquivos.size).toBe(doTse + 2 * 28 + 2);
    expect(fim + 1, "gravações da partida a frio").toBeGreaterThan(5_800);
    expect(fim + 1, "gravações da partida a frio").toBeLessThan(6_200);
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
  let r: Noite;
  beforeAll(async () => {
    const planoZero = (quando: number): Controle =>
      quando >= ms("2022-10-30 17:05:00") && quando < ms("2022-10-30 17:20:00")
        ? { ...CONTROLE_INICIAL, chaves: { ...CONTROLE_INICIAL.chaves, nucleoMinimo: false } }
        : CONTROLE_INICIAL;
    r = await noiteComQuedas("2022-10-30 16:50:00", "2022-10-30 17:25:00", [{ em: "2022-10-30 17:12:00", de: "objeto da noite" }], planoZero);
  }, 300_000);

  it("volta sem derrubar nenhuma rodada e, religado o núcleo mínimo, publica de novo os lugares com o placar do TSE falso", () => {
    expect(r.rodadas.flatMap((x) => x.falhas)).toEqual([]);
    const depois = r.lugares().filter((g) => g.quando >= ms("2022-10-30 17:20:00"));
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
