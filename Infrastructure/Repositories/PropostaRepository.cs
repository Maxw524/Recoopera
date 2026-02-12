using Microsoft.AspNetCore.Mvc;

namespace Recoopera.Infrastructure.Repositories
{
    public class PropostaRepository : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
