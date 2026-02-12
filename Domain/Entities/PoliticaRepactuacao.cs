namespace Recoopera.Domain.Entities;

public class PoliticaRepactuacao
{
    public int Id { get; set; }

    public decimal PercentualEntradaMinimo { get; set; }
    public decimal PercentualEntradaMaximo { get; set; }

    public int PrazoMaximoFaixa { get; set; } // Ex: 24 meses

    public decimal TaxaAte24Meses { get; set; }
    public decimal TaxaAcima24Meses { get; set; }

    public bool PermiteDescontoTaxa { get; set; }
    public bool PossuiGarantiaReal { get; set; }

    public bool Ativa { get; set; }
}
