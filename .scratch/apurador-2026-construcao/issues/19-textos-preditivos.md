# 19: Textos preditivos atrás da chave

Status: resolved
Blocked by: 16, 17
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

Os eventos preditivos da narração e as frases de projeção da manchete, prontos para ir ao ar se a [Confirmação dos textos preditivos](../../apurador-2026/issues/22-confirmacao-dos-textos-preditivos.md) chegar, até na própria noite.

O coletor calcula os preditivos sempre, para manter as travas, mas só os põe nos JSONs públicos com a chave de textos preditivos ligada. Esconder no navegador não basta. Um script de conferência, o mesmo do ensaio geral, prova isso no replay.

Decisões: [Narração da noite](../../apurador-2026/issues/14-narracao-da-noite.md) (decisões 5, 6, 8 e 9), [Sinal de virada](../../apurador-2026/issues/23-sinal-de-virada.md) (decisão 4), [Segunda consulta jurídica](../../apurador-2026/issues/21-segunda-consulta-juridica.md) (decisão 5) e [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisão 22).

## Critérios de aceite

- [x] **Eventos preditivos**, por lugar:
  - a mudança do sinal de virada entre "sem sinal", "possível" e "projetada", publicada só depois de durar 3 rodadas;
  - a chance de vitória passando de 90% e de 99%, que só disparam de novo depois de a chance cair abaixo de 80% e de 95%;
  - a linha da projeção em cada marco.
- [x] Os eventos preditivos começam com "Projeção do Apurador:" e seguem os modelos da decisão 8 do ticket da narração.
- [x] O coletor gera os preditivos das duas bases, e a página mostra os da base escolhida. Os números na curva nunca marcam um evento preditivo.
- [x] Com a chave ligada, a manchete ganha uma frase de projeção por estado do sinal de virada ("A projeção do Apurador indica virada de Lula por volta de 88% das seções.", e as outras da decisão 9).
- [x] **Chave desligada**: nenhum evento preditivo nem frase de projeção da manchete em nenhum JSON público de nenhuma rodada. Um script confere isso no replay.
- [x] **Ligada no meio da noite**: os preditivos entram só dali em diante, sem publicação retroativa.
- [x] **Desligada de novo**: somem dos JSONs todos os preditivos, inclusive os passados, e a frase de projeção da manchete.
- [x] Com a chave desligada, o marco continua factual, sem a linha da projeção.
- [x] A simulação nunca entra na narração nem na manchete.

## Comments

- 20/10/2026, do [ticket 16](16-comandos-chaves-e-plano-zero.md):
  - **A chave** é `textosPreditivos` (`NOMES_DAS_CHAVES`, em `packages/coletor/src/chaves.ts`). O dono a liga com `npm run noite -- ligar textos-preditivos`, digitando `textos-preditivos` para confirmar; `desligar textos-preditivos` desfaz. Ela é a única desligada no controle inicial (`CONTROLE_INICIAL`) e em `dados/chaves.json` (`noite.textosPreditivos: false`); o teste do build (`packages/site/test/build/bloco-ao-vivo.test.ts`) fixa esse `false` até a confirmação.
  - **No coletor**, leia `controle.chaves.textosPreditivos` em `publicar()` (`packages/coletor/src/coletor.ts`), onde `controle` é o da rodada, lido do arquivo de controle no começo dela. O coletor grava cada arquivo só quando os bytes mudam (`gravarSeMudou`, com um hash por caminho): para "desligada de novo, somem todos", basta montar os JSONs sem os preditivos, e os que mudarem são regravados. "Ligada no meio da noite vale dali em diante" é o coletor só pôr nos JSONs os preditivos gerados nas rodadas em que a chave estava ligada.
  - **Na página**, a frase de projeção da manchete lê `quadro.chaves.textosPreditivos` (`QuadroAoVivo`, `packages/site/src/lib/leitor-ao-vivo.ts`); a manchete é `manchete()` em `lib/textos-ao-vivo.ts`. Mas esconder no navegador não basta: a regra é a do coletor.
  - **No replay**, `OpcoesDoReplay.controle` (`packages/ensaio/test/replay.test.ts`) liga e desliga a chave em rodadas escolhidas, pelo relógio do coletor, e `r.gravacoes` tem todo JSON publicado com a hora: o script de conferência ("nenhum preditivo em nenhum JSON público") varre essa lista. O último `describe` do arquivo mostra o jeito.
- 20/10/2026, do [ticket 15](15-narracao-factual.md):
  - **Os eventos** são `EventoDaNarracao` (`packages/coletor/src/narracao.ts`), gerados por `criarNarracao` a cada rodada (`narrar`) e publicados prontos: `narracao` no JSON de cada lugar e `eventosDoBrasil` no `rodada.json`. Um preditivo é mais um `TipoDeEvento`, com prioridade 2 em `PRIORIDADE` (entre a indicação do TSE e o marco, decisão 10). Ele nunca leva `numero` nem `ponto`: `MarcadoresDaNarracao` (`packages/site/src/components/`) só desenha na curva os eventos com número. Para a página mostrar os da base escolhida, o evento precisa saber a base (um campo novo).
  - **A linha da projeção nos marcos**: o texto do marco é montado uma vez, quando ele entra (`eventoDoNivel`). Para "desligada de novo, somem todos", guarde a linha à parte e monte o texto na publicação (`doLugar`), conforme a chave da rodada; assim os marcos passados perdem a linha também.
  - **Na página**, a coluna é `components/ColunaDaNarracao.tsx`, alimentada por `lib/narracao.ts` (`narracaoDaPagina`, que intercala os eventos do Brasil pela hora com `antesNaNarracao`, a mesma ordem do coletor). O "Projeção do Apurador:" já vem no texto do coletor; a página só escolhe a base.
- 22/10/2026, do [ticket 17](17-projecao-ao-vivo.md):
  - **O sinal e a chance**: a cada rodada, o sinal de virada e a chance de cada lugar e base estão na `ProjecaoDaRodada` (`packages/coletor/src/projecao.ts`), já na ordem do arquivo de rodada (`ProjecaoNaBase.sinalDeVirada`, `chance`, `chanceDeVirada`). No `coletor.ts`, ela está pronta entre `projetar(d)` e `narrar(d)`.
  - **A entrada da narração**: "as pesquisas deixaram de pesar" entrou como `narrar(novos, { coincidemNoBrasil })`, e os preditivos podem chegar pelo mesmo segundo argumento. O tipo de evento novo precisa de uma prioridade em `PRIORIDADE` (`narracao.ts`): a dos preditivos é 2.
  - **O rótulo do sinal**: ele já aparece na curva (`rotuloDoSinal`, em `packages/site/src/lib/projecao-ao-vivo.ts`). A frase da decisão 4 do Sinal de virada vai para a manchete e a narração, não para ele.

**22/10/2026, resolvido:**

- **Na narração** (`packages/coletor/src/narracao.ts`):
  - **Os eventos preditivos** são dois `TipoDeEvento` novos, `sinal-de-virada` e `chance`, com prioridade 2 em `PRIORIDADE`. Cada um leva a base de que fala (`base`: `soApuracao` ou `comPesquisas`) e nunca `numero` nem `ponto`: a curva não os marca.
    - Ficam fora de `eventos` (`LugarNarrado.preditivos`) e existem em todo lugar: no Brasil, nas UFs, no Exterior e nos municípios. Não entram na narração do Brasil nem no `rodada.json`.
    - `TIPOS_PREDITIVOS` e `ehPreditivo` dizem quais são, para a página e a conferência.
  - **Os textos** seguem a decisão 8:
    - "Projeção do Apurador: virada possível. Flávio à frente no placar parcial; chance de virada de Lula 25%.", com o mesmo modelo para "virada projetada" e "sem sinal de virada";
    - "Projeção do Apurador: chance de vitória de Lula passa de 90%.";
    - a chance vai como a página a mostra, com "<1%" e ">99%" nas pontas.
  - **As travas** (`Travas`, por lugar e base) andam a cada rodada com projeção, com a chave ligada ou não, desde antes do começo do lugar:
    - **Sinal**: um sinal novo entra quando dura 3 rodadas seguidas. O primeiro sinal do lugar só arma a trava, porque não é mudança.
    - **Chance**: o limiar passa pelo número inteiro publicado (91% e ">99%" na página). Cada limiar só volta a disparar depois de a chance de quem o passou cair abaixo de 80% ou de 95%. Com os dois limiares passados na mesma rodada, sai só o de 99%, como nos marcos, e o primeiro valor só arma.
    - **Quando entram**: os eventos entram do começo do lugar até ele terminar. Com a indicação do TSE, param o sinal em todo lugar (Sinal de virada, decisão 3) e a chance no Brasil; a chance das UFs e dos municípios segue. Nada entra depois da totalização final.
  - **A hora**: na rodada de um arquivo novo do lugar, a desse arquivo, a mesma dos factuais da rodada. Assim a prioridade ordena (decisão 10): a virada fica no topo e sob a manchete. Numa rodada sem arquivo do lugar, vale a hora do arquivo mais novo da noite (`maisNovo`), porque o que mudou foi a projeção.
  - **A linha da projeção** (decisão 5): cada marco que entra com a chave ligada guarda a linha de cada base no ar, por exemplo "Projeção do Apurador: Flávio 49,1% ± 0,6, Lula 50,9% ± 0,6.". O começo e o fim não levam linha. O `doLugar` a publica em `linhaDaProjecao`, por base. O marco de uma UF dentro da narração do Brasil vai sem ela.
  - **A chave**: a interface é `narrar(novos, { numeros, textosPreditivos, basesNoAr })`.
    - Desligada, a narração esquece todos os preditivos e as linhas, inclusive os passados, e marca para regravar os lugares que os tinham.
    - Ligada, guarda só o que surge dali em diante, nas bases no ar.
    - Uma base fora do ar (a projeção ou a base com pesquisas desligada) só esconde os preditivos dela, que voltam com ela. Os que surgiriam nela enquanto isso não entram.
- **No coletor** (`coletor.ts`):
  - **O que muda**: `narrar()` passa à narração três coisas:
    - os números da rodada, por `ProjecaoDaRodada.numeros(id, base)`, novo em `projecao.ts`, que dá os de qualquer lugar, municípios inclusive, sem a curva;
    - a chave;
    - as bases no ar, por `basesNoAr(d)`, que usa a mesma `projecaoPodeIrAoAr(d)` da projeção.
  - **O que não muda**: o `publicar()`. A narração que ele já grava traz os preditivos, e os lugares que mudam viram `sujos`.
  - **A chave fica desligada** no `CONTROLE_INICIAL` e em `dados/chaves.json`, e o teste do build continua fixando o `false`.
- **Na página**:
  - **A narração** (`naBaseEscolhida`, em `lib/narracao.ts`): a coluna e a linha sob a manchete mostram os preditivos da base escolhida e juntam ao marco a linha dela.
    - **Onde**: a coluna é `ColunaDaNarracao`, que recebe a base de `useBaseDaPagina()` na ilha `NarracaoDaNoite`; a linha sob a manchete é `UltimoEvento`.
    - **Sem as chaves**: sem a dos textos preditivos ou a da projeção, a página não mostra preditivo nenhum, nem os de um JSON velho da CDN.
    - **Sem a base com pesquisas**: vale a "Só apuração", como na caixa da projeção.
    - **A tradução**: `BASE_NOS_ARQUIVOS` (`lib/bases-da-projecao.ts`) passa a base da página para o nome dos arquivos.
  - **A manchete** (`manchete(quadro, lugar, projecao)`, em `lib/textos-ao-vivo.ts`): com a chave ligada e a projeção na página, o placar ganha a frase do sinal de virada da base escolhida, com os números do rótulo da curva.
    - **As frases**: "A projeção do Apurador indica virada de Lula por volta de 88% das seções.", "… vê virada possível de Lula a partir de ~69% das seções." ou "… não indica virada: Flávio deve seguir à frente.".
    - **Só o placar**: sem sinal, sem a chave, com a indicação do TSE ou num lugar que terminou.
  - **A simulação** nunca entra: a narração e a manchete leem só a projeção que o coletor publica.
- **A conferência** (`conferirPreditivos`, em `packages/ensaio/src/conferencia-dos-preditivos.ts`): como chamá-la está no comentário do [ticket 30](30-ambiente-de-ensaio-e-conferencias.md). Ela acusa três coisas:
  - um preditivo no ar no fim de uma rodada com a chave desligada;
  - com a chave ligada, um preditivo de antes da ligação;
  - um marco já publicado que ganhou a linha da projeção.

  Um preditivo é de antes da ligação quando a hora dele é anterior à mais nova publicada até ali e não posterior à última do próprio lugar.

- **Medido no replay de 2022**:
  - **A noite inteira com a chave desligada**: a conferência não acusa nada nas ~124 mil gravações.
  - **Com a chave ligada só das 17:10 às 17:30**, e a projeção desligada das 17:18 às 17:22: a conferência não acusa nada. Os preditivos saem dos JSONs em até 2 rodadas sem a projeção e voltam com ela. Desligada a chave, todo lugar com preditivos é regravado sem eles em até 2 rodadas.
  - **A noite inteira com a chave ligada desde o começo** (16:50 até 30 min depois da final, 1.435 rodadas, `tmp/medir-preditivos.ts`, fora do Git):
    - **Gravações**: 127.120, contra 124.053 com ela desligada, e 629 na maior rodada, a mesma. A trava das 3 rodadas e a volta da chance seguram o volume.
    - **No fim da noite**: 9.540 preditivos (sinal de virada 2.338 na "Só apuração" e 2.243 na "Apuração + pesquisas"; chance 2.629 e 2.330), em 19 dos 28 lugares entre as UFs e o Exterior e em 1.962 municípios, e 5.537 marcos com a linha.
    - **A conferência** não acusa nada.
  - **O Brasil com a chave ligada**, na "Só apuração":
    - 17:08, "virada projetada" (Lula à frente; chance de virada de Bolsonaro 76%);
    - 17:13, a chance de Lula passa de 90%;
    - 18:44, "virada possível" (Bolsonaro à frente; chance de virada de Lula 19%);
    - 18:53, de novo 90%;
    - 19:00, "sem sinal de virada";
    - 19:02, 99%.

    Na "Apuração + pesquisas", os mesmos eventos, com a chance de 90% às 17:12 e às 18:52. Os 7 marcos levam a linha: no de 50%, "Bolsonaro 49,5% ± 2,1, Lula 50,5% ± 2,1".
- **Diferente do ticket**:
  - **A frase de projeção da manchete nunca vai num JSON**: a página a escreve só com `quadro.chaves.textosPreditivos` ligada, como o comentário do ticket 16 pedia.
    - **Os números** são os do sinal de virada, que a curva já publica no rótulo curto (Segunda consulta jurídica, decisão 5).
    - **Por que não no coletor**: gravada por ele, a frase mudaria o JSON de cada município a cada rodada (o "~88%" anda), contra as contas do ticket 24.
    - **O critério** "nenhuma frase … em nenhum JSON" vale por construção, e a conferência ainda acusa qualquer "projeção do Apurador" num JSON.
  - **Religada, a chave traz só os preditivos novos**: o comentário do ticket 16 falava em pôr nos JSONs "os gerados nas rodadas em que a chave estava ligada", o que, numa segunda ligação, traria de volta os da primeira. A decisão 6 diz "somem todos, inclusive os passados" e "a partir desse momento", e a narração os esquece ao desligar.
  - **Os outros dois pontos sem regra na decisão 5**: com dois limiares passados na mesma rodada sai só o mais alto, e o primeiro valor de um lugar só arma a trava. Vieram da regra dos marcos e de "passando de".
- **Revisão** (`/code-review`, Standards e Spec).
  - **Corrigidos**:
    - **A hora dos preditivos**: era sempre a do arquivo mais novo da noite, e um preditivo passava à frente da virada da mesma rodada e tomava a linha sob a manchete.
    - **As travas**: começavam no começo do lugar, e a chance que passava de 90% com a primeira seção não entrava.
    - **A indicação do TSE**: parava também a chance das UFs e dos municípios.
    - **A projeção e a base com pesquisas**: desligar uma delas esquecia os preditivos para sempre, e não só a chave dos textos preditivos.
    - **Regras escritas duas vezes**: "é preditivo" (`ehPreditivo`), a base da página nos arquivos (`BASE_NOS_ARQUIVOS`) e "a projeção pode ir ao ar" (`projecaoPodeIrAoAr`).
    - **Tipos e nomes**: `NumerosDaProjecao` foi para `arquivos.ts`, ao lado de `ProjecaoNaBase`, e quatro nomes que não diziam o que guardam mudaram.
  - **Ficaram, por julgamento**:
    - **A formatação**: a chance e o % do 2º candidato são formatados no coletor e na página por funções próprias. A conta é a mesma, mas a página parte da fração, e o coletor, do inteiro.
    - **A interface do ticket 18**: `dosMunicipios(uf, comPesquisas)` segue com o booleano, ao lado do novo `numeros(id, base)`.
    - **"Sem sinal de virada"** segue o modelo da decisão 8, e não o exemplo da decisão 4 do Sinal de virada ("Sem sinal de virada: Flávio deve seguir à frente até o fim"), porque o critério cita a decisão 8.
- **Para o dono**:
  - **A chave ligada pela segunda vez**: se o dono preferir que os preditivos da primeira vez voltem, a mudança tem dois passos: em `porNoAr` (`narracao.ts`), guardar em vez de esquecer, e trocar a regra da conferência.
  - **A confirmação dos textos preditivos** ainda não chegou: tudo está pronto com a chave desligada, e o que ligá-la na noite faz está no comentário do [ticket 31](31-roteiro-da-noite.md).
