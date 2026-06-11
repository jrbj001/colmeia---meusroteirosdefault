import React from "react";
import { Avatar } from "../data/Avatar.jsx";

/**
 * Colmeia Topbar — white bar with breadcrumb trail on the left and the
 * user greeting, avatar and logout on the right.
 * breadcrumb: [{ label, href? }]
 */
export function Topbar({ breadcrumb = [], userName, userPhoto, onLogout, right }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "72px",
        padding: "0 24px",
        background: "var(--surface-card)",
        borderBottom: "1px solid var(--border-structural)",
        boxSizing: "border-box",
        fontFamily: "var(--font-body)",
      }}
    >
      <nav style={{ display: "flex", alignItems: "center", fontSize: "12px", letterSpacing: "0.5px", minWidth: 0 }}>
        {breadcrumb.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ margin: "0 8px", color: "var(--text-muted)" }}>/</span>}
            {b.href && i < breadcrumb.length - 1 ? (
              <a href={b.href} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>{b.label}</a>
            ) : (
              <span style={{ color: "var(--text-body)", fontWeight: i === breadcrumb.length - 1 ? 600 : 400 }}>{b.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        {right}
        {userName && <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Olá, {userName}</span>}
        <Avatar src={userPhoto} name={userName} size="lg" />
        {onLogout && (
          <button
            onClick={onLogout}
            aria-label="Sair"
            title="Sair"
            style={{ display: "inline-flex", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-body)", padding: 0 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
