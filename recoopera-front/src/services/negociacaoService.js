import { obterTaxaCampanha } from "../utils/taxasCampanha";

export function calcularTaxaFinal({
  taxaContratos,
  entradaPercentual,
  prazoMeses,
  novoAvalista,
  contratoElegivelDesconto
}) {
  const menorTaxa = Math.min(...taxaContratos);

  // Regra de política
  if (menorTaxa < 1.5) {
    return menorTaxa;
  }

  // Se não for elegível, não aplica campanha
  if (!contratoElegivelDesconto) {
    return menorTaxa;
  }

  const reforcoGarantia = novoAvalista === true;

  return obterTaxaCampanha({
    entradaPercentual,
    prazoMeses,
    reforcoGarantia
  });
}
