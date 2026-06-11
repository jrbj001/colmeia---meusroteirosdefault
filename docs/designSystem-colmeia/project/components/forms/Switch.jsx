import React from "react";

/**
 * Colmeia Switch — pill toggle. Brand orange when on.
 * Matches the "liberar para agência" toggle in Meus Roteiros.
 */
export function Switch({ checked = false, onChange, disabled = false, label, size = "md", style = {}, ...rest }) {
  const dims = {
    sm: { w: 32, h: 18, knob: 14 },
    md: { w: 36, h: 20, knob: 16 },
  }[size] || { w: 36, h: 20, knob: 16 };

  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{
        position: "relative",
        width: `${dims.w}px`,
        height: `${dims.h}px`,
        borderRadius: "var(--radius-full)",
        border: "none",
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        background: checked ? "var(--brand-primary)" : "var(--color-gray-300)",
        transition: "background var(--duration-base) var(--ease-standard)",
        flexShrink: 0,
      }}
      {...rest}
    >
      <span
        style={{
          position: "absolute",
          top: "2px",
          left: "2px",
          width: `${dims.knob}px`,
          height: `${dims.knob}px`,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
          transform: checked ? `translateX(${dims.w - dims.knob - 4}px)` : "translateX(0)",
          transition: "transform var(--duration-base) var(--ease-standard)",
        }}
      />
    </button>
  );

  if (!label) return toggle;

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", ...style }}>
      {toggle}
      <span style={{ fontSize: "13px", color: "var(--text-body)" }}>{label}</span>
    </label>
  );
}
