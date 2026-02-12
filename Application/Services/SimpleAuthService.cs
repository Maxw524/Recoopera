
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

public sealed class SimpleAuthService
{
    private readonly IConfiguration _cfg;
    private readonly JsonUserStore _store;
    private readonly PasswordHasher _hasher;

    public SimpleAuthService(IConfiguration cfg, JsonUserStore store, PasswordHasher hasher)
    {
        _cfg = cfg;
        _store = store;
        _hasher = hasher;
    }

    public string? Authenticate(string username, string password)
    {
        var user = _store.FindByUsername(username);
        if (user is null) return null;

        if (!_hasher.Verify(password, user.PasswordHash, user.PasswordSalt))
            return null;

        return GenerateJwt(user.Username, user.Roles);
    }

    private string GenerateJwt(string username, IEnumerable<string> roles)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim> { new(ClaimTypes.Name, username) };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var token = new JwtSecurityToken(
            issuer: _cfg["Jwt:Issuer"],
            audience: _cfg["Jwt:Issuer"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
