# 17: Projeção ao vivo no Brasil, nas UFs e no Exterior

Status: ready-for-agent
Blocked by: 08, 15, 16
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

A cada rodada, o coletor roda o `modelo` nas duas bases da projeção e publica o resultado pronto nos JSONs completos do Brasil, de cada UF e do Exterior. O peso das pesquisas vai no arquivo de rodada.

A página ganha:

- o bloco da projeção;
- a curva projetada com a faixa;
- a virada projetada e o rótulo do sinal de virada;
- o controle **Base da projeção**.

A narração do Brasil ganha o evento "As pesquisas deixaram de pesar". Os blocos da projeção e da base com pesquisas desligam pelas suas chaves.

Decisões: [Telas da página de lugar](../../apurador-2026/issues/12-telas-da-pagina-de-lugar.md) (decisões 3, 4 e 6 e comentários), [Combinação de pesquisas e apuração](../../apurador-2026/issues/11-combinacao-pesquisas-e-apuracao.md) (decisão 5), [Sinal de virada](../../apurador-2026/issues/23-sinal-de-virada.md), [Volume de gravações na noite](../../apurador-2026/issues/24-volume-de-gravacoes-na-noite.md) (decisão 2) e [Ensaio geral](../../apurador-2026/issues/15-ensaio-geral.md) (decisões 19 e 21).

## Critérios de aceite

- [ ] **Conteúdo dos JSONs**: os do Brasil, de cada UF e do Exterior trazem, nas duas bases, a projeção, a margem, a chance de vitória, a curva projetada, a virada projetada, a chance de virada, o estado do sinal de virada, as comparações e "as duas bases coincidem".
- [ ] **Precisão dos números**: projeção e margem com uma casa, chance e % da virada inteiros.
- [ ] **Bloco da projeção**:
  - moldura tracejada, fundo próprio e o aviso "Estimativa do Apurador. Não é resultado oficial nem garantia do resultado.";
  - resultado ± margem de 95%;
  - chance numa barra dividida (inteiros, "<1%" e ">99%"; 100% só com a indicação do TSE).
- [ ] **Controle Base da projeção**: o padrão é "Apuração + pesquisas", e ele fica disponível a noite toda. Ao lado, aparece "As pesquisas pesam X% na projeção agora" ou "As duas bases já coincidem aqui".
- [ ] **"A projeção, comparada"**: com o 1º turno, pelo placar entre finalistas, e com a indicação das pesquisas, no formato "Lula +1,8". Durante a apuração, compara a projeção; depois do fim, o resultado.
- [ ] **Links**:
  - "Como calculamos →" leva à metodologia, a chance a `#chance`, o peso e as bases a `#juntas` e o rótulo do sinal de virada a `#virada`;
  - a partir das 17h, há um link para "as N pesquisas do agregado".
- [ ] **Curva**:
  - curva projetada tracejada, com faixa de 95% e legenda;
  - a virada projetada é um losango sobre a faixa cinza;
  - o rótulo do sinal de virada aparece em três estados, com a chance de virada ("Virada projetada · ~88% das seções (80–95%) · chance de virada 62%"), da primeira seção até a indicação do TSE.
- [ ] Curva e projeção levam "Cálculo do Apurador com dados do TSE".
- [ ] **"As pesquisas deixaram de pesar"**: entra uma vez na narração do Brasil, quando as duas bases coincidem no Brasil. Ganha número na curva do Brasil e aparece intercalado nas outras páginas.
- [ ] **Indicação do TSE**: a chance vai a 100%, e o rótulo do sinal de virada some. Na totalização final, a caixa da projeção sai. UFs e municípios mostram só "totalização final".
- [ ] **Chaves**: desligar a projeção tira o bloco, a curva projetada e o rótulo. Desligar a base com pesquisas tira o controle, e só "Só apuração" aparece.
- [ ] Nenhum texto preditivo: a manchete continua só com o placar oficial.
- [ ] **Replay de 2022**, com as constantes provisórias:
  - erro de até 0,5 p.p. depois de 5% das seções;
  - resultado dentro da margem de 95% depois de 1%;
  - "sem sinal de virada" nunca aparece no Brasil antes das 18:44;
  - "as pesquisas deixaram de pesar" acontece uma vez só.

## Comments

- 19/10/2026, do [ticket 12](12-coletor-minimo-e-replay.md): o modelo lê o que o coletor guarda por `coletor.resultado(abrangencia)`: Brasil, UFs, municípios e as 725 zonas dos 190 municípios com mais de uma, que não são publicadas. Cada resultado é um `ResultadoDoTse` (`packages/tse/src/ao-vivo.ts`), com seções, eleitorado, válidos, brancos, nulos e os votos de cada candidato. Os arquivos ao vivo são montados em `publicar()`, em `packages/coletor/src/coletor.ts`.
- 19/10/2026, do [ticket 08](08-base-apuracao-mais-pesquisas.md):
  - A cada rodada, `projetarNasDuasBases(modelo, apuracao, constantes, agregado)`, com o agregado congelado (incerteza de 1,5), dá:
    - as duas bases (`soApuracao` e `comPesquisas`);
    - o peso das pesquisas, para o arquivo de rodada (`comPesquisas.pesoDasPesquisas`);
    - `coincidem` no Brasil, em cada UF e no Exterior e em cada município.
  - A curva projetada de cada base é o `curvaProjetada` sobre a `Projecao` daquela base.
  - No replay de 2022, o agregado é o `agregadoDaNoite` do `pipeline`: Lula com 50,98, no 1º finalista da base do modelo.
  - Com esse agregado, as bases coincidem no Brasil de ~12% das seções até o fim, e não nos ~5% do exemplo do ticket 14 do mapa. As projeções já ficam a menos de 0,1 p.p. desde 3%, mas as chances diferem mais de 1 ponto até 12%.
  - Nas três noites de 2022 (agregado real e deslocado), o "coincidem" do Brasil começa e fica. Numa noite em que ele vá e volte, o evento "as pesquisas deixaram de pesar" ainda sai uma vez só.
