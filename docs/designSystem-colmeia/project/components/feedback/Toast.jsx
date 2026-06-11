import React from "react";

/**
 * Colmeia Toast — transient inline notification. Semantic left accent +
 * Material icon. Render inside a fixed stack in product code.
 */
const CFG = {
  success: { icon: "check_circle", color: "var(--color-success-text)", bg: "var(--color-success-bg)" },
  error: { icon: "error", color: "var(--color-error-text)", bg: "var(--color-error-bg)" },
  warning: { icon: "warning", color: "var(--color-warning-text)", bg: "var(--color-warning-bg)" },
  info: { icon: "info", color: "var(--color-info-text)", bg: "var(--color-info-bg)" },
};

export function Toast({ tone = "info", title, message, onClose, style = {} }) {
  const c = CFG[tone] || CFG.info;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        minWidth: "300px",
        maxWidth: "420px",
        padding: "12px 14px",
        background: "var(--surface-card)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        borderLeft: `3px solid ${c.color}`,
        fontFamily: "var(--font-body)",
        ...style,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "22px", color: c.color, flexShrink: 0 }}>{c.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-strong)" }}>{title}</div>}
        {message && <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: title ? "2px" : 0 }}>{message}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Fechar" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
        </button>
      )}
    </div>
  );
}
