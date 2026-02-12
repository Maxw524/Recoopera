using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Recoopera.Application.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Recoopera.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserStore _store;
    private readonly PasswordHasher _hasher;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IUserStore store,
        PasswordHasher hasher,
        IConfiguration config,
        ILogger<AuthController> logger)
    {
        _store = store;
        _hasher = hasher;
        _config = config;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Username e Password são obrigatórios" });

        var username = req.Username.Trim();

        var user = await _store.FindByUsernameAsync(username);
        if (user is null)
        {
            _logger.LogWarning("LOGIN FAIL: usuário não encontrado [{Username}]", username);
            return Unauthorized(new { message = "Credenciais inválidas" });
        }

        var ok = _hasher.Verify(req.Password, user.PasswordHash, user.PasswordSalt);
        if (!ok)
        {
            _logger.LogWarning("LOGIN FAIL: senha inválida para userId={UserId} [{Username}]", user.Id, user.Username);
            return Unauthorized(new { message = "Credenciais inválidas" });
        }

        var jwtKey = _config["Jwt:Key"];
        var jwtIssuer = _config["Jwt:Issuer"];
        var jwtAudience = _config["Jwt:Audience"];

        if (string.IsNullOrWhiteSpace(jwtKey) || string.IsNullOrWhiteSpace(jwtIssuer))
            return StatusCode(500, new { message = "Jwt:Key/Jwt:Issuer não configurados" });

        // Se você valida Audience no AddJwtBearer, garantir que esteja configurado:
        if (string.IsNullOrWhiteSpace(jwtAudience))
            _logger.LogWarning("JWT Audience não configurado. Se ValidateAudience = true no AddJwtBearer, o token será inválido.");

        var roles = (user.Roles is { Count: > 0 })
            ? user.Roles
            : new List<string> { "Operador" };

        var now = DateTime.UtcNow;
        var expires = now.AddHours(2);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            // Claims de controle do token
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new Claim(JwtRegisteredClaimNames.Iat, new DateTimeOffset(now).ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        foreach (var r in roles)
        {
            // Mantém o padrão ClaimTypes.Role para casar com [Authorize(Roles = "Admin")]
            claims.Add(new Claim(ClaimTypes.Role, r));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,           
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        return Ok(new
        {
            token = tokenString,
            user = user.Username,
            roles,
            expiresAt = expires,
            expiresIn = (int)(expires - now).TotalSeconds
        });
    }
}

public record LoginRequest(string Username, string Password);