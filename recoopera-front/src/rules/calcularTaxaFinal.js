
// src/rules/calcularTaxaFinal.js
import { obterTaxaCampanha } from '../utils/taxasCampanha';

/**
 * Helper minimalista compatível com seu snippet.
 * @param {{
 *  taxaContratos:number[],
 *  entradaPercentual:number,
 *  prazoMeses:number,
 *  novoAvalista:boolean,
 *  avalEhSocio?:boolean,
 *  contratoElegivelDesconto:boolean
 * }} p
 * @returns {number}
 */
export function calcularTaxaFinal(p) {
  const {
    taxaContratos,
    entradaPercentual,
    prazoMeses,
    novoAvalista,
    avalEhSocio = false,
    contratoElegivelDesconto
  } = p;

  const menorTaxa = Math.min(...taxaContratos);

  if (menorTaxa < 1.5) return menorTaxa;

  if (!contratoElegivelDesconto) return menorTaxa;

  const reforco = (novoAvalista && !avalEhSocio) ? 'AVAL' : 'SEM_REFORCO';

  const taxaCampanha = obterTaxaCampanha({
    entradaPercentual,
    prazoMeses,
    reforco
  });

  return taxaCampanha ?? menorTaxa;
}
