import React from "react";

/**
 * Colmeia Modal — centred dialog with backdrop. 16px radius, modal shadow.
 * Composes a header (title + close), body (children), and optional footer.
 */
export function Modal({ open, onClose, title, children, footer, width = 460, closeOnBackdrop = true }) {
  if (!open) return null;
  return (
    <div
      onClick={closeOnBackdrop ? onClose : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        fontFamily: "var(--font-body)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: `${width}px`,
          background: "var(--surface-card)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-modal)",
          overflow: "hidden",
        }}
      >
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 24px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <h2 style={{ margin: 0, fontFamily: "var(--font-brand)", fontSize: "18px", fontWeight: 700, color: "var(--text-strong)" }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Fechar"
              style={{
                display: "inline-flex",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
                padding: "2px",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>close</span>
            </button>
          </div>
        )}
        <div style={{ padding: "24px", color: "var(--text-body)", fontSize: "14px", lineHeight: 1.5 }}>{children}</div>
        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              padding: "16px 24px",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
