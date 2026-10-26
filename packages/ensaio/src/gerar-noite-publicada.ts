import { readFileSync, writeFileSync } from "node:fs";
import type { RegistroDaRodada } from "@apurador/coletor";
import { csvDaNoitePublicada } from "./noite-publicada.ts";

// `npm run noite-publicada -- <registro.jsonl>...`: grava `docs/noite/<dia>.csv`, a noite momento a momento como o
// coletor a publicou, dos registros das rodadas dela (`.cache/coletor/rodadas-*.jsonl` do checkout principal; mais de
// um quando o coletor foi reiniciado). A página do Brasil o lê para "Como a projeção se saiu". Na noite de 25/10, o
// registro é o `rodadas-2026-10-25T18-04-27-457Z.jsonl`.

const arquivos = process.argv.slice(2);
if (arquivos.length === 0) throw new Error("Uso: npm run noite-publicada -- <registro das rodadas .jsonl>...");

const rodadas = arquivos
  .flatMap((arquivo) =>
    readFileSync(arquivo, "utf8")
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((l) => JSON.parse(l) as RegistroDaRodada),
  )
  .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));

// O dia da noite, em Brasília, pela primeira rodada ao vivo.
const primeira = rodadas.find((r) => r.fase === "ao-vivo");
if (!primeira) throw new Error("O registro das rodadas não tem nenhuma rodada ao vivo");
const dia = new Date(primeira.inicio).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

const saida = new URL(`../../../docs/noite/${dia}.csv`, import.meta.url);
const csv = csvDaNoitePublicada(rodadas);
writeFileSync(saida, csv);
console.log(`docs/noite/${dia}.csv: ${csv.trim().split("\n").length - 1} momentos de ${rodadas.length} rodadas`);
