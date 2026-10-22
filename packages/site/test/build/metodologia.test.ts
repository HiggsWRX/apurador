import { readdirSync, readFileSync } from "node:fs";
import { agregadoDePesquisas, diaDoAgregado } from "@apurador/modelo";
import { listaDasPesquisas, pesquisasDoAgregado, type ExtratoDoTse, type Turno } from "@apurador/pipeline";
import { describe, expect, it } from "vitest";
import { AGORA, botoes, DIST, DIST_CHAVES_DESLIGADAS, DIST_PROJECAO_DESLIGADA, elemento, elementos, pagina, texto } from "../html";

// Confere o que o build gera (a fronteira do site): a página de metodologia com as nove seções do build do ensaio 2
// (Página de metodologia, decisões 1 a 9; Segunda consulta jurídica, decisão 3). O build dos testes roda com o relógio
// fixo em AGORA, então o agregado do dia é o desse instante. Os números do agregado que a página deve mostrar são os do
// modelo sobre o mesmo pesquisas.csv, no mesmo instante, como no teste do bloco do agregado; os outros números têm
// referência nos registros dos tickets 04, 05 e 28, no docs/calibracao.md e nas linhas dos CSVs do docs/calibracao/.
const DADOS = new URL("../../../../dados/", import.meta.url);
const CALIBRACAO = new URL("../../../../docs/calibracao/", import.meta.url);
const ler = (arquivo: string) => readFileSync(new URL(arquivo, DADOS), "utf8");
const turno = JSON.parse(ler("turnos/2026-1.json")) as Turno;
const lista = listaDasPesquisas({
  pesquisas: ler("pesquisas.csv"),
  institutos: ler("pesquisas-institutos.csv"),
  extrato: JSON.parse(ler("pesquisas-tse.json")) as ExtratoDoTse,
  verificacoes: ler("pesquisas-verificacoes.csv"),
  turno,
});
const agregado = agregadoDePesquisas(pesquisasDoAgregado(lista, turno), diaDoAgregado(new Date(AGORA)))!;

const comUmaCasa = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const comoPublicado = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const diaBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const html = pagina("/metodologia/");
const principal = elemento(html, /<main[^>]*id="conteudo"/);
const corpo = texto(principal);
const secao = (id: string) => elemento(principal, new RegExp(`<section[^>]*\\bid="${id}"`));

const ANCORAS = ["pesquisas", "chance", "apuracao", "juntas", "virada", "acerto", "constantes", "limites", "fontes"];
const DECLARACAO = "Sem IA generativa nem aprendizagem de máquina";
const PALAVRAS_PROIBIDAS = /aprend|\bIA\b|intelig[eê]ncia artificial|previs/i;

describe("página de metodologia: topo e estrutura", () => {
  it("tem as nove âncoras fixas, no índice e nas seções, nesta ordem", () => {
    const indice = elemento(principal, /<nav[^>]*class="indice/);
    const posicoes = ANCORAS.map((id) => {
      expect(indice, id).toContain(`href="#${id}"`);
      return principal.indexOf(secao(id));
    });
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
    expect(elementos(principal, /<span[^>]*class="numero[^"]*"/).map(texto)).toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09"]);
  });

  it("não traz nenhum 'em breve'", () => {
    expect(corpo).not.toMatch(/em breve/i);
  });

  it("abre com o título, uma frase, o aviso da projeção, 'Em um minuto' e o índice, nesta ordem", () => {
    expect(texto(elemento(principal, /<h1/))).toBe("Como calculamos a projeção");
    const aviso = elemento(principal, /<p[^>]*class="aviso-projecao/);
    expect(texto(aviso)).toContain("Estimativa do Apurador. Não é resultado oficial nem garantia do resultado.");
    const minuto = elemento(principal, /<section[^>]*data-bloco="em-um-minuto"/);
    const indice = elemento(principal, /<nav[^>]*class="indice/);
    const lead = elemento(principal, /<p[^>]*class="lead/);
    expect(texto(lead)).toContain("Aqui estão as contas, os testes e os limites.");
    const ordem = [lead, aviso, minuto, indice].map((e) => principal.indexOf(e));
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
  });

  it("'Em um minuto' tem seis frases, a sexta com o teste de 2022, e a declaração", () => {
    // A sexta frase é decisão do dono (22/10). noite-2022-2.csv, com 5,0001% das seções: a projeção erra 0,0398 na
    // Apuração + pesquisas, e o placar parcial, 46,7124 contra 50,9024, 4,19.
    const minuto = elemento(principal, /<section[^>]*data-bloco="em-um-minuto"/);
    const frases = elementos(minuto, /<li\b/).map(texto);
    expect(frases).toHaveLength(6);
    expect(frases[4]).toMatch(/^A curva projetada mostra/);
    // O texto() põe um espaço no lugar de cada tag: o "menos de 0,1 ponto" em negrito deixa um espaço antes do ponto.
    expect(frases[5]).toMatch(/^Na noite de 2022, com 5% das seções, a projeção errou menos de 0,1 ponto\s*\. O placar parcial errava 4,2 pontos\.$/);
    expect(texto(minuto)).toContain(`${DECLARACAO}.`);
  });

  it("não diz que o modelo aprende, que é IA ou que faz previsão, fora a declaração", () => {
    expect(corpo).toContain(DECLARACAO);
    expect(corpo.replace(DECLARACAO, "")).not.toMatch(PALAVRAS_PROIBIDAS);
    const rotulos = [...principal.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1]!);
    expect(rotulos.length).toBeGreaterThan(0);
    for (const rotulo of rotulos) expect(rotulo).not.toMatch(PALAVRAS_PROIBIDAS);
    expect(texto(elemento(html, /<title/))).not.toMatch(PALAVRAS_PROIBIDAS);
  });

  it("recolhe toda fórmula em 'As contas'", () => {
    const contas = elementos(principal, /<details[^>]*class="contas/);
    expect(contas).toHaveLength(7);
    for (const c of contas) expect(texto(elemento(c, /<summary/))).toBe("As contas");
    expect(principal.match(/class="formula/g)?.length).toBeGreaterThanOrEqual(7);
    const fora = contas.reduce((resto, c) => resto.replace(c, ""), principal);
    expect(fora).not.toMatch(/class="formula/);
  });

  it("não traz narração, mapa nem nada ao vivo", () => {
    expect(html).not.toMatch(/astro-island|id="narracao"|ao-vivo/);
  });
});

describe("seção 1, o agregado de pesquisas", () => {
  const s = secao("pesquisas");
  const t = texto(s);

  it("mostra o agregado do dia do build, com os institutos e os votos válidos de cada finalista", () => {
    const flavio = Number(agregado.valor.toFixed(1));
    const doDia = texto(elemento(s, /<p[^>]*data-bloco="agregado-do-dia"/));
    expect(doDia).toContain(`Em ${diaBr(agregado.dia)}, com ${agregado.pesquisas.length} institutos, o agregado dá`);
    expect(doDia).toContain(`Flávio ${comUmaCasa(flavio)}%`);
    expect(doDia).toContain(`Lula ${comUmaCasa(100 - flavio)}%`);
    expect(t).toContain("Média calculada pelo Apurador sobre pesquisas registradas no TSE. Não é uma pesquisa própria.");
  });

  it("traz os critérios do agregado e os 14 institutos, identificados pelo CNPJ", () => {
    expect(t).toContain("campo a partir de 05/10");
    expect(t).toContain("7 dias anteriores");
    expect(t).toContain("14 dias");
    expect(t).toContain("Boca de urna nunca entra");
    expect(t).toContain("congela às 23h de 24/10");
    const institutos = elementos(elemento(s, /<ul[^>]*class="institutos/), /<li\b/).map(texto);
    expect(institutos).toHaveLength(14);
    expect(institutos).toEqual([...institutos].sort((a, b) => a.localeCompare(b, "pt-BR")));
    expect(institutos).toEqual(expect.arrayContaining(["Datafolha", "Ipec/Ibope", "FSB (hoje Nexus)", "Quaest"]));
    expect(t).toContain("Identificados pelo CNPJ no registro do TSE.");
  });

  it("explica a incerteza com o erro histórico medido no ticket 05 e a incerteza do dia", () => {
    // Ticket 05: erros de 0,08 a 1,88 ponto nos seis 2º turnos, raiz do erro quadrático médio de 1,30.
    expect(t).toContain("Nos seis 2º turnos de 2002 a 2022, o agregado das pesquisas finais, pela mesma regra, errou entre 0,1 e 1,9 ponto, sem lado fixo.");
    expect(t).toContain("erro típico de 1,5 ponto");
    expect(t).toContain("(1,3 ponto)");
    expect(t).toContain("√(1,3² + 0,7²) dá 1,5");
    // AGORA é 19/10, 6 dias antes da eleição: √(1,5² + 0,4² × 6) = 1,79.
    expect(t).toContain("Em 19/10, 6 dias antes, ela é de 1,79 ponto.");
  });

  it("dá o viés do 1º turno de 2026 pela regra do agregado, como o ticket 05 o mediu", () => {
    // Ticket 05: pela regra, Flávio fica em 48,87 entre os dois, contra 51,01 no placar entre finalistas.
    expect(t).toContain("davam Flávio 48,9% entre os dois finalistas. Ele teve 51,0%: as pesquisas o subestimaram em 2,1 pontos.");
    expect(t).toContain("Não corrigimos o agregado por isso");
  });

  it("explica a indicação das pesquisas nos outros lugares, com a conta em 'As contas'", () => {
    // O texto() põe um espaço no lugar de cada tag: o "indicação das pesquisas" em negrito deixa um espaço antes dos dois-pontos.
    expect(t).toMatch(/indicação das pesquisas\s*: o placar entre finalistas do lugar no 1º turno somado à mesma mudança que o agregado mostra para o Brasil/);
    expect(t).toContain("indicação no lugar = placar entre finalistas do lugar no 1º turno + (agregado − 51,0)");
    expect(t).toContain("incerteza = √( 1,5² + 0,4² × dias até 25/10 )");
  });
});

describe("seção 2, a chance de vitória", () => {
  const s = secao("chance");

  it("desenha o sino do agregado do dia, com a área de cada lado de 50% como a chance de cada candidato", () => {
    const sino = elemento(s, /<svg/);
    const chance = `${Math.round(100 * agregado.chance)}%`;
    expect(sino).toMatch(/role="img"/);
    expect(sino).toMatch(/aria-label="[^"]*chance de Flávio vencer/);
    expect(sino).toContain(`data-chance="${chance}"`);
    expect(elementos(sino, /<path[^>]*class="area/).map((p) => p.match(/data-cor="(\w+)"/)![1])).toEqual(["flavio", "lula"]);
    expect(texto(sino)).toContain(`Flávio vence: ${chance}`);
    expect(texto(sino)).toContain(`Lula vence: ${100 - Math.round(100 * agregado.chance)}%`);
  });

  it("diz de que dia é o agregado e qual é a incerteza daquele dia", () => {
    const legenda = texto(elemento(s, /<figcaption/));
    expect(legenda).toContain(`Com o agregado de ${diaBr(agregado.dia)}: Flávio ${comUmaCasa(agregado.valor)}%`);
    expect(legenda).toContain(`${comoPublicado(agregado.incerteza)} ponto`);
    expect(legenda).toContain("Cálculo do Apurador sobre pesquisas registradas no TSE.");
    expect(texto(s)).toContain("a área à direita de 50% é a chance de Flávio, e a da esquerda, a de Lula");
    expect(texto(s)).toContain("chance de Flávio = Φ( (projeção − 50) ÷ incerteza )");
  });
});

describe("seções 3 a 5, a apuração, a junção e a virada", () => {
  it("explica a base 'Só apuração' com as constantes congeladas pela calibração", () => {
    const t = texto(secao("apuracao"));
    // As constantes escolhidas em docs/calibracao.md: 10.000 votos, 2 e 2 p.p., mínimo de 2.000 votos por nível.
    expect(t).toContain("transferência de votos");
    expect(t).toContain("com 10.000 votos totalizados, ele pesa metade");
    expect(t).toContain("um desvio próprio de cada estado (2 pontos), um desvio comum a todo o voto que falta no país (2 pontos)");
    expect(t).toContain("menos de 2.000 votos válidos totalizados, usa-se a região; depois, o Brasil; antes da primeira seção, o 1º turno");
    expect(t).toContain("margem de 95% = 1,96 × desvio da projeção");
    // O instante do histórico oficial de totalização do TSE (ticket 06).
    expect(t).toContain("Em 2022, pelo histórico oficial do TSE, Bolsonaro liderou o placar parcial até 67,76% das seções totalizadas");
  });

  it("explica como pesquisas e apuração se juntam, com o K congelado", () => {
    const t = texto(secao("juntas"));
    // K = 0,25% em docs/calibracao.md: as pesquisas pesam metade com 0,25% das seções e 0,25 ÷ 5,25 = 4,8% com 5%.
    expect(t).toContain("metade com 0,25% das seções totalizadas, só 4,8% com 5%");
    expect(t).toContain("com K = 0,25%");
    expect(t).toContain("Só apuração");
    expect(t).toContain("Apuração + pesquisas");
    expect(t).toContain('"As duas bases já coincidem aqui"');
    expect(t).toContain("0,13 × a fatia dos eliminados");
  });

  it("explica a curva projetada e os três estados do sinal de virada, com os limites congelados", () => {
    const s = secao("virada");
    const t = texto(s);
    // Os limites em docs/calibracao.md: 50% fica, e o de "sem sinal de virada" passou de 5% a 2%.
    expect(t).toContain("Virada projetada chance de virada de 50% ou mais");
    expect(t).toContain("Virada possível chance de virada entre 2% e 50%");
    expect(t).toContain("Sem sinal de virada chance de virada abaixo de 2%");
    expect(t).toContain("virada projetada vem sempre com uma faixa");
  });

  it("apresenta o simulador em três frases, com link", () => {
    const simulador = elemento(secao("virada"), /<p[^>]*data-bloco="simulador"/);
    expect(texto(simulador).match(/\.(\s|$)/g)).toHaveLength(3);
    expect(texto(simulador)).toContain('simulador "e se"');
    expect(simulador).toMatch(/<a href="\/simulador\/"/);
  });
});

describe("seção 6, como o modelo teria se saído", () => {
  const s = secao("acerto");
  const t = texto(s);
  const figura = elemento(s, /<figure[^>]*data-bloco="noite-reproduzida"/);
  const noite = (ano: number) => elemento(figura, new RegExp(`<div[^>]*data-noite="${ano}"`));

  it("mostra a noite reproduzida com os botões 2022 | 2018, cada uma com o placar parcial, a projeção, a faixa de 95% e o resultado", () => {
    expect(botoes(figura).map(([rotulo, apertado]) => [rotulo!.trim(), apertado])).toEqual([
      ["2022", "true"],
      ["2018", "false"],
    ]);
    for (const ano of [2022, 2018]) {
      const svg = elemento(noite(ano), /<svg/);
      expect(svg, String(ano)).toMatch(/role="img"/);
      for (const classe of ["placar", "linha-da-projecao", "faixa"]) expect(svg, `${ano} ${classe}`).toMatch(new RegExp(`<path[^>]*class="${classe}"`));
      expect(svg, String(ano)).toMatch(/<line[^>]*class="resultado"/);
    }
    // O resultado oficial do TSE: Lula 50,90% em 2022 e Bolsonaro 55,13% em 2018.
    expect(texto(noite(2022))).toContain("resultado: Lula 50,90%");
    expect(texto(noite(2018))).toContain("resultado: Bolsonaro 55,13%");
    expect(texto(figura)).toContain("Placar parcial");
    expect(texto(figura)).toContain("Projeção, Apuração + pesquisas");
    expect(texto(figura)).toContain("Cálculo do Apurador com dados do TSE.");
  });

  it("traz o erro com 5%, 25% e 50% das seções, no placar parcial e nas duas bases, para as duas noites", () => {
    // As linhas dos CSVs com 5%, 25% e 50% das seções, contra o placar do fim (50,9024 e 55,1302), com uma casa.
    const tabela = elemento(s, /<table[^>]*data-bloco="erros-das-noites"/);
    expect(texto(elemento(tabela, /<thead/))).toBe("Com Placar parcial Só apuração Apuração + pesquisas");
    const linhas = (ano: number) => elementos(elemento(tabela, new RegExp(`<tbody[^>]*data-noite="${ano}"`)), /<tr\b/).map(texto);
    expect(linhas(2022)).toEqual(["2º turno de 2022: Lula 50,90%", "5% das seções 4,2 <0,1 <0,1", "25% das seções 2,2 0,3 0,3", "50% das seções 1,2 0,4 0,4"]);
    expect(linhas(2018)).toEqual([
      "2º turno de 2018: Bolsonaro 55,13%",
      "5% das seções 4,8 0,3 0,4",
      "25% das seções 2,4 0,9 0,9",
      "50% das seções 1,0 0,6 0,6",
    ]);
    // docs/calibracao.md: cobertura de 100,0% nas duas noites, com as constantes escolhidas.
    expect(t).toContain("o resultado ficou dentro da faixa de 95% em todos os momentos depois de 1% das seções");
  });

  it("diz que o teste é otimista, porque os ajustes provisórios saíram de 2022", () => {
    const aviso = texto(elemento(s, /<p[^>]*data-bloco="teste-otimista"/));
    expect(aviso).toContain("Este teste é otimista.");
    expect(aviso).toContain("Os ajustes provisórios do modelo saíram da noite de 2022");
    expect(elemento(s, /<p[^>]*data-bloco="teste-otimista"/)).toContain('href="#constantes"');
  });

  it("repete 2022 com as pesquisas deslocadas 2 pontos para cada lado", () => {
    // noite-2022-2.csv: antes da primeira seção, 52,9838 e 48,9838 contra 50,9024; com 5,0001% das seções, 51,0169 e
    // 50,8674; de 5,0001% em diante, as duas ficam a menos de 0,1 ponto da Só apuração.
    expect(t).toContain(
      "Antes da primeira seção, a projeção erraria 2,1 pontos com as pesquisas puxando para Lula e 1,9 ponto puxando para Bolsonaro. " +
        "Com 5% das seções, o erro já tinha caído para 0,1 ponto e menos de 0,1 ponto. " +
        "A partir de 5% das seções, as versões ficam a menos de 0,1 ponto da base Só apuração.",
    );
    const grafico = elemento(s, /<figure[^>]*data-bloco="pesquisas-deslocadas"/);
    expect(elementos(grafico, /<path\b/)).toHaveLength(4);
    expect(texto(grafico)).toContain("pesquisas +2 para Lula");
    expect(texto(grafico)).toContain("pesquisas +2 para Bolsonaro");
    expect(texto(grafico)).toContain("Cálculo do Apurador com dados do TSE.");
  });

  it("mostra o agregado contra o resultado nos seis 2º turnos de 2002 a 2022, com a incerteza de cada ano sem ele", () => {
    const grafico = elemento(s, /<figure[^>]*data-bloco="agregado-contra-resultado"/);
    const svg = elemento(grafico, /<svg/);
    for (const ano of ["2002", "2006", "2010", "2014", "2018", "2022"]) expect(texto(svg), ano).toContain(ano);
    expect(elementos(svg, /<circle[^>]*class="resultado"/)).toHaveLength(6);
    expect(texto(grafico)).toContain("Cálculo do Apurador com dados do TSE");
    expect(t).toContain("Em cada ano, a incerteza foi calculada sem aquele ano");
    // Ticket 05: 57,01 contra 55,13 em 2018 e 50,98 contra 50,90 em 2022; os seis resultados caem na faixa de 95%.
    expect(t).toContain("Em 2018, o agregado dava Bolsonaro 57,0%; ele teve 55,13%, 1,9 ponto a menos.");
    expect(t).toContain("Em 2022, o agregado dava Lula 51,0%; ele teve 50,90%, 0,1 ponto a menos.");
    expect(t).toContain("Nos seis anos, o resultado ficou dentro da faixa de 95%.");
  });

  it("deixa o 1º turno de 2026 para a tabela da calibração", () => {
    expect(t).not.toContain("2026");
  });
});

describe("seção 7, como escolhemos as constantes", () => {
  const s = secao("constantes");

  it("traz a tabela da calibração, com os candidatos, o valor de antes e o escolhido de docs/calibracao.md", () => {
    const linhas = elementos(elemento(elemento(s, /<table[^>]*data-bloco="constantes-da-calibracao"/), /<tbody/), /<tr\b/).map(texto);
    expect(linhas).toEqual([
      "Desvio de cada estado 0,5 · 1 · 1,5 · 2 pontos 1 ponto 2 pontos",
      "Desvio comum do país 0,5 · 1 · 1,5 · 2 pontos 1 ponto 2 pontos",
      "Peso do próprio município 1.000 · 3.000 · 10.000 votos 3.000 votos 10.000 votos",
      'Ordem de chegada "mistura" · "1º turno" · "ritmo da noite" "mistura" "mistura"',
      "K, as seções que as pesquisas valem 0,25% · 0,5% · 1% · 2% 0,5% 0,25%",
      'Limite de "sem sinal de virada" 5% · 2% · 1% 5% 2%',
      "Unidade do modelo município · zona município município",
    ]);
    expect(elementos(elemento(s, /<ol[^>]*class="regra/), /<li\b/)).toHaveLength(5);
  });

  it("dá os números por noite, e o 1º turno de 2026 aparece só aqui", () => {
    const tabela = elemento(s, /<table[^>]*data-bloco="calibracao-por-noite"/);
    expect(texto(elemento(tabela, /<thead/))).toBe("Medida 2º turno de 2022 2º turno de 2018 1º turno de 2026");
    const linhas = elementos(elemento(tabela, /<tbody/), /<tr\b/).map(texto);
    expect(linhas).toHaveLength(8);
    expect(linhas[0]).toBe("Resultado dentro da faixa de 95%, depois de 1% das seções 100,0% 100,0% 100,0%");
    expect(linhas[2]).toBe("Erro médio da projeção, de 5% a 50% das seções 0,35 0,74 0,11");
    expect(texto(s)).toContain("Nada é treinado");
  });

  it("marca a chance de vitória de quem perdeu como toda chance, e com a projeção desligada ela sai", () => {
    const comChance = elementos(elemento(s, /<table[^>]*data-bloco="calibracao-por-noite"/), /<tr[^>]*\sdata-chance-de-vitoria[\s=>]/).map(texto);
    // docs/calibracao.md: a maior chance de quem perdeu, com as constantes escolhidas, é de 38,9%, 0,3% e 40,4%.
    expect(comChance).toEqual(["Maior chance de vitória de quem perdeu, depois de 5% das seções 38,9% 0,3% 40,4%"]);
    const desligada = readFileSync(new URL("./metodologia/index.html", DIST_PROJECAO_DESLIGADA), "utf8");
    const tabela = elemento(elemento(desligada, /<section[^>]*\bid="constantes"/), /<table[^>]*data-bloco="calibracao-por-noite"/);
    expect(elementos(elemento(tabela, /<tbody/), /<tr\b/)).toHaveLength(7);
    expect(texto(tabela)).not.toContain("chance de vitória");
  });

  it("dá os números de cada candidato na ordem de chegada, no K e no sinal de virada, com o escolhido em negrito", () => {
    const passos = elemento(s, /<details[^>]*data-bloco="passos-da-calibracao"/);
    // docs/calibracao.md: passaram 39 dos 48 candidatos, e o provisório tinha cobertura de 98,0%, 98,0% e 96,0%.
    expect(texto(passos)).toContain("Dos 48 candidatos, passaram 39.");
    expect(texto(passos)).toContain("em 98,0%, 98,0% e 96,0% dos momentos");
    const tabelas = elementos(passos, /<table\b/);
    expect(tabelas.map((t) => texto(elemento(t, /<caption/)).split(":")[0])).toEqual(["Ordem de chegada", "K", "Sinal de virada"]);
    expect(tabelas.map((t) => texto(elemento(t, /<tr[^>]*class="escolhido/)))).toEqual([
      '"mistura" 0,54 0,75 0,72 0,67',
      "0,25% 1,32 1,76 1,24 1,35 2,00 2,00",
      "2% nenhum 0,33%",
    ]);
  });
});

describe("os gráficos extras das seções 3 e 4", () => {
  it("desenha a transferência de votos com um exemplo de números redondos", () => {
    const figura = elemento(secao("apuracao"), /<figure[^>]*data-bloco="transferencia-de-votos"/);
    expect(elemento(figura, /<svg/)).toMatch(/role="img"/);
    // 46% para cada finalista e 8% nos eliminados; 60% dos eliminados para Flávio: 46 + 0,6 × 8 = 50,8.
    for (const parte of ["Flávio 46,0%", "Lula 46,0%", "Flávio 50,8%", "Lula 49,2%"]) expect(texto(figura), parte).toContain(parte);
    expect(texto(figura)).toContain("Exemplo, com números redondos.");
  });

  it("desenha o peso das pesquisas ao longo da apuração, com o K congelado", () => {
    const svg = elemento(elemento(secao("juntas"), /<figure[^>]*data-bloco="peso-das-pesquisas"/), /<svg/);
    // K = 0,25%: metade com 0,25% das seções e 0,25 ÷ 5,25 = 4,8% com 5%.
    expect(texto(svg)).toContain("metade com 0,25%");
    expect(texto(svg)).toContain("4,8% com 5%");
  });
});

describe("seção 8, as limitações", () => {
  it("traz as sete limitações da decisão 7", () => {
    const itens = elementos(elemento(secao("limites"), /<ol/), /<li\b/).map(texto);
    expect(itens).toHaveLength(7);
    const esperadas = [
      /^Poucas eleições\./,
      /^O 1º turno de 2026\./,
      /^O começo da noite engana\./,
      /^Seções tardias\./,
      /^A ordem de chegada\./,
      /^Estados e municípios antes da apuração\./,
      /^Dependemos do TSE\./,
    ];
    itens.forEach((item, i) => expect(item).toMatch(esperadas[i]!));
    expect(itens[1]).toContain("subestimaram Flávio em 2,1 pontos");
  });
});

describe("seção 9, fontes, dados e avisos", () => {
  const s = secao("fontes");
  const t = texto(s);

  it("traz as fontes e os avisos exigidos", () => {
    expect(t).toContain("TSE, arquivos de divulgação e dados abertos, sem alteração (CC-BY). Os números do TSE aparecem com duas casas");
    expect(t).toContain('marcada como "Cálculo do Apurador com dados do TSE"');
    expect(t).toContain(
      "art. 10 da Res. 23.600: período de coleta, número de entrevistas, margem de erro, nível de confiança, contratante e número de registro",
    );
    expect(t).toContain("IBGE, Malha Municipal Digital 2024, CC BY 4.0, simplificada pelo Apurador");
    expect(t).toContain("a partir de 26/10");
    expect(t).toContain("feito por uma pessoa, sem ligação com o TSE, com candidatos ou com partidos. Responsável:");
  });

  it("leva à lista das pesquisas, que tem a âncora na página do Brasil", () => {
    expect(s).toContain('href="/#pesquisas-registradas"');
    expect(pagina("/")).toMatch(/<section[^>]*\bid="pesquisas-registradas"[^>]*data-bloco="lista-das-pesquisas"/);
  });

  it("oferece as pesquisas, a calibração e as noites reproduzidas de 2022 e 2018 para baixar, iguais às do repositório", () => {
    const doRepositorio: Record<string, URL> = {
      "pesquisas.csv": new URL("pesquisas.csv", DADOS),
      "pesquisas-historicas.csv": new URL("pesquisas-historicas.csv", DADOS),
      "noite-2022-2.csv": new URL("noite-2022-2.csv", CALIBRACAO),
      "noite-2018-2.csv": new URL("noite-2018-2.csv", CALIBRACAO),
      "calibracao-constantes.csv": new URL("constantes.csv", CALIBRACAO),
      "calibracao-ordem-de-chegada.csv": new URL("ordem-de-chegada.csv", CALIBRACAO),
      "calibracao-k.csv": new URL("k.csv", CALIBRACAO),
      "calibracao-sinal-de-virada.csv": new URL("sinal-de-virada.csv", CALIBRACAO),
      "calibracao-zona.csv": new URL("zona.csv", CALIBRACAO),
    };
    for (const [arquivo, origem] of Object.entries(doRepositorio)) {
      expect(s, arquivo).toContain(`href="/dados/${arquivo}"`);
      expect(readFileSync(new URL(`./dados/${arquivo}`, DIST), "utf8"), arquivo).toBe(readFileSync(origem, "utf8"));
    }
    expect(
      readdirSync(new URL("./dados/", DIST))
        .filter((f) => f.endsWith(".csv"))
        .sort(),
    ).toEqual(Object.keys(doRepositorio).sort());
    expect(t).toMatch(/pesquisas\.csv · .* CSV · \d+ KB/);
    expect(t).toMatch(/noite-2018-2\.csv · a noite do 2º turno de 2018 reproduzida, momento a momento.* CSV · \d+ KB/);
  });
});

describe("a página de metodologia e o resto do site", () => {
  it("é alcançável pelo rodapé de toda página", () => {
    for (const caminho of ["/", "/sp/", "/sp/campinas/"]) expect(pagina(caminho), caminho).toContain('href="/metodologia/"');
  });

  it("com a chave do agregado desligada, explica a regra sem os números do dia nem o sino", () => {
    const desligada = readFileSync(new URL("./metodologia/index.html", DIST_CHAVES_DESLIGADAS), "utf8");
    expect(desligada).not.toContain('data-bloco="sino"');
    expect(desligada).not.toContain('data-bloco="agregado-do-dia"');
    expect(desligada).not.toContain("vence:");
    for (const id of ANCORAS) expect(desligada, id).toMatch(new RegExp(`<section[^>]*\\bid="${id}"`));
    expect(texto(desligada)).toContain(DECLARACAO);
  });
});
