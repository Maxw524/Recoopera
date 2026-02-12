
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/secure")]
public class SecureController : ControllerBase
{
    [HttpGet("me")]
    [Authorize] // qualquer usuário autenticado
    public IActionResult Me()
    {
        var name = User.Identity?.Name ?? "(sem nome)";
        var roles = User.Claims
                        .Where(c => c.Type == ClaimTypes.Role)
                        .Select(c => c.Value)
                        .ToArray();

        return Ok(new { user = name, roles });
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")] // somente Admin
    public IActionResult AdminOnly()
    {
        return Ok("Área exclusiva de Admin.");
    }
}

