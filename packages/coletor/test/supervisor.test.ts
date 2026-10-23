import { describe, expect, it } from "vitest";
import { supervisionar } from "../src/supervisor.ts";

// O supervisor põe o coletor de volta quando ele cai, em 5 s: derrubado, o coletor volta em menos de 1 min (Ensaio
// geral, decisão 20), e o resto do minuto é a partida dele, que retoma do disco.

/** Coletores de mentira que terminam com os códigos dados, cada um depois de `duracao` ms, num relógio que só anda nas esperas. */
function montar(codigos: (number | null)[], duracao = 60_000) {
  let agora = 0;
  const partidas: number[] = [];
  const registro: string[] = [];
  let parado = false;
  const supervisao = supervisionar({
    iniciar: () => {
      partidas.push(agora);
      const codigo = codigos.length > 0 ? (codigos.shift() as number | null) : 0;
      agora += duracao;
      return { saida: Promise.resolve(codigo) };
    },
    esperar: async (ms) => {
      agora += ms;
    },
    registrar: (linha) => registro.push(linha),
    parado: () => parado,
    agora: () => agora,
  });
  return { supervisao, partidas, registro, parar: () => (parado = true) };
}

describe("o supervisor", () => {
  it("põe o coletor de volta 5 s depois de cada queda, também quando o Windows o derruba", async () => {
    const { supervisao, partidas, registro } = montar([1, null, 0]);
    await supervisao;

    // Cada coletor roda 60 s e cai; o seguinte parte 5 s depois, bem dentro do minuto do Ensaio geral.
    expect(partidas).toEqual([0, 65_000, 130_000]);
    expect(registro).toEqual([
      "Supervisor: o coletor caiu (código 1) depois de 60 s, na 1ª vez; volta em 5 s, do estado em disco.",
      "Supervisor: o coletor caiu (código null) depois de 60 s, na 2ª vez; volta em 5 s, do estado em disco.",
      "Supervisor: o coletor terminou (código 0) depois de 60 s.",
    ]);
  });

  it("não põe de volta o coletor que terminou sozinho, nem o que caiu depois de o dono parar o supervisor", async () => {
    const terminou = montar([0]);
    await terminou.supervisao;
    expect(terminou.partidas).toHaveLength(1);

    const comCtrlC = montar([130, 1]);
    comCtrlC.parar();
    await comCtrlC.supervisao;
    expect(comCtrlC.partidas).toHaveLength(1);
  });
});
