import React from "react";

/**
 * Colmeia Button — primary action control.
 * Variants: primary (brand orange), secondary (outline), ghost, danger.
 * Flat, 8px radius, 0.5px tracking on the label.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  iconLeft = null,
  iconRight = null,
  type = "button",
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { padding: "6px 12px", fontSize: "13px", height: "32px", gap: "6px" },
    md: { padding: "9px 16px", fontSize: "14px", height: "40px", gap: "8px" },
    lg: { padding: "12px 20px", fontSize: "15px", height: "46px", gap: "8px" },
  };

  const variants = {
    primary: {
      background: "var(--brand-primary)",
      color: "var(--brand-on-primary)",
      border: "1px solid var(--brand-primary)",
    },
    secondary: {
      background: "var(--surface-card)",
      color: "var(--text-body)",
      border: "1px solid var(--border-input)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid transparent",
    },
    danger: {
      background: "var(--color-error-text)",
      color: "#fff",
      border: "1px solid var(--color-error-text)",
    },
  };

  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  const isDisabled = disabled || loading;

  const [hover, setHover] = React.useState(false);

  const hoverBg = {
    primary: "var(--brand-primary-hover)",
    secondary: "var(--surface-app)",
    ghost: "var(--surface-nav-hover)",
    danger: "var(--color-error-strong)",
  }[variant];

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        width: fullWidth ? "100%" : "auto",
        fontFamily: "var(--font-brand)",
        fontSize: s.fontSize,
        fontWeight: 600,
        letterSpacing: "0.3px",
        lineHeight: 1,
        borderRadius: "var(--radius-lg)",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.5 : 1,
        transition: "background var(--duration-base) var(--ease-standard), border-color var(--duration-base)",
        whiteSpace: "nowrap",
        ...v,
        ...(hover && !isDisabled ? { background: hoverBg, borderColor: hover && variant === "secondary" ? "var(--border-structural)" : hoverBg } : {}),
        ...style,
      }}
      {...rest}
    >
      {loading && (
        <span
          style={{
            width: "15px",
            height: "15px",
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "colmeia-spin 0.7s linear infinite",
            display: "inline-block",
          }}
        />
      )}
      {!loading && iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
}
