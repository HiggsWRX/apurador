import type { ArquivoDeRodada, ArquivoDoLugar } from "./arquivos.ts";
import type { Buscar, RegistroDaRodada } from "./coletor.ts";
import type { LeituraDeFora } from "./painel-do-coletor.ts";

// O site visto de fora (Operação na noite, decisão 6; ticket 20): o painel do coletor e a sentinela leem o arquivo de
// rodada pelo endereço público, como a página lê, e medem a idade da rodada pelo `Date` da resposta, como ela mede. O
// pedido leva o `Origin` do site: o R2 só põe o CORS na resposta de um pedido com `Origin`, e a borda guarda a cópia com
// os cabeçalhos que vieram; sem ele, a cópia feita aqui chegaria ao navegador sem o CORS (passo 4 do
// `cloudflare/README.md`). O módulo não usa nada do Node: a sentinela, um Worker, lê pelo mesmo caminho.

/** A origem do site, que a página manda no `Origin`. */
export const ORIGEM_DO_SITE = "https://apurador.org";

/** O tempo máximo de uma leitura: o endereço que não responde não pode segurar o painel nem a sentinela. */
const TEMPO_DA_LEITURA = 5_000;

/** Um arquivo ao vivo lido num endereço: o corpo e o `Date` da resposta (ms), ou `null` no 404, se ainda não existe. */
async function lerArquivo<T>(buscar: Buscar, url: string): Promise<{ corpo: T; data: number | null } | null> {
  const resposta = await buscar(url, { headers: { Origin: ORIGEM_DO_SITE }, signal: AbortSignal.timeout(TEMPO_DA_LEITURA) });
  if (resposta.status === 404) {
    await resposta.body?.cancel();
    return null;
  }
  if (resposta.status !== 200) {
    await resposta.body?.cancel();
    throw new Error(`${url} respondeu ${resposta.status}`);
  }
  const data = Date.parse(resposta.headers.get("date") ?? "");
  return { corpo: (await resposta.json()) as T, data: Number.isNaN(data) ? null : data };
}

/** O arquivo de rodada de um endereço público (a raiz, com a barra no fim), com o `Date` da resposta; `null` sem arquivo. */
export async function lerRodadaPublica(buscar: Buscar, endereco: string): Promise<{ rodada: ArquivoDeRodada; data: number | null } | null> {
  const lido = await lerArquivo<ArquivoDeRodada>(buscar, `${endereco}rodada.json`);
  return lido && { rodada: lido.corpo, data: lido.data };
}

/**
 * A leitura de fora do painel do coletor, no endereço do destino ativo: o principal até o comando do plano B, e o do
 * Worker depois dele. Sem `Date` na resposta, a idade é medida pelo relógio do coletor.
 */
export function lerPelosEnderecos(opcoes: {
  /** As raízes públicas, com a barra no fim (`AMBIENTES`). Sem domínio, as duas são a do Worker. */
  enderecos: Record<RegistroDaRodada["destinoAtivo"], string>;
  buscar: Buscar;
  /** A hora em ms, pelo relógio do coletor. */
  agora: () => number;
}): (destinoAtivo: RegistroDaRodada["destinoAtivo"]) => Promise<LeituraDeFora> {
  const { enderecos, buscar, agora } = opcoes;
  return async (destinoAtivo) => {
    const endereco = enderecos[destinoAtivo];
    const lida = await lerRodadaPublica(buscar, endereco);
    const brasil = lida && (await lerArquivo<ArquivoDoLugar>(buscar, `${endereco}lugares/BR.json`));
    return { endereco, rodada: lida?.rodada ?? null, brasil: brasil?.corpo ?? null, data: lida?.data ?? agora() };
  };
}
