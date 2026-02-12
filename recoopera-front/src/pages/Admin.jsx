
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { setMatrizTaxasCampanha, getMatrizTaxasCampanha } from "../utils/taxasCampanha";

const KEYS = [
  // FAIXA 30
  "FAIXA_30|CURTO|SEM_REFORCO",
  "FAIXA_30|CURTO|AVAL",
  "FAIXA_30|CURTO|REAL",
  "FAIXA_30|LONGO|SEM_REFORCO",
  "FAIXA_30|LONGO|AVAL",
  "FAIXA_30|LONGO|REAL",

  // FAIXA 20
  "FAIXA_20|CURTO|SEM_REFORCO",
  "FAIXA_20|CURTO|AVAL",
  "FAIXA_20|CURTO|REAL",
  "FAIXA_20|LONGO|SEM_REFORCO",
  "FAIXA_20|LONGO|AVAL",
  "FAIXA_20|LONGO|REAL",

  // FAIXA 10
  "FAIXA_10|CURTO|SEM_REFORCO",
  "FAIXA_10|CURTO|AVAL",
  "FAIXA_10|CURTO|REAL",
  "FAIXA_10|LONGO|SEM_REFORCO",
  "FAIXA_10|LONGO|AVAL",
  "FAIXA_10|LONGO|REAL",
];

function labelKey(k) {
  const [faixa, prazo, reforco] = k.split("|");
  const faixaLabel = faixa === "FAIXA_30" ? "≥ 30%" : faixa === "FAIXA_20" ? "20–29,99%" : "10–19,99%";
  const prazoLabel = prazo === "CURTO" ? "≤ 24m" : "> 24m";
  const reforcoLabel = reforco === "SEM_REFORCO" ? "Sem Reforço" : reforco === "AVAL" ? "Aval" : "Real";
  return `${faixaLabel} • ${prazoLabel} • ${reforcoLabel}`;
}

export default function Admin() {
  const navigate = useNavigate();

  // ---------------- USERS ----------------
  const [users, setUsers] = useState([]);
  const [uUsername, setUUsername] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRoles, setURoles] = useState("Operador");
  const [loadingUsers, setLoadingUsers] = useState(false);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data || []);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function createUser(e) {
    e.preventDefault();

    const roles = uRoles
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    await api.post("/admin/users", {
      username: uUsername,
      password: uPassword,
      roles: roles.length ? roles : ["Operador"],
    });

    setUUsername("");
    setUPassword("");
    setURoles("Operador");
    await loadUsers();
    alert("Usuário criado!");
  }

  async function deleteUser(id) {
    if (!confirm("Remover usuário?")) return;
    await api.delete(`/admin/users/${id}`);
    await loadUsers();
  }

  // ---------------- TAXAS ----------------
  const [taxas, setTaxas] = useState(() => getMatrizTaxasCampanha());
  const [loadingTaxas, setLoadingTaxas] = useState(false);

  async function loadTaxas() {
    setLoadingTaxas(true);
    try {
      const { data } = await api.get("/config/taxas-campanha");
      setTaxas(data);
      setMatrizTaxasCampanha(data);
    } finally {
      setLoadingTaxas(false);
    }
  }

  async function saveTaxas() {
    await api.put("/admin/taxas-campanha", taxas);
    setMatrizTaxasCampanha(taxas);
    alert("Taxas salvas!");
  }

  function setTaxaValue(key, value) {
    const n = Number(value);
    setTaxas((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : prev[key] }));
  }

  useEffect(() => {
    loadUsers();
    loadTaxas();
  }, []);

  const taxaRows = useMemo(
    () =>
      KEYS.map((k) => ({
        key: k,
        label: labelKey(k),
        value: taxas?.[k] ?? "",
      })),
    [taxas]
  );

  // ===============================
  // ESTILOS (mesmo tema da Renegociação)
  // ===============================
  useEffect(() => {
    const id = "recoopera-theme-styles";
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
      body { background: radial-gradient(1200px 600px at 20% -5%, #0e1a33, transparent 50%), #0a0f1b; }

      .rn-container {
        max-width: 1160px;
        margin: 24px auto;
        padding: 16px;
        color: var(--text);
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }
      .rn-header {
        display: flex; align-items: center; justify-content: space-between; gap: 16px;
        margin-bottom: 12px;
      }
      .rn-title { font-size: 22px; font-weight: 800; letter-spacing: .3px; }
      .rn-title-wrapper { display: flex; align-items: center; gap: 10px; }
      .rn-logo { height: 32px; width: auto; }

      .rn-chip {
        display: inline-flex; align-items: center; gap: 8px;
        background: var(--chip); border: 1px solid var(--divider);
        padding: 6px 10px; border-radius: 999px; color: var(--text); font-size: 12px;
      }

      .rn-grid {
        display: grid; gap: 16px;
        grid-template-columns: 1fr 1fr;
      }
      @media (max-width: 980px) {
        .rn-grid { grid-template-columns: 1fr; }
      }

      .rn-card {
        background: linear-gradient(180deg, #0c1323 0%, #0a101c 100%);
        border: 1px solid var(--divider);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: 18px 18px 14px;
      }

      .rn-section + .rn-section {
        border-top: 1px dashed var(--divider);
        margin-top: 16px; padding-top: 16px;
      }

      .rn-label { color: var(--muted); font-size: 12px; margin-bottom: 6px; letter-spacing: .3px; }

      .rn-input {
        background: #0a1426; border: 1px solid var(--divider); border-radius: 10px;
        color: var(--text); padding: 10px 12px; outline: none; width: 100%;
      }

      .rn-button {
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        border: 1px solid var(--divider); padding: 10px 14px; border-radius: 10px;
        background: #0c1529; color: var(--text); cursor: pointer;
      }
      .rn-button.primary   { background: linear-gradient(180deg, #1d4ed8, #1e40af); border-color: #1e3a8a; }
      .rn-button.warn      { background: #2a1f0b; border-color: #3a2a10; color: #facc15; }
      .rn-button:disabled  { opacity: .6; cursor: not-allowed; }

      .rn-table-wrap {
        max-height: 320px; overflow: auto; border: 1px solid var(--divider); border-radius: 10px;
      }
      table.rn-table {
        width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px;
      }
      .rn-table thead th {
        position: sticky; top: 0; z-index: 1;
        background: #0f1627; color: #cbd5e1; text-align: left;
        border-bottom: 1px solid var(--divider); padding: 10px 8px;
      }
      .rn-table tbody td {
        border-bottom: 1px dashed #1f2a3f; padding: 8px;
      }
      .rn-table tbody tr:nth-child(odd) { background: rgba(255,255,255,.02); }

      .rn-right { text-align: right; }
      .rn-divider { height: 1px; background: var(--divider); margin: 12px 0; }

      .rn-badge {
        background: rgba(37,99,235,.15); color: #93c5fd; border: 1px solid rgba(37,99,235,.35);
        border-radius: 8px; padding: 4px 8px; font-size: 12px;
      }

      .rn-alert {
        background: #1b1f2e; border: 1px solid #2b3448; border-left: 4px solid var(--warning);
        padding: 10px 12px; border-radius: 8px; color: #f1cfa0;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div className="rn-container">
      <div className="rn-header">
        <div className="rn-title-wrapper">
            <div className="rn-title-wrapper">
        <img
          src="/recoopera-completo.png"
          alt="Recoopera"
          className="rn-logo"
        />
      </div>
          <div>
            <div className="rn-title">Administrador</div>
            <div className="rn-label">Usuários & Taxas</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="rn-chip">
            <span>Usuários</span>
            <strong>{users.length}</strong>
          </span>

          <button className="rn-button" onClick={() => navigate("/renegociacao")}>
            Voltar
          </button>
        </div>
      </div>

      <div className="rn-grid">
        {/* CARD USUÁRIOS */}
        <div className="rn-card">
          <div className="rn-label">Cadastro de Usuários</div>

          <form onSubmit={createUser}>
            <div className="rn-section">
              <div className="rn-label">Username</div>
              <input
                className="rn-input"
                placeholder="Username"
                value={uUsername}
                onChange={(e) => setUUsername(e.target.value)}
              />
            </div>

            <div className="rn-section">
              <div className="rn-label">Password</div>
              <input
                className="rn-input"
                placeholder="Password"
                type="password"
                value={uPassword}
                onChange={(e) => setUPassword(e.target.value)}
              />
            </div>

            <div className="rn-section">
              <div className="rn-label">Roles (ex: Admin,Operador)</div>
              <input
                className="rn-input"
                placeholder="Admin,Operador"
                value={uRoles}
                onChange={(e) => setURoles(e.target.value)}
              />
            </div>

            <div className="rn-section" style={{ display: "flex", gap: 10 }}>
              <button className="rn-button primary" type="submit" disabled={!uUsername || !uPassword}>
                Criar usuário
              </button>

              <button className="rn-button" type="button" onClick={loadUsers} disabled={loadingUsers}>
                {loadingUsers ? "Carregando..." : "Recarregar"}
              </button>
            </div>
          </form>

          <div className="rn-divider" />

          <div className="rn-label">Lista de usuários</div>
          <div className="rn-table-wrap">
            <table className="rn-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Roles</th>
                  <th className="rn-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.username}</b></td>
                    <td style={{ color: "#94a3b8" }}>{(u.roles || []).join(", ")}</td>
                    <td className="rn-right">
                      <button className="rn-button warn" onClick={() => deleteUser(u.id)}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ color: "#94a3b8" }}>
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CARD TAXAS */}
        <div className="rn-card">
          <div className="rn-label">Taxas da Campanha</div>

          <div className="rn-section" style={{ display: "flex", gap: 10 }}>
            <button className="rn-button" onClick={loadTaxas} disabled={loadingTaxas}>
              {loadingTaxas ? "Carregando..." : "Recarregar"}
            </button>
            <button className="rn-button primary" onClick={saveTaxas}>
              Salvar taxas
            </button>
          </div>

          <div className="rn-section">
            <div className="rn-alert" style={{ borderLeftColor: "#2563eb", color: "#c7dbff" }}>
              Dica: altere os valores e clique em <b>Salvar taxas</b>. O front passa a usar a matriz nova automaticamente.
            </div>
          </div>

          <div className="rn-section" style={{ display: "grid", gap: 10 }}>
            {taxaRows.map((row) => (
              <label key={row.key} style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 10, alignItems: "center" }}>
                <span style={{ color: "#e2e8f0" }}>{row.label}</span>
                <input
                  className="rn-input"
                  value={row.value}
                  onChange={(e) => setTaxaValue(row.key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
