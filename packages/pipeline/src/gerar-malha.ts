import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { CACHE_DO_IBGE, membroComCache, RAIZ } from "./fontes.ts";
import type { Lugar } from "./lugares.ts";
import { malhaDaWeb } from "./malha.ts";
import { atualizarManifesto, gravarManifesto, lerManifesto } from "./manifesto.ts";

// Gera a malha do mapa (`dados/malha/municipios.json` e `dados/malha/ufs.json`) a partir da Malha Municipal Digital 2024
// do IBGE, com os municípios casados com `dados/lugares.json`: rode depois de `npm run dados`.
// Uso: npm run malha [-- --atualizar]   (--atualizar baixa de novo, em vez de usar o cache)

const atualizar = process.argv.includes("--atualizar");
const DADOS = new URL("dados/", RAIZ);
const URL_DA_MALHA = "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2024/Brasil/BR_Municipios_2024.zip";
const SHAPEFILE = "BR_Municipios_2024";

// Só os membros do shapefile que o mapshaper lê: o zip inteiro tem 199 MB.
const membros = await Promise.all(
  ["shp", "dbf", "prj", "cpg"].map((ext) => membroComCache(URL_DA_MALHA, `${SHAPEFILE}.${ext}`, { atualizar, cache: CACHE_DO_IBGE })),
);
const lugares = JSON.parse(readFileSync(new URL("lugares.json", DADOS), "utf8")) as Lugar[];
const malha = await malhaDaWeb(Object.fromEntries(membros.map((m) => [m.membro, m.dados])), `${SHAPEFILE}.shp`, lugares);

mkdirSync(new URL("malha/", DADOS), { recursive: true });
const derivados = Object.entries(malha).map(([nome, topologia]) => {
  const arquivo = `malha/${nome}.json`;
  const conteudo = `${JSON.stringify(topologia)}\n`;
  writeFileSync(new URL(arquivo, DADOS), conteudo);
  console.log(`${arquivo}: ${(conteudo.length / 1024).toFixed(0)} KB`);
  return { arquivo, sha256: createHash("sha256").update(conteudo).digest("hex"), fontes: [URL_DA_MALHA] };
});

// O manifesto guarda o .shp, com as formas; os códigos do .dbf são conferidos contra os lugares a cada geração.
const { dados: _, ...shp } = membros[0]!;
const manifesto = atualizarManifesto(lerManifesto(), { pastas: ["malha/"], fontes: [{ ...shp, geracao: [] }], derivados });
gravarManifesto(manifesto);
console.log(`manifesto.json: ${manifesto.fontes.length} fontes`);
