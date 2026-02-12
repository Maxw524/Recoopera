using Microsoft.AspNetCore.Mvc;

namespace Recoopera.Infrastructure.Excel.SharePoint
{
    public class SharePointService : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
