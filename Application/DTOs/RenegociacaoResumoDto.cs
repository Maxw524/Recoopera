namespace Recoopera.Application.DTOs
{
    public class RenegociacaoResumoDto
    {
        public string Cpf { get; set; }
        public decimal ValorTotal { get; set; }
        public decimal TaxaAplicada { get; set; }
        public int QuantidadeContratos { get; set; }
    }
}
