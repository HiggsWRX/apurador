# 08: Base "Apuração + pesquisas"

Status: resolved
Blocked by: 05, 07
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

A segunda base da projeção no módulo `modelo`: o mesmo modelo da "Só apuração", com outro ponto de partida. Ela parte da indicação das pesquisas, que perde peso conforme o Brasil é apurado.

O módulo diz, para cada lugar, o peso das pesquisas e se as duas bases já coincidem. Também roda a noite de 2022 com o agregado de 2022, real e deslocado, e entrega o erro das duas bases momento a momento para a calibração e a metodologia.

Decisões: [Combinação de pesquisas e apuração](../../apurador-2026/issues/11-combinacao-pesquisas-e-apuracao.md) e [Agregado de pesquisas e erro histórico](../../apurador-2026/issues/10-agregado-de-pesquisas.md) (decisões 5 e 6).

## Critérios de aceite

- [x] Para o voto que falta de cada município, a estimativa é peso × indicação das pesquisas + (1 − peso) × a estimativa da apuração. A correção pelo próprio município continua por cima.
- [x] O peso das pesquisas é K ÷ (K + % de seções totalizadas no Brasil), um número só para o país. Com K = 0,5% (parâmetro provisório), um teste confere metade com 0,5% das seções e menos de 10% depois de 5%.
- [x] Antes da primeira seção, o peso é 100%, e a projeção é a indicação das pesquisas. A incerteza fica em 1,5 no Brasil, ~1,8 na UF média e ~2,5 em Goiás.
- [x] A incerteza das pesquisas tem duas partes:
  - 1,5 ponto nacional, comum a todos os lugares;
  - uma parte local independente: na UF, 0,13 × a fatia dos eliminados no 1º turno da UF; no município, 0,15 × a fatia dos eliminados no 1º turno do município.

  Durante a apuração, as incertezas das pesquisas entram multiplicadas pelo peso, e as da apuração, pelo restante.
- [x] Em cada lugar, "as duas bases coincidem" quando a diferença é menor que 0,1 p.p. na projeção e menor que 1 ponto na chance de vitória.
- [x] Antes da apuração, as duas bases desenham a curva projetada de 0% a 100%, com a virada projetada, usando a ordem de chegada do 1º turno.
- [x] O executor de noites roda o 2º turno de 2022 com o agregado de 2022 real e deslocado 2 pontos para cada candidato. Ele entrega, momento a momento, o % de seções, o placar parcial e a projeção com a incerteza nas duas bases.
- [x] Com o agregado deslocado, a base com pesquisas fica a menos de 0,1 p.p. da "Só apuração" a partir de ~7% das seções, como no protótipo da metodologia.

## Comments

**19/10/2026, resolvido na branch `ticket/08-base-apuracao-mais-pesquisas`, à espera da revisão do dono:**

- **Módulo** (`packages/modelo`):
  - `projetar(modelo, apuracao, constantes, agregado?)`: sem o agregado, é a "Só apuração", com os mesmos números de antes. Com ele (`{ valor, incerteza }`, em % do 1º finalista da base do modelo), é a "Apuração + pesquisas".
  - A `Projecao` ganhou `pesoDasPesquisas`, que é 0 na "Só apuração".
  - `projetarNasDuasBases(modelo, apuracao, constantes, agregado)` dá as duas bases e, em cada lugar (Brasil, UFs, Exterior e municípios), se elas já coincidem.
  - Também saem `pesoDasPesquisas(secoes, constantes)` e `basesCoincidem(a, b)`.
  - `executarNoite(modelo, noite, constantes, { agregado, pontos })` roda uma base por chamada, e cada linha traz o peso das pesquisas.
- **Constantes** (`constantes.json`): K entra como `secoesDasPesquisas` (0,5) e os coeficientes locais como `incertezaLocalDasPesquisas` (UF 0,13, município 0,15). A incerteza nacional das pesquisas é a do agregado passado: 1,5 na noite, mais larga nos dias antes dela.
- **Como a conta é feita**:
  - Cada município parte de peso × indicação das pesquisas + (1 − peso) × a estimativa da referência.
  - A indicação é a do `indicacaoDasPesquisas` do ticket 04, a mesma que o site mostra.
  - A correção pelo placar parcial do município fica por cima.
  - A incerteza das pesquisas tem três partes:
    - a nacional, do agregado, sobre todo o voto que falta;
    - a local da UF, em torno do Brasil;
    - a local do município, em torno da UF, multiplicada por (1 − peso do placar), como no protótipo.
  - **Decisão do dono, 19/10, na segunda revisão**: as partes locais se anulam no lugar de cima.
    - Cada lugar fica com a nacional, a da sua UF e a dele inteiras.
    - No lugar de cima, sobre o voto que falta, entra só o que não se anula: a variância condicionada a Σ V·x = 0, Σ a²s² − (Σ a·V·s²)² ÷ Σ V²s², com V os válidos finais de cada parte.
    - Um município sozinho na UF, o Distrito Federal, não se afasta dela.
    - O protótipo somava as partes locais ao Brasil como independentes.
  - O desvio é √(peso² × variância das pesquisas + (1 − peso)² × variância da apuração).
- **Porte fiel**:
  - A conta da base com pesquisas do protótipo da página de metodologia (`serie2022.js`, branch `prototipo/pagina-metodologia`) está copiada em `packages/modelo/test/prototipo/combinacao.js`. Só mudou o embrulho: ela virou uma função de um momento.
  - Nos 106 momentos da noite de 2022, com o agregado real (Lula 50,98) e deslocado 2 pontos para cada lado, o modelo bate com ela em menos de 10⁻¹⁴ no peso, na projeção do Brasil e na fatia do voto que falta de cada município.
  - O desvio do Brasil nunca passa o do protótipo e fica até 0,044 ponto abaixo dele: é o que se anula.
  - A indicação é limitada a 0–100%, e o protótipo não a limita. Na noite de 2022, isso não muda nada.
- **Antes da primeira seção** (base de 2026, com o agregado em Flávio 52,0 para a mudança aparecer):
  - O Brasil fica no agregado, a menos de 0,001 ponto, com a mesma incerteza e a mesma chance de vitória (1,5 e 90,9%). Cada UF e cada município ficam na indicação das pesquisas deles.
  - A incerteza é de 1,78 na UF média, 2,50 em Goiás, 1,63 em Alagoas e 1,97 em São Paulo. O Distrito Federal, com 10,6% de eliminados, fica com 2,04, na página da UF e na do município.
- **Curva antes da apuração** (base de 2022):
  - A "Só apuração" termina em Lula 52,86 e vira em 53,8% das seções.
  - Com o agregado da véspera, termina em 50,98 e vira em 91,7%, com a faixa desde 33,2%.
  - Na base de 2026, com o agregado em 51,0, não há virada, e a faixa começa em 76,1%.
  - A curva começa no primeiro passo, com ~2% das seções, porque antes da primeira seção não há placar parcial.
- **Executor na noite de 2022**:

  | Base | Erro com 5% | com 25% | com 50% | Cobertura | Brier | A menos de 0,1 p.p. da "Só apuração" desde | Coincidem no Brasil desde |
  |---|---|---|---|---|---|---|---|
  | Só apuração | 0,11 | 0,37 | 0,47 | 98,1% | 0,032 | — | — |
  | Agregado real | 0,10 | 0,37 | 0,47 | 98,1% | 0,030 | 3,0% | 12,0% |
  | +2 para Lula | 0,23 | 0,36 | 0,47 | 98,1% | 0,028 | 7,0% | 25,0% |
  | +2 para Bolsonaro | 0,03 | 0,38 | 0,47 | 98,1% | 0,041 | 7,0% | 8,0% |

  Os erros com 5% e os 7,0% são os da série do protótipo da metodologia (0,10, 0,23, 0,03 e 7%). O maior erro entre 0,1% e 5% das seções é de 1,74 na "Só apuração", 1,12 com o agregado real, 1,74 com +2 para Lula e 1,03 com +2 para Bolsonaro.
- **Achado para o dono e para os tickets 17 e 28**: as bases "coincidem" bem depois de as projeções se encontrarem.
  - Com o agregado real, as projeções ficam a menos de 0,1 p.p. desde 3% das seções, mas as chances diferem mais de 1 ponto até 12%.
  - A margem da base com pesquisas é um pouco mais estreita, porque as incertezas entram em quadratura, com peso e (1 − peso). Perto de 50%, isso muda a chance.
  - Assim, "as pesquisas deixaram de pesar" sairia com 12% das seções em 2022, e não com os ~5% do exemplo do ticket 14 do mapa. O "coincidem" do Brasil não vai e volta nas três noites: começa e fica. O método segue a decisão 5. Se o dono quiser o evento mais cedo, a regra a rever é a da chance.
- **Fica como no protótipo**: no município, só a parte local dele cai com a correção pelo próprio placar. A nacional e a da UF não caem, como as partes comuns da "Só apuração". Isso alarga a margem do município já bem apurado, que o ticket 07 achou estreita demais.
- **Desempenho**: a projeção da base com pesquisas leva ~1,3 ms, contra ~1,1 ms da "Só apuração" (medianas, sem a curva).
- **Segunda revisão** (`/code-review`). Corrigidos:
  - o teste do "coincidem" por lugar, que conferia com o próprio `basesCoincidem`: agora confere a regra da decisão 5 nos números das duas bases;
  - uma conferência de tamanho que não tinha como falhar;
  - um comentário que repetia a linha.

  Ela também apontou a incerteza local somada como independente, que o dono decidiu anular, como acima.
- **Primeira revisão** (`/code-review`). Corrigidos:
  - o "coincidem" por lugar, que o ticket pedia e só existia como regra;
  - o teste da fórmula por município, que montava o esperado com as saídas do próprio `projetar`: agora a fatia de cada município é conferida contra o protótipo;
  - o teste da indicação, que usava a mesma função do modelo;
  - nomes (`varianciaDaApuracao`, `pesoDoPlacar`, "base do modelo" e "base da projeção");
  - a variância das pesquisas repetida;
  - um campo que guardava uma soma antes da fração;
  - a unidade do placar entre finalistas do Brasil;
  - a tolerância do erro com 5%.

  Ficaram de fora:
  - o executor com as duas bases numa chamada só: a calibração precisa do resumo de cada base, e os momentos já se alinham;
  - o momento de 0% no executor, que é o `projetar` sobre a apuração sem nada totalizado;
  - o começo da curva em ~2%, já que a escala ignora até 3%.
- **Vocabulário**: K ainda não tem nome no glossário. No código, ele é `secoesDasPesquisas`, "o % de seções que as pesquisas valem".
