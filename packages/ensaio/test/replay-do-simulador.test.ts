import { beforeAll, describe, expect, it } from "vitest";
import { CONTROLE_INICIAL, type ArquivoDeRodada, type ArquivoDoLugar, type ArquivoDoSimuladorAoVivo } from "@apurador/coletor";
import { HIPOTESES_ZERADAS, prepararModelo, projetar, REGIOES, simular, type Apuracao, type Hipoteses } from "@apurador/modelo";
import { assinaturaDosLugares, idDoMunicipio } from "@apurador/pipeline";
import { projecaoDe2022 } from "./noite-2022.ts";
import { ms, replay } from "./replay.ts";

// O replay automático (`replay.ts`): o arquivo do simulador, de antes das 17h aos primeiros minutos da apuração, e na
// indicação do TSE. A ilha do simulador junta a apuração dele à base do modelo do build e roda o `modelo` no navegador
// (o teste do build do site confere que a base do build é a mesma do coletor, pela assinatura); aqui, o mesmo `modelo`
// roda sobre o arquivo publicado, e a projeção que sai dele tem de ser a que o coletor publicou no Brasil.

const { base, constantes, agregado } = projecaoDe2022;
const modelo = prepararModelo(base);
/** A apuração do arquivo, de volta às linhas do `modelo`. */
const linhas = ({ apuracao: a }: ArquivoDoSimuladorAoVivo): Apuracao =>
  a!.secoes.map((secoes, i) => ({
    secoes,
    secoesTotais: a!.secoesTotais[i]!,
    aptos: a!.aptos[i]!,
    aptosTotais: a!.aptosTotais[i]!,
    votos: [a!.votos[0][i]!, a!.votos[1][i]!],
  }));
/** Uma fatia do 1º finalista da base em % do 1º candidato do arquivo de rodada (Jair Bolsonaro), com uma casa. */
const doPrimeiroCandidato = (fatia: number) => Math.round(1000 * (base.finalistas[0]!.numero === 22 ? fatia : 1 - fatia)) / 10;
const comparecimentoEsperado = REGIOES.map(() => 0.8);
/** O sinal dos pontos para Lula: as hipóteses vão em pontos para o 1º finalista da base. */
const LULA = base.finalistas[0]!.numero === 13 ? 1 : -1;
/** Lula +2 no voto que falta do Brasil e no do Nordeste, e o comparecimento do Sul 3 pontos abaixo. */
const PARADAS: Hipoteses = {
  voto: { brasil: 2 * LULA, regioes: REGIOES.map((r) => (r === "Nordeste" ? 2 * LULA : 0)) },
  comparecimento: REGIOES.map((r) => (r === "Sul" ? -3 : 0)),
};
const ASSINATURA = assinaturaDosLugares(base.municipios.map((m) => idDoMunicipio(m.municipio)));
/** Cada gravação do arquivo do simulador num replay, com a hora do coletor. */
const doSimulador = (r: Awaited<ReturnType<typeof replay>>) =>
  r.gravacoes.filter((g) => g.caminho === "simulador.json").map((g) => ({ arquivo: g.conteudo as ArquivoDoSimuladorAoVivo, quando: g.quando }));

describe("o arquivo do simulador", () => {
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    r = await replay("2022-10-30 16:55:00", "2022-10-30 17:08:00");
  }, 120_000);
  const daFaseAoVivo = () => {
    const primeira = r.fases().find((f) => f.fase === "ao-vivo")!;
    return doSimulador(r).filter((g) => g.quando >= primeira.quando);
  };
  /** O Brasil que a página tinha quando o arquivo do simulador foi gravado: o último publicado até ali. */
  const brasilEm = (quando: number) => r.gravacoes.filter((g) => g.caminho === "lugares/BR.json" && g.quando <= quando).at(-1)!.conteudo as ArquivoDoLugar;

  it("antes das 17h, vai só com a assinatura dos municípios da base, sem a apuração nem o agregado", () => {
    const antes = doSimulador(r).filter((g) => g.quando < ms("2022-10-30 17:00:00"));
    expect(antes.length).toBeGreaterThan(0);
    expect(antes.map((g) => g.arquivo)).toEqual(antes.map(() => ({ assinatura: ASSINATURA })));
  });

  it("na fase ao vivo, leva a apuração de cada município, na ordem da base, com os números do TSE, e o agregado da noite na precisão do modelo", () => {
    const ultimo = r.publicado<ArquivoDoSimuladorAoVivo>("simulador.json");
    expect(ultimo.assinatura).toBe(ASSINATURA);
    expect(ultimo.agregado).toEqual({ valor: agregado.valor, incerteza: agregado.incerteza });
    const apuracao = linhas(ultimo);
    expect(apuracao).toHaveLength(base.municipios.length);
    const candidatos = r.rodada().candidatos.map((c) => c.numero);
    const diferentes = base.municipios.filter((m, i) => {
      const { tse } = r.publicado(`lugares/${idDoMunicipio(m.municipio)}.json`);
      const votos = base.finalistas.map((f) => tse.votos[candidatos.indexOf(f.numero)]);
      const a = apuracao[i]!;
      return a.secoes !== tse.secoes.totalizadas || a.secoesTotais !== tse.secoes.total || a.votos.join() !== votos.join();
    });
    expect(diferentes).toEqual([]);
    expect(apuracao.filter((a) => a.secoes > 0).length).toBeGreaterThan(50);
  });

  it("é gravado só quando muda: na fase ao vivo, só nas rodadas com resultado novo do TSE", () => {
    const conteudos = doSimulador(r).map((g) => JSON.stringify(g.arquivo));
    expect(conteudos.length).toBeGreaterThan(10);
    expect(conteudos.filter((c, i) => i > 0 && c === conteudos[i - 1])).toEqual([]);
    // A primeira da fase ao vivo é a que passa a levar a apuração; as outras vêm com resultado novo.
    const daRodada = (quando: number) => r.rodadas.filter((x) => Date.parse(x.inicio) <= quando).at(-1)!;
    const semNovidade = daFaseAoVivo()
      .slice(1)
      .filter((g) => {
        const { baixados } = daRodada(g.quando);
        return baixados.brasil + baixados.ufs + baixados.municipios + baixados.zonas === 0;
      });
    expect(semNovidade).toEqual([]);
    expect(r.rodadas.filter((x) => Date.parse(x.inicio) >= ms("2022-10-30 17:00:30") && x.baixados.municipios === 0).length).toBeGreaterThan(0);
  });

  it("com as hipóteses zeradas, a simulação dá a projeção do Brasil que a página tinha, nas duas bases", () => {
    const comSecoes = daFaseAoVivo().filter((g) => g.arquivo.apuracao!.secoes.some((s) => s > 0));
    expect(comSecoes.length).toBeGreaterThan(10);
    for (const { arquivo, quando } of comSecoes) {
      const apuracao = linhas(arquivo);
      const { projecao: publicada } = brasilEm(quando);
      for (const [qual, projecao] of [
        ["soApuracao", projetar(modelo, apuracao, constantes)],
        ["comPesquisas", projetar(modelo, apuracao, constantes, arquivo.agregado)],
      ] as const) {
        const simulacao = simular({ modelo, apuracao, projecao, constantes, comparecimentoEsperado }, HIPOTESES_ZERADAS);
        expect(doPrimeiroCandidato(simulacao.brasil.projecao)).toBe(publicada![qual]!.projecao);
        expect(Math.round(1000 * simulacao.brasil.margem) / 10).toBe(publicada![qual]!.margem);
      }
    }
  });

  it("com as hipóteses paradas, a simulação se atualiza a cada rodada", () => {
    const simulacoes = daFaseAoVivo()
      .filter((g) => g.arquivo.apuracao!.secoes.some((s) => s > 0))
      .map(({ arquivo }) => {
        const apuracao = linhas(arquivo);
        const projecao = projetar(modelo, apuracao, constantes, arquivo.agregado);
        const simulacao = simular({ modelo, apuracao, projecao, constantes, comparecimentoEsperado }, PARADAS);
        return { secoes: simulacao.brasil.secoes, projecao: simulacao.brasil.projecao, semHipoteses: projecao.brasil.projecao };
      });
    expect(simulacoes.length).toBeGreaterThan(10);
    // Cada rodada com o arquivo novo move a simulação, e a apuração avança; as hipóteses, paradas, seguem pesando para Lula.
    expect(simulacoes.filter((s, i) => i > 0 && s.projecao === simulacoes[i - 1]!.projecao)).toEqual([]);
    expect(simulacoes.at(-1)!.secoes).toBeGreaterThan(simulacoes[0]!.secoes);
    expect(simulacoes.filter((s) => LULA * (s.projecao - s.semHipoteses) <= 0)).toEqual([]);
  });
});

describe("a chave do simulador", () => {
  // O dono desliga só o simulador às 17:03 e o religa às 17:05, com a projeção ligada o tempo todo.
  const DUAS_RODADAS = 2 * 20_000;
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    r = await replay("2022-10-30 16:55:00", "2022-10-30 17:07:00", {
      controle: (quando) => ({
        ...CONTROLE_INICIAL,
        chaves: { ...CONTROLE_INICIAL.chaves, simulador: quando < ms("2022-10-30 17:03:00") || quando >= ms("2022-10-30 17:05:00") },
      }),
    });
  }, 120_000);

  it("desligada, o arquivo é regravado só com a assinatura em até 2 rodadas, e religada, volta com a apuração em até 2 rodadas", () => {
    const desligado = doSimulador(r).find((g) => g.quando >= ms("2022-10-30 17:03:00"))!;
    expect(desligado.quando).toBeLessThan(ms("2022-10-30 17:03:00") + DUAS_RODADAS);
    expect(Object.keys(desligado.arquivo)).toEqual(["assinatura"]);
    expect(doSimulador(r).filter((g) => g.quando > desligado.quando && g.quando < ms("2022-10-30 17:05:00"))).toEqual([]);
    const religado = doSimulador(r).find((g) => g.quando >= ms("2022-10-30 17:05:00"))!;
    expect(religado.quando).toBeLessThan(ms("2022-10-30 17:05:00") + DUAS_RODADAS);
    expect(Object.keys(religado.arquivo)).toEqual(["assinatura", "apuracao", "agregado"]);
  });
});

describe("a indicação do TSE", () => {
  // Na noite de 2022, o TSE indica Lula eleito às 19:56:23; partindo a frio às 19:50, o coletor tem os municípios em ~10
  // rodadas, antes dela.
  let r: Awaited<ReturnType<typeof replay>>;
  beforeAll(async () => {
    r = await replay("2022-10-30 19:50:00", "2022-10-30 19:59:00");
  }, 120_000);

  it("para o simulador: o arquivo é regravado só com a assinatura, e não muda mais", () => {
    const indicacao = r.gravacoes.find(
      (g) => g.caminho === "rodada.json" && (g.conteudo as ArquivoDeRodada).eventosDoBrasil.some((e) => e.tipo === "indicacao"),
    )!;
    const antes = doSimulador(r).filter((g) => g.quando < indicacao.quando);
    const depois = doSimulador(r).filter((g) => g.quando >= indicacao.quando);
    expect(antes.at(-1)!.arquivo.apuracao).toBeDefined();
    expect(depois.map((g) => g.arquivo)).toEqual([{ assinatura: ASSINATURA }]);
  });
});
