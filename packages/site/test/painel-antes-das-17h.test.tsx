import type { CurvaDoLugar } from "@apurador/modelo";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { ChanceDeVitoria } from "../src/components/ChanceDeVitoria";
import { CurvaProjetada } from "../src/components/CurvaProjetada";
import { elemento, elementos, texto } from "./html";

// As duas peças do painel de antes das 17h que o build desenha em HTML e o ticket 17 reaproveita ao vivo: a curva
// projetada (Telas da página de lugar, decisão 4; Sinal de virada, decisão 3) e a barra dividida da chance de vitória
// (decisão 3). Os pontos são inventados, com a forma de uma noite em que Flávio sai na frente e Lula vira tarde.

const FLAVIO = { nomeUrna: "FLAVIO BOLSONARO", cor: "flavio" as const };
const LULA = { nomeUrna: "LULA", cor: "lula" as const };

/** Uma curva de Flávio que começa em 56% e termina em 49%, com o desvio de 1 ponto: a virada por volta de 86%. */
function curva(virada: CurvaDoLugar["virada"]): CurvaDoLugar {
  const pontos = Array.from({ length: 50 }, (_, i) => {
    const x = 2 + (98 * i) / 49;
    return { x, y: 0.56 - (0.07 * (x - 2)) / 98, desvio: 0.01 };
  });
  return { pontos, virada };
}

const desenhar = (c: CurvaDoLugar, base = "Apuração + pesquisas") => render(<CurvaProjetada id="teste" base={base} primeiro={FLAVIO} segundo={LULA} curva={c} />);

describe("curva projetada", () => {
  const html = desenhar(curva({ x: 86, cedo: 70, tarde: 95, quem: 1 }));
  const svg = elemento(html, /<svg/);

  it("desenha as duas linhas tracejadas, espelhadas em torno de 50%, com a faixa de 95% de cada uma", () => {
    expect(elementos(svg, /<path[^>]*class="linha-projetada"/).map((p) => /data-cor="([a-z]+)"/.exec(p)?.[1])).toEqual(["flavio", "lula"]);
    expect(elementos(svg, /<path[^>]*class="faixa-projetada"/).map((p) => /data-cor="([a-z]+)"/.exec(p)?.[1])).toEqual(["flavio", "lula"]);
    // de 0% a 100% das seções no eixo
    expect(texto(svg)).toContain("0% 25% 50% 75% 100%");
    expect(texto(svg)).toContain("% de seções totalizadas");
  });

  it("marca a virada projetada com um losango sobre a faixa em que ela é provável", () => {
    expect(elementos(svg, /<path[^>]*class="losango-virada"/)).toHaveLength(1);
    expect(elementos(svg, /<rect[^>]*class="faixa-virada"/)).toHaveLength(1);
    expect(html).toMatch(/data-virada-x="86"/);
    expect(html).toMatch(/data-virada-cedo="70"/);
    expect(html).toMatch(/data-virada-tarde="95"/);
    const legenda = texto(elemento(html, /<figcaption/));
    expect(legenda).toContain("Virada projetada");
    expect(legenda).toContain("virada é possível");
  });

  it("rotula o fim da curva com a projeção de cada um, com uma casa", () => {
    expect(texto(svg)).toContain("49,0%");
    expect(texto(svg)).toContain("51,0%");
  });

  it("não tem frase preditiva nem rótulo do sinal de virada", () => {
    expect(texto(html)).not.toMatch(/deve |vai |chance de virada|sem sinal|virada possível ·|virada projetada ·/i);
    expect(html).toMatch(/aria-label="Curva projetada na base Apuração \+ pesquisas: FLAVIO BOLSONARO de 56,0% a 49,0% e LULA de 44,0% a 51,0%/);
  });

  it("sem virada projetada, fica só com a faixa a partir de onde a virada é possível", () => {
    const html = desenhar(curva({ x: null, cedo: 65, tarde: null, quem: 0 }));
    expect(elementos(html, /<path[^>]*class="losango-virada"/)).toEqual([]);
    expect(elementos(html, /<rect[^>]*class="faixa-virada"/)).toHaveLength(1);
    expect(html).not.toContain("data-virada-x=");
    expect(html).toMatch(/data-virada-cedo="65"/);
    expect(texto(elemento(html, /<figcaption/))).not.toContain("Virada projetada");
  });

  it("sem sinal nenhum, não desenha losango nem faixa da virada", () => {
    const html = desenhar(curva({ x: null, cedo: null, tarde: null, quem: 0 }), "Só apuração");
    expect(elementos(html, /<path[^>]*class="losango-virada"/)).toEqual([]);
    expect(elementos(html, /<rect[^>]*class="faixa-virada"/)).toEqual([]);
    expect(texto(elemento(html, /<figcaption/))).not.toMatch(/virada/i);
    expect(html).toContain('aria-label="Curva projetada na base Só apuração:');
  });

  it("recorta a escala à faixa de 95%, ignorando o começo instável até 3% das seções", () => {
    // Com o desvio de 1 ponto, a faixa vai de 42,0% a 58,0%: a escala fica em ±10 e os rótulos de 5 em 5.
    const rotulos = elementos(svg, /<text[^>]*data-eixo-y/).map(texto);
    expect(rotulos).toEqual(["40%", "45%", "50%", "55%", "60%"]);
  });
});

describe("chance de vitória", () => {
  const html = render(<ChanceDeVitoria chances={[{ finalista: FLAVIO, chance: 0.734185 }, { finalista: LULA, chance: 0.265815 }]} href="/metodologia/#chance" />);

  it("é uma barra dividida com a chance de cada um, em inteiros que somam 100", () => {
    const barra = elemento(html, /<div[^>]*class="chance-barra"/);
    expect(elementos(barra, /<i/).map((i) => [/data-cor="([a-z]+)"/.exec(i)?.[1], /width:\s*([\d.]+%)/.exec(i)?.[1]])).toEqual([
      ["flavio", "73.4%"],
      ["lula", "26.6%"],
    ]);
    expect(texto(html)).toContain("FLAVIO BOLSONARO 73%");
    expect(texto(html)).toContain("LULA 27%");
  });

  it("leva à seção da chance de vitória na metodologia", () => {
    expect(html).toMatch(/<a href="\/metodologia\/#chance"[^>]*>Chance de vitória<\/a>/);
  });

  it("diz '<1%' e '>99%' nas pontas, sem 0% nem 100%", () => {
    const extrema = texto(render(<ChanceDeVitoria chances={[{ finalista: FLAVIO, chance: 0.998 }, { finalista: LULA, chance: 0.002 }]} href="#" />));
    expect(extrema).toContain("FLAVIO BOLSONARO >99%");
    expect(extrema).toContain("LULA <1%");
  });
});
