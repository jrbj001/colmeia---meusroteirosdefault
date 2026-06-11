import React from "react";

/**
 * Colmeia Badge — small status pill. `tone` picks a semantic palette;
 * `dot` shows a leading status dot. Defaults to a soft filled pill.
 */
export function Badge({ children, tone = "neutral", dot = false, variant = "soft", size = "md", style = {} }) {
  const tones = {
    success: { text: "var(--color-success-text)", bg: "var(--color-success-bg)", dot: "var(--color-success-dot)" },
    warning: { text: "var(--color-warning-text)", bg: "var(--color-warning-bg)", dot: "var(--color-warning-dot)" },
    error: { text: "var(--color-error-text)", bg: "var(--color-error-bg)", dot: "var(--color-error-strong)" },
    info: { text: "var(--color-info-text)", bg: "var(--color-info-bg)", dot: "var(--color-info-text)" },
    neutral: { text: "var(--color-neutral-text)", bg: "var(--color-neutral-bg)", dot: "var(--color-neutral-dot)" },
    brand: { text: "var(--brand-primary)", bg: "var(--brand-primary-wash)", dot: "var(--brand-primary)" },
  };
  const t = tones[tone] || tones.neutral;
  const sizes = {
    sm: { padding: "2px 8px", fontSize: "10px" },
    md: { padding: "4px 10px", fontSize: "12px" },
  }[size] || { padding: "4px 10px", fontSize: "12px" };

  const isOutline = variant === "outline";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        borderRadius: "var(--radius-full)",
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        whiteSpace: "nowrap",
        letterSpacing: "0.2px",
        color: t.text,
        background: isOutline ? "transparent" : t.bg,
        border: isOutline ? `1px solid ${t.text}55` : "1px solid transparent",
        ...sizes,
        ...style,
      }}
    >
      {dot && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: t.dot, flexShrink: 0 }} />}
      {children}
    </span>
  );
}
