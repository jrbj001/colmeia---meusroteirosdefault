import React from "react";

/**
 * Colmeia Spinner — brand-orange ring loader. Used inline (table rows)
 * and as the centred app loader.
 */
export function Spinner({ size = 20, color = "var(--brand-primary)", thickness, style = {} }) {
  const s = typeof size === "number" ? `${size}px` : size;
  const bw = thickness || Math.max(2, Math.round((parseInt(s, 10) || 20) / 8));
  return (
    <span
      role="status"
      aria-label="Carregando"
      style={{
        display: "inline-block",
        width: s,
        height: s,
        border: `${bw}px solid color-mix(in srgb, ${color} 22%, transparent)`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "colmeia-spin 0.7s linear infinite",
        ...style,
      }}
    />
  );
}
