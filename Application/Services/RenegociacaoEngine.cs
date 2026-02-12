using Recoopera.Application.DTOs;
using Recoopera.Application.Enums;

public class RenegociacaoEngine
{
    private const decimal TAXA_MINIMA_ABSOLUTA = 1.59m;

    public ResultadoCalculoResponse Simular(CalculoRenegociacaoRequest request)
    {
        var contratos = request.Contratos;

        // ===============================
        // BASE DA NEGOCIAÇÃO
        // ===============================
        var valorTotal = contratos.Sum(c => c.ValorSaldoContabilBruto);

        // ===============================
        // ANÁLISES
        // ===============================
        var menorTaxaContrato = contratos.Min(c => c.TaxaJuros);
        var possuiAtrasoMaior30 = contratos.Any(c => c.DiasAtraso > 30);

        var possuiGarantiaReal = request.PossuiGarantiaRealNaRenegociacao;

        var podeAplicarDesconto =
            possuiAtrasoMaior30 &&
            !possuiGarantiaReal;

        // ===============================
        // TAXA
        // ===============================
        var taxaPolitica = request.PrazoMeses <= 24
            ? request.Politica.TaxaAte24Meses
            : request.Politica.TaxaAcima24Meses;

        var taxaBase = Math.Min(menorTaxaContrato, taxaPolitica);

        var taxaFinal = podeAplicarDesconto
            ? taxaBase
            : menorTaxaContrato;

        taxaFinal = Math.Max(taxaFinal, TAXA_MINIMA_ABSOLUTA);

        // ===============================
        // ENTRADA
        // ===============================
        var percentualEntrada = request.PercentualEntrada;
        var valorEntrada = valorTotal * percentualEntrada;

        var entradaAbaixoMinimo =
            percentualEntrada < request.Politica.PercentualEntradaMinimo;

        // ===============================
        // RESULTADO
        // ===============================
        return new ResultadoCalculoResponse
        {
            ValorTotal = valorTotal,
            TaxaAplicada = taxaFinal,
            PrazoMeses = request.PrazoMeses,
            PercentualEntrada = percentualEntrada,
            ValorEntrada = valorEntrada,

            TipoProposta = podeAplicarDesconto && !entradaAbaixoMinimo
                ? TipoProposta.Automatica
                : TipoProposta.Personalizada,

            Observacoes = podeAplicarDesconto
                ? entradaAbaixoMinimo
                    ? "Entrada abaixo do mínimo da política. Necessita análise de crédito."
                    : "Proposta automática conforme política."
                : "Contrato não elegível para desconto automático."
        };
    }
}
