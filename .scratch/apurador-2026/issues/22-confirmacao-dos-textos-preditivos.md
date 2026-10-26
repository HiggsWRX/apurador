# Confirmação dos textos preditivos

Type: task
Status: resolved
Blocked by: —
Map: [Apurador 2026](../map.md)

Tarefa do dono (HITL). A [Segunda consulta jurídica](21-segunda-consulta-juridica.md) condicionou os textos preditivos durante a apuração a uma confirmação expressa e deixou ambígua a projeção com pesquisas antes das 17h. A mensagem ao advogado está em [consulta-advogado-2.md](../consulta-advogado-2.md), com a mesma numeração da tabela abaixo.

## Question

O advogado confirma, por escrito, a projeção com pesquisas antes das 17h, os textos preditivos (e em que forma) e a frase "o que seria preciso" do simulador?

| Item | Hoje | Se liberado | Se não |
|---|---|---|---|
| **1.** Projeção, chance de vitória e curva projetada a partir do agregado antes das 17h, como painel | Chave ligada | Fica | Desligar a chave (c): antes das 17h, só a lista e o agregado |
| **2a.** Rótulos curtos no painel da curva, como "Sem sinal de virada · chance de virada 3%" | No ar | Ficam | Fica só o desenho da curva, sem rótulo |
| **2b.** Frases preditivas na manchete e na narração depois das 17h | Chave desligada | Ligar, com os cuidados indicados | Fica desligada |
| **3.** "O que seria preciso" no simulador | No ar | Fica | Sai do simulador |

As chaves estão na decisão 5 da [Segunda consulta jurídica](21-segunda-consulta-juridica.md), e os rótulos no [Sinal de virada](23-sinal-de-virada.md).

Resolvido quando houver resposta por escrito aos quatro itens, registrada aqui em resumo, com o estado final de cada chave. As chaves podem mudar até a noite de 25/10, sem código novo.

De [Narração da noite](14-narracao-da-noite.md): os textos exatos do item 2b estão nas decisões 8 e 9 de lá e podem ser mostrados ao advogado. São três tipos de evento preditivo na narração: a mudança do sinal de virada, a chance passando de 90% e de 99% e a linha da projeção nos marcos. Todos começam com "Projeção do Apurador:". Na manchete, há três frases, uma por estado do sinal de virada. Com a chave desligada, nenhum deles entra nos arquivos públicos.

De [Operação na noite](18-operacao-na-noite.md) (decisão 20 de lá): às 16h de 25/10, o roteiro confere que a chave está desligada, salvo se a resposta por escrito já estiver registrada aqui. Se a confirmação chegar durante a noite, o dono liga a chave por comando, só com a resposta registrada aqui. Os textos valem dali em diante, sem nada retroativo.

De [Simulador "e se" antes das 17h](../../apurador-2026-construcao/issues/24-simulador-antes-das-17h.md) (20/10/2026): os textos exatos do item 3, como estão no simulador, podem ser mostrados ao advogado. São três frases, sempre sobre a simulação do visitante, numa caixa "O que seria preciso", e nunca na manchete, na narração nem na página de lugar:

- a da decisão 10 do [Simulador "e se"](13-simulador-e-se.md): "Para Lula passar à frente, o voto que falta precisaria pender mais 1,1 ponto para ele no país." (ou "mais de 5 pontos", fora da faixa do controle), com o botão "Aplicar";
- depois de "Aplicar": "Na simulação, os dois terminam empatados.";
- quando as hipóteses das regiões já pendem para quem está atrás: "Para Lula passar à frente, o voto que falta no país precisaria pender menos de 2,9 pontos para Flávio."

Se o item 3 não for liberado, as três saem juntas.

## Answer

Resolvido em 25/10/2026, às 15h18. O dono recebeu a resposta por escrito do advogado, Antonio Valença, e a relatou na sessão do Claude. O texto, como veio:

> Caro Hiago, confirmo que ao que tudo indica poderá sim exibir os items e os textos.
> Atenciosamente,
> Antonio Valença

Para o dono, a resposta vale para os quatro itens da tabela:

| Item | Estado final |
|---|---|
| **1.** Projeção, chance de vitória e curva projetada antes das 17h | Fica: a chave `antesDas17h.projecao` segue ligada |
| **2a.** Rótulos curtos no painel da curva | Ficam |
| **2b.** Frases preditivas na manchete e na narração depois das 17h | Liga, pelo comando `npm run noite -- ligar textos-preditivos`, valendo dali em diante, sem nada retroativo |
| **3.** "O que seria preciso" no simulador | Fica |

**Ressalva**: a resposta diz "ao que tudo indica" e não trata item por item, nem da forma dos textos (os "cuidados indicados" do item 2b). A [Segunda consulta jurídica](21-segunda-consulta-juridica.md) pedia uma confirmação expressa, e o dono tomou esta como a confirmação. Os textos são os já construídos, sem mudança, porque o código está congelado: os das decisões 8 e 9 da [Narração da noite](14-narracao-da-noite.md) e os três do item 3.
