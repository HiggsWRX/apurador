import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// A pasta do coletor (`.cache/coletor/`) é a do ensaio e a da noite: o plano B, o arquivo de controle e o registro das
// rodadas. Um teste que grava nela pela pasta padrão apaga o que o coletor de verdade publicou: o `ambientes.test.ts`
// do ticket 20 criou `plano-b-ensaio/`, que a republicação esvazia. Os testes gravam numa pasta temporária.
// A conferência só vale num checkout sem a pasta, como o CI e o worktree novo de cada ticket: onde o coletor ou a noite
// local rodam, a pasta muda sozinha enquanto os testes rodam.
const PASTA = fileURLToPath(new URL("../.cache/coletor/", import.meta.url));

/** O globalSetup de todos os projetos: falha no fim se os testes criaram a pasta do coletor. */
export default function conferirPastaDoColetor() {
  if (existsSync(PASTA)) return;
  return () => {
    if (existsSync(PASTA)) {
      throw new Error(
        `Os testes criaram ${PASTA}, a pasta do coletor de verdade: grave numa pasta temporária (mkdtemp). Se foi a noite local, rodando junto, rode os testes de novo.`,
      );
    }
  };
}
