using Microsoft.AspNetCore.Mvc;

namespace Recoopera.Application.Interfaces
{
    public class IPropostaService : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
