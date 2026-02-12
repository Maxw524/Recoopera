
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recoopera.Application.Interfaces;

namespace Recoopera.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/users")]
public class AdminUsersController : ControllerBase
{
    private readonly IUserStore _store;
    private readonly PasswordHasher _hasher;

    public AdminUsersController(IUserStore store, PasswordHasher hasher)
    {
        _store = store;
        _hasher = hasher;
    }

    // ✅ Lista usuários (sem expor hash/salt)
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var users = await _store.GetAllAsync();

        return Ok(users.Select(u => new
        {
            u.Id,
            u.Username,
            Roles = u.Roles ?? new List<string>()
        }));
    }

    // ✅ Cria usuário
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Username e Password obrigatórios" });

        var username = req.Username.Trim();

        // ✅ Evita violar índice único e retorna 409
        var existing = await _store.FindByUsernameAsync(username);
        if (existing is not null)
            return Conflict(new { message = "Username já existe" });

        var (hash, salt) = _hasher.HashPassword(req.Password);

        var roles = (req.Roles is { Count: > 0 })
            ? req.Roles.Distinct().ToList()
            : new List<string> { "Operador" };

        var user = await _store.AddAsync(username, hash, salt, roles);

        return Ok(new { user.Id, user.Username, Roles = roles });
    }

    // ✅ Troca senha
    [HttpPut("{id:guid}/password")]
    public async Task<IActionResult> ChangePassword(Guid id, [FromBody] ChangePasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.NewPassword))
            return BadRequest(new { message = "NewPassword obrigatório" });

        // ✅ Ideal: conferir se existe (para não responder sucesso falso)
        var user = await _store.FindByIdAsync(id); // 👈 precisa existir no IUserStore
        if (user is null)
            return NotFound(new { message = "Usuário não encontrado" });

        var (hash, salt) = _hasher.HashPassword(req.NewPassword);
        await _store.UpdatePasswordAsync(id, hash, salt);

        return Ok(new { message = "Senha atualizada" });
    }

    // ✅ Atualiza roles
    [HttpPut("{id:guid}/roles")]
    public async Task<IActionResult> ChangeRoles(Guid id, [FromBody] ChangeRolesRequest req)
    {
        var user = await _store.FindByIdAsync(id); // 👈 precisa existir no IUserStore
        if (user is null)
            return NotFound(new { message = "Usuário não encontrado" });

        var roles = req.Roles?.Distinct().ToList() ?? new List<string>();
        await _store.UpdateRolesAsync(id, roles);

        return Ok(new { message = "Roles atualizadas", roles });
    }

    // ✅ Deleta usuário
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await _store.FindByIdAsync(id); // 👈 precisa existir no IUserStore
        if (user is null)
            return NotFound(new { message = "Usuário não encontrado" });

        await _store.DeleteAsync(id);
        return Ok(new { message = "Usuário removido" });
    }
}

public record CreateUserRequest(string Username, string Password, List<string>? Roles);
public record ChangePasswordRequest(string NewPassword);
public record ChangeRolesRequest(List<string>? Roles);

