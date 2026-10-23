import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { AMBIENTES, type ArquivoDeRodada } from "@apurador/coletor";
import { idDoMunicipio, lerCadastro } from "@apurador/pipeline";
import { criarLeitorDoEnsaio } from "./leitor-do-ensaio.ts";

// O leitor do ensaio geral rodando (leitor-do-ensaio.ts): lê o endereço público do ensaio a cada 30 s, como a página, e
// grava cada resposta numa linha de .cache/ensaio/leituras-<hora>.jsonl, que `npm run conferir-ensaio` lê depois. Roda
// no computador do dono, ao lado do TSE falso, para o atraso contar pelo mesmo relógio; o caminho pela borda é o mesmo
// de quem está fora. Começa antes das 16:50 da noite e para com Ctrl+C depois do fim do coletor.
// Uso: npm run ler-ensaio [-- --sem-dominio --municipios-por-leitura 60 --intervalo 30]
//      npm run ler-ensaio -- --endereco http://localhost:4321/ao-vivo/ --plano-b http://localhost:4321/ao-vivo-plano-b/
//   --sem-dominio: só o Worker do plano B, como o build do site sem `ao-vivo-ensaio.apurador.org`.
//   --endereco, --plano-b, --origem: outros endereços no lugar dos do ensaio (`AMBIENTES.ensaio`), como os do
//                                    `npm run noite-local` com o `astro dev`.
//   --municipios-por-leitura: os municípios lidos em rodízio a cada leitura, além do Brasil, das UFs, do Exterior e do
//                             mapa.json (padrão 60: todos os ~5.600 a cada ~45 min).

const { values: opcoes } = parseArgs({
  options: {
    "sem-dominio": { type: "boolean", default: false },
    endereco: { type: "string" },
    "plano-b": { type: "string" },
    origem: { type: "string" },
    "municipios-por-leitura": { type: "string", default: "60" },
    intervalo: { type: "string", default: "30" },
  },
});
const porLeitura = Number(opcoes["municipios-por-leitura"]);
const intervalo = Number(opcoes.intervalo) * 1000;
if (!(porLeitura >= 0) || !(intervalo > 0)) throw new Error("--municipios-por-leitura e --intervalo devem ser números positivos");

const RAIZ = new URL("../../../", import.meta.url);
// Os lugares da noite que o TSE falso serve, com os ids dos arquivos ao vivo.
const cadastro = lerCadastro(readFileSync(new URL("dados/cadastros/2022-2.json", RAIZ), "utf8"));
const ambiente = AMBIENTES.ensaio;
const enderecos = {
  principal: opcoes["sem-dominio"] ? undefined : (opcoes.endereco ?? ambiente.endereco),
  planoB: opcoes["plano-b"] ?? ambiente.planoB.endereco,
};
const leitor = criarLeitorDoEnsaio({
  enderecos,
  origem: opcoes.origem ?? ambiente.site,
  lugares: ["BR", ...cadastro.ufs.map((uf) => uf.sigla)],
  municipios: cadastro.ufs.flatMap((uf) => uf.municipios.map((m) => idDoMunicipio(m.codigo))),
  municipiosPorLeitura: porLeitura,
  buscar: fetch,
  agora: Date.now,
});

const PASTA = new URL(".cache/ensaio/", RAIZ);
mkdirSync(PASTA, { recursive: true });
const arquivo = new URL(`leituras-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`, PASTA);
console.log(`Lendo ${enderecos.principal ? `${enderecos.principal} e ` : ""}${enderecos.planoB} a cada ${intervalo / 1000} s, como a página.`);
console.log(`Leituras: ${fileURLToPath(arquivo)}. Para parar: Ctrl+C. Depois: npm run conferir-ensaio.`);

let parar = false;
process.on("SIGINT", () => {
  if (parar) process.exit(130);
  parar = true;
  console.log("Parando depois desta leitura (Ctrl+C de novo para sair já).");
});

const hora = new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium" });
for (let proxima = Date.now(); !parar; proxima += intervalo) {
  await new Promise((pronto) => setTimeout(pronto, Math.max(0, proxima - Date.now())));
  const lidas = await leitor.ler();
  for (const l of lidas) appendFileSync(arquivo, `${JSON.stringify(l)}\n`);
  const rodada = lidas.findLast((l) => l.caminho === "rodada.json" && l.status === 200)?.conteudo as ArquivoDeRodada | undefined;
  const contagem = new Map<number, number>();
  for (const l of lidas) contagem.set(l.status, (contagem.get(l.status) ?? 0) + 1);
  const porStatus = [...contagem].map(([status, quantas]) => `${status || "sem resposta"}: ${quantas}`);
  const ultima = lidas.at(-1);
  console.log(
    `${hora.format(new Date())} leitura ${ultima?.leitura} no ${ultima?.tipo}: ${rodada ? `rodada nova, fase ${rodada.fase}, TSE ${rodada.novidade.totalizacao ?? "sem totalização"}` : "rodada igual"}; ${porStatus.join(", ")}`,
  );
}
