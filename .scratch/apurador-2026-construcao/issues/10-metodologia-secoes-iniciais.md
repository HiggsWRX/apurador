# 10: Página de metodologia: seções 1 a 5, 8 e 9

Status: resolved
Blocked by: 04, 05
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

A página de metodologia estática, na estrutura A do protótipo (branch `prototipo/pagina-metodologia`), com o que os advogados exigem para a etapa "Antes da noite". O topo traz o título "Como calculamos a projeção", uma frase, o aviso da projeção, o cartão "Em um minuto" e o índice.

Entram as seções 1 a 5, 8 e 9, cada uma com texto simples e as fórmulas recolhidas em "As contas". A seção 2 traz o sino do agregado do dia. As seções 6 e 7 chegam no [ticket 29](29-metodologia-acerto-e-calibracao.md), e a página não traz "em breve": ela só cresce.

Decisões: [Página de metodologia](../../apurador-2026/issues/20-pagina-de-metodologia.md) (decisões 1, 2, 4, 5, 6, 7, 8 e 9) e [Segunda consulta jurídica](../../apurador-2026/issues/21-segunda-consulta-juridica.md) (decisão 3).

## Critérios de aceite

- [x] As seções têm âncoras fixas: `#pesquisas`, `#chance`, `#apuracao`, `#juntas`, `#virada`, `#limites` e `#fontes`. As âncoras `#acerto` e `#constantes` ficam reservadas para o ticket 29.
- [x] "Em um minuto" tem cinco frases e a declaração "sem IA generativa nem aprendizagem de máquina", sem a frase do teste de 2022.
- [x] Os textos partem do objeto `T` do protótipo, falam com "você", em frases curtas e sem jargão. Fórmulas só aparecem dentro de "As contas".
- [x] Nenhum texto usa "aprende", "IA" (fora da declaração) ou "previsão".
- [x] A seção 1 traz os critérios do agregado, os 14 institutos, o estimador, a incerteza, o viés do 1º turno e a indicação das pesquisas.
- [x] A seção 2 traz o sino, em que a área de cada lado de 50% é a chance de vitória de cada candidato. Ele usa o agregado do dia, com a data e a incerteza daquele dia, muda a cada deploy de pesquisas e fica fixo depois das 23h de 24/10.
- [x] As seções 3 a 5 explicam a base "Só apuração", como pesquisas e apuração se juntam e a curva projetada com o sinal de virada. O simulador aparece em três linhas, com link.
- [x] A seção 8 traz as sete limitações:
  - poucas eleições para medir o erro das pesquisas;
  - o viés do 1º turno de 2026;
  - o começo da noite;
  - as seções tardias dentro do município;
  - a ordem de chegada;
  - estados e municípios sem pesquisas estaduais;
  - a dependência do TSE.
- [x] A seção 9 traz as fontes e os avisos:
  - TSE sem alteração (CC-BY, duas casas);
  - a camada "Cálculo do Apurador com dados do TSE";
  - o link para a lista das pesquisas com os seis dados do art. 10;
  - a atribuição da malha do IBGE;
  - "quem faz";
  - `pesquisas.csv` e `pesquisas-historicas.csv` para baixar;
  - o código "a partir de 26/10".
- [x] A página não traz narração nem mapa e nunca lê dados ao vivo.

## Comments

**20/10/2026, resolvido na branch `ticket/10-metodologia-secoes-iniciais`, à espera da revisão do dono:**

- **Onde está.** `packages/site/src/pages/metodologia.astro` (`/metodologia/`), com `components/Secao.astro` (a seção numerada com a âncora fixa), `components/Sino.astro` sobre `lib/sino.ts` (a geometria, pura), `lib/metodologia.ts` (os números que não são o agregado do dia) e o endpoint `pages/dados/[arquivo].csv.ts` (os CSVs em `/dados/`). O rodapé de toda página ganhou "Como calculamos a projeção →", e a lista das pesquisas, o `id="pesquisas-registradas"`, que a seção 9 linka.
- **Números, todos do código, no build**:
  - o agregado do dia, de `lib/pesquisas.ts`, o mesmo do bloco do Brasil (nos testes, com o relógio em 19/10: Flávio 51,1% com 9 institutos, incerteza de 1,79 ponto, chance de 73%); muda a cada deploy de pesquisas e, a partir das 23h de 24/10, é o da noite;
  - as constantes congeladas, do `constantes.json` via `lerConstantes`: 10.000 votos, 2.000 por nível, 2 e 2 p.p., K = 0,25%, limites de 50% e 2%, 0,13 e 0,15;
  - o erro histórico do agregado, do `historicoDoAgregado` sobre o `pesquisas-historicas.csv`: seis 2º turnos, erros de 0,1 a 1,9 ponto, raiz de 1,3, √(1,3² + 0,7²) = 1,5;
  - o viés do 1º turno de 2026 pela regra do agregado, do `agregadoDaNoite` de 2026-1: Flávio 48,9% entre os dois, contra 51,0%, 2,1 pontos.
  - O único número de 2022 no texto é o 67,76% do histórico oficial de totalização (ticket 06).
- **Textos.** Partem do `T` do protótipo. O que mudou: o viés do 1º turno cita os 2,1 pontos entre os dois finalistas da regra do agregado (decisão do dono no [ticket 05](05-historico-das-pesquisas.md)), e não os 2,8 na margem; a margem fala em "desvio próprio de cada estado", que é o que a constante regional faz no código; "FSB (hoje Nexus)" entre os 14; a quinta frase do "Em um minuto" é a da curva projetada e do sinal de virada; as limitações 3 e 4 ficaram sem os números de 2022 do protótipo. O simulador linka a página do Brasil, porque a tela dele ainda não existe. Notas nos tickets 29, 13 e 24.
- **Chave.** O sino e a frase do agregado do dia seguem `antesDas17h.agregado`, como o bloco do Brasil: desligada, somem, e o resto da página fica. O build com as chaves desligadas confere isso.
- **Numeração.** As seções são numeradas pela posição na lista `SECOES` da página: "Limitações" e "Fontes" saem como 06 e 07 até o ticket 29 inserir `acerto` e `constantes` entre `virada` e `limites`. Não há "em breve".
- **Testes.** Unidade: `formatarChance` e `formatarPontos` (`test/formato.test.ts`), a geometria do sino (`test/sino.test.ts`, com as referências do agregado de 18/10 e do `svgSino` do protótipo) e a lista dos institutos (`test/metodologia.test.ts`). Build: `test/build/metodologia.test.ts` confere as sete âncoras e as duas reservadas, as palavras proibidas em todo o texto e nos `aria-label`, as cinco frases e a declaração, as fórmulas só em "As contas", os números de cada seção contra os registros dos tickets 04, 05 e 28 e o `docs/calibracao.md`, as sete limitações, as fontes, os CSVs iguais aos do repositório, a ausência de narração, mapa e ilhas, e a chave desligada. O teste das páginas de lugar passou a ignorar `metodologia/index.html`.
- **Também mudou**: `@apurador/pipeline` exporta `lerInstitutos` e `CnpjDaLista`; `@apurador/modelo` exporta `INCERTEZA_POR_DIA`; `formatarPontos` ganhou o modo "como publicado" (até duas casas).
- **Revisão** (`/code-review`). Corrigidos:
  - nomes em inglês no sino (`lo`, `hi`);
  - docs imprecisos (`ERRO_HISTORICO`, `INSTITUTOS`, as props do sino);
  - três pluralizadores de "ponto" e o 1,96 reescrito, agora `formatarPontos` e `duasCasas`;
  - o dia do agregado e o congelamento repetidos três vezes na página;
  - dois endpoints gêmeos, agora um só sobre `PARA_BAIXAR`;
  - 0,4 e 0,7 repetidos no texto, agora `INCERTEZA_POR_DIA` e `DUVIDA_DO_VIES`;
  - a âncora como `string`, agora o tipo `Ancora`, que falha no typecheck;
  - "hoje" numa página estática, agora a data do agregado;
  - "média das pesquisas" e "estimativa" no texto, termos que o glossário evita;
  - nos testes, as constantes lidas do mesmo arquivo que a página e uma função do pipeline conferida no teste de build, agora literais do `docs/calibracao.md` e dos tickets.

  Ficaram de fora, por escolha: o link do rodapé e o ramo da chave desligada, que o ticket não pede mas o lançamento e a cautela jurídica pedem; e a quinta frase do "Em um minuto", que não vem do `T` (ver o ticket 29).
