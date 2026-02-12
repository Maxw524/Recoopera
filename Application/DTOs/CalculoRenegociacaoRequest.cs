using Recoopera.Domain.Entities;

namespace Recoopera.Application.DTOs
{
    public class CalculoRenegociacaoRequest
    {
        public List<ContratoCalculoDto> Contratos { get; set; } = new();

        public PoliticaRepactuacao Politica { get; set; } = null!;

        // 🔥 ValorTotal NÃO vem da tela — será calculado
        public int PrazoMeses { get; set; }
        public decimal PercentualEntrada { get; set; } // 0.10m, 0.20m...
        public bool PossuiGarantiaRealNaRenegociacao { get; set; }
        public bool AvalEhSocio { get; set; }
    }


    public class ContratoCalculoDto
    {
        public int DiasAtrasoParcela { get; set; }
        public string NumeroContrato { get; set; } = string.Empty;

        // 🔑 BASE ÚNICA DE NEGOCIAÇÃO
        public decimal SaldoBaseNegociacao { get; set; }

        // Informações auxiliares de política
        public decimal TaxaOperacaoPercentual { get; set; }
        public decimal TaxaJuros { get; set; }
        public bool PossuiGarantiaReal { get; set; }
        public int DiasAtraso { get; set; }

        // Histórico / controle
        public decimal ValorPago { get; set; }
        public decimal ValorSaldoContabilBruto { get; set; }
        public int QuantidadeParcelas { get; set; }
        public int QuantidadeParcelasPagas { get; set; }
        public int QuantidadeParcelasAbertas { get; set; }
    }


}
