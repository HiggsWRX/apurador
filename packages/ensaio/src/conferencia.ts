import type { ArquivoDoLugar } from "@apurador/coletor";
import { idDoMunicipio, instanteDaNoite, reproduzir, type Cadastro, type Noite } from "@apurador/pipeline";
import { lerResultado, urlsDaDivulgacao, type AbrangenciaDaDivulgacao, type ResultadoDoTse } from "@apurador/tse";
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

/**
 * Os resultados que o TSE falso serve, escritos direto pela divulgação dele, sem o limite de pedidos da CDN, e
 * lidos pelo leitor ao vivo do `tse`. A noite só anda para a frente.
 */
export function resultadosDoTseFalso(fonte: { noite: Noite; cadastro: Cadastro }) {
  const divulgacao = criarDivulgacao(fonte.noite, fonte.cadastro);
  const estado = reproduzir(fonte.noite);
  // Os caminhos do TSE falso, a partir da raiz dele, como o TSE os serve a partir de `/oficial`.
  const urls = urlsDaDivulgacao("/oficial", { codigo: ELEICAO, ciclo: "ele2026" });
  return {
    /** Põe a noite num instante (segundos desde 00:00 do dia da eleição), só para a frente. */
    avancarAte: (instante: number) => estado.avancarAte(instante),
    /** O resultado de um lugar ou zona no instante da noite, ou `undefined` se ele não existe nela. */
    resultado(abrangencia: AbrangenciaDaDivulgacao): ResultadoDoTse | undefined {
      const documento = divulgacao.documento(urls.resultado(abrangencia));
      return documento && lerResultado(new TextEncoder().encode(escreverComoTse(divulgacao.escrever(documento, estado))));
    },
  };
}

/** As divergências encontradas, uma por campo, em texto. Nenhuma é a meta. */
export function conferirPlacar(publicados: PlacarPublicado[], fonte: { noite: Noite; cadastro: Cadastro }): string[] {
  const { noite, cadastro } = fonte;
  const ufDoMunicipio = new Map(cadastro.ufs.flatMap((uf) => uf.municipios.map((m) => [idDoMunicipio(m.codigo), uf.sigla] as const)));
  const ufs = new Set(cadastro.ufs.map((uf) => uf.sigla));
  const abrangencia = (lugar: string): AbrangenciaDaDivulgacao | undefined => {
    if (lugar === "BR") return {};
    if (ufs.has(lugar)) return { uf: lugar };
    const uf = ufDoMunicipio.get(lugar);
    return uf === undefined ? undefined : { uf, municipio: Number(lugar) };
  };

  // Os lugares são conferidos em ordem de hora, com a noite andando para a frente.
  const instante = (p: PlacarPublicado) => (p.lugar.tse.totalizacao === null ? 0 : instanteDaNoite(noite, p.lugar.tse.totalizacao));
  const emOrdem = [...publicados].sort((a, b) => instante(a) - instante(b));
  const tse = resultadosDoTseFalso(fonte);

  const divergencias: string[] = [];
  for (const p of emOrdem) {
    const { lugar, tse: publicado } = p.lugar;
    const onde = `${lugar}, publicado com a hora ${publicado.totalizacao ?? "vazia"}`;
    const a = abrangencia(lugar);
    tse.avancarAte(instante(p));
    const oficial = a && tse.resultado(a);
    if (!oficial) {
      divergencias.push(`${onde}: o lugar não existe no TSE falso`);
      continue;
    }
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
    for (const [nome, x, y] of campos)
      if (JSON.stringify(x) !== JSON.stringify(y)) divergencias.push(`${onde}: ${nome} publicado ${JSON.stringify(x)}, no TSE falso ${JSON.stringify(y)}`);
  }
  return divergencias;
}
