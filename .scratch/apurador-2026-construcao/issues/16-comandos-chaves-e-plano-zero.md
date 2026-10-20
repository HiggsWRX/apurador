# 16: Comandos da noite, chaves de publicação, avisos prontos e plano zero

Status: resolved
Blocked by: 14
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O dono age na noite por comandos de terminal (`npm run noite -- <comando>`). Cada comando pede para digitar o nome do bloco como confirmação e grava um arquivo de controle, que o coletor lê a cada rodada.

O coletor leva o estado das chaves e o aviso pronto ativo no arquivo de rodada, e a página reage sem recarregar. Este ticket entrega:

- o mecanismo;
- a chave do núcleo mínimo, que é o plano zero;
- os três avisos prontos.

Os tickets de cada bloco (projeção, base, simulador, mapa e textos preditivos) ligam a própria chave nesse mecanismo.

Decisões: [Operação na noite](../../apurador-2026/issues/18-operacao-na-noite.md) (decisões 5, 9, 10 e 17), [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 19, 20 e 24) e [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (comentários do ensaio e da operação).

## Critérios de aceite

- [x] O conjunto de comandos é fechado:
  - ligar e desligar cada chave (núcleo mínimo, projeção, base Apuração + pesquisas, simulador, mapa e textos preditivos);
  - publicar e retirar um dos três avisos prontos;
  - trocar o destino para o plano B, cujo efeito vem no [ticket 20](20-publicacao-r2-e-plano-b.md).

  Não há texto livre, pausa da publicação nem volta a um estado anterior.
- [x] Todo comando pede para digitar o nome do bloco antes de gravar o arquivo de controle.
- [x] O arquivo de rodada traz o estado de cada chave e o aviso pronto ativo. Antes de o coletor rodar, a página usa o arquivo de chaves estático do [ticket 04](04-agregado-de-pesquisas.md).
- [x] Uma chave ligada ou desligada aparece no site em até 2 rodadas mais o cache, sem recarregar a página.
- [x] Desligar a projeção desliga junto o simulador.
- [x] **Plano zero**: com o núcleo mínimo desligado, o coletor não publica nenhum dado ao vivo, só o arquivo de rodada. A partir da fase ao vivo, o bloco ao vivo dá lugar a "Acompanhe a apuração no app oficial do TSE", com o link, e o resto da página fica como está. Religar a chave traz o bloco de volta.
- [x] **Avisos prontos**: aparecem numa faixa abaixo da manchete, em todas as páginas, com os textos exatos:
  1. "O TSE está demorando a divulgar novos dados. Os números abaixo são os mais recentes divulgados."
  2. "O Apurador está com instabilidade. Acompanhe também no app oficial do TSE." (com o link)
  3. "A projeção do Apurador está suspensa. O placar oficial do TSE continua atualizado."
- [x] O replay liga e desliga chaves e avisos em rodadas escolhidas e confere o efeito no arquivo de rodada e nos JSONs publicados.

## Comments

- 19/10/2026, do [ticket 14](14-bloco-ao-vivo.md):
  - O arquivo de rodada chega à página por `criarLeitorAoVivo` (`packages/site/src/lib/leitor-ao-vivo.ts`). As chaves e o aviso pronto entram no `QuadroAoVivo`, e `test/leitor-ao-vivo.test.ts` já tem um endereço ao vivo de mentira para as respostas.
  - O plano zero troca o bloco em `components/VistaDoBlocoAoVivo.tsx`, que desenha a manchete, a linha fixa, o placar e a curva.
  - O link do app oficial do TSE é `APP_DO_TSE`, em `lib/textos-ao-vivo.ts`.

**20/10/2026, resolvido:**

- **Vocabulário** (`packages/coletor/src/chaves.ts`, também por `@apurador/coletor/chaves`, sem nada do Node): `CHAVES_DA_NOITE` (as seis chaves, cada uma com rótulo, nome no comando e gênero), `NOMES_DAS_CHAVES`, `ChavesDaNoite`, `AVISOS_PRONTOS` (1, 2 e 3, com os textos exatos) e `TRECHO_COM_LINK_DO_TSE`, `Controle { chaves, aviso, planoB }`, `chavesEfetivas` (o simulador só vale ligado com a projeção), `lerChaves` e `lerControle` (recusam chave faltando, desconhecida ou que não seja `true`/`false`, como o `chaves.ts` do site).
- **Comandos** (`npm run noite -- <comando>`; `comandos.ts` é a parte pura, `noite.ts` o terminal): `ligar|desligar <chave>` (`nucleo-minimo`, `projecao`, `base-com-pesquisas`, `simulador`, `mapa`, `textos-preditivos`), `aviso <1|2|3>`, `retirar-aviso` e `plano-b`. Cada um mostra o estado e o que muda e pede para digitar o nome do bloco (`aviso-<n>` para publicar um aviso, `aviso` para retirar, `plano-b` para o plano B); qualquer outra coisa não grava. `npm run noite` sem comando mostra o estado e os comandos, e avisa se o arquivo é de outro dia. Fora do conjunto, nada: `pausar`, `voltar`, texto livre e um aviso 4 são recusados. Um comando que não muda nada ("A projeção já está desligada.") também não grava.
- **Arquivo de controle** (`controle.ts`): `.cache/coletor/controle.json` (`--controle` muda o caminho, no coletor e no comando), gravado inteiro de uma vez (arquivo ao lado e `rename`), com `gravadoEm`. Sobrevive a reinícios e de um ensaio para a noite: o roteiro (31) confere e apaga antes das 15h. Sem o arquivo, o coletor e o comando partem de `dados/chaves.json` (seção `noite`), as mesmas chaves que a página usa antes do coletor, sem aviso e no destino principal, lidas de novo a cada rodada.
- **Coletor**: `criarColetor({ controle?: () => Promise<Controle> })` lê o controle no começo de cada rodada (uma leitura que falha mantém o anterior e vai para as falhas); `registro.controle` guarda o que valeu, e o resumo no terminal mostra `· desligadas: …`, `· aviso N` e `· plano B`. O `rodada.json` ganhou `chaves` (efetivas) e `aviso`. Com o núcleo mínimo desligado, `publicar()` grava só o `rodada.json`; os lugares ficam sujos e a curva real segue andando por dentro, e religar publica tudo de volta, inteiro. `planoB` fica só no controle (o destino é do ticket 20). Sem `controle` injetado (o replay), vale `CONTROLE_INICIAL`: tudo ligado menos os textos preditivos.
- **Página**: `QuadroAoVivo.chaves` e `.aviso` (`lib/leitor-ao-vivo.ts`); `criarLeitorAoVivo` recebe `chaves` (as de `CHAVES.noite`, que valem até a primeira rodada), e `ANTES_DA_PRIMEIRA_LEITURA` virou `antesDaPrimeiraLeitura(chaves)`. `lib/chaves-ao-vivo.ts` guarda as regras derivadas (`emPlanoZero`). `components/PlanoZero.tsx` e `FaixaDeAviso.tsx` são novos; `VistaDoBlocoAoVivo` começa pelo plano zero e põe a faixa logo abaixo da manchete; `BlocoAoVivo` recebe `chaves={CHAVES.noite}` de `PaginaDeLugar.astro` e refaz o observador da linha fixa quando o placar volta. `dados/chaves.json` ganhou a seção `noite` (e `test/chaves-desligadas/chaves.json` também), conferida em `ESPERADAS`.
- **Escolhas deste ticket**, fora das decisões:
  - `desligar projecao` grava o simulador desligado, e `ligar projecao` não o religa (é `ligar simulador` depois): nada liga sozinho. `ligar simulador` com a projeção desligada é recusado.
  - a confirmação dos avisos é `aviso-<n>` (não há bloco a nomear), e a do plano B, `plano-b`.
  - no plano zero, a curva real continua andando por dentro, para o bloco voltar inteiro; os `lugares/*.json` velhos ficam no destino, escondidos pelo `rodada.json`.
  - o controle é lido no começo da rodada (a spec o lista por último), para valer na rodada que vai rodar.
  - a faixa de aviso e o plano zero estão nas páginas de lugar, as que têm manchete; a página de metodologia (tickets 10 e 29) não tem leitor ao vivo. Se o dono a quiser lá, `FaixaDeAviso` serve.
- **Testes**: comandos e arquivo de controle (`packages/coletor/test/`, 16); leitor ao vivo (+2: as chaves e o aviso pelo arquivo de rodada, com o 304); vista (+6: plano zero e faixa, com os textos exatos e o link); build (+1: as chaves da ilha, do arquivo de chaves e do build com as chaves desligadas, com os textos preditivos fixados em `false`); replay (+5, com `OpcoesDoReplay.controle` por instante: a chave em até 2 rodadas, o simulador junto, o aviso entrando e saindo, 15 rodadas de plano zero só com o `rodada.json`, a volta com a curva inteira e zero divergências). `npm run typecheck`, `npm run lint` e `npm test` passam (dois testes alheios ao ticket estouram os 5 s só com a suíte inteira e outras sessões rodando na máquina; passam sozinhos).
- **Verificação ao vivo** (20/10), com `npm run noite-local -- --partida 16:58` e o `astro dev`: `desligar nucleo-minimo` trocou o bloco por "Acompanhe a apuração no app oficial do TSE" em ~45 s, sem recarregar, com o resto da página como estava; `ligar nucleo-minimo` e `aviso 1` trouxeram o placar de volta, com a faixa abaixo da manchete; `aviso 2` com o link, também a 375 px; `retirar-aviso` tirou a faixa. Sem erro no console.
- **Revisão** (Standards e Spec): o que achou está no commit "Corrige o que a revisão dos comandos da noite achou" (tabela única das chaves, `aviso-<n>`, partida do `dados/chaves.json`, o dia em Brasília com formatador próprio, testes com o literal das chaves e contagens exatas, índice do coletor enxuto). Deixados por julgamento: `chaves` e `aviso` como dois campos, e não um objeto, no `rodada.json` e no quadro; os helpers repetidos entre os testes dos pacotes; `TRECHO_COM_LINK_DO_TSE` ao lado do texto do aviso, no coletor.
- **Para o glossário** (`/domain-modeling`): "arquivo de controle", "comando da noite", "núcleo mínimo" e "aviso pronto"; o "arquivo de rodada" passa a levar as chaves e o aviso.
- As notas para os tickets 17, 19, 20, 25, 26 e 31 estão nos comentários deles.
