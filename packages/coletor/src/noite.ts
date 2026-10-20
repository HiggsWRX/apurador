import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { AVISOS_PRONTOS, CONTROLE_INICIAL, NOMES_DAS_CHAVES, ROTULO_DA_CHAVE, type Controle } from "./chaves.ts";
import { aplicarComando, ComandoInvalido, lerComando, USO } from "./comandos.ts";
import { ARQUIVO_DE_CONTROLE, gravarArquivoDeControle, lerArquivoDeControle } from "./controle.ts";

// Os comandos da noite no terminal (Operação na noite, decisão 5): lê o comando, mostra o que vai mudar, pede para
// digitar o nome do bloco e só então grava o arquivo de controle, que o coletor lê na rodada seguinte.
// Uso: npm run noite -- <comando> [--controle <arquivo>]
//      npm run noite                 mostra o estado do arquivo de controle e os comandos
// Os comandos estão em USO (comandos.ts). O arquivo de controle padrão é .cache/coletor/controle.json.

const { values: opcoes, positionals: argumentos } = parseArgs({
  options: { controle: { type: "string", default: ARQUIVO_DE_CONTROLE } },
  allowPositionals: true,
});

const HORA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function estado(controle: Controle, gravadoEm: string | null): string {
  const chaves = NOMES_DAS_CHAVES.map((nome) => `  ${ROTULO_DA_CHAVE[nome]}: chave ${controle.chaves[nome] ? "ligada" : "DESLIGADA"}`);
  const aviso = controle.aviso === null ? "  aviso: nenhum" : `  aviso ${controle.aviso}: "${AVISOS_PRONTOS[controle.aviso]}"`;
  const destino = `  destino: ${controle.planoB ? "PLANO B" : "principal"}`;
  const origem = gravadoEm === null ? "Sem arquivo de controle: vale o controle inicial (tudo ligado, menos os textos preditivos)." : `Arquivo de controle gravado em ${HORA.format(new Date(gravadoEm))}: ${opcoes.controle}`;
  return [origem, ...chaves, aviso, destino].join("\n");
}

const gravado = await lerArquivoDeControle(opcoes.controle);
const atual: Controle = gravado ? { chaves: gravado.chaves, aviso: gravado.aviso, planoB: gravado.planoB } : CONTROLE_INICIAL;

if (argumentos.length === 0) {
  console.log(estado(atual, gravado?.gravadoEm ?? null));
  if (gravado && HORA.format(new Date(gravado.gravadoEm)).slice(0, 5) !== HORA.format(new Date()).slice(0, 5)) {
    console.log("Atenção: o arquivo de controle é de outro dia. Se for de um ensaio, apague-o antes da noite.");
  }
  console.log(`\n${USO}`);
  process.exit(0);
}

let comando: ReturnType<typeof lerComando>;
try {
  comando = lerComando(argumentos);
} catch (erro) {
  if (!(erro instanceof ComandoInvalido)) throw erro;
  console.log(`${erro.message} Nada foi gravado.\n\n${USO}`);
  process.exit(1);
}
let aplicado: ReturnType<typeof aplicarComando>;
try {
  aplicado = aplicarComando(atual, comando);
} catch (erro) {
  if (!(erro instanceof ComandoInvalido)) throw erro;
  console.log(`${erro.message} Nada foi gravado.`);
  process.exit(1);
}

console.log(estado(atual, gravado?.gravadoEm ?? null));
console.log(`\n${aplicado.mudancas.join("\n")}`);
const terminal = createInterface({ input: process.stdin, output: process.stdout });
const resposta = await terminal.question(`Para gravar, digite ${aplicado.confirmacao}: `);
terminal.close();
if (resposta.trim() !== aplicado.confirmacao) {
  console.log(`Não confere com "${aplicado.confirmacao}". Nada foi gravado.`);
  process.exit(1);
}
await gravarArquivoDeControle(opcoes.controle, aplicado.controle, new Date());
console.log(`Gravado em ${opcoes.controle}. O coletor lê o arquivo de controle no começo da rodada seguinte, e o site muda em até 2 rodadas mais o cache.`);
