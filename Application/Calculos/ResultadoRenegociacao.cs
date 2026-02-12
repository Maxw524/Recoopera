
namespace Recoopera.Application.Calculos
{
    public sealed class ResultadoRenegociacao
    {
        public decimal Principal { get; init; }
        public int DiasAtraso { get; init; }
        public decimal Meses { get; init; }

        public decimal JurosContratoComposto { get; init; }
        public decimal MoraComposto { get; init; }
        public decimal MontanteComposto { get; init; }

        public decimal JurosContratoSimples { get; init; }
        public decimal MoraSimples { get; init; }
        public decimal MontanteSimples { get; init; }

        public decimal Multa { get; init; }
        public decimal TotalComMulta { get; init; }
    }
}
