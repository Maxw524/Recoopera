using Recoopera.Application.DTOs;
using Recoopera.Application.Enums;
public class ResultadoCalculoResponse 
{
    public decimal ValorTotal { get; set; }
    public decimal TaxaAplicada { get; set; }
    public int PrazoMeses { get; set; }
    public decimal PercentualEntrada { get; set; }
    public decimal ValorEntrada { get; set; }
    public TipoProposta TipoProposta { get; set; }
    public string Observacoes { get; set; } = string.Empty;

    // ✅ novos
    public decimal TotalComMulta { get; set; }
    public List<ResultadoContratoDto> DetalhesPorContrato { get; set; } = new();

}
