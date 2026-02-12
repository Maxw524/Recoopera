
using System.ComponentModel.DataAnnotations;

namespace Recoopera.Data;

public class AppUser
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Username { get; set; } = default!;

    [Required]
    public string PasswordHash { get; set; } = default!;

    [Required]
    public string PasswordSalt { get; set; } = default!;

    public ICollection<UserRole> Roles { get; set; } = new List<UserRole>();
}
