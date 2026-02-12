
// src/services/clientLogger.js
const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

function getCorrelationId() {
  let cid = sessionStorage.getItem("correlationId");
  if (!cid) {
    cid =
      (crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    sessionStorage.setItem("correlationId", cid);
  }
  return cid;
}

async function send(payload) {
  const url = `${baseURL}/logs/client`;

  try {
    // Melhor para auditoria (não bloqueia navegação)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // nunca quebra a tela por causa de log
  }
}

export function audit(action, extra = {}) {
  const payload = {
    level: "info",
    message: action,
    correlationId: getCorrelationId(),
    url: window.location.href,
    route: window.location.pathname,
    userAgent: navigator.userAgent,
    cpfCnpj: sessionStorage.getItem("cpfAtual") || "",
    extra,
    timestampUtc: new Date().toISOString(),
  };
  send(payload);
}

export function initClientLogCapture() {
  window.addEventListener("error", (e) => {
    send({
      level: "error",
      message: e.message || "window.error",
      stack: e.error?.stack,
      correlationId: getCorrelationId(),
      url: window.location.href,
      route: window.location.pathname,
      userAgent: navigator.userAgent,
      cpfCnpj: sessionStorage.getItem("cpfAtual") || "",
      extra: { filename: e.filename, lineno: e.lineno, colno: e.colno },
      timestampUtc: new Date().toISOString(),
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    send({
      level: "error",
      message: "unhandledrejection",
      stack: r?.stack,
      correlationId: getCorrelationId(),
      url: window.location.href,
      route: window.location.pathname,
      userAgent: navigator.userAgent,
      cpfCnpj: sessionStorage.getItem("cpfAtual") || "",
      extra: { reason: r?.message || String(r) },
      timestampUtc: new Date().toISOString(),
    });
  });
}
