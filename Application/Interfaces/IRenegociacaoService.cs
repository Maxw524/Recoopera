using Recoopera.Application.DTOs;

public interface IRenegociacaoService
{
    Task<IEnumerable<ContratoResponse>> BuscarContratosAsync(string cpf);

    Task<ResultadoCalculoResponse> ConsolidarAsync(string cpf, List<ContratoResponse> contratosSelecionados);

    Task<ResultadoCalculoResponse> CalcularAsync(CalculoRenegociacaoRequest request);
}
