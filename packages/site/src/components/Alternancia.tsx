// Um controle de poucas opções, uma escolhida, com o estado no `aria-pressed` e o mesmo feitio dos botões da base da
// projeção e dos turnos do histórico: o do cartão do mapa (Mapa | Tabela, Estados | Municípios, Placar | Mudança).

interface Props<T extends string> {
  /** O nome do grupo para o leitor de tela. */
  rotulo: string;
  /** Cada opção, com o valor e o texto do botão. */
  opcoes: [T, string][];
  escolhida: T;
  aoEscolher: (opcao: T) => void;
}

/** Os botões das opções, com a escolhida marcada. */
export function Alternancia<T extends string>({ rotulo, opcoes, escolhida, aoEscolher }: Props<T>) {
  return (
    <div class="alternancia" role="group" aria-label={rotulo}>
      {opcoes.map(([valor, texto]) => (
        <button key={valor} type="button" data-opcao={valor} aria-pressed={valor === escolhida ? "true" : "false"} onClick={() => aoEscolher(valor)}>
          {texto}
        </button>
      ))}
    </div>
  );
}
