import React from "react";

/**
 * Colmeia Tabs — underline tab strip. `tabs` is [{ key, label, icon? }].
 * Active tab carries the brand-orange underline + label.
 */
export function Tabs({ tabs = [], value, onChange, style = {} }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        borderBottom: "1px solid var(--border-subtle)",
        fontFamily: "var(--font-brand)",
        ...style,
      }}
    >
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <TabButton key={t.key} tab={t} active={active} onClick={() => onChange && onChange(t.key)} />
        );
      })}
    </div>
  );
}

function TabButton({ tab, active, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        padding: "10px 14px",
        background: "transparent",
        border: "none",
        borderBottom: `2px solid ${active ? "var(--brand-primary)" : "transparent"}`,
        marginBottom: "-1px",
        cursor: "pointer",
        fontFamily: "var(--font-brand)",
        fontSize: "14px",
        fontWeight: active ? 600 : 500,
        letterSpacing: "0.3px",
        color: active ? "var(--text-strong)" : hover ? "var(--text-body)" : "var(--text-secondary)",
        transition: "color var(--duration-base), border-color var(--duration-base)",
      }}
    >
      {tab.icon && <span className="material-symbols-outlined" style={{ fontSize: "19px" }}>{tab.icon}</span>}
      {tab.label}
      {tab.count != null && (
        <span style={{ fontSize: "11px", fontWeight: 700, color: active ? "var(--brand-primary)" : "var(--text-muted)", background: active ? "var(--brand-primary-wash)" : "var(--surface-panel)", padding: "1px 7px", borderRadius: "var(--radius-full)" }}>
          {tab.count}
        </span>
      )}
    </button>
  );
}
