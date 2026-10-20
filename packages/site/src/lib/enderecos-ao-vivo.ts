import type { ArquivoDeRodada, Buscar } from "@apurador/coletor";

// Os endereços dos arquivos ao vivo (Operação na noite, decisão 14; ticket 20). A página conhece dois: o principal, no
// R2 em `ao-vivo.apurador.org`, e o do plano B, o Worker em `*.workers.dev`. Ela lê o arquivo de rodada no endereço em
// que está; se ele der erro, ou se a rodada dele tiver mais de 2 min pelo `Date` da resposta, lê o do outro e fica com a
// rodada mais nova, de onde lê também o JSON do lugar. A página fica nesse endereço nas leituras seguintes: depois do
// comando do dono, o coletor não volta ao principal, e o principal parado não custa um pedido a mais a cada 30 s. Sem
// domínio, só existe o endereço do Worker.
//
// Os dois não se leem igual. O R2 atende o preflight do CORS (pela regra do bucket), e a página manda a ETag à mão, com
// `cache: "no-store"`, para o 304 chegar ao código. Os static assets do Worker respondem 405 a todo `OPTIONS` (medido em
// 20/10/2026), então ali o pedido vai sem cabeçalho próprio, e é o cache do navegador (`no-cache`) que revalida com a
// ETag: o 304 chega como 200, com o corpo que o navegador guardou e o `Date` novo.

/** Um endereço dos arquivos ao vivo. */
export interface EnderecoAoVivo {
  /** A raiz, com a barra no fim. */
  base: string;
  /** O endereço atende o preflight do CORS, e a página pode mandar o `If-None-Match` à mão. */
  respondePreflight: boolean;
}

/** Os endereços do build, na ordem de leitura: o principal (`PUBLIC_AO_VIVO`) e o do plano B (`PUBLIC_AO_VIVO_PLANO_B`), o que houver. */
export function enderecosDoBuild(principal: string | null | undefined, planoB: string | null | undefined): EnderecoAoVivo[] {
  return [...(principal ? [{ base: principal, respondePreflight: true }] : []), ...(planoB ? [{ base: planoB, respondePreflight: false }] : [])];
}

/** O arquivo de rodada lido no endereço escolhido. */
export interface RodadaLida {
  /** A resposta do arquivo de rodada no endereço escolhido: é dela o `Date`. */
  resposta: Response;
  /** A rodada mais nova desse endereço (a desta resposta ou, num 304 ou num erro, a anterior), ou `null` se ele ainda não deu nenhuma. */
  rodada: ArquivoDeRodada | null;
  /** A página mudou de endereço nesta leitura. */
  trocou: boolean;
}

/** Os arquivos ao vivo nos endereços que a página conhece. */
export interface ArquivosAoVivo {
  /** Lê o arquivo de rodada e escolhe o endereço. Rejeita só quando nenhum endereço respondeu: o visitante está sem conexão. */
  lerRodada(): Promise<RodadaLida>;
  /** Lê um arquivo no endereço em que a página está: o corpo novo, ou `null` sem corpo novo (304 ou erro). */
  ler<T>(caminho: string): Promise<T | null>;
}

/** A rodada com mais de 2 min pelo `Date` da resposta faz a página tentar o outro endereço. */
const RODADA_VELHA = 2 * 60_000;

/** Os arquivos ao vivo de uma página. */
export function criarArquivosAoVivo(opcoes: { enderecos: EnderecoAoVivo[]; buscar: Buscar }): ArquivosAoVivo {
  const { enderecos, buscar } = opcoes;
  const etags = new Map<string, string>();
  /** A rodada mais nova que cada endereço deu, pela base. */
  const rodadas = new Map<string, ArquivoDeRodada>();
  let atual = 0;

  /** Pede um arquivo num endereço, com a ETag à mão onde dá. Rejeita se o endereço não respondeu. */
  async function pedir(endereco: EnderecoAoVivo, caminho: string): Promise<Response> {
    const url = `${endereco.base}${caminho}`;
    if (!endereco.respondePreflight) return buscar(url, { cache: "no-cache" });
    const etag = etags.get(url);
    return buscar(url, { headers: etag ? { "If-None-Match": etag } : {}, cache: "no-store" });
  }

  /** O corpo novo de uma resposta, guardando a ETag dela; `null` sem corpo novo. Rejeita se o corpo não for JSON. */
  async function corpoNovo<T>(endereco: EnderecoAoVivo, caminho: string, resposta: Response): Promise<T | null> {
    if (resposta.status !== 200) return null;
    const corpo = (await resposta.json()) as T;
    const etag = resposta.headers.get("ETag");
    if (etag && endereco.respondePreflight) etags.set(`${endereco.base}${caminho}`, etag);
    return corpo;
  }

  /** O arquivo de rodada num endereço, ou `null` se ele não respondeu. */
  async function lerRodadaEm(i: number) {
    const endereco = enderecos[i]!;
    let resposta: Response;
    try {
      resposta = await pedir(endereco, "rodada.json");
    } catch {
      return null;
    }
    let erro = resposta.status !== 200 && resposta.status !== 304;
    try {
      const nova = await corpoNovo<ArquivoDeRodada>(endereco, "rodada.json", resposta);
      if (nova) rodadas.set(endereco.base, nova);
    } catch {
      erro = true;
    }
    const rodada = rodadas.get(endereco.base) ?? null;
    const data = Date.parse(resposta.headers.get("Date") ?? "");
    // Sem o `Date` (o CORS que não o expõe), não há como saber a idade: a rodada vale.
    const velha = rodada !== null && !Number.isNaN(data) && data - Date.parse(rodada.rodada) > RODADA_VELHA;
    return { i, resposta, rodada, emDia: !erro && rodada !== null && !velha };
  }

  const hora = (lida: Awaited<ReturnType<typeof lerRodadaEm>>) => (lida?.rodada ? Date.parse(lida.rodada.rodada) : -Infinity);

  return {
    async lerRodada() {
      let escolhida = await lerRodadaEm(atual);
      if (!escolhida?.emDia && enderecos.length > 1) {
        const outra = await lerRodadaEm((atual + 1) % enderecos.length);
        if (escolhida === null || (outra !== null && hora(outra) > hora(escolhida))) escolhida = outra;
      }
      if (escolhida === null) throw new TypeError("Nenhum endereço dos arquivos ao vivo respondeu");
      const trocou = escolhida.i !== atual;
      atual = escolhida.i;
      return { resposta: escolhida.resposta, rodada: escolhida.rodada, trocou };
    },
    async ler<T>(caminho: string) {
      const endereco = enderecos[atual]!;
      return corpoNovo<T>(endereco, caminho, await pedir(endereco, caminho));
    },
  };
}
