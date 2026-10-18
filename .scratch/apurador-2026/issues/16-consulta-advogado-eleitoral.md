# Consulta a advogado eleitoral

Type: task
Status: resolved
Blocked by: —
Map: [Apurador 2026](../map.md)

## Question

O dono do projeto decidiu publicar o agregado de pesquisas, a projeção e a chance de vitória **antes** das 17h de 25/10, aceitando a zona cinzenta apontada em [Restrições legais à projeção](04-restricoes-legais.md), **depois de consultar um advogado eleitoral**. Esta tarefa é essa consulta. Ela é do dono (HITL): o Claude prepara o material, o dono contrata e conversa com o advogado.

Levar ao advogado o arquivo [research/04-restricoes-legais.md](../research/04-restricoes-legais.md) e estas perguntas:

1. Publicar um agregado de pesquisas registradas, e uma projeção e chance de vitória calculadas a partir dele, antes das 17h de 25/10, configura "pesquisa sem registro" (Res. 23.600, art. 17; critério do AI 28813)? Que forma de apresentação reduz o risco (ex.: listar cada pesquisa com número de registro, números brutos sem ponderação, avisos)? Faz diferença publicar no dia da eleição ou só até a véspera?
2. O que conta como "alteração de conteúdo" dos dados do TSE (Res. 23.751, art. 267, § 4º)? Arredondar, reformatar e calcular campos derivados entram?
3. O responsável pelo site responde (Res. 23.600, art. 21; Lei 9.504, art. 35) se exibir uma pesquisa registrada que depois seja considerada não registrada, suspensa ou fraudulenta?
4. A Res. 23.610, art. 28, § 1º-C (IA que "ranqueia" ou favorece candidatos) pode alcançar um modelo estatístico de chance de vitória e o simulador "e se"?
5. O responsável deve ser pessoa física ou jurídica, e o que o rodapé precisa identificar (Lei 9.504, art. 57-D)?
6. A malha de municípios do IBGE pode ser redistribuída e exibida no site? (O IBGE não declara licença aberta explícita para ela.)

Resolvido quando houver uma orientação por escrito, registrada aqui em resumo, sobre o que se pode mostrar antes das 17h e com que forma.

O que se pretende mostrar, por [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md):

- **(a)** A lista das pesquisas usadas: só nacionais, de 14 institutos com histórico, com registro conferido no CSV do TSE. Cada uma traz os seis dados do art. 10 e link para a fonte.
- **(b)** O agregado (média simples dessas pesquisas, em votos válidos) com faixa de incerteza, e a linha de tendência desde 05/10.
- **(c)** A projeção e a chance de vitória antes da apuração, e a curva projetada da noite, com a virada projetada. Ver [Combinação de pesquisas e apuração](11-combinacao-pesquisas-e-apuracao.md).

A atualização é diária, até as 23h de 24/10. Pesquisas divulgadas em 25/10 não entram. Sem sinal verde, até as 17h de 25/10 aparece só (a).

## Comments

- 18/10/2026, na sessão de [Telas da página de lugar](12-telas-da-pagina-de-lugar.md): o dono do projeto informou que **consultou um advogado e está liberado para fazer o agregado de pesquisas** (e, com ele, a projeção e a chance de vitória com pesquisas antes das 17h). Falta registrar aqui o resumo por escrito da orientação, incluindo as perguntas 2 a 6, para resolver este ticket.
- 18/10/2026, de [Simulador "e se"](13-simulador-e-se.md): o simulador funciona antes das 17h com o mesmo sinal verde da projeção com pesquisas, salvo ressalva do advogado à pergunta 4 (art. 28, § 1º-C). O resumo por escrito precisa dizer se houve ressalva sobre o simulador.
- 18/10/2026: o dono não tem mais a lista de perguntas levada ao advogado. O Claude redigiu uma mensagem nova, atualizada com o desenho atual (agregado, simulador, telas), que pede a confirmação por escrito do sinal verde e acrescenta a pergunta 7, sobre conteúdo novo no dia da eleição (Lei 9.504, art. 39, § 5º, IV): [consulta-advogado.md](../consulta-advogado.md). Aguardando a resposta por escrito.

## Answer

Resolvido em 18/10/2026 com a resposta por escrito do primeiro advogado, trazida pelo dono do projeto, que aceitou todas as recomendações. A resposta é parcial: seis itens foram para um segundo advogado e seguem na [Segunda consulta jurídica](21-segunda-consulta-juridica.md). A mensagem enviada está em [consulta-advogado.md](../consulta-advogado.md).

**Em uma linha**: por escrito, só a lista das pesquisas está liberada antes das 17h. O agregado, a projeção e o simulador antes das 17h ficam construídos, mas desligados, até a segunda resposta. A liberação verbal relatada antes não vale como sinal verde.

**Orientação recebida por escrito** (resumo):

- **1.1(a)**: pesquisas feitas antes podem ser divulgadas em 25/10, inclusive antes das 17h, respeitados os requisitos, os prazos e as informações obrigatórias da Res. 23.600.
- **1.2**: pesquisas individuais, agregado e projeção são apresentados em separado.
  - Cada pesquisa traz as informações obrigatórias, o número de registro e o link para a fonte.
  - A metodologia do agregado e da projeção é pública, com critérios de seleção, cálculos e limitações.
  - Os avisos dizem que o agregado não é pesquisa própria e que a projeção não é resultado oficial nem garantia do resultado.
- **3.1**: quem divulga pesquisa irregular pode ser responsabilizado, mesmo que ela seja de terceiros. A verificação diária ajuda, mas não elimina o risco. A recomendação é monitorar suspensões, retirar logo as pesquisas afetadas, recalcular o agregado e guardar o histórico das verificações, fontes e alterações.
- **5.1**: não há obrigação geral de abrir pessoa jurídica para operar um site informativo. A escolha entre pessoa física e jurídica não elimina, por si só, responsabilidades.
- **5.2**: o site identifica claramente o responsável, oferece um e-mail de contato e explica que é independente do TSE, dos candidatos e dos partidos. Não publicar CPF completo nem endereço residencial sem necessidade jurídica confirmada.
- **Pendentes com o segundo advogado**: 1.1(b) e (c), 2.1, 4.1, 4.2, 6.1 e 7.1.

**Decisões** (aceitas pelo dono do projeto):

1. **Divisão**: este ticket fecha com a resposta acima. Os seis pendentes vão para a [Segunda consulta jurídica](21-segunda-consulta-juridica.md), com prioridade para 7.1 e 1.1(b) e (c).
2. **Chaves de publicação**: três coisas são construídas, mas ficam desligadas por uma chave que se liga sem código novo, até a manhã de 25/10:
   - o agregado e a tendência (b);
   - a projeção, a chance de vitória e a curva projetada antes das 17h (c);
   - o simulador antes das 17h.

   Com a chave desligada, vale o caminho conservador da decisão 9 do [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md), que volta às [Telas da página de lugar](12-telas-da-pagina-de-lugar.md):
   - **Brasil antes das 17h**: manchete, placar com "A divulgação começa às 17h", a lista das pesquisas aberta e "O que esperar da noite" sem números de projeção, com a ordem de chegada típica e as curvas reais de noites passadas.
   - **Outros lugares**: 1º turno e histórico, sem indicação das pesquisas, que deriva do agregado.
   - **Nas duas bases**: nenhuma projeção antes das 17h. Ela começa às 17h, junto com o simulador.
3. **Dados do TSE**: a leitura conservadora vale já, sem esperar a resposta ao 2.1. Todo número do TSE aparece como o TSE publica, com duas casas, também em tabelas, cartões do mapa e linha fixa. Só os cálculos do Apurador, como projeção e comparações, são arredondados.
4. **Planos B**, se a resposta for "não":
   - **4.1**: uma chave desliga o bloco da projeção (projeção, chance de vitória e curva projetada) e o simulador. Ficam o placar, a curva real e a narração factual.
   - **6.1**: o cartão do mapa mostra só a Tabela.
   - **7.1**: não há plano B, porque é a premissa do projeto.
5. **Avisos**:
   - na projeção: "Estimativa do Apurador. Não é resultado oficial nem garantia do resultado.";
   - no agregado: "Média calculada pelo Apurador sobre pesquisas registradas no TSE. Não é uma pesquisa própria.";
   - pesquisas individuais, agregado e projeção ficam em blocos separados;
   - a [Página de metodologia](20-pagina-de-metodologia.md) traz os critérios de seleção, os cálculos e as limitações.
6. **Pesquisas irregulares**:
   - A cada execução, o verificador grava um registro datado do que conferiu, com fonte e resultado, num `pesquisas-verificacoes.csv`. O histórico de alterações é o histórico do Git do `pesquisas.csv`.
   - O dono confere todos os dias as notícias e decisões do TSE sobre suspensões e, em 25/10, faz isso às 8h e às 14h.
   - Depois do congelamento das 23h de 24/10, ainda é permitido retirar uma pesquisa e recalcular o agregado, por deploy. Incluir pesquisa nova não é.
7. **Responsável e rodapé**: pessoa física. O rodapé traz o nome completo do dono, um e-mail de contato dedicado ao projeto e a declaração de independência em relação ao TSE, aos candidatos e aos partidos, sem CPF nem endereço. Criar o e-mail é tarefa do dono, registrada em [Contas e acessos](07-contas-e-acessos.md).

**Glossário**: sem termos novos.

## Comments

- 18/10/2026, de [Segunda consulta jurídica](21-segunda-consulta-juridica.md): as chaves da decisão 2 daqui ficam ligadas, o plano B do item 4.1 sai e o mapa do IBGE foi liberado pela CC BY 4.0. Entrou uma chave nova, a de textos preditivos, desligada até a [Confirmação dos textos preditivos](22-confirmacao-dos-textos-preditivos.md).
