
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { audit } from "../services/clientLogger";

export default function AuditTracker() {
  const location = useLocation();
  const lastRef = useRef({ path: "", key: "" });

  useEffect(() => {
    const path = location.pathname;

    // evita duplicar em dev/StrictMode + navegações iguais
    if (lastRef.current.path === path && lastRef.current.key === location.key) return;
    lastRef.current = { path, key: location.key };

    // Log de navegação
    audit("PAGE_VIEW", { path });

    // ✅ Se entrou na simulação, captura contratos selecionados sem tocar na página
    if (path === "/simulacao-negociacao") {
      const usr = window.history.state?.usr; // state do react-router
      const cpf = usr?.cpf || "";
      const nomeCliente = usr?.nomeCliente || "";
      const contratos = Array.isArray(usr?.contratos) ? usr.contratos : [];

      if (cpf) sessionStorage.setItem("cpfAtual", cpf);

      audit("SIMULACAO_ABERTA", {
        cpf,
        nomeCliente,
        qtdContratos: contratos.length,
        contratos: contratos.map((c) => ({
          numeroContrato: c?.numeroContrato ?? null,
          idContrato: c?.idContrato ?? null,
          totalDevido: c?.totalDevido ?? null,
          saldoBase: c?.saldoBase ?? null,
          diasAtraso: c?.diasAtraso ?? null,
          taxa: c?.taxa ?? null,
        })),
      });
    }
  }, [location.pathname, location.key]);

  return null;
}
