// src/services/api.js
import axios from "axios";
import { audit } from "./clientLogger";

// ===============================
// Base URL
// ===============================
const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

export const api = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 20000,
});

// ===============================
// CorrelationId
// ===============================
const CORR_KEY = "correlationId";

function ensureCorrelationId() {
  let cid = sessionStorage.getItem(CORR_KEY);
  if (!cid) {
    cid =
      crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(CORR_KEY, cid);
  }
  return cid;
}

// ===============================
// Aplica token salvo ao iniciar (1x)
// ===============================
(function applyAuthTokenAtStartup() {
  const token = localStorage.getItem("token");
  if (token && !api.defaults.headers.common.Authorization) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
})();

// ===============================
// Request interceptor
// ===============================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers["X-Correlation-Id"] = ensureCorrelationId();

    // Auditoria automática CPF
    try {
      const url = String(config.url || "");
      if (url.includes("/renegociacoes/")) {
        const parte = url.split("/renegociacoes/")[1] || "";
        const cpf = parte.split("?")[0].trim();

        if (cpf) {
          sessionStorage.setItem("cpfAtual", cpf);
          audit("CPF_PESQUISADO", { cpf });
        }
      }
    } catch {
      // não quebra
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ===============================
// Response interceptor
// ===============================
let isRedirectingToLogin = false;

api.interceptors.response.use(
  (res) => {
    try {
      const cid = res?.headers?.["x-correlation-id"];
      if (cid) sessionStorage.setItem(CORR_KEY, cid);
    } catch {}
    return res;
  },
  (err) => {
    if (err?.response?.status === 401 && !isRedirectingToLogin) {
      isRedirectingToLogin = true;

      console.warn("[AUTH] Token inválido ou expirado. Redirecionando...");

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      delete api.defaults.headers.common.Authorization;

      // 🔴 fora do React Router propositalmente
      window.location.replace("/login");
    }

    return Promise.reject(err);
  }
);

// ===============================
// Helper opcional
// ===============================
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem("token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem("token");
    delete api.defaults.headers.common.Authorization;
  }
}
