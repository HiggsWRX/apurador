import type { RegistroDaRodada } from "@apurador/coletor";
import type { LinhaMomentoAMomento } from "./calibracao.ts";
import { csvMomentoAMomento } from "./registro-da-calibracao.ts";

// "Como a projeção se saiu" (Telas da página de lugar, decisão 13): a noite de 25/10 momento a momento, como o coletor
// a publicou, no formato do CSV das noites da calibração, para a página medir o erro com o mesmo código da seção 6 da
// metodologia. Os objetos da noite ficaram de fora (sem a chave do bucket, docs/noite/2026-10-25.md), e a fonte é o
// registro das rodadas: só o Brasil, com o placar do TSE e a projeção publicada nas duas bases, com uma casa.

/** O que o CSV lê de cada rodada do registro. */
type Rodada = Pick<RegistroDaRodada, "fase" | "placarDoTse" | "projecaoDoBrasil">;

/**
 * O CSV da noite publicada: um momento a cada Brasil publicado diferente (o placar do TSE ou a projeção de uma base),
 * desde a fase ao vivo, no 1º candidato do arquivo de rodada. Antes da primeira totalização, o momento não tem hora
 * nem placar, como o "antes da primeira seção" da calibração.
 */
export function csvDaNoitePublicada(rodadas: readonly Rodada[]): string {
  const daNoite = rodadas.filter((r) => r.fase !== "antes-das-17h" && r.placarDoTse && r.projecaoDoBrasil);
  if (daNoite.length === 0) throw new Error("O registro das rodadas não tem nenhuma rodada ao vivo");
  const candidato = daNoite[0]!.projecaoDoBrasil!.candidato;

  const linhas: LinhaMomentoAMomento[] = [];
  let anterior = "";
  for (const r of daNoite) {
    const placar = r.placarDoTse!;
    const projecao = r.projecaoDoBrasil!;
    if (projecao.candidato !== candidato) throw new Error(`A projeção passou do candidato ${candidato} ao ${projecao.candidato} no meio da noite`);
    const base = (pesoDasPesquisas: number, b: (typeof projecao)["soApuracao"]) => ({
      pesoDasPesquisas: pesoDasPesquisas / 100,
      projecao: b.projecao / 100,
      margem: b.margem / 100,
      chance: b.chance / 100,
    });
    const doCandidato = placar.candidatos.find((c) => c.numero === candidato);
    const linha: LinhaMomentoAMomento = {
      hora: placar.totalizacao,
      secoes: placar.secoes.percentual,
      placar: placar.totalizacao === null || !doCandidato ? null : doCandidato.percentual / 100,
      bases: [base(0, projecao.soApuracao), base(projecao.pesoDasPesquisas, projecao.comPesquisas)],
    };
    const chave = JSON.stringify(linha);
    if (chave !== anterior) linhas.push(linha);
    anterior = chave;
  }
  return csvMomentoAMomento({ bases: ["so_apuracao", "com_pesquisas"], linhas }, candidato);
}
