using Microsoft.AspNetCore.Mvc;
using Recoopera.Application.DTOs;
using Recoopera.Application.Services;
using Recoopera.Application.Calculos;
using Recoopera.Infrastructure.Excel.Interfaces; // ✅ ADD

using System;
using System.Linq;
using System.Threading.Tasks;

[ApiController]
[Route("api/renegociacoes")]
public class RenegociacaoController : ControllerBase
{
    private readonly RenegociacaoService _service;
    private readonly ICalculoNegociacaoService _calculo;
    private readonly IOperacoesAdvogadosExcelRepository _operAdvRepo; // ✅ ADD

    public RenegociacaoController(
        RenegociacaoService service,
        ICalculoNegociacaoService calculo,
        IOperacoesAdvogadosExcelRepository operAdvRepo) // ✅ ADD
    {
        _service = service;
        _calculo = calculo;
        _operAdvRepo = operAdvRepo;
    }

    /// <summary>
    /// Retorna contratos com campos já ajustados para a UI:
    /// - taxaOperacaoPercentual: taxa efetiva (% a.m.) => 2,39 quando original==0 e atraso>0
    /// - saldoBaseNegociacao: saldo contábil bruto ajustado (quando taxa==0)
    ///
    /// ✅ Também devolve:
    /// - totalDevido: resultado do cálculo (juros+mora+multa) calculado no backend
    /// - ehAjuizado: true se o numeroContrato existir na planilha "Operações Advogados"
    /// </summary>
    [HttpGet("{cpfCnpj}")]
    public async Task<IActionResult> BuscarContratos(string cpfCnpj)
    {
        // 1) Fonte original (planilha/base)
        var contratosExcel = await _service.BuscarContratosAsync(cpfCnpj);

        // 2) Aplica a regra de cálculo
        var calculados = _calculo.CalcularLista(contratosExcel);

        // ✅ 3) Carrega uma vez a lista de contratos ajuizados (somente dígitos)
        var ajuizados = _operAdvRepo.GetContratosAjuizados();

        // 4) Payload para o front
        var payload = calculados.Select(c =>
        {
            // ✅ Normaliza número do contrato (somente dígitos)
            var numeroContratoDigits = OnlyDigits(c.NumeroContrato);

            // ✅ Regra: se constar na planilha Operações Advogados => EhAjuizado = true
            bool ehAjuizado = !string.IsNullOrEmpty(numeroContratoDigits)
                              && ajuizados.Contains(numeroContratoDigits);

            decimal principal = Convert.ToDecimal(c.ValorSaldoContabilBrutoAjustado);
            decimal taxaContratoAm = ConverterPercentParaTaxaDecimalAm(Convert.ToDecimal(c.TaxaOperacaoPercentualEfetiva));
            int diasAtraso = c.DiasAtrasoParcela < 0 ? 0 : c.DiasAtrasoParcela;

            var calc = CalculadoraRenegociacao.Calcular(
                principal: principal,
                diasAtraso: diasAtraso,
                taxaContratoAm: taxaContratoAm,
                taxaMoraAm: 0.0032m,
                multaRate: 0.02m,
                baseDiasMes: 30,
                modelo: ModeloCalculo.Separado,
                arredondar: 2
            );

            return new
            {
                dataMovimento = c.DataMovimento,
                nomeCliente = c.NomeCliente,
                cpfCnpj = c.CpfCnpj,

                numeroContrato = c.NumeroContrato,
                submodalidadeBacen = c.SubmodalidadeBacen,
                situacaoContrato = c.SituacaoContrato,
                tipoContrato = c.TipoContrato,

                taxaOperacaoPercentualOriginal = c.TaxaOperacaoPercentualOriginal,
                taxaOperacaoPercentualEfetiva = c.TaxaOperacaoPercentualEfetiva,
                taxaOperacaoPercentual = c.TaxaOperacaoPercentualEfetiva,

                valorContrato = c.ValorContrato,
                valorPago = c.ValorPago,

                diasAtrasoParcela = c.DiasAtrasoParcela,

                valorSaldoContabilBruto = c.ValorSaldoContabilBruto,
                saldoBaseNegociacao = c.ValorSaldoContabilBrutoAjustado,
                valorSaldoContabilBrutoAjustado = c.ValorSaldoContabilBrutoAjustado,

                totalDevido = calc.TotalComMulta,

                aplicouTaxaFallback = c.AplicouTaxaFallback,
                jurosAplicadosFallback = c.JurosAplicados,
                ehPrejuizo = c.EhPrejuizo,

                // ✅ NOVOS CAMPOS
                ehAjuizado = ehAjuizado,
                podeSelecionar = !ehAjuizado
            };
        });

        return Ok(payload);
    }

    [HttpPost("consolidar")]
    public async Task<IActionResult> Consolidar([FromBody] RenegociacaoRequestDto request)
    {
        var resultado = await _service.ConsolidarAsync(request.Cpf, request.ContratosSelecionados);
        return Ok(resultado);
    }

    [HttpPost("simular")]
    public async Task<IActionResult> Simular([FromBody] CalculoRenegociacaoRequest request)
    {
        var resultado = await _service.SimularAsync(request);
        return Ok(resultado);
    }

    /// <summary>
    /// Versão "grid" seguindo a mesma regra de ajuste.
    /// ✅ Também devolve totalDevido calculado no backend.
    /// ✅ Também devolve ehAjuizado baseado na planilha Operações Advogados.
    /// </summary>
    [HttpGet("grid/{cpfCnpj}")]
    public async Task<IActionResult> BuscarContratosGrid(string cpfCnpj)
    {
        var contratosExcel = await _service.BuscarContratosAsync(cpfCnpj);
        var calculados = _calculo.CalcularLista(contratosExcel);

        // ✅ Carrega uma vez por request
        var ajuizados = _operAdvRepo.GetContratosAjuizados();

        var grid = calculados.Select(c =>
        {
            var numeroContratoDigits = OnlyDigits(c.NumeroContrato);
            bool ehAjuizado = !string.IsNullOrEmpty(numeroContratoDigits)
                              && ajuizados.Contains(numeroContratoDigits);

            decimal principal = Convert.ToDecimal(c.ValorSaldoContabilBrutoAjustado);
            decimal taxaContratoAm = ConverterPercentParaTaxaDecimalAm(Convert.ToDecimal(c.TaxaOperacaoPercentualEfetiva));
            int diasAtraso = c.DiasAtrasoParcela < 0 ? 0 : c.DiasAtrasoParcela;

            var calc = CalculadoraRenegociacao.Calcular(
                principal: principal,
                diasAtraso: diasAtraso,
                taxaContratoAm: taxaContratoAm,
                taxaMoraAm: 0.0015m,
                multaRate: 0.02m,
                baseDiasMes: 30,
                modelo: ModeloCalculo.Separado,
                arredondar: 2
            );

            return new
            {
                dataMovimento = c.DataMovimento,
                nomeCliente = c.NomeCliente,
                cpfCnpj = c.CpfCnpj,

                numeroContrato = c.NumeroContrato,
                submodalidadeBacen = c.SubmodalidadeBacen,
                situacaoContrato = c.SituacaoContrato,
                tipoContrato = c.TipoContrato,

                taxaOperacaoPercentualOriginal = c.TaxaOperacaoPercentualOriginal,
                taxaOperacaoPercentualEfetiva = c.TaxaOperacaoPercentualEfetiva,
                taxaOperacaoPercentual = c.TaxaOperacaoPercentualEfetiva,

                valorContrato = c.ValorContrato,
                valorPago = c.ValorPago,
                diasAtrasoParcela = c.DiasAtrasoParcela,

                valorSaldoContabilBruto = c.ValorSaldoContabilBruto,
                saldoBaseNegociacao = c.ValorSaldoContabilBrutoAjustado,
                valorSaldoContabilBrutoAjustado = c.ValorSaldoContabilBrutoAjustado,

                totalDevido = calc.TotalComMulta,

                aplicouTaxaFallback = c.AplicouTaxaFallback,
                jurosAplicadosFallback = c.JurosAplicados,
                ehPrejuizo = c.EhPrejuizo,

                // ✅ NOVOS CAMPOS
                ehAjuizado = ehAjuizado,
                podeSelecionar = !ehAjuizado
            };
        });

        return Ok(grid);
    }

    /// <summary>
    /// Converte taxa em percentual para taxa decimal ao mês.
    /// Ex.: 1,59 -> 0,0159 | 2,39 -> 0,0239
    /// Se já vier em decimal (0,0239), mantém.
    /// </summary>
    private static decimal ConverterPercentParaTaxaDecimalAm(decimal taxaPercentual)
    {
        if (taxaPercentual <= 0m) return 0m;

        // Se vier 239 (representando 2,39%), converte
        if (taxaPercentual > 100m)
            return taxaPercentual / 10000m;

        // Se vier 0,0239 já em decimal (2,39% a.m.)
        if (taxaPercentual > 0m && taxaPercentual < 1m)
            return taxaPercentual / 100m;

        // Se vier 2,39 (%)
        return taxaPercentual / 100m;
    }

    // ✅ Helper: normaliza string para somente dígitos
    private static string OnlyDigits(string? s)
        => string.IsNullOrWhiteSpace(s)
            ? ""
            : new string(s.Where(char.IsDigit).ToArray());
}