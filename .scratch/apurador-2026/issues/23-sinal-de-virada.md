# Sinal de virada

Type: grilling
Status: resolved
Blocked by: —
Map: [Apurador 2026](../map.md)

## Question

Como a página mostra de forma específica o que se espera da virada em cada momento, inclusive quando não há indício de virada, sem textos preditivos automáticos?

Pedido do dono em 18/10/2026. Revisa a decisão 4 do [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md), que previa "pode não ocorrer", e as frases da virada projetada na decisão 4 das [Telas da página de lugar](12-telas-da-pagina-de-lugar.md). Os textos preditivos estão desligados durante a apuração até a [Confirmação dos textos preditivos](22-confirmacao-dos-textos-preditivos.md), pela decisão 5 da [Segunda consulta jurídica](21-segunda-consulta-juridica.md).

## Answer

Resolvido em 18/10/2026 em conversa com o dono do projeto, que aceitou a recomendação.

**Em uma linha**: o painel da curva sempre diz, num rótulo curto com número, se há virada projetada, virada possível ou nenhum sinal dela, junto com a chance de virada.

**Decisões** (aceitas pelo dono do projeto):

1. **Chance de virada**: é a chance de vitória de quem está atrás no placar parcial agora. Sai da projeção, sem cálculo novo, e segue o formato da chance de vitória (inteiros, "<1%").
2. **Três estados**, com limites provisórios de 50% e 5%, a calibrar no [Ensaio geral](15-ensaio-geral.md):
   - **Virada projetada** (chance de virada de 50% ou mais): "Virada projetada · ~88% das seções (80–95%) · chance de virada 62%", com losango e faixa.
   - **Virada possível** (de 5% a 50%): "Virada possível · a partir de ~69% das seções · chance de virada 25%", com faixa.
   - **Sem sinal de virada** (abaixo de 5%): "Sem sinal de virada · chance de virada 3%", sem losango nem faixa.
3. **Quando aparece**: em todo lugar com curva, da primeira seção até a indicação do TSE. Antes da primeira seção não há rótulo, porque ninguém está atrás no placar parcial.
4. **Com a chave de textos preditivos ligada**, os mesmos estados viram frases na manchete e na narração, por exemplo: "Sem sinal de virada: Flávio deve seguir à frente até o fim".
5. **Substitui** o "pode não ocorrer" da decisão 4 do [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md) e as frases da virada projetada da decisão 4 das [Telas da página de lugar](12-telas-da-pagina-de-lugar.md). O losango, a faixa e a ordem de chegada "mistura" continuam como estão.

**Glossário**: entra "Chance de virada", e "Virada projetada" passa a citar a chance de virada no lugar de "pode não ocorrer".

## Comments

- 18/10/2026, de [Ensaio geral](15-ensaio-geral.md) (decisão 18 de lá), que define a calibração dos limites da decisão 2 daqui:
  - **50% fica.**
  - **5% é posto à prova** em todas as rodadas da calibração, nas duas bases e com as pesquisas deslocadas. No Brasil e nas UFs, "sem sinal de virada" nunca pode aparecer antes de uma virada real. Nos municípios, no máximo 5% dos momentos com "sem sinal de virada" podem ser seguidos de uma virada.
  - **Se falhar**: o limite cai para 2% e, depois, para 1%.
