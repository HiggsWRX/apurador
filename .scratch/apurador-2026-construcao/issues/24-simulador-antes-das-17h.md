# 24: Simulador "e se" antes das 17h

Status: resolved
Blocked by: 08, 09
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O simulador "e se" numa tela própria, aberta pelo link "Simular 'e se' →" na caixa da projeção. Ele é a ilha em Preact que roda o módulo `modelo` no navegador.

O visitante ajusta hipóteses sobre o voto que falta e o comparecimento. A simulação aparece numa moldura pontilhada, sempre ao lado da projeção do Apurador.

Antes das 17h, o simulador roda sobre um arquivo estático gerado no build, a partir da base de 2026 e do agregado. Por isso pode entrar na etapa "Antes da noite", se estiver pronto.

Decisões: [Simulador "e se"](../../apurador-2026/issues/13-simulador-e-se.md) (decisões 1 a 11 e 13) e [Segunda consulta jurídica](../../apurador-2026/issues/21-segunda-consulta-juridica.md).

## Critérios de aceite

- [x] **Hipóteses**:
  - **Voto**: quanto o voto que falta pende para um candidato além da projeção. No Brasil vai de −5 a +5 e em cada região de −10 a +10, em passos de 0,5. A região soma ao Brasil, e o Exterior segue o Brasil.
  - **Comparecimento**: só por região, de −10 a +10 pontos percentuais, em passos de 1.
- [x] **No modelo**: as hipóteses mexem só no voto que falta de cada município, por cima da estimativa inteira. O voto desloca o % de válidos que falta, limitado a 0–100%. O comparecimento multiplica os válidos que faltam. A incerteza é a da projeção. Não há segunda cópia do modelo.
- [x] **Tradução**: ao lado de cada controle, aparece a hipótese em relação ao placar entre finalistas do 1º turno ("isso dá Lula +4,2 sobre o 1º turno no Nordeste").
- [x] **A simulação mostra**:
  - o resultado ± margem de 95%, a chance de vitória e a curva projetada com a virada projetada, no Brasil;
  - uma tabela das cinco regiões;
  - sem mapa nem resultado por lugar.
- [x] **Terceiro nível visual**: moldura pontilhada, fundo hachurado leve e o selo "Simulação · com as suas hipóteses, não é a projeção do Apurador". A projeção do Apurador fica sempre ao lado, e na curva a simulada é pontilhada sobre a projetada do site, mais clara.
- [x] **Base**: o simulador herda a base escolhida na página e mostra o mesmo controle, com "As pesquisas pesam X% na projeção agora".
- [x] **Hipóteses prontas**: um par simétrico, só antes da apuração e só na base Apuração + pesquisas: "As pesquisas subestimam Flávio como no 1º turno" (Flávio +1,4) e "As pesquisas subestimam Lula na mesma medida" (Lula +1,4). Há sempre um "Zerar". _Por decisão do dono em 20/10, o voto é o viés que a metodologia cita, 2,1: ver o registro._
- [x] **"O que seria preciso"**:
  - uma frase para quem está atrás no resultado estimado, com um botão "Aplicar", que move o controle do Brasil;
  - fora da faixa, a frase diz "mais de 5 pontos", nunca "impossível".
- [x] **Link compartilhável**: guarda só a base e as hipóteses mexidas. Ao abrir, recalcula com os dados do momento e mostra "Simulação de outra pessoa · com os dados de agora". A prévia do link é a do site.
- [x] **Aberto de uma UF ou de um município**: a região daquele lugar já vem expandida.
- [x] **Desenho**: o do celular e o do computador seguem a decisão 13.
- [x] **Chave do simulador antes das 17h**: fica no arquivo de chaves.
- [x] **Testes no `modelo`**:
  - o par simétrico dá resultados espelhados;
  - hipóteses zeradas reproduzem a projeção;
  - "o que seria preciso" leva o resultado a 50%.
- [x] O simulador abre em até 5 s num Android barato no 4G.
- [x] A simulação nunca aparece na manchete, na narração nem na página de lugar.

## Comments

- 19/10/2026, do [ticket 08](08-base-apuracao-mais-pesquisas.md):
  - A base que o simulador herda é o `projetar` do `modelo`: sem o agregado, a "Só apuração"; com ele (`{ valor, incerteza }`), a "Apuração + pesquisas".
  - As hipóteses mexem no voto que falta de cada município, que a `Projecao` daquela base dá em `votoQueFalta` e `fatiaDoQueFalta`.
  - O peso das pesquisas é `pesoDasPesquisas` na mesma `Projecao`, e é 0 na "Só apuração".

- 19/10/2026, do [ticket 28](28-calibracao.md):
  - O simulador lê as constantes congeladas do `packages/modelo/constantes.json`. A margem de 95% delas é mais larga que a das provisórias (~3,0 p.p. em média de 5% a 50% das seções nas noites passadas).

- 20/10/2026, do [ticket 10](10-metodologia-secoes-iniciais.md): a seção 5 da página de metodologia (`packages/site/src/pages/metodologia.astro`, o parágrafo `data-bloco="simulador"`) apresenta o simulador em três frases e, por ora, linka a página do Brasil (`/`), onde o link "Simular 'e se' →" vai abrir, porque a tela do simulador ainda não existe. Quando ela existir, troque o `href` para ela e ajuste o teste `packages/site/test/build/metodologia.test.ts`, que confere `<a href="/"` nesse parágrafo.
- 20/10/2026, do [ticket 09](09-painel-antes-das-17h.md):
  - A projeção de antes das 17h sai no build, em `packages/site/src/lib/projecao-antes-das-17h.ts`: `PROJECAO_ANTES_DAS_17H` traz as bases (`so-apuracao` e `com-pesquisas`, cada uma com `brasil: ResultadoDoLugar`, `curva: CurvaDoLugar` e `pesoDasPesquisas`) e `coincidem`; `BASE_PADRAO` é a que a página abre. O módulo monta a base do modelo de `dados/bases/2026-2.json`, a apuração antes da primeira seção (seções e aptos do 1º turno, nada totalizado) e as constantes congeladas por `lerConstantes`: o arquivo estático do simulador pode partir do mesmo módulo.
  - O controle Base da projeção é `[data-base-botao]` em `components/ProjecaoAntesDas17h.astro`: ao clicar, alterna `data-ativa` em todo elemento `[data-base="so-apuracao"|"com-pesquisas"]` da página. O simulador herda a base lendo o `aria-pressed` dos botões.
  - O link "Simular 'e se' →" ainda não existe: entra na caixa da projeção (`ProjecaoAntesDas17h.astro`), antes de "Como calculamos →".
  - A chave do simulador antes das 17h entra em `dados/chaves.json`, em `ESPERADAS` (`lib/chaves.ts`) e em `test/chaves-desligadas/chaves.json`, como `antesDas17h.projecao`.
  - Peças para reaproveitar: `CurvaProjetada.tsx` (desenha uma `CurvaDoLugar` com faixa de 95%, losango e faixa da virada), `ChanceDeVitoria.tsx` (a barra dividida) e `ValoresDosFinalistas.astro` (com `margem`). A moldura pontilhada da simulação é o terceiro nível visual, depois da `.projecao` tracejada.
  - Peso: a página do Brasil tem ~16 KB de HTML e ~5 KB de CSS com gzip (`test/build/pagina-brasil.test.ts`, orçamento de 200 KB para os dois). O modelo e o arquivo do simulador devem carregar só ao abrir.

**20/10/2026, resolvido na branch `ticket/24-simulador-antes-das-17h` (worktree `apurador-wt/24`), à espera da revisão do dono:**

- **No `modelo`** (`packages/modelo/src/simulacao.ts`):
  - `simular(partida, hipoteses)`: parte da `Projecao` de uma base (`votoQueFalta` e `fatiaDoQueFalta`), desloca a fatia do voto que falta de cada município pelo voto do Brasil mais o da região (o Exterior só pelo do Brasil), limitada a 0–100%, multiplica os válidos que faltam da região por (comparecimento + c) ÷ comparecimento, e soma o Brasil, as UFs e as cinco regiões de novo. O que já foi totalizado não muda. O desvio de cada lugar é o da projeção, e a chance de vitória sai dele (`resultadoComDesvio`, separado do `resultado` do `projetar`, com `semVotos`, `somarVotos` e `fatiaFinal`, que o `projetar` também usa). A `PartidaDaSimulacao` junta a projeção de uma base com o modelo, a apuração, as constantes e o `comparecimentoEsperado` de cada região.
  - `oQueSeriaPreciso(partida, hipoteses)`: o valor do controle do Brasil que leva o Brasil a 50%, por busca binária de 31 passos entre ±100 pontos; `null` quando nem todo o voto que falta para um lado basta.
  - `HIPOTESES_ZERADAS`, `Hipoteses` (o voto em pontos para o 1º finalista da base), `Simulacao`, `ResultadoDaRegiao` (com a `fatia`). A `curvaProjetada` aceita a simulação no lugar da projeção. `antesDaPrimeiraSecao(base)` passou ao `modelo` (o site, a página do Brasil e os testes do modelo a usam).
- **No site** (`packages/site`):
  - `pages/simulador.astro`: a tela própria, em `/simulador/`, com a ilha `components/Simulador.tsx` (`client:load`). O arquivo `/dados/simulador.json` começa a vir junto com o HTML (`<link rel="preload">`, por um slot `head` novo no `Base.astro`).
  - `components/VistaDoSimulador.tsx`: a vista pura (`BarraDaSimulacao`, com a simulação e a projeção do Apurador, curva, "o que seria preciso", controle Base da projeção, hipóteses prontas, controle do Brasil, "Ajustar por região" em `<details>`, tabela das regiões, "Zerar" e "Copiar link").
  - `lib/simulador.ts`: `prepararSimulador(arquivo)` projeta as duas bases uma vez e guarda a partida de cada uma; `simularNaTela(dados, base, hipoteses)` refaz a simulação, a curva, as regiões e "o que seria preciso" a cada hipótese.
  - `lib/hipoteses.ts`: as faixas, os rótulos ("Lula +2"), a tradução em relação ao 1º turno, a frase de "o que seria preciso", as hipóteses prontas e o link.
  - `lib/arquivo-do-simulador.ts`: o formato do arquivo (a base do modelo em colunas, com os degraus em diferenças); `lib/simulador-antes-das-17h.ts`: a chave, o arquivo do build e o link da caixa da projeção; `pages/dados/[arquivo].json.ts`: o arquivo, só com o simulador no ar.
  - `components/CurvaProjetada.tsx` ganhou `doSite`: a curva da simulação, pontilhada, sobre a projetada do site, tracejada e mais clara. `lib/bases-da-projecao.ts` guarda `IdDaBase` e os nomes das bases, que a ilha também usa.
  - A caixa da projeção (`ProjecaoAntesDas17h.astro`) tem "Simular "e se" →" antes de "Como calculamos →", e o script do controle Base da projeção troca a base no link. A seção 5 da metodologia linka `/simulador/`.
  - A chave é `antesDas17h.simulador` (`dados/chaves.json`, ligada; `ESPERADAS`; `test/chaves-desligadas/chaves.json`).
- **Números no relógio dos testes** (19/10, 12h, agregado em Flávio 51,1):
  - Aberto, o simulador mostra ao lado a projeção da página do Brasil: "Apuração + pesquisas" com Flávio 51,1% ± 3,5 e chance de 73%; "Só apuração" com 51,0% ± 8,9 e 59%.
  - "O que seria preciso", sem hipóteses: "Para Lula passar à frente, o voto que falta precisaria pender mais 1,1 ponto para ele no país."
  - As hipóteses prontas: Flávio +2,1 leva a simulação a 53,2%, com chance de 96%; Lula +2,1, a 49,0%.
  - O 1º turno de 2026 das regiões, do arquivo oficial: Flávio entre os dois com 52,4% no Norte, 32,6% no Nordeste, 63,4% no Centro-Oeste, 56,4% no Sudeste e 65,8% no Sul; comparecimento de 80,6%, 81,6%, 78,3%, 77,3% e 79,5%.
- **Peso e tempo**:
  - A tela do simulador carrega ~170 KB com gzip: o arquivo (~139 KB, contra ~262 KB da base como o pipeline a grava), os scripts (~21 KB, com o `modelo` e o Preact), o CSS (~6 KB) e o HTML (~4 KB). O orçamento do teste é de 300 KB, pela conta do "Slow 4G" do Lighthouse para 5 s (`test/build/simulador.test.ts`).
  - No computador, abrir (ler o arquivo, preparar o modelo, projetar as duas bases e as curvas) leva ~70 ms, e cada ajuste ~18 ms, com "o que seria preciso".
  - Numa medição emulada (Chromium do Playwright, "Slow 4G" com 150 ms de ida e volta e CPU 4 vezes mais lenta, a 375 px, servido do próprio computador), o simulador ficou pronto em ~2,2 s, e cada ajuste redesenhou em 60–85 ms. **Não foi medido num aparelho**: fica para a revisão do dono no celular e para o ensaio ([ticket 32](32-ensaios-gerais.md)).
- **Escolhas deste ticket**, fora das decisões:
  - **Chave**: o simulador antes das 17h só vai ao ar com a chave dele e a da projeção (`simuladorNoAr`). A especificação diz, em "Chaves de publicação", que desligar a projeção desliga também o simulador, e a decisão 8 põe a projeção do Apurador sempre ao lado da simulação, com a chance de vitória, que é da projeção (decisão 2 da Consulta a advogado eleitoral). Desligado, `/simulador/` diz "O simulador abre às 17h, com a apuração.", o link some e o arquivo nem é gerado. Sem o agregado no ar, o arquivo vai sem ele, e o simulador fica só com a "Só apuração", sem controle nem hipóteses prontas, como a caixa da projeção.
  - **Incerteza**: o desvio de cada lugar é o da projeção, em fração dos válidos, então a margem da simulação é a mesma da projeção ao lado, mesmo com o comparecimento mexido.
  - **Comparecimento**: os pontos percentuais são medidos contra o comparecimento do 1º turno de cada região, um fator só para a região inteira.
  - **Tradução**: compara o resultado final simulado do lugar com o placar entre finalistas do 1º turno dele, nos números como a página os mostra.
  - **"Aplicar"** põe no controle do Brasil o valor exato que leva a 50%, e a tela diz "Na simulação, os dois terminam empatados." Um valor fora do passo de 0,5 (esse e os 2,1 das hipóteses prontas) fica no estado e no texto do controle, e o cursor vai ao passo mais perto. Fora da faixa, a frase diz "mais de 5 pontos", sem botão. Quando quem está atrás passaria à frente mesmo com o Brasil pendendo para o outro, a frase diz até quanto ("precisaria pender menos de 2,9 pontos para Flávio").
  - **Hipóteses prontas**: cada uma põe só o voto do Brasil e zera o resto; a escolhida fica marcada.
  - **Link**: `?base=com-pesquisas&brasil=lula2&nordeste=flavio1.5&comparecimento-sul=3`, com o nome curto de quem ganha; o valor de "Aplicar" vai com duas casas. Abrir com hipóteses mostra "Simulação de outra pessoa · com os dados de agora" até a primeira mudança. Sem a área de transferência, "Copiar link" mostra o endereço para copiar à mão. A entrada pela caixa da projeção leva `?base=` e, numa UF ou num município, `&de=<uf>`; a região dessa UF e as que o link traz mexidas abrem expandidas.
  - **Desenho**: no celular, a barra da simulação fica fixa no alto, compacta ("Chance 73% ▬▬ 27%", com os nomes só para o leitor de tela), e a ordem é a da decisão 13, com o controle Base da projeção depois de "o que seria preciso". No computador, os controles ficam à esquerda e o resultado num painel fixo à direita, que rola por dentro quando passa da altura da janela; a coluna dos controles tem um espaço embaixo para a última região se ajustar com o resultado à vista.
  - **Tabela das regiões**: as colunas da simulação na moldura pontilhada, com o hachurado, e as da projeção na tracejada (`<colgroup>`), com "Cálculo do Apurador com dados do TSE". Sem margem por região: o `modelo` não a calcula para a região.
  - **Reaproveitamento**: a `CurvaProjetada` e o CSS da barra da chance (`.chance-barra`). A `ChanceDeVitoria` e os `ValoresDosFinalistas` não cabem na barra compacta do celular (os nomes de urna inteiros, em duas linhas): a barra tem o seu próprio desenho, com o nome curto ("Flávio 51,1%"), enquanto a caixa da projeção escreve o nome de urna.
- **Decisões do dono, 20/10**, sobre as duas perguntas da resolução:
  - **Hipóteses prontas com 2,1, e não 1,4.** Os 1,4 da decisão 9 eram a metade dos 2,8 pontos na margem das 8 pesquisas finais do 1º turno, medidos sobre todos os válidos. O controle do simulador está em pontos entre os dois finalistas, e nessa medida a regra do agregado sobre as 12 pesquisas dá 2,1, o número que a metodologia cita (decisão do dono no [ticket 05](05-historico-das-pesquisas.md)). O simulador recebe o mesmo valor que a metodologia escreve (`VIES_DAS_HIPOTESES_PRONTAS`, de `VIES_DO_PRIMEIRO_TURNO`, com uma casa), e "como no 1º turno" vai para quem as pesquisas subestimaram. O teste do build confere que os dois números são iguais.
  - **As duas frases novas de "o que seria preciso" ficam**: "Na simulação, os dois terminam empatados." (depois de "Aplicar") e "Para Lula passar à frente, o voto que falta no país precisaria pender menos de 2,9 pontos para Flávio." (quando as regiões já pendem para quem está atrás). Falam da simulação do visitante, como a frase da decisão 10, e entram com ela no pedido da [Confirmação dos textos preditivos](../../apurador-2026/issues/22-confirmacao-dos-textos-preditivos.md) (decisão 5 da Segunda consulta jurídica), onde as três estão anotadas.
- **Testes**:
  - `modelo`: `test/simulacao.test.ts` (13): hipóteses zeradas reproduzem a projeção, a curva e as margens nas duas bases; na "Só apuração", cada região fica no placar entre finalistas do 1º turno dela, pelo arquivo oficial; o par simétrico dá resultados espelhados no Brasil, em cada UF e em cada região; a incerteza é a da projeção, com os ~95% do exemplo da decisão; a região soma ao Brasil e o Exterior segue o Brasil; o limite de 0–100%; o comparecimento multiplica os válidos que faltam sem mudar o resultado da região; "o que seria preciso" leva o Brasil a 50%, nas duas bases e com outras hipóteses, e passa da faixa sem dizer "impossível"; na noite de 2022, com metade das seções, o placar parcial não muda.
  - site, sem build: `test/hipoteses.test.ts` (14: os textos, as hipóteses prontas e o formato do link), `test/vista-do-simulador.test.tsx` (16, com os números da caixa da projeção no relógio dos testes como referência: 51,1% ± 3,5 e 73%; com Lula +2, 49,1% e 31%) e `test/simulador-antes-das-17h.test.ts` (2: as combinações de chaves que os builds não fazem e o link de uma UF).
  - site, build: `test/build/simulador.test.ts` (16): a tela, a prévia do link, o viés das hipóteses prontas igual ao da metodologia, o link na caixa da projeção e na metodologia, o arquivo (a base, o agregado, as constantes e o 1º turno das regiões), a mesma projeção da página do Brasil nas duas bases, nenhuma página de lugar com a simulação ou o código dela, a manchete e a narração como estavam, o peso e a chave desligada. `metodologia.test.ts` e `paginas-de-lugar.test.ts` ajustados.
  - `npm run typecheck`, `npm run lint` e `npm test` passam: 69 arquivos, 696 testes. O `test/relogio.test.ts` do `ensaio`, alheio ao ticket, estoura os 5 s com a suíte inteira e outras sessões rodando na máquina, e passa sozinho.
- **Verificação no navegador** (preview do build): a 375 px, sem rolagem lateral, a barra fixa sob o cabeçalho e a tabela das regiões cabendo; a 1280 px, os controles à esquerda e o resultado fixo à direita; os dois temas; a hipótese pronta, "Aplicar" (empate), o controle pelo teclado, o link de outra pessoa com a região da UF expandida, "Copiar link" com o endereço à mão quando o navegador nega a área de transferência, e a base herdada da caixa da projeção. Sem erro no console.
- **Revisão** (`/code-review`, Standards e Spec). Corrigidos:
  - os nomes: "placar" é do placar parcial e do placar entre finalistas (a barra virou `BarraDaSimulacao`), e "simulado" é do TSE (`curvaDaSimulacao`, `brasilNaSimulacao`, `naSimulacao`, `.linha-da-simulacao`); `ResultadoDaRegiao.fatia`; `clamp` → `limitar`; a unidade de `placarEntreFinalistasDoBrasil`;
  - os argumentos de `simular` e `oQueSeriaPreciso` numa `PartidaDaSimulacao`; as somas partilhadas com o `projetar`; `antesDaPrimeiraSecao` no `modelo`; `CONSTANTES` exportada só pela metodologia; o que ninguém lia (`pesoDasPesquisas` na tela, um `export type`); o rótulo do comparecimento e as pontas do controle tirados de `lib/hipoteses.ts`;
  - a tabela das regiões com a moldura de cada camada e "Cálculo do Apurador com dados do TSE";
  - nos testes: a vista contra os números da caixa da projeção, a tradução exata, a região contra o 1º turno oficial e a chance contra o exemplo de ~95% da decisão, sem as conferências por construção; saíram o teste do formato do arquivo (o build confere a base servida e o peso) e o das faixas (a vista confere os controles).

  Ficaram, por julgamento: `simuladorNoAr` ao lado do `chavesEfetivas` do coletor (são chaves diferentes); o `lugar` de `caminhoDoSimulador`, que só a caixa da projeção da noite vai usar (tickets 17 e 25), porque antes das 17h só a página do Brasil tem a caixa; a `ChanceDeVitoria` e os `ValoresDosFinalistas` fora da barra compacta; os testes de `lib/hipoteses.ts`, porque os textos e o link são o que o visitante lê e compartilha; o valor de "Aplicar" no link com duas casas (quem abre fica a menos de 0,01 ponto de 50%).
- As notas para os tickets 13, 17 e 25 estão nos comentários deles.
