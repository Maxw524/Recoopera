using Recoopera.Application.DTOs;
using Recoopera.Application.Interfaces;

namespace Recoopera.Application.Services
{
    public class CalculoRenegociacaoService : ICalculoRenegociacaoService
    {
        private readonly RenegociacaoEngine _engine;

        public CalculoRenegociacaoService(RenegociacaoEngine engine)
        {
            _engine = engine;
        }

        public async Task<ResultadoCalculoResponse> CalcularAsync(CalculoRenegociacaoRequest request)
        {
            ArgumentNullException.ThrowIfNull(request);

            if (request.Contratos == null || !request.Contratos.Any())
                throw new Exception("Nenhum contrato informado para cálculo.");

            return await Task.FromResult(_engine.Simular(request));
        }
    }
}
