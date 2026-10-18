# 13: Lançamento da etapa "Antes da noite"

Status: ready-for-human
Blocked by: 02, 03, 04, 09, 10, 12
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

Abrir o site em `apurador.app` com a etapa "Antes da noite", com meta na quinta, 22/10, às 12h. Entram:

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
- [ ] O site abre em `apurador.app`, sem `noindex`, com o Cloudflare Web Analytics, sem cookies nem outro rastreador. O `*.workers.dev` fica só como endereço do plano B, nunca divulgado.
- [ ] O registro do lançamento traz a conferência dos nove itens e o de acordo do dono.
