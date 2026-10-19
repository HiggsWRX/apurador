import { readFileSync } from "node:fs";
import { agregadoDePesquisas, diaDoAgregado, tendenciaDoAgregado } from "@apurador/modelo";
import { listaDasPesquisas, pesquisasDoAgregado, type ExtratoDoTse, type Turno } from "@apurador/pipeline";
import { describe, expect, it } from "vitest";
import { AGORA, DIST_CHAVES_DESLIGADAS, elemento, elementos, pagina, texto } from "./html";

// Confere o que o build gera (a fronteira do site): o agregado de pesquisas na página do Brasil e a indicação das
// pesquisas nos outros lugares, calculados no build sobre o mesmo pesquisas.csv. O build dos testes roda com o
// relógio fixo em AGORA.
const DADOS = new URL("../../../dados/", import.meta.url);
const ler = (arquivo: string) => readFileSync(new URL(arquivo, DADOS), "utf8");
const turno = JSON.parse(ler("turnos/2026-1.json")) as Turno;
const lista = listaDasPesquisas({
  pesquisas: ler("pesquisas.csv"),
  institutos: ler("pesquisas-institutos.csv"),
  extrato: JSON.parse(ler("pesquisas-tse.json")) as ExtratoDoTse,
  verificacoes: ler("pesquisas-verificacoes.csv"),
  turno,
});
// Os números que a página deve mostrar são os do modelo sobre o mesmo pesquisas.csv, no mesmo instante. As referências
// externas dos números ficam nos testes do modelo e do pipeline (o agregado de 18/10).
const pesquisas = pesquisasDoAgregado(lista, turno);
const dia = diaDoAgregado(new Date(AGORA));
const agregado = agregadoDePesquisas(pesquisas, dia)!;
const tendencia = tendenciaDoAgregado(pesquisas, dia);

const comUmaCasa = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const placarEntreFinalistas = (id: string) => {
  const [flavio, lula] = turno.lugares[id]!.votos;
  return (100 * flavio!) / (flavio! + lula!);
};

const BLOCO_DO_AGREGADO = /<section[^>]*data-bloco="agregado-de-pesquisas"/;
const BLOCO_DA_INDICACAO = /<section[^>]*data-bloco="indicacao-das-pesquisas"/;
const PALAVRAS_PROIBIDAS = /aprend|\bIA\b|intelig[eê]ncia artificial|previs/i;

describe("agregado de pesquisas na página do Brasil", () => {
  const html = pagina("/");
  const bloco = elemento(html, BLOCO_DO_AGREGADO);
  const textoDoBloco = texto(bloco);

  it("mostra o agregado do dia, em votos válidos, com uma casa", () => {
    expect(textoDoBloco).toContain(`FLAVIO BOLSONARO ${comUmaCasa(agregado.valor)}%`);
    expect(textoDoBloco).toContain(`LULA ${comUmaCasa(100 - Number(agregado.valor.toFixed(1)))}%`);
    expect(textoDoBloco).toContain(`${agregado.pesquisas.length} pesquisas`);
  });

  it("mostra a faixa de incerteza de 95%", () => {
    expect(textoDoBloco).toContain(`de ${comUmaCasa(agregado.faixa[0])}% a ${comUmaCasa(agregado.faixa[1])}%`);
  });

  it("desenha a tendência desde 05/10, um ponto por dia com agregado", () => {
    const grafico = elemento(bloco, /<svg/);
    const dias = [...grafico.matchAll(/data-dia="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);
    expect(dias).toEqual(tendencia.map((a) => a.dia));
    expect(dias.at(-1)).toBe(dia);
    expect(grafico).toMatch(/aria-label="[^"]+"/);
  });

  it("traz o aviso de que não é uma pesquisa própria", () => {
    expect(textoDoBloco).toContain("Média calculada pelo Apurador sobre pesquisas registradas no TSE. Não é uma pesquisa própria.");
  });

  it("compara com o 1º turno pelo placar entre finalistas, nunca pelo % sobre todos os válidos", () => {
    expect(textoDoBloco).toContain("51,0%");
    expect(textoDoBloco).toContain("49,0%");
    expect(textoDoBloco).not.toContain("47,03");
    expect(textoDoBloco).not.toContain("45,16");
  });

  it("fica num bloco separado da lista das pesquisas, antes dela, e sem a chance de vitória", () => {
    const lista = elemento(html, /<section[^>]*data-bloco="lista-das-pesquisas"/);
    expect(bloco).not.toContain('data-bloco="lista-das-pesquisas"');
    expect(lista).not.toContain('data-bloco="agregado-de-pesquisas"');
    expect(html.indexOf(bloco)).toBeLessThan(html.indexOf(lista));
    expect(textoDoBloco).not.toMatch(/chance/i);
  });

  it("não diz que o modelo aprende, que é IA ou que faz previsão", () => {
    expect(textoDoBloco).not.toMatch(PALAVRAS_PROIBIDAS);
  });
});

describe("indicação das pesquisas nos outros lugares", () => {
  const indicacao = (caminho: string) => texto(elemento(pagina(caminho), BLOCO_DA_INDICACAO));
  const indicado = (id: string) => Math.min(100, Math.max(0, placarEntreFinalistas(id) + agregado.valor - placarEntreFinalistas("BR")));

  it.each([
    ["/ba/", "BA"],
    ["/sc/", "SC"],
    ["/sp/campinas/", "62910"],
    ["/exterior/", "ZZ"],
    ["/exterior/lisboa/", "29955"],
  ])("em %s, é o placar entre finalistas do 1º turno somado à mudança do agregado", (caminho, id) => {
    const t = indicacao(caminho);
    const flavio = Number(indicado(id).toFixed(1));
    expect(t).toContain(`FLAVIO BOLSONARO ${comUmaCasa(flavio)}%`);
    expect(t).toContain(`LULA ${comUmaCasa(100 - flavio)}%`);
    // O ponto de partida é o placar entre finalistas do lugar, não o % sobre todos os válidos.
    expect(t).toContain(`${comUmaCasa(placarEntreFinalistas(id))}%`);
    // Nenhum desses lugares passa de 0–100%.
    expect(t).not.toContain("limitado");
    expect(t).not.toMatch(PALAVRAS_PROIBIDAS);
  });

  it("não aparece na página do Brasil, que tem o agregado", () => {
    expect(elementos(pagina("/"), BLOCO_DA_INDICACAO)).toEqual([]);
  });

  it("diz que não há indicação num lugar sem voto para os finalistas no 1º turno de 2026", () => {
    expect(indicacao("/exterior/vaticano/")).toMatch(/não há indicação das pesquisas/i);
  });
});

describe("chave do agregado e da tendência antes das 17h", () => {
  const desligada = (caminho: string) => readFileSync(new URL(`.${caminho}index.html`, DIST_CHAVES_DESLIGADAS), "utf8");

  it("está ligada no arquivo de chaves", () => {
    expect(JSON.parse(ler("chaves.json"))).toMatchObject({ antesDas17h: { agregado: true } });
  });

  it("desligada, esconde o agregado e a tendência, e a lista das pesquisas fica aberta", () => {
    // Consulta a advogado eleitoral, decisão 2: sem o agregado, o Brasil mostra a lista das pesquisas aberta.
    const html = desligada("/");
    expect(elementos(html, BLOCO_DO_AGREGADO)).toEqual([]);
    expect(html).not.toContain("Média calculada pelo Apurador");
    expect(elemento(html, /<section[^>]*data-bloco="lista-das-pesquisas"/)).toMatch(/<details[^>]*\bopen\b/);
  });

  it("desligada, esconde a indicação das pesquisas, que deriva do agregado", () => {
    for (const caminho of ["/ba/", "/sp/campinas/", "/exterior/", "/exterior/lisboa/"]) {
      expect(elementos(desligada(caminho), BLOCO_DA_INDICACAO), caminho).toEqual([]);
    }
  });
});
