// Um número do bloco ao vivo que pisca uma vez (1 s) quando a última leitura o mudou (Simulador "e se", decisão 14).
// O valor é a chave do elemento: um valor novo monta um elemento novo, e a animação do CSS roda nele uma vez só.

interface Props {
  valor: string;
  mudou: boolean;
  classe?: string;
  forte?: boolean;
}

export function NumeroAoVivo({ valor, mudou, classe, forte }: Props) {
  const Tag = forte ? "strong" : "span";
  return (
    <Tag key={valor} class={classe} data-numero {...(mudou ? { "data-mudou": "" } : {})}>
      {valor}
    </Tag>
  );
}
