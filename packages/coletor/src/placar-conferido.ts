import type { ArquivoDeRodada, ArquivoDoLugar } from "./arquivos.ts";

// O placar conferido do painel do coletor (Operação na noite, decisões 6 e 17): o placar do Brasil que o visitante lê
// contra o do arquivo do TSE. O lado do TSE é lido aqui dos bytes do arquivo, sem o leitor do pacote `tse`: na noite, só
// o leitor pode mudar (decisão 19), e uma correção dele que leia errado publicaria o placar errado nos dois lados de uma
// conferência que passasse por ele. A leitura é a mínima, sem validar nada: um arquivo que o leitor do TSE aceitou e esta
// não entende vira falha da rodada, e o painel fica sem conferência.

/** O placar do Brasil num arquivo do TSE, como o TSE o escreve. */
export interface PlacarDoTse {
  /** A última totalização, `AAAA-MM-DD HH:MM:SS`, em Brasília, como o arquivo publicado a escreve; `null` antes da primeira. */
  totalizacao: string | null;
  secoes: { totalizadas: number; percentual: number };
  candidatos: { numero: number; nome: string; votos: number; percentual: number }[];
}

/** "47,03" → 47.03. */
const percentual = (texto: string) => Number(texto.replace(",", "."));

/** O placar do Brasil nos bytes de um arquivo de resultado do TSE (EA20). Lança se faltar um campo. */
export function placarDoArquivoDoTse(bytes: Uint8Array): PlacarDoTse {
  type Bruto = Record<string, string> & { s: Record<string, string>; carg: { agr: { par: { cand: Record<string, string>[] }[] }[] }[] };
  const raiz = JSON.parse(new TextDecoder().decode(bytes)) as Bruto;
  const [dia, mes, ano] = raiz.dt!.split("/");
  return {
    totalizacao: raiz.dt === "" && raiz.ht === "" ? null : `${ano}-${mes}-${dia} ${raiz.ht}`,
    secoes: { totalizadas: Number(raiz.s.st), percentual: percentual(raiz.s.pst!) },
    candidatos: raiz.carg
      .flatMap((cargo) => cargo.agr.flatMap((agremiacao) => agremiacao.par.flatMap((partido) => partido.cand)))
      .map((c) => ({ numero: Number(c.n), nome: c.nmu!, votos: Number(c.vap), percentual: percentual(c.pvap!) })),
  };
}

/**
 * O que difere entre o placar do Brasil publicado (o arquivo de rodada, pela ordem dos candidatos, e o JSON do Brasil) e
 * o do arquivo do TSE da mesma totalização: vazio quando são iguais.
 */
export function divergenciasDoPlacar(rodada: ArquivoDeRodada, brasil: ArquivoDoLugar, doTse: PlacarDoTse): string[] {
  const divergencias: string[] = [];
  if (brasil.tse.secoes.totalizadas !== doTse.secoes.totalizadas || brasil.tse.secoes.percentual !== doTse.secoes.percentual)
    divergencias.push(
      `seções: ${brasil.tse.secoes.totalizadas} (${brasil.tse.secoes.percentual}%) publicadas, ${doTse.secoes.totalizadas} (${doTse.secoes.percentual}%) no TSE`,
    );
  rodada.candidatos.forEach((c, i) => {
    const noTse = doTse.candidatos.find((x) => x.numero === c.numero);
    const [votos, pct] = [brasil.tse.votos[i], brasil.tse.percentuais[i]];
    if (!noTse) divergencias.push(`${c.nome}: publicado, e não está no arquivo do TSE`);
    else if (votos !== noTse.votos || pct !== noTse.percentual)
      divergencias.push(`${c.nome}: ${votos} votos (${pct}%) publicados, ${noTse.votos} (${noTse.percentual}%) no TSE`);
  });
  if (doTse.candidatos.length !== rodada.candidatos.length)
    divergencias.push(`${doTse.candidatos.length} candidatos no TSE, ${rodada.candidatos.length} publicados`);
  return divergencias;
}
