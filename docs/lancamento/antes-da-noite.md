# Lançamento da etapa "Antes da noite"

Ticket: [13, Lançamento da etapa "Antes da noite"](../../.scratch/apurador-2026-construcao/issues/13-lancamento-antes-da-noite.md). Decisões: [Plano de lançamento em fases](../../.scratch/apurador-2026/issues/19-plano-de-lancamento-em-fases.md) (2, 3 e 6), [Contas e acessos](../../.scratch/apurador-2026/issues/07-contas-e-acessos.md) e [Arquitetura e tecnologia](../../.scratch/apurador-2026/issues/08-arquitetura-e-tecnologia.md) (14).

O endereço `apurador.org` só abre com os nove itens abaixo verdadeiros, conferidos em 22/10/2026 e com o de acordo do dono. Abrir é tirar o `noindex` do build: o `apurador.org` já servia a `main` desde 20/10, sem divulgação.

## Os nove itens

| # | Item | Conferência | Situação |
|---|---|---|---|
| 1 | Build e testes | A conferência inteira (`npm run typecheck && npm run lint && npm test`) no build do lançamento: 5.789 páginas de lugar, os três builds do site e o replay automático da noite de 2022. O CI do merge roda o mesmo e só então faz o deploy. | ok: em 22/10/2026, 83 arquivos e 872 testes passando |
| 2 | Histórico | `npm run conferir`: os totais de cada turno, no Brasil e em cada UF, contra os arquivos do TSE. As atribuições do TSE (CC-BY) e do IBGE (malha) estão na página, por teste (`pagina-brasil`, `paginas-de-lugar` e `metodologia`). | ok: os dois turnos de 2018 e de 2022 e o 1º turno de 2026 batem, no Brasil, nas 27 UFs e no Exterior |
| 3 | Pesquisas | `npm run pesquisas` em 22/10/2026, às 9h32: as 17 pesquisas do `pesquisas.csv` batem com o CSV de registros do TSE gerado em 21/10/2026 às 5h46, sem divergência (registro em `dados/pesquisas-verificacoes.csv`). O teste `lista-das-pesquisas` confere os seis dados do art. 10 e o link da fonte em cada uma, e o `agregado-de-pesquisas`, que o agregado na página é o da regra sobre o `pesquisas.csv`. | ok |
| 4 | Painel de antes das 17h | O teste `painel-antes-das-17h`: os números são os do `modelo` sobre o mesmo `pesquisas.csv`, com os avisos "não é pesquisa própria" e "não é resultado oficial nem garantia do resultado"; no build com as chaves desligadas, o agregado, a projeção e o simulador saem, cada um pela sua chave em `dados/chaves.json`, sem código novo. O simulador entra no lançamento: ficou pronto no [ticket 24](../../.scratch/apurador-2026-construcao/issues/24-simulador-antes-das-17h.md). | ok |
| 5 | Metodologia | O teste `metodologia`: as seções 1 a 5, 8 e 9, com os critérios de seleção, os cálculos, as limitações, "sem IA generativa nem aprendizagem de máquina" e a atribuição da malha. As seções 6 e 7 chegam no build do ensaio 2 ([ticket 29](../../.scratch/apurador-2026-construcao/issues/29-metodologia-acerto-e-calibracao.md)). | ok |
| 6 | Rodapé | "Responsável: Hiago Oliveira · contato@apurador.org" em toda página, e o mesmo na metodologia, por teste (`paginas-de-lugar`). O e-mail encaminha à caixa do dono pelo Email Routing. | ok |
| 7 | Celular | Medido abaixo, em [Celular](#celular): placar e painel visíveis entre 1,4 e 2,5 s. | ok |
| 8 | Revisão do dono no celular | O Brasil, uma UF, um município grande e um pequeno. Em 22/10, o dono: "I have reviewed it on the phone, looks good." A revisão foi no `apurador.org` de antes deste build, que muda só o rodapé, o `noindex` e o script do Web Analytics. | ok |
| 9 | Depois de aberto | Um deploy que quebre um destes itens volta à versão anterior na hora: ver [Voltar à versão anterior](#voltar-à-versão-anterior). | ok |

E mais, depois do deploy: o site abre em `apurador.org` sem `noindex` (nem no `<meta>` nem no `X-Robots-Tag`), com o Cloudflare Web Analytics e sem cookies nem outro rastreador. O `apurador.hicampos93.workers.dev` do site segue com `X-Robots-Tag: noindex` e nunca é divulgado; o plano B é outro Worker, o `apurador-plano-b`. A conferir no ar, depois do deploy.

## Celular

Em 22/10/2026, às 9h19 de Brasília, sobre o `apurador.org` de então (a `main` do ticket 17, a mesma página do lançamento sem o rodapé novo e o script do Web Analytics): Chromium, tela de 412 × 823, sem cache, com o "Slow 4G" do Lighthouse aplicado no navegador (1,6 Mbit/s × 0,9, 150 ms × 3,75 de ida e volta) e a CPU 4× mais lenta, como num Android barato.

| Carga | Primeira pintura | Maior pintura | Placar visível | Painel visível | Fim da carga | Transferido |
|---|---|---|---|---|---|---|
| 1ª (borda sem cache) | 1,86 s | 2,39 s | 2,49 s | 2,54 s | 3,01 s | 151 KB |
| 2ª | 1,45 s | 1,51 s | 1,59 s | 1,64 s | 2,75 s | 151 KB |
| 3ª | 1,30 s | 1,34 s | 1,43 s | 1,47 s | 2,60 s | 151 KB |

O placar e o painel estão no HTML: "visível" é o elemento desenhado, não na primeira tela. O placar abre a página, e o painel fica logo abaixo dele, a uma rolagem. O único erro do console é o `favicon.ico` que o site não tem (404).

É uma medição num navegador com a rede e a CPU limitadas, não num aparelho: a do aparelho fica para o ensaio geral.

## Voltar à versão anterior

O CI só faz o deploy com os testes e o replay passando. Se um deploy passar e ainda assim quebrar um dos itens, quem viu volta a versão na hora, e a correção vem depois:

```bash
cd packages/site
npx wrangler deployments list        # a última é a quebrada; a de cima dela, a boa
npx wrangler rollback <id-da-versão-boa> -m "volta: <o item quebrado>" -y
```

Sem o `<id>`, o `wrangler rollback` volta à versão anterior à atual. O rollback alcança as 100 versões mais recentes do Worker `apurador`. O deploy seguinte da `main` (um push ou o agendado de meia-noite) substitui a versão voltada, então a correção precisa estar na `main` antes dele.

## De acordo do dono

22/10/2026, o dono, depois da revisão no celular: "Yes i've signed it off". O merge na `main`, que faz o deploy, sai com o ok dele sobre este registro.
