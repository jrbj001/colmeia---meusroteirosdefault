import React from "react";

/**
 * Colmeia Pagination — page list with prev/next. Current page fills with
 * the dark ink chip; others hover to a light grey.
 */
export function Pagination({ currentPage = 1, totalPages = 1, onPageChange, maxButtons = 7 }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("…");
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push("…");
    pages.push(totalPages);
  }

  const go = (p) => p >= 1 && p <= totalPages && p !== currentPage && onPageChange && onPageChange(p);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-body)" }}>
      <Arrow icon="chevron_left" disabled={currentPage === 1} onClick={() => go(currentPage - 1)} />
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`g${i}`} style={{ width: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>…</span>
        ) : (
          <PageChip key={p} page={p} active={p === currentPage} onClick={() => go(p)} />
        )
      )}
      <Arrow icon="chevron_right" disabled={currentPage === totalPages} onClick={() => go(currentPage + 1)} />
    </div>
  );
}

function PageChip({ page, active, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        minWidth: "34px",
        height: "34px",
        padding: "0 10px",
        border: "none",
        borderRadius: "var(--radius-lg)",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontSize: "14px",
        fontWeight: active ? 600 : 400,
        background: active ? "var(--color-ink-700)" : hover ? "var(--surface-nav-hover)" : "transparent",
        color: active ? "#fff" : "var(--text-body)",
        transition: "background var(--duration-base)",
      }}
    >
      {page}
    </button>
  );
}

function Arrow({ icon, disabled, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "34px",
        height: "34px",
        border: "none",
        borderRadius: "var(--radius-lg)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        background: hover && !disabled ? "var(--surface-nav-hover)" : "transparent",
        color: "var(--text-body)",
        transition: "background var(--duration-base)",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{icon}</span>
    </button>
  );
}
