import { dataHoraDoInstante, type Cadastro, type Noite, type Recorte, type Reproducao, type Totais } from "@apurador/pipeline";
import { dataDoTse, dataEHora, JaEscrito, jaEscrito, percentual, percentualPreciso } from "./formato.ts";

// Os arquivos da divulgação do TSE, escritos a partir de um estado da noite reconstruída, no formato da
// eleição 6258 (o 2º turno de 2026): a configuração das eleições (EA11), a de municípios e zonas (EA12), os
// acompanhamentos do Brasil e de cada UF (EA14 e EA15, os índices `-ab.json`) e o resultado de Brasil, UF,
// Exterior, município e zona (EA20). Os candidatos e a geografia vêm só do cadastro e da noite.
//
// Regras tiradas dos arquivos reais (os zerados da 6258 e os finais da 6257):
// - Um arquivo de resultado é gerado de novo quando o lugar recebe uma seção: `dt`/`ht` é a hora dessa última
//   totalização. Na totalização final, todos são gerados de novo, com `dt`/`ht` da final, `tf = "s"` e os
//   campos `esae` e `mnae`; os índices guardam a hora da última totalização de cada lugar.
// - `seq`, `e` e `st` de cada candidato são os do Brasil em todos os arquivos.
// - `dvt` só aparece depois que o lugar recebe a primeira seção.
// - A indicação do TSE é o campo `md` do resultado do Brasil (`"e"`: eleição matematicamente definida, com
//   eleito), lido assim pelo app oficial de resultados, que só o mostra enquanto `tf` é `"n"`.
//
// O que a noite não tem fica de um jeito só: toda seção totalizada conta como instalada e apurada (`sni` e
// `sna` zero), os nulos não separam os técnicos (`vnt` zero) e não há votos anulados.

export const ELEICAO = "6258";
const ELEICAO6 = ELEICAO.padStart(6, "0");
const CARGO4 = "0001";

/** Um arquivo que o TSE falso serve. */
export type Documento = { tipo: "eleicoes" } | { tipo: "municipios" } | { tipo: "acompanhamento"; uf: string | null } | { tipo: "resultado"; recorte: Recorte };

/** Os caminhos que o TSE serve, a partir de `/oficial`. */
export const CAMINHOS = {
  eleicoes: "/oficial/comum/config/ele-c.json",
  municipios: `/oficial/ele2026/${ELEICAO}/config/mun-e${ELEICAO6}-cm.json`,
  dados: `/oficial/ele2026/${ELEICAO}/dados/`,
};

const RESULTADO = new RegExp(`^([a-z]{2})(\\d{5})?(?:-z(\\d{4}))?-c${CARGO4}-e${ELEICAO6}-u\\.json$`);
const ACOMPANHAMENTO = new RegExp(`^([a-z]{2})-e${ELEICAO6}-ab\\.json$`);

/** Uma ordem dos candidatos, pelas posições em `Noite.candidatos`: a primeira é a de quem lidera. */
type Ordem = number[];

/** Os arquivos da divulgação de uma noite reconstruída, no formato da eleição 6258, em qualquer estado da apuração. */
export interface Divulgacao {
  /** O arquivo de um caminho (sem a query string), ou `undefined` se ele não existe na configuração. */
  documento(caminho: string): Documento | undefined;
  /** Muda só quando o conteúdo do arquivo muda, e é barata: serve de chave para guardar o que já foi escrito. */
  versao(documento: Documento, estado: Reproducao): string;
  /** O instante em que o arquivo foi gerado, no estado (`dg`/`hg`, e o `Last-Modified` da resposta). */
  geracao(documento: Documento, estado: Reproducao): number;
  escrever(documento: Documento, estado: Reproducao): object;
  /** O instante da totalização final, quando todas as seções foram totalizadas. */
  readonly totalizacaoFinal: number | null;
  /** O instante em que o TSE indica o eleito, com a eleição matematicamente definida. */
  readonly indicacao: number | null;
}

/** Antes da primeira seção, os arquivos são os zerados, gerados à meia-noite do dia da eleição. */
const GERACAO_INICIAL = 0;

/** Um percentual com duas e com nove casas, o par de campos do TSE (`pst` e `pstn`, por exemplo). */
const percentuais = (parte: number, todo: number, semTodo = "0") => [percentual(parte, todo), percentualPreciso(parte, todo, semTodo)] as const;

/** A divulgação de uma noite reconstruída, com os candidatos e a geografia do cadastro daquela noite. */
export function criarDivulgacao(noite: Noite, cadastro: Cadastro): Divulgacao {
  if (cadastro.candidatos.map((c) => c.numero).join() !== noite.candidatos.map((c) => c.numero).join())
    throw new Error("Os candidatos do cadastro não são os da noite");

  // A geografia da noite: UFs (com o Exterior), municípios e zonas.
  const zonasDoMunicipio = new Map<string, number[]>();
  for (const z of noite.zonas) {
    const k = `${z.uf}/${z.municipio}`;
    zonasDoMunicipio.set(k, [...(zonasDoMunicipio.get(k) ?? []), z.zona]);
  }
  const ufs = cadastro.ufs.map((uf) => uf.sigla);
  const municipiosDaUf = new Map(cadastro.ufs.map((uf) => [uf.sigla, uf.municipios.map((m) => m.codigo).sort((a, b) => a - b)]));
  for (const k of zonasDoMunicipio.keys()) {
    const [uf, municipio] = k.split("/");
    if (!municipiosDaUf.get(uf!)?.includes(Number(municipio))) throw new Error(`O município ${k} da noite não está no cadastro`);
  }

  // A sequência das chegadas no Brasil dá a ordem dos candidatos em cada instante, a totalização final e a
  // indicação do TSE: num 2º turno, quando a vantagem de quem lidera passa dos eleitores das seções que faltam.
  const ordemInicial: Ordem = noite.candidatos.map((_, i) => i).sort((a, b) => noite.candidatos[a]!.numero - noite.candidatos[b]!.numero);
  const ordenar = (votos: number[]): Ordem => [...ordemInicial].sort((a, b) => votos[b]! - votos[a]!);
  const mudancasDeOrdem: { instante: number; ordem: Ordem }[] = [];
  const total = { secoes: 0, aptos: 0 };
  for (const z of noite.zonas) {
    total.secoes += z.secoes;
    total.aptos += z.aptos;
  }
  const apurado = { secoes: 0, aptos: 0, votos: noite.candidatos.map(() => 0) };
  let indicacao: number | null = null;
  for (const c of noite.chegadas) {
    apurado.secoes += c.secoes;
    apurado.aptos += c.aptos;
    c.votos.forEach((v, i) => (apurado.votos[i]! += v));
    const ordem = ordenar(apurado.votos);
    if (ordem.join() !== (mudancasDeOrdem.at(-1)?.ordem ?? ordemInicial).join()) mudancasDeOrdem.push({ instante: c.instante, ordem });
    const [primeiro, segundo] = ordem.map((i) => apurado.votos[i]!);
    if (indicacao === null && noite.turno === 2 && primeiro! - segundo! > total.aptos - apurado.aptos) indicacao = c.instante;
  }
  const totalizacaoFinal = apurado.secoes === total.secoes && noite.chegadas.length > 0 ? noite.chegadas.at(-1)!.instante : null;
  if (indicacao !== null && indicacao === totalizacaoFinal) indicacao = null;

  function ordemEm(instante: number | null): Ordem {
    if (instante === null) return ordemInicial;
    let ordem = ordemInicial;
    for (const m of mudancasDeOrdem) {
      if (m.instante > instante) break;
      ordem = m.ordem;
    }
    return ordem;
  }

  const finalizada = (estado: Reproducao) => totalizacaoFinal !== null && estado.apurado().ultimaTotalizacao === totalizacaoFinal;
  const indicada = (estado: Reproducao) => {
    const ultima = estado.apurado().ultimaTotalizacao;
    return indicacao !== null && ultima !== null && ultima >= indicacao && !finalizada(estado);
  };

  const quando = (instante: number | null) => (instante === null ? { data: "", hora: "" } : dataEHora(dataHoraDoInstante(noite, instante)));
  /** Um número do arquivo de geração: único por arquivo e geração, e o mesmo toda vez que o arquivo é escrito. */
  function idg(documento: Documento, geracao: number): string {
    let h = 2166136261;
    for (const ch of `${JSON.stringify(documento)}@${geracao}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return String(1_000_000 + (h % 9_000_000));
  }

  function documento(caminho: string): Documento | undefined {
    if (caminho === CAMINHOS.eleicoes) return { tipo: "eleicoes" };
    if (caminho === CAMINHOS.municipios) return { tipo: "municipios" };
    if (!caminho.startsWith(CAMINHOS.dados)) return undefined;
    const [pasta, arquivo, ...resto] = caminho.slice(CAMINHOS.dados.length).split("/");
    if (pasta === undefined || arquivo === undefined || resto.length > 0) return undefined;
    const uf = pasta === "br" ? null : pasta.toUpperCase();
    if (uf !== null && !ufs.includes(uf)) return undefined;

    const ab = ACOMPANHAMENTO.exec(arquivo);
    if (ab) return ab[1] === pasta ? { tipo: "acompanhamento", uf } : undefined;
    const u = RESULTADO.exec(arquivo);
    if (!u || u[1] !== pasta) return undefined;
    const [, , municipio, zona] = u;
    if (uf === null) return municipio === undefined ? { tipo: "resultado", recorte: {} } : undefined;
    if (municipio === undefined) return { tipo: "resultado", recorte: { uf } };
    const zonas = zonasDoMunicipio.get(`${uf}/${Number(municipio)}`);
    if (!zonas) return undefined;
    if (zona === undefined) return { tipo: "resultado", recorte: { uf, municipio: Number(municipio) } };
    return zonas.includes(Number(zona)) ? { tipo: "resultado", recorte: { uf, municipio: Number(municipio), zona: Number(zona) } } : undefined;
  }

  const recorteDoAcompanhamento = (d: { uf: string | null }): Recorte => (d.uf === null ? {} : { uf: d.uf });

  function geracao(d: Documento, estado: Reproducao): number {
    if (d.tipo === "eleicoes" || d.tipo === "municipios") return GERACAO_INICIAL;
    if (d.tipo === "resultado" && finalizada(estado)) return totalizacaoFinal!;
    const recorte = d.tipo === "resultado" ? d.recorte : recorteDoAcompanhamento(d);
    return estado.apurado(recorte).ultimaTotalizacao ?? GERACAO_INICIAL;
  }

  // O resultado de um lugar (EA20).

  /** O tipo e o código da abrangência de um recorte, como o TSE os escreve. */
  function abrangencia(r: Recorte): { tpabr: "br" | "uf" | "mu" | "zona"; cdabr: string } {
    if (r.zona !== undefined) return { tpabr: "zona", cdabr: String(r.zona).padStart(4, "0") };
    if (r.municipio !== undefined) return { tpabr: "mu", cdabr: String(r.municipio).padStart(5, "0") };
    if (r.uf !== undefined) return { tpabr: "uf", cdabr: r.uf.toLowerCase() };
    return { tpabr: "br", cdabr: "br" };
  }

  function andamento(r: Recorte, a: Totais, t: { secoes: number }, estado: Reproducao): string {
    if (a.secoes === 0) return "n";
    // No Brasil, o andamento só termina com a totalização final.
    if (abrangencia(r).tpabr === "br") return finalizada(estado) ? "f" : "p";
    return a.secoes === t.secoes ? "f" : "p";
  }

  function secoes(a: { secoes: number }, t: { secoes: number }) {
    const [ts, st] = [t.secoes, a.secoes];
    const [snt, si, sni, sa, sna] = [ts - st, st, 0, st, 0];
    const [pst, pstn] = percentuais(st, ts);
    const [psnt, psntn] = percentuais(snt, ts);
    const [psi, psin] = percentuais(si, st);
    const [psni, psnin] = percentuais(sni, st);
    const [psa, psan] = percentuais(sa, si);
    const [psna, psnan] = percentuais(sna, si);
    return { ts, st, pst, pstn, snt, psnt, psntn, si, psi, psin, sni, psni, psnin, sa, psa, psan, sna, psna, psnan };
  }

  function eleitorado(a: { aptos: number; votantes: number }, t: { aptos: number }) {
    const [te, est] = [t.aptos, a.aptos];
    const [esnt, esi, esni, esa, esna, c] = [te - est, est, 0, est, 0, a.votantes];
    const ab = esi - c;
    const [pest, pestn] = percentuais(est, te);
    const [pesnt, pesntn] = percentuais(esnt, te);
    const [pesi, pesin] = percentuais(esi, est);
    const [pesni, pesnin] = percentuais(esni, est);
    const [pesa, pesan] = percentuais(esa, esi);
    const [pesna, pesnan] = percentuais(esna, esi);
    const [pc, pcn] = percentuais(c, esi);
    const [pa, pan] = percentuais(ab, esi);
    return {
      te,
      est,
      pest,
      pestn,
      esnt,
      pesnt,
      pesntn,
      esi,
      pesi,
      pesin,
      esni,
      pesni,
      pesnin,
      esa,
      pesa,
      pesan,
      esna,
      pesna,
      pesnan,
      c,
      pc,
      pcn,
      a: ab,
      pa,
      pan,
    };
  }

  function votos(a: Totais) {
    const tv = a.votantes;
    const vv = a.votos.reduce((s, v) => s + v, 0);
    const [vvc, vnom, van, vansj, vb, tvn, vn, vnt] = [vv, vv, 0, 0, a.brancos, a.nulos, a.nulos, 0];
    // Num arquivo ainda sem voto nenhum, os percentuais de nove casas dos votos vêm como "0,00".
    const p = (parte: number, todo: number) => percentuais(parte, todo, tv === 0 ? "0,00" : "0");
    const [pvvc, pvvcn] = p(vvc, tv);
    const [pvv, pvvn] = p(vv, vvc);
    const [pvnom, pvnomn] = p(vnom, vv);
    const [pvan, pvann] = p(van, vv);
    const [pvansj, pvansjn] = p(vansj, vv);
    const [pvb, pvbn] = p(vb, tv);
    const [ptvn, ptvnn] = p(tvn, tv);
    const [pvn, pvnn] = p(vn, tvn);
    const [pvnt, pvntn] = p(vnt, tvn);
    return {
      tv,
      vvc,
      pvvc,
      pvvcn,
      vv,
      pvv,
      pvvn,
      vnom,
      pvnom,
      pvnomn,
      van,
      pvan,
      pvann,
      vansj,
      pvansj,
      pvansjn,
      vb,
      pvb,
      pvbn,
      tvn,
      ptvn,
      ptvnn,
      vn,
      pvn,
      pvnn,
      vnt,
      pvnt,
      pvntn,
      vsan: 0,
      vscv: 0,
    };
  }

  function cargo(r: Recorte, a: Totais, ordem: Ordem, final: boolean) {
    const validos = a.votos.reduce((s, v) => s + v, 0);
    const doBrasil = abrangencia(r).tpabr === "br";
    const comDestinacao = a.secoes > 0 || final;
    const votosDe = (numeros: number[]) => numeros.reduce((s, n) => s + a.votos[noite.candidatos.findIndex((c) => c.numero === n)]!, 0);

    const federacoes = [...new Map(cadastro.candidatos.flatMap((c) => (c.federacao ? [[c.federacao.numero, c.federacao] as const] : []))).values()];
    const agremiacoes = [...new Set(cadastro.candidatos.map((c) => c.agremiacao.sequencial))].map((sequencial) => {
      const candidatos = cadastro.candidatos.filter((c) => c.agremiacao.sequencial === sequencial);
      const { tipo, nome, composicao } = candidatos[0]!.agremiacao;
      const totais = { tvtn: votosDe(candidatos.map((c) => c.numero)), tvan: votosDe(candidatos.map((c) => c.numero)) };
      const partidos = [...new Set(candidatos.map((c) => c.partido.numero))].map((numero) => {
        const doPartido = candidatos.filter((c) => c.partido.numero === numero);
        const { sigla, nome: nomeDoPartido } = doPartido[0]!.partido;
        const federacao = doPartido[0]!.federacao;
        const votosDoPartido = votosDe(doPartido.map((c) => c.numero));
        return {
          n: numero,
          sg: sigla,
          nm: nomeDoPartido,
          nfed: federacao ? federacao.numero : "",
          tvtn: votosDoPartido,
          tvan: votosDoPartido,
          cand: doPartido.map((c) => {
            const i = noite.candidatos.findIndex((x) => x.numero === c.numero);
            const posicao = ordem.indexOf(i) + 1;
            const eleito = final && posicao === 1;
            return {
              n: c.numero,
              sqcand: c.sequencial,
              nm: c.nome,
              nmu: c.nomeUrna,
              dt: dataDoTse(c.nascimento),
              ...(comDestinacao ? { dvt: "Válido" } : {}),
              seq: posicao,
              e: eleito ? "s" : "n",
              st: !final ? "" : eleito ? "Eleito" : "Não eleito",
              vap: a.votos[i]!,
              pvap: percentual(a.votos[i]!, validos),
              pvapn: percentualPreciso(a.votos[i]!, validos),
              vs: [{ tp: "v", sqcand: c.vice.sequencial, nm: c.vice.nome, nmu: c.vice.nomeUrna, sgp: c.vice.partido }],
            };
          }),
        };
      });
      // Um partido isolado não traz os totais da agremiação; fora do Brasil, traz os votos de agremiação.
      const extra = tipo === "i" ? (doBrasil ? {} : { vag: 0 }) : totais;
      return { n: sequencial, nm: nome, tp: tipo, com: composicao, ...extra, par: partidos };
    });
    return {
      cd: 1,
      nmn: "Presidente",
      nmm: "Presidente",
      nmf: "Presidente",
      nv: 1,
      fed: federacoes.map((f) => ({ n: f.numero, sg: f.sigla, nm: f.nome, com: f.composicao, npar: f.partidos })),
      agr: agremiacoes,
    };
  }

  function resultado(d: Extract<Documento, { tipo: "resultado" }>, estado: Reproducao) {
    const r = d.recorte;
    const a = estado.apurado(r);
    const t = estado.total(r);
    const final = finalizada(estado);
    const g = quando(geracao(d, estado));
    const ultima = quando(final ? totalizacaoFinal : a.ultimaTotalizacao);
    const ordem = ordemEm(final ? totalizacaoFinal : a.ultimaTotalizacao);
    const fim = final ? { esae: "n", mnae: [] } : {};
    const situacao = { tf: final ? "s" : "n", and: andamento(r, a, t, estado) };
    const { tpabr, cdabr } = abrangencia(r);
    const indicacaoDoTse = tpabr === "br" && indicada(estado) ? { md: "e" } : {};
    return {
      ele: ELEICAO,
      t: noite.turno,
      f: "o",
      sup: "n",
      tpabr,
      cdabr,
      dg: g.data,
      hg: g.hora,
      idg: idg(d, geracao(d, estado)),
      dt: ultima.data,
      ht: ultima.hora,
      // O arquivo de zona traz `dv` depois do andamento; os outros, antes.
      ...(tpabr === "zona" ? { ...situacao, ...fim, dv: "s" } : { dv: "s", ...situacao, ...indicacaoDoTse, ...fim }),
      carg: [cargo(r, a, ordem, final)],
      s: secoes(a, t),
      e: eleitorado(a, t),
      v: votos(a),
    };
  }

  // Os acompanhamentos (EA14 do Brasil, com as UFs; EA15 de cada UF, com os municípios).

  // Um item do índice só muda quando o lugar recebe seções: fica escrito até lá. Num índice de UF grande, como o
  // de Minas Gerais, com 853 municípios, poucos mudam de uma rodada para outra.
  const itensEscritos = new Map<string, { ultima: number | null; item: JaEscrito }>();
  function itemDoAcompanhamento(r: Recorte, estado: Reproducao, contar: () => Record<string, string | number> = () => ({})) {
    const a = estado.apurado(r);
    const chave = `${r.uf ?? ""}/${r.municipio ?? ""}`;
    const antes = itensEscritos.get(chave);
    if (antes && antes.ultima === a.ultimaTotalizacao) return antes.item;
    const t = estado.total(r);
    const ultima = quando(a.ultimaTotalizacao);
    const { tpabr, cdabr } = abrangencia(r);
    const item = {
      and: andamento(r, a, t, estado),
      tpabr: tpabr === "mu" ? "mun" : tpabr,
      cdabr,
      dt: ultima.data,
      ht: ultima.hora,
      ...contar(),
      s: secoes(a, t),
      e: eleitorado(a, t),
    };
    const escrito = jaEscrito(textos(item) as object);
    itensEscritos.set(chave, { ultima: a.ultimaTotalizacao, item: escrito });
    return escrito;
  }

  /** Quantos lugares não começaram, estão em andamento e terminaram, com os percentuais. */
  function contagem(prefixo: "mun" | "ufs", recortes: Recorte[], estado: Reproducao) {
    // O andamento de cada lugar: 0 não iniciado, 1 em andamento, 2 terminado.
    const [nr, pt, f] = [0, 1, 2].map(
      (andamentoDoLugar) =>
        recortes.filter((r) => {
          const a = estado.apurado(r).secoes;
          return (a === 0 ? 0 : a === estado.total(r).secoes ? 2 : 1) === andamentoDoLugar;
        }).length,
    ) as [number, number, number];
    const n = recortes.length;
    return {
      [`${prefixo}nr`]: nr,
      [`p${prefixo}nr`]: percentual(nr, n),
      [`p${prefixo}nrn`]: percentualPreciso(nr, n),
      [`${prefixo}pt`]: pt,
      [`p${prefixo}pt`]: percentual(pt, n),
      [`p${prefixo}ptn`]: percentualPreciso(pt, n),
      [`${prefixo}f`]: f,
      [`p${prefixo}f`]: percentual(f, n),
      [`p${prefixo}fn`]: percentualPreciso(f, n),
    };
  }

  const municipios = (uf: string): Recorte[] => municipiosDaUf.get(uf)!.map((municipio) => ({ uf, municipio }));

  function acompanhamento(d: Extract<Documento, { tipo: "acompanhamento" }>, estado: Reproducao) {
    const g = quando(geracao(d, estado));
    const cabecalho = { ele: ELEICAO, t: noite.turno, f: "o", dg: g.data, hg: g.hora, idg: idg(d, geracao(d, estado)) };
    if (d.uf !== null) {
      const uf = d.uf;
      const itens = municipios(uf).map((m) => itemDoAcompanhamento(m, estado));
      return { ...cabecalho, abr: [...itens, itemDoAcompanhamento({ uf }, estado, () => contagem("mun", municipios(uf), estado))] };
    }
    const porSigla = [...ufs].sort((a, b) => a.localeCompare(b));
    const itens = porSigla.map((uf) => itemDoAcompanhamento({ uf }, estado, () => contagem("mun", municipios(uf), estado)));
    const brasil = itemDoAcompanhamento({}, estado, () =>
      contagem(
        "ufs",
        ufs.map((uf) => ({ uf })),
        estado,
      ),
    );
    return { ...cabecalho, abr: [...itens, brasil] };
  }

  // As configurações.

  function municipiosEZonas() {
    const g = quando(GERACAO_INICIAL);
    return {
      dg: g.data,
      hg: g.hora,
      idg: idg({ tipo: "municipios" }, GERACAO_INICIAL),
      f: "o",
      abr: cadastro.ufs.map((uf) => ({
        cd: uf.sigla.toLowerCase(),
        ds: uf.nome,
        mu: uf.municipios.map((m) => ({
          cd: String(m.codigo).padStart(5, "0"),
          cdi: m.ibge === null ? "" : m.ibge,
          nm: m.nome,
          c: m.capital ? "s" : "n",
          z: zonasDoMunicipio.get(`${uf.sigla}/${m.codigo}`)!.map((z) => String(z).padStart(4, "0")),
        })),
      })),
    };
  }

  function eleicoes() {
    const g = quando(GERACAO_INICIAL);
    const dir = (tp: string, caminho: string) => ({ tp, dir: `<base>/<ambiente>/<ciclo>/${caminho}` });
    return {
      dg: g.data,
      hg: g.hora,
      f: "o",
      idg: idg({ tipo: "eleicoes" }, GERACAO_INICIAL),
      arq: [
        dir("ft", "<cd_eleicao>/fotos/<uf>"),
        dir("cm", "<cd_eleicao>/config"),
        dir("e", "<cd_eleicao>/dados/<uf>"),
        dir("cs", "arquivo-urna/<cd_pleito>/config/<uf>"),
        dir("ab", "<cd_eleicao>/dados/<uf>"),
        dir("u", "<cd_eleicao>/dados/<uf>"),
        dir("aux", "arquivo-urna/<cd_pleito>/dados/<uf>/<municipio>/<zona>/<secao>"),
      ],
      pl: [
        {
          cd: "3221",
          cdpr: "1219",
          c: "ele2026",
          dt: dataDoTse(noite.dia),
          dtlim: dataDoTse(`${Number(noite.dia.slice(0, 4)) + 8}${noite.dia.slice(4)}`),
          e: [
            {
              cd: ELEICAO,
              cdt2: "",
              sqele: "20322002026",
              nm: "Eleição Ordinária Federal - 2026 2º Turno",
              t: noite.turno,
              tp: "8",
              abr: [{ cd: "br", cp: [{ cd: "1", ds: "Presidente", tp: "1" }] }],
            },
          ],
        },
      ],
    };
  }

  return {
    totalizacaoFinal,
    indicacao,
    documento,
    geracao,
    versao(d, estado) {
      if (d.tipo === "eleicoes" || d.tipo === "municipios") return d.tipo;
      // O resultado do Brasil muda também com a indicação, que cai sempre numa chegada.
      return `${geracao(d, estado)}${d.tipo === "resultado" && finalizada(estado) ? "f" : ""}`;
    },
    escrever(d, estado) {
      const escrito =
        d.tipo === "eleicoes"
          ? eleicoes()
          : d.tipo === "municipios"
            ? municipiosEZonas()
            : d.tipo === "acompanhamento"
              ? acompanhamento(d, estado)
              : resultado(d, estado);
      return textos(escrito) as object;
    },
  };
}

/** No arquivo do TSE, todo número é texto. */
function textos(v: unknown): unknown {
  if (typeof v === "number") return String(v);
  if (v instanceof JaEscrito) return v;
  if (Array.isArray(v)) return v.map(textos);
  if (typeof v === "object" && v !== null) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, textos(x)]));
  return v;
}
