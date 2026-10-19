import { describe, expect, it } from "vitest";
import { lerBoletimDeUrna, lerDetalheVotacaoSecao } from "../src/index.ts";

// Cabeçalhos e linhas copiados dos arquivos reais de 2022 (`detalhe_votacao_secao_2022_BR.csv` e
// `bweb_2t_AC_311020221535.csv`), em Latin-1, como o TSE publica.
const latin1 = (texto: string) => new Uint8Array(Buffer.from(texto, "latin1"));

const CABECALHO_DETALHE =
  '"DT_GERACAO";"HH_GERACAO";"ANO_ELEICAO";"CD_TIPO_ELEICAO";"NM_TIPO_ELEICAO";"NR_TURNO";"CD_ELEICAO";"DS_ELEICAO";"DT_ELEICAO";"TP_ABRANGENCIA";"SG_UF";"SG_UE";"NM_UE";"CD_MUNICIPIO";"NM_MUNICIPIO";"NR_ZONA";"NR_SECAO";"CD_CARGO";"DS_CARGO";"QT_APTOS";"QT_COMPARECIMENTO";"QT_ABSTENCOES";"QT_VOTOS_NOMINAIS";"QT_VOTOS_BRANCOS";"QT_VOTOS_NULOS";"QT_VOTOS_LEGENDA";"QT_VOTOS_ANULADOS_APU_SEP";"NR_LOCAL_VOTACAO";"NM_LOCAL_VOTACAO";"DS_LOCAL_VOTACAO_ENDERECO";"DT_RECEBIMENTO_BU_HOR_TSE";"DT_PRIM_TOT_PARCIAL_HOR_TSE";"DS_ORIGEM_VOTO";"ST_SECAO_INSTALADA";"ST_SECAO_ANULADA";"CD_MODELO_URNA";"DS_MODELO_URNA"';
const SECAO_DO_RIO =
  '"15/02/2024";"15:56:11";2022;2;"Eleição Ordinária";2;545;"Eleição Geral Federal 2022";"30/10/2022";"F";"RJ";"BR";"BRASIL";60011;"RIO DE JANEIRO";14;428;1;"Presidente";338;236;102;221;6;9;0;0;1759;"PARÓQUIA NOSSA SENHORA DO AMPARO E SANTA MARIA GORETTI";"AV. DOM HÉLDER CÂMARA, 9887";"30/10/2022 18:36:14";"30/10/2022 18:36:47";"Urna Eletrônica";"Sim";"Não";"2020";"UE 2020"';
const SECAO_NAO_INSTALADA =
  '"15/02/2024";"15:56:11";2022;2;"Eleição Ordinária";2;545;"Eleição Geral Federal 2022";"30/10/2022";"F";"ZZ";"BR";"BRASIL";30988;"SARAJEVO";1;1354;1;"Presidente";1;0;0;0;0;0;0;0;1040;"CANTÃO DE ZENICA-DOBOJ";"EMBAIXADA DE SARAVEJO";"30/10/2022 18:02:31";"30/10/2022 18:02:59";"Totalização";"Não";"Não";"-1";"#NULO#"';

const CABECALHO_BWEB =
  '"DT_GERACAO";"HH_GERACAO";"ANO_ELEICAO";"CD_TIPO_ELEICAO";"NM_TIPO_ELEICAO";"CD_PLEITO";"DT_PLEITO";"NR_TURNO";"CD_ELEICAO";"DS_ELEICAO";"SG_UF";"CD_MUNICIPIO";"NM_MUNICIPIO";"NR_ZONA";"NR_SECAO";"NR_LOCAL_VOTACAO";"CD_CARGO_PERGUNTA";"DS_CARGO_PERGUNTA";"NR_PARTIDO";"SG_PARTIDO";"NM_PARTIDO";"DT_BU_RECEBIDO";"QT_APTOS";"QT_COMPARECIMENTO";"QT_ABSTENCOES";"CD_TIPO_URNA";"DS_TIPO_URNA";"CD_TIPO_VOTAVEL";"DS_TIPO_VOTAVEL";"NR_VOTAVEL";"NM_VOTAVEL";"QT_VOTOS";"NR_URNA_EFETIVADA";"CD_CARGA_1_URNA_EFETIVADA";"CD_CARGA_2_URNA_EFETIVADA";"CD_FLASHCARD_URNA_EFETIVADA";"DT_CARGA_URNA_EFETIVADA";"DS_CARGO_PERGUNTA_SECAO";"DS_AGREGADAS";"DT_ABERTURA";"DT_ENCERRAMENTO";"QT_ELEITORES_BIOMETRIA_NH";"DT_EMISSAO_BU";"NR_JUNTA_APURADORA";"NR_TURMA_APURADORA"';
const VOTO_NOMINAL =
  '"31/10/2022";"15:35:43";"2022";"0";"Eleição Ordinária";"407";"30/10/2022";"2";"545";"Eleição Geral Federal 2022";"AC";"1392";"RIO BRANCO";"1";"3";"1279";"1";"Presidente";"13";"PT";"Partido dos Trabalhadores";"30/10/2022 17:34:43";"185";"147";"38";"1";"APURADA";"1";"Nominal";"13";"LULA";"48";"2046404";"428.953.752.256.007.171.";"487.308";"90FF9DFC";"23/09/2022 08:44:00";"1 - 3";"#NULO#";"30/10/2022 06:01:16";"30/10/2022 15:00:59";"9";"30/10/2022 15:04:47";"-1";"-1"';
const VOTO_NULO =
  '"31/10/2022";"15:35:43";"2022";"0";"Eleição Ordinária";"407";"30/10/2022";"2";"545";"Eleição Geral Federal 2022";"AC";"1392";"RIO BRANCO";"1";"3";"1279";"1";"Presidente";"-1";"#NULO#";"#NULO#";"30/10/2022 17:34:43";"185";"147";"38";"1";"APURADA";"3";"Nulo";"96";"Nulo";"1";"2046404";"428.953.752.256.007.171.";"487.308";"90FF9DFC";"23/09/2022 08:44:00";"1 - 3";"#NULO#";"30/10/2022 06:01:16";"30/10/2022 15:00:59";"9";"30/10/2022 15:04:47";"-1";"-1"';

describe("lerDetalheVotacaoSecao", () => {
  it("lê cada seção com os totais e a hora da primeira totalização, em hora de Brasília", () => {
    const secoes = [...lerDetalheVotacaoSecao(latin1(`${CABECALHO_DETALHE}\r\n${SECAO_DO_RIO}\r\n`))];

    expect(secoes).toEqual([
      {
        geracao: "15/02/2024 15:56:11",
        ano: 2022,
        turno: 2,
        dataDaEleicao: "2022-10-30",
        cargo: 1,
        uf: "RJ",
        municipio: 60011,
        zona: 14,
        secao: 428,
        aptos: 338,
        votantes: 236,
        nominais: 221,
        brancos: 6,
        nulos: 9,
        primeiraTotalizacao: "2022-10-30 18:36:47",
        instalada: true,
      },
    ]);
  });

  it("lê a seção não instalada, que tem hora de totalização mas nenhum votante", () => {
    const [secao] = [...lerDetalheVotacaoSecao(latin1(`${CABECALHO_DETALHE}\n${SECAO_NAO_INSTALADA}\n`))];

    expect(secao).toMatchObject({ uf: "ZZ", municipio: 30988, aptos: 1, votantes: 0, primeiraTotalizacao: "2022-10-30 18:02:59", instalada: false });
  });

  it("não se perde quando um texto entre aspas tem ponto e vírgula ou aspas dobradas", () => {
    const comEndereco = SECAO_DO_RIO.replace('"AV. DOM HÉLDER CÂMARA, 9887"', '"AV. ""DOM HÉLDER""; LOJA 2\nFUNDOS"');

    const [secao] = [...lerDetalheVotacaoSecao(latin1(`${CABECALHO_DETALHE}\n${comEndereco}\n${SECAO_NAO_INSTALADA}`))];

    expect(secao).toMatchObject({ secao: 428, primeiraTotalizacao: "2022-10-30 18:36:47", instalada: true });
  });

  it("falha com o nome da coluna quando o TSE muda o formato", () => {
    const semColuna = CABECALHO_DETALHE.replace('"DT_PRIM_TOT_PARCIAL_HOR_TSE"', '"DT_TOTALIZACAO"');

    expect(() => [...lerDetalheVotacaoSecao(latin1(`${semColuna}\n${SECAO_DO_RIO}\n`))]).toThrow(/DT_PRIM_TOT_PARCIAL_HOR_TSE/);
  });
});

describe("lerBoletimDeUrna", () => {
  it("lê os votos de cada votável por seção, com o tipo do votável", () => {
    const votos = [...lerBoletimDeUrna(latin1(`${CABECALHO_BWEB}\r\n${VOTO_NOMINAL}\r\n${VOTO_NULO}\r\n`))];

    const daSecao = { geracao: "31/10/2022 15:35:43", ano: 2022, turno: 2, cargo: 1, uf: "AC", municipio: 1392, zona: 1, secao: 3 };
    expect(votos).toEqual([
      { ...daSecao, tipo: "nominal", numero: 13, votos: 48 },
      { ...daSecao, tipo: "nulo", numero: 96, votos: 1 },
    ]);
  });
});
