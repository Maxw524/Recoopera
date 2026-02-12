using Recoopera.Application.Enums;

public class Proposta
{
    public int Id { get; set; }
    public string CPF { get; set; }
    public decimal ValorTotal { get; set; }
    public decimal TaxaFinal { get; set; }
    public int Parcelas { get; set; }
    public decimal? Entrada { get; set; }
    public TipoProposta TipoProposta { get; set; }
    public StatusProposta Status { get; set; }
    public DateTime DataCriacao { get; set; }
}
