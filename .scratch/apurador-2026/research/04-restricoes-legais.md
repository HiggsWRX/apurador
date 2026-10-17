# Restrições legais ao Apurador no 2º turno de 2026

Pesquisa para o ticket [04 — Restrições legais à projeção](../issues/04-restricoes-legais.md). Fontes consultadas em 17/10/2026.

> **Isto não é parecer jurídico.** É um levantamento de normas e decisões feito por quem não é advogado, para orientar decisões de produto. Antes de publicar, um advogado eleitoral deve revisar os pontos marcados como *incerto*.

Convenções deste documento:

- **Norma:** texto (ou paráfrase fiel) de lei, resolução ou decisão, com a fonte.
- **Interpretação:** leitura nossa, sem decisão ou norma que a confirme diretamente.
- **Incerto:** ponto em aberto, que não foi possível fechar com fontes primárias.

Os termos do produto (placar parcial, projeção, chance de vitória, agregado de pesquisas, pesquisa, % de seções totalizadas) seguem o `GLOSSARY.md`.

---

## Resumo

1. **Projeção e chance de vitória feitas só com resultados oficiais e eleições passadas não são "pesquisa eleitoral"** no sentido da Lei 9.504/97, art. 33, e da Res. TSE 23.600/2019. Pesquisa eleitoral é levantamento de opinião junto a uma amostra de eleitores, com plano amostral, questionário e entrevistas. Por isso a projeção não exige registro no PesqEle. *Interpretação*: nenhuma norma trata expressamente de projeções a partir da apuração e não achamos decisão sobre o tema.
2. **Não existe horário legal específico para a projeção**, mas na prática ela só pode começar às **17h de Brasília de 25/10**. Antes disso não há dado oficial: o TSE só libera o resultado de Presidente a partir das 17h (Res. 23.751/2026, art. 265, § 1º).
3. **O que traz risco é a projeção ou o agregado de pesquisas publicados *antes* das 17h, calculados a partir de pesquisas.** Para o TSE, um conteúdo com percentuais, margem de erro, índices ou intenções de voto e menção a instituto pode ser tratado como pesquisa. Publicado sem registro, ele pode gerar multa de R$ 53.205 a R$ 106.410 (Res. 23.600, art. 17). Nenhuma norma trata de agregadores, então é zona cinzenta.
4. **Mostrar pesquisas registradas é permitido, inclusive no dia da eleição** (Res. 23.600, art. 11), desde que se informem os seis dados do art. 10, incluído o número de registro. A pesquisa de boca de urna só pode sair a partir das 17h (art. 12). Quem republica pesquisa irregular também responde (art. 21). Uma pesquisa pode ser suspensa pela Justiça ou passar a contar como "não registrada" depois de publicada.
5. **Enquetes com visitantes ("quem vai ganhar?") são proibidas** desde 15/08 (Lei 9.504, art. 33, § 5º; Res. 23.600, art. 23).
6. **Dados do TSE podem ser usados e redistribuídos.** O portal de dados abertos marca os conjuntos de resultados, candidatos, eleitorado e pesquisas como **CC-BY**, e a atribuição é obrigatória. Para os arquivos ao vivo, o TSE diz que **não é preciso cadastro nem convênio**, mas há duas regras: é **proibido alterar o conteúdo** dos dados distribuídos (Res. 23.751, art. 267, § 4º), e o limite é de **100 requisições por segundo por IP**, com bloqueio de 10 minutos para quem passar dele.
7. **IA**: entre **22/10 e 26/10 às 17h** é proibido publicar conteúdo sintético novo, gerado por IA, com imagem, voz ou fala de candidato, mesmo rotulado (Res. 23.610, art. 9º-B, § 3º-A, e calendário Res. 23.760/2026).
8. **Neutralidade**: o site não deve veicular propaganda de ninguém, nem embutir conteúdo de campanha. Site de pessoa jurídica não pode ter propaganda nem de graça (Lei 9.504, art. 57-C, § 1º, I). Também não deve parecer resultado oficial nem dar margem a leituras de fraude.

---

## 1. Projeção e chance de vitória calculadas com resultados oficiais

### 1.1 O que a norma chama de pesquisa eleitoral

- **Norma (Lei 9.504/97, art. 33, caput):** quem tem de registrar são "as entidades e empresas que realizarem pesquisas de opinião pública relativas às eleições ou aos candidatos, para conhecimento público". O registro deve ser feito até cinco dias antes da divulgação e trazer: contratante, valor e origem dos recursos, metodologia e período, "plano amostral e ponderação quanto a sexo, idade, grau de instrução, nível econômico e área física", intervalo de confiança e margem de erro, sistema de controle da coleta de dados e do trabalho de campo, questionário completo e quem pagou. Fonte: <https://www.planalto.gov.br/ccivil_03/leis/l9504.htm>, art. 33, I a VII.
- **Norma (Res. TSE 23.600/2019, compilada, art. 2º):** repete os requisitos e acrescenta a nota fiscal (VIII) e o estatístico responsável com registro no Conselho Regional de Estatística (IX). A Res. 23.747/2026 exige ainda uma declaração do estatístico. Depois, o registro deve ser complementado com o número de eleitores pesquisados por setor censitário e a composição da amostra (§ 7º, IV). Fonte: <https://www.tse.jus.br/legislacao/compilada/res/2019/resolucao-no-23-600-de-12-de-dezembro-de-2019>.
- **Norma (TSE, texto explicativo):** a pesquisa eleitoral "utiliza método científico para apurar a realidade do momento junto a segmentos representativos do eleitorado, chamados de amostra". Fonte: notícia TSE de 9/6/2022, <https://www.tse.jus.br/imprensa/noticias-tse/2022/Junho/pesquisas-eleitorais-voce-sabe-o-que-sao>. É material de divulgação, não norma.
- **Jurisprudência (TSE, AI nº 28813, rel. Min. Luís Roberto Barroso, DJE 25/02/2019, citado no acórdão TRE-AL abaixo):** "para que seja caracterizada pesquisa eleitoral, é necessária a indicação, dentro do rigor técnico-científico que a define, de percentuais, margem de erro, índices ou intenções de votos e alusão ao instituto responsável pelo levantamento". No caso, um gráfico de linhas sem percentuais foi considerado propaganda, não pesquisa.
- **Jurisprudência (TRE-AL, RE 0600682-61.2020.6.02.0026, julg. 17/08/2021):** um gráfico "informal e genérico", sem os elementos técnico-científicos de uma pesquisa, não configura pesquisa sem registro. A decisão foi por maioria e o voto vencido entendeu que gráficos com percentuais bastavam para configurar pesquisa. Fonte: <https://static.tre-al.jus.br/pan/pan8778193763280016652.pdf>.
- **Jurisprudência (TSE, AgR-REspe nº 177-25.2016.6.14.0027, rel. Min. Tarcisio Vieira de Carvalho Neto, DJE 29/10/2019):** percentuais de intenção de voto com gráficos, apresentados como "pesquisa", foram tratados como pesquisa sem registro "a ensejar ilusão do eleitorado". Fonte: compilação TRE-SE "Temas selecionados do TSE: pesquisa eleitoral", <https://www.tre-se.jus.br/jurisprudencia/Temas%20selecionados%20TSE/temas-selecionados-do-tse-a-partir-de-30-06/tre-se-temas-selecionados-tse-pesquisa-eleitoral>.

**Interpretação.** Uma projeção que usa só votos já totalizados pelo TSE e resultados de eleições passadas não consulta eleitor nenhum. Ela não tem amostra de entrevistados, nem questionário, nem trabalho de campo. Não é, portanto, "pesquisa de opinião pública" no sentido do art. 33, e não há como registrá-la no PesqEle, que pede justamente esses elementos. Além disso, quando a projeção começa (depois das 17h), a votação já terminou: o bem que a regra de pesquisas protege, a formação livre da vontade do eleitor, já não está em jogo. Emissoras e portais costumam divulgar análises da apuração em andamento sem registro. *Incerto*: não achamos norma, consulta ou decisão do TSE que trate expressamente de "projeção a partir de resultados parciais oficiais".

### 1.2 Horário

- **Norma (Res. 23.751/2026, atos gerais das Eleições 2026, art. 265, § 1º):** "A divulgação do resultado para o cargo de Presidente da República será liberada a partir das 17h (dezessete horas) do horário de Brasília, para todas as unidades da Federação e do exterior". Fonte: <https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-751-de-26-de-fevereiro-de-2026>.
- **Norma (Res. 23.751/2026, art. 160):** a votação termina às 17h de Brasília. O calendário (Res. 23.760/2026, 25 de outubro, item 10) diz que os resultados são divulgados a partir das 17h. Fonte: <https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-760-de-2-de-marco-de-2026>.
- **Norma revogada / inconstitucional:** o art. 35-A da Lei 9.504 proibia divulgar pesquisas "a partir do décimo quinto dia anterior até as 18 (dezoito) horas do dia do pleito". O STF o declarou inconstitucional nas ADIs 3741, 3742 e 3743, em 6/9/2006, por restringir o direito à informação do eleitor. Fontes: Planalto, nota "Vide ADIN 3.741-2"; STF, <https://noticias.stf.jus.br/postsnoticias/direto-do-plenario-stf-declara-inconstitucional-em-parte-lei-que-regula-campanhas-politicas/>.
- **Norma ainda no texto, mas sem aplicação:** o Código Eleitoral, art. 255, ainda diz que "Nos 15 (quinze) dias anteriores ao pleito é proibida a divulgação, por qualquer forma, de resultados de prévias ou testes pré-eleitorais" (<https://www.planalto.gov.br/ccivil_03/leis/l4737compilado.htm>). A própria Res. 23.600, art. 11, permite divulgar pesquisas "a qualquer momento, inclusive no dia das eleições". Um artigo do Boletim Científico da ESMPU, de 2004, afirma que o TSE considerou o art. 255 não recepcionado pela Constituição de 1988 (<https://escola.mpu.mp.br/publicacoescientificas/index.php/boletim/article/download/150/140/280>). *Incerto*: não localizamos a decisão do TSE que o artigo menciona. Na prática, a resolução vigente resolve a questão.

**Interpretação.** Nenhuma regra fixa horário para projeções. O limite das 17h vem do fato de que antes disso não existe placar parcial oficial. Se a projeção não usa pesquisas, também não há o que mostrar antes das 17h. Se a projeção da noite usar pesquisas como ponto de partida (*prior*), o risco das 17h em diante é baixo, pela razão do item 1.1: a votação já acabou. A seção 2.3 trata do caso antes das 17h.

### 1.3 Como apresentar, para não confundir com pesquisa nem com resultado oficial

**Interpretação** com base no AI 28813 e na Res. 23.600, art. 23, § 1º-A (enquete apresentada como pesquisa é tratada como pesquisa sem registro):

- Nunca chamar a projeção de "pesquisa" nem de "intenção de voto". Usar "projeção", "chance de vitória" e "placar parcial", como no glossário.
- Separar visualmente o placar parcial oficial (dados do TSE) da projeção (estimativa do site) e rotular a projeção como "estimativa estatística do Apurador; não é resultado oficial nem pesquisa eleitoral".
- Não usar o brasão nem a marca do TSE de modo que sugira que a projeção é oficial. Não achamos norma específica sobre isso; é recomendação de prudência.

---

## 2. Pesquisas eleitorais no modelo e no site

### 2.1 Usar pesquisas registradas internamente no modelo

- **Norma:** a Lei 9.504, art. 33, e a Res. 23.600 regulam o registro e a **divulgação** de pesquisas (Res. 23.600, art. 1º). Não achamos regra sobre o uso interno, não divulgado, de números de pesquisas já divulgadas.
- **Fonte de dados:** o conjunto "Pesquisas Eleitorais - 2026" do portal de dados abertos do TSE está marcado como CC-BY (`license_id: cc-by`, via API CKAN: <https://dadosabertos.tse.jus.br/api/3/action/package_show?id=pesquisas-eleitorais-2026>). Ele traz os metadados de registro do PesqEle. Os resultados das pesquisas são publicados pelos institutos e pela imprensa.

**Interpretação.** Usar pesquisas internamente é livre. O risco está no que se **publica** a partir delas (seção 2.3).

### 2.2 Mostrar pesquisas no site

- **Norma (Res. 23.600, art. 10):** quem divulga resultados de pesquisas, "atuais ou não", deve informar: I, o período de coleta; II, a margem de erro; III, o nível de confiança; IV, o número de entrevistas; V, o nome da entidade ou empresa que a fez e, se for o caso, de quem a contratou; VI, o número de registro. O art. 7º, § 1º, exige o número de identificação "da divulgação e da publicação".
- **Norma (Res. 23.600, art. 11):** pesquisas feitas antes do dia da eleição "poderão ser divulgadas a qualquer momento, inclusive no dia das eleições", desde que respeitado o prazo de 5 dias e informados os dados do art. 10. O calendário marca **19/10/2026** como último dia para registrar pesquisas que se queira divulgar no dia do 2º turno (Res. 23.760/2026).
- **Norma (Res. 23.600, art. 12, na redação da Res. 23.727/2024):** "A divulgação de levantamento de intenção de voto efetivado no dia das eleições somente poderá ocorrer a partir das 17h (dezessete horas) do horário de Brasília". Isso vale para a pesquisa de boca de urna, que também precisa estar registrada (art. 2º).
- **Norma (Res. 23.760/2026, Anexos II e III, dia da votação):** são permitidas "a divulgação, a qualquer momento, das pesquisas realizadas em data anterior à da eleição" e "a divulgação, a partir das 17 horas, horário de Brasília, das pesquisas realizadas no dia da eleição". São proibidas as enquetes.
- **Norma (Res. 23.600, art. 21):** quem publica pesquisa não registrada ou irregular, "inclusive o veículo de comunicação social", pode responder por isso, "mesmo que estejam reproduzindo matéria veiculada em outro órgão de imprensa".
- **Jurisprudência (TSE, AgR-AI nº 244-35.2016.6.05.0093, rel. Min. Tarcisio Vieira de Carvalho Neto, DJE 05/08/2019):** a proibição alcança tanto divulgar quanto compartilhar, "pouco importando eventual divulgação prévia". Fonte: compilação TRE-SE citada acima.
- **Norma (Lei 9.504, arts. 33, §§ 3º e 4º, e 35; Res. 23.600, arts. 17, 18 e 20):** divulgar pesquisa sem registro gera multa de R$ 53.205,00 a R$ 106.410,00. Divulgar pesquisa fraudulenta é crime (detenção de 6 meses a 1 ano, mais multa), e por ele podem responder também os representantes legais do "órgão veiculador".
- **Norma (Res. 23.600, art. 2º, §§ 7º, 7º-C e 7º-D, na redação da Res. 23.747/2026):** se o instituto não complementar o registro nos prazos, a pesquisa "será considerada não registrada". **O status de uma pesquisa pode mudar depois de ela ter sido publicada.**
- **Norma (Res. 23.600, art. 16, § 1º):** a Justiça Eleitoral pode suspender por liminar a divulgação de uma pesquisa registrada. Exemplo em 2026: o presidente do TSE suspendeu a divulgação da pesquisa AtlasIntel BR-06939/2026 sobre a disputa presidencial (<https://www.tse.jus.br/comunicacao/noticias/2026/Junho/tse-suspende-divulgacao-de-pesquisa-da-atlasintel-sobre-disputa-para-presidente-por-suspeita-de-inducao-ao-eleitor>).
- **Norma revogada / inconstitucional:** a proibição de divulgar pesquisas nos 15 dias anteriores (Lei 9.504, art. 35-A) não vale (ADI 3741). Ver 1.2.

**Interpretação.** Se o site exibir pesquisas, cada uma precisa vir com os seis dados do art. 10, ter o registro conferido no PesqEle e ter sido checada contra suspensões judiciais. Expor pesquisas expõe o responsável pelo site a multa e, em caso extremo (pesquisa fraudulenta), a responsabilidade penal. Para um projeto com prazo de 25/10, o caminho de menor risco é **não exibir pesquisas no núcleo ao vivo**, ou limitar-se a um link para o PesqEle.

### 2.3 Agregado de pesquisas e projeção baseada em pesquisas, antes das 17h

- **Norma:** nem a Lei 9.504, nem a Res. 23.600 compilada, nem a minuta de 2026 que virou a Res. 23.747 mencionam agregadores, médias de pesquisas, modelos ou projeções. Isso foi verificado por busca textual nos textos de <https://www.tse.jus.br/legislacao/compilada/res/2019/resolucao-no-23-600-de-12-de-dezembro-de-2019> e <https://www.tse.jus.br/servicos-judiciais/audiencias-publicas/arquivos/minutas/2026/pesquisas-eleitorais>.
- **Jurisprudência:** pelo critério do AI 28813 (percentuais, margem de erro, índices ou intenções de voto, menção a instituto), um "agregado de pesquisas" com percentuais por candidato e margem se parece muito com uma pesquisa.
- **Prática de mercado (não é norma):** o agregador de pesquisas presidenciais da Trademap (matéria de 28/08/2026) lista só pesquisas registradas, com o número de registro de cada uma, e informa que os números são apresentados "de forma bruta", sem ponderação nem suavização entre pesquisas (<https://trademap.com.br/noticias/news-8246380>). A matéria não diz se a razão é jurídica.

**Interpretação e incerteza.** Publicar antes da eleição, ou no dia antes das 17h, um agregado de pesquisas ou uma projeção do resultado calculada a partir de pesquisas cai numa **zona cinzenta**. A tese favorável é que o agregado não é uma nova pesquisa: não há coleta, ele só combina pesquisas registradas, e o STF protege o direito à informação (ADI 3741). A tese contrária é que o número publicado é um índice novo de intenção de voto, sem registro, que pode iludir o eleitor (AI 28813; AgR-REspe 177-25). Isso pode levar a representação de partido ou do MP, com pedido de remoção e multa. Não achamos decisão sobre agregadores. Mitigações possíveis: (a) não publicar agregado nem projeção antes das 17h de 25/10; (b) se publicar, mostrar ao lado cada pesquisa componente com os dados do art. 10 e deixar explícito que se trata de cálculo sobre pesquisas registradas, não de nova pesquisa; (c) não usar pesquisas não registradas, suspensas ou consideradas não registradas. A opção (a) elimina o risco. **Esta é a decisão que mais pede revisão de advogado eleitoral.**

### 2.4 Enquetes com visitantes: proibidas

- **Norma (Lei 9.504, art. 33, § 5º):** "É vedada, no período de campanha eleitoral, a realização de enquetes relacionadas ao processo eleitoral".
- **Norma (Res. 23.600, art. 23, na redação da Res. 23.747/2026):** a vedação vale "após o dia 15 de agosto do ano da eleição". O § 1º define enquete como levantamento sem plano amostral, que depende da participação espontânea ou tem viés de autosseleção. O § 1º-A diz que a enquete apresentada como pesquisa é tratada como pesquisa sem registro. O § 2º prevê ordem de remoção sob pena de crime de desobediência.
- **Jurisprudência (TSE, AgR-REspe nº 0607690-67.2018.6.19.0000, rel. Min. Jorge Mussi, DJE 14/08/2019):** a enquete em período vedado não atrai a multa do art. 33, § 3º. Fonte: compilação TRE-SE. *Nota*: o § 1º-A, incluído depois (Res. 23.676/2021), muda esse quadro quando a enquete é apresentada como pesquisa.

**Interpretação.** Nada de "Quem você acha que vai ganhar?", votações de visitantes ou "termômetros" de redes sociais no site.

---

## 3. Dados do TSE: licença, termos e regras de uso

### 3.1 Arquivos de resultados ao vivo (resultados.tse.jus.br)

- **Norma (Res. 23.751/2026, arts. 264 a 269, "Da divulgação dos resultados"):**
  - Art. 264: a Justiça Eleitoral usa exclusivamente sistemas próprios **para a sua própria divulgação**, feita nos sites da Justiça Eleitoral e no aplicativo Resultados.
  - Art. 267: os dados ficam disponíveis "até 4 de abril de 2028". O § 1º diz que são distribuídos "às entidades interessadas na divulgação". O § 2º põe a infraestrutura de comunicação por conta da entidade. O § 3º manda buscar os arquivos periodicamente. O **§ 4º diz: "É vedado às entidades mencionadas neste artigo promover qualquer alteração de conteúdo dos dados distribuídos pela Justiça Eleitoral"**.
  - Art. 268: a entidade não pode aumentar o preço de seus serviços por causa dos dados.
  - Art. 269: quem descumprir pode ter o acesso negado ou ser desconectado.
  - Fonte: <https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-751-de-26-de-fevereiro-de-2026>. A Res. 23.767/2026, que alterou a 23.751, não mexeu nesses artigos.
- **Norma (Res. 23.751/2026, art. 211, § 2º):** "É permitido às entidades e às pessoas não vinculadas à Justiça Eleitoral desenvolver ferramentas para a leitura dos Boletins de Urna e tratamento dos respectivos dados". O art. 263 manda o TSE publicar na internet os boletins de urna enviados para totalização.
- **Orientação oficial (TSE, página "Informações técnicas sobre a divulgação de resultados 2026", FAQ):** à pergunta sobre cadastro, autorização ou convênio, a resposta é "Não. Os resultados das eleições são disponibilizados publicamente pela Justiça Eleitoral". Também não é preciso divulgar todas as UFs e cargos. O limite é de **100 requisições por segundo por IP**; quem passar dele pode ficar bloqueado por 10 minutos, e o bloqueio se renova se o excesso continuar. As requisições respondidas com 304 também contam no limite. Muitos 404 podem causar bloqueio. Os códigos do 2º turno são pleito 3221 e eleição 6258 (federal). Fonte: <https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados>. A apresentação da audiência técnica de 6/7/2026 informa que a distribuição inclui fotos de candidatos em JPEG (<https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/apresentacao-interessados-2026-pdf>).

**Interpretação.**

- O Apurador é uma "entidade interessada na divulgação" e fica sujeito aos arts. 267 a 269. A sanção prática por descumprimento é perder o acesso (art. 269), o que derrubaria o núcleo ao vivo.
- "Não alterar o conteúdo" significa exibir o placar parcial e o % de seções totalizadas exatamente como o TSE publica, sem "corrigir", completar ou misturar com estimativas. Calcular coisas derivadas e separadas (curva real, curva projetada, projeção, chance de vitória) não altera os dados distribuídos, desde que fique claro que são cálculos do site.
- *Incerto*: a norma não define "alteração de conteúdo". Arredondar e reformatar provavelmente não é alteração; para não haver dúvida, use os percentuais que o TSE já entrega nos JSON.
- O art. 4º, § 3º, IV, da Res. 23.751, que proíbe sistemas "de divulgação de resultados" em substituição aos do TSE, está no contexto dos sistemas usados pela própria Justiça Eleitoral (veja o art. 211, §§ 1º e 2º). Não se aplica a sites de terceiros.

### 3.2 Portal de dados abertos (histórico, candidatos, eleitorado)

- **Fonte (API CKAN do portal, consultada em 17/10/2026):** os conjuntos `resultados-2018`, `resultados-2022`, `resultados-2026`, `candidatos-2026`, `eleitorado-2026` e `pesquisas-eleitorais-2026` têm `license_id: cc-by` ("Creative Commons Atribuição"), sem versão especificada. Exemplo: <https://dadosabertos.tse.jus.br/api/3/action/package_show?id=resultados-2022>. O conjunto `candidatos-2026` inclui as "Fotos de candidatos" por UF, inclusive BR.
- **Termos do portal do TSE:** a página "Política de privacidade e termos de uso" (<https://www.tse.jus.br/transparencia-e-prestacao-de-contas/politica-de-privacidade-e-termos-de-uso>) só trata de privacidade e não tem cláusula sobre reprodução de conteúdo.
- **Norma (Lei 9.610/98, art. 8º, IV e V):** não têm proteção autoral "os textos de tratados ou convenções, leis, decretos, regulamentos, decisões judiciais e demais atos oficiais" e "as informações de uso comum tais como calendários, agendas, cadastros ou legendas". Fonte: <https://www.planalto.gov.br/ccivil_03/leis/l9610.htm>.

**Interpretação.** Redistribuir e exibir os dados é permitido, desde que haja atribuição. Recomendação: crédito visível, por exemplo "Fonte: Tribunal Superior Eleitoral (TSE), dados oficiais de divulgação e Portal de Dados Abertos, licença CC-BY", com a data e hora da última atualização.

---

## 4. Outros pontos para um site neutro

### 4.1 Propaganda eleitoral e dia da eleição

- **Norma (Lei 9.504, art. 39, § 5º; Res. 23.610, art. 87):** são crimes **no dia da eleição** (detenção de 6 meses a 1 ano, mais multa de R$ 5.320,50 a R$ 15.961,50): III, "a divulgação de qualquer espécie de propaganda de partidos políticos ou de seus candidatos"; IV, "a publicação de novos conteúdos ou o impulsionamento de conteúdos nas aplicações de internet de que trata o art. 57-B", ou seja, sites e perfis de candidatos e partidos e conteúdo de pessoas naturais. Fonte: Planalto, Lei 9.504; <https://www.tse.jus.br/legislacao/compilada/res/2019/resolucao-no-23-610-de-18-de-dezembro-de-2019>.
- **Norma (Lei 9.504, art. 57-C, caput e § 1º, I):** propaganda eleitoral paga na internet é proibida, salvo impulsionamento contratado por candidatos e partidos. Também é proibida, "ainda que gratuitamente, a veiculação de propaganda eleitoral na internet, em sítios: I - de pessoas jurídicas, com ou sem fins lucrativos".
- **Norma (Lei 9.504, art. 57-D):** "É livre a manifestação do pensamento, vedado o anonimato durante a campanha eleitoral, por meio da rede mundial de computadores".
- **Norma (Lei 9.504, art. 45):** as obrigações de tratamento igual e de não emitir opinião valem para "emissoras de rádio e televisão". Não se aplicam a sites.
- **Calendário (Res. 23.760/2026):** o impulsionamento pago de propaganda é proibido até 26/10.

**Interpretação.** Um site neutro que informa o andamento da apuração não faz propaganda, então os crimes do dia da eleição não o atingem diretamente. Ele perde essa proteção se tomar lado, por exemplo com texto que torce, chamada para votar em alguém, conteúdo de campanha embutido ou anúncios pagos de candidato. Recomendações: (a) não embutir vídeos, posts ou peças de campanha; (b) não aceitar anúncios de candidatos ou partidos; (c) publicar uma página "quem somos" que identifique o responsável (art. 57-D); (d) no dia 25/10, antes das 17h, não publicar nos perfis do projeto nada sobre candidatos além de informação factual e neutra; (e) evitar impulsionamento pago de posts que mencionem candidatos até 26/10, porque as plataformas podem classificá-los como conteúdo político-eleitoral (Res. 23.610, art. 27-A).

### 4.2 Inteligência artificial

- **Norma (Res. 23.610, art. 9º-B, § 3º-A, incluído pela Res. 23.755/2026):** "Ficam vedadas a publicação e a republicação, ainda que gratuitas, bem como o impulsionamento pago de novos conteúdos sintéticos produzidos ou alterados por inteligência artificial ou por tecnologias equivalentes que utilizem imagem, voz ou manifestação de candidata ou candidato ou de pessoa pública, mesmo que rotulados [...], no período compreendido entre as 72 (setenta e duas) horas que antecedem e as 24 (vinte e quatro) horas que sucedem o término do pleito". O calendário (Res. 23.760/2026, 22 de outubro, item 2) aplica a regra **de 22/10 até 24 horas depois do término do pleito**, ou seja, até 26/10 por volta das 17h, sem limitar a propaganda.
- **Norma (Res. 23.610, art. 9º-C, § 1º):** proíbe a deepfake de candidato "para prejudicar ou para favorecer candidatura".
- **Norma (Res. 23.610, art. 28, § 1º-C, incluído pela Res. 23.755/2026):** é proibido "aos provedores de aplicação que ofertem sistemas de inteligência artificial", mesmo a pedido do usuário, "ranquear, recomendar, sugerir ou priorizar candidatas(os)" e "indicar preferência eleitoral, recomendar voto ou realizar qualquer forma de favorecimento ou desfavorecimento político-eleitoral, de maneira direta ou indireta, inclusive por meio de respostas automatizadas".
- **Norma (Res. 23.610, art. 37, XXXIV):** define IA de forma ampla, como sistema computacional baseado "em lógica, em representação do conhecimento ou em aprendizagem de máquina" que produz "conteúdos sintéticos, previsões, recomendações ou decisões".

**Interpretação.** (a) Não usar retratos, ilustrações ou caricaturas de candidatos gerados por IA. De 22/10 a 26/10 isso é proibido mesmo com rótulo; use fotos oficiais ou nenhuma foto. (b) Não colocar chatbot ou assistente de IA no site. (c) O modelo estatístico de projeção não "recomenda" nem "ranqueia" candidatos no sentido do § 1º-C, que mira assistentes conversacionais. Mas como a definição do art. 37, XXXIV, inclui "previsões", **não convém apresentar o modelo como "IA"**. *Incerto*: não há decisão aplicando o § 1º-C a modelos estatísticos de projeção.

### 4.3 Desinformação e integridade do processo eleitoral

- **Norma (Res. 23.735/2024, art. 6º, § 4º, na redação da Res. 23.757/2026):** difundir na internet "informações falsas ou descontextualizadas em prejuízo de adversária(o) ou em benefício de candidata(o), ou a respeito do sistema eletrônico de votação e da Justiça Eleitoral" configura uso indevido dos meios de comunicação. Fonte: <https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-757-de-2-de-marco-de-2026>.
- **Norma (Código Eleitoral, art. 323):** é crime divulgar, na propaganda ou durante a campanha, "fatos que sabe inverídicos em relação a partidos ou a candidatos e capazes de exercer influência perante o eleitorado". A pena aumenta se o crime for cometido pela internet ou "transmitido em tempo real" (§ 2º, I).

**Interpretação.** A projeção é uma estimativa com incerteza, não uma afirmação de fato. O risco aparece se ela for apresentada como resultado, ou se a diferença entre projeção e resultado oficial for mostrada como sinal de irregularidade. Recomendações: mostrar a incerteza, nunca anunciar "eleito" com base só na projeção (usar a indicação oficial de eleição matematicamente definida ou de totalização final, que o TSE publica) e explicar que diferenças entre projeção e resultado são erro do modelo.

### 4.4 Nomes, fotos e cores dos candidatos

- **Nomes:** usar o nome de urna, o número e o partido como vêm nos dados do TSE. Não achamos restrição ao uso informativo.
- **Fotos:** o TSE distribui as fotos dos candidatos nos arquivos de divulgação e no portal de dados abertos, em conjunto marcado CC-BY. **Norma (Código Civil, art. 20):** a publicação da imagem de alguém pode ser proibida a seu pedido "se lhe atingirem a honra, a boa fama ou a respeitabilidade, ou se se destinarem a fins comerciais" (<https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm>). *Interpretação:* usar a foto oficial, sem alteração e com fim informativo, é baixo risco. *Incerto:* se o TSE pode licenciar como CC-BY fotos cujo autor é terceiro. O risco é pequeno para uso informativo e não comercial.
- **Cores:** fora da propaganda, não achamos norma que restrinja o uso de cores associadas a partidos. *Interpretação (neutralidade):* usar duas cores neutras, nenhuma delas a cor identitária de PT ou PL nem as cores da bandeira, que viraram cores de campanha. Dar o mesmo tratamento visual aos dois candidatos (mesmo tamanho de foto e nome, ordem fixa e explicada, por exemplo pelo número ou pela ordem alfabética).

### 4.5 Nenhuma lei nova de última hora

- **Norma (Constituição, art. 16):** lei que altere o processo eleitoral não se aplica à eleição que ocorra até um ano depois de sua vigência. O Planalto ainda mostra a Lei 4.737/65 como Código Eleitoral e a Lei 9.504 com alterações até a Lei 15.230/2025, nenhuma sobre pesquisas. Pela imprensa, o novo Código Eleitoral (PLP 112/2021) não foi aprovado a tempo de valer em 2026 (Diário do Nordeste, 30/12/2025: <https://diariodonordeste.verdesmares.com.br/pontopoder/sem-novo-codigo-eleitoral-o-que-o-legislativo-deixou-pendente-para-as-eleicoes-de-2026-1.3722458>). *Incerto*: não conferimos a tramitação no site do Senado. Mesmo que tivesse sido aprovado depois de outubro de 2025, não valeria para 2026.

---

## 5. Linha do tempo para o 2º turno

| Quando (horário de Brasília) | O que vale | Fonte |
|---|---|---|
| Desde 15/08 | Enquetes proibidas | Lei 9.504, art. 33, § 5º; Res. 23.600, art. 23 |
| 19/10 | Último dia para registrar pesquisas que se queira divulgar em 25/10 | Res. 23.760/2026, 19 de outubro |
| 22/10 até cerca de 17h de 26/10 | Proibido publicar conteúdo novo gerado por IA com imagem, voz ou fala de candidato | Res. 23.610, art. 9º-B, § 3º-A; Res. 23.760, 22 de outubro, item 2 |
| Até 26/10 | Proibido impulsionamento pago de propaganda | Res. 23.760, 22 de outubro, item 7 |
| 25/10, 8h às 17h | Votação. Pode: pesquisas registradas feitas antes do dia, com os dados do art. 10. Não pode: boca de urna, enquete, propaganda. Não há placar parcial oficial | Res. 23.600, arts. 11 e 12; Lei 9.504, art. 39, § 5º; Res. 23.760, Anexo II |
| 25/10, a partir das 17h | O TSE libera o resultado de Presidente e a projeção pode começar. Boca de urna registrada pode ser divulgada | Res. 23.751, art. 265, § 1º; Res. 23.600, art. 12 |

*Fuso horário (fora do escopo jurídico):* segundo a imprensa, não há horário de verão em 2026 (Jornal do Brasil, 5/10/2026: <https://www.jb.com.br/editorias/2026/10/05/horario-de-verao-2026.html>). Então 17h de Brasília = 20h UTC. Vale conferir antes do dia.

---

## 6. Avisos recomendados no site

*Interpretação*: nenhum aviso é exigido por norma para a projeção. Os textos abaixo são sugestões para reduzir os riscos das seções 1.3, 2 e 4.

- Junto da projeção e da chance de vitória: "Estimativa estatística do Apurador, calculada a partir dos resultados parciais oficiais do TSE e de eleições passadas. Não é resultado oficial nem pesquisa eleitoral. O resultado oficial é o divulgado pelo TSE."
- Junto do placar parcial: "Dados oficiais do TSE, exibidos sem alteração. Atualizado às HH:MM:SS. Fonte: TSE (CC-BY)."
- Antes das 17h de 25/10, no lugar do núcleo ao vivo: "O TSE começa a divulgar os resultados às 17h (horário de Brasília). A projeção começa a partir daí." Não mostrar nenhum número de projeção nem de agregado.
- Se o site exibir alguma pesquisa: período de coleta, margem de erro, nível de confiança, número de entrevistas, instituto e contratante, número de registro no TSE e link para o PesqEle.
- Rodapé: identificação do responsável, declaração de que o site não tem vínculo com campanhas, partidos ou com o TSE, e crédito da licença dos dados.

---

## 7. Pontos em aberto para revisão jurídica

1. Agregado de pesquisas ou projeção baseada em pesquisas publicados antes das 17h de 25/10: é "pesquisa sem registro"? (Seção 2.3. Não achamos norma nem decisão.)
2. O que conta como "alteração de conteúdo" dos dados distribuídos (Res. 23.751, art. 267, § 4º)? Arredondar, reformatar e calcular campos derivados entram?
3. O responsável pelo site, pessoa física ou jurídica, pode responder pelo art. 21 da Res. 23.600 e pelo art. 35 da Lei 9.504 se exibir uma pesquisa registrada que depois seja considerada não registrada ou fraudulenta?
4. A Res. 23.610, art. 28, § 1º-C (IA que "ranqueia" ou favorece candidatos), pode ser aplicada a um modelo estatístico de chance de vitória?
5. A decisão do TSE que considerou o art. 255 do Código Eleitoral não recepcionado não foi localizada. O ponto é pouco relevante, porque a Res. 23.600, art. 11, permite expressamente divulgar pesquisas no dia da eleição.

---

## Fontes primárias consultadas

- Lei 9.504/1997 (Lei das Eleições), texto compilado: <https://www.planalto.gov.br/ccivil_03/leis/l9504.htm>, arts. 33 a 35-A, 39, § 5º, 45, 57-A a 57-D.
- Lei 4.737/1965 (Código Eleitoral), texto compilado: <https://www.planalto.gov.br/ccivil_03/leis/l4737compilado.htm>, arts. 255 e 323.
- Res. TSE 23.600/2019 (pesquisas), compilada, com as Res. 23.676/2021, 23.727/2024 e 23.747/2026: <https://www.tse.jus.br/legislacao/compilada/res/2019/resolucao-no-23-600-de-12-de-dezembro-de-2019>.
- Res. TSE 23.747/2026 (altera a 23.600): <https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-747-de-26-de-fevereiro-de-2026>.
- Res. TSE 23.610/2019 (propaganda), compilada, com a Res. 23.755/2026: <https://www.tse.jus.br/legislacao/compilada/res/2019/resolucao-no-23-610-de-18-de-dezembro-de-2019>; Res. 23.755/2026: <https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-755-de-2-de-marco-de-2026>.
- Res. TSE 23.751/2026 (atos gerais 2026), arts. 4º, 160, 211, 263 a 269: <https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-751-de-26-de-fevereiro-de-2026>; Res. 23.767/2026 (altera a 23.751): <https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-767-de-3-de-agosto-de-2026>.
- Res. TSE 23.757/2026 (altera a 23.735/2024, ilícitos): <https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-757-de-2-de-marco-de-2026>.
- Res. TSE 23.760/2026 (calendário eleitoral 2026, Anexos II e III): <https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-760-de-2-de-marco-de-2026>.
- Lista de resoluções de 2026: <https://www.tse.jus.br/legislacao/compilada/res/2026>.
- Minuta de 2026 da alteração da Res. 23.600: <https://www.tse.jus.br/servicos-judiciais/audiencias-publicas/arquivos/minutas/2026/pesquisas-eleitorais>.
- TSE, informações técnicas, FAQ e documentos da divulgação de resultados 2026: <https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados>; apresentação da audiência técnica de 6/7/2026: <https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/apresentacao-interessados-2026-pdf>; instruções de download v1.0: <https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-instrucoes-para-download-dos-arquivos-da-divulgacao-2026>.
- Portal de Dados Abertos do TSE (API CKAN, licenças): <https://dadosabertos.tse.jus.br/api/3/action/package_show?id=resultados-2026> e conjuntos citados na seção 3.2.
- TSE, política de privacidade e termos de uso: <https://www.tse.jus.br/transparencia-e-prestacao-de-contas/politica-de-privacidade-e-termos-de-uso>.
- STF, ADIs 3741, 3742 e 3743 (notícia de 6/9/2006): <https://noticias.stf.jus.br/postsnoticias/direto-do-plenario-stf-declara-inconstitucional-em-parte-lei-que-regula-campanhas-politicas/>.
- TSE, decisões (via compilação oficial do TRE-SE "Temas selecionados do TSE: pesquisa eleitoral", atualizada em 04/08/2023): AgR-AI 244-35.2016.6.05.0093; AgR-REspe 177-25.2016.6.14.0027; AgR-REspEl 0607690-67.2018.6.19.0000. <https://www.tre-se.jus.br/jurisprudencia/Temas%20selecionados%20TSE/temas-selecionados-do-tse-a-partir-de-30-06/tre-se-temas-selecionados-tse-pesquisa-eleitoral>.
- TSE, AI nº 28813, rel. Min. Barroso, DJE 25/02/2019 (citado no acórdão TRE-AL); TRE-AL, RE 0600682-61.2020.6.02.0026: <https://static.tre-al.jus.br/pan/pan8778193763280016652.pdf>.
- TSE, notícia sobre a suspensão da pesquisa AtlasIntel BR-06939/2026: <https://www.tse.jus.br/comunicacao/noticias/2026/Junho/tse-suspende-divulgacao-de-pesquisa-da-atlasintel-sobre-disputa-para-presidente-por-suspeita-de-inducao-ao-eleitor>.
- TRE-MT, "Guia rápido: pesquisas eleitorais" (2026): <https://www.tre-mt.jus.br/eleicoes/2026/arquivos/tre-mt-guia-rapido-pesquisas-eleitorais>.
- Código Civil, art. 20: <https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm>; Lei 9.610/1998, art. 8º: <https://www.planalto.gov.br/ccivil_03/leis/l9610.htm>.

Fontes secundárias usadas só como pista ou contexto: Boletim Científico ESMPU nº 12/2004 (sobre o art. 255 do CE); Trademap (prática de agregadores, 28/08/2026); Diário do Nordeste (situação do novo Código Eleitoral, dez. 2025); Jornal do Brasil (horário de verão, 5/10/2026).
