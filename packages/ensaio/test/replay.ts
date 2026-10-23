import {
  criarColetor,
  relogioSemEspera,
  type ArquivoDeRodada,
  type ArquivoDoLugar,
  type Buscar,
  type ContadorDeGravacoes,
  type Controle,
  type Destino,
  type RegistroDaRodada,
} from "@apurador/coletor";
import { idDoMunicipio } from "@apurador/pipeline";
import { type AbrangenciaDaDivulgacao } from "@apurador/tse";
import { buscarNoTseFalso, criarTseFalso, relogioDoReplay, type TseFalso } from "../src/index.ts";
import { cadastro, instante, lugaresDoSite, noite, projecaoDe2022 } from "./noite-2022.ts";

// O replay automático: o coletor inteiro, rodada a rodada, sobre o TSE falso servindo o 2º turno de 2022, sem
// rede e na velocidade máxima (o relógio do coletor não espera, e o do TSE falso anda com ele). As referências
// são o histórico oficial de totalização de 2022 e o próprio TSE falso, que o coletor tem de copiar sem alteração.
// Os testes ficam nos `replay-*.test.ts`, um arquivo por trecho da noite, para o vitest rodá-los em paralelo: cada
// trecho reproduz a sua parte da noite, e juntos num arquivo só eles somavam ~6 min.

const BASE = "http://tse-falso.local/oficial";
/** Uma data e hora de Brasília, `AAAA-MM-DD HH:MM:SS`, em milissegundos. */
export const ms = (dataHora: string) => Date.parse(`${dataHora.replace(" ", "T")}-03:00`);
export const BRASIL = "/dados/br/br-c0001-e006258-u.json";

interface Gravacao {
  caminho: string;
  conteudo: unknown;
  bytes: Uint8Array;
  /** O relógio do coletor, em ms. */
  quando: number;
}

interface OpcoesDoReplay {
  /** O corpo que alguns pedidos recebem com status 200, no lugar do arquivo do TSE (`undefined`: o do TSE). */
  trocar?: (url: string, quando: number) => string | undefined;
  /** Põe na frente do TSE falso uma borda que guarda cada arquivo esse tanto de segundos, como o CDN do TSE. */
  borda?: number;
  /** O arquivo de controle que o coletor lê no começo de cada rodada, pelo relógio dele (ms): os comandos do dono em rodadas escolhidas. */
  controle?: (quando: number) => Controle;
  /**
   * Os destinos de verdade no lugar do que só registra as gravações (o ticket 20), montados com o relógio do coletor:
   * o principal, o do plano B e o contador de gravações.
   */
  destinos?: (agora: () => number) => { destino?: Destino; planoB?: Destino; contador?: ContadorDeGravacoes };
}

/**
 * A borda do CDN do TSE, que o TSE falso não imita: guarda cada arquivo `segundos` desde que o buscou e, até lá,
 * responde com a cópia que tem (304 se a ETag pedida for a dela), com o `Date` de agora.
 */
function comBorda(buscar: Buscar, segundos: number, agora: () => number): Buscar {
  const guardados = new Map<string, { corpo: ArrayBuffer; etag: string; ate: number }>();
  return async (url, init) => {
    let guardado = guardados.get(url);
    if (!guardado || agora() >= guardado.ate) {
      const resposta = await buscar(url);
      if (resposta.status !== 200) return resposta;
      guardado = { corpo: await resposta.arrayBuffer(), etag: resposta.headers.get("etag")!, ate: agora() + segundos * 1000 };
      guardados.set(url, guardado);
    }
    const cabecalhos = { etag: guardado.etag, date: new Date(agora()).toUTCString() };
    if (new Headers(init?.headers).get("if-none-match") === guardado.etag) return new Response(null, { status: 304, headers: cabecalhos });
    return new Response(guardado.corpo, { status: 200, headers: cabecalhos });
  };
}

export async function replay(de: string, ate: string | ((tse: TseFalso) => boolean), opcoes: OpcoesDoReplay = {}) {
  const relogio = relogioSemEspera(ms(de));
  const tse = criarTseFalso({ noite, cadastro, relogio: relogioDoReplay(instante(de), relogio.agora) });
  const doTse = opcoes.borda === undefined ? buscarNoTseFalso(tse) : comBorda(buscarNoTseFalso(tse), opcoes.borda, relogio.agora);
  const pedidos: { url: string; quando: number }[] = [];
  const gravacoes: Gravacao[] = [];
  const arquivos = new Map<string, Gravacao>();
  const lerControle = opcoes.controle;
  const destinos = opcoes.destinos?.(relogio.agora) ?? {};
  const coletor = criarColetor({
    base: BASE,
    eleicao: "6258",
    lugares: lugaresDoSite,
    relogio,
    controle: lerControle && (async () => lerControle(relogio.agora())),
    buscar: async (url, init) => {
      const quando = relogio.agora();
      pedidos.push({ url, quando });
      const trocado = opcoes.trocar?.(url, quando);
      return trocado === undefined ? doTse(url, init) : new Response(trocado, { status: 200 });
    },
    destino: destinos.destino ?? {
      async gravar(caminho, bytes) {
        const g = { caminho, bytes, conteudo: JSON.parse(new TextDecoder().decode(bytes)), quando: relogio.agora() };
        gravacoes.push(g);
        arquivos.set(caminho, g);
      },
    },
    planoB: destinos.planoB,
    contador: destinos.contador,
    projecao: projecaoDe2022,
  });
  const rodadas: RegistroDaRodada[] = [];
  const terminou = typeof ate === "string" ? () => relogio.agora() >= ms(ate) : () => ate(tse);
  await coletor.rodar({ ate: terminou, aoRodar: (r) => rodadas.push(r) });
  const publicado = <T = ArquivoDoLugar>(caminho: string) => arquivos.get(caminho)?.conteudo as T;
  const rodada = () => publicado<ArquivoDeRodada>("rodada.json");
  /** Cada gravação de um arquivo de lugar, para a conferência do placar. */
  const placares = () => {
    const candidatos = rodada().candidatos.map((c) => c.numero);
    return gravacoes.filter((g) => g.caminho.startsWith("lugares/")).map((g) => ({ candidatos, lugar: g.conteudo as ArquivoDoLugar }));
  };
  /** A fase de cada gravação do arquivo de rodada. */
  const fases = () => gravacoes.filter((g) => g.caminho === "rodada.json").map((g) => ({ fase: (g.conteudo as ArquivoDeRodada).fase, quando: g.quando }));
  return { tse, coletor, pedidos, gravacoes, rodadas, publicado, rodada, placares, fases };
}

/** Os lugares da noite, com o caminho do arquivo publicado de cada um. */
export const lugares: { caminho: string; abrangencia: AbrangenciaDaDivulgacao }[] = [
  { caminho: "lugares/BR.json", abrangencia: {} },
  ...cadastro.ufs.flatMap((uf) => [
    { caminho: `lugares/${uf.sigla}.json`, abrangencia: { uf: uf.sigla } },
    ...uf.municipios.map((m) => ({ caminho: `lugares/${idDoMunicipio(m.codigo)}.json`, abrangencia: { uf: uf.sigla, municipio: m.codigo } })),
  ]),
];

/** O caminho da tabela de projeções de cada UF e do Exterior, e o dos municípios dela. */
export const TABELAS = cadastro.ufs.map((uf) => `tabelas/${uf.sigla}.json`);
export const MUNICIPIOS_DAS_TABELAS = cadastro.ufs.map((uf) => `tabelas/${uf.sigla}-municipios.json`);
/** Os lugares do site na ordem do `mapa.json`: a de `dados/lugares.json`, sem o Brasil. */
export const DO_MAPA = lugaresDoSite.filter((l) => l.tipo !== "brasil");
export const BASES = ["soApuracao", "comPesquisas"] as const;
export const comUmaCasa = (n: number) => Math.abs(10 * n - Math.round(10 * n)) < 1e-9;
export const inteiro = (n: number | null) => n === null || Number.isInteger(n);

/** As zonas dos municípios com mais de uma. */
export const zonas: Required<AbrangenciaDaDivulgacao>[] = (() => {
  const doMunicipio = new Map<string, number[]>();
  for (const z of noite.zonas) doMunicipio.set(`${z.uf}/${z.municipio}`, [...(doMunicipio.get(`${z.uf}/${z.municipio}`) ?? []), z.zona]);
  return [...doMunicipio]
    .filter(([, zs]) => zs.length > 1)
    .flatMap(([k, zs]) => zs.map((zona) => ({ uf: k.split("/")[0]!, municipio: Number(k.split("/")[1]), zona })));
})();
