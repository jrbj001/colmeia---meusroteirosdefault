import React from "react";

/**
 * Colmeia Avatar — round user marker. Renders an image when `src` is
 * given (falls back on error), otherwise initials on a brand-orange
 * gradient. Used in the topbar and user lists.
 */
export function Avatar({ src, name = "", size = "md", style = {} }) {
  const sizes = { sm: 32, md: 40, lg: 48 };
  const px = sizes[size] || sizes.md;
  const [failed, setFailed] = React.useState(false);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const showImg = src && !failed;

  return (
    <div
      style={{
        width: `${px}px`,
        height: `${px}px`,
        borderRadius: "var(--radius-full)",
        flexShrink: 0,
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: showImg ? "transparent" : "linear-gradient(135deg, var(--color-orange-300), var(--color-orange-600))",
        border: "2px solid var(--color-gray-200)",
        color: "#fff",
        fontFamily: "var(--font-brand)",
        fontWeight: 600,
        fontSize: `${px * 0.36}px`,
        letterSpacing: "0.3px",
        ...style,
      }}
    >
      {showImg ? (
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        initials || <span className="material-symbols-outlined" style={{ fontSize: `${px * 0.55}px` }}>person</span>
      )}
    </div>
  );
}
