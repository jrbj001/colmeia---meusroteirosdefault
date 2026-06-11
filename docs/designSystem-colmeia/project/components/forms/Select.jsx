import React from "react";

/**
 * Colmeia Select — labelled native select styled to match Input.
 * `options` is an array of { value, label } or strings.
 */
export function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  error = "",
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const selectId = id || React.useId();
  const hasError = Boolean(error);
  const norm = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));

  const borderColor = hasError
    ? "var(--color-error-text)"
    : focus
    ? "var(--brand-primary)"
    : "var(--border-input)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontFamily: "var(--font-body)", ...style }}>
      {label && (
        <label htmlFor={selectId} style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-body)", letterSpacing: "0.3px" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            width: "100%",
            height: "40px",
            padding: "0 36px 0 12px",
            background: disabled ? "var(--surface-app)" : "var(--surface-card)",
            border: `1px solid ${borderColor}`,
            borderRadius: "var(--radius-lg)",
            boxShadow: focus && !hasError ? "0 0 0 3px var(--brand-primary-wash)" : "none",
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            color: value ? "var(--text-strong)" : "var(--text-muted)",
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "border-color var(--duration-base), box-shadow var(--duration-base)",
            outline: "none",
          }}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {norm.map((o) => (
            <option key={o.value} value={o.value} style={{ color: "var(--text-strong)" }}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          className="material-symbols-outlined"
          style={{ position: "absolute", right: "10px", fontSize: "20px", color: "var(--text-secondary)", pointerEvents: "none" }}
        >
          keyboard_arrow_down
        </span>
      </div>
      {error && <span style={{ fontSize: "11px", color: "var(--color-error-text)" }}>{error}</span>}
    </div>
  );
}
