import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";

export default function TrocarSenha() {
  const navigate = useNavigate();
  const { user, logout, markActivity } = useAuth();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // Nome do usuário vindo do seu AuthContext:
  // você salva u = { user: data.user, roles: [...] }
  const nomeUsuario =
    typeof user === "string"
      ? user
      : user?.nome ||
        user?.usuario ||
        user?.user || // <- no seu contexto é aqui
        user?.login ||
        "Usuário";

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setSucesso("");

    if (!senhaAtual || !novaSenha || !confirmacaoSenha) {
      setErro("Preencha todos os campos.");
      return;
    }

    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmacaoSenha) {
      setErro("A nova senha e a confirmação não conferem.");
      return;
    }

    try {
      setCarregando(true);

      // Opcional: marcar atividade manualmente (se quiser)
      // Não é obrigatório porque seu AuthContext já monitora eventos globais,
      // mas não faz mal.
      if (markActivity) markActivity();

      // ✅ Como você usa axios (api), o Authorization já vai junto
      // porque o AuthContext colocou: api.defaults.headers.common.Authorization = `Bearer ${token}`;
      const { data } = await api.post("/Conta/alterar-senha", {
        senhaAtual,
        novaSenha,
      });

      setSucesso(data?.mensagem || "Senha alterada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacaoSenha("");
    } catch (err) {
      console.error(err);

      // Tratamento de erro padrão do axios
      const status = err?.response?.status;
      const mensagemApi = err?.response?.data?.mensagem;

      if (status === 401) {
        // token inválido/expirado
        setErro(mensagemApi || "Sua sessão expirou. Faça login novamente.");
        // opcional: deslogar e mandar pro login
        // logout();
        // navigate("/login");
        return;
      }

      setErro(mensagemApi || "Erro inesperado ao alterar a senha. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(1200px 600px at 20% -5%, #0e1a33, transparent 50%), #0a0f1b",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "linear-gradient(180deg, #0c1323 0%, #0a101c 100%)",
          border: "1px solid #1e293b",
          borderRadius: 12,
          boxShadow: "0 10px 25px rgba(0,0,0,.35)",
          padding: 24,
          width: "100%",
          maxWidth: 420,
          color: "#e2e8f0",
          fontFamily:
            "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        }}
      >
        <h2
          style={{
            margin: 0,
            marginBottom: 4,
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          Trocar senha
        </h2>

        <p
          style={{
            margin: 0,
            marginBottom: 16,
            fontSize: 13,
            color: "#94a3b8",
          }}
        >
          Altere a sua senha de acesso ao sistema.
        </p>

        <div
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 8,
            background: "#020617",
            border: "1px solid #1e293b",
            fontSize: 13,
          }}
        >
          <div style={{ color: "#94a3b8", marginBottom: 4 }}>Usuário</div>
          <div style={{ fontWeight: 600 }}>{nomeUsuario}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontSize: 13,
                color: "#94a3b8",
              }}
            >
              Senha atual
            </label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #1e293b",
                background: "#020617",
                color: "#e2e8f0",
                outline: "none",
              }}
              autoComplete="current-password"
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontSize: 13,
                color: "#94a3b8",
              }}
            >
              Nova senha
            </label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #1e293b",
                background: "#020617",
                color: "#e2e8f0",
                outline: "none",
              }}
              autoComplete="new-password"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontSize: 13,
                color: "#94a3b8",
              }}
            >
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={confirmacaoSenha}
              onChange={(e) => setConfirmacaoSenha(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #1e293b",
                background: "#020617",
                color: "#e2e8f0",
                outline: "none",
              }}
              autoComplete="new-password"
            />
          </div>

          {erro && (
            <div
              style={{
                marginBottom: 12,
                padding: 8,
                borderRadius: 8,
                background: "#451a1a",
                border: "1px solid #b91c1c",
                color: "#fecaca",
                fontSize: 13,
              }}
            >
              {erro}
            </div>
          )}

          {sucesso && (
            <div
              style={{
                marginBottom: 12,
                padding: 8,
                borderRadius: 8,
                background: "#022c22",
                border: "1px solid #16a34a",
                color: "#bbf7d0",
                fontSize: 13,
              }}
            >
              {sucesso}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 8,
            }}
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                borderRadius: 10,
                border: "1px solid #1e293b",
                background: "#020617",
                color: "#e2e8f0",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              Voltar
            </button>

            <button
              type="submit"
              disabled={carregando}
              style={{
                borderRadius: 10,
                border: "1px solid #1d4ed8",
                background: carregando ? "#1e40af" : "#2563eb",
                color: "#e2e8f0",
                padding: "8px 16px",
                cursor: carregando ? "default" : "pointer",
                fontWeight: 600,
              }}
            >
              {carregando ? "Salvando..." : "Salvar nova senha"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
