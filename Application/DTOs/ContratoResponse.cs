namespace Recoopera.Application.DTOs;

public class ContratoResponse
{
    public string ContratoId { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public decimal Taxa { get; set; }
    public bool PodeSelecionar { get; set; }
}

public class ContratoGridDto
{
    public bool EhAjuizado { get; set; }
    public bool EhPrejuizo { get; set; }
    public decimal ValorSaldoContabilBruto { get; set; }   // <- preenchido pelo service
    public string ContratoId { get; set; } = string.Empty;
    public string NumeroContrato { get; set; } = string.Empty;
    public string SubmodalidadeBacen { get; set; } = string.Empty;
    public string TipoContrato { get; set; } = string.Empty;
    public decimal TaxaOperacaoPercentual { get; set; }
    public int QuantidadeParcelas { get; set; }
    public int QuantidadeParcelasAbertas { get; set; }
    public int QuantidadeParcelasPagas { get; set; }
    public decimal ValorContrato { get; set; }
    public decimal ValorPago { get; set; }
    public decimal ValorCorrigido { get; set; }
    public int DiasAtrasoParcela { get; set; }
    public decimal RendaBrutaMensal { get; set; }
    public string TipoRenda { get; set; } = string.Empty;
}
