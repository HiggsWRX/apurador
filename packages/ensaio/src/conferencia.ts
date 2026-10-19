import type { ArquivoDoLugar } from "@apurador/coletor";
import { instanteDaNoite, reproduzir, type Cadastro, type Noite } from "@apurador/pipeline";
import { lerResultado, urlsDaDivulgacao, type ResultadoDoTse } from "@apurador/tse";
import { criarDivulgacao, ELEICAO } from "./divulgacao.ts";
import { escreverComoTse } from "./formato.ts";

// A conferência do placar oficial (critério do núcleo mínimo do ensaio geral, decisão 20): o placar parcial,
// o % de seções, o "x de y" e a hora que o site publicou num lugar têm de ser os do arquivo do TSE falso daquele
// lugar na hora publicada, sem alteração. É o mesmo script no replay automático e no ensaio geral; no ensaio, os
// arquivos vêm do endereço público, com o atraso da CDN, e por isso a referência é a hora publicada, não a de agora.

/** Um arquivo de lugar publicado, com a ordem dos candidatos do arquivo de rodada que o acompanha. */
export interface PlacarPublicado {
  /** Os números dos candidatos, na ordem do arquivo de rodada. */
  candidatos: number[];
  lugar: Pick<ArquivoDoLugar, "lugar" | "tse">;
}

/** As divergências encontradas, uma por campo, em texto. Nenhuma é a meta. */
export function conferirPlacar(publicados: PlacarPublicado[], fonte: { noite: Noite; cadastro: Cadastro }): string[] {
  const { noite, cadastro } = fonte;
  const ufDoMunicipio = new Map(cadastro.ufs.flatMap((uf) => uf.municipios.map((m) => [String(m.codigo).padStart(5, "0"), uf.sigla] as const)));
  const ufs = new Set(cadastro.ufs.map((uf) => uf.sigla));
  // Os caminhos do TSE falso, a partir da raiz dele, como o TSE os serve a partir de `/oficial`.
  const urls = urlsDaDivulgacao("/oficial", { codigo: ELEICAO, ciclo: "ele2026" });
  const caminho = (lugar: string) => {
    if (lugar === "BR") return urls.resultado({});
    if (ufs.has(lugar)) return urls.resultado({ uf: lugar });
    const uf = ufDoMunicipio.get(lugar);
    return uf === undefined ? undefined : urls.resultado({ uf, municipio: Number(lugar) });
  };

  // Os arquivos que o TSE falso serve, escritos direto pela divulgação dele, sem o limite de pedidos da CDN. A
  // noite só anda para a frente: os lugares são conferidos em ordem de hora.
  const instante = (p: PlacarPublicado) => (p.lugar.tse.totalizacao === null ? 0 : instanteDaNoite(noite, p.lugar.tse.totalizacao));
  const emOrdem = [...publicados].sort((a, b) => instante(a) - instante(b));
  const divulgacao = criarDivulgacao(noite, cadastro);
  const estado = reproduzir(noite);

  const divergencias: string[] = [];
  for (const p of emOrdem) {
    const { lugar, tse: publicado } = p.lugar;
    const onde = `${lugar}, publicado com a hora ${publicado.totalizacao ?? "vazia"}`;
    const url = caminho(lugar);
    const documento = url === undefined ? undefined : divulgacao.documento(url);
    if (documento === undefined) {
      divergencias.push(`${onde}: o lugar não existe no TSE falso`);
      continue;
    }
    estado.avancarAte(instante(p));
    const oficial: ResultadoDoTse = lerResultado(new TextEncoder().encode(escreverComoTse(divulgacao.escrever(documento, estado))));
    const candidato = (numero: number) => oficial.candidatos.find((c) => c.numero === numero);
    const campos: [string, unknown, unknown][] = [
      ["hora da última totalização", publicado.totalizacao, oficial.ultimaTotalizacao],
      ["seções totalizadas", publicado.secoes.totalizadas, oficial.secoes.totalizadas],
      ["total de seções", publicado.secoes.total, oficial.secoes.total],
      ["% de seções totalizadas", publicado.secoes.percentual, oficial.secoes.percentual],
      ["votos", publicado.votos, p.candidatos.map((n) => candidato(n)?.votos)],
      ["percentuais", publicado.percentuais, p.candidatos.map((n) => candidato(n)?.percentual)],
      ["totalização final", publicado.final, oficial.totalizacaoFinal],
    ];
    for (const [nome, a, b] of campos)
      if (JSON.stringify(a) !== JSON.stringify(b)) divergencias.push(`${onde}: ${nome} publicado ${JSON.stringify(a)}, no TSE falso ${JSON.stringify(b)}`);
  }
  return divergencias;
}
