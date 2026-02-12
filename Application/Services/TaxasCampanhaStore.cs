
using System.Text.Json;

public sealed class TaxasCampanhaStore
{
    private readonly string _path;
    private readonly object _lock = new();
    private readonly JsonSerializerOptions _jsonOpts = new() { WriteIndented = true };

    public TaxasCampanhaStore(IConfiguration cfg)
    {
        _path = cfg["TaxasStore:Path"] ?? "taxas-campanha.json";

        var dir = Path.GetDirectoryName(_path);
        if (!string.IsNullOrWhiteSpace(dir) && !Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        if (!File.Exists(_path))
            Save(DefaultMatrix());
    }

    public Dictionary<string, decimal> Get()
    {
        lock (_lock)
        {
            using var fs = new FileStream(_path, FileMode.Open, FileAccess.Read, FileShare.Read);
            return JsonSerializer.Deserialize<Dictionary<string, decimal>>(fs) ?? DefaultMatrix();
        }
    }

    public void Save(Dictionary<string, decimal> matrix)
    {
        lock (_lock)
        {
            using var fs = new FileStream(_path, FileMode.Create, FileAccess.Write, FileShare.None);
            JsonSerializer.Serialize(fs, matrix, _jsonOpts);
        }
    }

    private static Dictionary<string, decimal> DefaultMatrix() => new()
    {
        // ≥ 30%
        ["FAIXA_30|CURTO|SEM_REFORCO"] = 1.88m,
        ["FAIXA_30|CURTO|AVAL"] = 1.69m,
        ["FAIXA_30|CURTO|REAL"] = 1.50m,
        ["FAIXA_30|LONGO|SEM_REFORCO"] = 2.19m,
        ["FAIXA_30|LONGO|AVAL"] = 1.97m,
        ["FAIXA_30|LONGO|REAL"] = 1.75m,

        // 20%–29,99%
        ["FAIXA_20|CURTO|SEM_REFORCO"] = 2.00m,
        ["FAIXA_20|CURTO|AVAL"] = 1.80m,
        ["FAIXA_20|CURTO|REAL"] = 1.60m,
        ["FAIXA_20|LONGO|SEM_REFORCO"] = 2.31m,
        ["FAIXA_20|LONGO|AVAL"] = 2.08m,
        ["FAIXA_20|LONGO|REAL"] = 1.85m,

        // 10%–19,99%
        ["FAIXA_10|CURTO|SEM_REFORCO"] = 2.13m,
        ["FAIXA_10|CURTO|AVAL"] = 1.91m,
        ["FAIXA_10|CURTO|REAL"] = 1.70m,
        ["FAIXA_10|LONGO|SEM_REFORCO"] = 2.49m,
        ["FAIXA_10|LONGO|AVAL"] = 2.24m,
        ["FAIXA_10|LONGO|REAL"] = 2.14m
    };
}
