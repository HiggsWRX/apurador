import { describe, expect, it } from "vitest";
import { conferirARodadaPublica, type EstadoDaSentinela } from "../cloudflare/sentinela.ts";
import type { MensagemDoNtfy } from "../src/ntfy.ts";

// A sentinela (Operação na noite, decisão 8): um Worker que a cada minuto lê o arquivo de rodada público e alerta pelo
// ntfy se ele passar 3 min parado. É o único alerta que funciona com o computador ou a internet do dono fora. Aqui, a
// conferência de um minuto, com a rede, o relógio e o estado do Worker injetados.

const PRINCIPAL = "https://ao-vivo.apurador.org/";
const PLANO_B = "https://apurador-plano-b.hicampos93.workers.dev/";
const ms = (hora: string) => Date.parse(`2026-10-25T${hora}-03:00`);

/**
 * Os dois endereços, cada um com o arquivo de rodada da hora dada, servido com o `Date` de agora; sem ele, 404; ou um
 * status de erro da borda.
 */
function montar() {
  let agora = ms("21:00:00");
  const rodadas: Record<string, { rodada: string; fase: string } | number | null> = { [PRINCIPAL]: null, [PLANO_B]: null };
  const pedidos: { url: string; origem: string | null }[] = [];
  const enviadas: MensagemDoNtfy[] = [];
  const guardado = new Map<string, string>();
  const estado: EstadoDaSentinela = {
    get: async (chave) => guardado.get(chave) ?? null,
    put: async (chave, valor) => void guardado.set(chave, valor),
  };
  const conferir = () =>
    conferirARodadaPublica({
      enderecos: [PRINCIPAL, PLANO_B],
      agora: () => agora,
      estado,
      alertar: async (m) => void enviadas.push(m),
      buscar: async (url, init) => {
        pedidos.push({ url, origem: new Headers(init?.headers).get("origin") });
        const r = rodadas[url.replace("rodada.json", "")];
        if (typeof r === "number") return new Response("error code: 522", { status: r });
        return r ? Response.json(r, { headers: { date: new Date(agora).toUTCString() } }) : new Response("Not Found", { status: 404 });
      },
    });
  const publicar = (endereco: string, hora: string | null, fase = "ao-vivo") =>
    (rodadas[endereco] = hora === null ? null : { rodada: new Date(ms(hora)).toISOString(), fase });
  const falhar = (endereco: string, status: number) => (rodadas[endereco] = status);
  return { conferir, publicar, falhar, enviadas, pedidos, passar: (s: number) => (agora += s * 1000) };
}

describe("a sentinela", () => {
  it("lê o arquivo de rodada nos dois endereços, com o Origin do site", async () => {
    const s = montar();
    s.publicar(PRINCIPAL, "20:59:50");

    await s.conferir();

    expect(s.pedidos).toEqual([
      { url: `${PRINCIPAL}rodada.json`, origem: "https://apurador.org" },
      { url: `${PLANO_B}rodada.json`, origem: "https://apurador.org" },
    ]);
  });

  it("alerta uma vez quando o arquivo de rodada passa de 3 min parado, e de novo, sem som, quando ele volta a andar", async () => {
    const s = montar();
    s.publicar(PRINCIPAL, "20:59:50");

    await s.conferir(); // 21:00:00, 10 s
    s.passar(60);
    await s.conferir(); // 21:01:00, 70 s
    s.passar(60);
    await s.conferir(); // 21:02:00, 130 s
    expect(s.enviadas).toEqual([]);
    s.passar(60);
    await s.conferir(); // 21:03:00, 190 s
    s.passar(60);
    await s.conferir(); // 21:04:00: o mesmo arquivo parado não alerta de novo
    expect(s.enviadas).toEqual([
      { titulo: "Apurador: alerta crítico", texto: "Sentinela: arquivo de rodada público parado há 3 min 10 s, desde 20:59:50", prioridade: "urgente" },
    ]);

    s.publicar(PRINCIPAL, "21:04:30");
    s.passar(60);
    await s.conferir(); // 21:05:00
    expect(s.enviadas.at(-1)).toEqual({
      titulo: "Apurador: terminou",
      texto: "Sentinela: arquivo de rodada público andando de novo, às 21:04:30",
      prioridade: "baixa",
    });
    expect(s.enviadas).toHaveLength(2);
  });

  it("fica com a rodada mais nova dos dois endereços: com o plano B no ar, o principal parado não alerta", async () => {
    const s = montar();
    s.publicar(PRINCIPAL, "20:40:00");
    s.publicar(PLANO_B, "20:59:40");

    await s.conferir();

    expect(s.enviadas).toEqual([]);
  });

  it('com a fase "encerrada", não alerta', async () => {
    const s = montar();
    s.publicar(PRINCIPAL, "20:40:00", "encerrada");

    await s.conferir();

    expect(s.enviadas).toEqual([]);
  });

  it("sem arquivo de rodada, ou com um de outra noite, não alerta: a sentinela pode ficar ligada fora da noite", async () => {
    const s = montar();
    await s.conferir();
    s.publicar(PRINCIPAL, "14:00:00");
    await s.conferir();

    expect(s.enviadas).toEqual([]);
  });

  it("com os dois endereços dando erro por mais de 3 min, alerta uma vez: o visitante também não lê nada", async () => {
    const s = montar();
    s.falhar(PRINCIPAL, 522);
    s.falhar(PLANO_B, 404);

    for (let minuto = 0; minuto < 5; minuto++) {
      await s.conferir(); // 21:00 a 21:04
      s.passar(60);
    }
    expect(s.enviadas).toEqual([
      {
        titulo: "Apurador: alerta crítico",
        texto: "Sentinela: arquivo de rodada público sem leitura há 4 min (https://ao-vivo.apurador.org/rodada.json respondeu 522)",
        prioridade: "urgente",
      },
    ]);

    s.publicar(PRINCIPAL, "21:04:50");
    await s.conferir(); // 21:05
    expect(s.enviadas.at(-1)).toEqual({ titulo: "Apurador: terminou", texto: "Sentinela: arquivo de rodada público lido de novo", prioridade: "baixa" });
    expect(s.enviadas).toHaveLength(2);
  });
});
