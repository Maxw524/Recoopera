namespace Recoopera.Application.DTOs
{
    public class RenegociacaoRequestDto
    {
        public string Cpf { get; set; }
        public List<string> ContratosSelecionados { get; set; }
    }
}
