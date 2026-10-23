import { placarEntreFinalistas, REGIOES } from "@apurador/modelo";
import type { Lugar } from "@apurador/pipeline";
import { compactarBase, type ArquivoDoSimulador } from "./arquivo-do-simulador";
import type { IdDaBase } from "./bases-da-projecao";
import { CHAVES, type Chaves } from "./chaves";
import { umaCasa } from "./formato";
import type { FinalistasDoSimulador } from "./hipoteses";
import { corDoPartido, nomeCurto } from "./identidade";
import { CONSTANTES, VIES_DO_PRIMEIRO_TURNO } from "./metodologia";
import { AGREGADO, FINALISTAS, PESQUISAS_DE_2026, PLACAR_ENTRE_FINALISTAS_DO_BRASIL, TURNO } from "./pesquisas";
import { BASE_DO_MODELO, MODELO } from "./projecao-antes-das-17h";

// O simulador "e se" antes das 17h no build (Simulador "e se", decisão 5; Consulta a advogado eleitoral, decisão 2):
// se ele vai ao ar, o arquivo que ele baixa ao abrir e o caminho da tela. O arquivo parte dos mesmos dados da projeção
// de antes das 17h (a base do modelo de 25/10, as constantes congeladas e o agregado do instante do build), para o
// simulador mostrar ao lado a mesma projeção da página do Brasil.

/**
 * Se o simulador vai ao ar antes das 17h: com a chave dele e com a da projeção. A simulação fica sempre ao lado da
 * projeção do Apurador e mostra a chance de vitória, que é da projeção (Simulador "e se", decisão 8; Consulta a advogado
 * eleitoral, decisão 2), e a especificação diz que desligar a projeção desliga também o simulador, como na noite.
 */
export const simuladorNoAr = (chaves: Chaves["antesDas17h"]) => chaves.simulador && chaves.projecao;

/** Se o simulador está no ar antes das 17h, pelo arquivo de chaves. Desligado, a tela diz que ele abre às 17h. */
export const SIMULADOR_ANTES_DAS_17H = simuladorNoAr(CHAVES.antesDas17h);

/** A tela do simulador. */
export const CAMINHO_DO_SIMULADOR = "/simulador/";
/** O arquivo que o simulador baixa ao abrir, gerado no build só com ele no ar. */
export const CAMINHO_DO_ARQUIVO = "/dados/simulador.json";

/**
 * O link "Simular 'e se' →" da caixa da projeção de um lugar: com a base escolhida e, numa UF ou num município, a UF, para
 * o simulador abrir com a região dela expandida (decisão 7). O Exterior não tem região.
 */
export function caminhoDoSimulador(base: IdDaBase, lugar?: Pick<Lugar, "tipo" | "uf">): string {
  const de = lugar?.uf && lugar.uf !== "ZZ" && (lugar.tipo === "uf" || lugar.tipo === "municipio") ? `&de=${lugar.uf.toLowerCase()}` : "";
  return `${CAMINHO_DO_SIMULADOR}?base=${base}${de}`;
}

const doSimulador = (c: (typeof FINALISTAS)[number]) => ({ nomeUrna: c.nomeUrna, nomeCurto: nomeCurto(c.nomeUrna), cor: corDoPartido(c.partido) });
/** Os finalistas na ordem da base do modelo, como o simulador os mostra. */
export const FINALISTAS_DO_SIMULADOR: FinalistasDoSimulador = [doSimulador(FINALISTAS[0]), doSimulador(FINALISTAS[1])];

/**
 * O voto das hipóteses prontas: quanto as pesquisas finais do 1º turno subestimaram Flávio, em pontos entre os dois
 * finalistas, com uma casa, o mesmo número que a metodologia escreve (decisão do dono, 20/10, ticket 24). É do 1º
 * finalista do simulador; no build do ensaio geral, ele é Lula, e o viés passa ao finalista de número 22, como em 2026.
 */
export const VIES_DAS_HIPOTESES_PRONTAS = umaCasa(
  (FINALISTAS[0].numero === PESQUISAS_DE_2026.finalistas[0].numero ? 1 : -1) * VIES_DO_PRIMEIRO_TURNO.diferenca,
);

/** O 1º turno de 2026 em cada região, pelo arquivo oficial: o placar entre finalistas e o comparecimento. */
function primeiroTurnoDasRegioes(): ArquivoDoSimulador["regioes"] {
  const [primeiro, segundo] = FINALISTAS.map((f) => TURNO.candidatos.findIndex((c) => c.numero === f.numero)) as [number, number];
  const somas = REGIOES.map(() => ({ votantes: 0, aptos: 0, primeiro: 0, segundo: 0 }));
  MODELO.ufs.forEach((uf, u) => {
    const r = MODELO.regiaoDaUf[u]!;
    const l = TURNO.lugares[uf];
    if (r < 0 || !l) return;
    somas[r]!.votantes += l.votantes;
    somas[r]!.aptos += l.aptos;
    somas[r]!.primeiro += l.votos[primeiro]!;
    somas[r]!.segundo += l.votos[segundo]!;
  });
  return somas.map((s) => ({ placarEntreFinalistas: placarEntreFinalistas(s.primeiro, s.segundo)!, comparecimento: s.votantes / s.aptos }));
}

/**
 * O arquivo do simulador antes das 17h. Sem o agregado no ar (a chave dele desligada, ou nenhuma pesquisa na janela),
 * vai sem ele, e o simulador fica só com a "Só apuração", como a caixa da projeção.
 */
export function arquivoDoSimulador(): ArquivoDoSimulador {
  return {
    base: compactarBase(BASE_DO_MODELO),
    agregado: CHAVES.antesDas17h.agregado && AGREGADO ? { valor: AGREGADO.valor, incerteza: AGREGADO.incerteza } : null,
    constantes: CONSTANTES,
    placarEntreFinalistasDoBrasil: PLACAR_ENTRE_FINALISTAS_DO_BRASIL,
    regioes: primeiroTurnoDasRegioes(),
  };
}
