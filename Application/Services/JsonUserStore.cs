
using System.Text.Json;

public sealed class UserRecord
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string PasswordSalt { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
}

public sealed class JsonUserStore
{
    private readonly string _path;
    private readonly object _lock = new();
    private readonly JsonSerializerOptions _jsonOpts = new() { WriteIndented = true };

    public JsonUserStore(IConfiguration cfg)
    {
        _path = cfg["AuthStore:Path"] ?? "users.json";
        var dir = Path.GetDirectoryName(_path);
        if (!string.IsNullOrWhiteSpace(dir) && !Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        // Se não existir, cria arquivo vazio
        if (!File.Exists(_path))
            SaveAll(new List<UserRecord>());
    }

    public List<UserRecord> GetAll()
    {
        lock (_lock)
        {
            using var fs = new FileStream(_path, FileMode.Open, FileAccess.Read, FileShare.Read);
            var users = JsonSerializer.Deserialize<List<UserRecord>>(fs) ?? new();
            return users;
        }
    }

    private void SaveAll(List<UserRecord> users)
    {
        lock (_lock)
        {
            using var fs = new FileStream(_path, FileMode.Create, FileAccess.Write, FileShare.None);
            JsonSerializer.Serialize(fs, users, _jsonOpts);
        }
    }

    public UserRecord? FindByUsername(string username) =>
        GetAll().FirstOrDefault(u => u.Username.Equals(username, StringComparison.OrdinalIgnoreCase));

    public UserRecord? FindById(string id) =>
        GetAll().FirstOrDefault(u => u.Id == id);

    public void Add(UserRecord user)
    {
        var users = GetAll();
        if (users.Any(u => u.Username.Equals(user.Username, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("Usuário já existe");

        users.Add(user);
        SaveAll(users);
    }

    public void UpdatePassword(string id, string newHash, string newSalt)
    {
        var users = GetAll();
        var u = users.FirstOrDefault(x => x.Id == id) ?? throw new KeyNotFoundException("Usuário não encontrado");
        u.PasswordHash = newHash;
        u.PasswordSalt = newSalt;
        SaveAll(users);
    }

    public void Delete(string id)
    {
        var users = GetAll();
        users.RemoveAll(u => u.Id == id);
        SaveAll(users);
    }

    public void UpdateRoles(string id, List<string> roles)
    {
        var users = GetAll();
        var u = users.FirstOrDefault(x => x.Id == id) ?? throw new KeyNotFoundException("Usuário não encontrado");
        u.Roles = roles ?? new List<string>();
        SaveAll(users);
    }

    public void EnsureSeedAdmin(string username, string password, PasswordHasher hasher)
    {
        var users = GetAll();
        if (!users.Any(u => u.Username.Equals(username, StringComparison.OrdinalIgnoreCase)))
        {
            var (hash, salt) = hasher.HashPassword(password);
            users.Add(new UserRecord
            {
                Username = username,
                PasswordHash = hash,
                PasswordSalt = salt,
                Roles = new List<string> { "Admin" }
            });
            SaveAll(users);
        }
    }
}

