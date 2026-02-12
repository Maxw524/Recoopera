using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Recoopera.Application.Interfaces;
using System.Security.Claims;

namespace Recoopera.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ContaController : ControllerBase
{
    private readonly IUserStore _store;
    private readonly PasswordHasher _hasher;
    private readonly ILogger<ContaController> _logger;

    public ContaController(
        IUserStore store,
        PasswordHasher hasher,
        ILogger<ContaController> logger)
    {
        _store = store;
        _hasher = hasher;
        _logger = logger;
    }

    [Authorize]
    [HttpPost("alterar-senha")]
    public async Task<IActionResult> AlterarSenha([FromBody] AlterarSenhaRequest req)
    {
        if (req is null)
            return BadRequest(new { mensagem = "Payload inválido." });

        if (string.IsNullOrWhiteSpace(req.SenhaAtual) || string.IsNullOrWhiteSpace(req.NovaSenha))
            return BadRequest(new { mensagem = "Senha atual e nova senha são obrigatórias." });

        if (req.NovaSenha.Length < 6)
            return BadRequest(new { mensagem = "A nova senha deve ter pelo menos 6 caracteres." });

        // 🔐 Pega o ID do usuário logado pelo JWT
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(new { mensagem = "Token inválido (sem identificador do usuário)." });

        var user = await _store.FindByIdAsync(userId);
        if (user is null)
            return Unauthorized(new { mensagem = "Usuário não encontrado." });

        // Confere a senha atual
        var ok = _hasher.Verify(req.SenhaAtual, user.PasswordHash, user.PasswordSalt);
        if (!ok)
        {
            _logger.LogWarning("ALTERAR SENHA FAIL: senha atual inválida userId={UserId} username={Username}",
                user.Id, user.Username);

            return Unauthorized(new { mensagem = "Senha atual inválida." });
        }

        // (Opcional) evitar repetir a mesma senha
        if (_hasher.Verify(req.NovaSenha, user.PasswordHash, user.PasswordSalt))
            return BadRequest(new { mensagem = "A nova senha não pode ser igual à senha atual." });

        // ✅ Gera novo hash e salt usando o seu método existente
        var (newHash, newSalt) = _hasher.HashPassword(req.NovaSenha);

        await _store.UpdatePasswordAsync(user.Id, newHash, newSalt);

        _logger.LogInformation("Senha alterada com sucesso userId={UserId} username={Username}",
            user.Id, user.Username);

        return Ok(new { mensagem = "Senha alterada com sucesso!" });
    }
}

public record AlterarSenhaRequest(string SenhaAtual, string NovaSenha);
