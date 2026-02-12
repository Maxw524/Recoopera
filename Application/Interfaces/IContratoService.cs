using Microsoft.AspNetCore.Mvc;

namespace Recoopera.Application.Interfaces
{
    public class IContratoService : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
