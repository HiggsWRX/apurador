import { describe, expect, it } from "vitest";
import { lerHistoricoDeTotalizacao } from "../src/index.ts";

// Cabeçalho e linhas copiados de `Historico_Totalizacao_Presidente_BR_2T_2022.csv`: campos alinhados com
// espaços, sem aspas, e percentuais com vírgula.
const latin1 = (texto: string) => new Uint8Array(Buffer.from(texto, "latin1"));

const CABECALHO =
  " CD_PLEITO;CD_ELEICAO;  CD_CARGO;SG_UE_UF;DT_TOTALIZACAO     ;QT_SECOES_TOTAL;QT_APTOS_TOTAL;QT_SECOES_TOT;QT_SECOES_TOT_ACUMULADO;PE_SECOES_TOT_ACUMULADO                      ;QT_APTOS_TOT;QT_APTOS_TOT_ACUMULADO;QT_VOTOS_TOTAL;QT_VOTOS_TOTAL_ACUMULADO;QT_VOTOS_CONCORRENTES;QT_VOTOS_CONCORRENTES_ACUMULADO;LULA_QT_VOTOS_TOT;LULA_QT_VOTOS_TOT_ACUMULADO;LULA_PE_VOTOS_TOT_ACUMULADO                  ;JAIR_BOLSONARO_QT_VOTOS_TOT;JAIR_BOLSONARO_QT_VOTOS_TOT_ACUMULADO;JAIR_BOLSONARO_PE_VOTOS_TOT_ACUMULADO        ;BRANCO_QT_VOTOS_TOT;BRANCO_QT_VOTOS_TOT_ACUMULADO;BRANCO_PE_VOTOS_TOT_ACUMULADO                ;NULO_QT_VOTOS_TOT;NULO_QT_VOTOS_TOT_ACUMULADO;NULO_PE_VOTOS_TOT_ACUMULADO";
const VIRADA =
  "       407;       545;         1;BR      ;30/10/2022 18:44:04;         472075;     156454011;           40;                 319895;                                     0,677636;       13064;             105586139;         10805;                83913757;                10511;                       80157552;             3362;                   40083190;                                     0,500055;                       7149;                             40074362;                                     0,499945;                124;                      1175640;                                     0,014010;              170;                    2580565;                                     0,030753";

describe("lerHistoricoDeTotalizacao", () => {
  it("lê o acumulado de cada instante de totalização, com os votos de cada candidato pelo nome de urna", () => {
    const linhas = lerHistoricoDeTotalizacao(latin1(`${CABECALHO}\r\n${VIRADA}\r\n`));

    expect(linhas).toEqual([
      {
        totalizacao: "2022-10-30 18:44:04",
        secoes: 319_895,
        totalDeSecoes: 472_075,
        aptos: 105_586_139,
        votos: 83_913_757,
        validos: 80_157_552,
        brancos: 1_175_640,
        nulos: 2_580_565,
        candidatos: { LULA: 40_083_190, "JAIR BOLSONARO": 40_074_362 },
      },
    ]);
  });
});
