
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Recoopera.Application.DTOs;

namespace Recoopera.Controllers
{
    [ApiController]
    [Route("api/logs")]
    public class ClientLogsController : ControllerBase
    {
        private readonly ILogger<ClientLogsController> _logger;

        public ClientLogsController(ILogger<ClientLogsController> logger)
        {
            _logger = logger;
        }

        [AllowAnonymous]
        [HttpPost("client")]
        public IActionResult LogFromClient([FromBody] JsonElement body)
        {
            try
            {
                if (body.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in body.EnumerateArray())
                    {
                        var log = item.Deserialize<ClientLogDto>(JsonOptions()) ?? new ClientLogDto();
                        WriteLog(log);
                    }
                    return Ok(new { ok = true, mode = "batch" });
                }

                var single = body.Deserialize<ClientLogDto>(JsonOptions()) ?? new ClientLogDto();
                WriteLog(single);

                return Ok(new { ok = true, mode = "single" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Falha ao processar log do cliente");
                return Ok(new { ok = false }); // não quebra o front
            }
        }

        private void WriteLog(ClientLogDto log)
        {
            var correlationId = log.CorrelationId ?? HttpContext.TraceIdentifier;

            // Se houver usuário autenticado, pega o Name/Id (se existir)
            var user = User?.Identity?.IsAuthenticated == true ? User.Identity?.Name : null;

            var docMascarado = MascararDocumento(log.CpfCnpj);

            using (_logger.BeginScope(new Dictionary<string, object?>
            {
                ["CorrelationId"] = correlationId,
                ["ClientUrl"] = log.Url,
                ["ClientRoute"] = log.Route,
                ["UserAgent"] = log.UserAgent,
                ["CpfCnpj"] = docMascarado,
                ["User"] = user
            }))
            {
                var msg = $"[AUDIT/CLIENT] {log.Message}";

                switch ((log.Level ?? "info").ToLowerInvariant())
                {
                    case "debug":
                        _logger.LogDebug("{Message} | Extra={@Extra}", msg, log.Extra);
                        break;
                    case "warn":
                    case "warning":
                        _logger.LogWarning("{Message} | Extra={@Extra}", msg, log.Extra);
                        break;
                    case "error":
                        _logger.LogError("{Message}\n{Stack} | Extra={@Extra}", msg, log.Stack, log.Extra);
                        break;
                    default:
                        _logger.LogInformation("{Message} | Extra={@Extra}", msg, log.Extra);
                        break;
                }
            }
        }

        private static JsonSerializerOptions JsonOptions() =>
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        private static string? MascararDocumento(string? doc)
        {
            if (string.IsNullOrWhiteSpace(doc)) return null;
            var digits = new string(doc.Where(char.IsDigit).ToArray());
            if (digits.Length <= 4) return "****";
            return $"{digits[..2]}***{digits[^2..]}"; // ex: 04***54
        }
    }
}