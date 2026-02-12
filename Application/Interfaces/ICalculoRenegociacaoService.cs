using Recoopera.Application.DTOs;

namespace Recoopera.Application.Interfaces
{
    public interface ICalculoRenegociacaoService
    {
        Task<ResultadoCalculoResponse> CalcularAsync(CalculoRenegociacaoRequest request);
    }
}
