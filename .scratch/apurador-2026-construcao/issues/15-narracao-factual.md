# 15: Narração factual

Status: ready-for-agent
Blocked by: 14
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O coletor gera a narração da noite de cada lugar, só com os eventos factuais, e a publica pronta: no JSON do lugar e, para os quatro eventos do Brasil intercalados nas outras páginas, no arquivo de rodada.

A página mostra a narração:

- no celular, o último evento do lugar sob a manchete e a lista com os 5 últimos depois do bloco da curva;
- no computador, a lista completa na coluna fixa;
- na curva, os números dos eventos factuais do lugar.

A manchete ganha as formas de virada, indicação do TSE e fim, e o placar mostra a eleição matematicamente definida.

Decisões: [Narração da noite](../../apurador-2026/issues/14-narracao-da-noite.md) (decisões 1 a 3, 7 a 11), [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisões 4, 6 e 7 e comentários) e a [medição da noite de 2022](../../apurador-2026/research/14-narracao-noite-2t-2022.md).

## Critérios de aceite

- [ ] **Eventos factuais**:
  - **Começo**: no Brasil, "Começa a divulgação".
  - **Marcos**: 10, 25, 50, 75, 90, 95 e 99% no Brasil, nas UFs e no Exterior; nos municípios, só 50%. Quando vários marcos caem na mesma rodada, sai só o mais alto, e um município totalizado de uma vez ganha só "terminou".
  - **Fim**: totalização final no Brasil e "terminou a totalização" nos outros lugares.
  - **Indicação do TSE**: só no Brasil.
- [ ] **Virada**: troca de líder no placar parcial, contada só depois de o lugar passar de 3% das suas seções. A primeira troca publica o evento na hora. As trocas seguintes dentro de 10 minutos atualizam o mesmo evento ("a liderança trocou 4 vezes entre 18:42 e 18:44; Lula à frente"), e o número na curva fica na primeira.
- [ ] **Marcos do Brasil**: dizem as duas regiões com a maior fatia das seções que faltam, pela mesma regra sempre.
- [ ] **Narração do Brasil**: entram as viradas em UF, cada UF que termina e os 50% de SP, MG, RJ, BA, RS, PR, PE e CE. Nenhum evento de município.
- [ ] **Outras páginas**: nas páginas de UF, do Exterior e de município, os quatro eventos do Brasil (virada, "as pesquisas deixaram de pesar", indicação do TSE e totalização final) entram intercalados, marcados como "Brasil" e sem número na curva.
- [ ] **Forma do texto**:
  - a hora é o `ht` do arquivo do TSE em que o evento foi visto, em HH:MM de Brasília;
  - os números do TSE vão com duas casas e o % é o observado;
  - os candidatos vêm em ordem alfabética;
  - os estados vêm com "estado" ("o estado de São Paulo") e os municípios com a UF ("São Paulo (SP)");
  - o texto segue os modelos da decisão 8 do ticket da narração;
  - o bloco leva o selo "Narração do Apurador com dados do TSE".
- [ ] **Prioridade na mesma rodada**: virada; indicação do TSE ou totalização final; marco. Todo evento entra na lista.
- [ ] **Manchete**:
  - "Virada: … " por 10 min depois de uma virada;
  - "O TSE indica X eleito";
  - "X foi eleito com Y% dos votos válidos";
  - "Lula vence na Bahia com …" e "… em Salvador (BA) com …".
- [ ] **Eleição definida**: com a indicação do TSE, o placar mostra "matematicamente definida: X eleito".
- [ ] **Virada real**: aparece na curva como ponto cheio, com "Virada às HH:MM, com X% das seções".
- [ ] **Antes das 17h**: "A narração começa às 17h, com as primeiras seções totalizadas". Depois da noite, a narração fica como registro e para de crescer na totalização final.
- [ ] **Replay de 2022**: a narração do Brasil tem ~50 eventos, uma única virada às ~18:44 (sem a troca de 0,26%) e as 4 viradas em UF (MG duas vezes, AP e AM).
- [ ] **Fases do relógio**: o replay roda em várias fases do relógio do coletor e dá sempre uma virada só no Brasil.

## Comments

- 19/10/2026, do [ticket 11](11-tse-falso.md), conferido no dicionário do EA20 (cópia fora do Git em `.cache/docs/`): a indicação do TSE é o campo `md` na raiz do arquivo do Brasil. Só `md = "e"` é a indicação. O TSE de verdade pode mandar `md = "n"` (não definido) antes dela, e o campo some na totalização final (`tf = "s"`). Ausente ou `"n"` não é evento. O TSE falso só escreve `md = "e"`, então o teste do `"n"` precisa de um arquivo à parte.
- 19/10/2026, do [ticket 14](14-bloco-ao-vivo.md):
  - A manchete é `manchete(quadro, lugar)`, em `packages/site/src/lib/textos-ao-vivo.ts`, testada em `test/vista-ao-vivo.test.tsx`. As formas de virada, indicação do TSE e fim entram ali. O nome curto ("Flávio", "Lula" e, no TSE falso, "Bolsonaro") é `nomeCurto`, em `lib/identidade.ts`.
  - A curva é `components/CurvaReal.tsx`. Os números dos eventos e o ponto da virada real vão por cima dela, com as mesmas escalas.
  - A página lê o arquivo de rodada e o JSON do lugar por `criarLeitorAoVivo` (`lib/leitor-ao-vivo.ts`), que guarda os dois no `QuadroAoVivo`. A narração sai dali, e os testes do leitor já têm um endereço ao vivo de mentira para as respostas.
