import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { AMBIENTES, destinosDoColetor, lerCredenciais } from "./ambientes.ts";
import { ARQUIVO_DO_CONTADOR, criarContadorDeGravacoes, gravarContadorDeGravacoes, lerContadorDeGravacoes } from "./contador.ts";
import { conferirEntrega, type ItemDaConferencia } from "./entrega.ts";
import { implantarWorker } from "./plano-b.ts";

// A conferência da entrega na conta (entrega.ts): grava um objeto novo no R2 pelo mesmo destino do coletor, com gzip
// (ou sem, com --sem-gzip), e o lê pelo endereço público como a noite o lê. Com --plano-b, também republica o Worker
// do plano B só com esse objeto e o `_headers`, e confere o Worker: sem `rodada.json` nele, a página continua no
// principal. Republicar troca tudo o que o Worker tem, então o --plano-b só roda antes da noite: com um `rodada.json`
// no Worker ou na pasta dele, o plano B está em uso, e a conferência para. Cada execução usa um nome novo, para a borda
// ainda não ter cópia. Os objetos ficam em `conferencia/`.
// Uso: npm run conferir-entrega -- [--destino producao|ensaio] [--sem-gzip] [--plano-b] [--origem https://apurador.org]
// Precisa da chave de escrita do bucket em packages/coletor/.env; o --plano-b, do login do wrangler.

const { values: opcoes } = parseArgs({
  options: {
    destino: { type: "string", default: "producao" },
    "sem-gzip": { type: "boolean", default: false },
    "plano-b": { type: "boolean", default: false },
    origem: { type: "string", default: "https://apurador.org" },
  },
});
if (opcoes.destino !== "producao" && opcoes.destino !== "ensaio") throw new Error(`--destino deve ser producao ou ensaio, e não ${opcoes.destino}`);
const ambiente = AMBIENTES[opcoes.destino];

if (opcoes["plano-b"]) {
  const noWorker = await fetch(`${ambiente.planoB.endereco}rodada.json`, { method: "HEAD" }).then(
    (r) => r.status === 200,
    () => false,
  );
  if (noWorker || existsSync(join(ambiente.planoB.pasta, "rodada.json"))) {
    throw new Error(
      `O plano B do ${opcoes.destino} já tem rodada.json (${noWorker ? "no Worker" : "na pasta"}): está em uso, e a conferência o trocaria pelo objeto dela.`,
    );
  }
}

const contador = criarContadorDeGravacoes(await lerContadorDeGravacoes(ARQUIVO_DO_CONTADOR), Date.now);
let republicacao: Promise<void> | undefined;
const destinos = destinosDoColetor({
  destino: opcoes.destino,
  env: lerCredenciais(),
  pasta: "",
  comprimir: !opcoes["sem-gzip"],
  buscar: fetch,
  contador,
  agora: Date.now,
  implantar: (configuracao, variaveis) => (republicacao = implantarWorker(configuracao, variaveis)),
});

const quando = new Date().toISOString();
const caminho = `conferencia/entrega-${quando.replace(/[:.]/g, "-")}.json`;
// Com acentos, para a conferência pegar também um UTF-8 trocado no caminho.
const bytes = new TextEncoder().encode(JSON.stringify({ conferencia: quando, texto: "Conferência da entrega: ação, São Paulo, 12,34%" }));

function mostrar(titulo: string, itens: ItemDaConferencia[]): boolean {
  console.log(`\n${titulo}`);
  for (const i of itens) console.log(`  ${i.ok ? "ok   " : "FALHA"} ${i.descricao}: ${i.visto}`);
  return itens.every((i) => i.ok);
}

console.log(`Grava ${caminho} no bucket ${ambiente.bucket}, ${opcoes["sem-gzip"] ? "sem" : "com"} gzip, e lê por ${ambiente.endereco}.`);
await destinos.principal.gravar(caminho, bytes);
await gravarContadorDeGravacoes(ARQUIVO_DO_CONTADOR, contador.doMes());
let certo = mostrar(
  `R2 (${ambiente.endereco})`,
  await conferirEntrega({ url: `${ambiente.endereco}${caminho}`, esperado: bytes, origem: opcoes.origem, tipo: "r2", buscar: fetch }),
);
if (!certo && !opcoes["sem-gzip"])
  console.log("\nSe só o corpo, a ETag ou o 304 falharam, rode de novo com --sem-gzip: se passar, o coletor grava sem compressão (--sem-gzip).");

if (opcoes["plano-b"]) {
  console.log(`\nRepublica o Worker ${ambiente.planoB.worker} só com ${caminho} e o _headers (wrangler deploy).`);
  await destinos.planoB.gravar(caminho, bytes);
  await destinos.planoB.fimDaRodada!();
  await republicacao;
  // O tempo até a versão nova valer na borda não é documentado: espera o arquivo aparecer, até 2 min.
  const url = `${ambiente.planoB.endereco}${caminho}`;
  const inicio = Date.now();
  while ((await fetch(url, { method: "HEAD" })).status !== 200) {
    if (Date.now() - inicio > 120_000) throw new Error(`${url} não apareceu em 2 min`);
    await new Promise((pronto) => setTimeout(pronto, 2000));
  }
  console.log(`Na borda em ${((Date.now() - inicio) / 1000).toFixed(0)} s depois do deploy.`);
  certo =
    mostrar(
      `Worker do plano B (${ambiente.planoB.endereco})`,
      await conferirEntrega({ url, esperado: bytes, origem: opcoes.origem, tipo: "worker", buscar: fetch }),
    ) && certo;
}
process.exit(certo ? 0 : 1);
