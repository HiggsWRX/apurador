# Métodos de projeção da apuração

Pesquisa para o ticket [05 — Métodos de projeção da apuração](../issues/05-metodos-de-projecao.md). Fontes consultadas em 17/10/2026.

Os termos do produto (seção, % de seções totalizadas, placar parcial, curva real, virada, projeção, chance de vitória, curva projetada, lugar) seguem o `GLOSSARY.md`. Quando cito um veículo estrangeiro, "unidade" é a menor área para a qual o modelo calcula algo: condado (*county*), *precinct*, distrito de votação etc.

Convenções:

- **Fonte primária**: documento do próprio autor do método (artigo, *write-up*, código, README). Quando só consegui um resumo ou uma reportagem, digo isso.
- **Autodeclarado**: desempenho informado pelo próprio autor e que eu não reproduzi.
- **Inferência nossa**: conclusão minha a partir das fontes, sem fonte que a afirme diretamente.

---

## Resumo

1. **Quase todos os métodos sérios de noite eleitoral fazem a mesma coisa no fundo: comparam cada unidade já contada com uma linha de base da própria unidade (eleição anterior) e projetam a *mudança*, não o nível, para as unidades que faltam.** É assim no Washington Post (diferença em relação a 2016, regredida em covariáveis demográficas), no NYT (linha de base por *precinct* ou condado), no *exit poll* britânico (mudança medida nas mesmas seções da eleição anterior), no modelo sul-africano do CSIR (agrupamentos de unidades que votaram parecido) e nos projetos brasileiros abertos de 2026 (*swing* entre o 1º e o 2º turno por seção, zona ou município). Fontes nas seções 2.1 a 2.12.
2. **Para nós, a melhor linha de base é o 1º turno de 2026**, com os mesmos dois candidatos, duas semanas antes, nas mesmas seções. A ordem de chegada (Sul/Sudeste cedo, Norte/Nordeste tarde) distorce o placar parcial, mas não distorce tanto o *swing* entre turnos, porque o que distingue as seções que chegam cedo já está no resultado delas no 1º turno. Essa é a tese explícita do projeto Sibila (<https://github.com/carlos-schwabe/sibila>) e a premissa dos modelos do WaPo e do CSIR.
3. **Desempenho conhecido no Brasil (autodeclarado, por projetos abertos):** projetando o 2º turno de 2022 a partir do 1º turno de 2022, na ordem real de chegada, o erro foi de −0,22 p.p. com 5% das seções e de ±0,1 p.p. a partir de 25% (Sibila, por seção). Um modelo por município/zona com recuo para a UF teve erro médio de 0,17 p.p. no ensaio de 2022 e de 0,20 p.p. ao vivo no 1º turno de 2026 (Meloni). Um método ingênuo, que supõe que o voto que falta em cada UF segue o placar parcial da UF, errou cerca de 1 p.p. com 36,6% das seções e quase dobrou a margem (TabNews). Fontes na seção 2.12.
4. **A incerteza tem de tratar os erros como correlacionados.** Somar intervalos de unidades como se fossem independentes dá intervalos estreitos demais. Somar os limites (correlação perfeita) funciona com poucas unidades e fica largo demais com milhares (WaPo, dez/2020). Os modelos usam um termo de viés comum por área (Sibila: `biasCorr = 0.5`), simulações com desvios nacionais, regionais e estaduais (votei) ou *bootstrap* estratificado (WaPo, 2022+). A chance de vitória sai da distribuição da projeção final: Φ(margem/erro padrão) ou fração das simulações.
5. **Ninguém que eu tenha achado publica uma curva projetada (placar parcial até 100%) como produto.** Os veículos projetam o resultado final. O mais próximo: o NYT diz que mostra "que dados devemos receber e em que ordem", e o modelo do WaPo usa a trajetória de contagem de cada condado para corrigir unidades quase completas. A curva projetada exige, além da projeção por unidade, um **modelo de ordem de chegada** das seções que faltam. Proponho um na seção 3. Esse é o ponto mais novo do nosso produto e o que precisa de mais validação.
6. **Opções viáveis em uma semana** (seção 5): (1) *swing* entre turnos por município com recuo hierárquico, a recomendação de partida; (2) a mesma ideia por seção ou zona, mais precisa mas dependente de dados que talvez não existam ao vivo; (3) modelo de transferência de votos dos demais candidatos, com simulação; (4) pós-estratificação simples por região, como plano B. Não recomendo para esta semana regressão com covariáveis demográficas e predição conformal (WaPo), nem extrapolação ingênua por UF.

---

## 1. O problema no caso brasileiro

- **A seção é atômica.** O TSE totaliza a seção inteira, o que equivale aos *precincts* que o WaPo prefere aos condados porque "estão ou totalmente reportados ou nada reportados", e assim a massa crítica de unidades completas chega mais cedo (Cherian e Bronner, *An Update To The Washington Post Election Night Model*, dez/2020, <https://s3.us-east-1.amazonaws.com/elex-models-prod/elex-models-prod/2020-general/write-up/election_model_writeup_update1.pdf>). Nos EUA, boa parte do esforço vai para saber se um condado acabou de contar e para separar voto antecipado de voto no dia (WaPo 2020; NYT via WRAL, abaixo). No Brasil esses problemas não existem. O município, porém, chega aos poucos: um município parcialmente totalizado é uma amostra não aleatória das seções dele.
- **Horário único desde 2022.** Desde 2022 todas as seções votam das 8h às 17h de Brasília, por decisão do TSE de 14/12/2021, motivada pela polêmica do Acre em 2014 (Agência Brasil, via TNH1: <https://www.tnh1.com.br/noticia/nid/tse-unifica-horario-de-votacao-nas-eleicoes-de-2022/>). *Inferência nossa:* a ordem de chegada de 2018 (fechamento por hora local) é menos comparável com a de 2026 do que a de 2022 e a do 1º turno de 2026. A permanência da regra em 2026 deve ser confirmada no ticket 02. Um indício a favor: a primeira atualização registrada pelo Jornal do Comércio no 1º turno, às 17h22, já tinha 1,23% das seções, e o ticket 04 aponta que o resultado de Presidente só é liberado a partir das 17h.
- **A ordem de chegada distorce muito o placar parcial.**
  - 1º turno de 2026 (Jornal do Comércio, com dados do TSE, <https://www.jornaldocomercio.com/politica/2026/10/1265322-eleicoes-2026-apuracao-e-os-resultados-do-primeiro-turno.html>):

    | Horário | % de seções totalizadas | Flávio | Lula | Vantagem de Flávio (p.p.) |
    |---|---|---|---|---|
    | 17h22 | 1,23% | 48,85% | 42,50% | 6,35 |
    | 19h38 (dados até 19h08) | 64,81% | 49,58% | 42,25% | 7,33 |
    | 20h16 | 90,4% | 48,03% | 43,99% | 4,04 |
    | 21h | 97,01% | 47,45% | 44,66% | 2,79 |
    | Final | 100% | 47,03% | 45,16% | 1,87 |

    A vantagem calculada é nossa. Entre 64,81% e 100% das seções, a vantagem caiu 5,5 p.p.
  - 2º turno de 2022 (placar parcial de Lula, segundo o *backtest* do Sibila na ordem real): 46,97% com 5%; 47,98% com 10%; 48,74% com 25%; 49,70% com 50%; 50,17% com 75%; 50,53% com 90%; final de 50,90% (<https://github.com/carlos-schwabe/sibila>). A virada ocorreu por volta de 67,6% a 67,8% das seções: o Sibila diz 67,6% às 18h43, e o *Expreso*/EFE registra Lula com 50,01% a 67,76% (<https://www.expreso.com.pe/top-de-noticias/lula-lidera-con-5001-frente-a-bolsonaro-con-4999-segunda-vuelta-en-brasil-al-6776-del-escrutinio/872304/>). A linha do tempo exata é assunto do ticket 02.
- **Eixo horizontal.** O eixo do produto é o % de *seções* totalizadas, não de votos. Para projetar a curva é preciso saber, para cada seção que falta, quantos votos válidos ela deve ter (seção 3).

---

## 2. Métodos encontrados

Para cada método: entradas; como projeta o voto não totalizado; incerteza e chance de vitória; ordem de chegada; curva; desempenho conhecido.

### 2.1 The Washington Post (2019, 2020 e o pacote aberto `elex-model`)

**Fontes primárias:** Bronner, Johri e Bowers, *Predicting Elections using Live Data at The Washington Post*, Computation + Journalism 2020 (<https://bpb-us-e1.wpmucdn.com/sites.northeastern.edu/dist/0/367/files/2020/02/CJ_2020_paper_27.pdf>); Cherian e Bronner, *How The Washington Post Estimates Outstanding Votes for the 2020 Presidential Election*, out/2020 (<https://s3.us-east-1.amazonaws.com/elex-models-prod/2020-general/write-up/election_model_writeup.pdf>); a atualização de dez/2020 (link acima); o repositório <https://github.com/washingtonpost/elex-live-model> e o código do modelo *bootstrap* (<https://github.com/washingtonpost/elex-live-model/blob/develop/src/elexmodel/models/BootstrapElectionModel.py>).

Houve três gerações:

1. **Virgínia 2019 (por *precinct*, normal multivariada).** A projeção pré-noite de comparecimento por *precinct* vinha de mínimos quadrados sobre comparecimentos anteriores e demografia. Durante a noite, a distribuição condicional normal dos *precincts* que faltavam era atualizada com os já observados: μ̂ = μ₁ + Σ₁₂Σ₂₂⁻¹(a − μ₂). A covariância entre *precincts* foi o gargalo: com quatro eleições comparáveis para uma matriz de cerca de 2.000 × 2.000, a estimativa ficou instável, e foi substituída por uma função da distância geográfica e da semelhança demográfica (C+J 2020).
2. **Eleição geral de 2020 (por condado, regressão quantílica conformalizada).** A variável-alvo é a mudança normalizada em relação a 2016, r̃ᵢ = (T₂₀ − T₁₆)/T₁₆, calculada separadamente para comparecimento, votos democratas e votos republicanos. Ela é regredida em covariáveis demográficas por regressão quantílica (mediana e quantis 5% e 95%), e a predição conformal (*split conformal*) corrige os quantis para garantir a cobertura. Os condados maiores pesam mais na calibração (peso = votos em 2012). O modelo não usa pesquisas: "takes no inputs besides previous election results and the demographic makeup" (*write-up* de out/2020).
3. **Pacote aberto (2022 em diante).** O modelo *bootstrap* modela separadamente a margem normalizada *y* e o fator de comparecimento *z* (comparecimento atual ÷ anterior), com mínimos quadrados sobre covariáveis e efeitos fixos. O resíduo é dividido em um efeito aleatório por disputa e um erro por unidade, com *bootstrap* estratificado ("because our units are not independent and identically distributed"). Para condados com mais de 75% contados, há uma correção pela trajetória de contagem dos condados da mesma UF (código citado acima).

- **Entradas:** resultado da eleição anterior por unidade; demografia; unidades já completas.
- **Voto não totalizado:** linha de base da unidade × (1 + mudança prevista pela regressão).
- **Incerteza e chance:** intervalos de 90%. Em 2020 o intervalo estadual somava os limites dos condados, o que equivale a correlação perfeita. Isso era aceitável com condados, mas com mais de 2.000 *precincts* na Geórgia dava intervalos "whose width exceeds 10% of the total votes cast even after over half the precincts have reported", e foi trocado por uma aproximação paramétrica dos escores (dez/2020). O WaPo mostra intervalos, não uma probabilidade. A versão *bootstrap* converte a margem simulada de cada disputa em vitória ou derrota para resumos nacionais.
- **Ordem de chegada:** os autores dizem que os condados rurais chegam antes dos urbanos e que a premissa de "permutabilidade" não vale. Eles a contornam modelando a *mudança* normalizada ("ensures that our samples are 'close to' exchangeable"), não projetam estados que ainda votam e passam a calibrar por estado quando há dados suficientes. Empiricamente, "deviations from this assumption have minimal effect … once 20-25% of the counties nationally have reported" (out/2020).
- **Curva:** não projetam a trajetória. Mostram o voto conhecido e uma faixa difusa para o voto que falta (atualização de dez/2020).
- **Desempenho:** na Virgínia em 2019, o erro percentual médio por distrito caiu de 17% (0% de *precincts*) para menos de 2% (75%). A cobertura dos intervalos de 95% caiu para 86% (Câmara) e 81% (Senado) no meio da noite, atribuída à chegada tardia dos *precincts* urbanos e democratas (C+J 2020, tabelas 2 a 5). O modelo exige "a few dozen" unidades completas para começar e "a few hundred more" para calibrar a incerteza (out/2020).

### 2.2 The New York Times, "the needle"

**Fontes:** Nate Cohn e Josh Katz, texto do NYT de março de 2018 sobre a eleição especial PA-18, republicado pelo WRAL (<https://www.wral.com/archive/17414570/>); entrevista de Wilson Andrews ao Reuters Institute, 28/10/2024 (<https://reutersinstitute.politics.ox.ac.uk/news/moving-needle-how-new-york-times-aims-guide-readers-through-americas-most-uncertain-election>). A página de metodologia no nytimes.com não pôde ser lida (bloqueio de acesso automatizado).

- **Entradas:** uma linha de base "fraca" de comparecimento e de voto para cada *precinct* ou condado, feita com pesquisas, resultados históricos e demografia (Reuters Institute). Também usam informação de autoridades eleitorais sobre o que será contado e quando.
- **Voto não totalizado:** a área que já reportou é comparada com a linha de base. Se o comparecimento ou o voto diferem do esperado, o modelo supõe que áreas semelhantes que ainda não reportaram vão diferir do mesmo jeito (WRAL). No começo da noite pesam os erros da linha de base. Depois, os votos reais.
- **Incerteza e chance:** mostra a chance de vitória (o ponteiro). A tremulação (*jitter*) representava a incerteza. Desligá-la, dizem os autores, "only hides the uncertainty" (WRAL).
- **Ordem de chegada:** reconhecem que a sequência engana ("a candidate's best or worst areas may report first"). O voto antecipado só é corrigível quando o estado o divulga separado (WRAL). Só publicam quando há "enough data to feel confident" (Reuters Institute).
- **Curva:** para 2024 planejavam dizer aos leitores "what data we think we'll get in a specific state, and in what order" (Reuters Institute), mas não achei uma curva projetada publicada.
- **Desempenho:** em 2016 o ponteiro indicou Trump horas antes da projeção da AP (Reuters Institute). Teve uma pane de cerca de uma hora em 2018. Não há métricas publicadas que eu tenha achado.

### 2.3 Decision Desk HQ

**Fontes:** resumo do artigo *Election Night Forecasting With DDHQ: A Real-Time Predictive Framework*, Donnini et al., Harvard Data Science Review 6.4, 18/10/2024 (<https://hdsr.mitpress.mit.edu/pub/zr6hjsfl>). O texto completo deu 403, então só li o resumo e trechos indexados. Também o artigo DDHQ sobre simulações correlacionadas, HDSR 4.4 de 2022 (<https://hdsr.mitpress.mit.edu/pub/ftwzgrij/release/4>), só pelo resumo.

- **Entradas:** voto ao vivo, dados geoespaciais e demografia, usando só unidades de coleta (condados ou *townships*) completas ou quase completas.
- **Método:** regressão por equações de estimação generalizadas (GEE) e cópulas. O artigo de 2022 diz que uma cópula gaussiana facilita calcular distribuições condicionais quando parte das unidades já reportou.
- **Chance de vitória:** sim, probabilidades por candidato e voto esperado.
- **Desempenho:** a DDHQ afirma ter acertado todas as projeções de 2024 (autodeclarado, <https://ddhq.io/news/election-night-2024-by-the-numbers>, visto só pelo resultado de busca). O modelo de 2020 do WaPo foi feito em parceria com a DDHQ (*write-up* de out/2020).

### 2.4 Associated Press, "expected vote"

**Fonte:** Robert Yoon, AP, republicado pela WBTV (<https://www.wbtv.com/2026/03/02/how-ap-uses-expected-vote-instead-precincts-reporting-when-determining-winner>).

A AP não projeta o placar. Ela projeta o **denominador**: o total de votos esperados, a partir do comparecimento anterior, mudanças de população e de eleitorado, competitividade, voto antecipado e, durante a noite, dados oficiais de comparecimento. O "% contado" passa a ser contados ÷ esperados, e pode *cair* se a projeção de comparecimento subir. A AP abandonou o "% de *precincts* que reportaram" porque *precincts* têm tamanhos diferentes e "100%" pode esconder muitas cédulas. **Relevância para nós:** o eixo oficial é o % de seções, mas a projeção do voto em cada seção que falta (seção 3) é exatamente um "expected vote" por seção.

### 2.5 The Economist

Não achei modelo de noite eleitoral da The Economist. O que existe é o modelo pré-eleitoral de 2024 (fundamentos mais pesquisas, bayesiano hierárquico), descrito no Harvard Data Science Review (<https://hdsr.mitpress.mit.edu/pub/yoa73r1m/release/1>, visto só pelo resultado de busca). Fica como pergunta sem resposta. Pode existir algo em página paga que eu não consegui ler.

### 2.6 Reino Unido: *exit poll* BBC/ITV/Sky e projeções da BBC com resultados

**Fontes:** David Firth, *Exit poll explainer*, Universidade de Warwick (<https://warwick.ac.uk/fac/sci/statistics/staff/academic-research/firth/exit-poll-explainer/>); Curtice e Firth, "Exit polling in a cold climate: the BBC–ITV experience in Britain in 2005", *JRSS A* 171(3), 2008 (<https://doi.org/10.1111/j.1467-985X.2007.00536.x>; só li o resumo, <https://strathprints.strath.ac.uk/8807/>); histórico do modelo da BBC baseado em resultados, citado em Holloway et al. 2018 (seção 2.9).

- **Entradas:** cerca de 100 seções, em sua maioria as mesmas da eleição anterior (painel). Resultados anteriores, geografia e censo por distrito.
- **Projeção:** mede a **mudança** em cada seção desde a eleição anterior, não o nível. Assim, vieses persistentes do local se cancelam. A mudança é regredida em características do distrito e aplicada ao resultado anterior de cada um dos cerca de 600 distritos (Firth).
- **Incerteza:** probabilidade de vitória por distrito. Somadas, dão o número esperado de cadeiras (Firth).
- **Ordem de chegada:** o *exit poll* não depende da ordem. Já a projeção da BBC com resultados de distritos (desde 1974, regressão *ridge* com *prior* do *exit poll*, atualizada a cada distrito declarado) errou muito em 1987 e 1992. Em 1992 o erro na maioria foi de 62 cadeiras com 0 distritos declarados e de 10 com 300 (tabela 3 de Holloway et al. 2018, a partir de Payne 2003).
- **Lição para nós:** "medir a mudança nas mesmas unidades" é exatamente o *swing* entre o 1º e o 2º turno por seção.

### 2.7 Alemanha, *Hochrechnung*

**Fonte:** Agência Federal de Educação Política, bpb (<https://www.bpb.de/themen/politisches-system/wahlen-in-deutschland/335663/prognosen-hochrechnungen-umfragen/>).

As emissoras projetam o resultado com a contagem real de uma **amostra de distritos escolhida para reproduzir, em conjunto, o resultado da eleição anterior** ("Die Stimmbezirke sind so ausgewählt, dass sie in ihrer Gesamtheit das Ergebnis der vorangegangenen Wahl exakt abbilden"). A incerteza "diminui à medida que a base se amplia". Quando a disputa fica dentro da margem, espera-se a contagem completa. Não achei o detalhe estatístico. **Para nós:** a lógica é parecida com a da pós-estratificação (opção 4), mas exige uma amostra desenhada. O Apurador recebe o que o TSE totaliza, na ordem do TSE.

### 2.8 Espanha: amostras não aleatórias e *kriging*

**Fontes:** José M. Pavía-Miralles, "Forecasts From Nonrandom Samples: The Election Night Case", *JASA* 100 (2005), 1113–1122 (<https://doi.org/10.1198/016214504000001835>; resumo em <https://academicnewsletter.sufe.edu.cn/info/445759>); Pavía, Larraz e Montero, "Election Forecasts Using Spatiotemporal Models", *JASA* 103 (2008), 1050–1059 (<https://doi.org/10.1198/016214507000001427>); Bernardo e Girón, "Robust Sequential Prediction from Non-random Samples: the Election Night Forecasting Case", *Bayesian Statistics 4* (1992), 61–77 (<https://academic.oup.com/book/54041/chapter/422209463>). Não consegui o texto completo de nenhum dos três. O resumo vem do índice e a descrição do método de 2008 vem do WaPo.

- **Pavía-Miralles (2005):** usa a "consistência que as seções mostram entre eleições". Combina as proporções passadas e as que vão chegando de cada seção para revisar a projeção continuamente. Foi testado na noite de 1999 em Valência e em outras quatro eleições. Segundo o resumo, poucos minutos após o início da contagem já aproxima o resultado final "com grande precisão", e é mais barato e robusto que *exit polls* ou contagens rápidas.
- **Pavía, Larraz e Montero (2008):** variante espacial (*kriging*). O WaPo testou "*kriging* demograficamente consciente" em 2020 e o descartou por desempenho e por intervalos simétricos com cobertura ruim (*write-up* de out/2020).
- **Bernardo e Girón (1992):** projeção sequencial bayesiana robusta a partir de amostras não aleatórias na noite eleitoral espanhola. Só confirmei a referência.

### 2.9 África do Sul, CSIR (desde 1999)

**Fontes:** Holloway, Ittmann, Dudeni-Tlhone e Schmitz, "From SA to the USA: Election forecasting", *ORiON* 34(2), 2018 (<https://orion.journals.ac.za/pub/article/view/581>, DOI 10.5784/34-2-581); página do CSIR sobre 2024 (<https://www.csir.co.za/2024-national-elections-predictions-csir-once-again-set-forecast-south-african-general-elections>); Greben, Elphinstone e Holloway, *ORiON* 22 (2006), só pelo resumo (<https://doaj.org/article/99289085a2cd44119504d5c4a860a346>).

- **Entradas:** resultado anterior por distrito de votação, usado só para agrupar; número de eleitores registrados por distrito; resultados que chegam.
- **Projeção:** cria cerca de 20 agrupamentos difusos (*fuzzy clusters*) por província ou nacionais, a partir do voto anterior. Depois disso o voto anterior é descartado. À noite, os distritos contados estimam o voto e o comparecimento de cada agrupamento, e isso projeta os distritos que faltam conforme o grau de pertença de cada um aos agrupamentos (Holloway et al. 2018, seção 3.2).
- **Ordem de chegada:** "designed to adjust for moderate non-random patterns in the order". Em 2016 nos EUA, 245 dos 275 primeiros condados eram pró-Trump, e o modelo superestimou Trump no início, mas corrigiu parte do viés (seção 4).
- **Premissas e falhas:** supõe que quem votou parecido muda parecido. Funcionou mal em 2014, quando as premissas foram violadas (seção 1).
- **Desempenho:** "high degree of accuracy at a national level" com cerca de 5% dos resultados (página do CSIR, autodeclarado e sem números).

### 2.10 México, contagem rápida do INE

**Fontes:** palestra de María Teresa Ortiz Mancera, posit::conf 2020 (<https://posit.co/resources/videos/mexican-electoral-quick-count-night-with-r-maria-ortiz-mancera>); pacote `quickcountmx` (<https://github.com/tereom/quickcountmx>).

É uma amostra probabilística de seções, sorteada antes. A amostra completa raramente chega a tempo, então os resultados são divulgados com amostras parciais, que trazem vieses. Os modelos bayesianos hierárquicos com covariáveis demográficas e geográficas servem para reduzir esses vieses e rodaram a cada 5 minutos na noite. O pacote implementa estimador de razão e regressão multinível com pós-estratificação. **Para nós:** não temos amostra desenhada, mas o problema de "amostra parcial enviesada pela ordem" é o mesmo, e a solução (modelo hierárquico com pós-estratificação) é a da opção 1.

### 2.11 Simulação condicional (Gelman e Silver)

**Fonte:** Gelman e Silver, "What Do We Know at 7 PM on Election Night?", *Mathematics Magazine* 83 (2010), 258–266 (<https://sites.stat.columbia.edu/gelman/research/published/electionnight4.pdf>).

Partem de 10.000 simulações conjuntas e correlacionadas da projeção pré-eleitoral (pesquisas mais fundamentos) e, à noite, **mantêm só as simulações compatíveis com o que já se sabe** ("keeping only the simulations consistent with the conditioned event"). O WaPo chama isso de alternativa quando há bom modelo pré-noite (C+J 2020). **Para nós:** só serviria antes dos primeiros dados. O projeto de Meloni (2.12) diz que usar pesquisa pré-eleitoral como ponto de partida melhorou o erro inicial em no máximo 0,05 p.p. O ticket 04 aponta risco legal em publicar projeção baseada em pesquisas antes das 17h.

### 2.12 Brasil

#### Veículos

- **Datafolha/Folha (2º turno de 2022).** "Por meio de um sistema próprio", projeta o resultado considerando "o peso que cada mesorregião tem em relação ao total de eleitores de cada estado". Quando há "um número razoável de votos apurados em todas as mesorregiões", estima-se o ponto em que um candidato não pode mais ser ultrapassado (A Gazeta, com conteúdo da Folha, 30/10/2022, <https://www.agazeta.com.br/es/politica/datafolha-projeta-vitoria-de-lula-na-disputa-pela-presidencia-1022>). A projeção saiu com 91,02% das seções (Forbes Brasil, <https://forbes.com.br/forbes-money/2022/10/datafolha-projeta-vitoria-de-lula-no-2o-turno-da-eleicao-presidencial/>). Ou seja, é uma **pós-estratificação por mesorregião** usada como critério de decisão, sem margem publicada. Para comparar: o Sibila diz que, reencenando o mesmo 2º turno de 2022, o intervalo de 95% de seu modelo por seção ficou inteiro acima de 50% para Lula já com 16,5% das seções (abaixo).
- **Estadão, G1/Globo, UOL, Núcleo, Agência Lupa:** não achei metodologia publicada de projeção durante a apuração, nem em 2022 nem no 1º turno de 2026. As buscas só trouxeram coberturas do placar parcial e modelos pré-eleitorais. Ver "sem resposta".

#### Projetos abertos (2026)

São repositórios de terceiros, feitos neste ciclo eleitoral. As descrições e os números de desempenho são **autodeclarados**: li o README e o código, mas não reproduzi nada.

- **Sibila** (<https://github.com/carlos-schwabe/sibila>; motor em `app/engine.js`).
  - *Entradas:* o 1º turno por seção. Para 2026, lê cerca de 1 milhão de boletins de urna da API de resultados e os decodifica (ASN.1). Para 2022, usa os dados abertos `votacao_secao_2022_BR` e `detalhe_votacao_secao_2022`.
  - *Projeção:* para cada seção não totalizada, % de Lula = % no 1º turno + *swing* médio das seções já totalizadas da área mais fina com dados suficientes, na hierarquia local de votação → zona → município → UF → Brasil. Os limiares estão em `DEFAULT_PROJ`: `minFrac = [0, 0.05, 0.2, 0.3, 0.5]` dos votos esperados e `minSec = [1, 30, 10, 8, 2]` seções, por nível. O tamanho da seção = votos no 1º turno × razão (votos válidos no 2º turno ÷ votos no 1º turno) da área. O % é calculado sobre todos os votos. O autor nota que usar só os dois finalistas reduziria a variância do *swing* em cerca de 30%.
  - *Incerteza:* soma de ruído entre seções, erro amostral da média da área e variância entre áreas dos níveis pulados. Metade desta última é tratada como viés comum (`biasCorr = 0.5`), "porque a ordem de apuração não é aleatória". Intervalo de 95% normal. Calcula `pWin = Φ((share − 0,5)/se)`, mas a tela usa estados: "indefinida", "provável vencedor" (intervalo inteiro de um lado, com pelo menos 5% das seções) e "eleito" (vantagem maior que os aptos que faltam).
  - *Curva:* reproduz a curva real na ordem real (`DT_PRIM_TOT_PARCIAL_HOR_TSE`, ver ticket 02), mas só publica o histórico das projeções. Não projeta a trajetória.
  - *Desempenho (2º turno de 2022, autodeclarado):* erro de −0,22 p.p. com 5%, −0,40 com 10%, −0,01 com 25%, +0,09 com 50%, +0,04 com 75% e +0,01 com 90%. O IC 95% conteve o resultado final em 100% de 1.000 instantes. Primeira definição com 16,5% (17h43), e nenhum instante indicou o vencedor errado. **Sem o 1º turno, a cobertura cai para 70%.**
- **Meloni, `eleicoes-2026`** (<https://github.com/lnmeloni/eleicoes-2026>; Luís Meloni, FEA-USP).
  - *Projeção:* delta por município = % atual − % do candidato equivalente na eleição anterior. Municípios com dados usam o próprio parcial. Municípios sem dados usam o resultado anterior + o delta médio da UF, ponderado pelos votos apurados. Nas 190 cidades com várias zonas, a unidade é a zona.
  - *Incerteza:* *bootstrap* sobre as unidades já apuradas + um termo sistemático que diminui com o avanço. Abaixo de 2% das seções a projeção é marcada como "instável". Não mostra chance de vitória.
  - *Testado e rejeitado:* regressão do delta com tamanho do município, *ridge* e ajuste por microrregião (bom em 2022, quase o dobro do erro da média por UF fora da amostra); covariáveis do Censo 2022 (ajudaram num par de eleições e pioraram noutro); pesquisa pré-eleitoral como ponto de partida (no máximo 0,05 p.p. de ganho no erro inicial).
  - *Desempenho (autodeclarado):* erro médio em Lula de 0,13 p.p. no ensaio do 1º turno de 2022 (base 2018), 0,17 p.p. no ensaio do 2º turno de 2022 (base 1º turno de 2022) e 0,20 p.p. **ao vivo** no 1º turno de 2026 (base 2022), medido minuto a minuto entre 2% e 99%. Abaixo de 2%, o erro passou de 4 p.p., e de 10 p.p. nos primeiros minutos do ensaio de 2022. O autor avisa que os ensaios serviram para escolher o modelo e dimensionar a margem, então só a noite de 2026 é fora da amostra. Houve buracos de 25 a 50 minutos sem projeção porque o cálculo ficou atrás da coleta.
- **votei** (<https://github.com/alvimpl/votei>; `projecao.js`).
  - *Projeção por município:* % de A no 2º turno = a + t·o + δ, em que *a* é o % do candidato no 1º turno, *o* é o % dos demais candidatos, *t* é a taxa de transferência e δ é o desvio do estado, com encolhimento hierárquico país → região → estado. O parcial observado do município é combinado com a projeção pelo peso n/(n + n₀). O comparecimento sai da razão votos válidos/aptos em relação ao 1º turno, por estado.
  - *Incerteza:* 4.000 simulações que sorteiam *t*, os desvios nacional, regionais e estaduais, o comparecimento e o ruído residual. A chance de vitória é a fração de simulações vencidas.
  - *Curva:* não projeta a trajetória e não modela a ordem.
  - *Desempenho:* tem um script de ensaio de 2022, mas não publica números.
- **Contraexemplo: extrapolação ingênua por UF** (relato no TabNews sobre o 1º turno de 2026, <https://www.tabnews.com.br/vitorpereirasaas/com-36-por-cento-das-urnas-apuradas-o-claude-code-projetou-a-eleicao-o-que-fez-dar-certo-nao-foi-o-modelo>). Supõe que "o voto que falta em cada estado segue o percentual já apurado naquele estado", com 20.000 simulações de desvios **arbitrados**. Com 36,6% das seções projetou vantagem de 3,6 p.p. (o final foi 1,9) e errou 0,8 e 1,0 p.p. nos dois candidatos. *Inferência nossa:* dentro de cada UF a ordem também não é aleatória (capital e interior), e sem linha de base essa distorção vai direto para a projeção. Lição operacional do mesmo relato: o arquivo nacional do TSE ficou parado em 64,81% por cerca de 30 minutos, e a soma dos arquivos por UF mais o exterior (`zz`) bateu com ele quando voltou.

#### Academia brasileira

Não achei artigo, dissertação ou *preprint* brasileiro sobre projeção durante a apuração. As buscas (SciELO, arXiv, Redalyc) só trouxeram modelos de escolha do eleitor e previsões pré-eleitorais.

### 2.13 Quadro comparativo

| Método | Unidade | Linha de base | Projeção do voto que falta | Incerteza e chance | Ordem de chegada | Desempenho conhecido |
|---|---|---|---|---|---|---|
| WaPo 2020 | condado | eleição anterior + demografia | regressão quantílica da mudança | conformal; intervalo, sem chance | mudança normalizada; calibração por estado | VA 2019: cobertura de 81% a 98% |
| WaPo 2022+ | condado ou *precinct* | idem | MQO de margem e comparecimento | *bootstrap* estratificado | idem + trajetória por condado | não achei |
| NYT | *precinct* ou condado | pesquisas, histórico, demografia | desvio de áreas parecidas | chance de vitória | linha de base; voto antecipado separado | 2016: Trump antes da AP |
| DDHQ | condado | eleição anterior | GEE + cópula | chance de vitória | só unidades completas | autodeclarado |
| *Exit poll* (RU) | seção do painel → distrito | eleição anterior | regressão da mudança | probabilidade por distrito | painel elimina | não medido aqui |
| CSIR | distrito de votação | agrupamentos | média por agrupamento | não detalhado | agrupamentos | 2014 falhou |
| Datafolha | mesorregião | eleitorado | pós-estratificação | sem margem publicada | espera dados em todas as mesorregiões | chamou com 91% |
| Sibila | seção | 1º turno | *swing* hierárquico | componentes + viés comum; Φ | linha de base por seção | 2022: ±0,1 p.p. a partir de 25% |
| Meloni | município ou zona | eleição anterior | delta próprio ou da UF | *bootstrap* + sistemático | delta | 0,17–0,20 p.p. médio |
| votei | município | 1º turno | transferência + desvio | 4.000 simulações | não modela | não publicado |

---

## 3. Como projetar a curva

**O que existe.** Nenhuma fonte que achei publica a trajetória projetada do placar parcial. Há três peças aproveitáveis:

- O NYT planejava dizer "what data we think we'll get … and in what order" (Reuters Institute).
- O modelo do WaPo corrige condados quase completos pela trajetória de contagem de condados parecidos (código *bootstrap*).
- Charles Stewart III (MIT) estuda empiricamente a curva real dos EUA, o % de um candidato contra o % de votos contados, e mostra trajetórias não lineares, com subidas e descidas (<https://electionupdates.caltech.edu/2024/10/31/blue-shift-red-shift>), mas não a projeta.

**Decomposição proposta** (*inferência nossa*, a validar com *backtest*). A curva projetada sai de duas peças independentes:

1. **Projeção por unidade** (qualquer das opções da seção 5): para cada seção ou município *u* ainda não totalizado, os votos válidos esperados V̂ᵤ e os votos de Lula e de Flávio, L̂ᵤ e F̂ᵤ.
2. **Modelo de ordem**: em que ordem as unidades que faltam devem entrar.

Se π é a ordem projetada e S₀ o número de seções já totalizadas, o placar parcial projetado de Lula quando *k* seções estiverem totalizadas é:

  P(k) = (L_obs + Σ_{u ∈ primeiras (k − S₀) seções de π} L̂ᵤ) / (V_obs + Σ V̂ᵤ)

P(k) vai do ponto atual até 100%, e P(100%) é, por construção, igual à projeção. A virada projetada é o primeiro *k* em que P(k) cruza 50%.

**Modelos de ordem possíveis**, do mais fino ao mais grosso:

- **(a) Repetir a ordem do 1º turno de 2026, seção a seção ou município a município.** Ordena as seções que faltam pelo horário de totalização no 1º turno. São as mesmas seções, a mesma logística dos TREs e o mesmo horário único. Dependência: o horário de totalização por seção do 1º turno de 2026. Há indício de que existe: o Sibila usa `DT_PRIM_TOT_PARCIAL_HOR_TSE` para 2022, e Meloni reconstrói as noites "seção a seção a partir de boletins que registram o horário de chegada". Precisa ser confirmado nos tickets 02 e 03.
- **(b) Repetir a ordem do 2º turno de 2022.** Mesma lógica, com o 2º turno anterior. O 2º turno tem menos cargos e pode ter outro ritmo. As seções mudam entre ciclos, então seria preciso agregar por município ou zona.
- **(c) Curvas de conclusão por UF ou região.** Para cada UF, a fração de seções totalizadas em função do % nacional, tirada do 1º turno de 2026 ou do 2º turno de 2022. Dentro da UF, a ordem é aleatória, ou capital antes do interior. É mais grosso, mas basta saber o % por UF ao vivo.
- **(d) Ordem condicionada ao que já chegou.** Como os rankings históricos se deslocam no dia (atrasos de um TRE, por exemplo), a ordem dos que faltam pode ser o ranking histórico *entre as unidades que ainda faltam*, reescalonado. Isso é compatível com (a), (b) e (c).

**Incerteza da curva.** Sortear em conjunto (i) a projeção por unidade, das mesmas simulações da chance de vitória, e (ii) perturbações da ordem, como ruído no horário histórico ou *bootstrap* em blocos por zona ou TRE. Cada sorteio dá uma curva. A faixa entre os percentis 5 e 95 mostra a curva com incerteza, e a fração de sorteios em que há cruzamento dá uma "chance de virada" e a distribuição do ponto em que ela ocorre.

**Por que importa (dados reais):** no 1º turno de 2026 a vantagem de Flávio caiu 5,5 p.p. depois de 64,81% das seções. No 2º turno de 2022, a virada veio só por volta de 67,7%, com Lula vencendo por 1,8 p.p. (seção 1). *Inferência nossa:* se o 2º turno de 2026 for apertado e Lula vencer, a virada tende a ser tardia, e o ponto projetado é muito sensível ao modelo de ordem. Se Flávio vencer, pode não haver virada nenhuma, só uma vantagem que encolhe. A curva projetada precisa mostrar as duas possibilidades com a mesma clareza.

---

## 4. Lições que valem para qualquer método

- **Mudança, não nível.** Todos os bons resultados vêm de modelar a variação em relação a uma linha de base da mesma unidade: WaPo, *exit poll*, Sibila, Meloni. Sem o 1º turno, a cobertura do Sibila cai de 100% para 70%.
- **Quanto mais fina a linha de base, menos a ordem de chegada atrapalha.** Com base por seção, a ordem dentro do município deixa de ser problema. Com base por município, sobra o viés dentro do município (capital ou centro chegam antes?). Meloni usa zona nas 190 cidades com várias zonas por isso.
- **Separar votos válidos e divisão do voto.** O WaPo modela margem e comparecimento separadamente. O Sibila e o votei estimam o comparecimento por área. Abstenção, brancos e nulos mudam entre turnos.
- **Erros correlacionados.** Unidades da mesma área erram juntas. É preciso um termo de viés comum (Sibila), desvios hierárquicos simulados (votei) ou *bootstrap* estratificado (WaPo). Supor independência deixa os intervalos estreitos demais. Somar limites, largos demais (WaPo, dez/2020).
- **Não mostrar cedo demais.** O WaPo só liga o modelo com dezenas de unidades completas. O NYT só publica com "dados suficientes". Meloni marca como instável abaixo de 2%. Os erros dos primeiros minutos passaram de 4 p.p. (Meloni).
- **Critério determinístico.** "Matematicamente definido" quando a vantagem é maior que os aptos que faltam (Sibila). O próprio TSE exibiu "matematicamente definida" no 1º turno de 2026 com 97,01% (Jornal do Comércio). A chance de vitória deve ser 100% nesse ponto e consistente com ele antes.
- **Operação.** Ter fonte alternativa quando o arquivo nacional trava, como somar UFs mais o exterior (TabNews). Garantir que o cálculo não fique atrás da coleta (Meloni teve buracos de 25 a 50 minutos). Registrar cada leitura para auditar depois. O WaPo dá controles manuais (excluir unidades, parar o modelo).
- **Comunicação.** O WaPo mostrou o voto conhecido mais uma faixa difusa, assimétrica quando necessário. O NYT defende que esconder a tremulação "only hides the uncertainty" e diz que o ponteiro não é para declarar vencedor (Reuters Institute).

---

## 5. Opções viáveis para uma equipe pequena com cerca de uma semana

As quatro opções compartilham a coleta ao vivo, a linha de base do 1º turno de 2026, a validação e o módulo de curva da seção 3. Diferem na unidade e em como projetam o voto que falta. Avaliações de esforço são nossas.

### Opção 1 — *Swing* entre turnos por município, com recuo hierárquico (recomendação de partida)

- **Entradas:** 1º turno de 2026 por município (Flávio, Lula, demais, brancos, nulos, comparecimento, aptos, número de seções); ao vivo, por município, votos e seções totalizadas, e de preferência os aptos e o comparecimento das seções totalizadas (ticket 01); tabela município → região geográfica imediata ou intermediária (IBGE) → UF → região.
- **Voto não totalizado:**
  - Município com dados: % do candidato nas seções que faltam = % no 1º turno + *swing* do próprio município, combinado com o *swing* da área-mãe por um peso n/(n + n₀), como no votei.
  - Município sem dados: *swing* da área mais fina com dados suficientes, como no Sibila e em Meloni.
  - Votos válidos que faltam: aptos (ou votos do 1º turno) das seções que faltam × razão de votos válidos 2º/1º turno medida na área.
  - Medir o *swing* sobre os dois finalistas.
- **Incerteza e chance:** simulação (milhares de sorteios) com desvio nacional, regional, estadual e municipal e um termo de viés comum, ou fórmula analítica como no Sibila. Chance = fração de sorteios em que Lula ou Flávio tem mais votos válidos.
- **Curva:** modelo de ordem (c), por UF, que só exige o % por UF ao vivo, ou (a)/(b) por município se houver horários históricos.
- **Prós:** poucos dados (cerca de 5.570 municípios mais o exterior); usa a mesma unidade que o site mostra ("lugar"); fácil de explicar; tem paralelo com desempenho autodeclarado bom (Meloni, 0,17–0,20 p.p.).
- **Contras:** sobra o viés de ordem *dentro* do município, que pesa nas capitais grandes; menos preciso nos primeiros minutos que a versão por seção.
- **Esforço:** baixo a médio, factível em uma semana com *backtest* de 2022.

### Opção 2 — *Swing* entre turnos por seção (ou zona), estilo Sibila

- **Entradas:** 1º turno de 2026 **por seção**, seja dos dados abertos se já publicados (ticket 03), seja dos boletins de urna da API, como fez o Sibila; ao vivo, resultados por seção ou ao menos por zona com a lista de seções totalizadas (ticket 01).
- **Voto não totalizado:** % da seção no 1º turno + *swing* médio da área mais fina com dados suficientes (local de votação → zona → município → UF).
- **Incerteza e chance:** componentes de variância com viés comum, ou simulação. Chance = Φ ou fração de sorteios.
- **Curva:** ordem (a), seção a seção, se houver os horários do 1º turno de 2026.
- **Prós:** o melhor desempenho autodeclarado que achei (−0,22 p.p. com 5%, ±0,1 p.p. a partir de 25%, no 2º turno de 2022); neutraliza a ordem dentro do município; dá a curva mais fina.
- **Contras:** cerca de 500 mil seções; depende de dados por seção ao vivo e da linha de base por seção de 2026, que podem não existir ou ser pesados de obter (decodificar boletins). Se o *feed* ao vivo só der UF ou zona, vira na prática uma versão por zona. Mais pontos de falha na noite.
- **Esforço:** médio a alto. Só vale se os tickets 01 e 03 confirmarem os dados.

### Opção 3 — Transferência de votos dos demais candidatos + desvio regional, com simulação (estilo votei)

- **Entradas:** as mesmas da opção 1.
- **Voto não totalizado:** % de Lula no 2º turno = % no 1º turno + t·(% dos demais) + δ_hierárquico, com taxas de transferência estimadas nos municípios já totalizados. Pode ter uma taxa por região, e a razão de comparecimento é tratada à parte.
- **Incerteza e chance:** sorteio de *t*, dos desvios e do comparecimento. Chance = fração de sorteios.
- **Prós:** responde a uma pergunta que o leitor entende ("para onde vão os 7,8% dos demais"); pode ser mais estável que o *swing* puro quando o padrão de transferência é regular.
- **Contras:** inferência ecológica, porque a transferência varia por lugar e pode confundir-se com abstenção; mais parâmetros, instáveis no começo; sem desempenho publicado. *Inferência nossa:* serve mais como variante a comparar com a opção 1 no *backtest* do que como caminho principal.
- **Esforço:** médio.

### Opção 4 — Pós-estratificação simples por estrato (plano B, estilo Datafolha)

- **Entradas:** 1º turno de 2026 por estrato (mesorregião ou UF × capital/interior) e o placar parcial por estrato.
- **Voto não totalizado:** em cada estrato, % no 1º turno + *swing* médio do estrato, ponderado pelo eleitorado do estrato. A projeção só é exibida quando todos os estratos têm dados mínimos, como no critério do Datafolha.
- **Incerteza e chance:** *bootstrap* simples dos municípios dentro de cada estrato, com um termo comum.
- **Prós:** implementável em horas; robusto; serve de conferência e de plano B se a opção principal falhar na noite.
- **Contras:** grosso; precisa de dados em todos os estratos e por isso demora a aparecer; incerteza *ad hoc*.
- **Esforço:** baixo.

### Não recomendados para esta semana

- **Extrapolação por UF sem linha de base:** errou cerca de 1 p.p. e quase dobrou a margem com 36,6% no 1º turno de 2026 (TabNews).
- **Regressão com covariáveis demográficas + predição conformal (WaPo):** é o método mais elaborado, e o pacote é aberto (`elex-model`), mas foi feito para os dados dos EUA, exige um esquema de dados próprio, e as covariáveis do Censo não melhoraram de forma consistente no Brasil (Meloni). Fica para depois.
- **Pesquisas como *prior*:** ganho de no máximo 0,05 p.p. (Meloni) e risco legal antes das 17h (ticket 04).

### Validação comum (vale para qualquer opção)

1. Reencenar o 2º turno de 2022 com a base do 1º turno de 2022, na ordem real (dados do ticket 02).
2. Reencenar o 1º turno de 2026 para a vantagem entre os dois primeiros, com a base de 2022, como fez Meloni.
3. Medir, para cada % de seções: erro da projeção, cobertura do intervalo, momento da primeira projeção correta e calibragem da chance de vitória. Para a curva: erro do ponto de virada projetado e da curva projetada contra a curva real.
4. Com só duas ou três noites de teste, a calibragem fica fraca. Dimensionar a margem sem esquecer que a escolha do modelo usa as mesmas noites, o mesmo cuidado que Meloni declara.

---

## 6. O que ficou sem resposta

- **NYT:** a página de metodologia e o vídeo de 2024 não puderam ser lidos (bloqueio do nytimes.com). Usei um texto de 2018 republicado e uma entrevista de 2024.
- **DDHQ:** o artigo completo do HDSR deu 403. Só tenho o resumo (GEE + cópula, unidades completas). Sem números de calibragem.
- **The Economist:** não achei modelo de noite eleitoral. Talvez não exista.
- **Pavía-Miralles (2005), Pavía, Larraz e Montero (2008), Bernardo e Girón (1992), Curtice e Firth (2008):** só li resumos ou descrições de terceiros. Não sei as equações exatas.
- **Veículos brasileiros:** além do Datafolha (método descrito em uma frase), não achei metodologia do Estadão, G1/Globo, UOL, Núcleo ou Lupa para projeção durante a apuração, nem em 2022 nem no 1º turno de 2026. Pode haver material pago ou em vídeo.
- **Academia brasileira:** nenhum trabalho achado sobre projeção durante a apuração.
- **Projetos abertos:** os números do Sibila, de Meloni e do votei são autodeclarados e eu não os reproduzi. Os repositórios são recentes. Vale rodar o *backtest* do Sibila e do votei antes de usar os números como referência.
- **Dados que decidem entre as opções (outros tickets):**
  - O que o *feed* ao vivo do TSE traz por município, zona e seção: votos, seções totalizadas, aptos e comparecimento das seções totalizadas (ticket 01).
  - Se existe e onde está o horário de totalização por seção em 2022 e no 1º turno de 2026 (`DT_PRIM_TOT_PARCIAL_HOR_TSE`, citado pelo Sibila e não confirmado em documentação do TSE). Disso depende o modelo de ordem (a) ou (b) da curva (ticket 02).
  - Se o resultado por seção do 1º turno de 2026 já está nos dados abertos ou se só sai pelos boletins de urna (ticket 03).
- **Não verificado:** se a regra de horário único de 2022 continua em 2026. Os primeiros dados do 1º turno, pouco depois das 17h, sugerem que sim (ticket 02).

---

## Fontes

- Washington Post, *write-up* de out/2020: <https://s3.us-east-1.amazonaws.com/elex-models-prod/2020-general/write-up/election_model_writeup.pdf>
- Washington Post, atualização de dez/2020: <https://s3.us-east-1.amazonaws.com/elex-models-prod/elex-models-prod/2020-general/write-up/election_model_writeup_update1.pdf>
- Bronner, Johri e Bowers, C+J 2020: <https://bpb-us-e1.wpmucdn.com/sites.northeastern.edu/dist/0/367/files/2020/02/CJ_2020_paper_27.pdf>
- `elex-live-model`: <https://github.com/washingtonpost/elex-live-model>; modelo *bootstrap*: <https://github.com/washingtonpost/elex-live-model/blob/develop/src/elexmodel/models/BootstrapElectionModel.py>; PyPI: <https://pypi.org/project/elex-model/2.1.0>
- NYT (Cohn e Katz, 2018, via WRAL): <https://www.wral.com/archive/17414570/>
- Reuters Institute sobre o NYT (2024): <https://reutersinstitute.politics.ox.ac.uk/news/moving-needle-how-new-york-times-aims-guide-readers-through-americas-most-uncertain-election>
- DDHQ, HDSR 2024: <https://hdsr.mitpress.mit.edu/pub/zr6hjsfl>; HDSR 2022: <https://hdsr.mitpress.mit.edu/pub/ftwzgrij/release/4>
- AP *expected vote* (via WBTV): <https://www.wbtv.com/2026/03/02/how-ap-uses-expected-vote-instead-precincts-reporting-when-determining-winner>
- The Economist, modelo pré-eleitoral (HDSR): <https://hdsr.mitpress.mit.edu/pub/yoa73r1m/release/1>
- Gelman e Silver (2010): <https://sites.stat.columbia.edu/gelman/research/published/electionnight4.pdf>
- Firth, *exit poll explainer*: <https://warwick.ac.uk/fac/sci/statistics/staff/academic-research/firth/exit-poll-explainer/>; Curtice e Firth (2008): <https://doi.org/10.1111/j.1467-985X.2007.00536.x>, <https://strathprints.strath.ac.uk/8807/>
- bpb, *Hochrechnung*: <https://www.bpb.de/themen/politisches-system/wahlen-in-deutschland/335663/prognosen-hochrechnungen-umfragen/>
- Pavía-Miralles (2005): <https://doi.org/10.1198/016214504000001835>, resumo em <https://academicnewsletter.sufe.edu.cn/info/445759>; Pavía, Larraz e Montero (2008): <https://doi.org/10.1198/016214507000001427>; Bernardo e Girón (1992): <https://academic.oup.com/book/54041/chapter/422209463>
- CSIR: Holloway et al. (2018) <https://orion.journals.ac.za/pub/article/view/581>; página de 2024 <https://www.csir.co.za/2024-national-elections-predictions-csir-once-again-set-forecast-south-african-general-elections>; Greben et al. (2006) <https://doaj.org/article/99289085a2cd44119504d5c4a860a346>
- México: <https://posit.co/resources/videos/mexican-electoral-quick-count-night-with-r-maria-ortiz-mancera>; <https://github.com/tereom/quickcountmx>
- Stewart, *Blue shift, red shift?*: <https://electionupdates.caltech.edu/2024/10/31/blue-shift-red-shift>
- Datafolha 2022: <https://www.agazeta.com.br/es/politica/datafolha-projeta-vitoria-de-lula-na-disputa-pela-presidencia-1022>; <https://forbes.com.br/forbes-money/2022/10/datafolha-projeta-vitoria-de-lula-no-2o-turno-da-eleicao-presidencial/>
- Virada de 2022: <https://www.expreso.com.pe/top-de-noticias/lula-lidera-con-5001-frente-a-bolsonaro-con-4999-segunda-vuelta-en-brasil-al-6776-del-escrutinio/872304/>
- 1º turno de 2026, linha do tempo: <https://www.jornaldocomercio.com/politica/2026/10/1265322-eleicoes-2026-apuracao-e-os-resultados-do-primeiro-turno.html>
- Horário único (2021/2022): <https://www.tnh1.com.br/noticia/nid/tse-unifica-horario-de-votacao-nas-eleicoes-de-2022/>
- Sibila: <https://github.com/carlos-schwabe/sibila> (motor: <https://github.com/carlos-schwabe/sibila/blob/main/app/engine.js>)
- Meloni, `eleicoes-2026`: <https://github.com/lnmeloni/eleicoes-2026>
- votei: <https://github.com/alvimpl/votei> (motor: <https://github.com/alvimpl/votei/blob/main/projecao.js>)
- TabNews (1º turno de 2026): <https://www.tabnews.com.br/vitorpereirasaas/com-36-por-cento-das-urnas-apuradas-o-claude-code-projetou-a-eleicao-o-que-fez-dar-certo-nao-foi-o-modelo>
