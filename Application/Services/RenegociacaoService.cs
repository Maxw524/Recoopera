
using System.Globalization;
using System.Text;
using Recoopera.Application.DTOs;
using Recoopera.Infrastructure.Excel.Interfaces;
using Recoopera.Application.Calculos;

namespace Recoopera.Application.Services
{
    public class RenegociacaoService
    {
        private readonly IContratoExcelRepository _excelRepository;
        private readonly IOperacoesAdvogadosExcelRepository _operAdvRepository;

        public RenegociacaoService(
            IContratoExcelRepository excelRepository,
            IOperacoesAdvogadosExcelRepository operAdvRepository)
        {
            _excelRepository = excelRepository;
            _operAdvRepository = operAdvRepository;
        }

        // GET - dados crus da planilha principal
        public Task<List<ContratoExcelDto>> BuscarContratosAsync(string cpfCnpj)
            => _excelRepository.BuscarPorCpfAsync(cpfCnpj);

        // POST - Consolidar (bloqueia ajuizados)
        public async Task<RenegociacaoResumoDto> ConsolidarAsync(
            string cpfCnpj,
            List<string> contratosSelecionados)
        {
            var contratos = await _excelRepository.BuscarPorCpfAsync(cpfCnpj);

            var selecionadosDigits = new HashSet<string>(
                contratosSelecionados.Select(SomenteNumeros),
                StringComparer.Ordinal
            );

            var contratosValidos = contratos
                .Where(c => selecionadosDigits.Contains(SomenteNumeros(c.NumeroContrato)))
                .ToList();

            if (!contratosValidos.Any())
                throw new Exception("Nenhum contrato válido selecionado.");

            // 🔒 bloqueio: consta em qualquer aba de “Operações Advogados.xlsx”
            var bloqueadosSet = _operAdvRepository.GetContratosAjuizados();
            var bloqueados = contratosValidos
                .Where(c => bloqueadosSet.Contains(SomenteNumeros(c.NumeroContrato)))
                .Select(c => c.NumeroContrato)
                .ToList();

            if (bloqueados.Count > 0)
                throw new Exception($"Os contratos [{string.Join(", ", bloqueados)}] constam em ações ajuizadas e não podem ser renegociados.");

            var valorTotal = contratosValidos.Sum(c => c.ValorSaldoContabilBruto);

            return new RenegociacaoResumoDto
            {
                Cpf = cpfCnpj,
                ValorTotal = valorTotal,
                QuantidadeContratos = contratosValidos.Count
            };
        }

        // POST - Simular (bloqueio extra) + CÁLCULO POR CONTRATO

        public async Task<ResultadoCalculoResponse> SimularAsync(CalculoRenegociacaoRequest request)
        {
            if (request.Contratos == null || !request.Contratos.Any())
                throw new Exception("Nenhum contrato selecionado para simulação.");

            var bloqueadosSet = _operAdvRepository.GetContratosAjuizados();
            var contratosAjuizados = request.Contratos
                .Where(c => !string.IsNullOrWhiteSpace(c.NumeroContrato) &&
                            bloqueadosSet.Contains(SomenteNumeros(c.NumeroContrato)))
                .Select(c => c.NumeroContrato!)
                .ToList();

            if (contratosAjuizados.Any())
                throw new Exception($"Os contratos [{string.Join(", ", contratosAjuizados)}] constam em ações ajuizadas e não podem ser renegociados.");

            // ✅ ValorTotal agora baseado na BASE ÚNICA de negociação
            var valorTotal = request.Contratos.Sum(c => c.SaldoBaseNegociacao);

            var detalhes = new List<ResultadoContratoDto>();
            decimal totalComMulta = 0m;

            foreach (var contrato in request.Contratos)
            {
                // ✅ Principal = BASE ÚNICA de negociação
                decimal principal = contrato.SaldoBaseNegociacao;

                // ✅ Dias de atraso
                int diasAtraso = contrato.DiasAtrasoParcela < 0 ? 0 : contrato.DiasAtrasoParcela;

                // ✅ Taxa do contrato vem como percentual (ex.: 2,39), converte para decimal (0,0239)
                decimal taxaContratoAm = ConverterPercentParaTaxaDecimalAm(contrato.TaxaOperacaoPercentual);

                var r = CalculadoraRenegociacao.Calcular(
                    principal: principal,
                    diasAtraso: diasAtraso,
                    taxaContratoAm: taxaContratoAm,
                    taxaMoraAm: 0.0032m,
                    multaRate: 0.02m,
                    baseDiasMes: 30,
                    modelo: ModeloCalculo.Separado,
                    arredondar: 2
                );

                totalComMulta += r.TotalComMulta;

                detalhes.Add(new ResultadoContratoDto
                {
                    NumeroContrato = contrato.NumeroContrato ?? "",
                    Principal = r.Principal,
                    DiasAtraso = r.DiasAtraso,
                    Meses = r.Meses,

                    JurosContratoComposto = r.JurosContratoComposto,
                    MoraComposto = r.MoraComposto,
                    MontanteComposto = r.MontanteComposto,

                    JurosContratoSimples = r.JurosContratoSimples,
                    MoraSimples = r.MoraSimples,
                    MontanteSimples = r.MontanteSimples,

                    Multa = r.Multa,
                    TotalComMulta = r.TotalComMulta
                });
            }

            return await Task.FromResult(new ResultadoCalculoResponse
            {
                ValorTotal = valorTotal,
                PrazoMeses = request.PrazoMeses,
                PercentualEntrada = request.PercentualEntrada,
                ValorEntrada = valorTotal * request.PercentualEntrada,

                TotalComMulta = totalComMulta,
                DetalhesPorContrato = detalhes,

                Observacoes = "Simulação baseada em SaldoBaseNegociacao (principal), DiasAtrasoParcela e TaxaOperacaoPercentual (% a.m.) por contrato."
            });
        }

        /// <summary>
        /// Converte taxa em percentual para taxa decimal ao mês.
        /// Ex.: 2,39 -> 0,0239
        /// Se vier 0,0239 já em decimal, mantém.
        /// </summary>

        private static decimal ConverterPercentParaTaxaDecimalAm(decimal taxaPercentual)
        {
            if (taxaPercentual <= 0m) return 0m;

            // Se vier 239 (representando 2,39%), converte
            if (taxaPercentual > 100m)
                return taxaPercentual / 10000m;

            // Se vier 0,0239 já em decimal (2,39% a.m.)
            if (taxaPercentual > 0m && taxaPercentual < 1m)
                return taxaPercentual / 100m; // ✅ 0,9488 (%)-> 0,009488

            // Se vier 2,39 (%)
            return taxaPercentual / 100m;
        }


        private static string SomenteNumeros(string? valor)
        {
            if (string.IsNullOrWhiteSpace(valor)) return string.Empty;
            return new string(valor.Where(char.IsDigit).ToArray());
        }

        private static bool EqualsIgnoreAccents(string? a, string b)
        {
            if (string.IsNullOrWhiteSpace(a)) return false;
            return RemoveAccents(a).Equals(RemoveAccents(b), StringComparison.OrdinalIgnoreCase);
        }

        private static string RemoveAccents(string s)
        {
            var normalized = s.Normalize(NormalizationForm.FormD);
            var chars = normalized.Where(ch => CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark).ToArray();
            return new string(chars).Normalize(NormalizationForm.FormC);
        }
    }
}
