import React from "react";

/**
 * Colmeia DataTable — the signature operational table: dark charcoal
 * header with uppercase labels, zebra body rows, hover highlight.
 *
 * columns: [{ key, header, align?, width?, render?(row, i) }]
 * rows:    array of row objects
 */
export function DataTable({
  columns = [],
  rows = [],
  rowKey = (_, i) => i,
  loading = false,
  skeletonRows = 6,
  emptyMessage = "Nenhum registro encontrado",
  onRowClick,
}) {
  const align = (a) => (a === "center" ? "center" : a === "right" ? "right" : "left");

  return (
    <div style={{ width: "100%", overflowX: "auto", fontFamily: "var(--font-body)" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr style={{ background: "var(--color-ink-700)", height: "40px" }}>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: align(c.align),
                  padding: "8px 24px",
                  width: c.width,
                  color: "#fff",
                  fontFamily: "var(--font-brand)",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  whiteSpace: "nowrap",
                }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, r) => (
              <tr key={`s${r}`} style={{ background: r % 2 === 0 ? "var(--surface-row-alt)" : "var(--surface-card)" }}>
                {columns.map((c) => (
                  <td key={c.key} style={{ padding: "14px 24px" }}>
                    <div
                      style={{
                        height: "12px",
                        borderRadius: "var(--radius-sm)",
                        background: "linear-gradient(90deg, var(--color-gray-200) 25%, var(--color-gray-100) 37%, var(--color-gray-200) 63%)",
                        backgroundSize: "400% 100%",
                        animation: "colmeia-shimmer var(--shimmer-duration) ease-in-out infinite",
                        width: c.align === "right" ? "40%" : "75%",
                        marginLeft: c.align === "right" ? "auto" : 0,
                        marginInline: c.align === "center" ? "auto" : undefined,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", padding: "32px", color: "var(--text-secondary)", fontSize: "14px" }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <Row key={rowKey(row, i)} row={row} i={i} columns={columns} onRowClick={onRowClick} align={align} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Row({ row, i, columns, onRowClick, align }) {
  const [hover, setHover] = React.useState(false);
  const base = i % 2 === 0 ? "var(--surface-row-alt)" : "var(--surface-card)";
  return (
    <tr
      onClick={onRowClick ? () => onRowClick(row, i) : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "var(--surface-row-hover)" : base,
        cursor: onRowClick ? "pointer" : "default",
        transition: "background var(--duration-base)",
      }}
    >
      {columns.map((c) => (
        <td
          key={c.key}
          style={{
            padding: "14px 24px",
            textAlign: align(c.align),
            fontSize: "14px",
            color: "var(--text-strong)",
            whiteSpace: "nowrap",
          }}
        >
          {c.render ? c.render(row, i) : row[c.key]}
        </td>
      ))}
    </tr>
  );
}
