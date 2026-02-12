using Microsoft.AspNetCore.Mvc;

namespace Recoopera.Infrastructure.Data
{
    public class AppDbContext : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
