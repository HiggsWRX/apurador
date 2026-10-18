# 01: Esqueleto: a página do Brasil com o 1º turno de 2026, do TSE ao deploy

Status: resolved
Blocked by: —
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

O primeiro caminho completo do projeto, do arquivo oficial do TSE até uma página no ar. O pipeline baixa o resultado do 1º turno de 2026 do portal de dados abertos do TSE e grava os dados derivados do Brasil no repositório, com o manifesto de origem. O site em Astro constrói a página de lugar do Brasil com as barras dos candidatos desse turno, e o deploy a põe em `*.workers.dev`.

Este ticket cria a base que os outros usam: o repositório com workspaces do npm e os seis módulos (`modelo`, `tse`, `coletor`, `pipeline`, `ensaio`, `site`), TypeScript, Vitest e o CI no GitHub Actions.

Decisões: [Arquitetura e tecnologia](../../apurador-2026/issues/08-arquitetura-e-tecnologia.md) (decisões 2, 3, 6, 12 e 13) e [Dados históricos por município e malhas](../../apurador-2026/issues/03-dados-historicos-e-malhas.md).

## Critérios de aceite

- [x] O repositório tem os seis módulos como workspaces do npm, em TypeScript, com testes em Vitest.
- [x] O leitor histórico do `tse` lê só o membro `*_BR.csv` de `votacao_candidato_munzona` e de `detalhe_votacao_munzona`, por HTTP *Range*, sem baixar o zip inteiro.
- [x] O pipeline baixa para um cache fora do Git e grava no repositório só os dados derivados, com manifesto de origem (URL, data de geração do TSE, hash).
- [x] A construção do site lê só o repositório, sem rede.
- [x] Os candidatos vêm dos arquivos do TSE, nunca fixos no código.
- [x] Um teste confere os totais do Brasil no 1º turno de 2026 contra o resultado oficial: Flávio 47,03% e Lula 45,16% dos votos válidos.
- [x] A página do Brasil mostra as barras do 1º turno de 2026, com os 5 maiores e "demais", os números do TSE com duas casas e a atribuição do TSE (CC-BY).
- [x] O CI roda os testes em cada pull request e push na `main`, e o deploy na Cloudflare sai da `main`. Sem os secrets da Cloudflare, que são pendência do dono, o passo de deploy pula com aviso, e o deploy manual com o login do `wrangler` funciona.
- [x] A página está no ar em `*.workers.dev`, com `noindex`.

## Comments

**18/10/2026, resolvido:**

- **No ar**: https://apurador.hicampos93.workers.dev, com `noindex` no HTML e no cabeçalho `X-Robots-Tag`, publicado com o login do `wrangler`. As URLs de prévia por versão estão desligadas.
- **Dados**: o 1º turno de 2026 do Brasil bate com o oficial, conferido por teste: Flávio 47,03% e Lula 45,16% dos votos válidos, mais aptos, votantes, válidos, brancos e nulos. O TSE escreve o nome de urna sem acento, "FLAVIO BOLSONARO", e o site o mostra assim.
- **Leitura do TSE**: o membro `*_BR.csv` do zip de candidatos (~456 MB) vem em ~1 s, só por Range. O leitor recusa um servidor que ignore o Range.
- **Vocabulário**: a contagem `QT_COMPARECIMENTO` virou `votantes`, porque o `GLOSSARY.md` define comparecimento como fração. Vale registrar "votantes" no glossário.
- **CI**: o workflow está no repositório. Ele roda no primeiro push, e o deploy pela `main` só funciona depois de o dono gravar `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` nos secrets do GitHub.
- **Ficou para o ticket 02**: os tipos de lugar e de totais, e a identidade visual.
