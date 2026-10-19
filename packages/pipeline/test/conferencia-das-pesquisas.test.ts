import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { conferirNoTse } from "../src/conferencia-das-pesquisas.ts";

// A conferência diária no TSE, de ponta a ponta, numa pasta `dados/` temporária e com um TSE falso que serve o zip
// de registros por Range. O CSV dentro do zip são linhas reais do TSE (18/10/2026).
const csvDoTse = new Uint8Array(readFileSync(new URL("../../tse/test/amostras/pesquisa_eleitoral_2026_BRASIL.csv", import.meta.url)));
const zip = zipSync({ "pesquisa_eleitoral_2026_AC.csv": new Uint8Array(1000), "pesquisa_eleitoral_2026_BRASIL.csv": csvDoTse });

const buscar = async (_url: string, init?: RequestInit) => {
  const [, inicio, fim] = new Headers(init?.headers).get("range")!.match(/^bytes=(\d*)-(\d*)$/)!;
  const [de, ate] = inicio === "" ? [zip.length - Number(fim), zip.length - 1] : [Number(inicio), Math.min(Number(fim), zip.length - 1)];
  return new Response(zip.slice(de, ate + 1), { status: 206, headers: { "Content-Range": `bytes ${de}-${ate}/${zip.length}` } });
};

const PESQUISAS = [
  "registro,instituto,contratante,campo_inicio,campo_fim,entrevistas,margem,confianca,modo,votos_22,votos_13,brancos_nulos,indecisos,fonte,divulgacao",
  "BR-00466/2026,Datafolha,Folha de S.Paulo e TV Globo,2026-10-13,2026-10-14,2520,2,95,presencial,47,45,6,2,https://g1.globo.com/datafolha,2026-10-15",
  // Estadual (Tocantins): fora do critério.
  "BR-09051/2026,Paraná Pesquisas,Recursos próprios,2026-10-14,2026-10-17,1500,2.5,95,telefone,48,44,,,https://exemplo.com.br/parana,2026-10-19",
].join("\n");
const INSTITUTOS = [
  "instituto_da_lista,instituto,cnpj,origem",
  "Datafolha,Datafolha,07630546000175,2º turno de 2022: BR-08297/2022",
  "Paraná Pesquisas,Paraná Pesquisas,81908345000140,2º turno de 2022: BR-09573/2022",
].join("\n");

function pastaDeDados(): URL {
  const dados = join(mkdtempSync(join(tmpdir(), "apurador-")), "dados");
  mkdirSync(join(dados, "turnos"), { recursive: true });
  copyFileSync(new URL("../../../dados/turnos/2026-1.json", import.meta.url), join(dados, "turnos", "2026-1.json"));
  writeFileSync(join(dados, "pesquisas.csv"), PESQUISAS);
  writeFileSync(join(dados, "pesquisas-institutos.csv"), INSTITUTOS);
  return pathToFileURL(`${dados}/`);
}

describe("conferirNoTse", () => {
  it("confere cada linha no CSV do dia, guarda o extrato do TSE e registra a conferência com data, fonte e resultado", async () => {
    const dados = pastaDeDados();

    const conferencias = await conferirNoTse({ dados, buscar, agora: new Date("2026-10-19T12:00:00Z") });
    await conferirNoTse({ dados, buscar, agora: new Date("2026-10-20T11:30:00Z") });

    expect(conferencias.map((c) => [c.pesquisa.registro, c.divergencias])).toEqual([
      ["BR-00466/2026", []],
      ["BR-09051/2026", ["o plano amostral registrado no TSE é de uma UF: só entram pesquisas nacionais"]],
    ]);

    const extrato = JSON.parse(readFileSync(new URL("pesquisas-tse.json", dados), "utf8"));
    expect(extrato.fonte).toEqual({
      url: "https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_2026.zip",
      membro: "pesquisa_eleitoral_2026_BRASIL.csv",
      geracao: ["18/10/2026 05:46:37"],
      sha256: createHash("sha256").update(csvDoTse).digest("hex"),
      bytes: csvDoTse.length,
      conferidoEm: "2026-10-20T11:30:00.000Z",
    });
    expect(extrato.registros.map((r: { registro: string }) => r.registro)).toEqual(["BR-00466/2026", "BR-09051/2026"]);

    const tse = `https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_2026.zip,18/10/2026 05:46:37,${extrato.fonte.sha256}`;
    expect(readFileSync(new URL("pesquisas-verificacoes.csv", dados), "utf8").split("\n")).toEqual([
      "conferido_em,registro,instituto,fonte,tse_arquivo,tse_geracao,tse_sha256,resultado",
      `2026-10-19T12:00:00.000Z,BR-00466/2026,Datafolha,https://g1.globo.com/datafolha,${tse},ok`,
      `2026-10-19T12:00:00.000Z,BR-09051/2026,Paraná Pesquisas,https://exemplo.com.br/parana,${tse},divergente: o plano amostral registrado no TSE é de uma UF: só entram pesquisas nacionais`,
      `2026-10-20T11:30:00.000Z,BR-00466/2026,Datafolha,https://g1.globo.com/datafolha,${tse},ok`,
      `2026-10-20T11:30:00.000Z,BR-09051/2026,Paraná Pesquisas,https://exemplo.com.br/parana,${tse},divergente: o plano amostral registrado no TSE é de uma UF: só entram pesquisas nacionais`,
      "",
    ]);
  });

  it("confere a divulgação contra a data de Brasília, não a UTC", async () => {
    // 01h de 20/10 em UTC ainda é 19/10 em Brasília: a pesquisa divulgada em 20/10 não pode estar na lista.
    const dados = pastaDeDados();
    writeFileSync(new URL("pesquisas.csv", dados), PESQUISAS.split("\n").slice(0, 2).join("\n").replace(/2026-10-15$/, "2026-10-20"));

    const [conferencia] = await conferirNoTse({ dados, buscar, agora: new Date("2026-10-20T01:00:00Z") });

    expect(conferencia!.divergencias).toEqual(["a divulgação (20/10/2026) é posterior à conferência no TSE (19/10/2026)"]);
  });
});
