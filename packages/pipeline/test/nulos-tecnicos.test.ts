import { lerBoletimDeUrna, lerDetalheVotacaoSecao } from "@apurador/tse";
import { describe, expect, it } from "vitest";
import { reconstruirNoite, reproduzir } from "../src/noite.ts";
import type { CandidatoDoTurno } from "../src/turno.ts";

// Uma seção real do 1º turno de 2026 com voto no 28 (Leonardo Avalanche, PRTB), cujo registro foi indeferido:
// Sena Madureira (AC), zona 3, seção 169, copiada do `bweb_1t_AC_051020261403.csv` e do
// `detalhe_votacao_secao_2026_BR.csv`. O detalhe conta esse voto entre os nominais. No resultado oficial por
// município e zona, os 23 votos no 28 do Acre são os 23 nulos técnicos do estado.
const latin1 = (texto: string) => new Uint8Array(Buffer.from(texto, "latin1"));

const CABECALHO_BWEB =
  '"DT_GERACAO";"HH_GERACAO";"ANO_ELEICAO";"CD_TIPO_ELEICAO";"NM_TIPO_ELEICAO";"CD_PLEITO";"DT_PLEITO";"NR_TURNO";"CD_ELEICAO";"DS_ELEICAO";"SG_UF";"CD_MUNICIPIO";"NM_MUNICIPIO";"NR_ZONA";"NR_SECAO";"NR_LOCAL_VOTACAO";"CD_CARGO_PERGUNTA";"DS_CARGO_PERGUNTA";"NR_PARTIDO";"SG_PARTIDO";"NM_PARTIDO";"DT_BU_RECEBIDO";"QT_APTOS";"QT_COMPARECIMENTO";"QT_ABSTENCOES";"CD_TIPO_URNA";"DS_TIPO_URNA";"CD_TIPO_VOTAVEL";"DS_TIPO_VOTAVEL";"NR_VOTAVEL";"NM_VOTAVEL";"QT_VOTOS";"NR_URNA_EFETIVADA";"CD_CARGA_1_URNA_EFETIVADA";"CD_CARGA_2_URNA_EFETIVADA";"CD_FLASHCARD_URNA_EFETIVADA";"DT_CARGA_URNA_EFETIVADA";"DS_CARGO_PERGUNTA_SECAO";"DS_SECOES_AGREGADAS";"DT_ABERTURA";"DT_ENCERRAMENTO";"QT_ELEI_BIOM_SEM_HABILITACAO";"DT_EMISSAO_BU";"NR_JUNTA_APURADORA";"NR_TURMA_APURADORA"';
const daSecao = (partido: string, tipo: string, votavel: string, votos: number) =>
  `"05/10/2026";"14:03:43";2026;0;"Eleição Ordinária";3220;"2026-10-04 00:00:00";1;6257;"Eleição Geral Federal 2026";"AC";1457;"SENA MADUREIRA";3;169;1597;1;"Presidente";${partido};"2026-10-04 18:48:43";192;157;35;1;"Apurada";${tipo};${votavel};${votos};2048156;"631.896.131.365.836.242.";"125.162";"0BE81B21";"2026-09-23 18:38:00";"1 - 169";"#NULO#";"2026-10-04 06:16:04";"2026-10-04 15:01:27";"15";"2026-10-04 15:05:49";"-1";"-1"`;
const BWEB = [
  daSecao('70;"AVANTE";"AVANTE"', '1;"Nominal"', '70;"ESCRITOR AUGUSTO CURY"', 2),
  daSecao('28;"PRTB";"PARTIDO RENOVADOR TRABALHISTA BRASILEIRO"', '1;"Nominal"', '28;"LEONARDO AVALANCHE"', 1),
  daSecao('13;"PT";"PARTIDO DOS TRABALHADORES"', '1;"Nominal"', '13;"LULA"', 16),
  daSecao('-1;"#NULO#";"#NULO#"', '3;"Nulo"', '96;"Nulo"', 9),
  daSecao('-1;"#NULO#";"#NULO#"', '2;"Branco"', '95;"Branco"', 1),
  daSecao('55;"PSD";"PARTIDO SOCIAL DEMOCRÁTICO"', '1;"Nominal"', '55;"RONALDO CAIADO"', 5),
  daSecao('22;"PL";"PARTIDO LIBERAL"', '1;"Nominal"', '22;"FLAVIO BOLSONARO"', 123),
];

const CABECALHO_DETALHE =
  '"DT_GERACAO";"HH_GERACAO";"ANO_ELEICAO";"CD_TIPO_ELEICAO";"NM_TIPO_ELEICAO";"NR_TURNO";"CD_ELEICAO";"DS_ELEICAO";"DT_ELEICAO";"TP_ABRANGENCIA";"SG_UF";"SG_UE";"NM_UE";"CD_MUNICIPIO";"NM_MUNICIPIO";"NR_ZONA";"NR_SECAO";"CD_CARGO";"DS_CARGO";"QT_APTOS";"QT_COMPARECIMENTO";"QT_ABSTENCOES";"QT_VOTOS_NOMINAIS";"QT_VOTOS_BRANCOS";"QT_VOTOS_NULOS";"QT_VOTOS_LEGENDA";"QT_VOTOS_ANULADOS_APU_SEP";"NR_LOCAL_VOTACAO";"NM_LOCAL_VOTACAO";"DS_LOCAL_VOTACAO_ENDERECO";"DT_RECEBIMENTO_BU_HOR_TSE";"DT_PRIM_TOT_PARCIAL_HOR_TSE";"DS_ORIGEM_VOTO";"ST_SECAO_INSTALADA";"ST_SECAO_ANULADA";"CD_MODELO_URNA";"DS_MODELO_URNA"';
const DETALHE =
  '"05/10/2026";"14:03:30";2026;2;"Eleição Ordinária";1;6257;"Eleição Geral Federal 2026";"04/10/2026";"F";"AC";"BR";"BRASIL";1457;"SENA MADUREIRA";3;169;1;"Presidente";192;157;35;147;1;9;0;0;1597;"ESCOLA MARIA GORETE DAVILA - RAMAL DO CORDEIRO";"KM 25 DA BR 364 - SENTIDO SENA MADUREIRA, RIO BRANCO";"04/10/2026 18:48:43";"04/10/2026 18:54:36";"Urna Eletrônica";"Sim";"Não";"2020";"UE 2020"';

// Os candidatos válidos do turno que aparecem na seção; o 28 não está entre eles.
const CANDIDATOS: CandidatoDoTurno[] = [
  { numero: 22, nome: "FLAVIO NANTES BOLSONARO", nomeUrna: "FLAVIO BOLSONARO", partido: "PL" },
  { numero: 13, nome: "LUIZ INÁCIO LULA DA SILVA", nomeUrna: "LULA", partido: "PT" },
  { numero: 70, nome: "AUGUSTO JORGE CURY", nomeUrna: "ESCRITOR AUGUSTO CURY", partido: "AVANTE" },
  { numero: 55, nome: "RONALDO RAMOS CAIADO", nomeUrna: "RONALDO CAIADO", partido: "PSD" },
];

describe("os nulos técnicos", () => {
  it("o voto no 28 numa seção real do 1º turno de 2026 conta como nulo, e não como válido", () => {
    const noite = reconstruirNoite({
      ano: 2026,
      turno: 1,
      candidatos: CANDIDATOS,
      secoes: lerDetalheVotacaoSecao(latin1(`${CABECALHO_DETALHE}\r\n${DETALHE}\r\n`)),
      votos: lerBoletimDeUrna(latin1(`${CABECALHO_BWEB}\r\n${BWEB.join("\r\n")}\r\n`)),
    });
    const r = reproduzir(noite);

    r.avancarAte(Infinity);

    expect(r.apurado()).toMatchObject({ secoes: 1, aptos: 192, votantes: 157, brancos: 1, nulos: 10, votos: [123, 16, 2, 5] });
  });
});
