
using Microsoft.AspNetCore.Mvc;

namespace Recoopera.Controllers;

[ApiController]
public class TaxasCampanhaController : ControllerBase
{
    private readonly TaxasCampanhaStore _store;

    public TaxasCampanhaController(TaxasCampanhaStore store)
    {
        _store = store;
    }

    // ✅ Público: front usa para carregar taxas ao iniciar
    [HttpGet("api/config/taxas-campanha")]
    public IActionResult Get() => Ok(_store.Get());

    // ✅ Admin (por enquanto aberto)
    [HttpPut("api/admin/taxas-campanha")]
    public IActionResult Save([FromBody] Dictionary<string, decimal> matrix)
    {
        if (matrix is null || matrix.Count == 0)
            return BadRequest(new { message = "Matriz vazia" });

        _store.Save(matrix);
        return Ok(new { message = "Taxas atualizadas", count = matrix.Count });
    }
}
