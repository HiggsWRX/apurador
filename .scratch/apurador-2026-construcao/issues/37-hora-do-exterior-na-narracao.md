# 37: Hora do Exterior na narração

Status: ready-for-agent
Blocked by: —
Spec: [Apurador 2026: especificação da construção](../spec.md)

## O que construir

Na noite de 25/10, a narração publicou eventos preditivos com uma hora impossível ("26/10 09:05:23", depois da totalização final), no topo da página do Brasil e de outros 1.148 lugares. Em 26/10, a página passou a esconder os preditivos (o `rodada.json` regravado com a chave desligada; [registro da noite](../../../docs/noite/2026-10-25.md), "Achados"). O código ainda tem o erro, que volta numa próxima noite.

## O que se sabe

- **O TSE publica o arquivo de cada cidade do Exterior com a hora local do país.** Wellington terminou às 17:05:23 de Brasília, e o arquivo dizia `2026-10-26 09:05:23`. No estado final do coletor (`.cache/coletor/estado-producao.json`), 51 cidades do Exterior (códigos 29xxx, 30xxx, 38xxx, 39xxx e 99xxx) têm o `visto` depois da final do Brasil: Katmandu 04:45:11, Mascate 03:22:50, Pyongyang 07:02:54 etc. Os arquivos do Brasil, das UFs e do Exterior (`ZZ`) vêm na hora de Brasília.
- **A narração guarda a totalização mais nova de todos os arquivos** (`maisNovo`, em `packages/coletor/src/narracao.ts`) e a dá ao preditivo de uma rodada sem arquivo novo do lugar (`const quando = vistosNaRodada.has(id) ? narrado.visto! : maisNovo!`). Ela só cresce: desde as 17:05, ficou em 09:05:23.
- **O evento de fim** de cada cidade do Exterior também leva a hora local dela, e a página diz que as horas são de Brasília.
- As medições estão em `tmp/hora-do-exterior.ts` e `tmp/lugar-com-hora-errada.ts` (fora do Git), que leem o estado final.

## Critérios de aceite

- [ ] O `maisNovo` só conta arquivos na hora de Brasília: o Brasil, as UFs e o Exterior (`ZZ`), e nunca uma cidade do Exterior. Um teste com o TSE falso, com uma cidade do Exterior com hora de outro fuso, prova que nenhum preditivo do Brasil ou de uma UF leva essa hora.
- [ ] Os eventos de uma cidade do Exterior não ficam com uma hora depois da última do Brasil: ou a hora vem convertida, ou o evento leva a hora do Brasil na rodada em que foi visto. A decisão é do dono.
- [ ] Um `visto` de cidade do Exterior à frente não trava a narração dela (`quando < narrado.visto` recusa os arquivos seguintes).

## Comments
