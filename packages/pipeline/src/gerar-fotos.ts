import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { lerMembroRemoto, lerResultado, urlsDaDivulgacao } from "@apurador/tse";
import { lerCadastro } from "./cadastro.ts";
import { arquivoComCache, RAIZ } from "./fontes.ts";
import { atualizarManifesto, gravarManifesto, lerManifesto, type DerivadoDoManifesto, type FonteDoManifesto } from "./manifesto.ts";

// As fotos oficiais dos candidatos que o placar oficial mostra (`dados/fotos/<sequencial>.jpeg`), copiadas do TSE byte
// a byte, com o manifesto de origem. O site as serve do próprio endereço: nenhum pedido do visitante vai ao TSE, e a foto
// não some se o TSE barrar o uso por outro site.
// - 2026: as da divulgação da eleição 6258, pelos sequenciais do arquivo do Brasil.
// - As noites do TSE falso (o 2º turno de 2022): as do zip de fotos do portal de dados abertos, pelos sequenciais do
//   cadastro. A divulgação de 2022 já não serve as fotos.
// Uso: npm run fotos

const DADOS = new URL("dados/", RAIZ);
const DIVULGACAO = { base: "https://resultados.tse.jus.br/oficial", eleicao: { codigo: "6258", ciclo: "ele2026" } };
const NOITES_DO_TSE_FALSO = [{ ano: 2022, turno: 2, zip: "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/fotos/foto_cand2022_BR_div.zip" }];

const fontes: FonteDoManifesto[] = [];
const derivados: DerivadoDoManifesto[] = [];
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function gravar(sequencial: string, bytes: Uint8Array, fonte: Omit<FonteDoManifesto, "sha256" | "bytes" | "baixadoEm">) {
  const arquivo = `fotos/${sequencial}.jpeg`;
  writeFileSync(new URL(arquivo, DADOS), bytes);
  fontes.push({ ...fonte, sha256: sha256(bytes), bytes: bytes.length, baixadoEm: new Date().toISOString() });
  derivados.push({ arquivo, sha256: sha256(bytes), fontes: [fonte.url] });
  console.log(`${arquivo}: ${bytes.length} bytes de ${fonte.url}`);
}

mkdirSync(new URL("fotos/", DADOS), { recursive: true });

// O arquivo do Brasil é lido do cache, como os outros geradores; as fotos, sempre da rede, porque são poucas.
const brasil = lerResultado((await arquivoComCache(urlsDaDivulgacao(DIVULGACAO.base, DIVULGACAO.eleicao).resultado({}), { atualizar: false })).dados);
for (const c of brasil.candidatos) {
  const url = `${DIVULGACAO.base}/${DIVULGACAO.eleicao.ciclo}/${DIVULGACAO.eleicao.codigo}/fotos/br/${c.sequencial}.jpeg`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`${url}: HTTP ${resposta.status}`);
  // A foto não tem data de geração do TSE: fica a data em que o TSE a gravou (Last-Modified), quando ele a manda.
  const gravadaEm = resposta.headers.get("Last-Modified");
  gravar(c.sequencial, new Uint8Array(await resposta.arrayBuffer()), { url, membro: `${c.sequencial}.jpeg`, geracao: gravadaEm ? [gravadaEm] : [] });
}

for (const { ano, turno, zip } of NOITES_DO_TSE_FALSO) {
  const cadastro = lerCadastro(readFileSync(new URL(`cadastros/${ano}-${turno}.json`, DADOS), "utf8"));
  for (const c of cadastro.candidatos) {
    const membro = await lerMembroRemoto({ url: zip, membro: (nome) => new RegExp(`^FBR${c.sequencial}_div\\.jpe?g$`).test(nome) });
    // Um zip traz as fotos de todos: a URL de cada fonte leva o membro, para cada foto ter a sua no manifesto.
    gravar(c.sequencial, membro.dados, { url: `${zip}#${membro.nome}`, membro: membro.nome, geracao: [] });
  }
}

const manifesto = atualizarManifesto(lerManifesto(), { pastas: ["fotos/"], fontes, derivados });
gravarManifesto(manifesto);
console.log(`manifesto.json: ${manifesto.fontes.length} fontes, ${manifesto.derivados.length} derivados`);
