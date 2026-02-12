
// namespace Recoopera.Application.Services
using Recoopera.Application.DTOs;
using System;
using System.Globalization;
using System.Linq;
using System.Text;

namespace Recoopera.Application.Services;

public interface ICalculoNegociacaoService
{
    ContratoNegociacaoDto Calcular(ContratoExcelDto src, DateTime? dataBase = null);
    IEnumerable<ContratoNegociacaoDto> CalcularLista(IEnumerable<ContratoExcelDto> src, DateTime? dataBase = null);
}

public class CalculoNegociacaoService : ICalculoNegociacaoService
{
    private const int BASE_DIAS_MES = 30;
    private const decimal TAXA_FALLBACK_MENSAL = 0.0298m; // 2,98% a.m.

    // ===== Helpers para comparar "PREJUÍZO" ignorando acentos/caixa =====
    private static string RemoveDiacritics(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        var norm = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(norm.Length);
        foreach (var ch in norm)
        {
            var cat = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (cat != UnicodeCategory.NonSpacingMark) sb.Append(ch);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC);
    }

    private static bool IsPrejuizo(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var norm = RemoveDiacritics(value).Trim().ToUpperInvariant();
        return norm == "PREJUIZO";
    }
    // ====================================================================

    // Converte taxa mensal efetiva (fração) em diária pela base de 30 dias
    private static decimal DailyRateFromMonthly(decimal monthlyFraction)
    {
        // r_d = (1 + r_m)^(1/30) - 1
        var r = (decimal)(Math.Pow((double)(1m + monthlyFraction), 1d / BASE_DIAS_MES) - 1d);
        return r < 0 ? 0 : r;
    }

    // Juros compostos diários sobre "dias" a partir da taxa mensal efetiva
    private static decimal CalcularJurosCompostos(decimal principal, decimal taxaMensal, int dias)
    {
        if (principal <= 0 || taxaMensal <= 0 || dias <= 0) return 0m;
        var r_d = DailyRateFromMonthly(taxaMensal);
        var fator = (decimal)Math.Pow((double)(1m + r_d), dias);
        return principal * (fator - 1m);
    }

    public ContratoNegociacaoDto Calcular(ContratoExcelDto src, DateTime? dataBase = null)
    {
        // Entrada segura
        var taxaOriginalPercent = src.TaxaOperacaoPercentual < 0 ? 0 : src.TaxaOperacaoPercentual;
        var diasAtraso = Math.Max(0, src.DiasAtrasoParcela);
        var saldoBase = src.ValorSaldoContabilBruto < 0 ? 0 : src.ValorSaldoContabilBruto;

        // Determina taxa mensal efetiva (fração) e se aplicou fallback
        var aplicouFallback = (taxaOriginalPercent == 0 && diasAtraso > 0);
        var taxaEfetivaMensal = aplicouFallback
            ? TAXA_FALLBACK_MENSAL
            : (taxaOriginalPercent / 100m);

        // Calcula juros (somente quando fallback aplicado)
        var juros = aplicouFallback
            ? CalcularJurosCompostos(saldoBase, taxaEfetivaMensal, diasAtraso)
            : 0m;

        var saldoAjustado = saldoBase + juros;

        // Arredondar para 2 casas na saída
        juros = Math.Round(juros, 2, MidpointRounding.ToEven);
        saldoAjustado = Math.Round(saldoAjustado, 2, MidpointRounding.ToEven);

        return new ContratoNegociacaoDto
        {
            // Identificação
            NumeroContrato = src.NumeroContrato,
            SubmodalidadeBacen = src.SubmodalidadeBacen,
            SituacaoContrato = src.SituacaoContrato,
            TipoContrato = src.TipoContrato,

            // Cliente
            NomeCliente = src.NomeCliente,
            CpfCnpj = src.CpfCnpj,

            // Datas/Atraso
            DataMovimento = src.DataMovimento,
            DiasAtrasoParcela = diasAtraso,

            // Taxas
            TaxaOperacaoPercentualOriginal = taxaOriginalPercent,                  // % a.m.
            TaxaOperacaoPercentualEfetiva = Math.Round(taxaEfetivaMensal * 100m, 4), // % a.m.
            AplicouTaxaFallback = aplicouFallback,

            // Valores
            ValorContrato = src.ValorContrato,
            ValorPago = src.ValorPago,
            ValorSaldoContabilBruto = saldoBase,                 // original
            JurosAplicados = juros,                              // somente quando fallback
            ValorSaldoContabilBrutoAjustado = saldoAjustado,     // este é o valor que o front deve usar

            // ✅ PREJUÍZO apenas quando TipoContrato == "PREJUÍZO" (ignora acentos/maiúsculas/minúsculas)
            EhPrejuizo = IsPrejuizo(src.TipoContrato),
        };
    }

    public IEnumerable<ContratoNegociacaoDto> CalcularLista(IEnumerable<ContratoExcelDto> src, DateTime? dataBase = null)
        => src.Select(s => Calcular(s, dataBase));
}
