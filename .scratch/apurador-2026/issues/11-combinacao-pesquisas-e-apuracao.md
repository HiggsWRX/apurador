# Combinação de pesquisas e apuração

Type: grilling
Status: resolved
Blocked by: 09, 10
Map: [Apurador 2026](../map.md)

## Question

Na base "Apuração + pesquisas", como o agregado de pesquisas e o placar parcial se combinam numa única projeção, chance de vitória e curva projetada?

- Como o peso das pesquisas cai conforme a apuração avança (no país e em cada UF, já que as UFs chegam em ritmos diferentes).
- Como o modelo usa a diferença entre o que as pesquisas indicavam e o que a apuração mostra nos lugares já totalizados para corrigir os que ainda faltam.
- Como as duas bases convergem e quando a diferença entre elas deixa de ser relevante.
- Ponto de partida: o método da base "Só apuração" decidido em [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md), transferência de votos por UF com correção pelo município. As pesquisas entram como estimativa inicial da referência nacional e das UFs, e perdem peso conforme os municípios chegam.
- Contexto de [Métodos de projeção da apuração](05-metodos-de-projecao.md): um projeto aberto relata ganho de no máximo 0,05 p.p. ao usar pesquisas como ponto de partida durante a apuração. O valor das pesquisas está antes e no começo da apuração, e o modelo precisa mostrar isso de forma honesta.
- Como validar: rodar a combinação sobre 2018 e 2022 com as pesquisas da época, para o histórico de acerto que vai para a página de metodologia.

O que esta combinação recebe pronto de [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md):

- O agregado é só do Brasil e fica congelado às 23h de 24/10. Na eleição, a incerteza é normal, de 1,5 ponto na participação, e o erro é o mesmo em todos os lugares.
- Em cada lugar, esta base **começa** da indicação das pesquisas: o placar entre finalistas do lugar no 1º turno mais a mudança nacional (agregado − 51,0). Em 18/10 essa mudança é de ~0, então as duas bases partem quase do mesmo ponto.
- Fica para este ticket a incerteza local da indicação das pesquisas em cada lugar, isto é, quanto os lugares se afastam da mudança nacional, e como ela convive com a incerteza da base "Só apuração".
- A validação em 2018 e 2022 usa o `pesquisas-historicas.csv`, com a incerteza de cada ano calculada sem aquele ano.

## Answer

Resolvido em 18/10/2026 em conversa com o dono do projeto, que aceitou todas as recomendações.

**Em uma linha**: a base "Apuração + pesquisas" é o mesmo modelo da "Só apuração", com outro ponto de partida. Ela parte da indicação das pesquisas, que perde peso conforme o Brasil é apurado. As pesquisas valem tanto quanto K% das seções (K provisório de 0,5%): pesam metade com 0,5% das seções e menos de 10% depois de 5%.

**Medição**: quanto cada lugar mudou de forma diferente do país entre o 1º e o 2º turno, pelos dados oficiais por município. Mudança de um lugar = fatia do PT no 2º turno menos o placar entre finalistas do PT no 1º turno.

| Ano | Votos dos eliminados no 1º turno | Desvio das UFs (dp) | Desvio dos municípios em torno da UF (dp) |
|---|---|---|---|
| 2018 | 24,7% (Ciro com 45% no CE); dp entre UFs de 6,6 p.p. | 3,4 p.p. | 3,8 p.p. |
| 2022 | 8,4%; dp entre UFs de 2,0 p.p. | 0,55 p.p. | 0,71 p.p. |
| 2026 | 7,8%; dp entre UFs de 2,25 p.p.; GO com 15,3% (Caiado) e AL com 4,8% | — | — |

Só os votos dos eliminados têm destino incerto. Por isso, a mesma mudança para todos os lugares funcionou em 2022 e falhou em 2018. O 1º turno de 2026 se parece com o de 2022, com Goiás como exceção.

**Decisões** (aceitas pelo dono do projeto):

1. **Mesmo modelo, outro ponto de partida.** Para o voto que falta em cada município, a estimativa é: peso das pesquisas × indicação das pesquisas + (1 − peso) × a estimativa da apuração do [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md), que usa a referência da UF, da região ou do Brasil.
   - A correção pelo próprio município, que pesa metade com 3.000 votos apurados, continua por cima.
   - Antes da primeira seção, o peso é 100%, e a projeção é a indicação das pesquisas.
2. **Peso das pesquisas = K ÷ (K + % de seções totalizadas no Brasil)**, um número só para o país.
   - Por quê: o erro das pesquisas é sobretudo nacional (1,5 ponto comum a todos os lugares, contra ~1 de desvio local), então a evidência contra elas também se acumula no país todo.
   - O ritmo de cada UF continua valendo na parte da apuração, com o mesmo recuo UF → região → Brasil da base "Só apuração". É por essa parte que os lugares já apurados corrigem os que faltam.
   - Descartadas: pesquisas só antes da apuração (troca brusca, justo nos dados mais ruidosos, e controle de base inútil a partir das 17h) e média das duas projeções finais (não aprende com a apuração e segura as pesquisas por tempo demais, porque a incerteza inicial da "Só apuração" é conservadora).
3. **Incerteza da indicação das pesquisas.**
   - **Nacional**: 1,5 ponto, comum a todos os lugares, como decidido em [Agregado de pesquisas e erro histórico](10-agregado-de-pesquisas.md).
   - **Local**, independente entre lugares: na UF, 0,13 × a fatia dos eliminados no 1º turno da UF (~1,0 em média, 2,0 em GO, 0,6 em AL); no município, em torno da UF, 0,15 × a fatia dos eliminados no 1º turno do município.
   - Os coeficientes vêm de 2018, o caso ruim, e dão folga de cerca de 2 vezes sobre 2022.
   - Antes da apuração, a incerteza é de 1,5 no Brasil, 1,8 na UF média e 2,5 em Goiás.
   - Durante a apuração, as incertezas das pesquisas entram multiplicadas pelo peso das pesquisas, e as da apuração, pelo restante.
4. **Calibração de K.** O 2º turno de 2022 é reproduzido três vezes: com as pesquisas reais (erro de 0,1 ponto) e com as pesquisas deslocadas 2 pontos para cada candidato, um erro do tamanho do de 2018.
   - K é o maior valor, entre 0,05% e 2%, em que, com as pesquisas deslocadas, a base com pesquisas erra no máximo 0,1 p.p. a mais que a "Só apuração" a partir de 2% das seções.
   - Até o teste rodar, K = 0,5%.
   - O erro das duas bases ao longo da noite vai para a página de metodologia. Reproduzir a noite de 2018 fica para a [Página de metodologia](20-pagina-de-metodologia.md).
5. **Transparência.** O JSON leva o peso das pesquisas.
   - Ao lado do controle **Base da projeção**, a página mostra "As pesquisas pesam X% na projeção agora".
   - Quando, num lugar, as duas bases diferem em menos de 0,1 p.p. na projeção e em menos de 1 ponto na chance de vitória, ela mostra "As duas bases já coincidem".
   - O controle fica disponível a noite toda.
   - "As pesquisas deixaram de pesar" vira um evento candidato da [Narração da noite](14-narracao-da-noite.md).
6. **Curva projetada antes da apuração.** Antes das 17h, as duas bases desenham a curva projetada de 0% a 100%, com a virada projetada, usando a ordem de chegada do 1º turno. Na base com pesquisas, isso depende do sinal verde da [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md), como a projeção e a chance de vitória.

**Nota para a implementação**: as duas bases partem do placar entre finalistas de cada lugar, e a base com pesquisas soma a ele a mudança nacional, como decidiu o [Método de projeção só com a apuração](09-metodo-projecao-so-apuracao.md). O protótipo não faz isso: no recuo "1º turno" do método de transferência, ele divide os votos dos eliminados meio a meio (`par = 0,5`). O código definitivo deve seguir a decisão.

**Glossário**: entra "Peso das pesquisas".

## Comments

- 18/10/2026, de [Consulta a advogado eleitoral](16-consulta-advogado-eleitoral.md): a curva projetada antes das 17h (decisão 6 daqui) fica atrás de uma chave, desligada até a [Segunda consulta jurídica](21-segunda-consulta-juridica.md). Desligada, nenhuma das duas bases mostra projeção antes das 17h. A combinação a partir das 17h não muda.
- 18/10/2026, de [Segunda consulta jurídica](21-segunda-consulta-juridica.md): a chave está ligada, e a decisão 6 daqui volta a valer como painel, com os rótulos do [Sinal de virada](23-sinal-de-virada.md) e sem frases preditivas. A confirmação expressa é pedida na [Confirmação dos textos preditivos](22-confirmacao-dos-textos-preditivos.md).
