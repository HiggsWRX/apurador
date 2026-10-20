import { readdirSync, readFileSync } from "node:fs";
import { agregadoDePesquisas, diaDoAgregado } from "@apurador/modelo";
import { listaDasPesquisas, pesquisasDoAgregado, type ExtratoDoTse, type Turno } from "@apurador/pipeline";
import { describe, expect, it } from "vitest";
import { AGORA, DIST, DIST_CHAVES_DESLIGADAS, elemento, elementos, pagina, texto } from "../html";

// Confere o que o build gera (a fronteira do site): a página de metodologia da etapa "Antes da noite" (Página de
// metodologia, decisões 1, 2, 4 a 9; Segunda consulta jurídica, decisão 3). O build dos testes roda com o relógio
// fixo em AGORA, então o agregado do dia é o desse instante. Os números do agregado que a página deve mostrar são os do
// modelo sobre o mesmo pesquisas.csv, no mesmo instante, como no teste do bloco do agregado; os outros números têm
// referência nos registros dos tickets 04, 05 e 28 e no docs/calibracao.md.
const DADOS = new URL("../../../../dados/", import.meta.url);
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

const ANCORAS = ["pesquisas", "chance", "apuracao", "juntas", "virada", "limites", "fontes"];
const RESERVADAS = ["acerto", "constantes"];
const DECLARACAO = "Sem IA generativa nem aprendizagem de máquina";
const PALAVRAS_PROIBIDAS = /aprend|\bIA\b|intelig[eê]ncia artificial|previs/i;

describe("página de metodologia: topo e estrutura", () => {
  it("tem as sete âncoras fixas, no índice e nas seções, nesta ordem", () => {
    const indice = elemento(principal, /<nav[^>]*class="indice/);
    const posicoes = ANCORAS.map((id) => {
      expect(indice, id).toContain(`href="#${id}"`);
      return principal.indexOf(secao(id));
    });
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
    expect(elementos(principal, /<span[^>]*class="numero[^"]*"/).map(texto)).toEqual(["01", "02", "03", "04", "05", "06", "07"]);
  });

  it("deixa as âncoras #acerto e #constantes para o ticket 29, sem nenhum 'em breve'", () => {
    for (const id of RESERVADAS) expect(principal, id).not.toMatch(new RegExp(`\\bid="${id}"`));
    expect(corpo).not.toMatch(/em breve/i);
  });

  it("abre com o título, uma frase, o aviso da projeção, 'Em um minuto' e o índice, nesta ordem", () => {
    expect(texto(elemento(principal, /<h1/))).toBe("Como calculamos a projeção");
    const aviso = elemento(principal, /<p[^>]*class="aviso-projecao/);
    expect(texto(aviso)).toContain("Estimativa do Apurador. Não é resultado oficial nem garantia do resultado.");
    const minuto = elemento(principal, /<section[^>]*data-bloco="em-um-minuto"/);
    const indice = elemento(principal, /<nav[^>]*class="indice/);
    const ordem = [elemento(principal, /<p[^>]*class="lead/), aviso, minuto, indice].map((e) => principal.indexOf(e));
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
  });

  it("'Em um minuto' tem cinco frases e a declaração, sem a frase do teste de 2022", () => {
    const minuto = elemento(principal, /<section[^>]*data-bloco="em-um-minuto"/);
    expect(elementos(minuto, /<li\b/)).toHaveLength(5);
    expect(texto(minuto)).toContain(`${DECLARACAO}.`);
    expect(texto(minuto)).not.toContain("2022");
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
    expect(contas).toHaveLength(5);
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

describe("seção 8, as limitações", () => {
  it("traz as sete limitações da decisão 7", () => {
    const itens = elementos(elemento(secao("limites"), /<ol/), /<li\b/).map(texto);
    expect(itens).toHaveLength(7);
    const esperadas = [/^Poucas eleições\./, /^O 1º turno de 2026\./, /^O começo da noite engana\./, /^Seções tardias\./, /^A ordem de chegada\./, /^Estados e municípios antes da apuração\./, /^Dependemos do TSE\./];
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
    expect(t).toContain("art. 10 da Res. 23.600: período de coleta, número de entrevistas, margem de erro, nível de confiança, contratante e número de registro");
    expect(t).toContain("IBGE, Malha Municipal Digital 2024, CC BY 4.0, simplificada pelo Apurador");
    expect(t).toContain("a partir de 26/10");
    expect(t).toContain("feito por uma pessoa, sem ligação com o TSE, com candidatos ou com partidos. Responsável:");
  });

  it("leva à lista das pesquisas, que tem a âncora na página do Brasil", () => {
    expect(s).toContain('href="/#pesquisas-registradas"');
    expect(pagina("/")).toMatch(/<section[^>]*\bid="pesquisas-registradas"[^>]*data-bloco="lista-das-pesquisas"/);
  });

  it("oferece pesquisas.csv e pesquisas-historicas.csv para baixar, iguais aos do repositório", () => {
    for (const arquivo of ["pesquisas.csv", "pesquisas-historicas.csv"]) {
      expect(s, arquivo).toContain(`href="/dados/${arquivo}"`);
      expect(readFileSync(new URL(`./dados/${arquivo}`, DIST), "utf8"), arquivo).toBe(ler(arquivo));
    }
    expect(readdirSync(new URL("./dados/", DIST)).filter((f) => f.endsWith(".csv")).sort()).toEqual(["pesquisas-historicas.csv", "pesquisas.csv"]);
    expect(t).toMatch(/pesquisas\.csv · .* CSV · \d+ KB/);
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
