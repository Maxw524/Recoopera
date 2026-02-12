import { useState, useMemo, useEffect } from "react";
import { calcularTaxaPolitica } from "../rules/repactuacaoRules";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function SimulacaoNegociacao() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // 1) Dados vindos da tela de renegociação
  const { cpf, contratos = [] } = state || {};
  const nomeCliente = state?.nomeCliente || "";

  // 2) Calcula saldo total
  const totalRecalculado = useMemo(() => {
    return contratos.reduce(
      (sum, c) =>
        sum +
        (Number(
          c?.totalDevido ??
            c?.saldoBase ??
            c?.valorSaldoContabilBruto ??
            0
        ) || 0),
      0
    );
  }, [contratos]);

  function voltar() {
    navigate("/renegociacao", {
      state: {
        cpf,
        nomeCliente,
        contratos,
      },
    });
  }

  function voltarLimpo() {
    navigate("/renegociacao", {
      state: {
        cpf: "",
        nomeCliente: "",
        contratos: [],
      },
    });
  }

  // ===============================
  // ESTADOS DA SIMULAÇÃO
  // ===============================
  const [entradaPercentual, setEntradaPercentual] = useState(10);
  const [entradaValorInput, setEntradaValorInput] = useState("");

  const [prazo, setPrazo] = useState(24);
  const [prazoInput, setPrazoInput] = useState("24");

  const [idade, setIdade] = useState("");

  const [adicionarGarantiaReal, setAdicionarGarantiaReal] = useState(false);
  const [valorGarantia, setValorGarantia] = useState("");

  const [temAvalista, setTemAvalista] = useState(false);
  const [avalEhSocio, setAvalEhSocio] = useState(false);
  const [dadosAvalista, setDadosAvalista] = useState("");

  const [criterioAtraso, setCriterioAtraso] = useState("todos");

  const [troco, setTroco] = useState("");
  const [acrescimos, setAcrescimos] = useState("");

  const [mostrarDebug, setMostrarDebug] = useState(false);

  // 👇 NOVOS ESTADOS E CÁLCULOS RELACIONADOS À CAMPANHA / DIAS DE ATRASO
  const [campanhaForcadaAtiva, setCampanhaForcadaAtiva] = useState(false);

  const {
    possuiContratosMenos90,
    possuiContratosMaisOuIgual90,
  } = useMemo(() => {
    let menos90 = false;
    let maisOuIgual90 = false;

    for (const c of contratos) {
      // Ajuste aqui se o nome do campo de dias de atraso for diferente
      const dias = Number(
        c?.diasAtraso ?? c?.qtdeDiasAtraso ?? c?.diasEmAtraso ?? 0
      );

      if (!Number.isFinite(dias)) continue;

      if (dias < 90) {
        menos90 = true;
      } else {
        maisOuIgual90 = true;
      }
    }

    return {
      possuiContratosMenos90: menos90,
      possuiContratosMaisOuIgual90: maisOuIgual90,
    };
  }, [contratos]);

  const misturaContratosAtraso =
    possuiContratosMenos90 && possuiContratosMaisOuIgual90;

  useEffect(() => {
    // Sempre que trocar CPF ou lista de contratos, zera a campanha forçada
    setCampanhaForcadaAtiva(false);
  }, [cpf, contratos]);

  // ===============================
  // PARSERS
  // ===============================
  function parseBRL(value) {
    if (!value) return 0;
    let v = value.toString();
    v = v.replace(/[^\d.,]/g, "");
    if (v.includes(",") && v.includes(".")) {
      v = v.replace(/\./g, "").replace(",", ".");
    } else if (v.includes(",")) {
      v = v.replace(",", ".");
    }
    return Number(v) || 0;
  }

  function parseMoneyBR(value) {
    if (!value) return 0;
    let v = value.toString().replace(/[^\d.,]/g, "");
    if (v.includes(",") && v.includes(".")) {
      return Number(v.replace(/\./g, "").replace(",", ".")) || 0;
    }
    if (v.includes(",")) {
      return Number(v.replace(",", ".")) || 0;
    }
    if (v.includes(".")) {
      return Number(v) || 0;
    }
    return Number(v) || 0;
  }

  const valorGarantiaParsed = parseMoneyBR(valorGarantia);
  const trocoValor = parseMoneyBR(troco);
  const acrescimosValor = parseMoneyBR(acrescimos);
  const totalAdicionais = trocoValor + acrescimosValor;

  // ===============================
  // MOTOR DE REGRAS
  // ===============================
  const resultado = useMemo(() => {
    if (contratos.length === 0) return null;

    const entradaClamped = Math.min(
      100,
      Math.max(0, Number(entradaPercentual) || 0)
    );
    const prazoClamped = Math.min(
      60,
      Math.max(6, Number(prazo) || 6)
    );

    return calcularTaxaPolitica({
      contratos,
      entradaPercentual: entradaClamped,
      prazo: prazoClamped,
      adicionarGarantiaReal,
      valorGarantia: valorGarantiaParsed,
      temAvalista,
      avalEhSocio,
      criterioAtraso,
      // 👇 NOVO: informa que a campanha foi forçada pela UI
      forcarCampanha: campanhaForcadaAtiva,
    });

  },
   [
    contratos,
    entradaPercentual,
    prazo,
    adicionarGarantiaReal,
    valorGarantiaParsed,
    temAvalista,
    avalEhSocio,
    criterioAtraso,
    totalRecalculado,
    // 👇 NOVO: recalcular sempre que forçar/retirar campanha
    campanhaForcadaAtiva,
  ]);

  if (!resultado) {
    return (
      <p style={{ padding: 20 }}>Nenhum contrato recebido para simulação.</p>
    );
  }

  const { taxaFinal, taxaOriginal, taxaPolitica, alertas, debug } = resultado;

  // ===============================
  // TAXA DE SEGURO OBRIGATÓRIA
  // ===============================
  let taxaSeguroMensal = 0;
  const idadeNum = Number(idade);
  if (Number.isFinite(idadeNum) && idadeNum > 0) {
    taxaSeguroMensal = idadeNum < 65 ? 0.06 : 0.12;
  }

  const taxaComSeguro = (Number(taxaFinal) || 0) + taxaSeguroMensal;

  // ===============================
  // CÁLCULOS AUXILIARES
  // ===============================
  const fmtBRL = (v) =>
    (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  // >>> ALTERAÇÃO: helper para exibir % com no máx. 4 casas, sem arredondar (apenas truncar)
  const formatPercent4 = (p) => {
    const n = Number(p);
    if (!Number.isFinite(n)) return "0";
    const trunc = Math.trunc(n * 10000) / 10000;
    return trunc.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  };

  const entradaValor =
    (totalRecalculado * (Number(entradaPercentual) || 0)) / 100;

  const saldoBase = Math.max(totalRecalculado - entradaValor, 0);
  const saldoFinanciar = Math.max(saldoBase + totalAdicionais, 0);

  // Cobertura (garantia ÷ saldo a financiar) – limitada a 100%
  const cobertura =
    saldoFinanciar > 0 ? valorGarantiaParsed / saldoFinanciar : 0;
  const coberturaPercent = Math.min(cobertura * 100, 100);

  const i = (Number(taxaComSeguro) || 0) / 100;
  const n = Number(prazo) || 0;
  let parcelaEstimativa = 0;
  if (i > 0 && n > 0) {
    parcelaEstimativa =
      (i * saldoFinanciar) / (1 - Math.pow(1 + i, -n));
  } else if (n > 0) {
    parcelaEstimativa = saldoFinanciar / n;
  }

  // 👇 AJUSTE NAS FLAGS DE CAMPANHA
  const campanhaAplicadaSistema =
    taxaPolitica !== null && Number.isFinite(taxaPolitica);
  const elegivel = debug?.elegivelCampanha === true;
  const bloqueioPorTaxaMinima =
    debug?.bloqueioTaxaOrigemMinima === true;

  const campanhaAtiva = campanhaAplicadaSistema || campanhaForcadaAtiva;
  const podeForcarCampanha = !elegivel && misturaContratosAtraso;

  const melhorou =
    Number.isFinite(taxaFinal) &&
    Number.isFinite(taxaOriginal) &&
    taxaFinal < taxaOriginal;

  const prazoTipo = n <= 24 ? "≤ 24x (curto)" : "> 24x (longo)";
  const faixaEntrada =
    entradaPercentual >= 30
      ? "≥ 30%"
      : entradaPercentual >= 20
      ? "20%–29,99%"
      : entradaPercentual >= 10
      ? "10%–19,99%"
      : "< 10% (sem faixa)";

  const valorGarantiaNum =
    Number(
      String(valorGarantia).replace(/\./g, "").replace(",", ".")
    ) ||
    Number(valorGarantia) ||
    0;

  // ===============================
  // HANDLERS ESPECÍFICOS
  // ===============================
  function handleToggleCampanha() {
    // Se for ativar campanha forçada
    if (!campanhaForcadaAtiva) {
      if (!podeForcarCampanha) return;

      const ok = window.confirm(
        "Existem contratos com menos de 90 dias de atraso (não elegíveis à campanha). " +
          "Deseja ativar a campanha mesmo assim?"
      );

      if (!ok) return;

      setCampanhaForcadaAtiva(true);
    } else {
      // Desligar campanha forçada
      setCampanhaForcadaAtiva(false);
    }
  }

  function handleBlurEntradaValor() {
    const raw = (entradaValorInput ?? "").trim();

    if (raw === "") {
      setEntradaValorInput("");
      return;
    }

    const valor = parseMoneyBR(raw);
    if (!Number.isFinite(valor) || valor < 0) {
      setEntradaValorInput("");
      return;
    }

    const novoPercent =
      totalRecalculado > 0 ? (valor / totalRecalculado) * 100 : 0;
    const clamped = Math.min(100, Math.max(0, novoPercent));

    // >>> ALTERAÇÃO: Remover arredondamento para 2 casas (preservar precisão)
    // const normalized = Math.round(clamped * 100) / 100;
    // setEntradaPercentual(normalized);

    setEntradaPercentual(clamped); // mantém a precisão real
    setEntradaValorInput("");
  }

  // ===============================
  // ESTILOS (injetados no documento)
  // ===============================
  useEffect(() => {
    const id = "simulacao-negociacao-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      :root {
        --bg: #0f172a;
        --card: #0b1220;
        --muted: #94a3b8;
        --text: #e2e8f0;
        --primary: #2563eb;
        --primary-700: #1d4ed8;
        --success: #16a34a;
        --warning: #b45309;
        --danger: #dc2626;
        --chip: #0b1730;
        --divider: #1e293b;
        --shadow: 0 10px 25px rgba(0,0,0,.35);
        --radius: 12px;
      }

      .sn-container { 
        max-width: 1600px;
        margin: 48px auto;
        padding: 36px;
        color: var(--text); 
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; 
      }

      .sn-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
      .sn-title { font-size: 22px; font-weight: 700; letter-spacing: .3px; }

      .sn-grid {
        display: grid; 
        grid-template-columns: 1fr; 
        gap: 16px; 
      }

      @media (min-width: 900px) { 
        .sn-grid { 
          grid-template-columns: 3fr 1fr; 
        } 
      }

      .sn-card { background: linear-gradient(180deg, #0c1323 0%, #0a101c 100%); border: 1px solid var(--divider); border-radius: var(--radius); box-shadow: var(--shadow); padding: 18px 18px 14px; }
      .sn-section + .sn-section { border-top: 1px dashed var(--divider); margin-top: 16px; padding-top: 16px; }
      .sn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .sn-row-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .sn-label { display: block; color: var(--muted); font-size: 12px; margin-bottom: 6px; letter-spacing: .3px; }
      .sn-value { font-size: 18px; font-weight: 700; }
      .sn-chip { display: inline-flex; align-items: center; gap: 8px; background: var(--chip); border: 1px solid var(--divider); padding: 6px 10px; border-radius: 999px; color: var(--text); font-size: 12px; }
      .sn-badge { background: rgba(37,99,235,.15); color: #93c5fd; border: 1px solid rgba(37,99,235,.35); border-radius: 8px; padding: 4px 8px; font-size: 12px; }
      .sn-badge.green { background: rgba(34,197,94,.15); color: #86efac; border-color: rgba(34,197,94,.35); }
      .sn-badge.amber { background: rgba(245,158,11,.15); color: #fcd34d; border-color: rgba(245,158,11,.35); }
      .sn-badge.red   { background: rgba(239,68,68,.15);  color: #fca5a5; border-color: rgba(239,68,68,.35); }
      .sn-strong { font-weight: 700; color: #cbd5e1; }
      .sn-input, .sn-number { background: #0a1426; border: 1px solid var(--divider); border-radius: 10px; color: var(--text); padding: 8px 10px; outline: none; width: 100%; }
      .sn-number { width: 120px; }
      .sn-slider { width: 100%; accent-color: var(--primary); }
      .sn-switch { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
      .sn-switch input { display: none; }
      .sn-switch .track { width: 42px; height: 24px; border-radius: 999px; background: #1f2937; border: 1px solid var(--divider); position: relative; transition: background .2s ease; }
      .sn-switch .thumb { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .2s ease, background .2s ease; }
      .sn-switch input:checked + .track { background: var(--primary); }
      .sn-switch input:checked + .track .thumb { left: 22px; background: #fff; }

      .sn-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--divider); padding: 10px 14px; border-radius: 10px; background: #0c1529; color: var(--text); cursor: pointer; }
      .sn-button:active { transform: translateY(1px); }

      .sn-ok { color: #86efac; }
      .sn-warn { color: #fbbf24; }
      .sn-danger { color: #fca5a5; }
      .sn-alert { background: #1b1f2e; border: 1px solid #2b3448; border-left: 4px solid var(--warning); padding: 10px 12px; border-radius: 8px; color: #f1cfa0; }
      .sn-divider { height: 1px; background: var(--divider); margin: 12px 0; }
      .sn-final { font-size: 28px; font-weight: 800; }
      .sn-final.good { color: #86efac; }
      .sn-small { color: var(--muted); font-size: 12px; }

      body { background: radial-gradient(1200px 600px at 20% -5%, #0e1a33, transparent 50%), #0a0f1b; }

      .rn-title-wrapper { display: flex; align-items: center; gap: 10px; }
      .rn-logo { height: 32px; width: auto; }
    `;
    document.head.appendChild(style);
  }, []);

  // ===============================
  // GERAR PDF (Simulação)
  // ===============================
  function gerarPDF() {
    const debugLog = (...args) => {
      try {
        console.log(...args);
      } catch {}
      try {
        const pre = document.createElement("pre");
        pre.style.cssText =
          "position:fixed;bottom:8px;right:8px;max-width:50vw;max-height:40vh;overflow:auto;background:#0b1220;color:#e2e8f0;border:1px solid #334155;padding:8px;border-radius:8px;z-index:99999;font-size:12px;";
        pre.textContent = args
          .map((a) =>
            typeof a === "string" ? a : JSON.stringify(a, null, 2)
          )
          .join(" ");
        document.body.appendChild(pre);
        setTimeout(() => pre.remove(), 8000);
      } catch {}
    };

    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      let y = margin;

      const clean = (txt) =>
        String(txt ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[≤≥•–—©®™…]/g, "-");

      const safeNumber = (v, d = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : d;
      };
      const safeBRL = (v) => clean(fmtBRL(safeNumber(v, 0)));

      doc.setFillColor(240, 245, 255);
      doc.rect(0, 0, pageWidth, 90, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text(clean("SIMULACAO DE REPACTUACAO"), margin + 110, 45);

      const logoPos = { x: margin, y: 20, w: 90, h: 40 };

      y = 110;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);

      const dataHora = new Date().toLocaleString("pt-BR");
      doc.text(clean(`Data/Hora: ${dataHora}`), margin, y);
      y += 14;
      doc.text(clean(`Cliente: ${nomeCliente || "-"}`), margin, y);
      y += 14;
      doc.text(clean(`CPF/CNPJ: ${cpf || "-"}`), margin, y);
      y += 14;

      doc.setDrawColor(210, 215, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      const avalistaSocioTxt = temAvalista
        ? avalEhSocio
          ? "Sim"
          : "Nao"
        : "";
      const garantiaValorTxt = adicionarGarantiaReal
        ? clean(fmtBRL(valorGarantiaNum))
        : "";

      const linhas = [
        ["Saldo Total para Negociacao", safeBRL(totalRecalculado)],
        // >>> ALTERAÇÃO: % de entrada exibindo 4 casas (truncadas)
        ["% de Entrada", clean(`${formatPercent4(entradaPercentual)}%`)],
        ["Valor de Entrada", safeBRL(entradaValor)],
        ["Prazo (meses)", clean(String(safeNumber(prazo, 0)))],
        ["Troco", safeBRL(trocoValor)],
        ["Acrescimos", safeBRL(acrescimosValor)],
        ["Saldo a Financiar", safeBRL(saldoFinanciar)],
        ["Parcela Estimada", safeBRL(parcelaEstimativa)],
        ["Idade para calculo do seguro", clean(idade || "")],
        [
          "Taxa Seguro (a.m.)",
          taxaSeguroMensal > 0
            ? clean(`${taxaSeguroMensal.toFixed(3)}%`)
            : "",
        ],
        [
          "Taxa Final + Seguro (a.m.)",
          taxaComSeguro > 0
            ? clean(`${taxaComSeguro.toFixed(3)}%`)
            : "",
        ],
        ["Tem Avalista?", clean(temAvalista ? "Sim" : "Nao")],
        ["Avalista e socio?", clean(avalistaSocioTxt)],
        ["Garantia Real nova?", clean(adicionarGarantiaReal ? "Sim" : "Nao")],
        ["Valor da Garantia", garantiaValorTxt],
      ];

      try {
        doc.autoTable({
          startY: y,
          head: [["Campo", "Valor"].map(clean)],
          body: linhas.map((r) => r.map((x) => clean(x))),
          theme: "grid",
          styles: {
            font: "helvetica",
            fontSize: 10,
            cellPadding: 6,
            lineColor: [220, 220, 220],
          },
          headStyles: {
            fillColor: [37, 99, 235],
            textColor: 255,
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: [245, 247, 252] },
          columnStyles: { 0: { cellWidth: 260 } },
          margin: { left: margin, right: margin },
        });
      } catch (e) {
        debugLog("Falha no autoTable. Imprimindo fallback de texto.", e);
        linhas.forEach(([campo, valor]) => {
          doc.text(`${clean(campo)}: ${clean(valor)}`, margin, y);
          y += 14;
        });
      }

      y =
        doc.lastAutoTable && doc.lastAutoTable.finalY
          ? doc.lastAutoTable.finalY + 20
          : y + 12;

      // >>> ALTERAÇÃO: ALERTO DE IOF/DIVERGÊNCIA NO PDF (caixa destacada)
      {
        const largura = pageWidth - margin * 2;
        const alerta =
          "ATENCAO: O calculo gerado pelo sistema NAO incide IOF e o valor para financiamento PODE haver divergencia de valores.";
        const alertaWrapped = doc.splitTextToSize(clean(alerta), largura - 12);
        const altura = alertaWrapped.length * 12 + 16;

        doc.setDrawColor(180, 120, 0);
        doc.setFillColor(255, 248, 233);
        doc.rect(margin, y, largura, altura, "FD");

        doc.setFont("helvetica", "bold");
        doc.setTextColor(120, 80, 0);
        doc.setFontSize(11);
        doc.text(alertaWrapped, margin + 8, y + 12);
        y += altura + 14;
      }

      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);

      const taxaFinalTxt = Number.isFinite(Number(taxaFinal))
        ? `${Number(taxaFinal).toFixed(2)}`
        : "-";
      const taxaPoliticaTxt =
        taxaPolitica !== null && Number.isFinite(Number(taxaPolitica))
          ? `${Number(taxaPolitica).toFixed(2)}`
          : "-";
      const taxaOriginalTxt = Number.isFinite(Number(taxaOriginal))
        ? `${Number(taxaOriginal).toFixed(2)}`
        : "-";
      const taxaSeguroTxt =
        taxaSeguroMensal > 0 ? `${taxaSeguroMensal.toFixed(3)}` : "-";
      const taxaComSegTxt =
        taxaComSeguro > 0 ? `${taxaComSeguro.toFixed(3)}` : "-";

      doc.text(
        clean(
          `Taxas (a.m.): Final ${taxaFinalTxt}% | Politica ${taxaPoliticaTxt}% | Origem ${taxaOriginalTxt}% | Seguro ${taxaSeguroTxt}% | Final+Seguro ${taxaComSegTxt}%`
        ),
        margin,
        y
      );
      y += 22;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(150, 27, 27);
      doc.text(
        clean("ATENCAO: SIMULACAO SUJEITA A ALTERACOES"),
        margin,
        y
      );
      y += 16;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      const disclaimer =
        "ESTE DOCUMENTO NAO E PROPOSTA FIRMADA. Os valores apresentados sao APENAS UMA SIMULACAO e podem mudar por diversos fatores, como: data de assinatura do novo contrato, nova avaliacao do contrato, alteracoes de condicoes de credito, data de pagamento, incidencia de tributos/seguros/tarifas e politicas internas. A aprovacao esta sujeita a analise.";
      const wrapped = doc.splitTextToSize(
        clean(disclaimer),
        pageWidth - margin * 2
      );
      doc.text(wrapped, margin, y);

      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(
        clean("Recoopera - Simulacao gerada automaticamente"),
        margin,
        812
      );

      let saved = false;
      const finalize = () => {
        if (saved) return;
        saved = true;
        const ts = new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/[:T.]/g, "-");
        const fileName = `Simulacao_Repactuacao_${clean(
          cpf || "cliente"
        )}_${ts}.pdf`;
        doc.save(fileName);
      };

      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = "/logo.jpg";

        img.onload = () => {
          try {
            doc.addImage(
              img,
              "JPEG",
              logoPos.x,
              logoPos.y,
              logoPos.w,
              logoPos.h
            );
          } catch (e) {
            debugLog("addImage falhou", e);
          }
          finalize();
        };

        img.onerror = finalize;
        setTimeout(finalize, 800);
      } catch (e) {
        debugLog("Erro ao tentar carregar a logo", e);
        finalize();
      }
    } catch (err) {
      alert("Falha ao gerar PDF da simulacao. Tente novamente.");
      try {
        const pre = document.createElement("pre");
        pre.style.cssText =
          "position:fixed;bottom:8px;left:8px;max-width:50vw;max-height:40vh;overflow:auto;background:#2a1f0b;color:#f1cfa0;border:1px solid #b45309;padding:8px;border-radius:8px;z-index:99999;font-size:12px;";
        pre.textContent =
          "Erro ao gerar PDF:\n" +
          (err && err.stack ? err.stack : String(err));
        document.body.appendChild(pre);
        setTimeout(() => pre.remove(), 10000);
      } catch {}
    }
  }

  // ===============================
  // UI
  // ===============================
  return (
    <div className="sn-container">
      <div className="sn-header">
        <div className="rn-title-wrapper">
          <img
            src="/recoopera-completo.png"
            alt="Recoopera"
            className="rn-logo"
          />
        </div>

        <div className="sn-title">Simulação de Repactuação</div>

        <button
          onClick={voltar}
          className="sn-button"
          style={{ marginRight: "auto" }}
        >
          Voltar
        </button>

        <span className="sn-chip">
          <span>Cliente</span>
          <strong className="sn-strong">{nomeCliente || "—"}</strong>
        </span>

        <span className="sn-chip">
          <span>CPF</span>
          <strong className="sn-strong">{cpf || "—"}</strong>
        </span>

        <div
          className="sn-chip"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          title="Usuário logado"
        >
          👤{" "}
          {typeof user === "string"
            ? user
            : user?.nome ||
              user?.usuario ||
              user?.user ||
              user?.login ||
              "Usuário"}
        </div>

        <button
          className="sn-button"
          style={{
            background: "#2a1f0b",
            borderColor: "#3a2a10",
            color: "#facc15",
          }}
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          title="Encerrar sessão"
        >
          Sair
        </button>
      </div>

      <div className="sn-grid">
        {/* COLUNA ESQUERDA — CONTROLES */}
        <div className="sn-card">
          {/* SALDO */}
          <div className="sn-row">
            <div>
              <div className="sn-label">Saldo Total</div>
              <div className="sn-value">
                {fmtBRL(totalRecalculado)}
              </div>
            </div>
            <div>
              <div className="sn-label">Menor Taxa de Origem</div>
              <div className="sn-value">
                {Number.isFinite(taxaOriginal)
                  ? `${taxaOriginal.toFixed(2)}% a.m.`
                  : "—"}
              </div>
            </div>
          </div>

          {/* ENTRADA */}
          <div className="sn-section">
            <div className="sn-label">
              % de Entrada{" "}
              <span className="sn-badge">
                sugestão mínima: 10%
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <input
                type="range"
                min={0}
                max={100}
                step={0.0001} 
                value={entradaPercentual}
                onChange={(e) =>
                  setEntradaPercentual(Number(e.target.value))
                }
                className="sn-slider"
              />
              <input
                type="number"
                min={0}
                max={100}
                step={0.0001} 
                value={entradaPercentual}
                onChange={(e) => {
                  const v = Math.min(
                    100,
                    Math.max(0, Number(e.target.value) || 0)
                  );
                  setEntradaPercentual(v);
                }}
                className="sn-number"
              />
              <span className="sn-chip">
                <strong className="sn-strong">
                  {/* >>> ALTERAÇÃO: exibir apenas 4 casas decimais (truncado) */}
                  {formatPercent4(entradaPercentual)}%
                </strong>{" "}
                / {fmtBRL(entradaValor)}
              </span>
            </div>

            {/* Valor de entrada editável */}
            <div style={{ marginTop: 10 }}>
              <div className="sn-label">Valor da entrada (R$)</div>
              <input
                type="text"
                className="sn-input"
                inputMode="decimal"
                value={
                  entradaValorInput === ""
                    ? fmtBRL(entradaValor)
                    : entradaValorInput
                }
                onChange={(e) => setEntradaValorInput(e.target.value)}
                onBlur={handleBlurEntradaValor}
                placeholder="Digite o valor da entrada em R$"
              />
              <div className="sn-small" style={{ marginTop: 4 }}>
                Ao editar o valor, o percentual será ajustado
                automaticamente (sem arredondar; a exibição mostra até 4 casas).
              </div>
            </div>

            <div className="sn-small" style={{ marginTop: 6 }}>
              Faixa atual: <strong>{faixaEntrada}</strong>
            </div>
          </div>

          {/* PRAZO */}
          <div className="sn-section">
            <div className="sn-label">Prazo</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <input
                type="range"
                min={6}
                max={60}
                step={1}
                value={prazo}
                onChange={(e) => {
                  const v = Number(e.target.value) || 6;
                  setPrazo(v);
                  setPrazoInput(String(v));
                }}
                className="sn-slider"
              />
              <input
                type="number"
                min={6}
                max={60}
                value={prazoInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setPrazoInput(value);
                  if (value === "") return;
                  const num = Number(value);
                  if (!Number.isFinite(num)) return;
                  const v = Math.min(60, Math.max(6, num));
                  setPrazo(v);
                }}
                onBlur={() => {
                  if (
                    prazoInput === "" ||
                    !Number.isFinite(Number(prazoInput))
                  ) {
                    const padrao = 24;
                    setPrazo(padrao);
                    setPrazoInput(String(padrao));
                  } else {
                    const num = Number(prazoInput);
                    const v = Math.min(60, Math.max(6, num));
                    setPrazo(v);
                    setPrazoInput(String(v));
                  }
                }}
                className="sn-number"
              />
              <span className="sn-chip">
                <strong className="sn-strong">{prazo}</strong> X
              </span>
            </div>
            <div className="sn-small" style={{ marginTop: 6 }}>
              Tipo de prazo: <strong>{prazoTipo}</strong>
            </div>
          </div>

          {/* IDADE / SEGURO */}
          <div className="sn-section">
            <div className="sn-label">
              Idade do cooperado (para cálculo do seguro obrigatório)
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <input
                type="number"
                min={18}
                max={120}
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                className="sn-number"
                placeholder="Ex.: 50"
              />
              <span className="sn-chip">
                {taxaSeguroMensal > 0 ? (
                  <>
                    Taxa seguro:{" "}
                    <strong className="sn-strong">
                      {taxaSeguroMensal.toFixed(3)}% a.m.
                    </strong>
                  </>
                ) : (
                  "Informe a idade para calcular o seguro"
                )}
              </span>
            </div>
            <div className="sn-small" style={{ marginTop: 6 }}>
              0,060% a.m. para até 64 anos; 0,120% a.m. para 65 anos ou
              mais.
            </div>
          </div>

          {/* NOVA GARANTIA REAL */}
          <div className="sn-section">
            <label
              className="sn-switch"
              style={{ marginBottom: 10 }}
            >
              <input
                type="checkbox"
                checked={adicionarGarantiaReal}
                onChange={(e) =>
                  setAdicionarGarantiaReal(e.target.checked)
                }
              />
              <span className="track">
                <span className="thumb" />
              </span>
              <span>Adicionar nova garantia real?</span>
            </label>

            {adicionarGarantiaReal && (
              <div style={{ marginLeft: 6 }}>
                <div className="sn-label">
                  Valor da garantia (R$)
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorGarantia}
                  onChange={(e) => setValorGarantia(e.target.value)}
                  className="sn-input"
                  placeholder="Informe o valor da garantia"
                />
                <div
                  className="sn-small"
                  style={{ marginTop: 6 }}
                >
                  Cobertura (valor garantia ÷ saldo a financiar):{" "}
                  <strong>
                    {coberturaPercent.toFixed(0)}%
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* AVALISTA */}
          <div className="sn-section">
            <label
              className="sn-switch"
              style={{ marginBottom: 10 }}
            >
              <input
                type="checkbox"
                checked={temAvalista}
                onChange={(e) =>
                  setTemAvalista(e.target.checked)
                }
              />
              <span className="track">
                <span className="thumb" />
              </span>
              <span>
                Adicionar novo avalista (além dos contratos
                originais)
              </span>
            </label>

            {temAvalista && (
              <div style={{ marginLeft: 6 }}>
                <div className="sn-label">
                  Nome ou CPF do avalista (opcional)
                </div>
                <input
                  type="text"
                  value={dadosAvalista}
                  onChange={(e) =>
                    setDadosAvalista(e.target.value)
                  }
                  className="sn-input"
                  placeholder="Digite o nome completo ou CPF"
                />
                <div style={{ marginTop: 10 }}>
                  <label className="sn-switch">
                    <input
                      type="checkbox"
                      checked={avalEhSocio}
                      onChange={(e) =>
                        setAvalEhSocio(e.target.checked)
                      }
                    />
                    <span className="track">
                      <span className="thumb" />
                    </span>
                    <span>
                      Avalista é sócio? (não gera desconto)
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA — RESULTADO */}
        <div className="sn-card">
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            {campanhaAplicadaSistema && (
              <span className="sn-badge green">
                Campanha aplicada pelas regras
              </span>
            )}

            {taxaPolitica === null &&
              elegivel &&
              entradaPercentual >= 10 && (
                <span className="sn-badge amber">
                  Elegível, mas sem enquadramento de faixa
                </span>
              )}

            {/* Badge clicável para forçar campanha quando não é elegível */}
            {!elegivel && (
              <button
                type="button"
                className="sn-badge red"
                style={{
                  cursor: podeForcarCampanha ? "pointer" : "not-allowed",
                  opacity: podeForcarCampanha ? 1 : 0.6,
                  background: "rgba(239,68,68,.15)",
                }}
                onClick={podeForcarCampanha ? handleToggleCampanha : undefined}
                title={
                  podeForcarCampanha
                    ? campanhaForcadaAtiva
                      ? "Clique para desativar a campanha forçada"
                      : "Clique para forçar a campanha mesmo com contratos não elegíveis"
                    : "Campanha não elegível pelas regras da política"
                }
              >
                {campanhaForcadaAtiva
                  ? "Campanha forçada (há contratos < 90 dias)"
                  : "Não elegível à campanha"}
              </button>
            )}

            {bloqueioPorTaxaMinima && (
              <span className="sn-badge red">
                Taxa origem &lt; 1,50% a.m. — prevalece origem
              </span>
            )}
          </div>

          <div className="sn-row-3">
            <div>
              <div className="sn-label">
                Entrada (estimativa)
              </div>
              <div className="sn-value">
                {fmtBRL(entradaValor)}
              </div>
              <div className="sn-small">
                Baseada no saldo exibido
              </div>
            </div>
            <div>
              <div className="sn-label">
                Saldo a financiar
              </div>
              <div className="sn-value">
                {fmtBRL(saldoFinanciar)}
              </div>
            </div>
            <div>
              <div className="sn-label">
                Parcela estimada
              </div>
              <div className="sn-value">
                {fmtBRL(parcelaEstimativa)}
              </div>
              <div className="sn-small">
                Simulação (Sujeito a alteração)
              </div>
            </div>
          </div>

          <div className="sn-section">
            <div className="sn-row">
              <div>
                <div className="sn-label">Taxa Original</div>
                <div className="sn-value">
                  {Number.isFinite(taxaOriginal)
                    ? `${taxaOriginal.toFixed(2)}% a.m.`
                    : "—"}
                </div>
              </div>
              <div>
                <div className="sn-label">Taxa Política</div>
                <div className="sn-value">
                  {taxaPolitica !== null &&
                  Number.isFinite(taxaPolitica)
                    ? `${taxaPolitica.toFixed(2)}% a.m.`
                    : "—"}
                </div>
              </div>
            </div>

            <div className="sn-divider" />

            <div className="sn-row" style={{ marginBottom: 12 }}>
              <div>
                <div className="sn-label">
                  Taxa Seguro Obrigatória
                </div>
                <div className="sn-value">
                  {taxaSeguroMensal > 0
                    ? `${taxaSeguroMensal.toFixed(3)}% a.m.`
                    : "—"}
                </div>
                <div className="sn-small">
                  0,060% a.m. até 64 anos; 0,120% a.m. a partir de
                  65.
                </div>
              </div>
              <div>
                <div className="sn-label">
                  Taxa Total c/ Seguro
                </div>
                <div className="sn-value">
                  {taxaComSeguro > 0
                    ? `${taxaComSeguro.toFixed(3)}% a.m.`
                    : "—"}
                </div>
                <div className="sn-small">
                  Usada na estimativa da parcela.
                </div>
              </div>
            </div>

            <div>
              <div className="sn-label">Taxa Final Aplicada</div>
              <div
                className={`sn-final ${
                  melhorou ? "good" : ""
                }`}
              >
                {Number.isFinite(taxaFinal)
                  ? `${taxaFinal.toFixed(2)}% a.m.`
                  : "—"}
              </div>
              {melhorou ? (
                <div className="sn-small sn-ok">
                  Melhora sobre a taxa original aplicada ✔
                </div>
              ) : (
                <div className="sn-small">
                  Sem melhora sobre a taxa original.
                </div>
              )}
            </div>
          </div>

          {alertas && alertas.length > 0 && (
            <div className="sn-section">
              <div className="sn-label">Atenções</div>
              <div className="sn-alert">
                <ul
                  style={{ margin: 0, paddingLeft: 18 }}
                >
                  {alertas.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="sn-section">
            <button
              type="button"
              className="sn-button"
              onClick={gerarPDF}
            >
              Recalcular (Gerar PDF)
            </button>

            {campanhaAtiva && possuiContratosMenos90 && (
              <div className="sn-alert" style={{ marginTop: 8 }}>
                Existem contratos com menos de 90 dias de atraso que
                <strong> não são elegíveis à campanha</strong>. Revise a
                seleção ou registre a justificativa conforme a política interna.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* >>> ALTERAÇÃO: ALERTA DE IOF/DIVERGÊNCIA ANTES DOS VALORES ADICIONAIS */}
      <div className="sn-card" style={{ marginTop: 16 }}>
        <div className="sn-alert" style={{ marginBottom: 12 }}>
          O cálculo gerado pelo sistema <strong>não incide IOF</strong> e o valor para
          financiamento <strong>pode haver divergência</strong> de valores.
        </div>

        {/* VALORES ADICIONAIS - TROCO / ACRÉSCIMOS */}
        <div className="sn-label" style={{ marginBottom: 8 }}>
          Valores Adicionais
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 48, // afasta bem os campos
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ minWidth: 220 }}>
            <div className="sn-label">Troco (R$)</div>
            <input
              type="text"
              className="sn-input"
              inputMode="decimal"
              value={troco}
              onChange={(e) => setTroco(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div style={{ minWidth: 220 }}>
            <div className="sn-label">Acréscimos (R$)</div>
            <input
              type="text"
              className="sn-input"
              inputMode="decimal"
              value={acrescimos}
              onChange={(e) => setAcrescimos(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div style={{ minWidth: 260 }}>
            <div className="sn-label">Total de adicionais</div>
            <div className="sn-value">
              {fmtBRL(totalAdicionais)}
            </div>
            <div className="sn-small">
              Somado ao saldo a financiar e à parcela estimada.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
