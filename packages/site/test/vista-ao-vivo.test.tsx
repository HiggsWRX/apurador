import type { ArquivoDeRodada, ArquivoDoLugar, ChavesDaNoite, ColunasDaBase, EventoDaNarracao, ProjecaoDoLugar, ProjecaoNaBase } from "@apurador/coletor";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { VistaDoBlocoAoVivo, type PropsDaVista } from "../src/components/VistaDoBlocoAoVivo";
import { COMPARACAO_DESLIGADA, type EstadoDaComparacao, type TurnoPassado } from "../src/lib/curva-de-comparacao";
import type { QuadroAoVivo, TabelaDeProjecoesLida } from "../src/lib/leitor-ao-vivo";
import { projecaoDoLugar } from "../src/lib/projecao-ao-vivo";
import { botoes, elemento, texto } from "./html";

// O que o bloco ao vivo mostra para cada quadro do leitor, renderizado em HTML como a ilha o desenha. Os números de
// referência são os dos exemplos das decisões (Narração da noite, decisão 9), com as seções e os candidatos de 2026.

const CANDIDATOS: ArquivoDeRodada["candidatos"] = [
  { numero: 22, nome: "FLAVIO BOLSONARO", partido: "PL", sequencial: "280002551544" },
  { numero: 13, nome: "LULA", partido: "PT", sequencial: "280002542548" },
];

/** As chaves que o coletor publica sem comando: tudo ligado menos os textos preditivos. */
const LIGADAS: ChavesDaNoite = { nucleoMinimo: true, projecao: true, baseComPesquisas: true, simulador: true, mapa: true, textosPreditivos: false };

function quadro(parte: Partial<QuadroAoVivo> = {}): QuadroAoVivo {
  return {
    fase: "antes-das-17h",
    indicador: { estado: "antes-das-17h", faltam: null },
    rodada: null,
    lugar: null,
    ultimaLeitura: null,
    mudaram: [],
    chaves: LIGADAS,
    aviso: null,
    tabelaDeProjecoes: null,
    mapa: null,
    simulador: null,
    ...parte,
  };
}

// A hora do TSE é a da noite de 2022, como no ensaio geral, e o relógio do coletor é o de 2026: um teste que compare os
// dois relógios falha aqui, e não no ensaio (ticket 15).
function rodada(fase: ArquivoDeRodada["fase"]): ArquivoDeRodada {
  return {
    rodada: "2026-10-25T22:42:15.000Z",
    fase,
    novidade: { totalizacao: "2022-10-30 19:42:10", vista: "2026-10-25T22:42:12.000Z" },
    candidatos: CANDIDATOS,
    chaves: LIGADAS,
    aviso: null,
    pesoDasPesquisas: 3,
    eventosDoBrasil: [],
  };
}

function dadosDoLugar(tse: Partial<ArquivoDoLugar["tse"]>, curva: ArquivoDoLugar["curva"] = []): ArquivoDoLugar {
  return {
    lugar: "BR",
    tse: {
      totalizacao: "2022-10-30 19:42:10",
      secoes: { totalizadas: 0, total: 472027, percentual: 0 },
      votos: [0, 0],
      percentuais: [0, 0],
      final: false,
      ...tse,
    },
    curva,
    narracao: [],
  };
}

const PADRAO: Omit<PropsDaVista, "quadro"> = {
  lugar: { tipo: "brasil", em: "no Brasil" },
  fotos: {},
  movimentoReduzido: false,
  proximaLeitura: 30,
  lendo: false,
};
const vista = (q: QuadroAoVivo, outras: Partial<PropsDaVista> = {}) => render(<VistaDoBlocoAoVivo quadro={q} {...PADRAO} {...outras} />);

describe("bloco ao vivo antes das 17h", () => {
  it("dá a manchete sem números e o placar oficial com a hora da divulgação", () => {
    const html = vista(quadro());
    expect(texto(elemento(html, /<p[^>]*data-manchete/))).toBe("A apuração do 2º turno começa às 17h");
    const placar = texto(elemento(html, /<section[^>]*data-placar-oficial/));
    expect(placar).toContain("Placar oficial · TSE");
    expect(placar).toContain("A divulgação começa às 17h");
  });
});

describe("manchete durante a apuração", () => {
  const aoVivo = (tse: Partial<ArquivoDoLugar["tse"]>) =>
    quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: rodada("ao-vivo"), lugar: dadosDoLugar(tse) });
  const mancheteDe = (q: QuadroAoVivo, outras: Partial<PropsDaVista> = {}) => texto(elemento(vista(q, outras), /<p[^>]*data-manchete/));

  it("começa pelo placar oficial: quem lidera, com o % dos votos válidos e o % das seções", () => {
    const q = aoVivo({ secoes: { totalizadas: 237618, total: 472027, percentual: 50.34 }, votos: [57873281, 56885102], percentuais: [50.43, 49.57] });
    expect(mancheteDe(q)).toBe("Flávio lidera com 50,43% dos votos válidos e 50,34% das seções totalizadas");
  });

  it("com diferença menor que 0,10 ponto, dá a diferença em votos", () => {
    const q = aoVivo({ secoes: { totalizadas: 319847, total: 472027, percentual: 67.76 }, votos: [61000000, 61012345], percentuais: [49.99, 50.01] });
    expect(mancheteDe(q)).toBe("Lula à frente por 12.345 votos, com 67,76% das seções totalizadas");
  });

  it("com diferença de 0,10 ponto, volta ao % dos votos válidos", () => {
    const q = aoVivo({ secoes: { totalizadas: 319847, total: 472027, percentual: 67.76 }, votos: [61000000, 61122000], percentuais: [49.95, 50.05] });
    expect(mancheteDe(q)).toBe("Lula lidera com 50,05% dos votos válidos e 67,76% das seções totalizadas");
  });

  it("num lugar ainda sem seções, diz que a apuração não começou ali", () => {
    const q = aoVivo({ secoes: { totalizadas: 0, total: 41123, percentual: 0 } });
    expect(mancheteDe(q, { lugar: { tipo: "uf", uf: "BA", em: "na Bahia" } })).toBe("A apuração ainda não começou neste estado");
    expect(mancheteDe(q, { lugar: { tipo: "municipio", uf: "BA", em: "em Salvador (BA)" } })).toBe("A apuração ainda não começou neste município");
    expect(mancheteDe(q, { lugar: { tipo: "exterior", uf: "ZZ", em: "no Exterior" } })).toBe("A apuração ainda não começou no Exterior");
    expect(mancheteDe(q, { lugar: { tipo: "municipio", uf: "ZZ", em: "em Lisboa (Exterior)" } })).toBe("A apuração ainda não começou nesta cidade");
  });

  it("depois das 17h, sem o arquivo do lugar ainda, não afirma nada sobre ele nem volta a falar das 17h", () => {
    // O arquivo pode faltar por um erro da CDN na primeira leitura: dizer que a apuração não começou seria falso.
    const html = vista(quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: rodada("ao-vivo"), lugar: null }), {
      lugar: { tipo: "brasil", em: "no Brasil" },
    });
    expect(html).not.toContain("data-manchete");
    const placar = texto(elemento(html, /<section[^>]*data-placar-oficial/));
    expect(placar).not.toContain("17h");
    expect(placar).toContain("Aguardando os primeiros dados do TSE");
  });

  it("com os mesmos votos, diz que estão empatados", () => {
    const q = aoVivo({ secoes: { totalizadas: 1, total: 12, percentual: 8.33 }, votos: [104, 104], percentuais: [50, 50] });
    expect(mancheteDe(q, { lugar: { tipo: "municipio", uf: "RR", em: "em Uiramutã (RR)" } })).toBe(
      "Flávio e Lula empatam com 104 votos cada, com 8,33% das seções totalizadas",
    );
  });
});

describe("indicador ao vivo, no cartão do placar", () => {
  const lugar = dadosDoLugar({ secoes: { totalizadas: 237618, total: 472027, percentual: 50.34 }, votos: [57873281, 56885102], percentuais: [50.43, 49.57] });
  const com = (indicador: QuadroAoVivo["indicador"], outras: Partial<PropsDaVista> = {}, fase: QuadroAoVivo["fase"] = "ao-vivo") => {
    const html = vista(quadro({ fase, indicador, rodada: rodada(fase), lugar, ultimaLeitura: 12 }), { proximaLeitura: 18, ...outras });
    const placar = elemento(html, /<section[^>]*data-placar-oficial/);
    return { placar, indicador: elemento(placar, /<div[^>]*data-indicador/) };
  };

  it('ao vivo: o ponto pulsante, o anel de 30 s e "Atualiza sozinho, sem recarregar", com o detalhe da última leitura e da última totalização', () => {
    const { indicador } = com({ estado: "ao-vivo" });
    expect(indicador).toContain("data-pulso");
    expect(indicador).toContain("data-anel");
    expect(texto(indicador)).toMatch(/^Ao vivo Atualiza sozinho, sem recarregar/);
    expect(texto(elemento(indicador, /<details/))).toContain(
      "Lemos os dados a cada 30 s. Última leitura há 12 s. Última totalização do TSE às 19:42:10. Não precisa recarregar a página.",
    );
  });

  it("durante a leitura, o anel vira uma rodinha", () => {
    const { indicador } = com({ estado: "ao-vivo" }, { lendo: true });
    expect(indicador).toContain("data-rodinha");
    expect(indicador).not.toContain("data-anel");
  });

  it('com movimento reduzido, não há pulso, e o anel vira "próxima leitura em N s"', () => {
    const { indicador } = com({ estado: "ao-vivo" }, { movimentoReduzido: true });
    expect(indicador).not.toContain("data-pulso");
    expect(indicador).not.toContain("data-anel");
    expect(texto(indicador)).toContain("próxima leitura em 18 s");
  });

  it("TSE sem novidade: continua ao vivo, e o detalhe diz desde quando", () => {
    const { indicador } = com({ estado: "tse-sem-novidade", desde: "19:40" });
    expect(texto(indicador)).toMatch(/^Ao vivo/);
    expect(texto(elemento(indicador, /<details/))).toContain("TSE sem novidade desde 19:40.");
  });

  it("interrompido: o ponto cinza, sem anel, com o aviso e os últimos dados à vista; com 10 min, o link do app oficial do TSE", () => {
    const tresMinutos = com({ estado: "interrompido", atualizadoAs: "19:42", linkDoTse: false });
    expect(tresMinutos.indicador).toContain('data-ponto="cinza"');
    expect(tresMinutos.indicador).not.toContain("data-anel");
    expect(texto(tresMinutos.indicador)).toContain("Atualizado às 19:42, atualização interrompida");
    expect(texto(tresMinutos.indicador)).not.toContain("Ao vivo");
    expect(tresMinutos.placar).not.toContain("app oficial do TSE");
    expect(texto(tresMinutos.placar)).toContain("50,43%");

    const dezMinutos = com({ estado: "interrompido", atualizadoAs: "19:42", linkDoTse: true });
    expect(dezMinutos.placar).toMatch(/<a[^>]*href="https:\/\/resultados\.tse\.jus\.br\/oficial\/app\/index\.html"[^>]*>Acompanhe no app oficial do TSE<\/a>/);
    expect(texto(dezMinutos.placar)).toContain("50,43%");
  });

  it('sem conexão: "Sem conexão · tentando de novo"', () => {
    expect(texto(com({ estado: "sem-conexao" }).indicador)).toContain("Sem conexão · tentando de novo");
  });

  it('encerrada: "Apuração encerrada", sem anel, e o detalhe com a última totalização', () => {
    const { indicador } = com({ estado: "encerrada" }, {}, "encerrada");
    expect(texto(indicador)).toMatch(/^Apuração encerrada/);
    expect(indicador).not.toContain("data-anel");
    expect(texto(elemento(indicador, /<details/))).toContain("Última totalização do TSE às 19:42:10.");
  });

  it('antes das 17h: sem "Ao vivo", com a contagem regressiva só na última hora', () => {
    const longe = com({ estado: "antes-das-17h", faltam: null }, {}, "antes-das-17h").indicador;
    expect(texto(longe)).not.toContain("Ao vivo");
    expect(texto(longe)).not.toContain("Começa em");
    expect(texto(com({ estado: "antes-das-17h", faltam: 754 }, {}, "antes-das-17h").indicador)).toContain("Começa em 12:34");
  });
});

describe("linha fixa", () => {
  const lugar = dadosDoLugar({ secoes: { totalizadas: 237618, total: 472027, percentual: 50.34 }, votos: [57873281, 56885102], percentuais: [50.43, 49.57] });
  const aoVivo = quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: rodada("ao-vivo"), lugar });

  it("quando o placar sai da tela, mostra só os números oficiais, com o indicador", () => {
    const linha = elemento(vista(aoVivo, { placarNaTela: false }), /<div[^>]*data-linha-fixa/);
    expect(linha).not.toMatch(/^<div[^>]*hidden/);
    expect(texto(linha)).toMatch(/^Flávio 50,43% Lula 49,57% 50,34% das seções · TSE/);
    expect(linha).toContain("data-indicador");
  });

  it("fica escondida com o placar na tela, e não existe antes das 17h", () => {
    expect(elemento(vista(aoVivo, { placarNaTela: true }), /<div[^>]*data-linha-fixa/)).toMatch(/^<div[^>]*hidden/);
    expect(vista(quadro(), { placarNaTela: false })).not.toContain("data-linha-fixa");
  });
});

describe("curva real", () => {
  // O começo instável: com 0,5% das seções Flávio tinha 70%; com 3%, 56%. Depois, nunca mais de 2,5 pontos de 50%.
  const pontos = [
    [0.5, 70, 30],
    [2, 58, 42],
    [3, 56, 44],
    [10, 52.5, 47.5],
    [25, 51.2, 48.8],
  ];
  const curvaDe = (curva: number[][]) => {
    const lugar = dadosDoLugar({ secoes: { totalizadas: 1, total: 4, percentual: curva.at(-1)?.[0] ?? 0 } }, curva);
    return elemento(vista(quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: rodada("ao-vivo"), lugar })), /<section[^>]*data-curva-real/);
  };
  const rotulosDoEixo = (svg: string) => [...svg.matchAll(/<text[^>]*data-eixo-y[^>]*>([^<]+)</g)].map((m) => m[1]);

  it("espelha as duas linhas em torno de 50%, com a escala que ignora o começo até 3% das seções", () => {
    const curva = curvaDe(pontos);
    expect(curva.match(/<path[^>]*data-linha-real/g)).toHaveLength(2);
    expect(rotulosDoEixo(curva)).toEqual(["46%", "48%", "50%", "52%", "54%"]);
  });

  it("se estende a cada leitura, até o último ponto", () => {
    expect(curvaDe(pontos)).toContain('aria-label="Curva real: Flávio 51,20% e Lula 48,80% com 25,00% das seções totalizadas"');
    expect(curvaDe([...pontos, [40, 50.6, 49.4]])).toContain('aria-label="Curva real: Flávio 50,60% e Lula 49,40% com 40,00% das seções totalizadas"');
  });

  it("leva a atribuição da camada analítica", () => {
    expect(texto(curvaDe(pontos))).toContain("Cálculo do Apurador com dados do TSE");
  });

  describe("com a curva de comparação", () => {
    const TURNOS: TurnoPassado[] = [
      { id: "2018-1", nome: "2018 1T", turno: 1, partidoDeBolsonaro: "PSL" },
      { id: "2018-2", nome: "2018 2T", turno: 2, partidoDeBolsonaro: "PSL" },
      { id: "2022-1", nome: "2022 1T", turno: 1, partidoDeBolsonaro: "PL" },
      { id: "2022-2", nome: "2022 2T", turno: 2, partidoDeBolsonaro: "PL" },
      { id: "2026-1", nome: "2026 1T", turno: 1, partidoDeBolsonaro: "PL" },
    ];
    // O PT entre os dois, no começo instável com 25% e depois nunca mais de 11,4 pontos de 50%, até os 44,9% do fim.
    const DE_2018 = { secoes: [0.1, 2, 10, 50, 100], pt: [12.5, 25, 38.6, 41.2, 44.9] };
    const comparadaCom = (estado: Partial<EstadoDaComparacao>, turnos = TURNOS) => {
      const lugar = dadosDoLugar({ secoes: { totalizadas: 1, total: 4, percentual: 25 } }, pontos);
      const comparacao = { turnos, estado: { ...COMPARACAO_DESLIGADA, ...estado }, alternar: () => {} };
      return elemento(
        vista(quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: rodada("ao-vivo"), lugar }), { comparacao }),
        /<section[^>]*data-curva-real/,
      );
    };
    const legenda = (html: string) => texto(elemento(html, /<p[^>]*data-legenda-da-comparacao/));

    it("abre desligada: um botão por turno passado, nenhum apertado, e só as linhas da curva real", () => {
      const html = comparadaCom({});

      expect(botoes(html)).toEqual([
        ["2018 1T", "false"],
        ["2018 2T", "false"],
        ["2022 1T", "false"],
        ["2022 2T", "false"],
        ["2026 1T", "false"],
      ]);
      expect(html).not.toContain("linha-de-comparacao");
      expect(html).not.toContain("data-legenda-da-comparacao");
    });

    it("ligada, aparece sobre a curva real, pontilhada, com o PT na cor de Lula e o partido de Bolsonaro na de Flávio, e a legenda", () => {
      const html = comparadaCom({ ligado: "2018-2", situacao: "pronta", curva: DE_2018 });

      expect(botoes(html).filter(([, apertado]) => apertado === "true")).toEqual([["2018 2T", "true"]]);
      expect([...html.matchAll(/<path class="linha-de-comparacao" data-cor="(\w+)"/g)].map((m) => m[1])).toEqual(["lula", "flavio"]);
      // As linhas da comparação vêm antes, por baixo das da curva real, que continua inteira à vista.
      expect(html.indexOf("data-linha-real")).toBeGreaterThan(html.lastIndexOf("linha-de-comparacao"));
      expect(legenda(html)).toBe("Curva real de 2018 2T: PT × PSL");
    });

    it("entra na conta da escala como a curva real: só depois de 3% das seções", () => {
      // Sem ela, de 46% a 54%; com ela, os 38,6% pedem de 40% a 60%, e os 25% e 12,5% do começo ficam de fora.
      expect(rotulosDoEixo(comparadaCom({ ligado: "2018-2", situacao: "pronta", curva: DE_2018 }))).toEqual(["40%", "45%", "50%", "55%", "60%"]);
    });

    it("num 1º turno, a legenda diz que a fatia é só entre os dois partidos", () => {
      expect(legenda(comparadaCom({ ligado: "2018-1", situacao: "pronta", curva: DE_2018 }))).toBe("Curva real de 2018 1T, só entre os dois: PT × PSL");
    });

    it("enquanto as curvas chegam, e se elas não vêm, a legenda diz isso, sem linha nenhuma", () => {
      const baixando = comparadaCom({ ligado: "2022-2", situacao: "baixando" });
      const falhou = comparadaCom({ ligado: "2022-2", situacao: "falhou" });

      expect(legenda(baixando)).toBe("Baixando a curva de 2022 2T…");
      expect(legenda(falhou)).toBe("Não foi possível baixar a curva de 2022 2T. Tente de novo.");
      expect(baixando + falhou).not.toContain("linha-de-comparacao");
    });

    it("um lugar sem nenhum turno passado, como Abuja, não tem botões nem legenda", () => {
      expect(comparadaCom({}, [])).not.toContain("data-comparacao");
    });
  });
});

describe("placar oficial ao vivo", () => {
  const lugar = dadosDoLugar({ secoes: { totalizadas: 237618, total: 472027, percentual: 50.34 }, votos: [57873281, 56885102], percentuais: [50.43, 49.57] });
  const html = vista(quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: rodada("ao-vivo"), lugar }), {
    fotos: { "280002551544": "/_astro/280002551544.abc.jpeg", "280002542548": "/_astro/280002542548.def.jpeg" },
  });
  const placar = elemento(html, /<section[^>]*data-placar-oficial/);

  it("põe os dois candidatos lado a lado, na ordem do arquivo de rodada, com nome, partido, % com duas casas e votos", () => {
    expect(texto(placar)).toMatch(/FLAVIO BOLSONARO PL 50,43% 57\.873\.281 votos.*LULA PT 49,57% 56\.885\.102 votos/);
  });

  it("mostra a foto oficial do TSE de cada um, pelo sequencial", () => {
    expect(placar).toContain('src="/_astro/280002551544.abc.jpeg"');
    expect(placar).toContain('src="/_astro/280002542548.def.jpeg"');
  });

  it("faz piscar uma vez só os números que a última leitura mudou, e nenhum com movimento reduzido", () => {
    const q = quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: rodada("ao-vivo"), lugar, mudaram: ["percentual-0", "secoes"] });
    const piscam = (html: string) => [...html.matchAll(/<[a-z]+[^>]*data-mudou[^>]*>([^<]+)</g)].map((m) => m[1]);
    expect(piscam(elemento(vista(q), /<section[^>]*data-placar-oficial/))).toEqual(["50,43%", "50,34%"]);
    expect(piscam(vista(q, { movimentoReduzido: true }))).toEqual([]);
  });

  it("traz embaixo a barra, o % de seções com x de y, a hora da última totalização e a fonte", () => {
    expect(placar).toMatch(/<div[^>]*class="barra-de-secoes"[^>]*>\s*<i style="width:\s*50\.34%/);
    expect(texto(placar)).toContain("50,34% das seções totalizadas (237.618 de 472.027)");
    expect(texto(placar)).toContain("Última totalização às 19:42:10");
    expect(texto(placar)).toContain("Fonte: TSE, sem alteração (CC-BY)");
  });
});

describe("plano zero", () => {
  // Ensaio geral, decisão 24: com o núcleo mínimo desligado, a partir das 17h, nenhum dado ao vivo vai ao ar.
  const lugar = dadosDoLugar({ secoes: { totalizadas: 237618, total: 472027, percentual: 50.34 }, votos: [57873281, 56885102], percentuais: [50.43, 49.57] });
  const comNucleoMinimo = (nucleoMinimo: boolean, fase: QuadroAoVivo["fase"] = "ao-vivo") =>
    vista(
      quadro({
        fase,
        indicador: fase === "ao-vivo" ? { estado: "ao-vivo" } : { estado: "antes-das-17h", faltam: null },
        rodada: rodada(fase),
        lugar,
        chaves: { ...LIGADAS, nucleoMinimo },
      }),
      {
        placarNaTela: false,
      },
    );

  it('com o núcleo mínimo desligado, na fase ao vivo, o bloco dá lugar a "Acompanhe a apuração no app oficial do TSE", com o link', () => {
    const html = comNucleoMinimo(false);
    const planoZero = elemento(html, /<section[^>]*data-plano-zero/);
    expect(texto(planoZero)).toBe("Acompanhe a apuração no app oficial do TSE");
    expect(planoZero).toMatch(/<a[^>]*href="https:\/\/resultados\.tse\.jus\.br\/oficial\/app\/index\.html"[^>]*>app oficial do TSE<\/a>/);
    for (const dado of ["data-placar-oficial", "data-manchete", "data-linha-fixa", "data-curva-real", "data-indicador", "50,43"])
      expect(html).not.toContain(dado);
  });

  it("antes das 17h, a chave desligada não muda nada: fica o bloco de antes das 17h", () => {
    const html = comNucleoMinimo(false, "antes-das-17h");
    expect(html).not.toContain("data-plano-zero");
    expect(texto(elemento(html, /<section[^>]*data-placar-oficial/))).toContain("A divulgação começa às 17h");
  });

  it("religada a chave, o bloco volta inteiro", () => {
    const html = comNucleoMinimo(true);
    expect(html).not.toContain("data-plano-zero");
    expect(texto(elemento(html, /<section[^>]*data-placar-oficial/))).toContain("50,43%");
    expect(html).toContain("data-curva-real");
  });
});

describe("projeção ao vivo", () => {
  // Os exemplos das decisões: o 1º turno do Brasil, 51,0 × 49,0 entre os finalistas, e "Lula +1,8" (Telas da página de
  // lugar, decisão 3); os três rótulos do sinal de virada (Sinal de virada, decisão 2). Flávio lidera o placar parcial
  // com 50,43%, e a projeção dá Lula à frente no fim. Os % são de Flávio, o 1º candidato do arquivo de rodada.
  const naBase = (parte: Partial<ProjecaoNaBase> = {}): ProjecaoNaBase => ({
    projecao: 49.2,
    margem: 1.6,
    chance: 38,
    chanceDeVirada: 62,
    sinalDeVirada: "virada projetada",
    curva: [
      [50.3, 50.4, 0],
      [75, 49.8, 1],
      [100, 49.2, 1.6],
    ],
    virada: { x: 88, cedo: 80, tarde: 95 },
    ...parte,
  });
  const PROJECAO: ProjecaoDoLugar = {
    soApuracao: naBase({ projecao: 49.4, margem: 2.1, chance: 41, chanceDeVirada: 59 }),
    comPesquisas: naBase(),
    coincidem: false,
    comparacoes: { primeiroTurno: 51.0, pesquisas: 51.0 },
  };
  const TSE: Partial<ArquivoDoLugar["tse"]> = {
    secoes: { totalizadas: 237618, total: 472027, percentual: 50.34 },
    votos: [57873281, 56885102],
    percentuais: [50.43, 49.57],
  };
  const comProjecao = (
    projecao: ProjecaoDoLugar | undefined = PROJECAO,
    parte: Partial<QuadroAoVivo> = {},
    outras: Partial<PropsDaVista> = {},
    tse: Partial<ArquivoDoLugar["tse"]> = TSE,
    narracao: EventoDaNarracao[] = [],
  ) =>
    vista(
      quadro({
        fase: "ao-vivo",
        indicador: { estado: "ao-vivo" },
        rodada: rodada("ao-vivo"),
        lugar: { ...dadosDoLugar(tse, [[50.34, 50.43, 49.57]]), narracao, ...(projecao ? { projecao } : {}) },
        ...parte,
      }),
      { pesquisasDoAgregado: 8, ...outras },
    );
  const caixa = (html: string) => elemento(html, /<section[^>]*data-projecao-ao-vivo/);
  const curva = (html: string) => elemento(html, /<section[^>]*data-curva-real/);
  const rotulo = (html: string) => texto(elemento(curva(html), /<p[^>]*data-sinal-de-virada/));
  const INDICACAO: EventoDaNarracao = { lugar: "BR", tipo: "indicacao", quando: "2022-10-30 19:56:23", texto: "O TSE indica Lula eleito." };

  it("vem depois da curva, numa moldura tracejada, com o aviso, cada resultado ± a margem de 95% e a atribuição", () => {
    const html = comProjecao();
    expect(html.indexOf("data-curva-real")).toBeLessThan(html.indexOf("data-projecao-ao-vivo"));
    expect(caixa(html)).toMatch(/^<section class="cartao projecao"/);
    expect(texto(caixa(html))).toContain("Estimativa do Apurador. Não é resultado oficial nem garantia do resultado.");
    expect(texto(elemento(caixa(html), /<p class="valores"/))).toBe("FLAVIO BOLSONARO 49,2% ± 1,6 LULA 50,8% ± 1,6");
    expect(texto(caixa(html))).toContain("Cálculo do Apurador com dados do TSE");
  });

  it("dá a chance numa barra dividida, com inteiros, e 100% só com a indicação do TSE", () => {
    const chances = (html: string) => texto(elemento(caixa(html), /<p class="chance-rotulos"/));
    expect(chances(comProjecao())).toBe("FLAVIO BOLSONARO 38% LULA 62%");
    expect(chances(comProjecao({ ...PROJECAO, comPesquisas: naBase({ chance: 0 }) }))).toBe("FLAVIO BOLSONARO <1% LULA >99%");
    // Com a indicação, Lula à frente no placar do Brasil.
    const indicado = comProjecao(PROJECAO, {}, {}, { ...TSE, votos: [57000000, 58920000], percentuais: [49.17, 50.83] }, [INDICACAO]);
    expect(chances(indicado)).toBe("FLAVIO BOLSONARO 0% LULA 100%");
  });

  it('abre na base "Apuração + pesquisas", com o controle e o peso das pesquisas ao lado, ou "As duas bases já coincidem aqui"', () => {
    const html = comProjecao();
    expect(botoes(caixa(html))).toEqual([
      ["Só apuração", "false"],
      ["Apuração + pesquisas", "true"],
    ]);
    expect(caixa(html)).toMatch(/<a href="\/metodologia\/#juntas">As pesquisas pesam 3% na projeção agora\.<\/a>/);
    expect(caixa(comProjecao({ ...PROJECAO, coincidem: true }))).toMatch(/<a href="\/metodologia\/#juntas">As duas bases já coincidem aqui\.<\/a>/);
    // Escolhida a "Só apuração", a caixa e a curva mostram a dela.
    const soApuracao = comProjecao(PROJECAO, {}, { base: "so-apuracao" });
    expect(botoes(caixa(soApuracao))).toEqual([
      ["Só apuração", "true"],
      ["Apuração + pesquisas", "false"],
    ]);
    expect(texto(elemento(caixa(soApuracao), /<p class="valores"/))).toBe("FLAVIO BOLSONARO 49,4% ± 2,1 LULA 50,6% ± 2,1");
    expect(rotulo(soApuracao)).toBe("Virada projetada · ~88% das seções (80–95%) · chance de virada 59%");
  });

  it('compara a projeção com o 1º turno e com a indicação das pesquisas, no formato "LULA +1,8"; depois do fim, o resultado', () => {
    expect(texto(caixa(comProjecao()))).toContain(
      "A projeção, comparada: com o 1º turno, pelo placar entre finalistas (FLAVIO BOLSONARO 51,0%, LULA 49,0%), LULA +1,8; " +
        "com a indicação das pesquisas (FLAVIO BOLSONARO 51,0%, LULA 49,0%), LULA +1,8.",
    );
    // A Bahia terminou: Flávio 27,88%, Lula 72,12%, contra 30,1% × 69,9% no 1º turno.
    const terminou = comProjecao(
      { ...PROJECAO, comparacoes: { primeiroTurno: 30.1, pesquisas: 30.1 } },
      {},
      { lugar: { tipo: "uf", uf: "BA", em: "na Bahia" } },
      { secoes: { totalizadas: 41123, total: 41123, percentual: 100 }, votos: [2300000, 5949000], percentuais: [27.88, 72.12] },
    );
    expect(texto(caixa(terminou))).toContain(
      "O resultado, comparado: com o 1º turno, pelo placar entre finalistas (FLAVIO BOLSONARO 30,1%, LULA 69,9%), LULA +2,2;",
    );
  });

  it("leva à metodologia: o topo, a chance a #chance; e, da fase ao vivo em diante, às pesquisas do agregado", () => {
    const html = caixa(comProjecao());
    expect(html).toMatch(/<a href="\/metodologia\/">Como calculamos →<\/a>/);
    expect(html).toMatch(/<a href="\/metodologia\/#chance">Chance de vitória<\/a>/);
    expect(html).toMatch(/<a href="\/#pesquisas-registradas">as 8 pesquisas do agregado<\/a>/);
    expect(caixa(comProjecao(PROJECAO, {}, { pesquisasDoAgregado: null }))).not.toContain("pesquisas do agregado");
  });

  it('leva ao simulador por "Simular "e se" →", antes de "Como calculamos →", com a base escolhida e, numa UF ou num município, a UF', () => {
    const links = (html: string) => [...elemento(caixa(html), /<p[^>]*class="links"/).matchAll(/<a\b[^>]*>[^<]*<\/a>/g)].map((m) => m[0]);
    expect(links(comProjecao()).map(texto)).toEqual(['Simular "e se" →', "Como calculamos →", "as 8 pesquisas do agregado"]);
    expect(links(comProjecao())[0]).toMatch(/href="\/simulador\/\?base=com-pesquisas"/);
    expect(links(comProjecao(PROJECAO, {}, { base: "so-apuracao" }))[0]).toMatch(/href="\/simulador\/\?base=so-apuracao"/);
    const naBahia = comProjecao(PROJECAO, {}, { lugar: { tipo: "uf", uf: "BA", em: "na Bahia" } });
    expect(links(naBahia)[0]).toMatch(/href="\/simulador\/\?base=com-pesquisas&amp;de=ba"/);
    const emCampinas = comProjecao(PROJECAO, {}, { lugar: { tipo: "municipio", uf: "SP", em: "em Campinas" } });
    expect(links(emCampinas)[0]).toMatch(/href="\/simulador\/\?base=com-pesquisas&amp;de=sp"/);
  });

  it("sem o simulador no ar (a chave dele desligada), ou com a indicação do TSE, que o para, a caixa fica sem o link", () => {
    expect(texto(caixa(comProjecao(PROJECAO, { chaves: { ...LIGADAS, simulador: false } })))).not.toContain("Simular");
    const indicado = comProjecao(PROJECAO, {}, {}, { ...TSE, votos: [57000000, 58920000], percentuais: [49.17, 50.83] }, [INDICACAO]);
    expect(texto(caixa(indicado))).not.toContain("Simular");
    expect(texto(caixa(indicado))).toContain("Como calculamos →");
    // Numa UF, a indicação chega pelos eventos do Brasil do arquivo de rodada.
    const bahia: ArquivoDoLugar = { ...dadosDoLugar(TSE, [[50.34, 50.43, 49.57]]), lugar: "BA", projecao: PROJECAO };
    const naBahia = (eventosDoBrasil: EventoDaNarracao[]) =>
      vista(quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: { ...rodada("ao-vivo"), eventosDoBrasil }, lugar: bahia }), {
        lugar: { tipo: "uf", uf: "BA", em: "na Bahia" },
      });
    expect(texto(caixa(naBahia([])))).toContain("Simular");
    expect(texto(caixa(naBahia([INDICACAO])))).not.toContain("Simular");
  });

  it("desenha por cima da curva real a curva projetada tracejada, com a faixa de 95% e a legenda, e a escala conta a faixa", () => {
    const html = curva(comProjecao());
    expect(html.match(/<path class="linha-projetada"/g)).toHaveLength(2);
    expect(html.match(/<path class="faixa-projetada"/g)).toHaveLength(2);
    // A curva projetada vem por baixo das linhas da curva real.
    expect(html.indexOf("linha-projetada")).toBeLessThan(html.indexOf("data-linha-real"));
    expect(texto(elemento(html, /<figcaption class="legenda"/))).toContain("Curva projetada Faixa de 95%");
    // Sem a faixa, a escala iria de 46% a 54%; com os 49,2 ± 1,6 do fim, ela chega a 47,6: ainda de 46% a 54%. Com uma
    // margem de 9 pontos, a faixa chega a 40,2, e a escala vai de 40% a 60%.
    const larga = curva(
      comProjecao({
        ...PROJECAO,
        comPesquisas: naBase({
          curva: [
            [50.3, 50.4, 0],
            [100, 49.2, 9],
          ],
        }),
      }),
    );
    expect([...larga.matchAll(/<text[^>]*data-eixo-y[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual(["40%", "45%", "50%", "55%", "60%"]);
  });

  it("dá o rótulo do sinal de virada nos três estados, com o losango só na virada projetada e a faixa cinza também na possível", () => {
    const projetada = comProjecao();
    expect(rotulo(projetada)).toBe("Virada projetada · ~88% das seções (80–95%) · chance de virada 62%");
    expect(curva(projetada)).toMatch(/<p[^>]*data-sinal-de-virada[^>]*><a href="\/metodologia\/#virada">/);
    expect(curva(projetada)).toContain("losango-virada");
    expect(curva(projetada)).toContain("faixa-virada");

    const possivel = comProjecao({
      ...PROJECAO,
      comPesquisas: naBase({ chance: 75, chanceDeVirada: 25, sinalDeVirada: "virada possível", virada: { x: null, cedo: 69, tarde: null } }),
    });
    expect(rotulo(possivel)).toBe("Virada possível · a partir de ~69% das seções · chance de virada 25%");
    expect(curva(possivel)).not.toContain("losango-virada");
    expect(curva(possivel)).toContain("faixa-virada");

    const semSinal = comProjecao({
      ...PROJECAO,
      comPesquisas: naBase({ chance: 97, chanceDeVirada: 3, sinalDeVirada: "sem sinal de virada", virada: { x: null, cedo: 96, tarde: null } }),
    });
    expect(rotulo(semSinal)).toBe("Sem sinal de virada · chance de virada 3%");
    expect(curva(semSinal)).not.toContain("losango-virada");
    expect(curva(semSinal)).not.toContain("faixa-virada");
  });

  it("entre as 17h e a primeira seção, a curva já mostra a curva projetada de 0% a 100%, sem rótulo do sinal", () => {
    // Antes da primeira seção, ninguém está atrás no placar parcial (Sinal de virada, decisão 3).
    const antesDaPrimeira: ProjecaoDoLugar = {
      ...PROJECAO,
      comPesquisas: naBase({
        projecao: 49.0,
        chance: 25,
        chanceDeVirada: null,
        sinalDeVirada: null,
        curva: [
          [2, 49.0, 0.4],
          [100, 49.0, 2.9],
        ],
      }),
    };
    const html = vista(
      quadro({
        fase: "ao-vivo",
        indicador: { estado: "ao-vivo" },
        rodada: rodada("ao-vivo"),
        lugar: { ...dadosDoLugar({ secoes: { totalizadas: 0, total: 472027, percentual: 0 } }), projecao: antesDaPrimeira },
      }),
    );
    expect(texto(curva(html))).toContain("A curva começa com as primeiras seções totalizadas.");
    expect(curva(html).match(/<path class="linha-projetada"/g)).toHaveLength(2);
    expect(curva(html)).not.toContain("data-linha-real");
    expect(curva(html)).not.toContain("data-sinal-de-virada");
    expect(html).toContain("data-projecao-ao-vivo");
  });

  it("com a indicação do TSE, o rótulo do sinal de virada some, também nas outras páginas", () => {
    expect(curva(comProjecao(PROJECAO, {}, {}, TSE, [INDICACAO]))).not.toContain("data-sinal-de-virada");
    const bahia: ArquivoDoLugar = { ...dadosDoLugar(TSE, [[50.34, 50.43, 49.57]]), lugar: "BA", projecao: PROJECAO };
    const comUmaSo = vista(quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: rodada("ao-vivo"), lugar: bahia }), {
      lugar: { tipo: "uf", uf: "BA", em: "na Bahia" },
    });
    expect(curva(comUmaSo)).toContain("data-sinal-de-virada");
    const daBahia = vista(
      quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: { ...rodada("ao-vivo"), eventosDoBrasil: [INDICACAO] }, lugar: bahia }),
      { lugar: { tipo: "uf", uf: "BA", em: "na Bahia" } },
    );
    expect(curva(daBahia)).not.toContain("data-sinal-de-virada");
    expect(curva(daBahia)).not.toContain("losango-virada");
  });

  it("na totalização final, a caixa sai, e com ela a curva projetada", () => {
    const html = comProjecao(PROJECAO, { fase: "encerrada", indicador: { estado: "encerrada" }, rodada: rodada("encerrada") });
    expect(html).not.toContain("data-projecao-ao-vivo");
    expect(html).not.toContain("linha-projetada");
    expect(html).toContain("data-curva-real");
  });

  it("antes das 17h, não aparece: a projeção é a do painel de antes das 17h", () => {
    const html = comProjecao(PROJECAO, { fase: "antes-das-17h", indicador: { estado: "antes-das-17h", faltam: null }, rodada: rodada("antes-das-17h") });
    expect(html).not.toContain("data-projecao-ao-vivo");
  });

  it('desligada a projeção, saem a caixa, a curva projetada e o rótulo; desligada a base com pesquisas, só fica a "Só apuração", sem o controle', () => {
    const semProjecao = comProjecao(PROJECAO, { chaves: { ...LIGADAS, projecao: false, simulador: false } });
    for (const parte of ["data-projecao-ao-vivo", "linha-projetada", "data-sinal-de-virada"]) expect(semProjecao).not.toContain(parte);
    expect(semProjecao).toContain("data-curva-real");

    const semPesquisas = comProjecao(
      { soApuracao: PROJECAO.soApuracao, comparacoes: PROJECAO.comparacoes },
      { chaves: { ...LIGADAS, baseComPesquisas: false } },
    );
    expect(botoes(caixa(semPesquisas))).toEqual([]);
    expect(texto(caixa(semPesquisas))).toContain("Base da projeção: Só apuração");
    expect(texto(caixa(semPesquisas))).not.toContain("As pesquisas pesam");
    expect(texto(elemento(caixa(semPesquisas), /<p class="valores"/))).toBe("FLAVIO BOLSONARO 49,4% ± 2,1 LULA 50,6% ± 2,1");
  });

  it("a manchete continua só com o placar oficial", () => {
    expect(texto(elemento(comProjecao(), /<p[^>]*data-manchete/))).toBe("Flávio lidera com 50,43% dos votos válidos e 50,34% das seções totalizadas");
  });
});

describe("projeção do município, pela tabela de projeções da UF", () => {
  // Volume de gravações na noite, decisão 1: o JSON do município só tem o TSE e a narração dele, e a projeção sai da linha
  // dele na tabela da UF. Num município só, a curva projetada é a ligação do placar parcial à projeção. Aqui, Flávio tem
  // 6.000 votos e Lula 4.000 com 60% das seções, e a projeção dá 48,0% a Flávio em 16.000 válidos: Flávio fica com 1.680
  // dos 6.000 que faltam, e a curva passa por 50% com 90,3% das seções (6.000 + 1.680f = 5.000 + 3.000f).
  const colunas = (parte: Partial<ColunasDaBase>): ColunasDaBase => ({
    projecao: [51.0, 48.0],
    margem: [3.0, 2.0],
    chance: [62, 20],
    chanceDeVirada: [null, 80],
    sinalDeVirada: [null, "virada projetada"],
    virada: [
      [null, null, null],
      [90, 80, 97],
    ],
    ...parte,
  });
  /** A tabela de Minas Gerais como o leitor a junta: os municípios, com as comparações, e as projeções deles. */
  const TABELA: TabelaDeProjecoesLida = {
    uf: "MG",
    assinatura: "0badcafe",
    municipios: ["41000", "41238"],
    comparacoes: { primeiroTurno: [55.0, 53.2], pesquisas: [55.0, 53.2] },
    projecao: {
      assinatura: "0badcafe",
      validos: [500, 16000],
      soApuracao: colunas({
        projecao: [51.2, 48.5],
        margem: [3.1, 2.2],
        chance: [64, 25],
        chanceDeVirada: [null, 75],
        virada: [
          [null, null, null],
          [92, 82, null],
        ],
      }),
      comPesquisas: colunas({}),
      coincidem: [true, false],
    },
  };
  const MUNICIPIO: ArquivoDoLugar = {
    ...dadosDoLugar({ secoes: { totalizadas: 120, total: 200, percentual: 60 }, votos: [6000, 4000], percentuais: [60, 40] }, [[60, 60, 40]]),
    lugar: "41238",
  };
  const NO_MUNICIPIO: PropsDaVista["lugar"] = { tipo: "municipio", uf: "MG", em: "em Uberlândia (MG)" };
  const aoVivo = (parte: Partial<QuadroAoVivo> = {}) =>
    quadro({
      fase: "ao-vivo",
      indicador: { estado: "ao-vivo" },
      rodada: rodada("ao-vivo"),
      lugar: MUNICIPIO,
      tabelaDeProjecoes: TABELA,
      ...parte,
    });
  const comTabela = (parte: Partial<QuadroAoVivo> = {}, outras: Partial<PropsDaVista> = {}) => vista(aoVivo(parte), { lugar: NO_MUNICIPIO, ...outras });
  const caixa = (html: string) => elemento(html, /<section[^>]*data-projecao-ao-vivo/);
  const curva = (html: string) => elemento(html, /<section[^>]*data-curva-real/);

  it("mostra a caixa da projeção e o rótulo do sinal de virada a partir da linha do município na tabela da UF", () => {
    const html = comTabela();
    expect(texto(elemento(caixa(html), /<p class="valores"/))).toBe("FLAVIO BOLSONARO 48,0% ± 2,0 LULA 52,0% ± 2,0");
    expect(texto(elemento(caixa(html), /<p class="chance-rotulos"/))).toBe("FLAVIO BOLSONARO 20% LULA 80%");
    expect(texto(caixa(html))).toContain("As pesquisas pesam 3% na projeção agora.");
    expect(texto(caixa(html))).toContain("com o 1º turno, pelo placar entre finalistas (FLAVIO BOLSONARO 53,2%, LULA 46,8%), LULA +5,2");
    expect(texto(elemento(curva(html), /<p[^>]*data-sinal-de-virada/))).toBe("Virada projetada · ~90% das seções (80–97%) · chance de virada 80%");
    expect(curva(html)).toContain("losango-virada");
    // Na "Só apuração", a linha da outra base.
    const soApuracao = comTabela({}, { base: "so-apuracao" });
    expect(texto(elemento(caixa(soApuracao), /<p class="valores"/))).toBe("FLAVIO BOLSONARO 48,5% ± 2,2 LULA 51,5% ± 2,2");
    expect(texto(elemento(curva(soApuracao), /<p[^>]*data-sinal-de-virada/))).toBe("Virada projetada · ~92% das seções · chance de virada 75%");
  });

  it("desenha a curva projetada do placar parcial à projeção, sem modelo no navegador, cruzando 50% onde a virada projetada diz", () => {
    expect(curva(comTabela())).toContain(
      'aria-label="Curva real: Flávio 60,00% e Lula 40,00% com 60,00% das seções totalizadas; Curva projetada na base Apuração + pesquisas: ' +
        'FLAVIO BOLSONARO de 60,0% a 48,0% e LULA de 40,0% a 52,0%, de 60,0% a 100,0% das seções totalizadas"',
    );
    const { comPesquisas } = projecaoDoLugar(aoVivo())!;
    const pontos = comPesquisas!.curva;
    // Com 90% das seções, Flávio ainda tem 7.260 de 14.500 votos (50,07%); com 92%, 7.344 de 14.800 (49,62%).
    const antes = pontos.filter(([, pct]) => pct >= 50).at(-1)!;
    const depois = pontos.find(([, pct]) => pct < 50)!;
    expect([antes[0], depois[0]]).toEqual([90, 92]);
    expect(depois[1]).toBeCloseTo(49.62, 2);
    // A margem cresce com o que chega, de 0 no placar parcial à da projeção.
    expect([pontos[0]![2], pontos.at(-1)![2]]).toEqual([0, 2.0]);
  });

  it("antes da primeira seção do município, a curva é a própria projeção, de 0% a 100%; terminado ele, não há curva", () => {
    const semSecoes = {
      ...MUNICIPIO,
      tse: { ...MUNICIPIO.tse, secoes: { totalizadas: 0, total: 200, percentual: 0 }, votos: [0, 0], percentuais: [0, 0] },
      curva: [],
    };
    const curvaAntes = projecaoDoLugar(aoVivo({ lugar: semSecoes }))!.comPesquisas!.curva;
    expect([curvaAntes[0], curvaAntes.at(-1)]).toEqual([
      [0, 48.0, 2.0],
      [100, 48.0, 2.0],
    ]);
    const terminou = {
      ...MUNICIPIO,
      tse: { ...MUNICIPIO.tse, secoes: { totalizadas: 200, total: 200, percentual: 100 }, votos: [7680, 8320], percentuais: [48, 52] },
    };
    expect(projecaoDoLugar(aoVivo({ lugar: terminou }))!.comPesquisas!.curva).toHaveLength(1);
  });

  it("sem a tabela, sem o município nela ou sem a projeção no ar, a página do município fica sem a caixa e sem a curva projetada", () => {
    // Sem a projeção, a tabela vem só com os municípios: a projeção desligada, ou a tabela de outra base (o leitor não junta).
    const { projecao, ...semProjecao } = TABELA;
    for (const parte of [{ tabelaDeProjecoes: null }, { tabelaDeProjecoes: semProjecao }, { lugar: { ...MUNICIPIO, lugar: "41999" } }]) {
      const html = comTabela(parte);
      expect(html).not.toContain("data-projecao-ao-vivo");
      expect(html).not.toContain("linha-projetada");
    }
    // Desligada a base com pesquisas, a tabela vem só com a "Só apuração".
    const { assinatura, validos, soApuracao } = projecao!;
    const semPesquisas = comTabela({
      tabelaDeProjecoes: { ...semProjecao, projecao: { assinatura, validos, soApuracao } },
      chaves: { ...LIGADAS, baseComPesquisas: false },
    });
    expect(botoes(caixa(semPesquisas))).toEqual([]);
    expect(texto(elemento(caixa(semPesquisas), /<p class="valores"/))).toBe("FLAVIO BOLSONARO 48,5% ± 2,2 LULA 51,5% ± 2,2");
  });
});

describe("faixa de aviso", () => {
  // Operação na noite, decisão 10: os três avisos prontos, com os textos exatos, numa faixa abaixo da manchete.
  const lugar = dadosDoLugar({ secoes: { totalizadas: 237618, total: 472027, percentual: 50.34 }, votos: [57873281, 56885102], percentuais: [50.43, 49.57] });
  const comAviso = (aviso: QuadroAoVivo["aviso"], chaves: ChavesDaNoite = LIGADAS) =>
    vista(quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: rodada("ao-vivo"), lugar, aviso, chaves }));
  const faixa = (html: string) => elemento(html, /<p[^>]*data-aviso/);

  it("mostra o aviso pronto publicado, com o texto exato, abaixo da manchete e antes do placar", () => {
    const html = comAviso(1);
    expect(texto(faixa(html))).toBe("O TSE está demorando a divulgar novos dados. Os números abaixo são os mais recentes divulgados.");
    expect(texto(faixa(comAviso(3)))).toBe("A projeção do Apurador está suspensa. O placar oficial do TSE continua atualizado.");
    expect(html.indexOf("data-manchete")).toBeLessThan(html.indexOf("data-aviso"));
    expect(html.indexOf("data-aviso")).toBeLessThan(html.indexOf("data-placar-oficial"));
  });

  it("o aviso 2 leva o link do app oficial do TSE", () => {
    const html = faixa(comAviso(2));
    // Sem o espaço que `texto` põe no lugar de cada tag: o ponto final vem colado ao link.
    expect(html.replace(/<[^>]+>/g, "")).toBe("O Apurador está com instabilidade. Acompanhe também no app oficial do TSE.");
    expect(html).toMatch(/<a[^>]*href="https:\/\/resultados\.tse\.jus\.br\/oficial\/app\/index\.html"[^>]*>app oficial do TSE<\/a>/);
  });

  it("sem aviso não há faixa, e no plano zero ela continua", () => {
    expect(comAviso(null)).not.toContain("data-aviso");
    expect(texto(faixa(comAviso(1, { ...LIGADAS, nucleoMinimo: false })))).toContain("O TSE está demorando a divulgar novos dados.");
  });
});
