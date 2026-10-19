import { conferirNoTse } from "./conferencia.ts";
import { RAIZ } from "./fontes.ts";

// Confere o `pesquisas.csv` no CSV de registros do TSE do dia, atualiza o extrato do TSE e registra a conferência.
// Uso: npm run pesquisas   (rodar a cada atualização do pesquisas.csv, antes do commit)

const conferencias = await conferirNoTse({ dados: new URL("dados/", RAIZ), agora: new Date() });

for (const c of conferencias) {
  const situacao = c.divergencias.length === 0 ? "ok" : `DIVERGENTE: ${c.divergencias.join("; ")}`;
  console.log(`${c.pesquisa.registro} ${c.pesquisa.instituto}: ${situacao}`);
}
const divergentes = conferencias.filter((c) => c.divergencias.length > 0).length;
console.log(`${conferencias.length} pesquisas conferidas, ${divergentes} divergente(s). Registro em dados/pesquisas-verificacoes.csv.`);
if (divergentes > 0) process.exitCode = 1;
