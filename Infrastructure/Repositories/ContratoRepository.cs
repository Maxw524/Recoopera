using Microsoft.AspNetCore.Mvc;

namespace Recoopera.Infrastructure.Repositories
{
    public class ContratoRepository : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
