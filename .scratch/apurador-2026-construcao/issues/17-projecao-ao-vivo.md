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

- 19/10/2026, do [ticket 28](28-calibracao.md):
  - As constantes estão congeladas no `packages/modelo/constantes.json` (ler com `lerConstantes`): incertezas de 2 e 2 p.p., peso do próprio município de 10.000 votos, "mistura", K de 0,25% e limite de 2% para "sem sinal de virada". A zona não entra, e a base da noite fica por município.
  - Com K de 0,25%, as pesquisas pesam metade com 0,25% das seções, e o "coincidem" do Brasil deve vir antes dos ~12% medidos no ticket 08 com K de 0,5%.
  - A margem média de 5% a 50% das seções fica em ~3,0 p.p., o dobro da provisória, e a cobertura em 100% nas três noites.
  - O critério do ensaio "sem sinal de virada nunca no Brasil antes das 18:44" passa na calibração, nas noites de 2022 e nas duas bases. A conferência dele nos arquivos publicados é do replay.
- 19/10/2026, do [ticket 14](14-bloco-ao-vivo.md):
  - A curva projetada, a faixa e a virada projetada entram em `packages/site/src/components/CurvaReal.tsx`, por cima da curva real.
  - A escala hoje é só a da curva real: a meia altura é a maior distância de 50% depois de 3% das seções, mais 1 ponto, em passos de 2, como no protótipo. A faixa da projeção tem de entrar nessa conta, também só depois de 3%.
  - A projeção vem depois da curva, em `components/VistaDoBlocoAoVivo.tsx` (decisão 1 das Telas). A manchete continua só com o placar oficial.
- 20/10/2026, do [ticket 16](16-comandos-chaves-e-plano-zero.md):
  - **As chaves da noite** são `nucleoMinimo`, `projecao`, `baseComPesquisas`, `simulador`, `mapa` e `textosPreditivos` (`NOMES_DAS_CHAVES`, em `packages/coletor/src/chaves.ts`, o vocabulário que coletor e página compartilham). O dono liga e desliga por `npm run noite -- desligar projecao` (ou `base-com-pesquisas`), que grava `.cache/coletor/controle.json`; o coletor lê o arquivo no começo de cada rodada e publica o estado em `rodada.json`, no campo `chaves`, já com a dependência aplicada: `simulador` só é `true` com `projecao` ligada.
  - **No coletor**, o controle da rodada é a variável `controle` de `criarColetor` (`packages/coletor/src/coletor.ts`), que `publicar()` já usa para o núcleo mínimo: é por `controle.chaves.projecao` e `controle.chaves.baseComPesquisas` que a projeção decide o que vai nos JSONs do Brasil, das UFs e do Exterior. O mesmo controle fica em `registro.controle`.
  - **Na página**, o bloco lê a sua chave em `quadro.chaves.projecao` e `quadro.chaves.baseComPesquisas` (`QuadroAoVivo`, em `packages/site/src/lib/leitor-ao-vivo.ts`): até a primeira rodada, são as de `dados/chaves.json` (`noite`); depois, as do arquivo de rodada, que mudam sem recarregar. Uma regra que derive de uma chave vai em `lib/chaves-ao-vivo.ts`, ao lado de `emPlanoZero`. A vista (`components/VistaDoBlocoAoVivo.tsx`) já começa pelo plano zero: o bloco da projeção entra depois da curva, no caminho normal.
  - **No replay**, `OpcoesDoReplay.controle` (`packages/ensaio/test/replay.test.ts`) dá o controle por instante do relógio do coletor: é assim que se liga e desliga a chave em rodadas escolhidas e se confere o efeito nos JSONs. O último `describe` do arquivo é o modelo.
  - O aviso pronto 3 ("A projeção do Apurador está suspensa…") é o que o dono publica junto com `desligar projecao` (Operação na noite, decisão 18). A faixa já existe (`components/FaixaDeAviso.tsx`): nada a fazer aqui.
- 20/10/2026, do [ticket 09](09-painel-antes-das-17h.md):
  - Peças prontas em `packages/site/src/components/`: `EixosDaCurva.tsx` (a escala, os eixos e o recorte, que a `CurvaReal` já usa), `CurvaProjetada.tsx` (as duas linhas tracejadas, a faixa de 95%, o losango e a faixa da virada a partir de uma `CurvaDoLugar`, sem o rótulo do sinal), `ChanceDeVitoria.tsx` (a barra dividida, com `formatarChance` de `lib/formato.ts`: "<1%" e ">99%"; o 100% da indicação do TSE é outro caminho) e `ValoresDosFinalistas.astro` (com `margem`). O controle Base da projeção (`[data-base-botao]`, `[data-base]` com `data-ativa`) e o CSS do painel (`.projecao`, `.chance-*`, `.base-da-projecao`, `.curva-projetada`) estão em `global.css`.
  - "A projeção, comparada" usa `quemGanhouEntre(de, para)` de `lib/pesquisas.ts`: a mudança entre os números como a página os mostra, no formato "LULA +1,8".
  - Achado no `modelo`: antes da primeira seção, na "Só apuração" com as constantes congeladas, `viradaProjetada` dá `cedo: null` embora a faixa de 95% já cubra os 50% desde o primeiro ponto (a margem de 8,9 é mais larga que a distância a 50%): o `cruza` só acha o cruzamento de baixo para cima. A página então não desenha a faixa da virada nessa base. Com placar parcial isso some; se a regra mudar, é no `modelo`.
- 20/10/2026, do [ticket 24](24-simulador-antes-das-17h.md): a caixa da projeção leva o link do simulador antes de "Como calculamos →". Na noite, em toda página de lugar, o link é `caminhoDoSimulador(base, lugar)` (`packages/site/src/lib/simulador-antes-das-17h.ts`): numa UF ou num município, ele leva `&de=<uf>`, e o simulador abre com a região do lugar expandida. O script do controle Base da projeção (`components/ProjecaoAntesDas17h.astro`) troca o `base=` do link (`a[data-simular]`) quando o visitante troca a base. `IdDaBase` e os nomes das bases passaram a `lib/bases-da-projecao.ts`, e a `CurvaProjetada` ganhou `doSite`, que desenha por baixo a curva projetada do site quando a `curva` é a da simulação.
- 20/10/2026, do [ticket 33](33-curva-de-comparacao.md): a escala da `CurvaReal` já soma duas curvas.
  - A conta começa pela distância de 50% da curva de comparação ligada (`distanciaDaComparacao`, em `components/CurvaDeComparacao.tsx`), só depois de 3% das seções, e segue pela curva real. A faixa da projeção entra na mesma `distancia`.
  - As linhas da comparação ficam por baixo de tudo no grupo recortado: a curva projetada entra depois delas.
