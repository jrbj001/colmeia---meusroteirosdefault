import React from "react";

/**
 * Colmeia Input — labelled text field with optional leading icon,
 * helper text, and error state. 8px radius, brand-orange focus ring.
 */
export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon = null,
  iconRight = null,
  error = "",
  helper = "",
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || React.useId();
  const hasError = Boolean(error);

  const borderColor = hasError
    ? "var(--color-error-text)"
    : focus
    ? "var(--brand-primary)"
    : "var(--border-input)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontFamily: "var(--font-body)", ...style }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-body)", letterSpacing: "0.3px" }}
        >
          {label}
        </label>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          height: "40px",
          padding: "0 12px",
          background: disabled ? "var(--surface-app)" : "var(--surface-card)",
          border: `1px solid ${borderColor}`,
          borderRadius: "var(--radius-lg)",
          boxShadow: focus && !hasError ? "0 0 0 3px var(--brand-primary-wash)" : "none",
          transition: "border-color var(--duration-base), box-shadow var(--duration-base)",
        }}
      >
        {icon && (
          <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--text-secondary)" }}>
            {icon}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            color: "var(--text-strong)",
            minWidth: 0,
          }}
          {...rest}
        />
        {iconRight}
      </div>
      {(error || helper) && (
        <span style={{ fontSize: "11px", color: hasError ? "var(--color-error-text)" : "var(--text-secondary)" }}>
          {error || helper}
        </span>
      )}
    </div>
  );
}
