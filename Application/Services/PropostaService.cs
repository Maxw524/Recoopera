using Microsoft.AspNetCore.Mvc;

namespace Recoopera.Application.Services
{
    public class PropostaService : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
