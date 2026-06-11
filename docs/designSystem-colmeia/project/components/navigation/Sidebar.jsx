import React from "react";

/**
 * Colmeia Sidebar — fixed left navigation on the light grey surface.
 * Items are { icon, label, href, active, badge } or section headers
 * ({ section: "RELATÓRIOS" }). Supports a collapsed (icon-only) mode.
 */
export function Sidebar({
  logoSrc,
  logoMarkSrc,
  items = [],
  collapsed = false,
  onToggle,
  footer,
  width = 256,
  collapsedWidth = 80,
}) {
  return (
    <aside
      style={{
        position: "relative",
        width: collapsed ? `${collapsedWidth}px` : `${width}px`,
        minWidth: collapsed ? `${collapsedWidth}px` : `${width}px`,
        height: "100%",
        background: "var(--surface-sidebar)",
        borderRight: "1px solid var(--border-structural)",
        padding: "16px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-brand)",
        transition: "width var(--duration-slow) var(--ease-standard)",
      }}
    >
      <div style={{ height: "25px", margin: "8px 0 40px", display: "flex", justifyContent: collapsed ? "center" : "flex-start" }}>
        <img src={collapsed ? logoMarkSrc || logoSrc : logoSrc} alt="Colmeia" style={{ height: "25px", width: "auto", objectFit: "contain" }} />
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
        {items.map((it, i) =>
          it.section ? (
            collapsed ? (
              <div key={i} style={{ height: "1px", background: "var(--border-subtle)", margin: "8px 4px" }} />
            ) : (
              <div
                key={i}
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  color: "var(--text-secondary)",
                  padding: "12px 8px 4px",
                }}
              >
                {it.section}
              </div>
            )
          ) : (
            <NavItem key={i} item={it} collapsed={collapsed} />
          )
        )}
      </nav>

      {onToggle && (
        <button
          onClick={onToggle}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: "8px",
            marginTop: "12px",
            padding: "8px",
            background: "transparent",
            border: "none",
            borderRadius: "var(--radius-lg)",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-brand)",
            fontSize: "13px",
            letterSpacing: "0.5px",
            cursor: "pointer",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px", transform: collapsed ? "rotate(180deg)" : "none" }}>
            chevron_left
          </span>
          {!collapsed && "Ver menos"}
        </button>
      )}
      {footer}
    </aside>
  );
}

function NavItem({ item, collapsed }) {
  const [hover, setHover] = React.useState(false);
  const active = item.active;
  const bg = active ? "var(--surface-nav-hover)" : hover ? "var(--surface-nav-hover)" : "transparent";
  const color = active || hover ? "var(--text-strong)" : "var(--text-secondary)";

  return (
    <a
      href={item.href || "#"}
      onClick={item.onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={collapsed ? item.label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        gap: "10px",
        padding: "7px 8px",
        borderRadius: "var(--radius-lg)",
        background: bg,
        color,
        textDecoration: "none",
        transition: "background var(--duration-base), color var(--duration-base)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        {item.icon && <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "inherit" }}>{item.icon}</span>}
        {!collapsed && (
          <span style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{item.label}</span>
        )}
      </span>
      {!collapsed && item.badge && (
        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--brand-primary)", background: "var(--brand-primary-wash)", padding: "1px 6px", borderRadius: "var(--radius-full)" }}>
          {item.badge}
        </span>
      )}
    </a>
  );
}
