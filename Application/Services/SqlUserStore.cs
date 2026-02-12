
using Microsoft.EntityFrameworkCore;
using Recoopera.Application.Interfaces;
using Recoopera.Data;

namespace Recoopera.Services;

public class SqlUserStore : IUserStore
{
    private readonly AuthDbContext _db;

    public SqlUserStore(AuthDbContext db)
    {
        _db = db;
    }

    public async Task<UserDto?> FindByUsernameAsync(string username)
    {
        var user = await _db.Users
            .Include(u => u.Roles)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == username);

        if (user is null) return null;

        return new UserDto(
            user.Id,
            user.Username,
            user.PasswordHash,
            user.PasswordSalt,
            user.Roles.Select(r => r.Role).ToList()
        );
    }

    public async Task<List<UserDto>> GetAllAsync()
    {
        return await _db.Users
            .Include(u => u.Roles)
            .AsNoTracking()
            .Select(u => new UserDto(
                u.Id,
                u.Username,
                u.PasswordHash,
                u.PasswordSalt,
                u.Roles.Select(r => r.Role).ToList()
            ))
            .ToListAsync();
    }

    public async Task<UserDto> AddAsync(string username, string passwordHash, string passwordSalt, List<string> roles)
    {
        username = username.Trim();

        var user = new AppUser
        {
            Username = username,
            PasswordHash = passwordHash,
            PasswordSalt = passwordSalt,
            Roles = roles.Distinct().Select(r => new UserRole { Role = r }).ToList()
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return new UserDto(user.Id, user.Username, user.PasswordHash, user.PasswordSalt, roles.Distinct().ToList());
    }

    public async Task UpdatePasswordAsync(Guid id, string passwordHash, string passwordSalt)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return;

        user.PasswordHash = passwordHash;
        user.PasswordSalt = passwordSalt;

        await _db.SaveChangesAsync();
    }

    public async Task<UserDto?> FindByIdAsync(Guid id)
    {
        var user = await _db.Users
            .Include(u => u.Roles)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null) return null;

        return new UserDto(
            user.Id,
            user.Username,
            user.PasswordHash,
            user.PasswordSalt,
            user.Roles.Select(r => r.Role).ToList()
        );
    }

    public async Task UpdateRolesAsync(Guid id, List<string> roles)
    {
        var user = await _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return;

        roles = roles.Distinct().ToList();

        // Remove as atuais
        _db.UserRoles.RemoveRange(user.Roles);

        // Adiciona novas
        user.Roles = roles.Select(r => new UserRole { UserId = user.Id, Role = r }).ToList();

        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return;

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
    }
}
