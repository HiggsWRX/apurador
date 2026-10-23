import type { ArquivoDeRodada, Buscar } from "@apurador/coletor";

// O leitor do ensaio geral (Ensaio geral, decisões 20 e 23): lê o endereço público do ensaio como a página lê, a cada
// 30 s, com o `If-None-Match` de cada arquivo e o `Origin` do site, para a borda servir as mesmas cópias que serve aos
// visitantes. A escolha do endereço é a da página (`enderecos-ao-vivo.ts`, no site): o arquivo de rodada no endereço
// em que está e, se ele der erro ou tiver rodada de mais de 2 min pelo `Date` da resposta, o do outro, ficando com a
// mais nova e nele nas leituras seguintes. Em Node não há preflight nem cache do navegador, então o plano B também
// recebe o `If-None-Match` à mão, que é o que o cache do navegador manda por ele.
//
// Além do que a página do Brasil lê (o arquivo de rodada, o Brasil e, com o cartão na tela, o mapa.json), cada leitura
// pega as UFs e o Exterior e uma fatia dos municípios, em rodízio, para a conferência do placar passar por todos os
// lugares ao longo da noite. Cada resposta fica registrada com a hora, o status, o `CF-Cache-Status`, os bytes e o JSON:
// é disso que a conferência do ensaio tira o placar, os preditivos, o atraso, o cache e os dados por visitante.

/** Uma resposta do endereço público, como o leitor do ensaio a recebeu. */
export interface LeituraDoEnsaio {
  /** O número da leitura (uma a cada 30 s), o mesmo em todas as respostas dela, a partir de 1. */
  leitura: number;
  /** Ms do relógio do computador que lê, quando a resposta chegou. */
  quando: number;
  /** A raiz lida, com a barra no fim. */
  endereco: string;
  /** O caminho principal (o R2) ou o Worker do plano B. */
  tipo: "principal" | "plano B";
  caminho: string;
  /** 0 quando o pedido ficou sem resposta. */
  status: number;
  /** O `CF-Cache-Status` da resposta, ou `null` sem ele. */
  cache: string | null;
  /** Os bytes do corpo como vieram pela rede (o `Content-Length`, com a compressão) ou, sem ele, os do corpo lido. */
  bytes: number;
  /** O JSON, numa resposta 200. */
  conteudo?: unknown;
}

/** O leitor do endereço público do ensaio. */
export interface LeitorDoEnsaio {
  /** Faz uma leitura, como a página a cada 30 s, e devolve as respostas dela, na ordem dos pedidos. */
  ler(): Promise<LeituraDoEnsaio[]>;
}

/** A rodada com mais de 2 min pelo `Date` da resposta faz a página tentar o outro endereço. */
const RODADA_VELHA = 2 * 60_000;

/** O leitor do ensaio sobre os endereços do ambiente (`AMBIENTES.ensaio`, no coletor). */
export function criarLeitorDoEnsaio(opcoes: {
  /** As raízes, com a barra no fim. Sem domínio, só o plano B. */
  enderecos: { principal?: string; planoB?: string };
  /** A origem do site do ensaio, que a página manda no `Origin`. */
  origem: string;
  /** Os lugares lidos em toda leitura, depois do arquivo de rodada: o Brasil primeiro, as UFs e o Exterior. */
  lugares: string[];
  /** Os municípios, pelo id dos arquivos ao vivo, lidos em rodízio: todos antes de repetir algum. */
  municipios: string[];
  municipiosPorLeitura: number;
  buscar: Buscar;
  /** Ms do relógio do computador. */
  agora: () => number;
}): LeitorDoEnsaio {
  const enderecos = [
    ...(opcoes.enderecos.principal ? [{ base: opcoes.enderecos.principal, tipo: "principal" as const }] : []),
    ...(opcoes.enderecos.planoB ? [{ base: opcoes.enderecos.planoB, tipo: "plano B" as const }] : []),
  ];
  if (enderecos.length === 0) throw new Error("O leitor do ensaio precisa de pelo menos um endereço");
  const etags = new Map<string, string>();
  /** A rodada mais nova que cada endereço deu, pela base. */
  const rodadas = new Map<string, ArquivoDeRodada>();
  let atual = 0;
  let leitura = 0;
  let proximoMunicipio = 0;

  async function pedir(i: number, caminho: string): Promise<{ registro: LeituraDoEnsaio; data: number }> {
    const { base, tipo } = enderecos[i]!;
    const url = `${base}${caminho}`;
    const etag = etags.get(url);
    const registro: LeituraDoEnsaio = { leitura, quando: 0, endereco: base, tipo, caminho, status: 0, cache: null, bytes: 0 };
    let resposta: Response;
    try {
      resposta = await opcoes.buscar(url, { headers: { Origin: opcoes.origem, ...(etag ? { "If-None-Match": etag } : {}) } });
    } catch {
      return { registro: { ...registro, quando: opcoes.agora() }, data: NaN };
    }
    let corpo = new Uint8Array();
    if (resposta.status === 200) corpo = new Uint8Array(await resposta.arrayBuffer());
    else await resposta.body?.cancel();
    const tamanho = resposta.headers.get("content-length");
    registro.quando = opcoes.agora();
    registro.status = resposta.status;
    registro.cache = resposta.headers.get("cf-cache-status");
    registro.bytes = tamanho === null ? corpo.length : Number(tamanho);
    if (resposta.status === 304) registro.bytes = 0;
    if (resposta.status === 200) {
      try {
        registro.conteudo = JSON.parse(new TextDecoder().decode(corpo));
      } catch {
        // Um corpo que não é JSON fica sem conteúdo: a conferência o conta como arquivo que a página não leria.
      }
      const novaEtag = resposta.headers.get("etag");
      if (novaEtag) etags.set(url, novaEtag);
    }
    return { registro, data: Date.parse(resposta.headers.get("date") ?? "") };
  }

  /** O arquivo de rodada num endereço: a resposta e se ele está em dia (sem erro e com rodada de até 2 min). */
  async function lerRodadaEm(i: number) {
    const { registro, data } = await pedir(i, "rodada.json");
    const base = enderecos[i]!.base;
    const nova = registro.conteudo as ArquivoDeRodada | undefined;
    if (nova && typeof nova.rodada === "string") rodadas.set(base, nova);
    const rodada = rodadas.get(base) ?? null;
    const erro = registro.status !== 200 && registro.status !== 304;
    const velha = rodada !== null && !Number.isNaN(data) && data - Date.parse(rodada.rodada) > RODADA_VELHA;
    return { i, registro, respondeu: registro.status !== 0, hora: rodada ? Date.parse(rodada.rodada) : -Infinity, emDia: !erro && rodada !== null && !velha };
  }

  return {
    async ler() {
      leitura += 1;
      const lidas: LeituraDoEnsaio[] = [];
      const primeira = await lerRodadaEm(atual);
      lidas.push(primeira.registro);
      let escolhida = primeira.respondeu ? primeira : null;
      if (!primeira.emDia && enderecos.length > 1) {
        const outra = await lerRodadaEm((atual + 1) % enderecos.length);
        lidas.push(outra.registro);
        if (outra.respondeu && (escolhida === null || outra.hora > escolhida.hora)) escolhida = outra;
      }
      // Sem resposta de nenhum endereço, a página fica "sem conexão" e não lê o lugar.
      if (escolhida === null) return lidas;
      atual = escolhida.i;

      const fatia = Array.from({ length: Math.min(opcoes.municipiosPorLeitura, opcoes.municipios.length) }, (_, k) => {
        return opcoes.municipios[(proximoMunicipio + k) % opcoes.municipios.length]!;
      });
      if (opcoes.municipios.length > 0) proximoMunicipio = (proximoMunicipio + fatia.length) % opcoes.municipios.length;
      const caminhos = [...opcoes.lugares.map((l) => `lugares/${l}.json`), "mapa.json", ...fatia.map((m) => `lugares/${m}.json`)];
      for (const caminho of caminhos) lidas.push((await pedir(atual, caminho)).registro);
      return lidas;
    },
  };
}
