
using System.ComponentModel.DataAnnotations;

namespace Recoopera.Data;

public class UserRole
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = default!;

    [Required, MaxLength(50)]
    public string Role { get; set; } = default!;
}
