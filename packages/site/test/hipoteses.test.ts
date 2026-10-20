import { REGIOES, type Hipoteses } from "@apurador/modelo";
import { describe, expect, it } from "vitest";
import {
  enderecoDaSimulacao,
  fraseDoQueSeriaPreciso,
  hipotesesProntas,
  lerEndereco,
  mexidas,
  rotuloDoComparecimento,
  rotuloDoVoto,
  traducao,
  type FinalistaDoSimulador,
} from "../src/lib/hipoteses";

// As hipóteses do simulador "e se" como a tela as escreve e o link as guarda (Simulador "e se", decisões 2, 3, 9, 10 e
// 11). Os textos de referência são os das decisões: "Lula +2", "isso dá Lula +4,2 sobre o 1º turno no Nordeste",
// "Para Lula passar à frente, o voto que falta precisaria pender mais 3,2 pontos para ele no país" e "mais de 5 pontos".

/** Os finalistas na ordem da base do modelo de 25/10: o 1º é Flávio. */
const FINALISTAS: [FinalistaDoSimulador, FinalistaDoSimulador] = [
  { nomeUrna: "FLAVIO BOLSONARO", nomeCurto: "Flávio", cor: "flavio" },
  { nomeUrna: "LULA", nomeCurto: "Lula", cor: "lula" },
];

const hipoteses = (h: { brasil?: number; regioes?: Partial<Record<string, number>>; comparecimento?: Partial<Record<string, number>> }): Hipoteses => ({
  voto: { brasil: h.brasil ?? 0, regioes: REGIOES.map((r) => h.regioes?.[r] ?? 0) },
  comparecimento: REGIOES.map((r) => h.comparecimento?.[r] ?? 0),
});

describe("os rótulos das hipóteses", () => {
  it("dão o voto no formato 'Lula +2', pelo nome curto de quem ganha, e o zero como a projeção", () => {
    expect([-2, 1.4, 2.5, -3.2137, 0].map((p) => rotuloDoVoto(p, FINALISTAS))).toEqual([
      "Lula +2",
      "Flávio +1,4",
      "Flávio +2,5",
      "Lula +3,2",
      "Como na projeção",
    ]);
  });

  it("dão o comparecimento em pontos percentuais, e o zero como o modelo espera", () => {
    expect([3, -1, -10, 0].map(rotuloDoComparecimento)).toEqual([
      "+3 pontos percentuais",
      "−1 ponto percentual",
      "−10 pontos percentuais",
      "Como o modelo espera",
    ]);
  });
});

describe("a tradução de cada hipótese em relação ao 1º turno", () => {
  it("compara o resultado da simulação com o placar entre finalistas do 1º turno do lugar", () => {
    // No Nordeste, Flávio teve 32,6% entre os dois no 1º turno: com 28,4% na simulação, Lula ganha 4,2.
    expect(traducao(0.284, 32.61, "no Nordeste", FINALISTAS)).toBe("isso dá Lula +4,2 sobre o 1º turno no Nordeste");
    // No Brasil, 51,0 no 1º turno e a projeção com pesquisas de 51,1
    expect(traducao(0.5112, 51.0, "no Brasil", FINALISTAS)).toBe("isso dá Flávio +0,1 sobre o 1º turno no Brasil");
  });

  it("diz quando fica igual ao 1º turno, nos números como a página os mostra", () => {
    expect(traducao(0.51004, 51.04, "no Brasil", FINALISTAS)).toBe("isso fica igual ao 1º turno no Brasil");
  });
});

describe("o que seria preciso", () => {
  it("diz, para quem está atrás, quanto o voto que falta precisaria pender para ele no país, e o botão aplica esse valor", () => {
    expect(fraseDoQueSeriaPreciso(0.5112, -1.1213, FINALISTAS)).toEqual({
      texto: "Para Lula passar à frente, o voto que falta precisaria pender mais 1,1 ponto para ele no país.",
      aplicar: -1.1213,
    });
    expect(fraseDoQueSeriaPreciso(0.468, 3.2, FINALISTAS)).toEqual({
      texto: "Para Flávio passar à frente, o voto que falta precisaria pender mais 3,2 pontos para ele no país.",
      aplicar: 3.2,
    });
  });

  it("fora da faixa do controle, diz 'mais de 5 pontos', sem botão e nunca 'impossível'", () => {
    for (const preciso of [-6.3, -40, null]) {
      const frase = fraseDoQueSeriaPreciso(0.53, preciso, FINALISTAS);
      expect(frase).toEqual({ texto: "Para Lula passar à frente, o voto que falta precisaria pender mais de 5 pontos para ele no país.", aplicar: null });
      expect(frase.texto).not.toMatch(/imposs/i);
    }
  });

  it("quando o controle do Brasil já pende para quem está atrás além do preciso, diz até onde ele pode pender para o outro", () => {
    // com o Brasil em Flávio +3,5, as regiões pendem tanto para Lula que ele passaria à frente com o Brasil em Flávio +2,9
    expect(fraseDoQueSeriaPreciso(0.503, 2.9, FINALISTAS)).toEqual({
      texto: "Para Lula passar à frente, o voto que falta no país precisaria pender menos de 2,9 pontos para Flávio.",
      aplicar: 2.9,
    });
  });

  it("com os dois empatados na simulação, diz só isso", () => {
    expect(fraseDoQueSeriaPreciso(0.50004, -0.01, FINALISTAS)).toEqual({ texto: "Na simulação, os dois terminam empatados.", aplicar: null });
  });
});

describe("as hipóteses prontas", () => {
  it("são o par simétrico da decisão 9, em ordem alfabética: Flávio +1,4 e Lula +1,4", () => {
    expect(hipotesesProntas(FINALISTAS)).toEqual([
      { rotulo: "As pesquisas subestimam Flávio como no 1º turno", hipoteses: hipoteses({ brasil: 1.4 }) },
      { rotulo: "As pesquisas subestimam Lula na mesma medida", hipoteses: hipoteses({ brasil: -1.4 }) },
    ]);
  });
});

describe("o link compartilhável", () => {
  it("guarda só a base e as hipóteses mexidas, e volta às mesmas hipóteses", () => {
    const h = hipoteses({ brasil: -2, regioes: { Nordeste: -4.5, "Centro-Oeste": 1 }, comparecimento: { Sul: 3, Norte: -2 } });
    const endereco = enderecoDaSimulacao("com-pesquisas", h, FINALISTAS);
    expect(endereco).toBe("?base=com-pesquisas&brasil=lula2&nordeste=lula4.5&centro-oeste=flavio1&comparecimento-norte=-2&comparecimento-sul=3");
    expect(lerEndereco(endereco, FINALISTAS)).toEqual({ base: "com-pesquisas", hipoteses: h, de: null });
    expect(mexidas(h)).toBe(true);
    expect(enderecoDaSimulacao("so-apuracao", hipoteses({}), FINALISTAS)).toBe("?base=so-apuracao");
    expect(mexidas(hipoteses({}))).toBe(false);
  });

  it("guarda o valor aplicado por 'o que seria preciso' com duas casas", () => {
    expect(enderecoDaSimulacao("com-pesquisas", hipoteses({ brasil: -1.121349 }), FINALISTAS)).toBe("?base=com-pesquisas&brasil=lula1.12");
  });

  it("ao abrir, ignora o que não reconhece e põe cada hipótese na faixa do controle dela", () => {
    const lido = lerEndereco("?base=outra&brasil=flavio9&sul=lula12&comparecimento-sudeste=-30&nordeste=bolsonaro2&utm_source=x&de=sp", FINALISTAS);
    expect(lido).toEqual({ base: null, hipoteses: hipoteses({ brasil: 5, regioes: { Sul: -10 }, comparecimento: { Sudeste: -10 } }), de: "SP" });
  });

  it("aberto da caixa da projeção, traz a base e o lugar, sem hipóteses", () => {
    const lido = lerEndereco("?base=so-apuracao&de=ba", FINALISTAS);
    expect(lido).toEqual({ base: "so-apuracao", hipoteses: hipoteses({}), de: "BA" });
    expect(mexidas(lido.hipoteses)).toBe(false);
  });
});
