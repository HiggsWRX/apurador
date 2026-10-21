import type { ArquivoDeRodada, ArquivoDoLugar, ChavesDaNoite } from "@apurador/coletor";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { VistaDoBlocoAoVivo, type PropsDaVista } from "../src/components/VistaDoBlocoAoVivo";
import { COMPARACAO_DESLIGADA, type EstadoDaComparacao, type TurnoPassado } from "../src/lib/curva-de-comparacao";
import type { QuadroAoVivo } from "../src/lib/leitor-ao-vivo";
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
  return { fase: "antes-das-17h", indicador: { estado: "antes-das-17h", faltam: null }, rodada: null, lugar: null, ultimaLeitura: null, mudaram: [], chaves: LIGADAS, aviso: null, ...parte };
}

function rodada(fase: ArquivoDeRodada["fase"]): ArquivoDeRodada {
  return { rodada: "2026-10-25T22:42:15.000Z", fase, novidade: { totalizacao: "2026-10-25 19:42:10", vista: "2026-10-25T22:42:12.000Z" }, candidatos: CANDIDATOS, chaves: LIGADAS, aviso: null, eventosDoBrasil: [] };
}

function dadosDoLugar(tse: Partial<ArquivoDoLugar["tse"]>, curva: ArquivoDoLugar["curva"] = []): ArquivoDoLugar {
  return {
    lugar: "BR",
    tse: { totalizacao: "2026-10-25 19:42:10", secoes: { totalizadas: 0, total: 472027, percentual: 0 }, votos: [0, 0], percentuais: [0, 0], final: false, ...tse },
    curva,
    narracao: [],
  };
}

const PADRAO: Omit<PropsDaVista, "quadro"> = { lugar: { tipo: "brasil", em: "no Brasil" }, fotos: {}, movimentoReduzido: false, proximaLeitura: 30, lendo: false };
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
  const aoVivo = (tse: Partial<ArquivoDoLugar["tse"]>) => quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: rodada("ao-vivo"), lugar: dadosDoLugar(tse) });
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
    const html = vista(quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: rodada("ao-vivo"), lugar: null }), { lugar: { tipo: "brasil", em: "no Brasil" } });
    expect(html).not.toContain("data-manchete");
    const placar = texto(elemento(html, /<section[^>]*data-placar-oficial/));
    expect(placar).not.toContain("17h");
    expect(placar).toContain("Aguardando os primeiros dados do TSE");
  });

  it("com os mesmos votos, diz que estão empatados", () => {
    const q = aoVivo({ secoes: { totalizadas: 1, total: 12, percentual: 8.33 }, votos: [104, 104], percentuais: [50, 50] });
    expect(mancheteDe(q, { lugar: { tipo: "municipio", uf: "RR", em: "em Uiramutã (RR)" } })).toBe("Flávio e Lula empatam com 104 votos cada, com 8,33% das seções totalizadas");
  });
});

describe("indicador ao vivo, no cartão do placar", () => {
  const lugar = dadosDoLugar({ secoes: { totalizadas: 237618, total: 472027, percentual: 50.34 }, votos: [57873281, 56885102], percentuais: [50.43, 49.57] });
  const com = (indicador: QuadroAoVivo["indicador"], outras: Partial<PropsDaVista> = {}, fase: QuadroAoVivo["fase"] = "ao-vivo") => {
    const html = vista(quadro({ fase, indicador, rodada: rodada(fase), lugar, ultimaLeitura: 12 }), { proximaLeitura: 18, ...outras });
    const placar = elemento(html, /<section[^>]*data-placar-oficial/);
    return { placar, indicador: elemento(placar, /<div[^>]*data-indicador/) };
  };

  it("ao vivo: o ponto pulsante, o anel de 30 s e \"Atualiza sozinho, sem recarregar\", com o detalhe da última leitura e da última totalização", () => {
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

  it("com movimento reduzido, não há pulso, e o anel vira \"próxima leitura em N s\"", () => {
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

  it("sem conexão: \"Sem conexão · tentando de novo\"", () => {
    expect(texto(com({ estado: "sem-conexao" }).indicador)).toContain("Sem conexão · tentando de novo");
  });

  it("encerrada: \"Apuração encerrada\", sem anel, e o detalhe com a última totalização", () => {
    const { indicador } = com({ estado: "encerrada" }, {}, "encerrada");
    expect(texto(indicador)).toMatch(/^Apuração encerrada/);
    expect(indicador).not.toContain("data-anel");
    expect(texto(elemento(indicador, /<details/))).toContain("Última totalização do TSE às 19:42:10.");
  });

  it("antes das 17h: sem \"Ao vivo\", com a contagem regressiva só na última hora", () => {
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
      return elemento(vista(quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: rodada("ao-vivo"), lugar }), { comparacao }), /<section[^>]*data-curva-real/);
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
    vista(quadro({ fase, indicador: fase === "ao-vivo" ? { estado: "ao-vivo" } : { estado: "antes-das-17h", faltam: null }, rodada: rodada(fase), lugar, chaves: { ...LIGADAS, nucleoMinimo } }), {
      placarNaTela: false,
    });

  it("com o núcleo mínimo desligado, na fase ao vivo, o bloco dá lugar a \"Acompanhe a apuração no app oficial do TSE\", com o link", () => {
    const html = comNucleoMinimo(false);
    const planoZero = elemento(html, /<section[^>]*data-plano-zero/);
    expect(texto(planoZero)).toBe("Acompanhe a apuração no app oficial do TSE");
    expect(planoZero).toMatch(/<a[^>]*href="https:\/\/resultados\.tse\.jus\.br\/oficial\/app\/index\.html"[^>]*>app oficial do TSE<\/a>/);
    for (const dado of ["data-placar-oficial", "data-manchete", "data-linha-fixa", "data-curva-real", "data-indicador", "50,43"]) expect(html).not.toContain(dado);
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

describe("faixa de aviso", () => {
  // Operação na noite, decisão 10: os três avisos prontos, com os textos exatos, numa faixa abaixo da manchete.
  const lugar = dadosDoLugar({ secoes: { totalizadas: 237618, total: 472027, percentual: 50.34 }, votos: [57873281, 56885102], percentuais: [50.43, 49.57] });
  const comAviso = (aviso: QuadroAoVivo["aviso"], chaves: ChavesDaNoite = LIGADAS) => vista(quadro({ fase: "ao-vivo", indicador: { estado: "ao-vivo" }, rodada: rodada("ao-vivo"), lugar, aviso, chaves }));
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
