import { describe, expect, it } from "vitest";
import { aplicarComando, lerComando } from "../src/comandos.ts";
import { CONTROLE_INICIAL, lerControle, type ChavesDaNoite, type Controle } from "../src/chaves.ts";

// Os comandos da noite (Operação na noite, decisão 9): um conjunto fechado, cada um pedindo o nome do bloco como
// confirmação antes de gravar o arquivo de controle. Não há texto livre, pausa da publicação nem volta a um estado
// anterior. A conferência fica no que cada comando faz com o controle, não no terminal.

/** As seis chaves da decisão 19 do Ensaio geral, ligadas, menos os textos preditivos (Segunda consulta jurídica). */
const LIGADAS: ChavesDaNoite = { nucleoMinimo: true, projecao: true, baseComPesquisas: true, simulador: true, mapa: true, textosPreditivos: false };
const SEM_COMANDO: Controle = { chaves: LIGADAS, aviso: null, planoB: false };
const comChaves = (parte: Partial<ChavesDaNoite>, resto: Partial<Controle> = {}): Controle => ({ ...SEM_COMANDO, chaves: { ...LIGADAS, ...parte }, ...resto });

describe("o controle inicial", () => {
  it("é tudo ligado, menos os textos preditivos, sem aviso e no destino principal", () => {
    expect(CONTROLE_INICIAL).toEqual(SEM_COMANDO);
  });
});

describe("o conjunto fechado de comandos", () => {
  it("lê ligar e desligar de cada uma das seis chaves, pelo nome em kebab-case", () => {
    expect(lerComando(["desligar", "nucleo-minimo"])).toEqual({ tipo: "desligar", chave: "nucleoMinimo" });
    expect(lerComando(["ligar", "projecao"])).toEqual({ tipo: "ligar", chave: "projecao" });
    expect(lerComando(["desligar", "base-com-pesquisas"])).toEqual({ tipo: "desligar", chave: "baseComPesquisas" });
    expect(lerComando(["ligar", "simulador"])).toEqual({ tipo: "ligar", chave: "simulador" });
    expect(lerComando(["desligar", "mapa"])).toEqual({ tipo: "desligar", chave: "mapa" });
    expect(lerComando(["ligar", "textos-preditivos"])).toEqual({ tipo: "ligar", chave: "textosPreditivos" });
  });

  it("lê publicar um dos três avisos, retirar o aviso e passar ao plano B", () => {
    expect(lerComando(["aviso", "1"])).toEqual({ tipo: "aviso", aviso: 1 });
    expect(lerComando(["aviso", "3"])).toEqual({ tipo: "aviso", aviso: 3 });
    expect(lerComando(["retirar-aviso"])).toEqual({ tipo: "retirar-aviso" });
    expect(lerComando(["plano-b"])).toEqual({ tipo: "plano-b" });
  });

  it("recusa o que está fora do conjunto: texto livre, pausa, volta, chave ou aviso que não existem", () => {
    expect(() => lerComando(["aviso", "O site está lento"])).toThrow(/1, 2 ou 3/);
    expect(() => lerComando(["aviso", "4"])).toThrow(/1, 2 ou 3/);
    expect(() => lerComando(["pausar"])).toThrow(/Comando desconhecido: pausar/);
    expect(() => lerComando(["voltar"])).toThrow(/Comando desconhecido: voltar/);
    expect(() => lerComando(["desligar", "narracao"])).toThrow(/Chave desconhecida: narracao/);
    expect(() => lerComando(["desligar"])).toThrow(/qual chave/);
    expect(() => lerComando(["plano-b", "desligar"])).toThrow(/não leva argumento/);
    expect(() => lerComando([])).toThrow(/Falta o comando/);
  });
});

describe("o que cada comando faz com o controle", () => {
  it("desligar o núcleo mínimo é o plano zero, e religar o desfaz: a confirmação é o nome do bloco", () => {
    const planoZero = aplicarComando(SEM_COMANDO, { tipo: "desligar", chave: "nucleoMinimo" });
    expect(planoZero.controle).toEqual(comChaves({ nucleoMinimo: false }));
    expect(planoZero.confirmacao).toBe("nucleo-minimo");
    expect(planoZero.mudancas.join(" ")).toMatch(/plano zero/);

    const deVolta = aplicarComando(planoZero.controle, { tipo: "ligar", chave: "nucleoMinimo" });
    expect(deVolta.controle).toEqual(SEM_COMANDO);
    expect(deVolta.confirmacao).toBe("nucleo-minimo");
  });

  it("desligar a projeção desliga junto o simulador, e religá-la não o religa sozinho", () => {
    const semProjecao = aplicarComando(SEM_COMANDO, { tipo: "desligar", chave: "projecao" });
    expect(semProjecao.controle.chaves).toEqual({ ...LIGADAS, projecao: false, simulador: false });
    expect(semProjecao.confirmacao).toBe("projecao");
    expect(semProjecao.mudancas.join(" ")).toMatch(/simulador/);

    const comProjecao = aplicarComando(semProjecao.controle, { tipo: "ligar", chave: "projecao" });
    expect(comProjecao.controle.chaves).toEqual({ ...LIGADAS, simulador: false });
  });

  it("não liga o simulador com a projeção desligada", () => {
    const semProjecao = comChaves({ projecao: false, simulador: false });
    expect(() => aplicarComando(semProjecao, { tipo: "ligar", chave: "simulador" })).toThrow(/projeção/);
  });

  it("não grava o que já está assim", () => {
    expect(() => aplicarComando(SEM_COMANDO, { tipo: "ligar", chave: "mapa" })).toThrow(/O mapa já está ligado/);
    expect(() => aplicarComando(SEM_COMANDO, { tipo: "desligar", chave: "textosPreditivos" })).toThrow(/Os textos preditivos já estão desligados/);
    expect(() => aplicarComando(comChaves({ projecao: false, simulador: false }), { tipo: "desligar", chave: "projecao" })).toThrow(/A projeção já está desligada/);
    expect(() => aplicarComando(SEM_COMANDO, { tipo: "retirar-aviso" })).toThrow(/Nenhum aviso/);
    expect(() => aplicarComando({ ...SEM_COMANDO, aviso: 2 }, { tipo: "aviso", aviso: 2 })).toThrow(/já está publicado/);
    expect(() => aplicarComando({ ...SEM_COMANDO, planoB: true }, { tipo: "plano-b" })).toThrow(/já é o plano B/);
  });

  it("publica um aviso no lugar do que houver, confirmado pelo número, e retirar deixa a faixa vazia", () => {
    const um = aplicarComando(SEM_COMANDO, { tipo: "aviso", aviso: 1 });
    expect(um.controle).toEqual({ ...SEM_COMANDO, aviso: 1 });
    expect(um.confirmacao).toBe("aviso-1");
    expect(um.mudancas.join(" ")).toContain("O TSE está demorando a divulgar novos dados.");

    const tres = aplicarComando(um.controle, { tipo: "aviso", aviso: 3 });
    expect(tres.controle.aviso).toBe(3);
    expect(tres.confirmacao).toBe("aviso-3");
    expect(tres.mudancas.join(" ")).toContain("Tira o aviso 1 do ar.");

    const nenhum = aplicarComando(tres.controle, { tipo: "retirar-aviso" });
    expect(nenhum.controle.aviso).toBeNull();
    expect(nenhum.confirmacao).toBe("aviso");
  });

  it("passa ao plano B uma vez só, sem comando de volta, e as chaves ficam como estão", () => {
    const semMapa = comChaves({ mapa: false }, { aviso: 2 });
    const planoB = aplicarComando(semMapa, { tipo: "plano-b" });
    expect(planoB.controle).toEqual({ ...semMapa, planoB: true });
    expect(planoB.confirmacao).toBe("plano-b");
    expect(() => lerComando(["plano-a"])).toThrow(/Comando desconhecido/);
  });
});

describe("o arquivo de controle lido pelo coletor", () => {
  it("aceita o que o comando grava e aplica a dependência do simulador", () => {
    const gravado = { chaves: { ...LIGADAS, projecao: false }, aviso: 2, planoB: false, gravadoEm: "2026-10-25T20:10:00.000Z" };
    expect(lerControle(gravado)).toEqual(comChaves({ projecao: false, simulador: false }, { aviso: 2 }));
  });

  it("recusa chave faltando, desconhecida ou que não seja true ou false, e aviso fora dos três", () => {
    const { textosPreditivos: _, ...semUma } = LIGADAS;
    expect(() => lerControle({ chaves: semUma, aviso: null, planoB: false })).toThrow(/faltando \(textosPreditivos\)/);
    expect(() => lerControle({ chaves: { ...LIGADAS, narracao: true }, aviso: null, planoB: false })).toThrow(/desconhecidas \(narracao\)/);
    expect(() => lerControle({ chaves: { ...LIGADAS, mapa: "sim" }, aviso: null, planoB: false })).toThrow(/mapa deveria ser true ou false/);
    expect(() => lerControle({ chaves: LIGADAS, aviso: 4, planoB: false })).toThrow(/aviso deveria ser null, 1, 2 ou 3/);
    expect(() => lerControle({ chaves: LIGADAS, aviso: null })).toThrow(/planoB/);
    expect(() => lerControle("desligar tudo")).toThrow(/objeto/);
  });
});
