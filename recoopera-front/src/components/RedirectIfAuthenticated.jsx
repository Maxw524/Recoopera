import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function RedirectIfAuthenticated({ children }) {
  const { user } = useAuth();

  // Se já estiver logado = redireciona para /renegociacao
  if (user) {
    return <Navigate to="/renegociacao" replace />;
  }

  return children;
}
