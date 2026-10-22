import { createHash, createHmac } from "node:crypto";
import { gzipSync } from "node:zlib";
import type { Buscar } from "./coletor.ts";
import type { ContadorDeGravacoes } from "./contador.ts";
import type { Destino } from "./destino.ts";

// A gravação no R2 (Arquitetura e tecnologia, decisão 15): pela API S3, que aguenta as até 1.500 gravações de uma
// rodada; a API REST da Cloudflare para o R2 tem limite de 1.200 pedidos a cada 5 min (pesquisa de limites, seção 5).
// Cada pedido vai assinado com a AWS Signature Version 4, feita aqui com o `node:crypto`, sem biblioteca: a região do
// R2 é sempre `auto`, e o serviço, `s3`.
//
// O objeto leva os cabeçalhos com que a borda o entrega: o JSON comprimido com gzip (Volume de gravações, decisão 6),
// e `max-age=15`, que a Cache Rule de `ao-vivo.apurador.org` respeita (Arquitetura, decisão 17). A ETag é do próprio
// R2. Se a conferência da entrega (`entrega.ts`) mostrar que a borda não entrega certo um objeto com gzip, o coletor
// grava sem compressão (`--sem-gzip`).

/** O `Cache-Control` dos arquivos ao vivo: a CDN guarda cada um por 15 s. */
export const CACHE_DOS_ARQUIVOS_AO_VIVO = "public, max-age=15";

/** A chave de escrita no R2: o Access Key ID e o Secret Access Key de um token "Object Read & Write" de um bucket só. */
export interface CredenciaisDoR2 {
  chave: string;
  segredo: string;
}

const sha256 = (dados: Uint8Array | string) => createHash("sha256").update(dados).digest("hex");
const hmac = (chave: Uint8Array | string, dados: string) => createHmac("sha256", chave).update(dados).digest();

/** O caminho como a assinatura o quer: cada parte codificada, menos os caracteres sem reserva e a barra. */
const caminhoCanonico = (caminho: string) =>
  caminho
    .split("/")
    .map((parte) => encodeURIComponent(decodeURIComponent(parte)).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("/");

/**
 * Os cabeçalhos que assinam um pedido à API S3 (`authorization`, `x-amz-date` e `x-amz-content-sha256`), a juntar aos
 * cabeçalhos do pedido. Todos os cabeçalhos passados entram na assinatura, com o `host` da URL.
 */
export function assinarPedidoS3(pedido: {
  metodo: string;
  url: string;
  /** Os cabeçalhos do pedido, além dos da assinatura, com o nome em minúsculas. */
  cabecalhos: Record<string, string>;
  corpo: Uint8Array;
  credenciais: CredenciaisDoR2;
  /** `auto` no R2. */
  regiao: string;
  quando: Date;
}): Record<string, string> {
  const url = new URL(pedido.url);
  const dataHora = pedido.quando
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const dia = dataHora.slice(0, 8);
  const hashDoCorpo = sha256(pedido.corpo);
  const assinados = { ...pedido.cabecalhos, host: url.host, "x-amz-content-sha256": hashDoCorpo, "x-amz-date": dataHora };
  const nomes = Object.keys(assinados).sort();
  const consulta = [...url.searchParams]
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .sort()
    .join("&");
  const canonico = [
    pedido.metodo,
    caminhoCanonico(url.pathname),
    consulta,
    ...nomes.map((nome) => `${nome}:${assinados[nome as keyof typeof assinados].trim()}`),
    "",
    nomes.join(";"),
    hashDoCorpo,
  ].join("\n");
  const escopo = `${dia}/${pedido.regiao}/s3/aws4_request`;
  const paraAssinar = ["AWS4-HMAC-SHA256", dataHora, escopo, sha256(canonico)].join("\n");
  const chaveDeAssinatura = hmac(hmac(hmac(hmac(`AWS4${pedido.credenciais.segredo}`, dia), pedido.regiao), "s3"), "aws4_request");
  const assinatura = createHmac("sha256", chaveDeAssinatura).update(paraAssinar).digest("hex");
  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${pedido.credenciais.chave}/${escopo},SignedHeaders=${nomes.join(";")},Signature=${assinatura}`,
    "x-amz-date": dataHora,
    "x-amz-content-sha256": hashDoCorpo,
  };
}

/** Um destino no R2: um bucket, pela API S3 da conta. */
export function destinoR2(opcoes: {
  /** O ID da conta da Cloudflare, que dá o endereço da API S3. */
  conta: string;
  bucket: string;
  credenciais: CredenciaisDoR2;
  buscar: Buscar;
  contador: ContadorDeGravacoes;
  /** Grava os JSONs comprimidos com gzip. */
  comprimir: boolean;
  /** A hora real da assinatura: o R2 recusa um pedido com o relógio mais de 15 min fora. */
  agora?: () => Date;
}): Destino {
  const { conta, bucket, credenciais, buscar, contador, comprimir } = opcoes;
  const agora = opcoes.agora ?? (() => new Date());
  return {
    async gravar(caminho, bytes) {
      const url = `https://${conta}.r2.cloudflarestorage.com/${bucket}/${caminho}`;
      const corpo = new Uint8Array(comprimir ? gzipSync(bytes) : bytes);
      const cabecalhos: Record<string, string> = { "cache-control": CACHE_DOS_ARQUIVOS_AO_VIVO, "content-type": "application/json" };
      if (comprimir) cabecalhos["content-encoding"] = "gzip";
      const assinatura = assinarPedidoS3({ metodo: "PUT", url, cabecalhos, corpo, credenciais, regiao: "auto", quando: agora() });
      const resposta = await buscar(url, { method: "PUT", headers: { ...cabecalhos, ...assinatura }, body: corpo });
      if (!resposta.ok) throw new Error(`R2 respondeu ${resposta.status} em ${caminho}: ${(await resposta.text()).slice(0, 200)}`);
      await resposta.body?.cancel();
      contador.contar(bucket);
    },
  };
}
