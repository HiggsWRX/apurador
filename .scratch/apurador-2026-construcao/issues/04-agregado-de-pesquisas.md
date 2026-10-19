# 04: Agregado de pesquisas, tendência e indicação das pesquisas

Status: resolved
Blocked by: 02, 03
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O módulo `modelo` calcula o agregado de pesquisas do Brasil sobre o `pesquisas.csv`. Ele aparece na página do Brasil com a faixa de incerteza, a linha de tendência desde 05/10 e o aviso. As páginas de UF, do Exterior e de município mostram a indicação das pesquisas do lugar.

Cada atualização do `pesquisas.csv` é um deploy, e a retirada de uma pesquisa recalcula tudo. O bloco liga e desliga por uma chave de publicação. Antes de o coletor existir, as chaves ficam num arquivo de dados publicado com o site, que muda por deploy sem código novo, e este ticket cria esse arquivo.

Decisões: [Agregado de pesquisas e erro histórico](../../apurador-2026/issues/10-agregado-de-pesquisas.md) (decisões 3 a 9 e comentários) e [Consulta a advogado eleitoral](../../apurador-2026/issues/16-consulta-advogado-eleitoral.md) (decisões 2, 5 e 6).

## Critérios de aceite

- [x] O agregado é a média simples, em votos válidos, da pesquisa mais recente de cada instituto da lista, com campo terminando nos 7 dias anteriores à data do cálculo.
  - Os válidos saem dos votos totais publicados: Flávio ÷ (Flávio + Lula).
  - Com menos de 4 institutos na janela, ela passa a 14 dias.
  - Não há peso por amostra, data ou modo, nem ajuste por instituto.
- [x] A incerteza é normal: √(1,5² + 0,4² × dias até 25/10), ou seja, 1,5 ponto em 25/10. A chance de vitória é a probabilidade de passar de 50%.
- [x] Um teste confere os números de 18/10: Flávio 51,0% com 8 institutos, incerteza de 1,84 ponto e chance de ~71%.
- [x] A tendência desde 05/10 é recalculada dia a dia, com a mesma regra.
- [x] O agregado congela às 23h de 24/10. Depois disso, retirar uma pesquisa recalcula o agregado; incluir uma nova não é aceito.
- [x] A página do Brasil mostra o agregado com faixa e tendência, num bloco separado da lista das pesquisas, com o aviso "Média calculada pelo Apurador sobre pesquisas registradas no TSE. Não é uma pesquisa própria."
- [x] A indicação das pesquisas de cada UF, do Exterior e de cada município é o placar entre finalistas do lugar no 1º turno somado a (agregado − 51,0), limitado a 0–100%.
- [x] As comparações com o 1º turno usam o placar entre finalistas (Brasil: 51,0 × 49,0), nunca o % sobre todos os válidos.
- [x] A chave do agregado e da tendência antes das 17h fica no arquivo de chaves. Desligada, ela esconde o agregado e a indicação das pesquisas, que deriva dele, sem código novo.
- [x] Nenhum texto diz que o modelo "aprende" ou que é "IA".

## Comments

- 19/10/2026, da construção da [Lista das pesquisas conferida no TSE](03-lista-das-pesquisas.md):
  - **O teste de 18/10 usa outro número.** O dono decidiu que a Nexus conta como FSB. O teste passa a conferir **Flávio 51,1% (51,09%) com 9 institutos**, incerteza de 1,84 ponto e chance de ~72%, em vez de 51,0% com 8 e ~71%. Ver o comentário de 19/10 no [ticket 10](../../apurador-2026/issues/10-agregado-de-pesquisas.md).
  - **As 9 pesquisas do agregado de 18/10** (divulgadas até 18/10, campo terminando de 11 a 17/10):
    - Gerp BR-05187/2026
    - Veritá BR-01107/2026
    - Futura BR-03764/2026
    - Datafolha BR-00466/2026
    - PoderData BR-04258/2026
    - MDA BR-00652/2026
    - Ipespe BR-00223/2026
    - Quaest BR-08729/2026
    - Nexus BR-07997/2026
  - **Instituto da lista.** O `pesquisas.csv` não traz o CNPJ. O instituto da lista de cada pesquisa sai do CNPJ do registro no `dados/pesquisas-tse.json`, cruzado com o `dados/pesquisas-institutos.csv` (coluna `instituto_da_lista`). Futura e Gerp têm dois CNPJs cada, e a Nexus conta como FSB.
- 19/10/2026, resolvido na branch `ticket/04-agregado-de-pesquisas`, à espera da revisão do dono:
  - **Onde está.**
    - No `packages/modelo`: o agregado, a tendência, o dia do cálculo e a indicação das pesquisas.
    - Na conferência do `pipeline`: o instituto da lista pelo CNPJ e a recusa de inclusão depois do congelamento.
    - No site: o bloco do agregado no Brasil e o da indicação nos outros lugares.
    - O arquivo de chaves é o `dados/chaves.json`, com `antesDas17h.agregado`. O build recusa uma chave faltando, desconhecida ou que não seja `true`/`false`.
  - **Dia do cálculo no site.**
    - É o do instante do build. A partir das 23h de 24/10, é o da noite, 25/10.
    - Para o site acompanhar o dia sem pesquisa nova, o CI ganhou dois deploys agendados: um todo dia às 00h05 de Brasília e um às 23h05 de 24/10. **O dono decide se ficam.** Sem eles, o agregado da noite só vai ao ar com um deploy depois das 23h de 24/10.
  - **Inclusão depois do congelamento.** A conferência e o build recusam uma pesquisa cuja primeira conferência "ok" no `pesquisas-verificacoes.csv` seja das 23h de 24/10 em diante. Pesquisas divulgadas em 25/10 ficam fora do agregado.
  - **Teste de 18/10.**
    - Roda de ponta a ponta sobre uma cópia dos arquivos das pesquisas conferidos em 19/10 (`packages/pipeline/test/amostras/pesquisas-19-10/`), para que a retirada de uma pesquisa não quebre o CI na hora errada.
    - Confere 51,09% com os 9 institutos do comentário acima, incerteza de 1,84 e chance de ~72%.
  - **Chave desligada.** Some o agregado e a indicação, e a lista das pesquisas fica aberta (decisão 2 da [Consulta a advogado eleitoral](../../apurador-2026/issues/16-consulta-advogado-eleitoral.md)).
  - **Chance de vitória.** O `modelo` a calcula, mas ela não aparece no bloco do agregado: é do bloco da projeção ([ticket 09](09-painel-antes-das-17h.md)), que tem a sua chave.
  - **Indicação.**
    - Usa o placar entre finalistas exato do Brasil (51,01), não o 51,0 arredondado.
    - A página não escreve a mudança nacional ao lado da indicação: arredondada à parte, ela nem sempre fecharia a conta com os números do lugar.
