import { describe, expect, it } from "vitest";
import { lerDetalheVotacaoMunzona, lerVotacaoCandidatoMunzona } from "../src/index.ts";

// Cabeçalhos e linhas copiados dos arquivos reais de 2026 (`*_BR.csv`), em Latin-1, como o TSE publica.
const latin1 = (texto: string) => new Uint8Array(Buffer.from(texto, "latin1"));

const CABECALHO_CANDIDATO =
  '"DT_GERACAO";"HH_GERACAO";"ANO_ELEICAO";"CD_TIPO_ELEICAO";"NM_TIPO_ELEICAO";"NR_TURNO";"CD_ELEICAO";"DS_ELEICAO";"DT_ELEICAO";"TP_ABRANGENCIA";"SG_UF";"SG_UE";"NM_UE";"CD_MUNICIPIO";"NM_MUNICIPIO";"NR_ZONA";"CD_CARGO";"DS_CARGO";"SQ_CANDIDATO";"NR_CANDIDATO";"NM_CANDIDATO";"NM_URNA_CANDIDATO";"NM_SOCIAL_CANDIDATO";"CD_SITUACAO_CANDIDATURA";"DS_SITUACAO_CANDIDATURA";"CD_DETALHE_SITUACAO_CAND";"DS_DETALHE_SITUACAO_CAND";"CD_SITUACAO_JULGAMENTO";"DS_SITUACAO_JULGAMENTO";"CD_SITUACAO_CASSACAO";"DS_SITUACAO_CASSACAO";"CD_SITUACAO_DCONST_DIPLOMA";"DS_SITUACAO_DCONST_DIPLOMA";"TP_AGREMIACAO";"NR_PARTIDO";"SG_PARTIDO";"NM_PARTIDO";"NR_FEDERACAO";"NM_FEDERACAO";"SG_FEDERACAO";"DS_COMPOSICAO_FEDERACAO";"SQ_COLIGACAO";"NM_COLIGACAO";"DS_COMPOSICAO_COLIGACAO";"ST_VOTO_EM_TRANSITO";"QT_VOTOS_NOMINAIS";"NM_TIPO_DESTINACAO_VOTOS";"QT_VOTOS_NOMINAIS_VALIDOS";"CD_SIT_TOT_TURNO";"DS_SIT_TOT_TURNO"';
const LINHA_CANDIDATO =
  '"18/10/2026";"19:31:39";2026;2;"Eleição Ordinária";1;6257;"ELEIÇÃO GERAL FEDERAL 2026";"04/10/2026";"F";"MT";"BR";"BRASIL";90050;"ALTO ARAGUAIA";8;1;"Presidente";280002542548;13;"LUIZ INÁCIO LULA DA SILVA";"LULA";"#NULO";-3;"#NE";-3;"#NE";2;"DEFERIDO";-1;"#NULO";-1;"#NULO";"COLIGAÇÃO";13;"PT";"PARTIDO DOS TRABALHADORES";101;"FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL";"PT/PC do B/PV";"PCDOB / PT / PV";280001800617;"BRASIL PRONTO PRA MAIS";"PSB; PDT";"N";2478;"Válido";2478;6;"2º TURNO"';

const CABECALHO_DETALHE =
  '"DT_GERACAO";"HH_GERACAO";"ANO_ELEICAO";"CD_TIPO_ELEICAO";"NM_TIPO_ELEICAO";"NR_TURNO";"CD_ELEICAO";"DS_ELEICAO";"DT_ELEICAO";"TP_ABRANGENCIA";"SG_UF";"SG_UE";"NM_UE";"CD_MUNICIPIO";"NM_MUNICIPIO";"NR_ZONA";"CD_CARGO";"DS_CARGO";"QT_APTOS";"QT_SECOES_PRINCIPAIS";"QT_SECOES_AGREGADAS";"QT_SECOES_NAO_INSTALADAS";"QT_TOTAL_SECOES";"QT_COMPARECIMENTO";"QT_ELEITORES_SECOES_NAO_INSTALADAS";"QT_ABSTENCOES";"ST_VOTO_EM_TRANSITO";"QT_VOTOS";"QT_VOTOS_CONCORRENTES";"QT_TOTAL_VOTOS_VALIDOS";"QT_VOTOS_NOMINAIS_VALIDOS";"QT_TOTAL_VOTOS_LEG_VALIDOS";"QT_VOTOS_LEG_VALIDOS";"QT_VOTOS_NOM_CONVR_LEG_VALIDOS";"QT_TOTAL_VOTOS_ANULADOS";"QT_VOTOS_NOMINAIS_ANULADOS";"QT_VOTOS_LEGENDA_ANULADOS";"QT_TOTAL_VOTOS_ANUL_SUBJUD";"QT_VOTOS_NOMINAIS_ANUL_SUBJUD";"QT_VOTOS_LEGENDA_ANUL_SUBJUD";"QT_VOTOS_BRANCOS";"QT_TOTAL_VOTOS_NULOS";"QT_VOTOS_NULOS";"QT_VOTOS_NULOS_TECNICOS";"QT_VOTOS_ANULADOS_APU_SEP";"HH_ULTIMA_TOTALIZACAO";"DT_ULTIMA_TOTALIZACAO"';
const LINHA_DETALHE =
  '"18/10/2026";"16:32:58";2026;2;"Eleição Ordinária";1;6257;"Eleição Geral Federal 2026";"04/10/2026";"F";"AC";"BR";"BRASIL";"01023";"PORTO ACRE";1;1;"Presidente";14284;60;3;0;63;11609;0;2675;"N";11609;11128;11128;11128;0;0;0;0;0;0;0;0;0;124;357;356;1;0;"19:11:27";"04/10/2026"';

describe("lerVotacaoCandidatoMunzona", () => {
  it("lê os votos válidos por candidato, município e zona, com acentos e aspas", () => {
    const linhas = lerVotacaoCandidatoMunzona(latin1(`${CABECALHO_CANDIDATO}\r\n${LINHA_CANDIDATO}\r\n`));

    expect(linhas).toEqual([
      {
        geracao: "18/10/2026 19:31:39",
        ano: 2026,
        turno: 1,
        cargo: 1,
        uf: "MT",
        municipio: 90050,
        nomeMunicipio: "ALTO ARAGUAIA",
        zona: 8,
        numero: 13,
        nome: "LUIZ INÁCIO LULA DA SILVA",
        nomeUrna: "LULA",
        partido: "PT",
        votos: 2478,
        dia: "2026-10-04",
      },
    ]);
  });

  it("lê os arquivos de 2002 a 2014, que só têm QT_VOTOS_NOMINAIS: todo voto nominal para Presidente é válido", () => {
    // Cabeçalho e linha copiados do `votacao_candidato_munzona_2002_BR.csv` gerado em 18/03/2022.
    const cabecalho =
      '"DT_GERACAO";"HH_GERACAO";"ANO_ELEICAO";"CD_TIPO_ELEICAO";"NM_TIPO_ELEICAO";"NR_TURNO";"CD_ELEICAO";"DS_ELEICAO";"DT_ELEICAO";"TP_ABRANGENCIA";"SG_UF";"SG_UE";"NM_UE";"CD_MUNICIPIO";"NM_MUNICIPIO";"NR_ZONA";"CD_CARGO";"DS_CARGO";"SQ_CANDIDATO";"NR_CANDIDATO";"NM_CANDIDATO";"NM_URNA_CANDIDATO";"NM_SOCIAL_CANDIDATO";"CD_SITUACAO_CANDIDATURA";"DS_SITUACAO_CANDIDATURA";"CD_DETALHE_SITUACAO_CAND";"DS_DETALHE_SITUACAO_CAND";"TP_AGREMIACAO";"NR_PARTIDO";"SG_PARTIDO";"NM_PARTIDO";"SQ_COLIGACAO";"NM_COLIGACAO";"DS_COMPOSICAO_COLIGACAO";"CD_SIT_TOT_TURNO";"DS_SIT_TOT_TURNO";"ST_VOTO_EM_TRANSITO";"QT_VOTOS_NOMINAIS"';
    const linha =
      '"18/03/2022";"13:18:59";"2002";2;"Eleição Ordinária";1;200201;"ELEIÇÕES GERAIS 2002 PRIMEIRO TURNO";"06/10/2002";"F";"AC";"BR";"BRASIL";"01120";"ACRELANDIA";8;1;"Presidente";9568;23;"CIRO FERREIRA GOMES";"CIRO";"#NE";12;"APTO";2;"DEFERIDO";"Coligação";23;"PPS";"Partido Popular Socialista";9;"COLIGAÇÃO  FRENTE TRABALHISTA ";"PPS / PDT / PTB";4;"NÃO ELEITO";"N";503';
    expect(lerVotacaoCandidatoMunzona(latin1(`${cabecalho}\r\n${linha}\r\n`))).toEqual([
      {
        geracao: "18/03/2022 13:18:59",
        ano: 2002,
        turno: 1,
        cargo: 1,
        uf: "AC",
        municipio: 1120,
        nomeMunicipio: "ACRELANDIA",
        zona: 8,
        numero: 23,
        nome: "CIRO FERREIRA GOMES",
        nomeUrna: "CIRO",
        partido: "PPS",
        votos: 503,
        dia: "2002-10-06",
      },
    ]);
  });

  it("acha a coluna dos válidos com espaço no nome e não troca pelos nominais num arquivo de 2018 em diante", () => {
    const comEspaco = CABECALHO_CANDIDATO.replace('"QT_VOTOS_NOMINAIS_VALIDOS"', '"QT_VOTOS_NOMINAIS_VALIDOS "');
    const anulado = LINHA_CANDIDATO.replace('"N";2478;"Válido";2478', '"N";2478;"Anulado";0');
    expect(lerVotacaoCandidatoMunzona(latin1(`${comEspaco}\n${anulado}\n`))[0]!.votos).toBe(0);
    const semValidos = CABECALHO_CANDIDATO.replace('"QT_VOTOS_NOMINAIS_VALIDOS"', '"QT_OUTRA_COISA"');
    expect(() => lerVotacaoCandidatoMunzona(latin1(`${semValidos}\n${LINHA_CANDIDATO}\n`))).toThrow(/QT_VOTOS_NOMINAIS_VALIDOS/);
  });
});

describe("lerDetalheVotacaoMunzona", () => {
  it("lê aptos, votantes, válidos, brancos, nulos (com os técnicos) e seções", () => {
    const linhas = lerDetalheVotacaoMunzona(latin1(`${CABECALHO_DETALHE}\n${LINHA_DETALHE}\n`));

    expect(linhas).toEqual([
      {
        geracao: "18/10/2026 16:32:58",
        ano: 2026,
        turno: 1,
        cargo: 1,
        uf: "AC",
        municipio: 1023,
        nomeMunicipio: "PORTO ACRE",
        zona: 1,
        aptos: 14284,
        votantes: 11609,
        abstencoes: 2675,
        validos: 11128,
        brancos: 124,
        nulos: 357,
        secoes: 63,
      },
    ]);
  });

  it("falha com o nome da coluna quando o TSE muda o formato", () => {
    const semColuna = CABECALHO_DETALHE.replace('"QT_APTOS"', '"QT_ELEITORES"');

    expect(() => lerDetalheVotacaoMunzona(latin1(`${semColuna}\n${LINHA_DETALHE}\n`))).toThrow(/QT_APTOS/);
  });
});
