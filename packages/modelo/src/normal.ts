// A distribuição normal, a única que o modelo usa: a chance de vitória é a probabilidade de passar de 50%.

/** Quantos desvios padrão, para cada lado, cobrem 95% da normal: as faixas e margens de 95%. */
export const Z_95 = 1.959964;

/**
 * Φ, a função de distribuição da normal padrão, pela aproximação 26.2.17 de Abramowitz e Stegun (erro abaixo de
 * 7,5 × 10⁻⁸), a mesma do módulo `Projecao` do protótipo do método.
 */
export function phi(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
