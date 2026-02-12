// Recoopera.Infrastructure.Excel.Local/OperacoesAdvogadosExcelLocalRepository.cs
using System.Globalization;
using System.Text;
using Microsoft.Extensions.Options;
using OfficeOpenXml;
using Recoopera.Infrastructure.Excel;
using Recoopera.Infrastructure.Excel.Interfaces;

namespace Recoopera.Infrastructure.Excel.Local;

public class OperacoesAdvogadosExcelLocalRepository : IOperacoesAdvogadosExcelRepository
{
    private readonly string _filePath;

    // ✅ Cache
    private static readonly object _lock = new();
    private static DateTime? _cachedLastWrite;
    private static HashSet<string>? _cachedSet;

    public OperacoesAdvogadosExcelLocalRepository(IOptions<ExcelSettings> options)
    {
        var cfg = options.Value;
        if (string.IsNullOrWhiteSpace(cfg.BasePath))
            throw new InvalidOperationException("ExcelSettings:BasePath não configurado");
        if (string.IsNullOrWhiteSpace(cfg.OperacoesAdvogadosFile))
            throw new InvalidOperationException("ExcelSettings:OperacoesAdvogadosFile não configurado");

        _filePath = Path.Combine(cfg.BasePath, cfg.OperacoesAdvogadosFile);
    }

    public HashSet<string> GetContratosAjuizados()
    {
        if (!File.Exists(_filePath))
        {
            Console.WriteLine($"[OperAdv] Arquivo não encontrado: {_filePath}. Nenhum contrato bloqueado.");
            return new HashSet<string>(StringComparer.Ordinal);
        }

        var lastWrite = File.GetLastWriteTime(_filePath);

        // ✅ Se o arquivo não mudou, retorna cache imediatamente
        lock (_lock)
        {
            if (_cachedSet != null && _cachedLastWrite.HasValue && _cachedLastWrite.Value == lastWrite)
            {
                return _cachedSet;
            }
        }

        // ✅ Recarrega
        var novoSet = CarregarDoExcel();

        lock (_lock)
        {
            _cachedSet = novoSet;
            _cachedLastWrite = lastWrite;
            return _cachedSet;
        }
    }

    private HashSet<string> CarregarDoExcel()
    {
        var set = new HashSet<string>(StringComparer.Ordinal);

        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

        using var fs = new FileStream(_filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        using var package = new ExcelPackage(fs);

        foreach (var ws in package.Workbook.Worksheets)
        {
            if (ws?.Dimension == null) continue;

            int rows = ws.Dimension.Rows;
            int cols = ws.Dimension.Columns;
            if (rows < 2 || cols == 0) continue;

            // ✅ tenta header linha 1; se falhar, tenta linha 2
            int headerRow = 1;
            int colContrato = FindColumnByHeader(ws, cols, headerRow, new[]
            {
                "N.º Contrato", "Nº Contrato", "Número do Contrato", "Numero do Contrato",
                "N contrato", "Num contrato", "Contrato", "Operacao", "Operação", "Nr Contrato"
            });

            if (colContrato == -1)
            {
                headerRow = 2;
                colContrato = FindColumnByHeader(ws, cols, headerRow, new[]
                {
                    "N.º Contrato", "Nº Contrato", "Número do Contrato", "Numero do Contrato",
                    "N contrato", "Num contrato", "Contrato", "Operacao", "Operação", "Nr Contrato"
                });
            }

            if (colContrato == -1)
                colContrato = GuessContractColumn(ws, rows, cols);

            if (colContrato == -1)
            {
                Console.WriteLine($"[OperAdv] ({ws.Name}) Não foi possível identificar coluna de contrato.");
                continue;
            }

            int startRow = Math.Max(headerRow + 1, 2);

            for (int r = startRow; r <= rows; r++)
            {
                var cell = ws.Cells[r, colContrato];

                // ✅ MUITO mais rápido que .Text
                var digits = ReadDigitsFast(cell.Value, cell.Text);
                if (!string.IsNullOrEmpty(digits))
                    set.Add(digits);
            }
        }

        return set;
    }

    private static int FindColumnByHeader(ExcelWorksheet ws, int cols, int headerRow, IEnumerable<string> candidates)
    {
        for (int c = 1; c <= cols; c++)
        {
            var header = ws.Cells[headerRow, c].Text?.Trim();
            if (string.IsNullOrEmpty(header)) continue;

            var normHeader = RemoveAccents(header).ToLowerInvariant();
            foreach (var cand in candidates)
            {
                if (normHeader.Contains(RemoveAccents(cand).ToLowerInvariant()))
                    return c;
            }
        }
        return -1;
    }

    private static int GuessContractColumn(ExcelWorksheet ws, int rows, int cols)
    {
        // ✅ reduz custo: só examina até 12 colunas (normalmente contrato está nas primeiras)
        int maxCols = Math.Min(cols, 12);

        for (int c = 1; c <= maxCols; c++)
        {
            int samples = 0, valid = 0;

            // ✅ amostra menor: até 25 linhas já dá
            int maxRow = Math.Min(rows, 25);
            for (int r = 2; r <= maxRow; r++)
            {
                var cell = ws.Cells[r, c];
                var digits = ReadDigitsFast(cell.Value, cell.Text);
                if (string.IsNullOrEmpty(digits)) continue;

                samples++;
                if (digits.Length >= 4) valid++;
            }

            // heurística: precisa ter “massa” para ser coluna de contrato
            if (samples >= 5 && valid >= samples * 0.6) // 60% parecem contrato
                return c;
        }

        return -1;
    }

    /// <summary>
    /// ✅ Leitura rápida e robusta:
    /// - Se Value for numérico: converte sem formatação
    /// - Se for texto: extrai dígitos sem Regex
    /// </summary>
    private static string ReadDigitsFast(object? value, string? fallbackText)
    {
        if (value is null)
        {
            return OnlyDigitsFast(fallbackText);
        }

        // EPPlus frequentemente devolve double para números
        if (value is double d)
            return ((long)Math.Round(d)).ToString(CultureInfo.InvariantCulture);
        if (value is decimal m)
            return ((long)Math.Round(m)).ToString(CultureInfo.InvariantCulture);
        if (value is int i)
            return i.ToString(CultureInfo.InvariantCulture);
        if (value is long l)
            return l.ToString(CultureInfo.InvariantCulture);

        // texto / outros
        var s = value.ToString();
        if (string.IsNullOrWhiteSpace(s))
            s = fallbackText;

        return OnlyDigitsFast(s);
    }

    /// <summary>
    /// ✅ Mais rápido que Regex.Replace (hot path)
    /// </summary>
    private static string OnlyDigitsFast(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";

        var span = s.AsSpan();
        Span<char> buffer = stackalloc char[span.Length];
        int idx = 0;

        for (int i = 0; i < span.Length; i++)
        {
            char ch = span[i];
            if (ch >= '0' && ch <= '9')
                buffer[idx++] = ch;
        }

        return idx == 0 ? "" : new string(buffer[..idx]);
    }

    private static string RemoveAccents(string s)
    {
        var normalized = s.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);

        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        }

        return sb.ToString().Normalize(NormalizationForm.FormC);
    }
}