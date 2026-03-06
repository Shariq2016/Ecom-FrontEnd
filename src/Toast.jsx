// Toast.jsx  — drop-in replacement for alert() and window.confirm()
// Usage:
//   import { useToast, ToastContainer, useConfirm } from "./Toast";
//   const toast = useToast();
//   toast.success("Product added!");
//   toast.error("Something went wrong");
//   toast.info("Loading...");
//   const confirmed = await confirm("Are you sure?");

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext  = createContext(null);
const ConfirmContext = createContext(null);

// ─── Provider (wrap around your app or just AppProvider) ─────────────────────
export const ToastProvider = ({ children }) => {
  const [toasts,  setToasts]  = useState([]);
  const [confirm, setConfirm] = useState(null); // { message, resolve }

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, "success"),
    error:   (msg) => addToast(msg, "error",   4500),
    info:    (msg) => addToast(msg, "info"),
    warning: (msg) => addToast(msg, "warning", 4000),
  };

  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirm({ message, resolve });
    });
  }, []);

  const handleConfirm = (result) => {
    if (confirm) confirm.resolve(result);
    setConfirm(null);
  };

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={showConfirm}>
        {children}

        {/* ── Toast stack ── */}
        <div style={styles.stack}>
          {toasts.map((t) => (
            <div key={t.id} style={{ ...styles.toast, ...styles[t.type] }}>
              <span style={styles.icon}>{icons[t.type]}</span>
              <span style={styles.msg}>{t.message}</span>
              <button style={styles.close} onClick={() =>
                setToasts((prev) => prev.filter((x) => x.id !== t.id))}>✕</button>
            </div>
          ))}
        </div>

        {/* ── Confirm dialog ── */}
        {confirm && (
          <div style={styles.overlay}>
            <div style={styles.dialog}>
              <p style={styles.dialogMsg}>{confirm.message}</p>
              <div style={styles.dialogBtns}>
                <button style={styles.cancelBtn}  onClick={() => handleConfirm(false)}>Cancel</button>
                <button style={styles.confirmBtn} onClick={() => handleConfirm(true)}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export const useToast   = () => useContext(ToastContext);
export const useConfirm = () => useContext(ConfirmContext);

// ─── Icons ────────────────────────────────────────────────────────────────────
const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  stack: {
    position: "fixed", bottom: "1.5rem", right: "1.5rem",
    display: "flex", flexDirection: "column", gap: "0.6rem",
    zIndex: 9999, maxWidth: "360px",
  },
  toast: {
    display: "flex", alignItems: "center", gap: "0.6rem",
    padding: "0.85rem 1rem", borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    animation: "slideIn 0.25s ease",
    backdropFilter: "blur(8px)",
    fontSize: "0.92rem", fontWeight: 500,
    border: "1px solid rgba(255,255,255,0.15)",
  },
  success: { background: "rgba(16,185,129,0.92)", color: "#fff" },
  error:   { background: "rgba(239,68,68,0.92)",  color: "#fff" },
  info:    { background: "rgba(59,130,246,0.92)", color: "#fff" },
  warning: { background: "rgba(245,158,11,0.92)", color: "#fff" },
  icon:  { fontSize: "1rem" },
  msg:   { flex: 1 },
  close: {
    background: "none", border: "none", color: "inherit",
    cursor: "pointer", fontSize: "0.85rem", opacity: 0.8,
    padding: "0 2px",
  },
  // Confirm dialog
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 10000, backdropFilter: "blur(4px)",
  },
  dialog: {
    background: "#1e1e2e", borderRadius: "16px",
    padding: "2rem", maxWidth: "400px", width: "90%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  dialogMsg: {
    color: "#e2e8f0", fontSize: "1rem", marginBottom: "1.5rem",
    lineHeight: 1.6, whiteSpace: "pre-wrap",
  },
  dialogBtns: { display: "flex", gap: "0.75rem", justifyContent: "flex-end" },
  cancelBtn: {
    padding: "0.6rem 1.4rem", borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent", color: "#94a3b8",
    cursor: "pointer", fontSize: "0.9rem",
  },
  confirmBtn: {
    padding: "0.6rem 1.4rem", borderRadius: "8px",
    border: "none", background: "#ef4444",
    color: "#fff", cursor: "pointer",
    fontSize: "0.9rem", fontWeight: 600,
  },
};

// ─── CSS animation (inject once) ─────────────────────────────────────────────
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `@keyframes slideIn { from { transform: translateX(110%); opacity:0 } to { transform: translateX(0); opacity:1 } }`;
  document.head.appendChild(style);
}
