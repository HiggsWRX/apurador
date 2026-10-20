// Um número do bloco ao vivo que pisca uma vez (1 s) quando a última leitura o mudou (Simulador "e se", decisão 14).
// O valor é a chave do elemento: um valor novo monta um elemento novo, e a animação do CSS roda nele uma vez só.

interface Props {
  /** O número como a página o mostra ("50,43%", "57.873.281"). */
  valor: string;
  mudou: boolean;
  classe?: string;
  /** Em <strong>, como o % de cada candidato. */
  forte?: boolean;
}

/** Um número do placar já formatado, marcado para piscar quando mudou. */
export function NumeroAoVivo({ valor, mudou, classe, forte }: Props) {
  const Tag = forte ? "strong" : "span";
  return (
    <Tag key={valor} class={classe} data-numero {...(mudou ? { "data-mudou": "" } : {})}>
      {valor}
    </Tag>
  );
}
