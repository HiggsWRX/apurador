import { beforeAll, describe, expect, it } from "vitest";
import {
  criarColetor,
  criarContadorDeGravacoes,
  criarPainelDoColetor,
  relogioSemEspera,
  type Alerta,
  type ArquivoDeRodada,
  type ArquivoDoLugar,
  type ContadorDeGravacoes,
  type IdDoAlerta,
  type LeituraDeFora,
  type RegistroDaRodada,
  type RelogioDoColetor,
} from "@apurador/coletor";
import { buscarNoTseFalso, criarTseFalso, relogioDoReplay } from "../src/index.ts";
import { cadastro, instante, lugaresDoSite, noite, projecaoDe2022 } from "./noite-2022.ts";

// Os alertas do painel do coletor (Operação na noite, decisão 7), provocados um a um no replay: o coletor inteiro sobre
// o TSE falso servindo o 2º turno de 2022, com o painel recebendo cada rodada como o `principal.ts` o alimenta e
// atualizado a cada 5 s do relógio do coletor, como o temporizador do `principal.ts`. O visto de fora lê o que o coletor
// gravou, como a borda o entregaria; cada teste estraga uma coisa (o TSE, a gravação, a borda, o relógio) e confere o
// alerta que ela dá, e só ele.

const BASE = "http://tse-falso.local/oficial";
/** Uma data e hora de Brasília, `AAAA-MM-DD HH:MM:SS`, em milissegundos. */
const ms = (dataHora: string) => Date.parse(`${dataHora.replace(" ", "T")}-03:00`);
const BRASIL = "/dados/br/br-c0001-e006258-u.json";
const ENDERECO = "http://ao-vivo.local/";

interface OpcoesDaNoite {
  /** Troca a resposta do TSE falso a um pedido; `undefined` deixa a dele. Recebe o pedido ao TSE falso, a fazer. */
  responder?: (url: string, quando: number, doTse: () => Promise<Response>, relogio: RelogioDoColetor) => Promise<Response | undefined>;
  /** A gravação no destino falha nesse instante do relógio do coletor (ms). */
  gravacaoFalha?: (quando: number) => boolean;
  /**
   * Quanto uma gravação demora (ms do relógio do coletor). A rodada lenta vem daqui, e não de um pedido ao TSE: a fila dos
   * pedidos não espera um pedido lento, e no replay, em que o relógio só anda nas esperas, a espera dele seria a de todos.
   */
  gravacaoDemora?: (caminho: string, quando: number) => number;
  /** Troca o que o painel lê de fora, a partir do que o coletor gravou. */
  deFora?: (lido: LeituraDeFora, quando: number) => LeituraDeFora;
  /** O relógio do TSE falso fica parado a partir daí: nenhuma novidade, e o `Date` parado. */
  tseParadoEm?: string;
  pedidosPorSegundo?: number;
  contador?: (agora: () => number) => ContadorDeGravacoes;
  /** Confere o relógio contra o `Date` do TSE, como na noite (no ensaio, o TSE falso dá a hora de 2022). */
  conferirRelogio?: boolean;
}

/** O coletor com o painel do coletor, de `de` a `ate`, com os alertas notificados e o último painel gravado. */
async function noiteComPainel(de: string, ate: string, opcoes: OpcoesDaNoite = {}) {
  const base = relogioSemEspera(ms(de));
  // Parado, só o instante da noite para: a hora real, que conta o limite de pedidos por segundo, continua.
  const doReplay = relogioDoReplay(instante(de), base.agora);
  const parado = opcoes.tseParadoEm === undefined ? Infinity : instante(opcoes.tseParadoEm);
  const tse = criarTseFalso({ noite, cadastro, relogio: { agora: () => ({ ...doReplay.agora(), instante: Math.min(doReplay.agora().instante, parado) }) } });
  const doTse = buscarNoTseFalso(tse);
  const publicados = new Map<string, unknown>();
  const notificados: { quando: number; novos: Alerta[]; resolvidos: Alerta[] }[] = [];
  let html = "";

  const painel = criarPainelDoColetor({
    agora: base.agora,
    lerDeFora: async () => {
      const lido: LeituraDeFora = {
        endereco: ENDERECO,
        rodada: (publicados.get("rodada.json") as ArquivoDeRodada | undefined) ?? null,
        brasil: (publicados.get("lugares/BR.json") as ArquivoDoLugar | undefined) ?? null,
        data: base.agora(),
      };
      return opcoes.deFora ? opcoes.deFora(lido, base.agora()) : lido;
    },
    notificar: (mudancas) => {
      if (mudancas.novos.length + mudancas.resolvidos.length > 0) notificados.push({ quando: base.agora(), ...mudancas });
    },
    gravar: async (conteudo) => {
      html = conteudo;
    },
    conferirRelogio: opcoes.conferirRelogio ?? false,
  });

  // O temporizador do painel: a cada 5 s do relógio do coletor, também no meio de uma espera longa.
  let proximaMarca = ms(de) + 5_000;
  const relogio: RelogioDoColetor = {
    agora: base.agora,
    async esperar(espera) {
      const ate = base.agora() + Math.max(0, espera);
      while (proximaMarca <= ate) {
        const marca = proximaMarca;
        proximaMarca += 5_000;
        if (base.agora() < marca) await base.esperar(marca - base.agora());
        await painel.atualizar();
      }
      if (base.agora() < ate) await base.esperar(ate - base.agora());
    },
  };

  const contador = opcoes.contador?.(base.agora);
  const coletor = criarColetor({
    base: BASE,
    eleicao: "6258",
    lugares: lugaresDoSite,
    relogio,
    buscar: async (url, init) => {
      const quando = base.agora();
      const trocada = await opcoes.responder?.(url, quando, () => doTse(url, init), relogio);
      return trocada ?? doTse(url, init);
    },
    destino: {
      // Como o R2: a falha vem no texto que o `destinoR2` dá, e só a gravação aceita conta no mês.
      async gravar(caminho, bytes) {
        const comecou = base.agora();
        const demora = opcoes.gravacaoDemora?.(caminho, comecou) ?? 0;
        if (demora > 0) await relogio.esperar(demora);
        const quando = base.agora();
        if (opcoes.gravacaoFalha?.(quando)) throw new Error(`R2 respondeu 500 em ${caminho}: InternalError`);
        publicados.set(caminho, JSON.parse(new TextDecoder().decode(bytes)));
        contador?.contar("apurador-ao-vivo");
      },
    },
    contador,
    pedidosPorSegundo: opcoes.pedidosPorSegundo,
    projecao: projecaoDe2022,
  });
  const rodadas: RegistroDaRodada[] = [];
  await coletor.rodar({
    ate: () => base.agora() >= ms(ate),
    aoRodar: (registro) => {
      rodadas.push(registro);
      painel.registrar(registro, { republicacaoDoPlanoB: null });
    },
  });
  await painel.atualizar();

  /** Cada alerta que começou, com o instante (ms do relógio do coletor) e a hora de Brasília em que o painel o notificou. */
  const comecaram = notificados.flatMap((n) => n.novos.map((a) => ({ ...a, quando: Math.round(n.quando), as: hora(n.quando) })));
  const terminaram = notificados.flatMap((n) => n.resolvidos.map((a) => ({ ...a, quando: Math.round(n.quando), as: hora(n.quando) })));
  return { rodadas, painel, comecaram, terminaram, html: () => html, texto: () => textoDoHtml(html) };
}

/** A hora de Brasília, `HH:MM:SS`, de um instante do relógio do coletor. */
const hora = (quando: number) => new Date(quando).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
/** O texto do painel, sem as marcas, com os espaços juntos. */
const textoDoHtml = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
const ids = (alertas: { id: IdDoAlerta }[]) => alertas.map((a) => a.id);
/** O fim de uma rodada pelo relógio do coletor, com o ms arredondado como o dos alertas. */
const fimDa = (r: RegistroDaRodada) => Math.round(Date.parse(r.inicio) + r.duracao);
/** A primeira marca do temporizador de 5 s do painel depois de um instante, numa noite que começa num minuto cheio. */
const marcaDepois = (quando: number) => Math.ceil(quando / 5_000) * 5_000;

/** A resposta do TSE falso com o corpo JSON trocado por `mudar`. */
async function comCorpo(resposta: Response, mudar: (corpo: Record<string, unknown>) => void): Promise<Response> {
  if (resposta.status !== 200) return resposta;
  const corpo = (await resposta.json()) as Record<string, unknown>;
  mudar(corpo);
  return new Response(JSON.stringify(corpo), { status: 200, headers: resposta.headers });
}
/** Dentro de `[de, ate)`, em horas de Brasília da noite. */
const entre = (quando: number, de: string, ate: string) => quando >= ms(de) && quando < ms(ate);
const SAO_PAULO = "/dados/sp/sp71072-c0001-e006258-u.json";

describe("uma noite sem nada errado", () => {
  let r: Awaited<ReturnType<typeof noiteComPainel>>;
  beforeAll(async () => {
    r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:20:00");
  }, 60_000);

  it("não dá nenhum alerta, da partida a frio antes das 17h até a apuração andando", () => {
    expect(r.rodadas.length).toBeGreaterThan(60);
    expect(r.comecaram).toEqual([]);
    expect(r.painel.alertasAtivos()).toEqual([]);
  });

  it("o painel tem as sete seções, nesta ordem, e se recarrega a cada 5 s", () => {
    const titulos = [...r.html().matchAll(/<h2>(.*?)<\/h2>/g)].map((m) => m[1]);

    expect(titulos).toEqual(["1. Estado", "2. Visto de fora", "3. TSE", "4. Placar conferido", "5. Projeção do Brasil", "6. Gravação", "7. Computador"]);
    expect(r.html()).toContain('<meta http-equiv="refresh" content="5">');
  });

  it("mostra a fase, as chaves, o visto de fora, o placar conferido igual e a projeção nas duas bases", () => {
    const texto = r.texto();

    expect(texto).toContain("Fase ao vivo");
    expect(texto).toContain("núcleo mínimo: ligada");
    expect(texto).toContain("textos preditivos: desligada");
    expect(texto).toMatch(/Endereço http:\/\/ao-vivo\.local\/ Arquivo de rodada 17:19:\d\d · ao vivo · atraso do visitante \d+ s/);
    // A hora do arquivo do TSE falso às 17:19:40 de 2022 (o histórico de totalização), no JSON do Brasil e na novidade.
    expect(texto).toMatch(/JSON do Brasil JAIR BOLSONARO [\d,]+% · LULA [\d,]+% · [\d,]+% das seções · totalização 2022-10-30 17:1\d:\d\d/);
    expect(texto).toContain("Brasil publicado contra o arquivo do TSE igual ao arquivo do TSE");
    expect(texto).toMatch(/Só apuração [\d,]+% ± [\d,]+ · chance \d+% · desde a rodada anterior/);
    expect(texto).toMatch(/Apuração \+ pesquisas [\d,]+% ± [\d,]+ · chance \d+%/);
    expect(texto).toContain("Desvio do relógio não conferido: o TSE falso dá a hora da noite que serve");
  });
});

describe("os alertas críticos", () => {
  it.each([403, 429])(
    "o TSE respondendo %i uma vez basta, e o alerta é um só enquanto o bloqueio dura",
    async (status) => {
      const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:08:00", {
        responder: async (_url, quando) =>
          entre(quando, "2022-10-30 17:03:00", "2022-10-30 17:04:00") ? new Response("Access Denied", { status }) : undefined,
      });

      expect(r.comecaram.map((a) => [a.id, a.nivel])).toEqual([["tse-bloqueou", "critico"]]);
      expect(r.comecaram[0]!.as).toMatch(/^17:03:/);
      expect(r.comecaram[0]!.mensagem).toContain(String(status));
    },
    60_000,
  );

  it("nenhuma rodada completa há 60 s: o temporizador o percebe no meio da rodada presa, e ele termina quando ela termina", async () => {
    let presa = false;
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:08:00", {
      // Uma gravação do arquivo de rodada que leva 80 s, como um R2 que não responde.
      gravacaoDemora: (caminho, quando) => (caminho === "rodada.json" && quando >= ms("2022-10-30 17:04:00") && !presa ? ((presa = true), 80_000) : 0),
    });
    const lenta = r.rodadas.find((x) => x.duracao > 60_000)!;
    const anterior = r.rodadas[r.rodadas.indexOf(lenta) - 1]!;

    // O crítico; a rodada de 80 s dá também o de atenção da rodada lenta, quando termina.
    expect(r.comecaram.map((a) => [a.id, a.nivel, a.quando])).toEqual([
      ["sem-rodada", "critico", marcaDepois(fimDa(anterior) + 60_001)],
      ["rodada-lenta", "atencao", fimDa(lenta)],
    ]);
    expect(r.comecaram[0]!.mensagem).toMatch(/^Coletor sem rodada completa há 6\d s$/);
    expect(r.terminaram.filter((a) => a.nivel === "critico").map((a) => [a.id, a.quando])).toEqual([["sem-rodada", fimDa(lenta)]]);
  }, 60_000);

  it("gravação no destino ativo falhando: o alerta vem na segunda rodada seguida, não na primeira", async () => {
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:08:00", {
      gravacaoFalha: (quando) => entre(quando, "2022-10-30 17:04:00", "2022-10-30 17:05:00"),
    });
    const comFalha = r.rodadas.filter((x) => x.falhas.some((f) => f.startsWith("gravar ")));

    expect(comFalha.length).toBe(3);
    expect(r.comecaram.map((a) => [a.id, a.quando])).toEqual([["gravacao-falhando", fimDa(comFalha[1]!)]]);
    expect(r.comecaram[0]!.mensagem).toBe("Gravação no destino principal falhando em 2 rodadas seguidas");
    expect(r.terminaram.map((a) => [a.id, a.quando])).toEqual([["gravacao-falhando", fimDa(r.rodadas[r.rodadas.indexOf(comFalha[2]!) + 1]!)]]);
  }, 60_000);

  it("visto de fora, o arquivo de rodada público com mais de 2 min, como a página o vê pelo Date da borda", async () => {
    let parado: LeituraDeFora | undefined;
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:10:00", {
      // Da 17:04 em diante, a borda entrega sempre a mesma cópia, com o `Date` de agora.
      deFora: (lido, quando) => (quando < ms("2022-10-30 17:04:00") ? lido : { ...(parado ??= lido), data: quando }),
    });
    const rodadaParada = Date.parse(parado!.rodada!.rodada);

    expect(r.comecaram.map((a) => [a.id, a.nivel])).toEqual([["rodada-publica-parada", "critico"]]);
    // Na primeira avaliação depois dos 2 min: a marca do temporizador ou o fim de uma rodada.
    expect(r.comecaram[0]!.quando - rodadaParada).toBeGreaterThan(120_000);
    expect(r.comecaram[0]!.quando - rodadaParada).toBeLessThanOrEqual(125_000);
    expect(r.comecaram[0]!.mensagem).toMatch(/^Arquivo de rodada público com 2 min( \d s)?$/);
    expect(r.texto()).toMatch(/atraso do visitante \d min/);
  }, 60_000);

  it("o placar do Brasil publicado diferente do arquivo do TSE, uma vez basta, e termina quando volta a bater", async () => {
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:12:00", {
      // A borda entrega um JSON do Brasil com os dois candidatos trocados.
      deFora: (lido, quando) =>
        entre(quando, "2022-10-30 17:10:00", "2022-10-30 17:10:05") && lido.brasil
          ? {
              ...lido,
              brasil: {
                ...lido.brasil,
                tse: { ...lido.brasil.tse, votos: [...lido.brasil.tse.votos].reverse(), percentuais: [...lido.brasil.tse.percentuais].reverse() },
              },
            }
          : lido,
    });

    expect(r.comecaram.map((a) => [a.id, a.nivel, a.as])).toEqual([["placar-divergente", "critico", "17:10:00"]]);
    expect(r.terminaram.map((a) => [a.id, a.as])).toEqual([["placar-divergente", "17:10:05"]]);
  }, 60_000);

  // O Brasil é pedido a cada minuto, e 3 min bastam; São Paulo só muda às 17:11. Estragado por mais de 5 min, o Brasil
  // daria também o TSE sem novidade: o coletor fica com o último arquivo bom.
  it.each([
    ["do Brasil", BRASIL, "17:06:00", "br-c0001-e006258-u.json"],
    ["de uma UF", "/dados/sp/sp-c0001-e006258-u.json", "17:15:00", "sp-c0001-e006258-u.json"],
  ])(
    "um arquivo %s que o leitor não entende",
    async (_lugar, caminho, ate, nome) => {
      const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:16:00", {
        responder: async (url, quando) =>
          url.endsWith(caminho) && entre(quando, "2022-10-30 17:03:00", `2022-10-30 ${ate}`) ? new Response("<html>Erro</html>") : undefined,
      });
      const primeira = r.rodadas.find((x) => x.ilegiveis.length > 0)!;

      expect(r.comecaram.map((a) => [a.id, a.nivel, a.quando])).toEqual([["brasil-ou-uf-ilegivel", "critico", fimDa(primeira)]]);
      expect(r.comecaram[0]!.mensagem).toBe(`Arquivo do TSE que o leitor não entende: ${nome}`);
    },
    60_000,
  );
});

describe("os alertas de atenção", () => {
  it("o TSE sem novidade há 5 min, com menos de 99% das seções", async () => {
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:18:00", { tseParadoEm: "2022-10-30 17:10:00" });
    const vista = Date.parse(r.rodadas.at(-1)!.novidade.vista!);

    expect(vista).toBeLessThan(ms("2022-10-30 17:11:00"));
    expect(r.comecaram.map((a) => [a.id, a.nivel])).toEqual([["tse-sem-novidade", "atencao"]]);
    expect(r.comecaram[0]!.quando - vista).toBeGreaterThanOrEqual(300_000);
    expect(r.comecaram[0]!.quando - vista).toBeLessThanOrEqual(305_000);
    expect(r.comecaram[0]!.mensagem).toMatch(/^TSE sem novidade há 5 min( \d s)?, com [\d,]+% das seções$/);
  }, 60_000);

  it("a projeção do Brasil mudando mais de 1 p.p. numa rodada, depois de 5% das seções", async () => {
    // Às 17:38, São Paulo, a capital, chega com todos os votos apurados num candidato só.
    const r = await noiteComPainel("2022-10-30 17:30:00", "2022-10-30 17:42:00", {
      responder: async (url, quando, doTse) =>
        url.endsWith(SAO_PAULO) && quando >= ms("2022-10-30 17:38:00")
          ? comCorpo(await doTse(), (corpo) => {
              const validos = Number((corpo.v as { vv: string }).vv);
              for (const a of (corpo.carg as { agr: { par: { cand: { n: string; vap: string; pvap: string }[] }[] }[] }[])[0]!.agr)
                for (const p of a.par) for (const c of p.cand) [c.vap, c.pvap] = c.n === "13" ? [String(validos), "100,00"] : ["0", "0,00"];
            })
          : undefined,
    });

    expect(r.comecaram.map((a) => [a.id, a.nivel])).toEqual([["projecao-saltou", "atencao"]]);
    expect(r.comecaram[0]!.mensagem).toMatch(/^Projeção do Brasil mudou numa rodada: Só apuração [\d,]+ p\.p\. e chance \d+ pontos/);
  }, 60_000);

  it("um pico acima de 50 pedidos por segundo ao TSE", async () => {
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:01:00", { pedidosPorSegundo: 60 });

    expect(r.comecaram.map((a) => [a.id, a.nivel])).toEqual([["pico-de-pedidos", "atencao"]]);
    expect(r.comecaram[0]!.mensagem).toMatch(/^Pico de 6\d pedidos por segundo ao TSE no último minuto$/);
  }, 60_000);

  it("uma rodada com mais de 15 s", async () => {
    let lenta = false;
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:06:00", {
      gravacaoDemora: (caminho, quando) => (caminho === "rodada.json" && quando >= ms("2022-10-30 17:04:00") && !lenta ? ((lenta = true), 16_000) : 0),
    });

    expect(r.comecaram.map((a) => [a.id, a.nivel])).toEqual([["rodada-lenta", "atencao"]]);
    expect(r.comecaram[0]!.mensagem).toMatch(/^Rodada de 1[67],\d s$/);
  }, 60_000);

  it.each([
    [-3_000, ["relogio-desviado"]],
    [-1_000, []],
    [3_000, ["relogio-desviado"]],
  ])(
    "o relógio do computador desviado do Date do TSE: com o TSE a %i ms, o alerta acima de 2 s",
    async (diferenca, esperados) => {
      const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:02:00", {
        conferirRelogio: true,
        responder: async (_url, _quando, doTse) => {
          const resposta = await doTse();
          const headers = new Headers(resposta.headers);
          headers.set("date", new Date(Date.parse(resposta.headers.get("date")!) + diferenca).toUTCString());
          return new Response(resposta.body, { status: resposta.status, headers });
        },
      });

      expect(ids(r.comecaram)).toEqual(esperados);
      if (esperados.length > 0)
        expect(r.comecaram[0]!.mensagem).toMatch(
          new RegExp(`^Relógio do computador [23],\\d s ${diferenca < 0 ? "adiantado" : "atrasado"} em relação ao TSE$`),
        );
    },
    60_000,
  );

  it("as gravações do mês acima de 70% do plano gratuito do R2", async () => {
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:00:00", {
      contador: (agora) => criarContadorDeGravacoes({ mes: "2022-10", buckets: { "apurador-ao-vivo": 699_000, "apurador-ensaio": 900 } }, agora),
    });

    expect(r.comecaram.map((a) => [a.id, a.nivel, a.mensagem])).toEqual([["gravacoes-do-mes", "atencao", "Gravações do mês em 70% do plano gratuito do R2"]]);
  }, 60_000);

  it("um arquivo de município que o leitor não entende, que fica com o último bom", async () => {
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:16:00", {
      responder: async (url, quando) =>
        url.endsWith(SAO_PAULO) && entre(quando, "2022-10-30 17:03:00", "2022-10-30 17:15:00") ? new Response("<html>Erro</html>") : undefined,
    });

    expect(r.comecaram.map((a) => [a.id, a.nivel, a.mensagem])).toEqual([
      ["municipio-ilegivel", "atencao", "Arquivo de município que o leitor não entende (1): fica o último bom"],
    ]);
  }, 60_000);
});
