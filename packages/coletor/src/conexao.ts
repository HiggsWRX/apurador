// A conexão do computador com a internet (Operação na noite, decisões 2 e 12; Volume de gravações na noite, decisão 8).
// O bloqueio do TSE é por IP: parado no primeiro 403, o coletor só volta a pedir quando a conexão muda (o dono puxa o
// cabo, e o celular dá outro IP) ou cai e volta (o modo avião por 10 s, que dá outro IP ao celular). E, enquanto a
// conexão for o celular, o objeto da noite fica no disco.
//
// A rota padrão do Windows (`computador.ts`) diz se é o cabo ou o celular, mas não vê o modo avião: na ancoragem USB do
// Android, o adaptador fica ligado, sem internet atrás dele. Por isso a sonda lê também o IP público, a cada 3 s, no
// rastro da Cloudflare, que responde a quem pede o IP dele: duas leituras seguidas que não saem são a internet fora, e o
// IP novo, a conexão nova. Uma leitura só que falha é um soluço: contá-la como queda faria o coletor pedir de novo no
// mesmo IP, o que renova o bloqueio.

/** O rastro da Cloudflare pelo IPv4: os endereços IPv6 temporários do Windows mudam sozinhos e pareceriam outra conexão. */
export const ENDERECO_DO_IP = "https://1.1.1.1/cdn-cgi/trace";
/** A cada quanto a sonda lê o IP: um modo avião de 10 s pega duas leituras seguidas sem internet. */
export const INTERVALO_DA_SONDA = 3_000;
/** Uma leitura que demora mais que isso não saiu. */
const TEMPO_DA_LEITURA = 3_000;
/** Quantas leituras seguidas que não saem fazem a internet fora. */
const LEITURAS_DA_QUEDA = 2;

/** A conexão do computador, como a sonda a viu por último. */
export interface ConexaoDoComputador {
  /** O IP público, como a Cloudflare o vê: muda com a troca do cabo pelo celular e com o modo avião. `null` sem internet. */
  ip: string | null;
  /** A última vez que a internet voltou depois de cair, em ms do relógio do coletor, ou `null` se ela não caiu. */
  voltouEm: number | null;
  /** Por onde passa a rota padrão do Windows (`computador.ts`): o cabo ou o celular. `null` sem medida. */
  via: "cabo" | "celular" | null;
}

/** O coletor parado no bloqueio do TSE. */
export interface BloqueioDoTse {
  /** Quando veio o primeiro 403 ou 429, em ms do relógio do coletor. */
  desde: number;
  status: number;
  /** A conexão de então, que tem de mudar, ou cair e voltar, para o coletor pedir de novo; `null` sem sonda. */
  conexao: ConexaoDoComputador | null;
}

/**
 * A conexão mudou, ou caiu e voltou, desde o bloqueio: outro IP, outra rota (o cabo pelo celular, mesmo sem a leitura do
 * IP), ou a internet de volta depois dele. Sem internet agora, só a troca da rota conta: os pedidos falham sem resposta,
 * e uma falha assim não renova o bloqueio. Sem o IP de então, um IP lido não diz que mudou.
 */
export function conexaoMudou(bloqueio: BloqueioDoTse, agora: ConexaoDoComputador): boolean {
  const antes = bloqueio.conexao;
  const voltou = agora.ip !== null && agora.voltouEm !== null && agora.voltouEm > bloqueio.desde;
  const outroIp = agora.ip !== null && (antes?.ip ?? null) !== null && agora.ip !== antes!.ip;
  const outraVia = agora.via !== null && (antes?.via ?? null) !== null && agora.via !== antes!.via;
  return voltou || outroIp || outraVia;
}

/** A sonda da conexão: a última leitura, e a leitura seguinte, que o `principal.ts` pede a cada 3 s. */
export interface SondaDaConexao {
  ler(): ConexaoDoComputador;
  /** Lê o IP público. Uma leitura que não sai conta para a queda; uma resposta de erro não muda nada. */
  sondar(): Promise<void>;
}

/** A sonda, com a rede, o relógio do coletor e a rota padrão que o medidor do computador leu por último. */
export function sondaDaConexao(opcoes: {
  buscar: (url: string, init?: RequestInit) => Promise<Response>;
  agora: () => number;
  via: () => ConexaoDoComputador["via"];
}): SondaDaConexao {
  let ip: string | null = null;
  let voltouEm: number | null = null;
  /** A internet já respondeu alguma vez: só depois disso uma leitura boa depois de uma queda é a volta dela. */
  let respondeu = false;
  let seguidasSemSair = 0;
  return {
    ler: () => ({ ip, voltouEm, via: opcoes.via() }),
    async sondar() {
      let texto: string;
      try {
        const resposta = await opcoes.buscar(ENDERECO_DO_IP, { signal: AbortSignal.timeout(TEMPO_DA_LEITURA) });
        if (!resposta.ok) return void (await resposta.body?.cancel());
        texto = await resposta.text();
      } catch {
        if (++seguidasSemSair >= LEITURAS_DA_QUEDA) ip = null;
        return;
      }
      seguidasSemSair = 0;
      const lido = /^ip=(.+)$/m.exec(texto)?.[1]?.trim();
      if (!lido) return;
      if (ip === null && respondeu) voltouEm = opcoes.agora();
      ip = lido;
      respondeu = true;
    },
  };
}
