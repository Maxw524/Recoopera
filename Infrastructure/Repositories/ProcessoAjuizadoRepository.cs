using Microsoft.AspNetCore.Mvc;

namespace Recoopera.Infrastructure.Repositories
{
    public class ProcessoAjuizadoRepository : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
