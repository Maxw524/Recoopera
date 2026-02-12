
// src/utils/taxasCampanha.js

/**
 * @typedef {'SEM_REFORCO'|'AVAL'|'REAL'} Reforco
 */

// ✅ fallback: a matriz que você já tem hoje (hardcoded)
const MATRIZ_FALLBACK = {
  // ≥ 30%
  'FAIXA_30|CURTO|SEM_REFORCO': 1.88,
  'FAIXA_30|CURTO|AVAL': 1.69,
  'FAIXA_30|CURTO|REAL': 1.50,
  'FAIXA_30|LONGO|SEM_REFORCO': 2.19,
  'FAIXA_30|LONGO|AVAL': 1.97,
  'FAIXA_30|LONGO|REAL': 1.75,

  // 20%–29,99%
  'FAIXA_20|CURTO|SEM_REFORCO': 2.00,
  'FAIXA_20|CURTO|AVAL': 1.80,
  'FAIXA_20|CURTO|REAL': 1.60,
  'FAIXA_20|LONGO|SEM_REFORCO': 2.31,
  'FAIXA_20|LONGO|AVAL': 2.08,
  'FAIXA_20|LONGO|REAL': 1.85,

  // 10%–19,99%
  'FAIXA_10|CURTO|SEM_REFORCO': 2.13,
  'FAIXA_10|CURTO|AVAL': 1.91,
  'FAIXA_10|CURTO|REAL': 1.70,
  'FAIXA_10|LONGO|SEM_REFORCO': 2.49,
  'FAIXA_10|LONGO|AVAL': 2.24,
  'FAIXA_10|LONGO|REAL': 2.14
};

// ✅ matriz carregada do backend em runtime
let matrizAtual = null;

/** Define a matriz vinda do backend */
export function setMatrizTaxasCampanha(matriz) {
  // valida formato básico (objeto simples)
  if (matriz && typeof matriz === 'object' && !Array.isArray(matriz)) {
    matrizAtual = matriz;
  } else {
    matrizAtual = null;
  }
}

/** (Opcional) lê a matriz atual (útil no Admin) */
export function getMatrizTaxasCampanha() {
  return matrizAtual ?? MATRIZ_FALLBACK;
}

/**
 * Retorna a taxa a.m. conforme faixa de entrada, prazo e reforço.
 * @param {{
 *   entradaPercentual: number,
 *   prazoMeses: number,
 *   reforco?: Reforco,
 *   reforcoGarantia?: boolean,
 *   novoAvalista?: boolean
 * }} params
 * @returns {number|null}
 */
export function obterTaxaCampanha(params) {
  const {
    entradaPercentual,
    prazoMeses,
    reforco,
    reforcoGarantia,
    novoAvalista
  } = params || {};

  // ===== Normalização do REFORÇO =====
  let reforcoUsado;
  if (reforco === 'SEM_REFORCO' || reforco === 'AVAL' || reforco === 'REAL') {
    reforcoUsado = reforco;
  } else if (novoAvalista === true) {
    reforcoUsado = 'AVAL';
  } else if (reforcoGarantia === true) {
    reforcoUsado = 'AVAL';
  } else {
    reforcoUsado = 'SEM_REFORCO';
  }

  const entrada = Number(entradaPercentual) || 0;
  const prazo = Number(prazoMeses) || 0;

  // Faixas
  let faixa;
  if (entrada >= 30) faixa = 'FAIXA_30';
  else if (entrada >= 20) faixa = 'FAIXA_20';
  else if (entrada >= 10) faixa = 'FAIXA_10';
  else faixa = 'SEM_FAIXA';

  if (faixa === 'SEM_FAIXA') return null;

  const curto = prazo <= 24;

  // ✅ usa backend se existir; senão fallback
  const matriz = matrizAtual ?? MATRIZ_FALLBACK;

  const chave = `${faixa}|${curto ? 'CURTO' : 'LONGO'}|${reforcoUsado}`;
  return matriz[chave] ?? null;
}
