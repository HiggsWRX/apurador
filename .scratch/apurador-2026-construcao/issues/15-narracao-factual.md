# 15: Narração factual

Status: resolved
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

- [x] **Eventos factuais**:
  - **Começo**: no Brasil, "Começa a divulgação".
  - **Marcos**: 10, 25, 50, 75, 90, 95 e 99% no Brasil, nas UFs e no Exterior; nos municípios, só 50%. Quando vários marcos caem na mesma rodada, sai só o mais alto, e um município totalizado de uma vez ganha só "terminou".
  - **Fim**: totalização final no Brasil e "terminou a totalização" nos outros lugares.
  - **Indicação do TSE**: só no Brasil.
- [x] **Virada**: troca de líder no placar parcial, contada só depois de o lugar passar de 3% das suas seções. A primeira troca publica o evento na hora. As trocas seguintes dentro de 10 minutos atualizam o mesmo evento ("a liderança trocou 4 vezes entre 18:42 e 18:44; Lula à frente"), e o número na curva fica na primeira.
- [x] **Marcos do Brasil**: dizem as duas regiões com a maior fatia das seções que faltam, pela mesma regra sempre.
- [x] **Narração do Brasil**: entram as viradas em UF, cada UF que termina e os 50% de SP, MG, RJ, BA, RS, PR, PE e CE. Nenhum evento de município.
- [x] **Outras páginas**: nas páginas de UF, do Exterior e de município, os quatro eventos do Brasil (virada, "as pesquisas deixaram de pesar", indicação do TSE e totalização final) entram intercalados, marcados como "Brasil" e sem número na curva.
- [x] **Forma do texto**:
  - a hora é o `ht` do arquivo do TSE em que o evento foi visto, em HH:MM de Brasília;
  - os números do TSE vão com duas casas e o % é o observado;
  - os candidatos vêm em ordem alfabética;
  - os estados vêm com "estado" ("o estado de São Paulo") e os municípios com a UF ("São Paulo (SP)");
  - o texto segue os modelos da decisão 8 do ticket da narração;
  - o bloco leva o selo "Narração do Apurador com dados do TSE".
- [x] **Prioridade na mesma rodada**: virada; indicação do TSE ou totalização final; marco. Todo evento entra na lista.
- [x] **Manchete**:
  - "Virada: … " por 10 min depois de uma virada;
  - "O TSE indica X eleito";
  - "X foi eleito com Y% dos votos válidos";
  - "Lula vence na Bahia com …" e "… em Salvador (BA) com …".
- [x] **Eleição definida**: com a indicação do TSE, o placar mostra "matematicamente definida: X eleito".
- [x] **Virada real**: aparece na curva como ponto cheio, com "Virada às HH:MM, com X% das seções".
- [x] **Antes das 17h**: "A narração começa às 17h, com as primeiras seções totalizadas". Depois da noite, a narração fica como registro e para de crescer na totalização final.
- [x] **Replay de 2022**: a narração do Brasil tem ~50 eventos, uma única virada às ~18:44 (sem a troca de 0,26%) e as 4 viradas em UF (MG duas vezes, AP e AM).
- [x] **Fases do relógio**: o replay roda em várias fases do relógio do coletor e dá sempre uma virada só no Brasil.

## Comments

- 19/10/2026, do [ticket 11](11-tse-falso.md), conferido no dicionário do EA20 (cópia fora do Git em `.cache/docs/`): a indicação do TSE é o campo `md` na raiz do arquivo do Brasil. Só `md = "e"` é a indicação. O TSE de verdade pode mandar `md = "n"` (não definido) antes dela, e o campo some na totalização final (`tf = "s"`). Ausente ou `"n"` não é evento. O TSE falso só escreve `md = "e"`, então o teste do `"n"` precisa de um arquivo à parte.
- 19/10/2026, do [ticket 14](14-bloco-ao-vivo.md):
  - A manchete é `manchete(quadro, lugar)`, em `packages/site/src/lib/textos-ao-vivo.ts`, testada em `test/vista-ao-vivo.test.tsx`. As formas de virada, indicação do TSE e fim entram ali. O nome curto ("Flávio", "Lula" e, no TSE falso, "Bolsonaro") é `nomeCurto`, em `lib/identidade.ts`.
  - A curva é `components/CurvaReal.tsx`. Os números dos eventos e o ponto da virada real vão por cima dela, com as mesmas escalas.
  - A página lê o arquivo de rodada e o JSON do lugar por `criarLeitorAoVivo` (`lib/leitor-ao-vivo.ts`), que guarda os dois no `QuadroAoVivo`. A narração sai dali, e os testes do leitor já têm um endereço ao vivo de mentira para as respostas.

**20/10/2026, resolvido:**

- **Coletor** (`packages/coletor/src/narracao.ts`, também por `@apurador/coletor/narracao`, sem nada do Node): `criarNarracao(lugares)` recebe os lugares do site (`dados/lugares.json`, pelos nomes: os do TSE vêm em maiúsculas) e, a cada rodada, `narrar(novos)` com os resultados que o coletor baixou nela; devolve os lugares cuja narração mudou. `doLugar(id)` é a narração do lugar, do evento mais novo ao mais antigo; `doBrasil()`, os eventos do Brasil das outras páginas. `criarColetor` ganhou a opção `lugares` (o `principal.ts` lê `dados/lugares.json`) e o passo `narrar(d)`, entre baixar e publicar; um lugar cuja narração mudou entra em `sujos`. O coletor passou a depender do `modelo` (`REGIOES` e o novo `regiaoDe(uf)`) e do `pipeline` (só o tipo `Lugar`). `nomeCurto` mudou do site para cá (`lib/identidade.ts` o reexporta), e `COMECO_INSTAVEL` também (`EixosDaCurva` o reexporta): o corte de 3% da virada é o da escala da curva.
- **Contratos**: `lugares/<id>.json` ganhou `narracao: EventoDaNarracao[]`; `rodada.json`, `eventosDoBrasil` (vazio no plano zero). Um evento é `{ lugar, tipo, quando, texto, marco?, trocas?, numero?, ponto? }`: `tipo` é `comeco`, `marco`, `fim`, `virada`, `indicacao` ou `totalizacao-final`; `quando` é o `dt`/`ht` do arquivo do TSE em que ele foi visto; `trocas` só na virada; `numero` e `ponto` (o ponto da curva real, `[% de seções, % de cada candidato]`) só nos do próprio lugar.
- **Página**: a coluna da narração (`components/ColunaDaNarracao.tsx`) é uma segunda ilha (`NarracaoDaNoite.tsx`), que desenha o quadro que a ilha do bloco ao vivo publica a cada leitura (`lib/quadro-da-pagina.ts`), sem ler nada de novo. No computador, a lista inteira fica na coluna fixa; no celular, 5 eventos e "Ver toda a narração (N)", logo depois do bloco ao vivo (o CSS desfaz a `.principal` na grade e manda o resto para depois). `lib/narracao.ts` junta a narração do lugar com a do Brasil, pela hora. `UltimoEvento.tsx` fica sob a manchete, só com evento do próprio lugar, e "Narração →". `MarcadoresDaNarracao.tsx` põe na curva o número de cada evento do lugar e a virada real, com "Virada às HH:MM, com X% das seções" embaixo. A manchete (`lib/textos-ao-vivo.ts`) ganhou a virada, a indicação, a totalização final e o fim de UF e de município; o placar, "Indicação do TSE · matematicamente definida: X eleito" (`eleitoPelaIndicacao`). `emLugar` (`lib/lugares.ts`) dá à ilha "na Bahia", "em São Paulo" e "em Salvador (BA)".
- **Escolhas deste ticket**, fora das decisões:
  - o começo vale em todo lugar ("Começa a totalização: X% das seções totalizadas no estado de …"), como na decisão 2. O começo, os marcos e o fim de um lugar são níveis, e de um arquivo só o mais alto vira evento: na partida a frio, isso já dá a regra da decisão 11;
  - o marco passa pela fração exata (totalizadas/total), e o texto leva o % do TSE. O fim é a totalização final no Brasil (`tf`) e as seções todas nos outros lugares, também na manchete "X vence na Bahia";
  - a virada conta pelos votos, e um empate não troca o líder. A janela de 10 min vai da hora do TSE da primeira troca, que fica com o número e o ponto. O evento guarda as `trocas`, e a manchete "Virada: …" só sai com um número ímpar delas (com um número par, a liderança voltou). Ela vale por 10 min contados na hora do TSE (`novidade.totalizacao`), não na da rodada: no ensaio geral, o relógio do coletor está em outro dia;
  - as regiões são a fatia das seções que faltam nas UFs e no Exterior, como na medição. O Exterior entra no total e nunca é citado; num empate, fica a ordem das regiões;
  - dos 8 maiores eleitorados entra o evento do marco de 50% da UF. Se uma delas pulasse os 50 e os 75% num só arquivo, entraria o de 75%, não o de 50% (não acontece em 2022);
  - a lista vai pela hora do TSE e, na mesma hora, pela prioridade da decisão 10. Na narração do Brasil, os eventos das UFs entram pela hora deles;
  - um arquivo mais velho que o último visto (a CDN) não narra nada nem entra nas regiões. Depois da totalização final do Brasil, nada com hora posterior a ela entra;
  - todo evento do próprio lugar ganha número na curva, também o começo e o fim, e números que se encostam sobem em degraus;
  - a narração vazia depois das 17h diz "A narração começa com as primeiras seções totalizadas."; o selo aparece sempre; no plano zero, a coluna some;
  - o placar fica com a indicação também depois da final: ela sai da narração, que é o registro.
- **Medição** (`tmp/narracao-2022.ts`, a noite de 2022 inteira no replay, a partir das 16:50):
  - O Brasil tem 51 eventos: os 11 dele, as 4 viradas em UF, as 28 UFs que terminam e os 50% dos 8 maiores.
  - Os do Brasil:
    - o começo às 17:00:55, com 0,12%;
    - os marcos de 10% às 17:34:16, 25% às 17:57:00 e 50% às 18:27:36, este com 50,92% e "51% são do Sudeste e 30% do Nordeste", como na medição;
    - a virada às 18:45:00, com 68,45%;
    - os marcos de 75% às 18:51:40, 90% às 19:10:20 e 95% às 19:24:58;
    - a indicação às 19:56:27, com 98,82%;
    - o marco de 99% às 20:00:49, com 61% no Sudeste e 32% no Nordeste;
    - a totalização final às 00:18:04: Lula eleito com 50,90%.
  - As viradas em UF: MG às 17:58:39, com 15,75%; AP às 18:14:59, com 57,30%; AM às 18:59:20, com 92,89%; MG às 19:35:47, com 93,16%.
  - Os 5.751 municípios e cidades do exterior somam 16.626 eventos, 634 deles viradas.
  - Sem compressão, o JSON do município tem mediana de 982 bytes, p90 de 1.521 e máximo de 3.829; o do Brasil, sem a projeção, 12.649 bytes.
  - A noite inteira dá 101.597 gravações no replay.
- **Testes**:
  - narração no coletor (`packages/coletor/test/narracao.test.ts`, 18): os textos dos modelos, o `md = "n"` pela amostra real, a série ao segundo de 2022 na janela, a cópia velha e a trava da final;
  - replay (+16): na noite inteira, ~50 eventos e os das UFs, com os literais da medição; uma virada só em 7 fases do relógio; o plano zero sem eventos do Brasil;
  - página (`test/narracao-ao-vivo.test.tsx`, 15): a manchete, o placar, a linha, a coluna e a curva;
  - build (+1): o nome com preposição na ilha, e a coluna como ilha com o texto de antes das 17h.
  - `npm run typecheck`, `npm run lint` e `npm test` passam.
- **Verificação ao vivo** (20/10), com `npm run noite-local -- --partida 18:32` e o `astro dev`:
  - a coluna fica fixa à direita, com número, hora e selo, e a linha sob a manchete tem "Narração →";
  - às 18:45 da noite, a manchete diz "Virada: Lula passa à frente com 50,09%, com 71,54% das seções totalizadas", e a curva mostra o ponto da virada e "Virada às 18:45, com 68,48% das seções";
  - em Minas Gerais, a virada do Brasil vem intercalada, marcada como "Brasil";
  - a 375 px, aparecem 5 eventos e "Ver toda a narração (9)", que abre os 9, com a coluna logo depois da curva e antes dos blocos de antes das 17h, sem rolagem lateral.
- **Revisão** (Standards e Spec): o que ela achou está no commit "Corrige o que a revisão da narração factual achou":
  - no celular, a coluna logo depois da curva;
  - a trava depois da final, o selo sempre visível e a cópia velha fora das regiões;
  - a manchete com as trocas pares;
  - no replay, os literais da medição e as fases de reserva explicadas;
  - as regiões do `modelo`, e `COMECO_INSTAVEL` e `instanteDoTse` num lugar só;
  - os nomes `LugarNarrado`, `data-fora-do-resumo` e `data-indicacao-do-tse`.
  - Ficaram por julgamento:
    - o "(UF)" do município repetido no coletor, porque a parte sem Node não importa o `pipeline`;
    - um `lider` em cada pacote, um sobre o `ResultadoDoTse` e o outro sobre o arquivo publicado;
    - a tolerância de um minuto na hora da virada e da indicação, porque o coletor lê o Brasil uma vez por minuto;
    - "Lisboa (Exterior)", como está no glossário.
  - O teste das fases não passa pela janela de 10 min: a 60 s, nenhuma fase vê mais que 2 trocas. Quem confere a janela é o teste da narração.
- As notas para os tickets 17, 19 e 22 estão nos comentários deles.
