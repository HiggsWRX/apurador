import { APP_DO_TSE } from "../lib/textos-ao-vivo";

// O plano zero (Ensaio geral, decisão 24; Operação na noite, decisão 9): com o núcleo mínimo desligado, a partir da fase
// ao vivo, o bloco ao vivo inteiro dá lugar a este convite, e o resto da página fica como está. Nunca um placar errado.

/** O que fica no lugar do bloco ao vivo no plano zero: o convite a acompanhar no app oficial do TSE, com o link. */
export function PlanoZero() {
  return (
    <section class="cartao plano-zero" data-plano-zero aria-label="Apuração">
      <p>
        Acompanhe a apuração no{" "}
        <a href={APP_DO_TSE} rel="noopener">
          app oficial do TSE
        </a>
      </p>
    </section>
  );
}
