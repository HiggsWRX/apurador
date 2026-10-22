import { lerCredenciais } from "./ambientes.ts";
import { tocarNoComputador } from "./computador.ts";
import { TITULO_DO_ALERTA_CRITICO } from "./formatos.ts";
import { enviarAoNtfy } from "./ntfy.ts";

// O alerta de teste (Operação na noite, decisão 20: às 16h, "um alerta de teste chega ao celular"): manda ao tópico do ntfy
// do packages/coletor/.env uma mensagem com a prioridade de um alerta crítico e toca o crítico no computador, sem coletor
// nenhum rodando. Uso: npm run alerta-de-teste

const topico = lerCredenciais().NTFY_TOPICO;
if (!topico) throw new Error("Falta NTFY_TOPICO no packages/coletor/.env (veja packages/coletor/.env.exemplo)");

tocarNoComputador("critico", "Alerta de teste do coletor");
await enviarAoNtfy({ topico, buscar: fetch })({ titulo: TITULO_DO_ALERTA_CRITICO, texto: "Alerta de teste do coletor", prioridade: "urgente" });
console.log("O alerta de teste foi aceito pelo ntfy. Confira que ele tocou no celular e no computador.");
