# 13: Lançamento da etapa "Antes da noite"

Status: ready-for-human
Blocked by: 02, 03, 04, 09, 10, 12
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

Abrir o site em `apurador.org` com a etapa "Antes da noite", com meta na quinta, 22/10, às 12h. Entram:

- as páginas de lugar com o histórico;
- a lista das pesquisas, o agregado e o painel de antes das 17h;
- a página de metodologia;
- o rodapé com o responsável.

O simulador entra se estiver pronto.

Precisa do dono do projeto: comprar o domínio, criar o e-mail do projeto, gravar os secrets da Cloudflare no GitHub, revisar no celular e dar o de acordo. O Claude prepara as conferências e o registro do lançamento.

Se a etapa atrasar, ela desliza dia a dia. O limite é ir ao ar com o build aprovado no ensaio 2, na manhã de 24/10.

Decisões: [Plano de lançamento em fases](../../apurador-2026/issues/19-plano-de-lancamento-em-fases.md) (decisões 2, 3 e 6), [Contas e acessos](../../apurador-2026/issues/07-contas-e-acessos.md) e [Arquitetura e tecnologia](../../apurador-2026/issues/08-arquitetura-e-tecnologia.md) (decisão 14).

## Critérios de aceite

O endereço só abre com os nove itens verdadeiros, registrados com o de acordo do dono.

- [ ] **Build e testes**: as ~5.800 páginas de lugar se constroem, e o CI passa, com o replay automático.
- [ ] **Histórico**: os totais de cada turno, no Brasil e em cada UF, batem com os arquivos oficiais por conferência automática, e as atribuições do TSE e do IBGE estão na página.
- [ ] **Pesquisas**: cada pesquisa da lista tem os seis dados do art. 10, conferidos contra o registro do TSE, e o agregado na página é o que a regra calcula sobre o `pesquisas.csv`.
- [ ] **Painel de antes das 17h**: os números são os do `modelo` sobre o mesmo `pesquisas.csv`, com os avisos de "não é pesquisa própria" e "não é resultado oficial nem garantia do resultado". Cada bloco desliga pela sua chave, sem código novo.
- [ ] **Metodologia**: no ar com os critérios de seleção, os cálculos, as limitações, "sem IA generativa nem aprendizagem de máquina" e a atribuição da malha.
- [ ] **Rodapé**: com o nome completo do dono e o e-mail do projeto.
- [ ] **Celular**: placar e painel visíveis em até 3 s num Android barato no 4G.
- [ ] **Revisão do dono no celular**: o Brasil, uma UF, um município grande e um pequeno.
- [ ] **Depois de aberto**: um deploy que quebre um destes critérios volta à versão anterior na hora.
- [ ] O site abre em `apurador.org`, sem `noindex`, com o Cloudflare Web Analytics, sem cookies nem outro rastreador. O `*.workers.dev` fica só como endereço do plano B, nunca divulgado.
- [ ] O registro do lançamento traz a conferência dos nove itens e o de acordo do dono.

## Comments

- 20/10/2026, do [ticket 10](10-metodologia-secoes-iniciais.md), o que conferir no item **Metodologia**:
  - A página está em `/metodologia/`, alcançável pelo rodapé de toda página ("Como calculamos a projeção →") e, pelo [ticket 09](09-painel-antes-das-17h.md), pelas âncoras `/metodologia#chance` e `/metodologia#juntas`. As sete âncoras da etapa são `#pesquisas`, `#chance`, `#apuracao`, `#juntas`, `#virada`, `#limites` e `#fontes`.
  - O que o advogado exige está assim: a declaração "Sem IA generativa nem aprendizagem de máquina" no cartão "Em um minuto"; os critérios de seleção em "Quais pesquisas entram" (seção 1), com os 14 institutos; os cálculos em "As contas" de cada seção; as sete limitações na seção 8; e a atribuição "IBGE, Malha Municipal Digital 2024, CC BY 4.0, simplificada pelo Apurador" na seção 9, junto com "TSE, sem alteração (CC-BY)", "Cálculo do Apurador com dados do TSE" e o link para a lista das pesquisas (`/#pesquisas-registradas`). O teste `packages/site/test/build/metodologia.test.ts` confere tudo isso no HTML gerado, e também que nenhum texto da página usa "aprende", "IA" (fora a declaração) ou "previsão".
  - "Quem faz" (seção 9) usa `RESPONSAVEL` e `EMAIL_DO_PROJETO` de `packages/site/src/lib/projeto.ts`, os mesmos marcadores do rodapé: trocar os dois ali preenche a página e o rodapé. Hoje mostram "[nome do responsável]" e "[e-mail do projeto]".
  - O sino da seção 2 e a frase "Em DD/MM, com N institutos, o agregado dá…" da seção 1 são do agregado do instante do build, como o bloco do agregado da página do Brasil, e seguem a chave `antesDas17h.agregado`: desligada, eles somem e o resto da página fica. Depois das 23h de 24/10, mostram o agregado da noite, fixo.
  - Para baixar: `/dados/pesquisas.csv` e `/dados/pesquisas-historicas.csv`, os mesmos arquivos do repositório, servidos como `text/csv`. Conferir no celular que o toque baixa o arquivo. O código aparece como "a partir de 26/10", sem link: o link do GitHub entra na etapa "Depois".
  - O simulador é citado na seção 5 com link para a página do Brasil, onde "Simular 'e se' →" vai abrir. Se o [ticket 24](24-simulador-antes-das-17h.md) entrar antes do lançamento, o link deve apontar para a tela do simulador.
- 20/10/2026, do [ticket 09](09-painel-antes-das-17h.md):
  - O painel de antes das 17h está na página do Brasil, depois do bloco ao vivo: "O que esperar da noite" (`packages/site/src/components/OQueEsperarDaNoite.astro`) e a projeção com a chance de vitória e o controle Base da projeção (`ProjecaoAntesDas17h.astro`). A chave é `antesDas17h.projecao` em `dados/chaves.json`, ligada. Desligada, a projeção some e "O que esperar da noite" fica só com o texto da ordem de chegada do 1º turno de 2026.
  - Com `antesDas17h.agregado` desligada e `projecao` ligada, fica só a base "Só apuração", sem o controle: nenhuma decisão cobre esse caso, e o build dos testes não o exercita. Se for desligar só o agregado, decidir antes se a projeção fica.
  - O critério "os números são os do `modelo` sobre o mesmo `pesquisas.csv`" é conferido por `packages/site/test/build/painel-antes-das-17h.test.ts`, no relógio fixo dos testes (19/10 12h). No ar, os números são os do instante do build: a incerteza do agregado cai de 1,79 (19/10) a 1,5 (25/10), e com ela a margem e a chance.
  - "Como calculamos →", a chance de vitória e o peso das pesquisas apontam para `/metodologia/`, `/metodologia/#chance` e `/metodologia/#juntas` ([ticket 10](10-metodologia-secoes-iniciais.md)): conferir que a página existe com essas âncoras antes de abrir.
  - "Placar e painel visíveis em até 3 s num Android barato no 4G": só a conta (HTML ~16 KB + CSS ~5 KB com gzip, scripts como módulos, fontes com `swap`), em `test/build/pagina-brasil.test.ts`. A medição num aparelho fica para a revisão do dono no celular e para o ensaio.
- 20/10/2026, da junção dos tickets [09](09-painel-antes-das-17h.md), [10](10-metodologia-secoes-iniciais.md) e [16](16-comandos-chaves-e-plano-zero.md):
  - As âncoras que o painel usa existem na página de metodologia: conferido no build da junção.
  - O sino da seção 2 da metodologia mostra a chance de vitória, que é da projeção (decisão 2 da [Consulta a advogado eleitoral](../../apurador-2026/issues/16-consulta-advogado-eleitoral.md)). Por isso ele segue também `antesDas17h.projecao`, como o bloco do agregado da página do Brasil, que deixa a chance de fora. Com o agregado ligado e a projeção desligada, a metodologia fica com o agregado do dia e sem o sino, e a página do Brasil fica com o agregado e sem a projeção. Nenhum build dos testes faz esse caso: ele foi conferido num build avulso.
- 20/10/2026, de [Contas e acessos](../../apurador-2026/issues/07-contas-e-acessos.md), o que já existe na conta:
  - O e-mail do rodapé é `contato@apurador.org` (Email Routing, encaminhado para a caixa do dono). Falta o nome completo do dono para `RESPONSAVEL`.
  - O Web Analytics de `apurador.org` está no modo snippet, sem injeção automática. O snippet a pôr no `<head>` é `<script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "cc7b32506206448bb43d8ec6514d5f18"}'></script>`.
  - O `apurador.org` já é domínio próprio do Worker `apurador`, posto pelo painel e não pelo `wrangler.jsonc`: ele já serve o site, com `noindex`. Ao pôr o domínio no `wrangler.jsonc`, confira que o `wrangler deploy` não o tira nem o duplica. O endereço do Worker é `apurador.hicampos93.workers.dev`.
- 20/10/2026, do dono: o nome completo para `RESPONSAVEL` (rodapé e "Quem faz" da metodologia) é **Hiago de Oliveira**.
- 20/10/2026, do dono: o `apurador.org` fica ligado ao Worker até o lançamento, com `noindex`, e mostra o que estiver na `main`. "Abrir" no lançamento passa a ser tirar o `noindex` e divulgar o endereço, depois dos nove itens conferidos e do de acordo.
- 20/10/2026, do [ticket 24](24-simulador-antes-das-17h.md), para decidir se o simulador entra no lançamento:
  - **Está pronto na branch `ticket/24-simulador-antes-das-17h`**, à espera da revisão do dono: a tela `/simulador/`, aberta por "Simular "e se" →" na caixa da projeção da página do Brasil e pela seção 5 da metodologia, que já linka `/simulador/` (o item do comentário do ticket 10 acima).
  - **Chave**: `antesDas17h.simulador` em `dados/chaves.json`, ligada. Para lançar sem o simulador, basta desligá-la, sem código novo: o link some, `/simulador/` diz "O simulador abre às 17h, com a apuração." e o arquivo `/dados/simulador.json` nem é gerado. Ele só vai ao ar com `antesDas17h.projecao` ligada também.
  - **O que conferir no celular**: a barra da simulação fixa no alto, ao lado da projeção do Apurador, e os números dela iguais aos da caixa da projeção, sem hipóteses; uma hipótese pronta; "Aplicar"; um controle de região; "Copiar link" e o link aberto em outro aparelho, com "Simulação de outra pessoa · com os dados de agora".
  - **Tempo**: ~170 KB com gzip na tela do simulador, contra um orçamento de 300 KB pela conta do "Slow 4G" para 5 s, e ~2,2 s numa medição emulada (Slow 4G e CPU 4 vezes mais lenta). Não foi medido num aparelho.
  - **Perguntas antes de lançar**, no registro do ticket 24: as hipóteses prontas usam Flávio +1,4 e Lula +1,4 ("como no 1º turno"), como a decisão 9 do simulador, mas a metodologia diz que as pesquisas do 1º turno subestimaram Flávio em 2,1 pontos; e "o que seria preciso" tem duas frases que nenhuma decisão escreve, que entram, com a da decisão 10, no pedido da Confirmação dos textos preditivos.
  - **Números do instante do build**: como a projeção, o simulador usa o agregado do instante do build; os números mudam a cada deploy até o congelamento das 23h de 24/10.
