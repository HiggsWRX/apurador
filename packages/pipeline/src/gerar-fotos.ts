import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { lerMembroRemoto, lerResultado, urlsDaDivulgacao } from "@apurador/tse";
import { lerCadastro } from "./cadastro.ts";
import { arquivoComCache, RAIZ } from "./fontes.ts";
import { atualizarManifesto, gravarManifesto, lerManifesto, type DerivadoDoManifesto, type FonteDoManifesto } from "./manifesto.ts";

// As fotos oficiais dos candidatos que o placar oficial mostra (`dados/fotos/<sequencial>.jpeg`), copiadas do TSE byte
// a byte, com o manifesto de origem. O site as serve do próprio endereço: nenhum pedido do visitante vai ao TSE, e a foto
// não some se o TSE barrar o uso por outro site (decisão do dono, 19/10, no ticket 14).
// - 2026: as da divulgação da eleição 6258, pelos sequenciais do arquivo do Brasil.
// - As noites que o TSE falso serve (os cadastros em `dados/cadastros/`): as do zip de fotos do portal de dados abertos,
//   pelos sequenciais do cadastro. A divulgação de 2022 já não serve as fotos (404, medido em 19/10).
// Uso: npm run fotos

const DADOS = new URL("dados/", RAIZ);
const DIVULGACAO = urlsDaDivulgacao("https://resultados.tse.jus.br/oficial", { codigo: "6258", ciclo: "ele2026" });
/** O zip das fotos dos candidatos de um ano no portal, com um membro `FBR<sequencial>_div.jpg` (ou `.jpeg`) por candidato. */
const zipDeFotos = (ano: number) => `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes${ano}/fotos/foto_cand${ano}_BR_div.zip`;

const fontes: FonteDoManifesto[] = [];
const derivados: DerivadoDoManifesto[] = [];

function gravar(sequencial: string, bytes: Uint8Array, fonte: Omit<FonteDoManifesto, "sha256" | "bytes" | "baixadoEm">) {
  const arquivo = `fotos/${sequencial}.jpeg`;
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  writeFileSync(new URL(arquivo, DADOS), bytes);
  fontes.push({ ...fonte, sha256, bytes: bytes.length, baixadoEm: new Date().toISOString() });
  derivados.push({ arquivo, sha256, fontes: [fonte.url] });
  console.log(`${arquivo}: ${bytes.length} bytes de ${fonte.url}`);
}

mkdirSync(new URL("fotos/", DADOS), { recursive: true });

// O arquivo do Brasil é lido do cache, como nos outros geradores; as fotos, sempre da rede, porque são poucas.
const brasil = lerResultado((await arquivoComCache(DIVULGACAO.resultado({}), { atualizar: false })).dados);
for (const c of brasil.candidatos) {
  const url = DIVULGACAO.foto(c.sequencial);
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`${url}: HTTP ${resposta.status}`);
  // A foto não tem data de geração do TSE: fica a data em que o TSE a gravou (Last-Modified), quando ele a manda.
  const gravadaEm = resposta.headers.get("Last-Modified");
  gravar(c.sequencial, new Uint8Array(await resposta.arrayBuffer()), { url, membro: `${c.sequencial}.jpeg`, geracao: gravadaEm ? [gravadaEm] : [] });
}

for (const nome of readdirSync(new URL("cadastros/", DADOS)).filter((n) => n.endsWith(".json"))) {
  const cadastro = lerCadastro(readFileSync(new URL(`cadastros/${nome}`, DADOS), "utf8"));
  const zip = zipDeFotos(cadastro.ano);
  for (const c of cadastro.candidatos) {
    const membro = await lerMembroRemoto({ url: zip, membro: (n) => new RegExp(`^FBR${c.sequencial}_div\\.jpe?g$`).test(n) });
    // Um zip traz as fotos de todos: a URL de cada fonte leva o membro, para cada foto ter a sua no manifesto.
    gravar(c.sequencial, membro.dados, { url: `${zip}#${membro.nome}`, membro: membro.nome, geracao: [] });
  }
}

const manifesto = atualizarManifesto(lerManifesto(), { pastas: ["fotos/"], fontes, derivados });
gravarManifesto(manifesto);
console.log(`manifesto.json: ${manifesto.fontes.length} fontes, ${manifesto.derivados.length} derivados`);
