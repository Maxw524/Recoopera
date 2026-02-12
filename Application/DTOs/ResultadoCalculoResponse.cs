
using System.Collections.Generic;

namespace Recoopera.Application.DTOs
{
    public class ResultadoContratoDto
    {
        public string NumeroContrato { get; set; } = "";
        public decimal Principal { get; set; }
        public int DiasAtraso { get; set; }
        public decimal Meses { get; set; }

        public decimal JurosContratoComposto { get; set; }
        public decimal MoraComposto { get; set; }
        public decimal MontanteComposto { get; set; }

        public decimal JurosContratoSimples { get; set; }
        public decimal MoraSimples { get; set; }
        public decimal MontanteSimples { get; set; }

        public decimal Multa { get; set; }
        public decimal TotalComMulta { get; set; }
    }

    public class ResultadoCalculoResponse
    {
        public decimal ValorTotal { get; set; }
        public int PrazoMeses { get; set; }
        public decimal PercentualEntrada { get; set; }
        public decimal ValorEntrada { get; set; }
        public string Observacoes { get; set; } = "";

        public decimal TotalComMulta { get; set; }
        public List<ResultadoContratoDto> DetalhesPorContrato { get; set; } = new();
    }
}

