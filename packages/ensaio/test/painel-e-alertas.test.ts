import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CONTROLE_INICIAL,
  criarColetor,
  criarContadorDeGravacoes,
  criarPainelDoColetor,
  relogioSemEspera,
  republicacaoDoWorker,
  type Alerta,
  type ArquivoDeRodada,
  type ArquivoDoLugar,
  type ContadorDeGravacoes,
  type Controle,
  type DestinoDoPlanoB,
  type IdDoAlerta,
  type LeituraDeFora,
  type RegistroDaRodada,
  type RelogioDoColetor,
} from "@apurador/coletor";
import { buscarNoTseFalso, criarTseFalso, relogioDoReplay, resultadosDoTseFalso } from "../src/index.ts";
import { cadastro, instante, lugaresDoSite, noite, projecaoDe2022 } from "./noite-2022.ts";

// Os alertas do painel do coletor (Operação na noite, decisão 7), provocados um a um no replay: o coletor inteiro sobre
// o TSE falso servindo o 2º turno de 2022, com o painel recebendo cada rodada como o `principal.ts` o alimenta e
// atualizado a cada 5 s do relógio do coletor, como o temporizador do `principal.ts`. O visto de fora lê o que o coletor
// gravou, como a borda o entregaria; cada teste estraga uma coisa (o TSE, a internet, a gravação, a borda, o relógio) e
// confere o alerta que ela dá, e só ele.
//
// Como no ensaio geral, o relógio do coletor fica em 25/10/2026, a partir das 19h, e o TSE falso na noite de 2022: as
// horas de cada um não coincidem por acaso. As provocações são marcadas na hora da noite de 2022 ("às 17:04").

const BASE = "http://tse-falso.local/oficial";
/** Uma data e hora de Brasília, `AAAA-MM-DD HH:MM:SS`, em milissegundos. */
const ms = (dataHora: string) => Date.parse(`${dataHora.replace(" ", "T")}-03:00`);
/** Onde o relógio do coletor começa, como no ensaio geral: na noite de 2026, longe da hora da noite de 2022. */
const COLETOR_NO_INICIO = ms("2026-10-25 19:00:00");
const BRASIL = "/dados/br/br-c0001-e006258-u.json";
const SAO_PAULO = "/dados/sp/sp71072-c0001-e006258-u.json";
const ENDERECO = "http://ao-vivo.local/";

interface OpcoesDaNoite {
  /**
   * Troca a resposta do TSE falso a um pedido; `undefined` deixa a dele. Recebe a hora da noite de 2022 (ms) e o pedido
   * ao TSE falso, a fazer.
   */
  responder?: (url: string, naNoite: number, doTse: () => Promise<Response>) => Promise<Response | undefined>;
  /** A gravação no destino falha nessa hora da noite (ms). */
  gravacaoFalha?: (naNoite: number) => boolean;
  /**
   * Quanto uma gravação demora (ms do relógio do coletor). A rodada lenta vem daqui, e não de um pedido ao TSE: a fila dos
   * pedidos não espera um pedido lento, e no replay, em que o relógio só anda nas esperas, a espera dele seria a de todos.
   */
  gravacaoDemora?: (caminho: string, naNoite: number) => number;
  /** Troca o que o painel lê de fora, a partir do que o coletor gravou. */
  deFora?: (lido: LeituraDeFora, naNoite: number) => LeituraDeFora;
  /** O arquivo de controle, pela hora da noite: os comandos do dono. */
  controle?: (naNoite: number) => Controle;
  /** O destino do plano B, montado com o relógio do coletor. */
  planoB?: (agora: () => number) => DestinoDoPlanoB;
  /** O relógio do TSE falso fica parado a partir daí: nenhuma novidade, e o `Date` parado. */
  tseParadoEm?: string;
  pedidosPorSegundo?: number;
  contador?: (agora: () => number) => ContadorDeGravacoes;
  /**
   * O relógio do coletor na hora do `Date` do TSE, com o desvio do relógio conferido, como contra o TSE de verdade. Sem
   * isso, como no ensaio, os dois ficam anos longe, e o desvio não é conferido.
   */
  comoOTseDeVerdade?: boolean;
}

/** O coletor com o painel do coletor, de `de` a `ate` da noite de 2022, com os alertas notificados e o último painel gravado. */
async function noiteComPainel(de: string, ate: string, opcoes: OpcoesDaNoite = {}) {
  const inicio = opcoes.comoOTseDeVerdade ? ms(de) : COLETOR_NO_INICIO;
  const base = relogioSemEspera(inicio);
  /** A hora da noite de 2022 que o TSE falso serve agora, em ms. */
  const naNoite = () => ms(de) + (base.agora() - inicio);
  /** O instante do relógio do coletor em que o TSE falso serve uma hora da noite de 2022. */
  const doColetor = (dataHora: string) => inicio + (ms(dataHora) - ms(de));
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
      return opcoes.deFora ? opcoes.deFora(lido, naNoite()) : lido;
    },
    notificar: (mudancas) => {
      if (mudancas.novos.length + mudancas.resolvidos.length > 0) notificados.push({ quando: base.agora(), ...mudancas });
    },
    gravar: async (conteudo) => {
      html = conteudo;
    },
    conferirRelogio: opcoes.comoOTseDeVerdade ?? false,
  });

  // O temporizador do painel: a cada 5 s do relógio do coletor, também no meio de uma espera longa.
  let proximaMarca = inicio + 5_000;
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
  const planoB = opcoes.planoB?.(base.agora);
  const lerControle = opcoes.controle;
  const coletor = criarColetor({
    base: BASE,
    eleicao: "6258",
    lugares: lugaresDoSite,
    relogio,
    buscar: async (url, init) => {
      const quando = naNoite();
      const trocada = await opcoes.responder?.(url, quando, () => doTse(url, init));
      return trocada ?? doTse(url, init);
    },
    destino: {
      // Como o R2: a falha vem no texto que o `destinoR2` dá, e só a gravação aceita conta no mês.
      async gravar(caminho, bytes) {
        const comecou = naNoite();
        const demora = opcoes.gravacaoDemora?.(caminho, comecou) ?? 0;
        if (demora > 0) await relogio.esperar(demora);
        const quando = naNoite();
        if (opcoes.gravacaoFalha?.(quando)) throw new Error(`R2 respondeu 500 em ${caminho}: InternalError`);
        publicados.set(caminho, JSON.parse(new TextDecoder().decode(bytes)));
        contador?.contar("apurador-ao-vivo");
      },
    },
    planoB,
    contador,
    controle: lerControle && (async () => lerControle(naNoite())),
    pedidosPorSegundo: opcoes.pedidosPorSegundo,
    projecao: projecaoDe2022,
  });
  const rodadas: RegistroDaRodada[] = [];
  await coletor.rodar({
    ate: () => base.agora() >= doColetor(ate),
    aoRodar: (registro) => {
      rodadas.push(registro);
      painel.registrar(registro, { republicacaoDoPlanoB: planoB?.ultimaRepublicacaoBoa() ?? null });
    },
  });
  await painel.atualizar();

  /** Cada alerta que começou, com o instante (ms do relógio do coletor, arredondado) em que o painel o notificou. */
  const comecaram = notificados.flatMap((n) => n.novos.map((a) => ({ ...a, quando: Math.round(n.quando) })));
  const terminaram = notificados.flatMap((n) => n.resolvidos.map((a) => ({ ...a, quando: Math.round(n.quando) })));
  /** As rodadas que começaram em `[de, ate)` da noite de 2022. */
  const rodadasEntre = (de: string, ate: string) => rodadas.filter((x) => Date.parse(x.inicio) >= doColetor(de) && Date.parse(x.inicio) < doColetor(ate));
  return { rodadas, rodadasEntre, painel, comecaram, terminaram, doColetor, html: () => html, texto: () => textoDoHtml(html) };
}

/** O texto do painel, sem as marcas, com os espaços juntos. */
const textoDoHtml = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
const ids = (alertas: { id: IdDoAlerta }[]) => alertas.map((a) => a.id);
/** O fim de uma rodada, como o registro dela o dá, arredondado ao ms como os alertas. */
const fimDa = (r: RegistroDaRodada) => Math.round(Date.parse(r.inicio) + r.duracao);
/** A resposta do TSE falso com o corpo JSON trocado por `mudar`. */
async function comCorpo(resposta: Response, mudar: (corpo: Record<string, unknown>) => void): Promise<Response> {
  if (resposta.status !== 200) return resposta;
  const corpo = (await resposta.json()) as Record<string, unknown>;
  mudar(corpo);
  return new Response(JSON.stringify(corpo), { status: 200, headers: resposta.headers });
}
/** Dentro de `[de, ate)`, em horas de Brasília da noite de 2022. */
const entre = (naNoite: number, de: string, ate: string) => naNoite >= ms(de) && naNoite < ms(ate);
/** Um % do TSE como o TSE o escreve, com duas casas e vírgula. */
const comoOTse = (pct: number) => pct.toFixed(2).replace(".", ",");

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
    const totalizacao = /totalização (2022-10-30 \d\d:\d\d:\d\d)/.exec(texto)![1]!;
    // O Brasil que o TSE falso serve nessa totalização, a referência da conferência do ensaio.
    const tse = resultadosDoTseFalso({ noite, cadastro });
    tse.avancarAte(instante(totalizacao));
    const brasil = tse.resultado({})!;
    const pct = (numero: number) => comoOTse(brasil.candidatos.find((c) => c.numero === numero)!.percentual);

    expect(texto).toContain("Fase ao vivo");
    expect(texto).toContain("núcleo mínimo: ligada");
    expect(texto).toContain("textos preditivos: desligada");
    // A hora do arquivo de rodada é a do relógio do coletor, na noite de 2026.
    expect(texto).toMatch(/Endereço http:\/\/ao-vivo\.local\/ Arquivo de rodada 19:21:\d\d · ao vivo · atraso do visitante \d+ s/);
    expect(texto).toContain(
      `JSON do Brasil JAIR BOLSONARO ${pct(22)}% · LULA ${pct(13)}% · ${comoOTse(brasil.secoes.percentual)}% das seções · totalização ${totalizacao}`,
    );
    expect(totalizacao >= "2022-10-30 17:19:00").toBe(true);
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
        responder: async (_url, naNoite) =>
          entre(naNoite, "2022-10-30 17:03:00", "2022-10-30 17:04:00") ? new Response("Access Denied", { status }) : undefined,
      });

      expect(r.comecaram.map((a) => [a.id, a.nivel])).toEqual([["tse-bloqueou", "critico"]]);
      expect(r.comecaram[0]!.quando).toBeGreaterThanOrEqual(r.doColetor("2022-10-30 17:03:00"));
      expect(r.comecaram[0]!.quando).toBeLessThan(r.doColetor("2022-10-30 17:04:00"));
      expect(r.comecaram[0]!.mensagem).toBe(`TSE respondeu ${status} nos últimos 10 min`);
    },
    60_000,
  );

  it("nenhuma rodada completa há 60 s: o temporizador o percebe no meio da rodada presa, e ele termina quando ela termina", async () => {
    let presa = false;
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:08:00", {
      // Uma gravação do arquivo de rodada que leva 80 s, como um R2 que não responde.
      gravacaoDemora: (caminho, naNoite) => (caminho === "rodada.json" && naNoite >= ms("2022-10-30 17:04:00") && !presa ? ((presa = true), 80_000) : 0),
    });
    const lenta = r.rodadas.find((x) => x.duracao > 60_000)!;
    const anterior = r.rodadas[r.rodadas.indexOf(lenta) - 1]!;
    const semRodada = r.comecaram.find((a) => a.nivel === "critico")!;

    // O crítico, na marca do temporizador depois dos 60 s; a rodada de 80 s dá também o de atenção, quando termina.
    expect(r.comecaram.map((a) => [a.id, a.nivel])).toEqual([
      ["sem-rodada", "critico"],
      ["rodada-lenta", "atencao"],
    ]);
    expect(semRodada.quando - fimDa(anterior)).toBeGreaterThan(60_000);
    expect(semRodada.quando - fimDa(anterior)).toBeLessThanOrEqual(65_000);
    expect(semRodada.mensagem).toMatch(/^Coletor sem rodada completa há 6\d s$/);
    expect(r.terminaram.filter((a) => a.nivel === "critico").map((a) => [a.id, a.quando])).toEqual([["sem-rodada", fimDa(lenta)]]);
  }, 60_000);

  it("com a internet fora, o TSE e o R2 falhando juntos, as rodadas seguem, mas nenhuma é completa (decisão 13)", async () => {
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:08:00", {
      responder: async (_url, naNoite) => {
        if (entre(naNoite, "2022-10-30 17:04:00", "2022-10-30 17:05:10")) throw new TypeError("fetch failed");
        return undefined;
      },
      gravacaoFalha: (naNoite) => entre(naNoite, "2022-10-30 17:04:00", "2022-10-30 17:05:10"),
    });
    const semInternet = r.rodadasEntre("2022-10-30 17:04:00", "2022-10-30 17:05:10");
    const ultimaCompleta = r.rodadas[r.rodadas.indexOf(semInternet[0]!) - 1]!;
    const semRodada = r.comecaram.find((a) => a.id === "sem-rodada")!;

    expect(semInternet.map((x) => [x.pedidos > 0, x.respostas])).toEqual(semInternet.map(() => [true, {}]));
    expect(ids(r.comecaram)).toEqual(["gravacao-falhando", "sem-rodada"]);
    expect(semRodada.quando - fimDa(ultimaCompleta)).toBeGreaterThan(60_000);
    expect(semRodada.quando - fimDa(ultimaCompleta)).toBeLessThanOrEqual(65_000);
    expect(ids(r.terminaram).sort()).toEqual(["gravacao-falhando", "sem-rodada"]);
  }, 60_000);

  it("gravação no destino ativo falhando: o alerta vem na segunda rodada seguida, não na primeira", async () => {
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:08:00", {
      gravacaoFalha: (naNoite) => entre(naNoite, "2022-10-30 17:04:00", "2022-10-30 17:05:00"),
    });
    // As rodadas das 17:04:00, 17:04:20 e 17:04:40 gravam dentro da falha; a das 17:05:00, já fora.
    const comFalha = r.rodadasEntre("2022-10-30 17:04:00", "2022-10-30 17:05:00");
    const depois = r.rodadasEntre("2022-10-30 17:05:00", "2022-10-30 17:05:20");

    expect(comFalha).toHaveLength(3);
    expect(r.comecaram.map((a) => [a.id, a.quando])).toEqual([["gravacao-falhando", fimDa(comFalha[1]!)]]);
    expect(r.comecaram[0]!.mensagem).toBe("Gravação no destino principal falhando 2 vezes seguidas");
    expect(r.terminaram.map((a) => [a.id, a.quando])).toEqual([["gravacao-falhando", fimDa(depois[0]!)]]);
  }, 60_000);

  it.each([
    ["falha", ["gravacao-falhando"]],
    ["dá certo", []],
  ])(
    "no plano B, a republicação do Worker que %s a cada vez",
    async (resultado, esperados) => {
      const pasta = join(await mkdtemp(join(tmpdir(), "painel-plano-b-")), "arquivos");
      try {
        const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:05:30", {
          controle: (naNoite) => ({ ...CONTROLE_INICIAL, planoB: naNoite >= ms("2022-10-30 17:04:00") }),
          planoB: (agora) =>
            republicacaoDoWorker({
              pasta,
              agora,
              publicar: async () => {
                if (resultado === "falha") throw new Error("wrangler saiu com 1: Authentication error [code: 10000]");
              },
            }),
        });

        expect(ids(r.comecaram)).toEqual(esperados);
        if (resultado === "falha") expect(r.comecaram[0]!.mensagem).toBe("Gravação no plano B falhando 2 vezes seguidas");
        else expect(r.texto()).toMatch(/Última republicação boa do plano B 19:0[5-7]:\d\d \(há \d+ s\)/);
      } finally {
        await rm(join(pasta, ".."), { recursive: true, force: true });
      }
    },
    60_000,
  );

  it("visto de fora, o arquivo de rodada público com mais de 2 min, como a página o vê pelo Date da borda", async () => {
    let parado: LeituraDeFora | undefined;
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:10:00", {
      // Da 17:04 em diante, a borda entrega sempre a mesma cópia, com o `Date` de agora.
      deFora: (lido, naNoite) => (naNoite < ms("2022-10-30 17:04:00") ? lido : { ...(parado ??= lido), data: lido.data }),
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
      // A borda entrega, por uma leitura, um JSON do Brasil com os dois candidatos trocados.
      deFora: (lido, naNoite) =>
        entre(naNoite, "2022-10-30 17:10:00", "2022-10-30 17:10:05") && lido.brasil
          ? {
              ...lido,
              brasil: {
                ...lido.brasil,
                tse: { ...lido.brasil.tse, votos: [...lido.brasil.tse.votos].reverse(), percentuais: [...lido.brasil.tse.percentuais].reverse() },
              },
            }
          : lido,
    });

    expect(r.comecaram.map((a) => [a.id, a.nivel, a.quando])).toEqual([["placar-divergente", "critico", r.doColetor("2022-10-30 17:10:00")]]);
    expect(r.terminaram.map((a) => [a.id, a.quando])).toEqual([["placar-divergente", r.doColetor("2022-10-30 17:10:05")]]);
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
        responder: async (url, naNoite) =>
          url.endsWith(caminho) && entre(naNoite, "2022-10-30 17:03:00", `2022-10-30 ${ate}`) ? new Response("<html>Erro</html>") : undefined,
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

    expect(vista).toBeLessThan(r.doColetor("2022-10-30 17:11:00"));
    expect(r.comecaram.map((a) => [a.id, a.nivel])).toEqual([["tse-sem-novidade", "atencao"]]);
    expect(r.comecaram[0]!.quando - vista).toBeGreaterThanOrEqual(300_000);
    expect(r.comecaram[0]!.quando - vista).toBeLessThanOrEqual(305_000);
    expect(r.comecaram[0]!.mensagem).toMatch(/^TSE sem novidade há 5 min( \d s)?, com [\d,]+% das seções$/);
  }, 60_000);

  it("a projeção do Brasil mudando mais de 1 p.p. numa rodada, depois de 5% das seções", async () => {
    // Às 17:38, São Paulo, a capital, chega com todos os votos apurados num candidato só.
    const r = await noiteComPainel("2022-10-30 17:30:00", "2022-10-30 17:42:00", {
      responder: async (url, naNoite, doTse) =>
        url.endsWith(SAO_PAULO) && naNoite >= ms("2022-10-30 17:38:00")
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
      gravacaoDemora: (caminho, naNoite) => (caminho === "rodada.json" && naNoite >= ms("2022-10-30 17:04:00") && !lenta ? ((lenta = true), 16_000) : 0),
    });

    expect(r.comecaram.map((a) => [a.id, a.nivel])).toEqual([["rodada-lenta", "atencao"]]);
    expect(r.comecaram[0]!.mensagem).toMatch(/^Rodada de 1[67],\d s$/);
  }, 60_000);

  // Contra o TSE de verdade, o `Date` dele é a hora certa: o teste põe o relógio do coletor nela e desloca o `Date`.
  it.each([
    [-3_000, ["relogio-desviado"]],
    [-1_000, []],
    [3_000, ["relogio-desviado"]],
  ])(
    "o relógio do computador desviado do Date do TSE: com o TSE a %i ms, o alerta acima de 2 s",
    async (diferenca, esperados) => {
      const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:02:00", {
        comoOTseDeVerdade: true,
        responder: async (_url, _naNoite, doTse) => {
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
      contador: (agora) => criarContadorDeGravacoes({ mes: "2026-10", buckets: { "apurador-ao-vivo": 699_000, "apurador-ensaio": 900 } }, agora),
    });

    expect(r.comecaram.map((a) => [a.id, a.nivel, a.mensagem])).toEqual([["gravacoes-do-mes", "atencao", "Gravações do mês em 70% do plano gratuito do R2"]]);
  }, 60_000);

  it("um arquivo de município que o leitor não entende, que fica com o último bom", async () => {
    const r = await noiteComPainel("2022-10-30 16:58:00", "2022-10-30 17:16:00", {
      responder: async (url, naNoite) =>
        url.endsWith(SAO_PAULO) && entre(naNoite, "2022-10-30 17:03:00", "2022-10-30 17:15:00") ? new Response("<html>Erro</html>") : undefined,
    });

    expect(r.comecaram.map((a) => [a.id, a.nivel, a.mensagem])).toEqual([
      ["municipio-ilegivel", "atencao", "Arquivo de município que o leitor não entende (1): fica o último bom"],
    ]);
  }, 60_000);
});
