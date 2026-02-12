using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

public class UploadSettings
{
    public string ApiKey { get; set; } = "";
    public string BaseFolder { get; set; } = "Arquivos"; // relativo ao ContentRoot
    public string[] AllowedNames { get; set; } = new[] { "Recoopera.xlsx", "Operações Advogados.xlsx" };
}

[ApiController]
[Route("api/arquivos")]
public class ArquivosController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<ArquivosController> _logger;
    private readonly UploadSettings _cfg;

    public ArquivosController(IWebHostEnvironment env, ILogger<ArquivosController> logger, IOptions<UploadSettings> cfg)
    {
        _env = env;
        _logger = logger;
        _cfg = cfg.Value;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50 MB
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromHeader(Name = "X-Api-Key")] string? apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey != _cfg.ApiKey)
            return Unauthorized("Invalid API key.");

        if (file == null || file.Length == 0)
            return BadRequest("Arquivo vazio.");

        var filename = Path.GetFileName(file.FileName);
        if (!_cfg.AllowedNames.Contains(filename, StringComparer.OrdinalIgnoreCase))
            return BadRequest($"Nome de arquivo não permitido: {filename}");

        // Monta pasta absoluta
        var basePath = Path.Combine(_env.ContentRootPath, _cfg.BaseFolder);
        Directory.CreateDirectory(basePath);

        var destPath = Path.Combine(basePath, filename);

        // Backup simples da versão anterior
        if (System.IO.File.Exists(destPath))
        {
            var backup = Path.Combine(basePath, $"{Path.GetFileNameWithoutExtension(filename)}_{DateTime.UtcNow:yyyyMMddHHmmss}{Path.GetExtension(filename)}");
            System.IO.File.Move(destPath, backup, true);
        }

        // Salva novo arquivo
        await using var fs = System.IO.File.Create(destPath);
        await file.CopyToAsync(fs);

        _logger.LogInformation("Upload recebido: {name} ({len} bytes) salvo em {dest}", filename, file.Length, destPath);
        return Ok(new { ok = true, name = filename, size = file.Length, savedAt = destPath });
    }
}
