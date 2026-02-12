// AuthContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

const IDLE_LIMIT_MS = 4 * 60 * 60 * 1000; // 4 horas
const LAST_ACTIVITY_KEY = "lastActivityAt"; // usado para sincronizar abas
const LOGOUT_EVENT_KEY = "logoutEvent";     // usado para notificar logout entre abas

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // ✅ NOVO: refs para timer e estado
  const idleTimerRef = useRef(null);

  function clearIdleTimer() {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }

  function scheduleIdleLogout() {
    clearIdleTimer();

    idleTimerRef.current = setTimeout(() => {
      // Quando estourar: desloga
      logout(true); // true = broadcast para outras abas
    }, IDLE_LIMIT_MS);
  }

  // ✅ NOVO: marca atividade (reseta timer + salva timestamp)
  function markActivity() {
    // se não estiver logado, não precisa controlar
    const token = localStorage.getItem("token");
    if (!token) return;

    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    scheduleIdleLogout();
  }

  // ✅ Sessão simples: recupera do localStorage (não chama backend)
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      if (token && userStr) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        setUser(JSON.parse(userStr));
      } else {
        setUser(null);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  // ✅ NOVO: ao ficar autenticado, inicia monitor de inatividade
  useEffect(() => {
    if (!user) {
      // se deslogou, para timer
      clearIdleTimer();
      return;
    }

    // 1) Checa se já passou do limite desde a última atividade salva
    const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || "0");
    const now = Date.now();

    if (last > 0 && now - last >= IDLE_LIMIT_MS) {
      logout(true);
      return;
    }

    // 2) Agenda logout e registra listeners de atividade
    scheduleIdleLogout();

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    const handler = () => markActivity();

    events.forEach((evt) => window.addEventListener(evt, handler, { passive: true }));

    // 3) Sincroniza entre abas (se uma aba marcar atividade, as outras resetam timer)
    const onStorage = (e) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        // outra aba teve atividade -> reseta timer nessa aba
        scheduleIdleLogout();
      }
      if (e.key === LOGOUT_EVENT_KEY && e.newValue) {
        // outra aba mandou logout -> desloga aqui também
        logout(false); // false pra não ficar em loop broadcast
      }
    };

    window.addEventListener("storage", onStorage);

    // marca atividade ao entrar (opcional)
    markActivity();

    return () => {
      clearIdleTimer();
      events.forEach((evt) => window.removeEventListener(evt, handler));
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ✅ Login simples
  async function login({ usuario, senha }) {
    const { data } = await api.post("/Auth/login", {
      username: usuario,
      password: senha,
    });

    if (!data?.token) throw new Error("Token ausente na resposta de login");

    localStorage.setItem("token", data.token);

    const u = { user: data.user, roles: data.roles ?? [] };
    localStorage.setItem("user", JSON.stringify(u));

    // ✅ NOVO: inicia lastActivity ao logar
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));

    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    setUser(u);

    return u;
  }

  // ✅ NOVO: logout com broadcast (multi-aba)
  function logout(broadcast = true) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(LAST_ACTIVITY_KEY);

    if (broadcast) {
      localStorage.setItem(LOGOUT_EVENT_KEY, String(Date.now()));
    }

    delete api.defaults.headers.common.Authorization;
    clearIdleTimer();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        checking,
        login,
        logout,
        // ✅ NOVO: expor para você marcar atividade manualmente (opcional)
        markActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
