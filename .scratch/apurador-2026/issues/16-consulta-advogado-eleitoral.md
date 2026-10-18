# Consulta a advogado eleitoral

Type: task
Status: open
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
