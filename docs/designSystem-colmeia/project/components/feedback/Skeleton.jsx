import React from "react";

/**
 * Colmeia Skeleton — shimmer placeholder for loading states.
 * `variant` controls shape; the shimmer matches the app's 2s sweep.
 */
export function Skeleton({ variant = "text", width = "100%", height, lines = 1, radius, style = {} }) {
  const base = {
    background:
      "linear-gradient(90deg, var(--color-gray-200) 25%, var(--color-gray-100) 37%, var(--color-gray-200) 63%)",
    backgroundSize: "400% 100%",
    animation: "colmeia-shimmer var(--shimmer-duration) ease-in-out infinite",
    borderRadius: radius || "var(--radius-md)",
  };

  if (variant === "text") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width, ...style }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              ...base,
              height: height || "12px",
              width: i === lines - 1 && lines > 1 ? "65%" : "100%",
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "circle") {
    const d = height || width || "40px";
    return <div style={{ ...base, width: d, height: d, borderRadius: "var(--radius-full)", ...style }} />;
  }

  // block / card
  return (
    <div
      style={{
        ...base,
        width,
        height: height || (variant === "card" ? "120px" : "40px"),
        borderRadius: radius || (variant === "card" ? "var(--radius-xl)" : "var(--radius-lg)"),
        ...style,
      }}
    />
  );
}
