
// src/pages/RelatorioSimulacao.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { gerarPdfSimulacao } from "../utils/pdfSimulacao";

export default function RelatorioSimulacao() {
  const { state } = useLocation();
  const navigate = useNavigate();

const totalParaRelatorio = useMemo(() => {
  const v = Number(totalRecalculado);
  if (Number.isFinite(v) && v > 0) return v;

  // Fallback: soma preferindo totalDevido (corrigido)
  return contratos.reduce(
    (s, c) =>
      s +
      (Number(
        c?.totalDevido ??
          c?.saldoBase ??
          c?.valorSaldoContabilBruto ??
          0
      ) || 0),
    0
  );
}, [totalRecalculado, contratos]);
  // Se veio sem estado, volta
  if (!state) {
    return (
      <div style={{ padding: 20, fontFamily: "Inter, Arial, sans-serif" }}>
        <h3>Relatório de Simulação</h3>
        <p>Nenhuma simulação encontrada. Volte e gere uma simulação primeiro.</p>
        <button onClick={() => navigate(-1)}>Voltar</button>
      </div>
    );
  }

  const {
    cpf,
    contratos = [],
    entradaPercentual = 0,
    entradaValor = 0,
    prazo = 0,
    saldoFinanciar = 0,
    parcelaEstimativa = 0,
    taxaFinal,
    taxaPolitica,
    taxaOriginal,
    temAvalista,
    avalEhSocio,
    adicionarGarantiaReal,
    valorGarantia = 0,
    totalRecalculado = 0
  } = state;

  const fmtBRL = (v) =>
    (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  async function baixarPdf() {
    try {
      await gerarPdfSimulacao({
        cpf,
        contratos,
        totalRecalculado: totalParaRelatorio,
        entradaPercentual,
        entradaValor,
        prazo,
        saldoFinanciar,
        parcelaEstimativa,
        taxaFinal,
        taxaPolitica,
        taxaOriginal,
        temAvalista,
        avalEhSocio,
        adicionarGarantiaReal,
        valorGarantia,
        incluirTabelaContratos: true
      });
    } catch (e) {
      console.error(e);
      alert("Falha ao gerar PDF. Verifique as dependências: jspdf e jspdf-autotable.");
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto", color: "#e2e8f0", fontFamily: "Inter, Arial, sans-serif", background: "#0a0f1b", minHeight: "100vh" }}>
      <h2 style={{ marginBottom: 8 }}>Relatório da Simulação</h2>
      <div style={{ opacity: .8, marginBottom: 16 }}>CPF/CNPJ: <strong>{cpf || "—"}</strong></div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#0c1323", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>% Entrada</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{entradaPercentual}%</div>
        </div>
        <div style={{ background: "#0c1323", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Prazo</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{prazo} meses</div>
        </div>
        <div style={{ background: "#0c1323", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Parcela Estimada</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtBRL(parcelaEstimativa)}</div>
        </div>
      </div>

      <div style={{ background: "#0c1323", border: "1px solid #1e293b", borderRadius: 10, padding: 12, marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>Taxas (a.m.)</div>
        <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
          <div>Final: <strong>{Number.isFinite(taxaFinal) ? taxaFinal.toFixed(2) : "—"}%</strong></div>
          <div>Política: <strong>{taxaPolitica !== null && Number.isFinite(taxaPolitica) ? taxaPolitica.toFixed(2) : "—"}%</strong></div>
          <div>Origem: <strong>{Number.isFinite(taxaOriginal) ? taxaOriginal.toFixed(2) : "—"}%</strong></div>
        </div>
      </div>

      <div style={{ background: "#0c1323", border: "1px solid #1e293b", borderRadius: 10, padding: 12, marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>Reforços na nova operação</div>
        <div>Avalista: <strong>{temAvalista ? "Sim" : "Não"}</strong>{temAvalista ? ` • Sócio: ${avalEhSocio ? "Sim" : "Não"}` : ""}</div>
        <div>Nova garantia real: <strong>{adicionarGarantiaReal ? "Sim" : "Não"}</strong>{adicionarGarantiaReal ? ` • Valor: ${fmtBRL(valorGarantia)}` : ""}</div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={baixarPdf}
          style={{ padding: "10px 16px", borderRadius: 10, background: "#1d4ed8", color: "#fff", border: "1px solid #1e3a8a", cursor: "pointer" }}
        >
          Baixar PDF
        </button>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: "10px 16px", borderRadius: 10, background: "#0c1529", color: "#fff", border: "1px solid #1e293b", cursor: "pointer" }}
        >
          Voltar
        </button>
      </div>
    </div>
  );
}

