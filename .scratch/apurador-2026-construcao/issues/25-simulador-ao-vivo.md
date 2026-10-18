# 25: Simulador "e se" ao vivo

Status: ready-for-agent
Blocked by: 17, 24
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

Durante a apuração, o simulador roda sobre o arquivo completo que o coletor publica a cada rodada. Ele relê esse arquivo no ritmo da página de lugar: as hipóteses ficam paradas, e só o resultado se move. As hipóteses valem só para o voto que falta.

O simulador fecha com a indicação do TSE e com a totalização final, e desliga pela sua chave.

Decisões: [Simulador "e se"](../../apurador-2026/issues/13-simulador-e-se.md) (decisões 5, 9, 12 e 14), [Arquitetura e tecnologia](../../apurador-2026/issues/08-arquitetura-e-tecnologia.md) (decisão 18) e [Volume de gravações na noite](../../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md) (decisão 2).

## Critérios de aceite

- [ ] **Arquivo do simulador**: o coletor o publica com os dados por município na precisão do modelo, gravado só quando muda. Ele só é baixado quando o simulador abre.
- [ ] **Releitura**: o simulador relê o arquivo a cada 30 s. As hipóteses ficam paradas, o resultado se move, e a curva se estende.
- [ ] **Indicador ao vivo**: aparece na barra fixa do simulador, com os mesmos estados da página.
- [ ] **Depois da primeira seção**: as hipóteses prontas somem, e as hipóteses mexem só no voto que falta. O que já foi totalizado não muda.
- [ ] **Indicação do TSE**: o simulador fecha com "O TSE indica X eleito. O voto que falta não muda mais o resultado".
- [ ] **Totalização final**: fecha com "A apuração terminou". Nos dois casos, há link de volta.
- [ ] **Chaves**: desligar a chave do simulador, ou a da projeção, tira o simulador do ar e o link da caixa da projeção.
- [ ] **Link compartilhado**: com os mesmos dados, reproduz a mesma simulação em outro celular.
- [ ] **Replay de 2022**: com as hipóteses paradas, a simulação se atualiza a cada rodada.
