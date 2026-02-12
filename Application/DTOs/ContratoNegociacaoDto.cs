
// namespace Recoopera.Application.DTOs
namespace Recoopera.Application.DTOs;

public class ContratoNegociacaoDto
{
    // Identificação
    public string NumeroContrato { get; set; } = string.Empty;
    public string SubmodalidadeBacen { get; set; } = string.Empty;
    public string SituacaoContrato { get; set; } = string.Empty;
    public string TipoContrato { get; set; } = string.Empty;

    // Dados do cliente
    public string NomeCliente { get; set; } = string.Empty;
    public string CpfCnpj { get; set; } = string.Empty;

    // Datas e atraso
    public DateTime DataMovimento { get; set; }
    public int DiasAtrasoParcela { get; set; }

    // Taxas
    /// <summary>Taxa original vinda da planilha (em % a.m.).</summary>
    public decimal TaxaOperacaoPercentualOriginal { get; set; }
    /// <summary>Taxa efetiva aplicada (em % a.m.). Se original==0 e houver atraso, será 2,39.</summary>
    public decimal TaxaOperacaoPercentualEfetiva { get; set; }
    /// <summary>Se true, taxa original era 0 e aplicamos 2,39% a.m. como fallback.</summary>
    public bool AplicouTaxaFallback { get; set; }

    // Valores
    public decimal ValorContrato { get; set; }
    public decimal ValorPago { get; set; }

    /// <summary>Saldo contábil bruto original (base).</summary>
    public decimal ValorSaldoContabilBruto { get; set; }
    /// <summary>Juros aplicados (somente quando taxa==0 e dias>0).</summary>
    public decimal JurosAplicados { get; set; }
    /// <summary>Saldo contábil bruto ajustado com juros (para enviar ao front).</summary>
    public decimal ValorSaldoContabilBrutoAjustado { get; set; }

    // (Opcional) Flags de apoio
    public bool EhPrejuizo { get; set; }
}
