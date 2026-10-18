# Apurador 2026 — mapa

Label: wayfinder:map

## Destination

Especificação fechada e com os riscos resolvidos do site Apurador, pronta para construir até **segunda, 19/10/2026**. Ela cobre o núcleo ao vivo (placar parcial, curva real, curva projetada, projeção, chance de vitória) e o explorador histórico. A construção e o ensaio ficam para 20 a 24/10, e o uso ao vivo é na apuração do 2º turno, **domingo, 25/10/2026**.

## Notes

- Domínio: eleição presidencial brasileira, 2º turno de 2026, Flávio Bolsonaro (PL) × Lula (PT). No 1º turno (04/10), Flávio teve 47,03% e Lula 45,16% dos votos válidos.
- Vocabulário: `GLOSSARY.md` na raiz do repositório. Use os termos de lá: seções totalizadas, placar parcial, projeção, chance de vitória, curva projetada, virada, lugar.
- Skills de toda sessão: `grilling` + `domain-modeling` (manter o `GLOSSARY.md` em dia).
- Mapa de planejamento: os tickets produzem decisões, não código.
- O prazo é inegociável para o **núcleo ao vivo**. O **explorador histórico** entra só no que couber sem atrasá-lo.
- Site público, sem login nem cadastro, em português.
- Lugares: Brasil → UF (e Exterior, no mesmo nível, fora do mapa) → município. Histórico: 2026 1T, 2022 1T/2T, 2018 1T/2T.
- A curva projetada é o gráfico principal. O eixo horizontal é o % de seções totalizadas.
- **Não é só mais um site de apuração**: o objetivo é tornar a apuração mais interessante e engajante.
- **Pesquisas eleitorais entram no modelo.** A projeção e a chance de vitória combinam um agregado de pesquisas com a apuração. O modelo aprende com eleições passadas quanto as pesquisas erraram em relação ao resultado. O visitante pode alternar entre usar **só a apuração** e usar **apuração + pesquisas**.
- Comparações: ao vivo, cada lugar se compara com o 1º turno de 2026 *e* com o que as pesquisas indicavam. No histórico, dá para comparar quaisquer dois turnos.
- Produto: celular primeiro. Uma página por lugar, com o bloco ao vivo em cima e o histórico embaixo; a inicial é o Brasil. Postura apartidária, com página de metodologia e aviso de que projeção não é resultado oficial.
- Construção: Claude escreve o código e o dono do projeto revisa e decide. Tecnologia: TypeScript, o resto a critério do Claude. Hospedagem no plano gratuito da Cloudflare; repositório no GitHub (a definir qual conta). O dono não tem contas ainda: **Claude não cria contas nem digita senhas**, então criação de conta e logins são tarefas do dono, previstas para 18/10. Até lá, repositório Git local, com tudo preparado para ir ao GitHub e à Cloudflare depois.
- **Servidor disponível**: o computador do dono (Ryzen 5 5600X3D, RTX 4080, 64 GB de RAM, Windows 11, internet de 800 Mbps simétricos) é o servidor do projeto. Fora ele, só os planos gratuitos da Cloudflare e do GitHub.
- Ensaio geral obrigatório antes de 25/10: rodar uma apuração passada inteira, acelerada, no site.
- Lançamento o quanto antes, em fases. O núcleo ao vivo tem prazo duro: 17h de 25/10 (20h UTC).
- **Antes das 17h de 25/10, o site publica o agregado de pesquisas, a projeção e a chance de vitória**, aceitando a zona cinzenta legal, **condicionado à** [Consulta a advogado eleitoral](issues/16-consulta-advogado-eleitoral.md). A forma de apresentação segue a orientação do advogado.
- Controle **Base da projeção**: "Só apuração" ou "Apuração + pesquisas" (padrão).
- Pesquisas usadas no agregado: só registradas no TSE, de institutos com histórico em 2018/2022, nacionais e por UF se houver volume. O erro histórico é medido com os 2º turnos de 2002 a 2022, uso interno.
- Engajamento escolhido: **narração da noite**, **curva de comparação** (qualquer turno passado, desligada por padrão) e **simulador "e se"**.
- A página de metodologia mostra como o modelo teria se saído em 2018 e 2022.
- Achados de pesquisa ficam em `.scratch/apurador-2026/research/`, apontados pelo ticket.

## Decisions so far

- [API ao vivo do TSE](issues/01-api-ao-vivo-tse.md): JSONs estáticos num CDN Akamai em `resultados.tse.jus.br/oficial/ele2026/`. O 2T presidencial é a eleição `6258`, já publicada zerada. Brasil, UF, Exterior, município e **zona** têm votos completos ao vivo. Boletins por seção atrasam de minutos a horas, então não servem na noite. CORS liberado. Limite de 100 req/s por IP, com bloqueio de 10 min que conta 404 e 304. Cache de ~60 s. Não há simulado: o ensaio terá de gerar arquivos no formato do TSE.

- [Restrições legais à projeção](issues/04-restricoes-legais.md): projeção e chance de vitória calculadas com resultados oficiais podem ser publicadas a partir das 17h de 25/10, quando o TSE libera o resultado. Publicar agregado de pesquisas ou projeção baseada em pesquisas *antes* disso é zona cinzenta, com multa possível. Pesquisas registradas exibidas uma a uma exigem os seis dados do art. 10. Enquetes são proibidas. Dados do TSE são CC-BY e não podem ser alterados. Cores neutras e tratamento igual aos candidatos.
- [Dados históricos por município e malhas](issues/03-dados-historicos-e-malhas.md): o TSE (CC-BY) basta para o nível de município, com a tabela oficial TSE→IBGE casando 100% dos códigos. O exterior entra no total Brasil, sem polígono. O arquivo `detalhe_votacao_secao` (2018, 2022, 2026) traz a hora de recebimento e de primeira totalização de **cada seção**, o que permite reconstruir as curvas reais passadas. A malha correta exige simplificar a do IBGE 2024/2025, porque a API só tem a de 2022, sem Boa Esperança do Norte (MT). Dados agregados com cerca de 0,7 MB e malha com 0,4 a 1 MB, com gzip. Os arquivos oficiais do 2T 2026 só saem por volta de 26–27/10.
- [Métodos de projeção da apuração](issues/05-metodos-de-projecao.md): os métodos de referência (WaPo, NYT, DDHQ, *exit poll* britânico) projetam a variação de cada unidade em relação a uma linha de base, que para nós é a variação entre o 1T e o 2T de 2026. A recomendação é variação por município, com recuo hierárquico (município → região do IBGE → UF) e erros correlacionados. A curva projetada é a soma das projeções por unidade na ordem de chegada prevista, e ninguém publica uma pronta. Projetos abertos de 2026 relatam erro de 0,1 a 0,2 p.p. depois de 25% das seções. Ganho relatado de usar pesquisas como ponto de partida durante a apuração: no máximo 0,05 p.p.
- [Linha do tempo de apurações passadas](issues/02-linha-do-tempo-apuracoes-passadas.md): as cinco noites (2018, 2022 e 2026 1T) são reconstruíveis seção por seção, com hora ao segundo, só com dados oficiais. A reconstrução bate com o histórico oficial de 2022 (virada às 18:44:04, com 67,76%). A ordem real é diferente da crença comum: **Centro-Oeste e Sul chegam cedo, Sudeste e Nordeste chegam tarde**. O que falta apurar difere sistematicamente do que já chegou, até dentro do município. A ordem por seção quase não se repete entre turnos, só o padrão por UF e região. O 2º turno é bem mais rápido que o 1º. Melhor ensaio: 2T de 2022 (a de 2018 só é pública a partir das 19h).
- [Pesquisas eleitorais: dados atuais e erro histórico](issues/06-pesquisas-eleitorais.md): **não existe fonte oficial dos percentuais**. O TSE só publica metadados de registro, então os números vêm da Wikipédia e da imprensa. Há 19 pesquisas nacionais do 2T 2026 até 17/10. **Pesquisas por UF do 2T são insuficientes** (30 registros, quase todos em RN, DF e TO). O erro histórico nacional dá para medir (2002–2022, cerca de 1,2 ponto na participação e 2,5 na margem, sem lado fixo), mas o ajuste por instituto seria frágil. No 1T 2026, as pesquisas subestimaram Flávio em 2,8 pontos na margem. Os dados históricos abertos têm buracos e sujeira.
- [Arquitetura e tecnologia](issues/08-arquitetura-e-tecnologia.md): **a CDN da Cloudflare atende todos os visitantes, e o computador do dono é o coletor.** Páginas estáticas em Astro e Preact (com camada 3D opcional em three.js), JSONs ao vivo no R2 com cache curto, e o coletor em Node lendo o TSE a cada 20 s com IP residencial. Tudo em TypeScript, nos planos gratuitos. Descartados: Workers dinâmicos, GitHub Actions como coletor e servir visitantes do computador. O placar oficial aparece sem alteração, separado dos cálculos.
- [Método de projeção só com a apuração](issues/09-metodo-projecao-so-apuracao.md): **transferência de votos corrigida pelo próprio município**, por município, com incerteza analítica e erros correlacionados. No 2T de 2022 errou 0,1 p.p. com 5% das seções, contra 4,2 do placar parcial. A **virada é mostrada como ponto mais faixa**, com ordem de chegada "mistura", porque perto de 50% ela é muito sensível. O desvio das seções tardias fica na incerteza, sem correção. Os ajustes são provisórios, a calibrar no ensaio com o 1T de 2026.

## Not yet specified

- **Página de metodologia**: explicação do modelo e o histórico de acerto do modelo em 2018 e 2022. O conteúdo depende do método escolhido.

## Out of scope

- Governadores e outros cargos: só Presidente (definido no charting, por causa do prazo).
- Recortes menores que município (zona, local de votação, bairro, seção) no site. Seções e municípios podem ser usados *internamente* pelo modelo.
- Eleições anteriores a 2018.
- Login, contas, personalização.
- [Acesso ao TSE a partir da nuvem](issues/17-acesso-ao-tse-pela-nuvem.md): fechado. O coletor roda no computador do dono, com IP residencial, sem reserva na nuvem.
- Cards para compartilhar e palpites dos visitantes: não escolhidos para o engajamento. Uma votação aberta de visitantes ("quem vai ganhar?") seria, além disso, uma enquete, que é proibida.
