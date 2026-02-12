using Recoopera.Application.DTOs;

namespace Recoopera.Infrastructure.Excel.Interfaces;

public interface IContratoExcelRepository
{
    Task<List<ContratoExcelDto>> BuscarPorCpfAsync(string cpf);
}
