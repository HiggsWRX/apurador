import { describe, expect, it } from "vitest";
import { boletimDeUrna, lerBoletimDeUrna, lerDetalheVotacaoSecao, lerVotacaoSecao, votacaoSecao } from "../src/index.ts";

// Cabeçalhos e linhas copiados dos arquivos reais do TSE (os de 2022 são `detalhe_votacao_secao_2022_BR.csv` e
// `bweb_2t_AC_311020221535.csv`; os de 2018 e 2026 dizem de onde vêm), em Latin-1, como o TSE publica.
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

  it("lê a seção de 2018, em que o TSE não diz se ela foi instalada", () => {
    // De `detalhe_votacao_secao_2018_BR.csv`, que tem o mesmo cabeçalho do de 2022.
    const SECAO_DE_SAO_LUIS =
      '"15/02/2024";"16:19:02";2018;2;"Eleição Ordinária";2;296;"Eleição Geral Federal 2018";"28/10/2018";"F";"MA";"BR";"BRASIL";9210;"SÃO LUÍS";10;713;1;"Presidente";390;313;77;294;6;13;0;0;2062;"U.E.B PROFESSOR LUIS REGO";"RUA 13 DE MAIO, 100";"28/10/2018 18:35:55";"28/10/2018 18:37:11";"#NULO#";"#NULO#";"#NULO#";"-1";"#NULO#"';

    const [secao] = [...lerDetalheVotacaoSecao(latin1(`${CABECALHO_DETALHE}\n${SECAO_DE_SAO_LUIS}\n`))];

    expect(secao).toMatchObject({ ano: 2018, turno: 2, dataDaEleicao: "2018-10-28", uf: "MA", municipio: 9210, votantes: 313, primeiraTotalizacao: "2018-10-28 18:37:11", instalada: null });
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

  // De `bweb_2t_AC_301020181744.csv`, com o cabeçalho dos boletins de 2018.
  const CABECALHO_2018 =
    '"DT_GERACAO";"HH_GERACAO";"ANO_ELEICAO";"CD_PLEITO";"DT_PLEITO";"NR_TURNO";"CD_ELEICAO";"DS_ELEICAO";"DT_ELEICAO";"SG_ UF";"CD_MUNICIPIO";"NM_MUNICIPIO";"NR_ZONA";"NR_SECAO";"NR_LOCAL_VOTACAO";"CD_CARGO_PERGUNTA";"DS_CARGO_PERGUNTA";"NR_PARTIDO";"SG_PARTIDO";"NM_PARTIDO";"QT_APTOS";"QT_COMPARECIMENTO";"QT_ABSTENCOES";"CD_TIPO_URNA";"DS_TIPO_URNA";"CD_TIPO_VOTAVEL";"DS_TIPO_VOTAVEL";"NR_VOTAVEL";"NM_VOTAVEL";"QT_VOTOS";"NR_URNA_EFETIVADA";"CD_CARGA_1_URNA_EFETIVADA";"CD_CARGA_2_URNA_EFETIVADA";"CD_FLASCARD_URNA_EFETIVADA";"DT_CARGA_URNA_EFETIVADA";"DS_CARGO_PERGUNTA_SECAO";"DS_AGREGADAS";"DT_ABERTURA";"DT_ENCERRAMENTO";"QT_ELEITORES_BIOMETRIA_NH";"NR_JUNTA_APURADORA";"NR_TURMA_APURADORA"';

  it("lê o boletim de 2018, que tem a coluna de UF com espaço e o município com zero à esquerda", () => {
    const VOTO_BRANCO_2018 =
      '"30/10/2018";"17:44:27";"2018";"229";"28/10/2018";"2";"296";"Eleição Geral Federal 2018";"28/10/2018";"AC";"01007";"BUJARI";"9";"1";"1104";"1";"Presidente";"#NULO#";"#NULO#";"#NULO#";"346";"275";"71";"1";"Apurada";"2";"Branco";"95";"Branco";"1";"1762466";"138.512.240.315.942.378.";"174.217";"632C5110";"29/09/2018 14:30:00";"1 - 1";"#NULO#";"28/10/2018 08:00:00";"28/10/2018 17:00:46";"7";"#NULO#";"#NULO#"';

    const votos = [...lerBoletimDeUrna(latin1(`${CABECALHO_2018}\n${VOTO_BRANCO_2018}\n`))];

    expect(votos).toEqual([{ geracao: "30/10/2018 17:44:27", ano: 2018, turno: 2, cargo: 1, uf: "AC", municipio: 1007, zona: 9, secao: 1, tipo: "branco", numero: 95, votos: 1 }]);
  });

  it("pula a seção sem nenhum voto, que o boletim de 2018 traz sem votável, mas não um voto sem votável", () => {
    // De `bweb_2t_DF_301020181747.csv`: uma seção de Brasília sem eleitores, na pergunta de Governador.
    const SECAO_SEM_VOTOS =
      '"30/10/2018";"17:47:36";"2018";"229";"28/10/2018";"2";"298";"Eleições Gerais Estaduais 2018";"28/10/2018";"DF";"97012";"BRASÍLIA";"1";"679";"2160";"3";"#NULO#";"#NULO#";"#NULO#";"#NULO#";"0";"0";"0";"1";"Apurada";"#NULO#";"#NULO#";"#NULO#";"#NULO#";"0";"1154057";"241.535.264.981.228.172.";"013.953";"F3787AC7";"27/09/2018 08:21:00";"#NULO#";"#NULO#";"28/10/2018 08:00:00";"28/10/2018 17:04:18";"20";"#NULO#";"#NULO#"';
    const comVotos = SECAO_SEM_VOTOS.replace('"#NULO#";"0";"1154057"', '"#NULO#";"3";"1154057"');

    expect([...lerBoletimDeUrna(latin1(`${CABECALHO_2018}\n${SECAO_SEM_VOTOS}\n`))]).toEqual([]);
    expect(() => [...lerBoletimDeUrna(latin1(`${CABECALHO_2018}\n${comVotos}\n`))]).toThrow(/CD_TIPO_VOTAVEL/);
  });
});

describe("lerVotacaoSecao", () => {
  // De `votacao_secao_2026_BR.csv`, que traz só Presidente e não diz o tipo do votável.
  const CABECALHO =
    '"DT_GERACAO";"HH_GERACAO";"ANO_ELEICAO";"CD_TIPO_ELEICAO";"NM_TIPO_ELEICAO";"NR_TURNO";"CD_ELEICAO";"DS_ELEICAO";"DT_ELEICAO";"TP_ABRANGENCIA";"SG_UF";"SG_UE";"NM_UE";"CD_MUNICIPIO";"NM_MUNICIPIO";"NR_ZONA";"NR_SECAO";"CD_CARGO";"DS_CARGO";"NR_VOTAVEL";"NM_VOTAVEL";"QT_VOTOS";"NR_LOCAL_VOTACAO";"SQ_CANDIDATO";"NM_LOCAL_VOTACAO";"DS_LOCAL_VOTACAO_ENDERECO"';
  const LINHAS = [
    '"06/10/2026";"14:03:43";2026;2;"Eleição Ordinária";1;6257;"Eleição Geral Federal 2026";"04/10/2026";"F";"RS";"BR";"BRASIL";86363;"BARRA DO GUARITA";101;105;1;"Presidente";13;"LUIZ INÁCIO LULA DA SILVA";129;1074;280002542548;"ESC. EST. JOAO LEOPOLDO VOGT";"AV. TEN. PORTELA, 286"',
    '"06/10/2026";"14:03:43";2026;2;"Eleição Ordinária";1;6257;"Eleição Geral Federal 2026";"04/10/2026";"F";"RS";"BR";"BRASIL";88153;"RIO GRANDE";37;433;1;"Presidente";95;"VOTO BRANCO";11;1414;-1;"ESCOLA MUNICIPAL DE ENSINO FUNDAMENTAL PROFESSOR MANOEL MARTINS MANO";"RUA ENGENHEIRO JOÃO KRAMER DE LIMA, S/N"',
    '"06/10/2026";"14:03:43";2026;2;"Eleição Ordinária";1;6257;"Eleição Geral Federal 2026";"04/10/2026";"F";"RS";"BR";"BRASIL";85456;"BOM JESUS";63;32;1;"Presidente";96;"VOTO NULO";1;1341;-1;"E.M.E.I. MARIETA DE OLIVEIRA REIS";"SETE DE SETEMBRO 460"',
    '"06/10/2026";"14:03:43";2026;2;"Eleição Ordinária";1;6257;"Eleição Geral Federal 2026";"04/10/2026";"F";"MA";"BR";"BRASIL";9512;"VITÓRIA DO MEARIM";41;25;1;"Presidente";28;"LEONARDO ALVES DE ARAUJO";1;1120;280002554479;"ESCOLA MUNICIPAL NASSER ASSAD";"BR 222"',
  ];

  it("lê os votos de cada votável por seção, com o branco no 95 e o nulo no 96", () => {
    const votos = [...lerVotacaoSecao(latin1(`${CABECALHO}\n${LINHAS.join("\n")}\n`))];

    const doTurno = { geracao: "06/10/2026 14:03:43", ano: 2026, turno: 1, cargo: 1 };
    expect(votos).toEqual([
      { ...doTurno, uf: "RS", municipio: 86363, zona: 101, secao: 105, tipo: "nominal", numero: 13, votos: 129 },
      { ...doTurno, uf: "RS", municipio: 88153, zona: 37, secao: 433, tipo: "branco", numero: 95, votos: 11 },
      { ...doTurno, uf: "RS", municipio: 85456, zona: 63, secao: 32, tipo: "nulo", numero: 96, votos: 1 },
      // O 28 teve os votos anulados: quem soma os conta como nulos técnicos.
      { ...doTurno, uf: "MA", municipio: 9512, zona: 41, secao: 25, tipo: "nominal", numero: 28, votos: 1 },
    ]);
  });

  it("lê o 97 como voto anulado e apurado em separado, que não é nulo: só duas seções de Salvador o têm, no 1º turno de 2018", () => {
    // De `votacao_secao_2018_BR.csv`. O detalhe por seção e o munzona os contam em `QT_VOTOS_ANULADOS_APU_SEP`.
    const linha =
      '"15/07/2021";"10:53:12";2018;2;"Eleição Ordinária";1;295;"Eleição Geral Federal 2018";"07/10/2018";"F";"BA";"BR";"BRASIL";38490;"SALVADOR";18;328;1;"Presidente";97;"VOTO ANULADO E APURADO EM SEPARADO";383;1376;-1;"CEEPS ANÍSIO TEIXEIRA";"LADEIRA DO PAIVA, N 40  - ZONA URBANA"';

    const [voto] = lerVotacaoSecao(latin1(`${CABECALHO}\n${linha}\n`));

    expect(voto).toMatchObject({ ano: 2018, turno: 1, uf: "BA", municipio: 38490, zona: 18, secao: 328, tipo: "anulado", numero: 97, votos: 383 });
  });

  it("dá o zip de Presidente de um ano e o CSV dele", () => {
    expect(votacaoSecao(2026)).toEqual({
      url: "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2026_BR.zip",
      membro: "votacao_secao_2026_BR.csv",
    });
  });
});

describe("boletimDeUrna", () => {
  it("dá o zip de uma UF num turno, com o CSV dela", () => {
    const { url, membro } = boletimDeUrna({ ano: 2022, turno: 2, uf: "AC", carimbo: "311020221535" });

    expect(url).toBe("https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/buweb/bweb_2t_AC_311020221535.zip");
    expect(["bweb_2t_AC_311020221535.csv", "leiame-boletimurnaweb.pdf"].filter(membro)).toEqual(["bweb_2t_AC_311020221535.csv"]);
  });

  it("dá o zip de 2018, que tem o nome em maiúsculas e um CSV gerado minutos depois", () => {
    const { url, membro } = boletimDeUrna({ ano: 2018, turno: 2, uf: "AL", carimbo: "301020181744" });

    expect(url).toBe("https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2018/buweb/BWEB_2t_AL_301020181744.zip");
    expect(["bweb_2t_AL_301020181745.csv", "leiame-boletimurnaweb.pdf"].filter(membro)).toEqual(["bweb_2t_AL_301020181745.csv"]);
  });
});
