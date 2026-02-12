namespace Recoopera.Application.DTOs;

public class ContratoExcelDto
{
    public DateTime DataMovimento { get; set; }
    public string NomeCliente { get; set; } = string.Empty;
    public string CpfCnpj { get; set; } = string.Empty;

    public string NumeroContrato { get; set; } = string.Empty;
    public string SubmodalidadeBacen { get; set; } = string.Empty;
    public string SituacaoContrato { get; set; } = string.Empty;
    public string TipoContrato { get; set; } = string.Empty;

    public decimal TaxaOperacaoPercentual { get; set; }

    public int QuantidadeParcelas { get; set; }
    public int QuantidadeParcelasPagas { get; set; }
    public int QuantidadeParcelasAbertas { get; set; }

    public decimal ValorContrato { get; set; }

    public int DiasAtrasoParcela { get; set; }
    public decimal ValorPago { get; set; }

    public DateTime? DataPrejuizo { get; set; }
    public decimal RendaBrutaMensal { get; set; }
    public string TipoRenda { get; set; } = string.Empty;

    /// <summary>
    /// Valor Saldo Contábil Bruto (EXATAMENTE como na planilha)
    /// Base para qualquer negociação
    /// </summary>
    public decimal ValorSaldoContabilBruto { get; set; }
}

