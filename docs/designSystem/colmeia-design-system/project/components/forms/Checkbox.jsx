import React from "react";

/**
 * Colmeia Checkbox — square check with brand-orange fill when checked.
 */
export function Checkbox({ checked = false, onChange, disabled = false, label, indeterminate = false, style = {}, ...rest }) {
  const box = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "18px",
        height: "18px",
        borderRadius: "var(--radius-sm)",
        border: checked || indeterminate ? "1px solid var(--brand-primary)" : "1px solid var(--border-input)",
        background: checked || indeterminate ? "var(--brand-primary)" : "var(--surface-card)",
        transition: "background var(--duration-fast), border-color var(--duration-fast)",
        flexShrink: 0,
      }}
    >
      {(checked || indeterminate) && (
        <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#fff", fontWeight: 700 }}>
          {indeterminate ? "remove" : "check"}
        </span>
      )}
    </span>
  );

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "var(--font-body)",
        ...style,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        {...rest}
      />
      {box}
      {label && <span style={{ fontSize: "13px", color: "var(--text-body)" }}>{label}</span>}
    </label>
  );
}
