
using System;

namespace Recoopera.Application.Calculos
{
    public enum ModeloCalculo
    {
        Separado,
        TaxaUnica
    }

    /// <summary>
    /// Define como tratar frações de mês (dias restantes).
    /// - ExponenteFracionario: comportamento atual (Pow com meses decimal).
    /// - MesInteiroMaisProRataLinear: composto nos meses inteiros + linear nos dias restantes.
    /// </summary>
    public enum ProRataFracaoMes
    {
        ExponenteFracionario,
        MesInteiroMaisProRataLinear
    }

    public static class CalculadoraRenegociacao
    {
        public static ResultadoRenegociacao Calcular(
            decimal principal,
            int diasAtraso,
            decimal taxaContratoAm = 0.0159m,
            decimal taxaMoraAm = 0.016743m,
            decimal multaRate = 0.013265m,
            int baseDiasMes = 30,
            ModeloCalculo modelo = ModeloCalculo.Separado,
            int arredondar = 2,
            ProRataFracaoMes proRata = ProRataFracaoMes.ExponenteFracionario // ✅ padrão NÃO muda
        )
        {
            if (diasAtraso < 0)
                throw new ArgumentException("diasAtraso não pode ser negativo.", nameof(diasAtraso));

            if (baseDiasMes <= 0)
                throw new ArgumentException("baseDiasMes deve ser maior que zero.", nameof(baseDiasMes));

            // Mantém o campo "Meses" exatamente como era (para relatório/compatibilidade)
            decimal meses = (decimal)diasAtraso / baseDiasMes;

            // -------- Juros Composto --------
            decimal jurosContratoComposto;
            decimal moraComposto;
            decimal montanteComposto;

            if (modelo == ModeloCalculo.TaxaUnica)
            {
                var taxaTotalAm = taxaContratoAm + taxaMoraAm;
                var fatorTotal = FatorAcumulacao(taxaTotalAm, diasAtraso, baseDiasMes, proRata);

                montanteComposto = principal * fatorTotal;
                jurosContratoComposto = montanteComposto - principal;
                moraComposto = 0m;
            }
            else
            {
                // Contrato
                var fatorContrato = FatorAcumulacao(taxaContratoAm, diasAtraso, baseDiasMes, proRata);
                var montanteAposContrato = principal * fatorContrato;
                jurosContratoComposto = montanteAposContrato - principal;

                // Mora
                var fatorMora = FatorAcumulacao(taxaMoraAm, diasAtraso, baseDiasMes, proRata);
                montanteComposto = montanteAposContrato * fatorMora;
                moraComposto = montanteComposto - montanteAposContrato;
            }

            // -------- Juros Simples (mantido como estava) --------
            var jurosContratoSimples = principal * taxaContratoAm * meses;
            var moraSimples = (principal + jurosContratoSimples) * taxaMoraAm * meses;
            var montanteSimples = principal + jurosContratoSimples + moraSimples;

            // -------- Multa (mantido como estava: sobre principal) --------
            var multa = principal * multaRate;
            var totalComMulta = montanteComposto + multa;

            // -------- Arredondamento --------
            decimal R(decimal x) => Math.Round(x, arredondar, MidpointRounding.AwayFromZero);
            var meses6 = Math.Round(meses, 6, MidpointRounding.AwayFromZero);

            return new ResultadoRenegociacao
            {
                Principal = R(principal),
                DiasAtraso = diasAtraso,
                Meses = meses6,

                JurosContratoComposto = R(jurosContratoComposto),
                MoraComposto = R(moraComposto),
                MontanteComposto = R(montanteComposto),

                JurosContratoSimples = R(jurosContratoSimples),
                MoraSimples = R(moraSimples),
                MontanteSimples = R(montanteSimples),

                Multa = R(multa),
                TotalComMulta = R(totalComMulta)
            };
        }

        /// <summary>
        /// Retorna o fator de acumulação para uma taxa mensal (taxaAm),
        /// respeitando a regra de pró-rata escolhida.
        /// </summary>
        private static decimal FatorAcumulacao(
            decimal taxaAm,
            int diasAtraso,
            int baseDiasMes,
            ProRataFracaoMes modo
        )
        {
            if (modo == ProRataFracaoMes.ExponenteFracionario)
            {
                decimal meses = (decimal)diasAtraso / baseDiasMes;
                return Pow(1m + taxaAm, meses);
            }

            // MesInteiroMaisProRataLinear
            int mesesInteiros = diasAtraso / baseDiasMes;
            int diasRestantes = diasAtraso % baseDiasMes;

            decimal fatorMeses = Pow(1m + taxaAm, mesesInteiros);

            decimal fracao = (decimal)diasRestantes / baseDiasMes;
            decimal fatorDiasLinear = 1m + (taxaAm * fracao);

            return fatorMeses * fatorDiasLinear;
        }

        private static decimal Pow(decimal baseValue, decimal exponent)
            => (decimal)Math.Pow((double)baseValue, (double)exponent);
    }
}
