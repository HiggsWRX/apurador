# 09: Painel de antes das 17h

Status: resolved
Blocked by: 04, 08
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

A página do Brasil antes das 17h, como build estático, sem o coletor. A ordem é esta:

1. a manchete;
2. o placar com "A divulgação começa às 17h";
3. o agregado com faixa e tendência;
4. "O que esperar da noite", com a curva projetada de 0% a 100% e a virada projetada;
5. a projeção e a chance de vitória, com o controle **Base da projeção**;
6. a lista das pesquisas, recolhida.

Os outros lugares mostram a indicação das pesquisas. Os números são os do módulo `modelo` rodado no build sobre o mesmo `pesquisas.csv`, e cada bloco desliga pela sua chave de publicação.

Decisões: [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisões 3, 4 e 11 e comentários), [Combinação de pesquisas e apuração](../../apurador-2026/issues/11-combinacao-pesquisas-e-apuracao.md) (decisões 5 e 6), [Segunda consulta jurídica](../../apurador-2026/issues/21-segunda-consulta-juridica.md) e [Consulta a advogado eleitoral](../../apurador-2026/issues/16-consulta-advogado-eleitoral.md) (decisão 2).

## Critérios de aceite

- [x] A manchete diz "A apuração do 2º turno começa às 17h", sem números.
- [x] A projeção vem numa moldura tracejada, com fundo próprio e o aviso "Estimativa do Apurador. Não é resultado oficial nem garantia do resultado."
  - O resultado estimado de cada candidato aparece com uma casa e ± a margem de 95%.
  - A chance de vitória aparece numa barra dividida, com inteiros, "<1%" e ">99%".
- [x] O controle **Base da projeção** oferece "Só apuração" e "Apuração + pesquisas" (padrão), com "As pesquisas pesam 100% na projeção agora".
- [x] "O que esperar da noite" desenha a curva projetada de 0% a 100% nas duas bases, com faixa, losango e faixa da virada projetada. Não tem frase preditiva nem rótulo do sinal de virada, porque ninguém está atrás antes da primeira seção.
- [x] A curva e a projeção levam "Cálculo do Apurador com dados do TSE".
- [x] Um teste confere que os números da página são os do `modelo` sobre o mesmo `pesquisas.csv`.
- [x] As páginas de UF, do Exterior e de município mostram a indicação das pesquisas, com o 1º turno e o histórico.
- [x] O link "Como calculamos →" leva à página de metodologia, e a chance de vitória e o peso das pesquisas levam às âncoras `#chance` e `#juntas`.
- [x] A chave da projeção e da curva antes das 17h fica no arquivo de chaves. Desligada, "O que esperar da noite" fica sem números de projeção, só com o texto da ordem de chegada típica, e nenhuma base mostra projeção antes das 17h.
- [x] Placar e painel ficam visíveis em até 3 s num Android barato no 4G.

## Comments

- 19/10/2026, do [ticket 08](08-base-apuracao-mais-pesquisas.md):
  - Os números do painel saem de `projetarNasDuasBases(modelo, apuracao, constantes, agregado)`. A apuração é a de antes da primeira seção: nada totalizado, com as seções e os aptos do 1º turno em `secoesTotais` e `aptosTotais`, como o `antesDaPrimeiraSecao` de `packages/modelo/test/dados.ts`. O agregado é o do dia.
  - A incerteza do agregado é a nacional das pesquisas, e ela cresce com os dias que faltam. Por isso, passe o agregado inteiro do dia, e não só o valor.
  - "O que esperar da noite" é o `curvaProjetada` sobre a `Projecao` de cada base. Ela começa no primeiro passo, com ~2% das seções, porque antes da primeira seção não há placar parcial.
  - Na base com pesquisas, o Brasil fica no valor, na incerteza e na chance de vitória do agregado, porque as partes locais se anulam no Brasil. O bloco do agregado e o da projeção mostram os mesmos números.
  - "As pesquisas pesam X%" é `comPesquisas.pesoDasPesquisas`, 100% antes da apuração.
  - A base de 2026 e o agregado têm Flávio como 1º finalista.
- 19/10/2026, do [ticket 14](14-bloco-ao-vivo.md): toda página de lugar abre o conteúdo principal com a ilha do bloco ao vivo (`components/BlocoAoVivo.tsx`, posta em `layouts/PaginaDeLugar.astro`). Antes das 17h, ela já desenha a manchete "A apuração do 2º turno começa às 17h" e o placar oficial com "A divulgação começa às 17h".
  - O painel entra depois dela, pelo slot da página: não repita a manchete nem o placar.
  - O build sem `PUBLIC_AO_VIVO` (o da etapa "Antes da noite") não lê nada e fica nesse estado.

**20/10/2026, resolvido na branch `ticket/09-painel-antes-das-17h` (worktree `apurador-wt/09`), à espera da revisão do dono:**

- **Onde está** (`packages/site`):
  - `src/lib/projecao-antes-das-17h.ts`: no build, `projetarNasDuasBases` e `curvaProjetada` sobre a base do modelo de 25/10 (`dados/bases/2026-2.json`), a apuração antes da primeira seção (as seções e os aptos do 1º turno, nada totalizado) e o agregado do dia inteiro, com as constantes congeladas (`lerConstantes` sobre `packages/modelo/constantes.json`). Dá `PROJECAO_ANTES_DAS_17H` (as bases `so-apuracao` e `com-pesquisas`, cada uma com `brasil`, `curva` e `pesoDasPesquisas`, e `coincidem`), `BASE_PADRAO` e `ORDEM_DE_CHEGADA` (quanto de cada região já tinha chegado com metade das seções do país, pelo perfil de chegada do 1º turno).
  - `src/components/OQueEsperarDaNoite.astro`: o texto da ordem de chegada e, com a chave, a curva projetada de cada base, por `CurvaProjetada.tsx` (Preact, sem hidratação): as duas linhas tracejadas, a faixa de 95%, o losango e a faixa da virada, os rótulos do fim. Sem rótulo do sinal de virada e sem frase, nem na descrição para o leitor de tela.
  - `src/components/ProjecaoAntesDas17h.astro`: a moldura tracejada com fundo próprio (`.projecao`), o aviso, os valores ± margem (`ValoresDosFinalistas.astro`, agora com `margem`), a chance (`ChanceDeVitoria.tsx`, a barra dividida), "A projeção, comparada" com o 1º turno e com a indicação das pesquisas, o controle Base da projeção com "As pesquisas pesam 100% na projeção agora" (ou "As duas bases já coincidem aqui") ao lado, e "Como calculamos →". As duas bases vão no HTML; o controle, um script pequeno, troca `data-ativa` nos elementos `[data-base]` dos dois blocos. Sem JavaScript, as duas ficam à vista, cada uma com o seu título.
  - `src/components/EixosDaCurva.tsx`: a escala e os eixos, tirados da `CurvaReal` e partilhados com a curva projetada.
  - `src/lib/formato.ts` ganhou `formatarChance` ("<1%", ">99%"); `src/lib/pesquisas.ts`, `quemGanhouEntre` (a mudança entre números como a página os mostra), que o agregado também usa.
  - A chave é `antesDas17h.projecao` em `dados/chaves.json` (ligada), em `ESPERADAS` (`lib/chaves.ts`) e em `test/chaves-desligadas/chaves.json`.
  - A ordem na página do Brasil (`pages/index.astro`): o bloco ao vivo (manchete e placar), o agregado, "O que esperar da noite", a projeção e a lista das pesquisas, recolhida. Os outros lugares continuam com a indicação das pesquisas e o histórico.
- **Números no relógio dos testes** (19/10, 12h), com o agregado em Flávio 51,12 (incerteza 1,79, 9 institutos):
  - "Só apuração": Flávio 51,0% ± 8,9, chance de 59%, sem faixa da virada (ver o achado abaixo).
  - "Apuração + pesquisas": Flávio 51,1% ± 3,5, chance de 73%, peso de 100%; a faixa da virada começa em 65% das seções; não há losango. As duas bases não coincidem (as chances diferem 14 pontos).
  - A curva começa com 2,0% das seções, com Flávio em ~54,1%, e termina em 100% na projeção de cada base.
  - A ordem de chegada com metade das seções do país, no 1º turno de 2026: Centro-Oeste 74%, Sul 72%, Norte 62%, Sudeste 42% e Nordeste 39%.
- **Escolhas deste ticket**, fora das decisões:
  - O texto de "O que esperar da noite" é factual: a chegada de cada região no 1º turno de 2026 e que a curva supõe a mesma ordem em 25/10. Nenhuma frase diz quem vence ou quando vira.
  - Com `antesDas17h.agregado` desligada e `projecao` ligada, fica só a "Só apuração", sem o controle, porque a base com pesquisas deriva do agregado, como a indicação. Nenhuma decisão cobre o caso, e o build dos testes não o exercita: é do dono.
  - "A projeção, comparada": antes das 17h, na "Só apuração" dá sempre "sem mudança" com o 1º turno (ela parte do placar entre finalistas), e na base com pesquisas, "sem mudança" com a indicação das pesquisas (ela é a indicação). O teste do build usa as duas coisas como referência.
  - Os links vão a `/metodologia/`, `/metodologia/#chance` e `/metodologia/#juntas`, com a barra, como os outros caminhos do site. A página é do [ticket 10](10-metodologia-secoes-iniciais.md).
  - A descrição da curva para o leitor de tela diz só de onde a onde vai cada linha; a virada fica nos atributos `data-virada-x`, `-cedo` e `-tarde` (inteiros) e na legenda.
- **Achado no `modelo`**: na "Só apuração" antes da primeira seção, com as constantes congeladas, `viradaProjetada` dá `cedo: null` embora a faixa de 95% cubra os 50% desde o primeiro ponto (a margem de 8,9 é maior que a distância a 50%): o `cruza` só acha o cruzamento de baixo para cima. A página então não desenha a faixa da virada nessa base. Anotado no [ticket 17](17-projecao-ao-vivo.md).
- **Peso**: a página do Brasil tem ~16 KB de HTML e ~5 KB de CSS com gzip; os scripts são módulos e as fontes trocam. O teste em `test/build/pagina-brasil.test.ts` põe um orçamento de 200 KB para HTML + CSS, pela conta do "Slow 4G" do Lighthouse. **Não foi medido num aparelho**: fica para a revisão do dono no celular e para o ensaio ([ticket 32](32-ensaios-gerais.md)).
- **Testes**:
  - sem build: `test/painel-antes-das-17h.test.tsx` (a curva projetada e a chance de vitória, 10) e `formatarChance` em `test/formato.test.ts`;
  - build: `test/build/painel-antes-das-17h.test.ts` (16: a ordem, a moldura, os números do modelo nas duas bases, a igualdade com o bloco do agregado, as comparações, o controle, a curva, os links, as outras páginas e a chave desligada) e o peso em `test/build/pagina-brasil.test.ts` (2);
  - `test/dados-do-build.ts` junta a leitura dos dados que o teste do agregado e este partilham.
  - `npm test` passa: 59 arquivos, 574 testes. `npm run typecheck` e `npm run lint` passam.
- **Verificação no navegador** (preview do build, a 375 px): sem rolagem lateral; o controle troca a curva e a projeção; a lista das pesquisas recolhida; a moldura tracejada e a barra da chance nos dois temas.
- **Revisão** (`/code-review`, Standards e Spec). Corrigidos: `BASE` → `BASE_DO_MODELO` (vocabulário do glossário); três conferências que testavam o `modelo`, e não a página; a base com pesquisas conferida contra o bloco do agregado e a chance do agregado, como referências de fora; a escala e os eixos partilhados com a curva real; `quemGanhouEntre` partilhado com o agregado; a ordem de chegada pelo `indicadoresDaBase` do pipeline, sem andar na memória do modelo; o nome do parâmetro da virada; o peso da página no teste da página do Brasil; a comparação com a indicação das pesquisas (decisão 3 das Telas); "As pesquisas pesam" ao lado do controle, sem depender da base (decisão 5 da Combinação); uma frase da "Só apuração" que ninguém pediu; a descrição da curva sem afirmar a virada. Ficaram, por julgamento: a linha da apuração antes da primeira seção repetida no site e no teste (o teste recalcula de propósito); o caso "agregado desligada, projeção ligada"; "painel" nos nomes, que é o do ticket e da especificação, embora o glossário o evite para a página de lugar: vale uma entrada para o painel de antes das 17h, com o `/domain-modeling`.
- As notas para os tickets 13, 17, 24 e 33 estão nos comentários deles.
