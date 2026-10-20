# 25: Simulador "e se" ao vivo

Status: ready-for-agent
Blocked by: 17, 24
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

Durante a apuração, o simulador roda sobre o arquivo completo que o coletor publica a cada rodada. Ele relê esse arquivo no ritmo da página de lugar: as hipóteses ficam paradas, e só o resultado se move. As hipóteses valem só para o voto que falta.

O simulador fecha com a indicação do TSE e com a totalização final, e desliga pela sua chave.

Decisões: [Simulador "e se"](../../apurador-2026/issues/13-simulador-e-se.md) (decisões 5, 9, 12 e 14), [Arquitetura e tecnologia](../../apurador-2026/issues/08-arquitetura-e-tecnologia.md) (decisão 18) e [Volume de gravações na noite](../../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md) (decisão 2).

## Critérios de aceite

- [ ] **Arquivo do simulador**: o coletor o publica com os dados por município na precisão do modelo, gravado só quando muda. Ele só é baixado quando o simulador abre.
- [ ] **Releitura**: o simulador relê o arquivo a cada 30 s. As hipóteses ficam paradas, o resultado se move, e a curva se estende.
- [ ] **Indicador ao vivo**: aparece na barra fixa do simulador, com os mesmos estados da página.
- [ ] **Depois da primeira seção**: as hipóteses prontas somem, e as hipóteses mexem só no voto que falta. O que já foi totalizado não muda.
- [ ] **Indicação do TSE**: o simulador fecha com "O TSE indica X eleito. O voto que falta não muda mais o resultado".
- [ ] **Totalização final**: fecha com "A apuração terminou". Nos dois casos, há link de volta.
- [ ] **Chaves**: desligar a chave do simulador, ou a da projeção, tira o simulador do ar e o link da caixa da projeção.
- [ ] **Link compartilhado**: com os mesmos dados, reproduz a mesma simulação em outro celular.
- [ ] **Replay de 2022**: com as hipóteses paradas, a simulação se atualiza a cada rodada.

## Comments

- 19/10/2026, do [ticket 14](14-bloco-ao-vivo.md): o indicador ao vivo da barra do simulador é o mesmo componente do placar, `IndicadorAoVivo` (`packages/site/src/components/IndicadorAoVivo.tsx`). Ele recebe o `indicador` do quadro de `criarLeitorAoVivo` (`lib/leitor-ao-vivo.ts`).
- 20/10/2026, do [ticket 16](16-comandos-chaves-e-plano-zero.md): a chave do simulador é `simulador` (`NOMES_DAS_CHAVES`, em `packages/coletor/src/chaves.ts`), e ela só vale ligada com a `projecao` ligada: `chavesEfetivas` aplica isso no coletor, e o comando `desligar projecao` desliga as duas (religar a projeção não religa o simulador; é preciso `ligar simulador` depois). Na página, a chave está em `quadro.chaves.simulador` (`QuadroAoVivo`, `packages/site/src/lib/leitor-ao-vivo.ts`); como o simulador é outra ilha, veja a nota do [ticket 26](26-malha-e-mapa.md) sobre repassar o quadro sem um segundo leitor por visitante.
- 20/10/2026, do [ticket 24](24-simulador-antes-das-17h.md):
  - **No `modelo`** (`packages/modelo/src/simulacao.ts`): `simular(partida, hipoteses)` parte da `Projecao` de uma base (o `votoQueFalta` e o `fatiaDoQueFalta` dela) e dá a `Simulacao` (Brasil, UFs, as cinco regiões e os dois vetores), com o desvio da projeção. A `PartidaDaSimulacao` junta `modelo`, `apuracao`, `projecao`, `constantes` e `comparecimentoEsperado`. `oQueSeriaPreciso(partida, hipoteses)` dá o valor do controle do Brasil que leva o Brasil a 50%, ou `null` quando nem todo o voto que falta para um lado basta (o fim da noite). `Hipoteses` vai em pontos para o 1º finalista da base, com as regiões na ordem de `REGIOES`; `HIPOTESES_ZERADAS` é o zero. A `curvaProjetada` aceita a simulação no lugar da projeção. Já há testes na noite de 2022 com metade das seções: o placar parcial não muda, o Brasil anda a hipótese vezes a fatia do voto que falta, e o par simétrico espelha.
  - **Comparecimento**: `comparecimentoEsperado` é o do 1º turno de cada região (votantes ÷ aptos, de `dados/turnos/2026-1.json`), e +c pontos multiplicam os válidos que faltam da região por (comparecimento + c) ÷ comparecimento. Na noite, o modelo ajusta os válidos esperados pelo `validosSobreEsperados` do país; o simulador continua medindo os pontos contra o 1º turno. Se o dono quiser contra o comparecimento da noite, a conta muda só no fator.
  - **No site**: a ilha é `components/Simulador.tsx` (lê o endereço, baixa o arquivo, guarda as hipóteses e a base), a vista é `components/VistaDoSimulador.tsx` (pura, testada em `test/vista-do-simulador.test.tsx`), e as contas da tela estão em `lib/simulador.ts`: `prepararSimulador(arquivo)` projeta as duas bases uma vez, sobre `antesDaPrimeiraSecao(base)` (do `modelo`), e guarda a partida de cada uma; `simularNaTela(dados, base, hipoteses)` refaz a simulação, a curva, as regiões e "o que seria preciso". Para a noite, o `prepararSimulador` precisa receber a apuração de cada município da rodada no lugar da de antes da primeira seção; o resto não muda. A releitura a cada 30 s só troca `dados`: as hipóteses ficam no estado da ilha.
  - **O arquivo** (`lib/arquivo-do-simulador.ts`, `ArquivoDoSimulador`): a base do modelo em colunas, com os degraus em diferenças (~139 KB com gzip, contra ~262 KB da base como o pipeline a grava), o agregado inteiro, as constantes e o 1º turno de cada região. É estático: na noite, basta o coletor publicar, por rodada, a apuração de cada município (seções, aptos e os votos dos dois), na ordem da base, e a ilha juntar os dois.
  - **Já pronto para a noite**: as hipóteses prontas somem sozinhas quando a projeção tem seções (`tela.brasilNaProjecao.secoes > 0`); "Aplicar" põe no controle do Brasil o valor exato que leva a 50%, e a tela diz "Na simulação, os dois terminam empatados."; `caminhoDoSimulador(base, lugar)` (`lib/simulador-antes-das-17h.ts`) monta o link da caixa da projeção de uma UF ou de um município com `&de=<uf>`, e a região dele abre expandida.
  - **A tradução** compara o resultado final simulado do lugar (o apurado mais o voto que falta) com o placar entre finalistas do 1º turno. Antes das 17h, é todo o voto; na noite, inclui o já totalizado, que não muda. Se a decisão 2 pedir só o voto que falta, a conta é em `traducao` (`lib/hipoteses.ts`).
  - **Às 17h**: a tela de hoje mostra a simulação de antes das 17h, sem leitor ao vivo. Com a chave `antesDas17h.simulador` desligada, ela diz "O simulador abre às 17h, com a apuração."; depois das 17h, essa tela precisa passar ao arquivo da noite e às chaves do arquivo de rodada (`quadro.chaves.simulador`).
