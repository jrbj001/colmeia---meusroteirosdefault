import React from "react";

/**
 * Colmeia IconButton — square/round icon-only control.
 * Pass a Material Symbols glyph name via `icon`, or arbitrary children.
 * Default neutral charcoal, hovers toward the brand orange (or danger).
 */
export function IconButton({
  icon,
  children,
  label,
  size = "md",
  tone = "neutral",
  variant = "bare",
  disabled = false,
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { box: 28, glyph: 18 },
    md: { box: 36, glyph: 22 },
    lg: { box: 44, glyph: 26 },
  };
  const s = sizes[size] || sizes.md;
  const [hover, setHover] = React.useState(false);

  const hoverColor = tone === "danger" ? "var(--color-error-text)" : "var(--brand-primary)";
  const baseColor = "var(--text-body)";

  const variants = {
    bare: {
      background: hover && !disabled ? "var(--surface-nav-hover)" : "transparent",
      border: "1px solid transparent",
    },
    outline: {
      background: hover && !disabled ? "var(--surface-app)" : "var(--surface-card)",
      border: "1px solid var(--border-input)",
    },
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${s.box}px`,
        height: `${s.box}px`,
        borderRadius: "var(--radius-lg)",
        color: hover && !disabled ? hoverColor : baseColor,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background var(--duration-base), color var(--duration-base), transform var(--duration-base)",
        transform: hover && !disabled ? "scale(1.06)" : "scale(1)",
        ...variants[variant],
        ...style,
      }}
      {...rest}
    >
      {icon ? (
        <span className="material-symbols-outlined" style={{ fontSize: `${s.glyph}px` }}>
          {icon}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
