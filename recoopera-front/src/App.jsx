import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import RequireAuth from "./components/RequireAuth";
import RedirectIfAuthenticated from "./components/RedirectIfAuthenticated";

import AuditTracker from "./components/AuditTracker";

import Login from "./pages/Login";
import Renegociacao from "./pages/Renegociacao";
import Admin from "./pages/Admin";
import SimulacaoNegociacao from "./pages/SimulacaoNegociacao";
import TrocarSenha from "./pages/TrocarSenha"; // ✅ IMPORTA A PÁGINA

import { api } from "./services/api";
import { setMatrizTaxasCampanha } from "./utils/taxasCampanha";

export default function App() {
  // Evita dupla execução no modo dev
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const { data } = await api.get("/config/taxas-campanha");
        setMatrizTaxasCampanha(data);
        console.log("[Taxas] Matriz carregada do backend");
      } catch (err) {
        console.warn("[Taxas] Falha ao carregar do backend. Usando fallback.", err);
      }
    })();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        {/* auditoria global */}
        <AuditTracker />

        <Routes>
          {/* ✅ Ao entrar só no IP "/" -> /login */}
          <Route index element={<Navigate to="/login" replace />} />

          {/* LOGIN — protegido contra usuário já autenticado */}
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <Login />
              </RedirectIfAuthenticated>
            }
          />

          {/* ROTAS PROTEGIDAS */}
          <Route element={<RequireAuth />}>
            <Route path="/renegociacao" element={<Renegociacao />} />
            <Route path="/simulacao-negociacao" element={<SimulacaoNegociacao />} />
            <Route path="/admin" element={<Admin />} />

            {/* ✅ AQUI entra o TrocarSenha */}
            <Route path="/trocar-senha" element={<TrocarSenha />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}