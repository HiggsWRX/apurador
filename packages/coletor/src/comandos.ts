import { AVISOS_PRONTOS, NOMES_DAS_CHAVES, ROTULO_DA_CHAVE, chavesEfetivas, ehAvisoPronto, type AvisoPronto, type Controle, type NomeDaChave } from "./chaves.ts";

// Os comandos da noite (Operação na noite, decisão 9; spec, "Comandos da noite"): o conjunto fechado do que o dono faz
// com o arquivo de controle. Ligar e desligar cada chave (desligar o núcleo mínimo é o plano zero), publicar e retirar
// um aviso pronto e passar ao plano B. Não há texto livre, pausa da publicação nem volta a um estado anterior. Este
// módulo é a parte pura: lê o comando dos argumentos e o aplica ao controle. O terminal (`noite.ts`) pede a confirmação.

/** Um comando da noite, já lido dos argumentos. */
export type ComandoDaNoite = { tipo: "ligar" | "desligar"; chave: NomeDaChave } | { tipo: "aviso"; aviso: AvisoPronto } | { tipo: "retirar-aviso" } | { tipo: "plano-b" };

/** O nome de cada chave na linha de comando, em kebab-case, que também é a palavra de confirmação. */
export const NOME_NO_COMANDO: Record<NomeDaChave, string> = {
  nucleoMinimo: "nucleo-minimo",
  projecao: "projecao",
  baseComPesquisas: "base-com-pesquisas",
  simulador: "simulador",
  mapa: "mapa",
  textosPreditivos: "textos-preditivos",
};

/** O uso, impresso sem comando ou com um comando errado. */
export const USO = [
  "Comandos da noite (npm run noite -- <comando>). Cada um pede para digitar o nome do bloco antes de gravar.",
  "  ligar <chave>        liga a chave de publicação do bloco",
  "  desligar <chave>     desliga a chave; desligar nucleo-minimo é o plano zero, e desligar projecao desliga o simulador",
  "  aviso <1|2|3>        publica um aviso pronto na faixa abaixo da manchete, no lugar do que houver",
  "  retirar-aviso        tira o aviso pronto do ar",
  "  plano-b              passa o destino ao plano B, até o fim da noite",
  `Chaves: ${NOMES_DAS_CHAVES.map((nome) => `${NOME_NO_COMANDO[nome]} (${ROTULO_DA_CHAVE[nome]})`).join(", ")}.`,
  ...Object.entries(AVISOS_PRONTOS).map(([numero, texto]) => `Aviso ${numero}: "${texto}"`),
].join("\n");

/** Um comando fora do conjunto, ou mal escrito: a mensagem diz o que faltou. */
export class ComandoInvalido extends Error {}

/** O gênero e o número do nome de cada chave, para as frases do terminal. */
const GENERO: Record<NomeDaChave, "o" | "a" | "os"> = { nucleoMinimo: "o", projecao: "a", baseComPesquisas: "a", simulador: "o", mapa: "o", textosPreditivos: "os" };
const artigo = (chave: NomeDaChave) => GENERO[chave];
/** "A projeção já está ligada.", no gênero e no número da chave. */
function jaEsta(chave: NomeDaChave, ligada: boolean): string {
  const genero = GENERO[chave];
  const Artigo = genero === "os" ? "Os" : genero === "a" ? "A" : "O";
  return `${Artigo} ${ROTULO_DA_CHAVE[chave]} já ${genero === "os" ? "estão" : "está"} ${ligada ? "ligad" : "desligad"}${genero}.`;
}

/** Lê o comando dos argumentos da linha de comando (sem o nome do programa). */
export function lerComando(argumentos: string[]): ComandoDaNoite {
  const [comando, argumento, ...sobra] = argumentos;
  if (comando === undefined) throw new ComandoInvalido("Falta o comando.");
  if (sobra.length > 0) throw new ComandoInvalido(`O comando ${comando} leva no máximo um argumento.`);
  switch (comando) {
    case "ligar":
    case "desligar": {
      if (argumento === undefined) throw new ComandoInvalido(`Diga qual chave ${comando}: ${Object.values(NOME_NO_COMANDO).join(", ")}.`);
      const chave = NOMES_DAS_CHAVES.find((nome) => NOME_NO_COMANDO[nome] === argumento);
      if (!chave) throw new ComandoInvalido(`Chave desconhecida: ${argumento}. As chaves são ${Object.values(NOME_NO_COMANDO).join(", ")}.`);
      return { tipo: comando, chave };
    }
    case "aviso": {
      const aviso = argumento !== undefined && /^\d+$/.test(argumento) ? Number(argumento) : argumento;
      if (!ehAvisoPronto(aviso)) throw new ComandoInvalido("Diga qual aviso pronto publicar: 1, 2 ou 3. Não há texto livre.");
      return { tipo: "aviso", aviso };
    }
    case "retirar-aviso":
    case "plano-b":
      if (argumento !== undefined) throw new ComandoInvalido(`O comando ${comando} não leva argumento.`);
      return { tipo: comando };
    default:
      throw new ComandoInvalido(`Comando desconhecido: ${comando}.`);
  }
}

/** O que o comando faria com o controle: o controle novo, a palavra de confirmação e o que muda, para o dono ler antes de confirmar. */
export interface ComandoAplicado {
  controle: Controle;
  /** O que o dono precisa digitar, exatamente, para gravar. */
  confirmacao: string;
  mudancas: string[];
}

/**
 * Aplica o comando ao controle, sem gravar nada. Recusa, com a razão, o que não muda nada ("já está ligado") e o que
 * as dependências não permitem (o simulador sem a projeção).
 */
export function aplicarComando(controle: Controle, comando: ComandoDaNoite): ComandoAplicado {
  switch (comando.tipo) {
    case "ligar":
    case "desligar": {
      const { chave } = comando;
      const ligar = comando.tipo === "ligar";
      if (controle.chaves[chave] === ligar) throw new ComandoInvalido(jaEsta(chave, ligar));
      if (ligar && chave === "simulador" && !controle.chaves.projecao) throw new ComandoInvalido("O simulador só liga com a projeção ligada. Ligue a projeção antes.");
      const chaves = chavesEfetivas({ ...controle.chaves, [chave]: ligar });
      const mudancas = [`${ligar ? "Liga" : "Desliga"} ${artigo(chave)} ${ROTULO_DA_CHAVE[chave]}.`];
      if (chave === "nucleoMinimo") mudancas.push(ligar ? "O bloco ao vivo volta à página." : "É o plano zero: o coletor publica só o arquivo de rodada, e a página manda para o app oficial do TSE.");
      if (!ligar && chave === "projecao" && controle.chaves.simulador) mudancas.push("O simulador também fica desligado, porque parte da projeção. Religar a projeção não o religa.");
      return { controle: { ...controle, chaves }, confirmacao: NOME_NO_COMANDO[chave], mudancas };
    }
    case "aviso": {
      if (controle.aviso === comando.aviso) throw new ComandoInvalido(`O aviso ${comando.aviso} já está publicado.`);
      const mudancas = [`Publica o aviso ${comando.aviso}: "${AVISOS_PRONTOS[comando.aviso]}"`];
      if (controle.aviso !== null) mudancas.push(`Tira o aviso ${controle.aviso} do ar.`);
      return { controle: { ...controle, aviso: comando.aviso }, confirmacao: "aviso", mudancas };
    }
    case "retirar-aviso":
      if (controle.aviso === null) throw new ComandoInvalido("Nenhum aviso está publicado.");
      return { controle: { ...controle, aviso: null }, confirmacao: "aviso", mudancas: [`Tira o aviso ${controle.aviso} do ar.`] };
    case "plano-b":
      if (controle.planoB) throw new ComandoInvalido("O destino já é o plano B.");
      return { controle: { ...controle, planoB: true }, confirmacao: "plano-b", mudancas: ["Passa o destino ao plano B, até o fim da noite. Não há comando de volta."] };
  }
}
