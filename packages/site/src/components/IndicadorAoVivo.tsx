import { horaDoTse } from "../lib/formato";
import { INTERVALO_DAS_LEITURAS, type Indicador } from "../lib/leitor-ao-vivo";
import { APP_DO_TSE } from "../lib/textos-ao-vivo";

// O indicador ao vivo (Simulador "e se", decisão 14): um componente só, no cartão do placar oficial e na linha fixa.
// A cor é grafite, nunca o vermelho dos portais nem o verde e amarelo. Um toque abre o detalhe (um <details>, que
// funciona sem JavaScript e com o teclado). Com movimento reduzido, não há pulso, e o anel vira texto.

interface Props {
  indicador: Indicador;
  /** Há quantos segundos chegou a última leitura. */
  ultimaLeitura: number | null;
  /** A última totalização do TSE no Brasil, `AAAA-MM-DD HH:MM:SS` em Brasília. */
  ultimaTotalizacao: string | null;
  movimentoReduzido: boolean;
  /** Os segundos até a próxima leitura. */
  proximaLeitura: number | null;
  lendo: boolean;
}

/** O indicador ao vivo no estado do quadro, com o detalhe que um toque abre. */
export function IndicadorAoVivo(props: Props) {
  const { indicador } = props;
  if (indicador.estado === "antes-das-17h") {
    return (
      <div class="indicador" data-indicador data-estado={indicador.estado}>
        {indicador.faltam !== null && <span class="indicador-texto">Começa em {minutosESegundos(indicador.faltam)}</span>}
      </div>
    );
  }

  const aoVivo = indicador.estado === "ao-vivo" || indicador.estado === "tse-sem-novidade";
  return (
    <div class="indicador" data-indicador data-estado={indicador.estado}>
      <details class="indicador-detalhe">
        <summary>
          <span
            class="indicador-ponto"
            data-ponto={aoVivo || indicador.estado === "encerrada" ? "grafite" : "cinza"}
            {...(aoVivo && !props.movimentoReduzido ? { "data-pulso": "" } : {})}
          />
          {aoVivo ? (
            <>
              <span class="indicador-rotulo">Ao vivo</span>
              <span class="indicador-texto">Atualiza sozinho, sem recarregar</span>
              <Proxima {...props} />
            </>
          ) : indicador.estado === "interrompido" ? (
            <span class="indicador-rotulo">Atualizado às {indicador.atualizadoAs}, atualização interrompida</span>
          ) : indicador.estado === "encerrada" ? (
            <span class="indicador-rotulo">Apuração encerrada</span>
          ) : (
            <span class="indicador-rotulo">Sem conexão · tentando de novo</span>
          )}
        </summary>
        <p class="indicador-mais">
          {indicador.estado !== "encerrada" && `Lemos os dados a cada ${INTERVALO_DAS_LEITURAS} s.`}
          {indicador.estado !== "encerrada" && props.ultimaLeitura !== null && ` Última leitura há ${props.ultimaLeitura} s.`}
          {props.ultimaTotalizacao && ` Última totalização do TSE às ${horaDoTse(props.ultimaTotalizacao)}.`}
          {indicador.estado === "tse-sem-novidade" && ` TSE sem novidade desde ${indicador.desde}.`}
          {indicador.estado !== "encerrada" && " Não precisa recarregar a página."}
        </p>
      </details>
      {indicador.estado === "interrompido" && indicador.linkDoTse && (
        <a class="indicador-tse" href={APP_DO_TSE} rel="noopener">
          Acompanhe no app oficial do TSE
        </a>
      )}
    </div>
  );
}

/** O anel que se completa até a próxima leitura, a rodinha durante ela, ou o texto, com movimento reduzido. */
function Proxima({ movimentoReduzido, proximaLeitura, lendo }: Props) {
  if (movimentoReduzido) {
    return <span class="indicador-proxima">{lendo ? "lendo agora" : proximaLeitura !== null && `próxima leitura em ${proximaLeitura} s`}</span>;
  }
  if (lendo) return <span class="indicador-rodinha" data-rodinha aria-hidden="true" />;
  const feito = proximaLeitura === null ? 0 : 1 - proximaLeitura / INTERVALO_DAS_LEITURAS;
  return (
    <svg class="indicador-anel" data-anel viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
      <circle cx="10" cy="10" r="8" pathLength="1" class="anel-fundo" />
      <circle cx="10" cy="10" r="8" pathLength="1" class="anel-feito" style={{ strokeDashoffset: 1 - feito }} />
    </svg>
  );
}

/** 754 → "12:34". */
const minutosESegundos = (segundos: number) => `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
