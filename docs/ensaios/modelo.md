# Ensaio geral N: DD/10/2026

O modelo do registro de cada ensaio geral (Ensaio geral, decisões 19 a 26). Copie para `docs/ensaios/2026-10-DD.md` e preencha. A seção "Números da conferência automática" é a saída de `npm run conferir-ensaio`; o resto é de quem operou e de quem assistiu. Os números são arredondados uma vez, do valor inteiro, às casas que a tabela mostra.

## Como rodou

- **Hora real**: do começo ao fim, no relógio do computador do dono.
- **TSE falso**: a `--partida` (16:50, salvo outra) e o ritmo (3x até as 20:30 da noite, 30x depois).
- **Site**: `https://apurador-ensaio.hicampos93.workers.dev`, com o commit do deploy. Pelo R2 (`ao-vivo-ensaio.apurador.org`) ou só pelo plano B (sem domínio).
- **Coletor**: com gzip ou com `--sem-gzip`, e as chaves no começo.
- **Quem assistiu**: nome, aparelho e rede (4G ou Wi-Fi) de cada pessoa, e quem foi o vigia.

Os comandos, cada um num terminal, da raiz do repositório:

1. `npm run tse-falso -- --partida 16:50`, que grava a partida do relógio em `.cache/tse-falso/relogio.json`;
2. `npm run coletor -- --destino ensaio --tse http://127.0.0.1:8022/oficial --noite 2022-2`;
3. `npm run ler-ensaio`, antes das 16:50 da noite e até o coletor parar;
4. depois: `npm run conferir-ensaio -- --painel-da-cloudflare <operações classe A do bucket no mês> --excluir <HH:MM-HH:MM de cada queda provocada>`.

## Números da conferência automática

Cole aqui a saída de `npm run conferir-ensaio` (`.cache/ensaio/conferencia-<hora>.md`). Ela traz o placar idêntico, os textos preditivos com a chave desligada, o atraso no caminho R2 e no plano B, o cache, a narração contra o replay, o tempo das rodadas, as gravações, o contador contra o painel da Cloudflare e os dados por visitante.

## Critérios medidos à mão

### Núcleo mínimo (todos bloqueantes)

| Critério | Meta | Medido | Resultado |
| --- | --- | --- | --- |
| Indicador ao vivo | os seis estados aparecem quando provocados; "interrompida" entre 3 e 4 min depois de o coletor cair | | |
| Coletor derrubado | volta sozinho em menos de 1 min, sem evento repetido nem retroativo | | |
| Internet cortada | a publicação volta em até 3 min pelo roteador de celular | | |
| Plano B acionado | os dados voltam em até 5 min | | |
| TSE | nenhuma violação do limite no registro do TSE falso (`.cache/tse-falso/registro-*.jsonl`) | | |
| Narração factual | no Brasil, uma só virada, às ~18:44, e as 4 viradas em UF (MG duas vezes, AP e AM) | | |
| 17h | todos os celulares passam ao ao vivo sem recarregar | | |
| Chaves | cada chave ligada ou desligada aparece no site em até 2 rodadas mais o cache | | |
| Celulares | placar e curva visíveis em até 3 s no Android barato no 4G, sem travamento visível | | |

### Projeção

| Critério | Meta | Medido | Resultado |
| --- | --- | --- | --- |
| Erro | até 0,5 p.p. depois de 5% das seções, no número publicado contra o resultado publicado | | |
| Margem | o resultado dentro da margem de 95% depois de 1% | | |
| Sinal de virada | "sem sinal de virada" nunca aparece no Brasil antes das 18:44 | | |
| Pesquisas | "as pesquisas deixaram de pesar" acontece uma vez só | | |
| Antes das 17h | o painel de antes das 17h mostra o agregado de 2022 (Lula 51,0%) e as curvas das duas bases | | |
| Retirada de pesquisa | o agregado recalculado, a lista sem ela e as curvas aparecem em até 10 min, sem tocar no coletor | | |

### Simulador

| Critério | Meta | Medido | Resultado |
| --- | --- | --- | --- |
| Abertura | em até 5 s no Android barato no 4G | | |
| Hipóteses paradas | atualiza a cada rodada | | |
| Link compartilhado | reproduz a mesma simulação em outro celular | | |
| Par simétrico | resultados espelhados | | |

### Mapa

| Critério | Meta | Medido | Resultado |
| --- | --- | --- | --- |
| Desenho | todos os municípios em até 2 s no Android barato, sem travar a rolagem | | |

### Textos preditivos

| Critério | Meta | Medido | Resultado |
| --- | --- | --- | --- |
| Chave desligada | nenhum preditivo em nenhum JSON público (conferência automática) | | |
| Ligada no meio da noite | entram dali em diante, sem nada retroativo | | |
| Desligada de novo | somem todos, inclusive a frase de projeção da manchete, duas rodadas depois | | |

### Carga, gravações e volume

| Medição | Referência | Medido |
| --- | --- | --- |
| Computador do dono | CPU, memória e rede durante o pico | |
| Volume da noite | ~500 MB, somando o envio e o que vem do TSE. O envio é o `SentBytes` do `Get-NetAdapterStatistics`, no PowerShell, antes e depois. O TSE falso é local e não passa pelo adaptador, e o leitor recebe por ele: o que vem do TSE fica com a conta do ticket 24 | |
| Gzip pela borda | `npm run conferir-entrega -- --destino ensaio` passa com gzip | |
| Limites dos alertas | `LIMITES_DOS_ALERTAS`, em `packages/coletor/src/alertas.ts` | |

## Falhas, com hora

| Hora real | Hora da noite | Quem viu | O que aconteceu | Print |
| --- | --- | --- | --- | --- |
| | | | | |

## Veredito de cada bloco

| Bloco | Veredito | Por quê |
| --- | --- | --- |
| Núcleo mínimo | | |
| Projeção | | |
| Base Apuração + pesquisas | | |
| Simulador | | |
| Mapa | | |
| Textos preditivos | | |

Um bloco reprovado vai para a noite com a chave desligada; sem o núcleo mínimo, vale o que diz a decisão 24 do Ensaio geral.

Assinado: \_\_\_\_\_\_\_\_\_\_ (o dono do projeto), em \_\_/10/2026, às \_\_h\_\_.
