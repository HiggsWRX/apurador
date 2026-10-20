import { AVISOS_PRONTOS, TRECHO_COM_LINK_DO_TSE, type AvisoPronto } from "@apurador/coletor/chaves";
import { APP_DO_TSE } from "../lib/textos-ao-vivo";

// A faixa do aviso pronto (Operação na noite, decisão 10): abaixo da manchete, em todas as páginas de lugar, um dos
// três avisos que o dono publica pelo comando da noite, com o texto exato e nada mais. Não há texto livre. O aviso 2
// leva o link do app oficial do TSE.

/** A faixa com o aviso pronto ativo, ou nada sem aviso. */
export function FaixaDeAviso({ aviso }: { aviso: AvisoPronto | null }) {
  if (aviso === null) return null;
  const texto = AVISOS_PRONTOS[aviso];
  const [antes, depois] = texto.split(TRECHO_COM_LINK_DO_TSE);
  return (
    <p class="faixa-de-aviso" data-aviso={aviso} role="status">
      {depois === undefined ? (
        texto
      ) : (
        <>
          {antes}
          <a href={APP_DO_TSE} rel="noopener">
            {TRECHO_COM_LINK_DO_TSE}
          </a>
          {depois}
        </>
      )}
    </p>
  );
}
