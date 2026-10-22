import { describe, expect, it } from "vitest";
import {
  AGREGADO_CONTRA_RESULTADO,
  CALIBRACAO,
  coberturaDaNoite,
  deslocadasDaNoite,
  errosDaNoite,
  institutosDaLista,
  NOITES_REPRODUZIDAS,
} from "../src/lib/metodologia";

// A lista fechada de institutos como a página de metodologia a mostra: um nome por instituto da lista, e não por
// CNPJ, porque três institutos entram por dois CNPJs (ticket 03) e a Nexus conta como FSB (decisão do dono, 19/10).
const CABECALHO = "instituto_da_lista,instituto,cnpj,origem";
const csv = (...linhas: string[]) => [CABECALHO, ...linhas].join("\n");

describe("institutosDaLista", () => {
  it("dá um nome por instituto da lista, em ordem alfabética, mesmo com dois CNPJs", () => {
    expect(
      institutosDaLista(
        csv(
          "Gerp,Gerp,32208779000121,2º turno de 2022: BR-05418/2022",
          "Datafolha,Datafolha,07630546000175,2º turno de 2022: BR-08297/2022",
          "Gerp,Gerp,05270800000146,GERP MERCADOLOGIA LTDA: o CNPJ das pesquisas Gerp de 2026",
          "AtlasIntel,AtlasIntel,19259002000128,2º turno de 2022: BR-04838/2022",
        ),
      ),
    ).toEqual(["AtlasIntel", "Datafolha", "Gerp"]);
  });

  it("diz o nome com que o instituto divulga hoje, quando ele mudou e não está no nome da lista", () => {
    expect(
      institutosDaLista(
        csv(
          "Ipec/Ibope,Ipec,40735589000190,2º turno de 2022: BR-05256/2022",
          "Ipec/Ibope,Ibope,68802370000186,2º turno de 2018: BR-02934/2018",
          "FSB,Nexus,11077560000160,2º turno de 2018: BR-03689/2018 (IPRI); o mesmo CNPJ passou a Nexus em 2024",
        ),
      ),
    ).toEqual(["FSB (hoje Nexus)", "Ipec/Ibope"]);
  });
});

// As noites reproduzidas da seção 6 (Página de metodologia, decisão 3): as do `docs/calibracao/`, que o executor de
// noites gera com as constantes congeladas (ticket 28). As referências são o resultado oficial do TSE (Lula 50,90% em
// 2022, Bolsonaro 55,13% em 2018) e as linhas dos CSVs lidas à mão.
describe("noites reproduzidas", () => {
  const [de2022, de2018] = NOITES_REPRODUZIDAS;

  it("são a de 2022 e a de 2018, no 1º finalista de cada uma e com o resultado oficial no fim", () => {
    expect(NOITES_REPRODUZIDAS.map((n) => n.ano)).toEqual([2022, 2018]);
    expect(de2022!.finalistas.map((f) => f.nome)).toEqual(["Lula", "Bolsonaro"]);
    expect(de2018!.finalistas.map((f) => f.nome)).toEqual(["Bolsonaro", "Haddad"]);
    expect(de2022!.resultado).toBeCloseTo(50.9, 2);
    expect(de2018!.resultado).toBeCloseTo(55.13, 2);
    // Antes da primeira seção, a base com pesquisas é o agregado da noite (ticket 05: Lula 50,98, Bolsonaro 57,01).
    expect(de2022!.agregado).toBeCloseTo(50.98, 2);
    expect(de2018!.agregado).toBeCloseTo(57.01, 2);
    const primeiro = de2022!.momentos[0]!;
    expect([primeiro.hora, primeiro.secoes, primeiro.placar]).toEqual([null, 0, null]);
    expect(de2022!.momentos.at(-1)!.secoes).toBe(100);
  });

  it("dá o erro com 5%, 25% e 50% das seções, no placar parcial e nas duas bases", () => {
    // noite-2022-2.csv: com 5,0001% das seções, placar 46,7124, Só apuração 50,9456 e Apuração + pesquisas 50,9422.
    const erros = errosDaNoite(de2022!);
    expect(erros.map((e) => e.ponto)).toEqual([5, 25, 50]);
    expect(erros[0]!.placar).toBeCloseTo(50.9024 - 46.7124, 4);
    expect(erros[0]!.soApuracao).toBeCloseTo(50.9456 - 50.9024, 4);
    expect(erros[0]!.comPesquisas).toBeCloseTo(50.9422 - 50.9024, 4);
    expect(erros[2]!.placar).toBeCloseTo(50.9024 - 49.6987, 4);
    // noite-2018-2.csv: com 25,0017%, placar 57,5073, Só apuração 56,0198 e Apuração + pesquisas 56,0223.
    const de2018Em25 = errosDaNoite(de2018!)[1]!;
    expect([de2018Em25.placar, de2018Em25.soApuracao, de2018Em25.comPesquisas].map((e) => e.toFixed(4))).toEqual(["2.3771", "0.8896", "0.8921"]);
  });

  it("tem o resultado dentro da faixa de 95% em todos os momentos depois de 1% das seções, nas duas bases", () => {
    // docs/calibracao.md: cobertura de 100,0% nas duas noites com as constantes escolhidas, nas duas bases.
    for (const noite of NOITES_REPRODUZIDAS) expect(coberturaDaNoite(noite)).toEqual({ soApuracao: 1, comPesquisas: 1 });
  });

  it("em 2022, mede a noite também com o agregado deslocado 2 pontos para cada lado", () => {
    // noite-2022-2.csv: com 5,0001%, 51,0169 com +2 para Lula e 50,8674 com +2 para Bolsonaro; com 4,0004%, a de
    // +2 para Lula ainda fica 0,0753 acima da Só apuração, e daí em diante as duas ficam a menos de 0,1 ponto dela.
    const deslocadas = deslocadasDaNoite(de2022!)!;
    expect(deslocadas.erroEm5.map((e) => e.toFixed(4))).toEqual(["0.1145", "0.0350"]);
    expect(deslocadas.juntasDesde).toBeCloseTo(5.0001, 4);
    expect(deslocadasDaNoite(de2018!)).toBeUndefined();
  });
});

// O agregado contra o resultado nos seis 2º turnos (Agregado de pesquisas e erro histórico, decisão 10): o registro do
// ticket 05, no primeiro finalista do 1º turno, com a incerteza de cada ano medida nos outros cinco.
describe("agregado contra resultado", () => {
  it("cobre os seis 2º turnos de 2002 a 2022, com o agregado, o resultado e a incerteza sem o ano do ticket 05", () => {
    expect(AGREGADO_CONTRA_RESULTADO.map((a) => `${a.ano} ${a.finalistas.join(" × ")}`)).toEqual([
      "2002 Lula × Serra",
      "2006 Lula × Alckmin",
      "2010 Dilma × Serra",
      "2014 Dilma × Aécio",
      "2018 Bolsonaro × Haddad",
      "2022 Lula × Bolsonaro",
    ]);
    const comDuasCasas = AGREGADO_CONTRA_RESULTADO.map((a) => [a.agregado, a.resultado, a.erro, a.incerteza].map((n) => n.toFixed(2)));
    expect(comDuasCasas).toEqual([
      ["63.02", "61.27", "1.75", "1.19"],
      ["61.98", "60.83", "1.15", "1.33"],
      ["55.80", "56.05", "-0.25", "1.42"],
      ["50.16", "51.64", "-1.48", "1.26"],
      ["57.01", "55.13", "1.88", "1.15"],
      ["50.98", "50.90", "0.08", "1.43"],
    ]);
    // "Os seis resultados caem na faixa de 95%."
    for (const a of AGREGADO_CONTRA_RESULTADO) expect(a.resultado, String(a.ano)).toBeGreaterThan(a.faixa[0]);
    for (const a of AGREGADO_CONTRA_RESULTADO) expect(a.resultado, String(a.ano)).toBeLessThan(a.faixa[1]);
  });
});

// A tabela da calibração da seção 7 (Ensaio geral, decisão 26): os candidatos, o valor de antes e o escolhido de cada
// constante, e os números por noite com as constantes escolhidas. As referências são as tabelas do docs/calibracao.md.
describe("calibração", () => {
  it("lista cada constante com os candidatos, o valor provisório e o escolhido", () => {
    expect(CALIBRACAO.constantes.map((c) => [c.nome, c.candidatos, c.provisoria, c.escolhida])).toEqual([
      ["Desvio de cada estado", "0,5 · 1 · 1,5 · 2 pontos", "1 ponto", "2 pontos"],
      ["Desvio comum do país", "0,5 · 1 · 1,5 · 2 pontos", "1 ponto", "2 pontos"],
      ["Peso do próprio município", "1.000 · 3.000 · 10.000 votos", "3.000 votos", "10.000 votos"],
      ["Ordem de chegada", '"mistura" · "1º turno" · "ritmo da noite"', '"mistura"', '"mistura"'],
      ["K, as seções que as pesquisas valem", "0,25% · 0,5% · 1% · 2%", "0,5%", "0,25%"],
      ['Limite de "sem sinal de virada"', "5% · 2% · 1%", "5%", "2%"],
      ["Unidade do modelo", "município · zona", "município", "município"],
    ]);
  });

  it("dá os números de cada noite com as constantes escolhidas, e o 1º turno de 2026 entra só aqui", () => {
    expect(CALIBRACAO.noites).toEqual(["2º turno de 2022", "2º turno de 2018", "1º turno de 2026"]);
    expect(CALIBRACAO.medidas.map((m) => [m.nome, ...m.porNoite])).toEqual([
      ["Resultado dentro da faixa de 95%, depois de 1% das seções", "100,0%", "100,0%", "100,0%"],
      ["Maior chance de vitória de quem perdeu, depois de 5% das seções", "38,9%", "0,3%", "40,4%"],
      ["Erro médio da projeção, de 5% a 50% das seções", "0,35", "0,74", "0,11"],
      ["Margem de 95% média, de 5% a 50% das seções", "3,02", "3,02", "3,08"],
      ["Erro da curva projetada, de 5% a 50% das seções", "0,54", "0,75", "0,72"],
      ["Maior erro até 5% das seções, com pesquisas", "1,32", "1,35", "2,00"],
      ['Municípios "sem sinal de virada" que viraram depois', "0,22%", "0,17%", "0,33%"],
      ["Erro médio com as zonas no lugar do município", "0,44", "0,72", "0,15"],
    ]);
  });
});
