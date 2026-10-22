import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { Buscar } from "../src/coletor.ts";
import { criarContadorDeGravacoes } from "../src/contador.ts";
import { assinarPedidoS3, destinoR2 } from "../src/r2.ts";

// A gravação no R2 vai pela API S3, assinada com a AWS Signature Version 4. A referência da assinatura são os dois
// exemplos da documentação do S3 ("Signature Calculations for the Authorization Header: Transferring Payload in a
// Single Chunk", lidos em 20/10/2026), com as credenciais de exemplo da AWS.

const EXEMPLO = { chave: "AKIAIOSFODNN7EXAMPLE", segredo: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" };
const QUANDO = new Date("2013-05-24T00:00:00Z");

describe("a assinatura S3", () => {
  it("assina o GET Object do exemplo da AWS", () => {
    const autorizacao = assinarPedidoS3({
      metodo: "GET",
      url: "https://examplebucket.s3.amazonaws.com/test.txt",
      cabecalhos: { range: "bytes=0-9" },
      corpo: new Uint8Array(),
      credenciais: EXEMPLO,
      regiao: "us-east-1",
      quando: QUANDO,
    });

    expect(autorizacao["authorization"]).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request,SignedHeaders=host;range;x-amz-content-sha256;x-amz-date,Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
    expect(autorizacao["x-amz-content-sha256"]).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(autorizacao["x-amz-date"]).toBe("20130524T000000Z");
  });

  it("assina o PUT Object do exemplo da AWS, com o `$` do nome codificado no caminho", () => {
    const autorizacao = assinarPedidoS3({
      metodo: "PUT",
      url: "https://examplebucket.s3.amazonaws.com/test$file.text",
      cabecalhos: { date: "Fri, 24 May 2013 00:00:00 GMT", "x-amz-storage-class": "REDUCED_REDUNDANCY" },
      corpo: new TextEncoder().encode("Welcome to Amazon S3."),
      credenciais: EXEMPLO,
      regiao: "us-east-1",
      quando: QUANDO,
    });

    expect(autorizacao["authorization"]).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request,SignedHeaders=date;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class,Signature=98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd",
    );
    expect(autorizacao["x-amz-content-sha256"]).toBe("44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072");
  });
});

/** O R2 de mentira: guarda cada pedido e responde o status que o teste mandar. */
function r2DeMentira(status = 200) {
  const pedidos: { url: string; metodo: string; cabecalhos: Headers; corpo: Uint8Array }[] = [];
  const buscar: Buscar = async (url, init) => {
    pedidos.push({ url, metodo: init?.method ?? "GET", cabecalhos: new Headers(init?.headers), corpo: new Uint8Array(init?.body as Uint8Array) });
    return new Response(status === 200 ? null : "<Error><Code>AccessDenied</Code></Error>", {
      status,
      headers: { etag: '"9b2cf535f27731c974343645a3985328"' },
    });
  };
  return { buscar, pedidos };
}

const CONTA = "0123456789abcdef0123456789abcdef";
const JSON_DO_BRASIL = new TextEncoder().encode('{"lugar":"BR","tse":{"secoes":{"percentual":12.34}}}');

describe("o destino R2", () => {
  const montar = (opcoes: { comprimir?: boolean; status?: number } = {}) => {
    const r2 = r2DeMentira(opcoes.status);
    const contador = criarContadorDeGravacoes(null, () => Date.parse("2026-10-25T20:00:00-03:00"));
    const destino = destinoR2({
      conta: CONTA,
      bucket: "apurador-ao-vivo",
      credenciais: { chave: "chave-de-teste", segredo: "segredo-de-teste" },
      buscar: r2.buscar,
      contador,
      comprimir: opcoes.comprimir ?? true,
      agora: () => new Date("2026-10-25T23:00:00Z"),
    });
    return { ...r2, contador, destino };
  };

  it("grava o JSON comprimido no bucket, pela API S3, com gzip, o tipo e 15 s de cache para a CDN", async () => {
    const { destino, pedidos } = montar();

    await destino.gravar("lugares/BR.json", JSON_DO_BRASIL);

    expect(pedidos).toHaveLength(1);
    const [pedido] = pedidos;
    expect(pedido!.metodo).toBe("PUT");
    expect(pedido!.url).toBe(`https://${CONTA}.r2.cloudflarestorage.com/apurador-ao-vivo/lugares/BR.json`);
    expect(Object.fromEntries(["content-type", "content-encoding", "cache-control"].map((n) => [n, pedido!.cabecalhos.get(n)]))).toEqual({
      "content-type": "application/json",
      "content-encoding": "gzip",
      "cache-control": "public, max-age=15",
    });
    expect(gunzipSync(pedido!.corpo)).toEqual(Buffer.from(JSON_DO_BRASIL));
    // A assinatura cobre os três cabeçalhos do objeto: o R2 os guarda e os devolve a quem lê.
    expect(pedido!.cabecalhos.get("authorization")).toMatch(
      /^AWS4-HMAC-SHA256 Credential=chave-de-teste\/20261025\/auto\/s3\/aws4_request,SignedHeaders=cache-control;content-encoding;content-type;host;x-amz-content-sha256;x-amz-date,Signature=[0-9a-f]{64}$/,
    );
  });

  it("sem compressão, grava os bytes como vieram e sem `Content-Encoding`", async () => {
    const { destino, pedidos } = montar({ comprimir: false });

    await destino.gravar("rodada.json", JSON_DO_BRASIL);

    expect(pedidos[0]!.corpo).toEqual(JSON_DO_BRASIL);
    expect(pedidos[0]!.cabecalhos.has("content-encoding")).toBe(false);
    expect(pedidos[0]!.cabecalhos.get("cache-control")).toBe("public, max-age=15");
  });

  it("conta cada gravação no bucket dela, e uma recusa do R2 é um erro, sem contar", async () => {
    const certo = montar();
    await certo.destino.gravar("rodada.json", JSON_DO_BRASIL);
    await certo.destino.gravar("lugares/BR.json", JSON_DO_BRASIL);
    expect(certo.contador.doMes()).toEqual({ mes: "2026-10", buckets: { "apurador-ao-vivo": 2 } });

    const recusado = montar({ status: 403 });
    await expect(recusado.destino.gravar("rodada.json", JSON_DO_BRASIL)).rejects.toThrow(
      "R2 respondeu 403 em rodada.json: <Error><Code>AccessDenied</Code></Error>",
    );
    expect(recusado.contador.doMes()).toEqual({ mes: "2026-10", buckets: {} });
  });
});
