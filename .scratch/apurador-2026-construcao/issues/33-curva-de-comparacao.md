# 33: Curva de comparação

Status: resolved
Blocked by: 14, 27
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O visitante sobrepõe à curva real a curva de comparação de qualquer turno passado (2018 1T e 2T, 2022 1T e 2T, 2026 1T), no mesmo eixo de % de seções totalizadas. Ela fica desligada por padrão. O pipeline reconstrói as noites que ainda faltam, o 1º turno de 2018 e o de 2022, e gera a curva real de cada turno passado em cada lugar.

Decisões: [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisão 4), [Linha do tempo de apurações passadas](../../apurador-2026/issues/02-linha-do-tempo-apuracoes-passadas.md) e [Consulta a advogado eleitoral](../../apurador-2026/issues/16-consulta-advogado-eleitoral.md) (decisão 2: "O que esperar da noite" sem números de projeção).

## Critérios de aceite

- [x] **Noites que faltam**: o 1º turno de 2018 e o de 2022 são reconstruídos seção por seção com o mesmo código, e o fim de cada um bate com o resultado oficial.
- [x] **Curvas passadas**: para cada lugar (Brasil, UF, Exterior e município) e cada turno passado, a curva real é amostrada de forma compacta. Ela mostra a fatia do PT contra o partido de Bolsonaro entre os dois, como na comparação de turnos.
- [x] **Botões**: há um botão por turno passado, desligado por padrão, e a curva de comparação aparece sobre a curva real atual, com legenda.
- [x] **Peso**: os dados das curvas passadas só são baixados quando o visitante liga uma delas.
- [x] **Sem a projeção antes das 17h**: com a chave desligada, "O que esperar da noite" pode mostrar as curvas reais de noites passadas.

## Comments

- 19/10/2026, do [ticket 14](14-bloco-ao-vivo.md): a curva de comparação vai por cima da curva real, em `packages/site/src/components/CurvaReal.tsx`, e entra na conta da escala como a curva real: só depois de 3% das seções.
- 20/10/2026, do [ticket 09](09-painel-antes-das-17h.md):
  - "O que esperar da noite" é `packages/site/src/components/OQueEsperarDaNoite.astro`, na página do Brasil (`pages/index.astro`), sempre presente. Com a chave `antesDas17h.projecao` desligada, ele fica só com o texto da ordem de chegada do 1º turno de 2026 (`ORDEM_DE_CHEGADA` em `lib/projecao-antes-das-17h.ts`): é aí que as curvas reais de noites passadas entram.
  - A escala e os eixos das curvas estão em `components/EixosDaCurva.tsx` (`escalaDaCurva(distancia)`, `eixosDaCurva(escala, margemDireita)` e `<EixosDaCurva>`), usados pela `CurvaReal` e pela `CurvaProjetada`: a curva de comparação entra na conta da escala pela mesma `escalaDaCurva`.

**20/10/2026, resolvido** na branch `ticket/33-curva-de-comparacao`, à espera da revisão do dono:

- **Noites que faltam**: `dados/noites/2018-1.json.gz` (0,99 MB, 45.470 chegadas em 6.273 zonas) e `dados/noites/2022-1.json.gz` (1,50 MB, 92.547 chegadas em 6.283 zonas). Saem do mesmo `reconstruirNoite`, com a hora do `detalhe_votacao_secao` e os votos da `votacao_secao_<ano>_BR`, que tem os dois turnos (1,83 GB em 2018 e 1,59 GB em 2022). O `bweb` do 1º turno traria todos os cargos, com 1,4 GB por ano.
  - Na geração (`npm run noites`), as duas batem zona a zona com o munzona. A de 2022 bate também instante a instante com o histórico oficial de totalização do 1º turno.
  - As três noites que já existiam saem iguais, byte a byte.
  - **Fim do 1º turno de 2018** (última seção em 23/10/2018, às 17:16:59):
    - 454.490 seções e 147.306.295 aptos;
    - 117.364.654 votantes, 107.050.749 válidos, 3.106.937 brancos e 7.206.222 nulos;
    - Bolsonaro (PSL) com 49.277.010 (46,03%) e Haddad (PT) com 31.342.051 (29,28%).
    - Os 746 votantes que faltam para fechar a conta são votos anulados e apurados em separado.
  - **Fim do 1º turno de 2022** (última seção em 04/10/2022, às 10:27:34):
    - 472.075 seções e 156.454.011 aptos;
    - 123.682.372 votantes, 118.229.719 válidos, 1.964.779 brancos e 3.487.874 nulos;
    - Lula (PT) com 57.259.504 (48,43%) e Bolsonaro (PL) com 51.072.345 (43,20%).
  - **No CI**, os testes conferem:
    - em 2022, os instantes do histórico oficial em que o país passa de 1%, 50%, 90% e 99%: 17:38:34, 19:35:33, 20:30:16 e 22:15:58, com os votos de Lula e Bolsonaro;
    - em 2018, os 57,17% das 19h, quando a divulgação abriu, e os marcos 17:26, 18:49, 20:11 e 21:59 da linha do tempo;
    - nas duas, o fim oficial.
  - A tabela da linha do tempo escreve 17:38 para o 1% de 2022 (17:38:34) e arredonda os outros marcos. Por isso o teste de 2022 confere os marcos ao segundo, pelo histórico.
- **Dois acertos nos leitores**, sem efeito nas noites que já existiam:
  - O 97 da `votacao_secao` é voto "anulado e apurado em separado" (`QT_VOTOS_ANULADOS_APU_SEP` no detalhe e no munzona). Ele conta só nos votantes, não nos nulos. Em Presidente, só aparece em duas seções de Salvador (zona 18) no 1º turno de 2018: 383 e 363 votos. Antes, o leitor o contava como nulo técnico.
  - A conferência com o histórico oficial acha os candidatos pelo nome de urna só com as letras. O histórico do 1º turno de 2022 escreve "FELIPE DAVILA" e "LEO PERICLES", e o munzona, "FELIPE D AVILA" e "LÉO PÉRICLES".
- **Curvas**: `dados/curvas/<turno>.json` saem do mesmo `npm run noites`, com o manifesto (`curvasDoTurno` em `packages/pipeline/src/curvas.ts`).
  - **Amostragem**: um ponto no primeiro estado, um no primeiro instante em que o lugar alcança cada % inteiro de seções, e o último estado. O estado de um instante é o de depois de todas as chegadas dele. São no máximo 101 pontos por lugar e turno.
  - **O que guardam**: o % de seções e a fatia do PT entre o PT e o partido de Bolsonaro, com uma casa. A regra é a do placar entre finalistas da comparação de dois turnos: o partido de Bolsonaro arredondado, e o PT com o que falta para 100,0.
  - **Lugares por turno**: 5.737 em 2018 1T, 2018 2T e 2022 1T, 5.738 em 2022 2T e 5.745 em 2026 1T. Os arquivos somam 3,6 MB (1,0 MB com gzip).
  - **No CI**, os testes conferem:
    - todo lugar com voto em um dos dois tem curva, e ela termina no resultado oficial de `dados/turnos/`;
    - o Brasil termina com o PT em 38,9%, 44,9%, 52,9%, 50,9% e 49,0%;
    - as curvas de 2022 passam pelos pontos do histórico oficial nos marcos.
- **Página**:
  - Na curva real, embaixo do gráfico, vem "Comparar com" e um botão por turno passado que o lugar tem, todos desligados. A ilha recebe só a lista dos turnos (`turnosDoLugar`).
  - Ligado um turno, entram as duas linhas pontilhadas, o PT na cor de Lula e o partido de Bolsonaro na de Flávio, espelhadas em torno de 50%. A legenda diz "Curva real de 2022 2T: PT × PL" e, num 1º turno, "Curva real de 2018 1T, só entre os dois: PT × PSL".
  - A curva de comparação entra na escala só depois de 3% das seções, como a real.
  - A camada é `components/CurvaDeComparacao.tsx`, e a `CurvaReal` só a monta. O estado fica na ilha, em `BlocoAoVivo` (`useComparacao`), e a vista continua sem estado.
  - Sem JavaScript, os botões não aparecem.
- **Peso**: há um `/curvas/<id>.json` por lugar, com os turnos passados dele, gerado no build (`pages/curvas/[lugar].json.ts`).
  - O primeiro clique baixa o arquivo, e trocar de turno não baixa de novo. Se o download falha, a legenda diz isso, e o próximo clique tenta de novo.
  - São 5.749 arquivos, com 3,6 MB no total (1,6 MB com gzip). A mediana tem 467 B, e o maior, o da Bahia, 4,5 KB (1,3 KB com gzip).
  - O `dist` passa a 11.569 arquivos. Nenhuma página leva as curvas.
  - 40 cidades do Exterior, como Abuja e Bagdá, nunca tiveram voto no PT nem no partido de Bolsonaro, e ficam sem arquivo e sem botão.
- **"O que esperar da noite"**: com `antesDas17h.projecao` desligada, o bloco ganha as curvas reais das noites passadas do Brasil (`components/NoitesPassadas.tsx`, `client:visible`). São os mesmos botões, com "Ver a noite de", nenhum ligado, e o gráfico só aparece depois da escolha. Não há projeção nem chance de vitória, e o build com a projeção desligada confere.
- **Decisões tomadas aqui** (o dono pode mudar):
  - Um turno por vez, como nos botões do protótipo. O botão ligado desliga a curva.
  - As linhas de comparação ficam por baixo das da curva real, como no protótipo, para a curva de hoje ficar inteira à vista. O comentário do ticket 14 diz "por cima" no sentido de sobreposta.
  - A escala conta a curva passada inteira, de 3% a 100%, mesmo além de onde a noite de hoje já chegou. No começo da noite, uma curva passada larga achata a de hoje.
  - Os botões só aparecem com a curva real, que só existe depois da primeira seção do lugar. Antes disso, um lugar não tem comparação.
  - Com a projeção ligada, "O que esperar da noite" fica como estava, só com a curva projetada.
- **Verificação**: no navegador, com a noite local de 2022 (TSE falso e coletor), a curva ao vivo cai sobre a de 2022 2T, e só `/curvas/BR.json` é baixado, no clique. A comparação continua ligada depois da leitura seguinte. No build com a projeção desligada, "O que esperar da noite" mostra 2022 2T e 2018 1T. No celular, os botões quebram linha sem rolagem.
- **Revisão** (`/code-review`): foram corrigidos:
  - o nome da escolha na ilha (`EscolhaDaComparacao`), porque `Comparacao` já era a comparação de dois turnos;
  - o PT e o partido de Bolsonaro, que ficam num só lugar (`@apurador/pipeline/partidos`);
  - a regra de arredondamento, que passou à do ticket 34;
  - o par posicional de partidos, que virou `partidoDeBolsonaro`;
  - a ordem dos lugares no arquivo;
  - um teste que passava por construção;
  - helpers de teste repetidos.

  Ficaram de fora:
  - o andaime do gráfico repetido em `NoitesPassadas` e a conta da distância de 50% repetida na `CurvaReal`, para não mexer mais na `CurvaReal`, que o ticket 15 também muda;
  - os nomes `secoes` e `pt` no arquivo das curvas, que são curtos de propósito e estão documentados no tipo.
