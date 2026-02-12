using Microsoft.AspNetCore.Mvc;

namespace Recoopera.Infrastructure.Security
{
    public class JwtSettings : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
