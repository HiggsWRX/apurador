import { describe, expect, it } from "vitest";
import { despacharAlertas, type Alerta } from "../src/alertas.ts";
import { enviarAoNtfy, type MensagemDoNtfy } from "../src/ntfy.ts";

// Aonde vão os alertas (Operação na noite, decisão 8): o crítico ao celular pelo ntfy e ao som do computador, o de atenção
// só ao som curto do computador. As condições de cada alerta são provocadas no replay
// (`packages/ensaio/test/painel-e-alertas.test.ts`); aqui, o caminho até o ntfy, com a rede injetada.

const SEM_RODADA: Alerta = { id: "sem-rodada", nivel: "critico", mensagem: "Coletor sem rodada completa há 65 s" };
const RODADA_LENTA: Alerta = { id: "rodada-lenta", nivel: "atencao", mensagem: "Rodada de 16,2 s" };

describe("o envio ao ntfy", () => {
  it("publica no tópico por HTTPS, como JSON, com o título, o estado e a prioridade", async () => {
    const pedidos: { url: string; init: RequestInit | undefined }[] = [];
    const enviar = enviarAoNtfy({
      topico: "apurador-3f1c9a",
      buscar: async (url, init) => {
        pedidos.push({ url, init });
        return new Response('{"id":"x"}', { status: 200 });
      },
    });

    await enviar({ titulo: "Apurador: alerta crítico", texto: "Coletor sem rodada completa há 65 s", prioridade: "urgente" });

    expect(pedidos.map((p) => [p.url, p.init?.method])).toEqual([["https://ntfy.sh", "POST"]]);
    expect(JSON.parse(pedidos[0]!.init!.body as string)).toEqual({
      topic: "apurador-3f1c9a",
      title: "Apurador: alerta crítico",
      message: "Coletor sem rodada completa há 65 s",
      priority: 5,
    });
  });

  it("rejeita quando o ntfy não aceita", async () => {
    const enviar = enviarAoNtfy({ topico: "apurador-3f1c9a", buscar: async () => new Response("rate limited", { status: 429 }) });

    await expect(enviar({ titulo: "t", texto: "x", prioridade: "baixa" })).rejects.toThrow("o ntfy respondeu 429");
  });
});

describe("o despacho dos alertas", () => {
  function montar(ntfy: (m: MensagemDoNtfy) => Promise<void> = async () => {}) {
    const enviadas: MensagemDoNtfy[] = [];
    const tocados: [string, string][] = [];
    const registro: string[] = [];
    const despachar = despacharAlertas({
      ntfy: async (m) => {
        enviadas.push(m);
        await ntfy(m);
      },
      tocar: (nivel, mensagem) => tocados.push([nivel, mensagem]),
      registrar: (texto) => registro.push(texto),
    });
    return { despachar, enviadas, tocados, registro };
  }

  it("o crítico novo vai ao celular com som e toca no computador; o de atenção só toca, curto", () => {
    const { despachar, enviadas, tocados } = montar();

    despachar({ novos: [SEM_RODADA, RODADA_LENTA], resolvidos: [] });

    expect(enviadas).toEqual([{ titulo: "Apurador: alerta crítico", texto: "Coletor sem rodada completa há 65 s", prioridade: "urgente" }]);
    expect(tocados).toEqual([
      ["critico", "Coletor sem rodada completa há 65 s"],
      ["atencao", "Rodada de 16,2 s"],
    ]);
  });

  it("o crítico que termina vai ao celular sem som, e o de atenção que termina, a lugar nenhum", () => {
    const { despachar, enviadas, tocados } = montar();

    despachar({ novos: [], resolvidos: [SEM_RODADA, RODADA_LENTA] });

    expect(enviadas).toEqual([{ titulo: "Apurador: terminou", texto: "Coletor sem rodada completa há 65 s", prioridade: "baixa" }]);
    expect(tocados).toEqual([]);
  });

  it("uma falha do ntfy fica no registro do coletor e não segura o som", async () => {
    const { despachar, tocados, registro } = montar(async () => {
      throw new Error("fetch failed");
    });

    despachar({ novos: [SEM_RODADA], resolvidos: [] });
    await new Promise((pronto) => setTimeout(pronto, 0));

    expect(tocados).toHaveLength(1);
    expect(registro).toEqual(["ALERTA CRÍTICO: Coletor sem rodada completa há 65 s", "O alerta não foi ao celular (ntfy): fetch failed"]);
  });
});
