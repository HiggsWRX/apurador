import { crc32, inflateRawSync } from "node:zlib";

// Os zips do TSE têm centenas de MB, e o pipeline quer um membro só (o CSV de Presidente, a foto de um candidato): aqui
// ele vem por pedidos HTTP Range, sem baixar o zip, e é conferido pelo CRC do diretório. O TSE regera os zips sem hora
// certa (o de votação de 2022 em 24/10/2026 às 06:52 e 07:24 UTC, pelo `Last-Modified`), e o CI agendado roda nessa
// faixa, com o atraso do GitHub: em 23/10, o `conferir` caiu com um membro que não descomprimia. Os pedidos depois da
// cauda levam `If-Range` com a ETag dela, e uma leitura que não serve (o zip mudou, ou o membro chegou corrompido) é
// refeita do começo.

/** A função de rede, injetável para os testes rodarem sem rede. Tem a forma do `fetch`. */
export type Buscar = (url: string, init?: RequestInit) => Promise<Response>;

/** Um membro baixado de um zip remoto: o nome e os bytes. */
export interface MembroRemoto {
  nome: string;
  dados: Uint8Array;
}

interface EntradaDoDiretorio {
  nome: string;
  metodo: number;
  crc: number;
  tamanhoComprimido: number;
  tamanhoOriginal: number;
  inicioDoCabecalho: number;
}

// O fim do zip tem o registro final (22 bytes) mais um comentário de até 64 KB.
const CAUDA = 22 + 0xffff;
// Depois de tantas leituras que não servem, o TSE ainda está regerando o zip, ou ele está mesmo corrompido.
const MAXIMO_DE_LEITURAS = 3;

/** Uma leitura que não serve, mas que outra pode consertar: o zip mudou entre os pedidos, ou o membro chegou corrompido. */
class LeituraInvalida extends Error {
  constructor(url: string, motivo: string) {
    super(`${url}: ${motivo}`);
  }
}

/**
 * Baixa um único membro de um zip remoto só com pedidos HTTP Range: a cauda (onde está o diretório),
 * o diretório, se não vier junto, e o próprio membro. Os zips do TSE têm centenas de MB, e o membro
 * de Presidente (`*_BR.csv`) tem poucos MB.
 */
export async function lerMembroRemoto(opcoes: { url: string; membro: (nome: string) => boolean; buscar?: Buscar }): Promise<MembroRemoto> {
  for (let leitura = 1; ; leitura++) {
    try {
      return await lerUmaVez(opcoes.url, opcoes.membro, opcoes.buscar ?? fetch);
    } catch (erro) {
      if (!(erro instanceof LeituraInvalida) || leitura === MAXIMO_DE_LEITURAS) throw erro;
    }
  }
}

async function lerUmaVez(url: string, membro: (nome: string) => boolean, buscar: Buscar): Promise<MembroRemoto> {
  const cauda = await baixarFaixa(buscar, url, `bytes=-${CAUDA}`, null);
  // Sem ETag, a mudança só aparece no membro, que chega corrompido.
  const faixa = async (range: string) => (await baixarFaixa(buscar, url, range, cauda.etag)).dados;
  const fim = cauda.dados;
  const registroFinal = ultimaAssinatura(fim, 0x06054b50);
  if (registroFinal < 0) throw new Error(`${url}: registro final do zip não encontrado`);
  const visao = new DataView(fim.buffer, fim.byteOffset, fim.byteLength);
  const tamanhoDoDiretorio = visao.getUint32(registroFinal + 12, true);
  const inicioDoDiretorio = visao.getUint32(registroFinal + 16, true);
  if (tamanhoDoDiretorio === 0xffffffff || inicioDoDiretorio === 0xffffffff) throw new Error(`${url}: zip64 não é suportado`);

  const inicioDaCauda = cauda.total - fim.length;
  const diretorio =
    inicioDoDiretorio >= inicioDaCauda
      ? fim.subarray(inicioDoDiretorio - inicioDaCauda, inicioDoDiretorio - inicioDaCauda + tamanhoDoDiretorio)
      : await faixa(`bytes=${inicioDoDiretorio}-${inicioDoDiretorio + tamanhoDoDiretorio - 1}`);

  const entradas = lerDiretorio(diretorio);
  const entrada = entradas.find((e) => membro(e.nome));
  if (!entrada) throw new Error(`${url}: nenhum membro casa com o pedido. Membros: ${entradas.map((e) => e.nome).join(", ")}`);

  // O cabeçalho local tem 30 bytes mais o nome e um campo extra que pode diferir do diretório.
  const cabecalho = await faixa(`bytes=${entrada.inicioDoCabecalho}-${entrada.inicioDoCabecalho + 29}`);
  const visaoDoCabecalho = new DataView(cabecalho.buffer, cabecalho.byteOffset, cabecalho.byteLength);
  if (visaoDoCabecalho.getUint32(0, true) !== 0x04034b50) throw new LeituraInvalida(url, `cabeçalho local inválido para ${entrada.nome}`);
  const inicioDosDados = entrada.inicioDoCabecalho + 30 + visaoDoCabecalho.getUint16(26, true) + visaoDoCabecalho.getUint16(28, true);
  const comprimido =
    entrada.tamanhoComprimido === 0 ? new Uint8Array() : await faixa(`bytes=${inicioDosDados}-${inicioDosDados + entrada.tamanhoComprimido - 1}`);

  let dados: Uint8Array;
  try {
    dados = descomprimir(entrada, comprimido);
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code !== "Z_DATA_ERROR") throw erro;
    throw new LeituraInvalida(url, `${entrada.nome} chegou corrompido (não descomprime)`);
  }
  if (dados.length !== entrada.tamanhoOriginal || crc32(dados) !== entrada.crc) throw new LeituraInvalida(url, `${entrada.nome} chegou corrompido`);
  return { nome: entrada.nome, dados };
}

/** Uma faixa do zip. Com a `etag` da cauda, um 200 quer dizer que o zip mudou desde ela (`If-Range`). */
async function baixarFaixa(
  buscar: Buscar,
  url: string,
  range: string,
  etag: string | null,
): Promise<{ dados: Uint8Array; total: number; etag: string | null }> {
  const resposta = await buscar(url, { headers: etag ? { Range: range, "If-Range": etag } : { Range: range } });
  if (resposta.status !== 206) {
    await resposta.body?.cancel();
    if (etag && resposta.status === 200) throw new LeituraInvalida(url, `o zip mudou durante a leitura (a ETag ${etag} não vale mais)`);
    throw new Error(`${url}: o servidor respondeu ${resposta.status} a um pedido com Range (${range}); o zip inteiro não é baixado`);
  }
  const total = Number(resposta.headers.get("content-range")?.split("/")[1]);
  if (!Number.isFinite(total)) throw new Error(`${url}: resposta sem Content-Range com o tamanho total`);
  return { dados: new Uint8Array(await resposta.arrayBuffer()), total, etag: resposta.headers.get("etag") };
}

function ultimaAssinatura(bytes: Uint8Array, assinatura: number): number {
  const visao = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = bytes.length - 22; i >= 0; i--) if (visao.getUint32(i, true) === assinatura) return i;
  return -1;
}

function lerDiretorio(diretorio: Uint8Array): EntradaDoDiretorio[] {
  const visao = new DataView(diretorio.buffer, diretorio.byteOffset, diretorio.byteLength);
  const entradas: EntradaDoDiretorio[] = [];
  let i = 0;
  while (i + 46 <= diretorio.length && visao.getUint32(i, true) === 0x02014b50) {
    const tamanhoDoNome = visao.getUint16(i + 28, true);
    const utf8 = (visao.getUint16(i + 8, true) & 0x800) !== 0;
    const bytesDoNome = diretorio.subarray(i + 46, i + 46 + tamanhoDoNome);
    entradas.push({
      nome: new TextDecoder(utf8 ? "utf-8" : "latin1").decode(bytesDoNome),
      metodo: visao.getUint16(i + 10, true),
      crc: visao.getUint32(i + 16, true),
      tamanhoComprimido: visao.getUint32(i + 20, true),
      tamanhoOriginal: visao.getUint32(i + 24, true),
      inicioDoCabecalho: visao.getUint32(i + 42, true),
    });
    i += 46 + tamanhoDoNome + visao.getUint16(i + 30, true) + visao.getUint16(i + 32, true);
  }
  return entradas;
}

function descomprimir(entrada: EntradaDoDiretorio, comprimido: Uint8Array): Uint8Array {
  if (entrada.metodo === 0) return comprimido;
  if (entrada.metodo === 8) return new Uint8Array(inflateRawSync(comprimido));
  throw new Error(`${entrada.nome}: método de compressão ${entrada.metodo} não suportado`);
}
