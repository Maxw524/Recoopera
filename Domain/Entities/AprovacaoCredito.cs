public class Contrato
{
    public int Id { get; set; }
    public string? CPF { get; set; }
    public string? NumeroContrato { get; set; }
    public decimal ValorSaldo { get; set; }
    public decimal TaxaJuros { get; set; }
    public bool PodeRenegociar { get; set; }
}
