import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { CONSTANTES_PROVISORIAS, lerConstantes } from "@apurador/modelo";
import { calibrar, noiteMomentoAMomento } from "./calibracao.ts";
import { lerNoitesDaCalibracao } from "./noites-da-calibracao.ts";
import { csvMomentoAMomento, resultadosDaCalibracao, tabelasDaCalibracao } from "./registro-da-calibracao.ts";

// `npm run calibracao`: roda a calibração nas três noites do repositório (~1 min), regrava a seção "Resultados" do
// docs/calibracao.md e os CSVs de docs/calibracao/, e mostra as constantes escolhidas. O CI roda o mesmo e falha se
// algo mudar: uma mudança no modelo que mexa nos números aparece antes de chegar à metodologia. Com `--congelar`,
// grava as escolhidas no arquivo de constantes do modelo, que o coletor, o simulador e a metodologia leem: é o
// congelamento da calibração (Ensaio geral, decisão 26).

const raiz = new URL("../../../", import.meta.url);
const inicio = Date.now();
const noites = lerNoitesDaCalibracao(raiz);
const calibracao = calibrar(noites, CONSTANTES_PROVISORIAS, (texto) => console.log(`${((Date.now() - inicio) / 1000).toFixed(0)} s: ${texto}`));

mkdirSync(new URL("docs/calibracao/", raiz), { recursive: true });
for (const [arquivo, texto] of Object.entries(tabelasDaCalibracao(calibracao))) writeFileSync(new URL(`docs/calibracao/${arquivo}`, raiz), texto);
for (const noite of noites) writeFileSync(new URL(`docs/calibracao/noite-${noite.id}.csv`, raiz), csvMomentoAMomento(noiteMomentoAMomento(noite, calibracao.constantes), noite.modelo.finalistas[0]!));

const registro = new URL("docs/calibracao.md", raiz);
const texto = readFileSync(registro, "utf8");
const secao = texto.indexOf("## Resultados");
if (secao < 0) throw new Error("docs/calibracao.md sem a seção ## Resultados");
writeFileSync(registro, texto.slice(0, secao) + resultadosDaCalibracao(calibracao, CONSTANTES_PROVISORIAS));

console.log("constantes escolhidas:", JSON.stringify(calibracao.constantes));
if (calibracao.semEscolha.length > 0) console.log("sem escolha, para o dono decidir:", calibracao.semEscolha.join("; "));

if (process.argv.includes("--congelar")) {
  if (calibracao.semEscolha.length > 0) throw new Error("um passo não escolheu: o dono decide antes do congelamento");
  const arquivo = new URL("packages/modelo/constantes.json", raiz);
  const data = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const nota = `Escolhidas pela calibração de ${data} (ticket 28, docs/calibracao.md), entre candidatos escritos antes e pela regra escrita antes, e congeladas para a noite. Nada aqui é treinado. As provisórias das decisões do mapa são o CONSTANTES_PROVISORIAS do modelo.`;
  const congeladas = { nota, ...lerConstantes(calibracao.constantes) };
  writeFileSync(arquivo, JSON.stringify(congeladas, null, 2) + "\n");
  console.log("congeladas em packages/modelo/constantes.json");
}
console.log(`${((Date.now() - inicio) / 1000).toFixed(0)} s: pronto`);
