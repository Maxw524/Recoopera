
// src/utils/pdfSimulacao.js
export async function gerarPdfSimulacao({
  cpf,
  contratos = [],
  // números já calculados
  totalRecalculado = 0,
  entradaPercentual = 0,
  entradaValor = 0,
  prazo = 0, // número de parcelas
  saldoFinanciar = 0,
  parcelaEstimativa = 0,
  taxaFinal = null,
  taxaPolitica = null,
  taxaOriginal = null,
  // reforços
  temAvalista = false,
  avalEhSocio = false,
  adicionarGarantiaReal = false,
  valorGarantia = 0,
  // opções
  incluirTabelaContratos = true
}) {
  // Import dinâmico => evita problemas de bundlers/SSR
  const { default: JSPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new JSPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = margin;

  const fmtBRL = (v) =>
    (Number.isFinite(Number(v)) ? Number(v) : 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

  // ===== CABEÇALHO =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SIMULAÇÃO DE REPACTUAÇÃO', margin, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`, margin, y); y += 14;
  doc.text(`CPF/CNPJ: ${cpf || '-'}`, margin, y); y += 14;
  doc.text(`Contratos selecionados: ${contratos.length}`, margin, y); y += 18;

  // ===== TABELA PRINCIPAL =====
  const rows = [
    ['Saldo Total', fmtBRL(totalRecalculado)],
    ['% de Entrada', `${Number(entradaPercentual) || 0}%`],
    ['Valor de Entrada', fmtBRL(entradaValor)],
    ['Prazo (nº parcelas)', String(Number(prazo) || 0)],
    ['Saldo a Financiar', fmtBRL(saldoFinanciar)],
    ['Parcela Estimada (PRICE)', fmtBRL(parcelaEstimativa)],
    ['Avalista?', temAvalista ? 'Sim' : 'Não'],
    ['Avalista é sócio?', temAvalista ? (avalEhSocio ? 'Sim' : 'Não') : '—'],
    ['Nova Garantia Real?', adicionarGarantiaReal ? 'Sim' : 'Não'],
    ['Valor da Garantia', adicionarGarantiaReal ? fmtBRL(valorGarantia) : '—']
  ];

  autoTable(doc, {
    startY: y,
    head: [['Campo', 'Valor']],
    body: rows,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: { 0: { cellWidth: 230 } },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 14;

  // ===== TAXAS (pequeno) =====
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(
    `Taxa de Juros (a.m.): Final ${Number.isFinite(taxaFinal) ? taxaFinal.toFixed(2) : '-'}% | ` +
    `Política ${taxaPolitica !== null && Number.isFinite(taxaPolitica) ? taxaPolitica.toFixed(2) : '—'}% | ` +
    `Origem ${Number.isFinite(taxaOriginal) ? taxaOriginal.toFixed(2) : '—'}%`,
    margin,
    y
  );
  y += 20;

  // ===== TABELA DE CONTRATOS (opcional) =====
  if (incluirTabelaContratos && contratos.length > 0) {
    const contratosRows = contratos.map((c) => ([
      c.numeroContrato ?? '—',
      c.tipoContrato ?? '—',
      String(c.diasAtraso ?? c.diasEmAtraso ?? 0),
      (Number(c.taxaAm ?? c.taxa ?? c.taxaContrato ?? c.taxaMensal) || 0).toFixed(2) + '%',
      fmtBRL(c.valorRecalculado)
    ]));

    autoTable(doc, {
      startY: y,
      head: [['Contrato', 'Tipo', 'Dias atraso', 'Taxa origem', 'Valor recalculado']],
      body: contratosRows,
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 14;
  }

  // ===== DISCLAIMER GRANDE =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ATENÇÃO: SIMULAÇÃO SUJEITA A ALTERAÇÕES', margin, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const disclaimer =
    'ESTE DOCUMENTO NÃO É PROPOSTA FIRMADA. Os valores apresentados são APENAS UMA SIMULAÇÃO e podem mudar por diversos fatores, ' +
    'como: data de assinatura do novo contrato, nova avaliação do contrato, alterações de condições de crédito, data de pagamento, ' +
    'incidência de tributos/seguros/tarifas e políticas internas. A aprovação está sujeita à análise.';
  const wrapped = doc.splitTextToSize(disclaimer, 515);
  doc.text(wrapped, margin, y);
  y += wrapped.length * 14 + 10;

  // ===== RODAPÉ =====
  doc.setFontSize(8);
  doc.text('Recoopera • Simulação gerada automaticamente', margin, 812);

  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const fileName = `Simulacao_Repactuacao_${cpf || 'cliente'}_${ts}.pdf`;
  doc.save(fileName);
}
``
