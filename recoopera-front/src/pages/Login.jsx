// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/renegociacao";

  // 🔥 Ajuste GLOBAL do fundo e remoção de bordas brancas
  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.background = "#0a0f1b";

    return () => {
      document.body.style.background =
        "radial-gradient(1200px 600px at 20% -5%, #0e1a33, transparent 50%), #0a0f1b";
    };
  }, []);

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      await login({ usuario, senha });
      navigate(from, { replace: true });
    } catch {
      setErro("Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0f1b",
        padding: "20px",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "340px",
          padding: "24px 20px",
          background: "#111827",
          borderRadius: 12,
          border: "1px solid #1f2937",
          color: "#e5e7eb",
          boxShadow: "0 4px 25px rgba(0,0,0,0.4)",
        }}
      >
        {/* LOGO */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img
            src="/logo_recoopera.png"
            alt="Recoopera"
            style={{ width: "130px", height: "auto" }}
          />
        </div>
{/* USUÁRIO */}
<label style={{ fontSize: 18, fontWeight: 600 }}>Usuário</label>
<input
  value={usuario}
  onChange={(e) => setUsuario(e.target.value)}
  style={{
    width: "100%",
    padding: 12,            // ⬅ igual ao botão!
    margin: "6px 0 14px",
    borderRadius: 6,
    background: "#1f2937",
    border: "1px solid #374151",
    color: "#fff",
    fontSize: 15,
    boxSizing: "border-box", // ⬅ garante alinhamento
  }}
  placeholder="Digite seu usuário"
/>

{/* SENHA */}
<label style={{ fontSize: 18, fontWeight: 600 }}>Senha</label>
<input
  type="password"
  value={senha}
  onChange={(e) => setSenha(e.target.value)}
  style={{
    width: "100%",
    padding: 12,            // ⬅ igual ao botão!
    margin: "6px 0 14px",
    borderRadius: 6,
    background: "#1f2937",
    border: "1px solid #374151",
    color: "#fff",
    fontSize: 15,
    boxSizing: "border-box", // ⬅ garante alinhamento
  }}
  placeholder="Digite sua senha"
/>
        {/* ERRO */}
        {erro && (
          <div
            style={{
              background: "#7f1d1d",
              padding: 12,
              borderRadius: 6,
              color: "#fecaca",
              marginBottom: 12,
              fontSize: 14,
              textAlign: "center",
            }}
          >
            {erro}
          </div>
        )}

        {/* BOTÃO */}
        <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: 12,        // mesmo padding
          borderRadius: 6,
          background: "#059669",
          border: "none",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: 16,
          boxSizing: "border-box",
        }}
      >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {/* LOGO Credipinho */}
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <img
            src="/logo.png"
            alt="Sicoob Credipinho"
            style={{ width: "110px", height: "auto" }}
          />
        </div>

        {/* VERSÃO */}
        <div
          style={{
            textAlign: "center",
            marginTop: 16,
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          v1.1.0
        </div>
      </form>
    </div>
  );
}