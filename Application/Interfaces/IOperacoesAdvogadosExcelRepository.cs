namespace Recoopera.Infrastructure.Excel.Interfaces;

public interface IOperacoesAdvogadosExcelRepository
{
    HashSet<string> GetContratosAjuizados();
}
