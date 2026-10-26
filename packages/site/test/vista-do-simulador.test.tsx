import type { ArquivoDoSimuladorAoVivo } from "@apurador/coletor";
import { HIPOTESES_ZERADAS, lerConstantes, REGIOES, type BaseDoModelo, type Hipoteses } from "@apurador/modelo";
import constantesDoModelo from "@apurador/modelo/constantes.json";
import { assinaturaDosLugares, idDoMunicipio } from "@apurador/pipeline";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { IndicadorAoVivo } from "../src/components/IndicadorAoVivo";
import { VistaDoSimulador, type PropsDaVistaDoSimulador } from "../src/components/VistaDoSimulador";
import { compactarBase, type ArquivoDoSimulador } from "../src/lib/arquivo-do-simulador";
import type { IdDaBase } from "../src/lib/bases-da-projecao";
import { enderecoDaSimulacao, lerEndereco, type FinalistasDoSimulador } from "../src/lib/hipoteses";
import { prepararSimulador, simularNaTela, type DadosDoSimulador } from "../src/lib/simulador";
import { AGREGADO, ler } from "./dados-do-build";
import { elemento, elementos, texto } from "./html";

// O que a tela do simulador mostra, renderizada em HTML como a ilha a desenha, sobre o arquivo do simulador montado com
// os dados do repositório: a base do modelo de 25/10, as constantes congeladas e o agregado do relógio dos testes
// (19/10, Flávio 51,1). O 1º turno das regiões é o do arquivo oficial (Nordeste: Flávio 32,6% entre os dois).

const FINALISTAS: FinalistasDoSimulador = [
  { nomeUrna: "FLAVIO BOLSONARO", nomeCurto: "Flávio", cor: "flavio" },
  { nomeUrna: "LULA", nomeCurto: "Lula", cor: "lula" },
];
const NORDESTE = REGIOES.indexOf("Nordeste");

const BASE = JSON.parse(ler("bases/2026-2.json")) as BaseDoModelo;
const ASSINATURA = assinaturaDosLugares(BASE.municipios.map((m) => idDoMunicipio(m.municipio)));
const arquivo = (agregado: ArquivoDoSimulador["agregado"]): ArquivoDoSimulador => ({
  assinatura: ASSINATURA,
  base: compactarBase(BASE),
  agregado,
  constantes: lerConstantes(constantesDoModelo),
  placarEntreFinalistasDoBrasil: 51.0,
  // do dados/turnos/2026-1.json, somando as UFs: o placar entre finalistas de Flávio e o comparecimento
  regioes: [
    { placarEntreFinalistas: 52.4, comparecimento: 0.806 },
    { placarEntreFinalistas: 32.61, comparecimento: 0.816 },
    { placarEntreFinalistas: 63.4, comparecimento: 0.783 },
    { placarEntreFinalistas: 56.41, comparecimento: 0.773 },
    { placarEntreFinalistas: 65.76, comparecimento: 0.795 },
  ],
});
const DUAS_BASES = prepararSimulador(arquivo({ valor: AGREGADO.valor, incerteza: AGREGADO.incerteza }));
const SO_A_APURACAO = prepararSimulador(arquivo(null));

const hipoteses = (h: { brasil?: number; regioes?: Partial<Record<string, number>>; comparecimento?: Partial<Record<string, number>> }): Hipoteses => ({
  voto: { brasil: h.brasil ?? 0, regioes: REGIOES.map((r) => h.regioes?.[r] ?? 0) },
  comparecimento: REGIOES.map((r) => h.comparecimento?.[r] ?? 0),
});

function vista(opcoes: { dados?: DadosDoSimulador; base?: IdDaBase; hipoteses?: Hipoteses; outras?: Partial<PropsDaVistaDoSimulador> } = {}) {
  const dados = opcoes.dados ?? DUAS_BASES;
  const base = opcoes.base ?? dados.bases.at(-1)!.id;
  const h = opcoes.hipoteses ?? HIPOTESES_ZERADAS;
  const comPesquisas = dados.bases.find((b) => b.id === "com-pesquisas")?.partida.projecao;
  const props: PropsDaVistaDoSimulador = {
    finalistas: FINALISTAS,
    tela: simularNaTela(dados, base, h),
    hipoteses: h,
    base,
    bases: dados.bases.map((b) => b.id),
    pesoDasPesquisas: comPesquisas ? comPesquisas.pesoDasPesquisas : null,
    coincidem: dados.coincidem,
    placarEntreFinalistasDoBrasil: dados.placarEntreFinalistasDoBrasil,
    viesDoPrimeiroTurno: 2.1,
    deOutraPessoa: false,
    regioesAbertas: [],
    copia: null,
    aoMudarHipoteses: () => {},
    aoMudarBase: () => {},
    aoCopiar: () => {},
    ...opcoes.outras,
  };
  return render(<VistaDoSimulador {...props} />);
}

const linha = (html: string, tipo: "simulacao" | "projecao") => texto(elemento(html, new RegExp(`<div[^>]*data-linha="${tipo}"`)));

describe("a simulação ao lado da projeção do Apurador", () => {
  // Lula +2 antes da primeira seção: todo o voto falta, e Flávio sai da projeção de 51,1 (± 3,5, chance de 73%, a da
  // caixa da projeção no relógio dos testes, ticket 09) para 49,1, com a mesma margem; a chance vai a Φ(−0,88 ÷ 1,79), 31%.
  const html = vista({ hipoteses: hipoteses({ brasil: -2 }) });

  it("mostra no Brasil a simulação e a projeção do Apurador, cada uma com o resultado ± a margem de 95% e a chance de vitória", () => {
    expect(linha(html, "projecao")).toBe("Projeção do Apurador Flávio 51,1% Lula 48,9% ± 3,5 Chance de vitória: Flávio 73% Lula 27%");
    expect(linha(html, "simulacao")).toBe("Simulação Flávio 49,1% Lula 50,9% ± 3,5 Chance de vitória: Flávio 31% Lula 69%");
    expect(elementos(html, /<span[^>]*class="chance-barra"/)).toHaveLength(2);
  });

  it("põe a simulação na moldura pontilhada, com o selo, e a projeção na tracejada, também na tabela", () => {
    expect(texto(html)).toContain("Simulação · com as suas hipóteses, não é a projeção do Apurador");
    expect(html).toMatch(/<div[^>]*class="sim-linha sim-linha-simulacao"/);
    expect(html).toMatch(/<div[^>]*class="sim-linha sim-linha-projecao"/);
    expect(elementos(html, /<section[^>]*class="cartao simulacao/)).toHaveLength(1);
    const tabela = elemento(html, /<section[^>]*data-tabela-das-regioes/);
    expect(tabela).toMatch(/<colgroup span="2" class="sim-colunas-da-simulacao"><\/colgroup><colgroup span="2" class="sim-colunas-da-projecao">/);
    expect(texto(html)).toContain("Estimativa do Apurador. Não é resultado oficial nem garantia do resultado.");
    for (const cartao of [elemento(html, /<section[^>]*sim-curva/), tabela]) expect(texto(cartao)).toContain("Cálculo do Apurador com dados do TSE");
  });

  it("desenha a curva da simulação, pontilhada, sobre a curva projetada do Apurador, tracejada e mais clara", () => {
    const figura = elemento(html, /<figure[^>]*data-curva-projetada/);
    expect(elementos(figura, /<path[^>]*class="linha-da-simulacao"/)).toHaveLength(2);
    expect(elementos(figura, /<path[^>]*class="linha-projetada linha-do-site"/)).toHaveLength(2);
    expect(elementos(figura, /<path[^>]*class="faixa-projetada"/)).toHaveLength(2);
    const legenda = texto(elemento(figura, /<figcaption/));
    expect(legenda).toContain("Simulação");
    expect(legenda).toContain("Projeção do Apurador");
    // a curva da simulação termina no resultado dela, e a do site, na projeção
    expect(/aria-label="([^"]+)"/.exec(figura)?.[1]).toMatch(
      /^Curva da simulação na base Apuração \+ pesquisas: FLAVIO BOLSONARO de [\d,]+% a 49,1% .*; a curva projetada do Apurador termina com FLAVIO BOLSONARO 51,1% e LULA 48,9%$/,
    );
  });

  it("dá a tabela das cinco regiões, com a simulação e a projeção do Apurador, sem resultado por lugar", () => {
    const tabela = elemento(html, /<section[^>]*data-tabela-das-regioes/);
    const linhas = elementos(tabela, /<tr[^>]*data-regiao=/);
    expect(linhas.map((l) => /data-regiao="([^"]+)"/.exec(l)?.[1])).toEqual(["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]);
    // Lula +2 em todo lugar: em cada região, a simulação dá 2 pontos a menos a Flávio que a projeção, com uma casa
    for (const l of linhas) {
      const [simulacao, , projecao] = elementos(l, /<td/).map((td) => Number(texto(td).replace("%", "").replace(",", ".")));
      expect(Math.abs(projecao! - simulacao! - 2), l).toBeLessThanOrEqual(0.1);
    }
    expect(html).not.toMatch(/<svg[^>]*mapa|data-mapa/);
  });

  it("traduz cada hipótese em relação ao 1º turno, no Brasil e em cada região", () => {
    const traducoes = elementos(html, /<p[^>]*class="sim-traducao"/).map(texto);
    expect(traducoes).toHaveLength(6);
    // Brasil: 51,0 no 1º turno, e Flávio em 49,1 na simulação
    expect(traducoes[0]).toBe("isso dá Lula +1,9 sobre o 1º turno no Brasil");
    // Nordeste: 32,6 no 1º turno; a indicação das pesquisas soma a mudança de 0,1 do agregado, e Lula +2 tira 2
    expect(traducoes[1 + NORDESTE]).toBe("isso dá Lula +1,9 sobre o 1º turno no Nordeste");
  });

  it("não diz quem vence nem chama a simulação de previsão", () => {
    expect(texto(html)).not.toMatch(/vai vencer|deve vencer|vence a eleição|previs|imposs|aprend|\bIA\b/i);
  });
});

describe("as hipóteses", () => {
  it("têm o controle do Brasil de −5 a +5 e os das regiões de −10 a +10, em passos de 0,5, e o comparecimento em passos de 1", () => {
    const html = vista();
    const faixa = (id: string) => {
      const input = new RegExp(`<input[^>]*id="${id}"[^>]*>`).exec(html)?.[0] ?? "";
      return ["min", "max", "step"].map((a) => new RegExp(`${a}="([^"]+)"`).exec(input)?.[1]);
    };
    expect(faixa("sim-voto-brasil")).toEqual(["-5", "5", "0.5"]);
    REGIOES.forEach((_, r) => {
      expect(faixa(`sim-voto-${r}`)).toEqual(["-10", "10", "0.5"]);
      expect(faixa(`sim-comparecimento-${r}`)).toEqual(["-10", "10", "1"]);
    });
  });

  it("escreve cada hipótese no formato 'Lula +2', com Flávio à esquerda e Lula à direita, em ordem alfabética", () => {
    const html = vista({ hipoteses: hipoteses({ brasil: -2, regioes: { Nordeste: 4.5 }, comparecimento: { Sul: -3 } }) });
    const brasil = elemento(html, /<section[^>]*data-controle="brasil"/);
    expect(texto(elemento(brasil, /<output/))).toBe("Lula +2");
    // o controle cresce para a direita, para Lula
    expect(/<input[^>]*>/.exec(brasil)?.[0]).toMatch(/value="2"/);
    expect(texto(elemento(brasil, /<div[^>]*class="sim-pontas"/))).toBe("Flávio +5 0 Lula +5");
    const nordeste = elemento(html, /<details[^>]*data-regiao="Nordeste"/);
    expect(texto(elemento(nordeste, /<summary/))).toBe("Nordeste Flávio +4,5");
    expect(texto(elemento(elemento(html, /<details[^>]*data-regiao="Sul"/), /<summary/))).toBe("Sul comparecimento −3 pontos percentuais");
  });

  it("abre expandidas as regiões pedidas, e só elas", () => {
    const html = vista({ outras: { regioesAbertas: [NORDESTE] } });
    expect(elementos(html, /<details[^>]*\bopen\b/).map((d) => /data-regiao="([^"]+)"/.exec(d)?.[1])).toEqual(["Nordeste"]);
  });

  it("dá o par simétrico de hipóteses prontas só na base Apuração + pesquisas, antes da apuração", () => {
    const prontas = (html: string) => elementos(html, /<button[^>]*class="sim-pronta"/).map(texto);
    expect(prontas(vista())).toEqual(["As pesquisas subestimam Flávio como no 1º turno", "As pesquisas subestimam Lula na mesma medida"]);
    expect(prontas(vista({ base: "so-apuracao" }))).toEqual([]);
    // a pronta escolhida fica marcada
    const marcadas = elementos(vista({ hipoteses: hipoteses({ brasil: 2.1 }) }), /<button[^>]*class="sim-pronta"/).map(
      (b) => /aria-pressed="(\w+)"/.exec(b)?.[1],
    );
    expect(marcadas).toEqual(["true", "false"]);
  });

  it("tem sempre 'Zerar', desligado quando nada foi mexido, e 'Copiar link'", () => {
    const acoes = (html: string) => elemento(html, /<div[^>]*class="sim-acoes"/);
    expect(elementos(acoes(vista()), /<button/).map(texto)).toEqual(["Zerar", "Copiar link"]);
    expect(elemento(acoes(vista()), /<button/)).toMatch(/disabled/);
    expect(elemento(acoes(vista({ hipoteses: hipoteses({ comparecimento: { Norte: 2 } }) })), /<button/)).not.toMatch(/disabled/);
    expect(texto(acoes(vista({ outras: { copia: { estado: "copiado" } } })))).toContain("Link copiado.");
    expect(acoes(vista({ outras: { copia: { estado: "manual", endereco: "https://apurador.org/simulador/?base=so-apuracao" } } }))).toContain(
      'value="https://apurador.org/simulador/?base=so-apuracao"',
    );
  });
});

describe("o que seria preciso", () => {
  it("diz quanto o voto que falta precisaria pender para quem está atrás, com 'Aplicar'", () => {
    // com Flávio em 51,1, Lula precisaria de 1,1 ponto no país
    const preciso = elemento(vista(), /<section[^>]*data-preciso/);
    expect(texto(preciso)).toMatch(
      /^O que seria preciso Para Lula passar à frente, o voto que falta precisaria pender mais 1,1 ponto para ele no país\. Aplicar$/,
    );
  });

  it("fora da faixa do controle, diz 'mais de 5 pontos', sem 'Aplicar'", () => {
    const preciso = elemento(vista({ hipoteses: hipoteses({ regioes: { Sudeste: 10, Sul: 10 } }) }), /<section[^>]*data-preciso/);
    expect(texto(preciso)).toBe("O que seria preciso Para Lula passar à frente, o voto que falta precisaria pender mais de 5 pontos para ele no país.");
  });
});

describe("a base da projeção", () => {
  it("mostra o mesmo controle da página, com 'As pesquisas pesam 100% na projeção agora'", () => {
    const html = vista();
    const controle = elemento(html, /<div[^>]*class="base-da-projecao sim-base"/);
    expect(elementos(controle, /<button/).map(texto)).toEqual(["Só apuração", "Apuração + pesquisas"]);
    expect(elementos(controle, /<button/).map((b) => /aria-pressed="(\w+)"/.exec(b)?.[1])).toEqual(["false", "true"]);
    expect(controle).toMatch(/<a[^>]*href="\/metodologia\/#juntas"[^>]*>As pesquisas pesam 100% na projeção agora\.<\/a>/);
  });

  it("sem o agregado no arquivo, fica só a 'Só apuração', sem controle nem hipóteses prontas", () => {
    const html = vista({ dados: SO_A_APURACAO });
    expect(html).not.toContain("base-da-projecao");
    expect(html).not.toContain("sim-pronta");
    expect(/aria-label="([^"]+)"/.exec(elemento(html, /<figure/))?.[1]).toContain("na base Só apuração");
  });
});

describe("o link de outra pessoa", () => {
  it("avisa que é a simulação de outra pessoa, com os dados de agora", () => {
    expect(texto(elemento(vista({ outras: { deOutraPessoa: true } }), /<p[^>]*data-outra-pessoa/))).toBe("Simulação de outra pessoa · com os dados de agora");
    expect(vista()).not.toContain("data-outra-pessoa");
  });
});

describe("o indicador ao vivo", () => {
  it("vem na barra fixa da simulação, o mesmo componente da página, com o estado do quadro; antes das 17h, a barra fica sem ele", () => {
    const indicador = (
      <IndicadorAoVivo
        indicador={{ estado: "tse-sem-novidade", desde: "19:42" }}
        ultimaLeitura={12}
        ultimaTotalizacao="2022-10-30 19:42:10"
        movimentoReduzido={false}
        proximaLeitura={18}
        lendo={false}
      />
    );
    const barra = elemento(vista({ outras: { indicador } }), /<section[^>]*data-barra-da-simulacao/);
    expect(barra).toContain(render(indicador));
    expect(barra).toMatch(/data-estado="tse-sem-novidade"/);
    expect(vista()).not.toContain("data-indicador");
  });
});

describe("na noite", () => {
  // O arquivo do simulador que o coletor publica (`simulador.json`), junto ao do build: o Sul inteiro totalizado e um quarto
  // das seções de cada outro município, cada um com o placar do 1º turno.
  const DO_SUL = ["PR", "SC", "RS"];
  const daNoite = (agregado?: ArquivoDoSimuladorAoVivo["agregado"]): ArquivoDoSimuladorAoVivo => {
    const secoes = BASE.municipios.map((m) => (DO_SUL.includes(m.uf) ? m.secoes : Math.floor(m.secoes / 4)));
    const parte = (n: number, i: number) => Math.round((n * secoes[i]!) / BASE.municipios[i]!.secoes);
    return {
      assinatura: ASSINATURA,
      apuracao: {
        secoes,
        secoesTotais: BASE.municipios.map((m) => m.secoes),
        aptos: BASE.municipios.map((m, i) => parte(m.aptos, i)),
        aptosTotais: BASE.municipios.map((m) => m.aptos),
        votos: [BASE.municipios.map((m, i) => parte(m.votos[0]!, i)), BASE.municipios.map((m, i) => parte(m.votos[1]!, i))],
      },
      ...(agregado ? { agregado } : {}),
    };
  };
  const AGREGADO_DA_NOITE = { valor: 50.4, incerteza: 1.5 };
  const NOITE = prepararSimulador(arquivo({ valor: AGREGADO.valor, incerteza: AGREGADO.incerteza }), daNoite(AGREGADO_DA_NOITE));
  const SUL = REGIOES.indexOf("Sul");

  it("projeta sobre a apuração da rodada, e as hipóteses prontas somem depois da primeira seção", () => {
    const tela = simularNaTela(NOITE, "com-pesquisas", HIPOTESES_ZERADAS);
    expect(tela.brasilNaProjecao.secoes).toBeGreaterThan(30);
    expect(tela.brasilNaProjecao.secoes).toBeLessThan(45);
    expect(vista({ dados: NOITE })).not.toContain("sim-pronta");
    // Com a apuração andando, as pesquisas quase não pesam: K ÷ (K + % de seções).
    expect(NOITE.bases.find((b) => b.id === "com-pesquisas")!.partida.projecao.pesoDasPesquisas).toBeLessThan(0.02);
  });

  it("o que já foi totalizado não muda: com o Sul inteiro apurado, as hipóteses do Sul não mexem nele nem no Brasil", () => {
    const tela = simularNaTela(NOITE, "com-pesquisas", hipoteses({ regioes: { Sul: 10 }, comparecimento: { Sul: 10 } }));
    expect(tela.regioes[SUL]!.naSimulacao).toBeCloseTo(tela.regioes[SUL]!.naProjecao, 12);
    expect(tela.brasilNaSimulacao.projecao).toBeCloseTo(tela.brasilNaProjecao.projecao, 12);
    // No Nordeste, com três quartos das seções por apurar, as mesmas hipóteses mexem.
    const noNordeste = simularNaTela(NOITE, "com-pesquisas", hipoteses({ regioes: { Nordeste: 10 } }));
    expect(Math.abs(noNordeste.regioes[NORDESTE]!.naSimulacao - noNordeste.regioes[NORDESTE]!.naProjecao)).toBeGreaterThan(0.03);
  });

  it("usa o agregado da noite, e sem ele (a base com pesquisas desligada) fica só a 'Só apuração', mesmo com o do build", () => {
    const comPesquisas = (dados: DadosDoSimulador) => dados.bases.find((b) => b.id === "com-pesquisas")!.partida.projecao.brasil.projecao;
    const comOutro = prepararSimulador(arquivo({ valor: AGREGADO.valor, incerteza: AGREGADO.incerteza }), daNoite({ valor: 60, incerteza: 1.5 }));
    expect(comPesquisas(comOutro)).toBeGreaterThan(comPesquisas(NOITE));
    const semAgregado = prepararSimulador(arquivo({ valor: AGREGADO.valor, incerteza: AGREGADO.incerteza }), daNoite());
    expect(semAgregado.bases.map((b) => b.id)).toEqual(["so-apuracao"]);
  });

  it("não junta a apuração de outra base: sem a mesma assinatura, os municípios não estariam na ordem dela", () => {
    expect(() => prepararSimulador(arquivo(null), { ...daNoite(), assinatura: "12345678" })).toThrow(/assinatura/);
  });

  it("desenha por baixo a curva real do Brasil, sólida, até onde a apuração chegou: a cada leitura, ela se estende", () => {
    const figura = (curvaReal: { x: number; y: number }[]) => elemento(vista({ dados: NOITE, outras: { curvaReal } }), /<figure[^>]*data-curva-projetada/);
    const trechos = (html: string) => (/<path[^>]*class="linha-real"[^>]*d="([^"]+)"/.exec(html)?.[1] ?? "").split("L").length;
    const ate10 = figura([
      { x: 0.5, y: 0.6 },
      { x: 10, y: 0.52 },
    ]);
    const ate20 = figura([
      { x: 0.5, y: 0.6 },
      { x: 10, y: 0.52 },
      { x: 20, y: 0.515 },
    ]);
    expect(elementos(ate10, /<path[^>]*class="linha-real"/)).toHaveLength(2);
    expect(trechos(ate20)).toBeGreaterThan(trechos(ate10));
    expect(texto(elemento(ate10, /<figcaption/))).toContain("Curva real");
    // Antes das 17h, não há curva real.
    expect(vista()).not.toContain("linha-real");
  });

  it("o link compartilhado, aberto em outro celular com os mesmos dados, reproduz a mesma simulação", () => {
    const h = hipoteses({ brasil: 1.5, regioes: { Nordeste: -2 }, comparecimento: { Sudeste: 3 } });
    const lido = lerEndereco(enderecoDaSimulacao("com-pesquisas", h, FINALISTAS), FINALISTAS);
    const outroCelular = prepararSimulador(arquivo({ valor: AGREGADO.valor, incerteza: AGREGADO.incerteza }), daNoite(AGREGADO_DA_NOITE));
    expect(simularNaTela(outroCelular, lido.base!, lido.hipoteses)).toEqual(simularNaTela(NOITE, "com-pesquisas", h));
  });
});
