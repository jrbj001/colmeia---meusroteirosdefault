/* @ds-bundle: {"format":3,"namespace":"ColmeiaDesignSystem_6ed06a","components":[{"name":"Avatar","sourcePath":"components/data/Avatar.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"Pagination","sourcePath":"components/data/Pagination.jsx"},{"name":"Badge","sourcePath":"components/feedback/Badge.jsx"},{"name":"ConfirmDialog","sourcePath":"components/feedback/ConfirmDialog.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"Skeleton","sourcePath":"components/feedback/Skeleton.jsx"},{"name":"Spinner","sourcePath":"components/feedback/Spinner.jsx"},{"name":"StatusBadge","sourcePath":"components/feedback/StatusBadge.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Sidebar","sourcePath":"components/navigation/Sidebar.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"Topbar","sourcePath":"components/navigation/Topbar.jsx"}],"sourceHashes":{"components/data/Avatar.jsx":"122da082f322","components/data/DataTable.jsx":"a6f8664f1084","components/data/Pagination.jsx":"97342a3058ff","components/feedback/Badge.jsx":"3561ac766066","components/feedback/ConfirmDialog.jsx":"956c27ef641d","components/feedback/Modal.jsx":"3e9415607146","components/feedback/Skeleton.jsx":"c354e665641e","components/feedback/Spinner.jsx":"6c60868a3937","components/feedback/StatusBadge.jsx":"eaa500b01002","components/feedback/Toast.jsx":"96daca66ee2f","components/forms/Button.jsx":"2d5eaf3f7972","components/forms/Checkbox.jsx":"590687508784","components/forms/IconButton.jsx":"4119fa5bd4fe","components/forms/Input.jsx":"0da8548dc696","components/forms/Select.jsx":"2aac8a6ae35b","components/forms/Switch.jsx":"7d14fb48e3f8","components/navigation/Sidebar.jsx":"0b0dc47ba97b","components/navigation/Tabs.jsx":"b3c04a75571c","components/navigation/Topbar.jsx":"659494803700","ui_kits/colmeia-app/AppShell.jsx":"519c728d3f0a","ui_kits/colmeia-app/HomeDashboard.jsx":"68bc6cd37b18","ui_kits/colmeia-app/MeusRoteiros.jsx":"5c2d49bb378f"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ColmeiaDesignSystem_6ed06a = window.ColmeiaDesignSystem_6ed06a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/data/Avatar.jsx
try { (() => {
/**
 * Colmeia Avatar — round user marker. Renders an image when `src` is
 * given (falls back on error), otherwise initials on a brand-orange
 * gradient. Used in the topbar and user lists.
 */
function Avatar({
  src,
  name = "",
  size = "md",
  style = {}
}) {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 48
  };
  const px = sizes[size] || sizes.md;
  const [failed, setFailed] = React.useState(false);
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const showImg = src && !failed;
  return /*#__PURE__*/React.createElement("div", {
    style: {
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
      ...style
    }
  }, showImg ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    onError: () => setFailed(true),
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials || /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: `${px * 0.55}px`
    }
  }, "person"));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
/**
 * Colmeia DataTable — the signature operational table: dark charcoal
 * header with uppercase labels, zebra body rows, hover highlight.
 *
 * columns: [{ key, header, align?, width?, render?(row, i) }]
 * rows:    array of row objects
 */
function DataTable({
  columns = [],
  rows = [],
  rowKey = (_, i) => i,
  loading = false,
  skeletonRows = 6,
  emptyMessage = "Nenhum registro encontrado",
  onRowClick
}) {
  const align = a => a === "center" ? "center" : a === "right" ? "right" : "left";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      overflowX: "auto",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "var(--color-ink-700)",
      height: "40px"
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      textAlign: align(c.align),
      padding: "8px 24px",
      width: c.width,
      color: "#fff",
      fontFamily: "var(--font-brand)",
      fontSize: "11px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.8px",
      whiteSpace: "nowrap"
    }
  }, c.header)))), /*#__PURE__*/React.createElement("tbody", null, loading ? Array.from({
    length: skeletonRows
  }).map((_, r) => /*#__PURE__*/React.createElement("tr", {
    key: `s${r}`,
    style: {
      background: r % 2 === 0 ? "var(--surface-row-alt)" : "var(--surface-card)"
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    style: {
      padding: "14px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "12px",
      borderRadius: "var(--radius-sm)",
      background: "linear-gradient(90deg, var(--color-gray-200) 25%, var(--color-gray-100) 37%, var(--color-gray-200) 63%)",
      backgroundSize: "400% 100%",
      animation: "colmeia-shimmer var(--shimmer-duration) ease-in-out infinite",
      width: c.align === "right" ? "40%" : "75%",
      marginLeft: c.align === "right" ? "auto" : 0,
      marginInline: c.align === "center" ? "auto" : undefined
    }
  }))))) : rows.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: columns.length,
    style: {
      textAlign: "center",
      padding: "32px",
      color: "var(--text-secondary)",
      fontSize: "14px"
    }
  }, emptyMessage)) : rows.map((row, i) => /*#__PURE__*/React.createElement(Row, {
    key: rowKey(row, i),
    row: row,
    i: i,
    columns: columns,
    onRowClick: onRowClick,
    align: align
  })))));
}
function Row({
  row,
  i,
  columns,
  onRowClick,
  align
}) {
  const [hover, setHover] = React.useState(false);
  const base = i % 2 === 0 ? "var(--surface-row-alt)" : "var(--surface-card)";
  return /*#__PURE__*/React.createElement("tr", {
    onClick: onRowClick ? () => onRowClick(row, i) : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: hover ? "var(--surface-row-hover)" : base,
      cursor: onRowClick ? "pointer" : "default",
      transition: "background var(--duration-base)"
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    style: {
      padding: "14px 24px",
      textAlign: align(c.align),
      fontSize: "14px",
      color: "var(--text-strong)",
      whiteSpace: "nowrap"
    }
  }, c.render ? c.render(row, i) : row[c.key])));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/Pagination.jsx
try { (() => {
/**
 * Colmeia Pagination — page list with prev/next. Current page fills with
 * the dark ink chip; others hover to a light grey.
 */
function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  maxButtons = 7
}) {
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
  const go = p => p >= 1 && p <= totalPages && p !== currentPage && onPageChange && onPageChange(p);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement(Arrow, {
    icon: "chevron_left",
    disabled: currentPage === 1,
    onClick: () => go(currentPage - 1)
  }), pages.map((p, i) => p === "…" ? /*#__PURE__*/React.createElement("span", {
    key: `g${i}`,
    style: {
      width: "32px",
      textAlign: "center",
      color: "var(--text-muted)",
      fontSize: "14px"
    }
  }, "\u2026") : /*#__PURE__*/React.createElement(PageChip, {
    key: p,
    page: p,
    active: p === currentPage,
    onClick: () => go(p)
  })), /*#__PURE__*/React.createElement(Arrow, {
    icon: "chevron_right",
    disabled: currentPage === totalPages,
    onClick: () => go(currentPage + 1)
  }));
}
function PageChip({
  page,
  active,
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
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
      transition: "background var(--duration-base)"
    }
  }, page);
}
function Arrow({
  icon,
  disabled,
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
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
      transition: "background var(--duration-base)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: "20px"
    }
  }, icon));
}
Object.assign(__ds_scope, { Pagination });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Pagination.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Badge.jsx
try { (() => {
/**
 * Colmeia Badge — small status pill. `tone` picks a semantic palette;
 * `dot` shows a leading status dot. Defaults to a soft filled pill.
 */
function Badge({
  children,
  tone = "neutral",
  dot = false,
  variant = "soft",
  size = "md",
  style = {}
}) {
  const tones = {
    success: {
      text: "var(--color-success-text)",
      bg: "var(--color-success-bg)",
      dot: "var(--color-success-dot)"
    },
    warning: {
      text: "var(--color-warning-text)",
      bg: "var(--color-warning-bg)",
      dot: "var(--color-warning-dot)"
    },
    error: {
      text: "var(--color-error-text)",
      bg: "var(--color-error-bg)",
      dot: "var(--color-error-strong)"
    },
    info: {
      text: "var(--color-info-text)",
      bg: "var(--color-info-bg)",
      dot: "var(--color-info-text)"
    },
    neutral: {
      text: "var(--color-neutral-text)",
      bg: "var(--color-neutral-bg)",
      dot: "var(--color-neutral-dot)"
    },
    brand: {
      text: "var(--brand-primary)",
      bg: "var(--brand-primary-wash)",
      dot: "var(--brand-primary)"
    }
  };
  const t = tones[tone] || tones.neutral;
  const sizes = {
    sm: {
      padding: "2px 8px",
      fontSize: "10px"
    },
    md: {
      padding: "4px 10px",
      fontSize: "12px"
    }
  }[size] || {
    padding: "4px 10px",
    fontSize: "12px"
  };
  const isOutline = variant === "outline";
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      borderRadius: "var(--radius-full)",
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      whiteSpace: "nowrap",
      letterSpacing: "0.2px",
      color: t.text,
      background: isOutline ? "transparent" : t.bg,
      border: isOutline ? `1px solid ${t.text}55` : "1px solid transparent",
      ...sizes,
      ...style
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      background: t.dot,
      flexShrink: 0
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Badge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
/**
 * Colmeia Modal — centred dialog with backdrop. 16px radius, modal shadow.
 * Composes a header (title + close), body (children), and optional footer.
 */
function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 460,
  closeOnBackdrop = true
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: closeOnBackdrop ? onClose : undefined,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 50,
      background: "rgba(0,0,0,0.45)",
      backdropFilter: "blur(2px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: "100%",
      maxWidth: `${width}px`,
      background: "var(--surface-card)",
      borderRadius: "var(--radius-2xl)",
      boxShadow: "var(--shadow-modal)",
      overflow: "hidden"
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "20px 24px",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-brand)",
      fontSize: "18px",
      fontWeight: 700,
      color: "var(--text-strong)"
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Fechar",
    style: {
      display: "inline-flex",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      color: "var(--text-secondary)",
      padding: "2px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: "22px"
    }
  }, "close"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px",
      color: "var(--text-body)",
      fontSize: "14px",
      lineHeight: 1.5
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
      padding: "16px 24px",
      borderTop: "1px solid var(--border-subtle)"
    }
  }, footer)));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Skeleton.jsx
try { (() => {
/**
 * Colmeia Skeleton — shimmer placeholder for loading states.
 * `variant` controls shape; the shimmer matches the app's 2s sweep.
 */
function Skeleton({
  variant = "text",
  width = "100%",
  height,
  lines = 1,
  radius,
  style = {}
}) {
  const base = {
    background: "linear-gradient(90deg, var(--color-gray-200) 25%, var(--color-gray-100) 37%, var(--color-gray-200) 63%)",
    backgroundSize: "400% 100%",
    animation: "colmeia-shimmer var(--shimmer-duration) ease-in-out infinite",
    borderRadius: radius || "var(--radius-md)"
  };
  if (variant === "text") {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width,
        ...style
      }
    }, Array.from({
      length: lines
    }).map((_, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        ...base,
        height: height || "12px",
        width: i === lines - 1 && lines > 1 ? "65%" : "100%"
      }
    })));
  }
  if (variant === "circle") {
    const d = height || width || "40px";
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...base,
        width: d,
        height: d,
        borderRadius: "var(--radius-full)",
        ...style
      }
    });
  }

  // block / card
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...base,
      width,
      height: height || (variant === "card" ? "120px" : "40px"),
      borderRadius: radius || (variant === "card" ? "var(--radius-xl)" : "var(--radius-lg)"),
      ...style
    }
  });
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Spinner.jsx
try { (() => {
/**
 * Colmeia Spinner — brand-orange ring loader. Used inline (table rows)
 * and as the centred app loader.
 */
function Spinner({
  size = 20,
  color = "var(--brand-primary)",
  thickness,
  style = {}
}) {
  const s = typeof size === "number" ? `${size}px` : size;
  const bw = thickness || Math.max(2, Math.round((parseInt(s, 10) || 20) / 8));
  return /*#__PURE__*/React.createElement("span", {
    role: "status",
    "aria-label": "Carregando",
    style: {
      display: "inline-block",
      width: s,
      height: s,
      border: `${bw}px solid color-mix(in srgb, ${color} 22%, transparent)`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "colmeia-spin 0.7s linear infinite",
      ...style
    }
  });
}
Object.assign(__ds_scope, { Spinner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Spinner.jsx", error: String((e && e.message) || e) }); }

// components/feedback/StatusBadge.jsx
try { (() => {
/**
 * Colmeia StatusBadge — maps a known inventory/route status key to a
 * labelled, dotted badge. Mirrors the AdminInventarios status set.
 */
const STATUS = {
  APROVADO: {
    label: "Aprovado",
    tone: "success"
  },
  EM_ANALISE: {
    label: "Em análise",
    tone: "warning"
  },
  PROCESSANDO: {
    label: "Processando",
    tone: "warning"
  },
  PARA_CORRIGIR: {
    label: "Para corrigir",
    tone: "error"
  },
  REJEITADO: {
    label: "Rejeitado",
    tone: "neutral"
  },
  FINALIZADO: {
    label: "Finalizado",
    tone: "success"
  },
  PENDENTE: {
    label: "Pendente",
    tone: "neutral"
  },
  LIBERADO: {
    label: "Liberado",
    tone: "brand"
  }
};
function StatusBadge({
  status,
  label,
  size = "md",
  dot = true
}) {
  const cfg = STATUS[status] || {
    label: label || status,
    tone: "neutral"
  };
  return /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: cfg.tone,
    dot: dot,
    size: size
  }, label || cfg.label);
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
/**
 * Colmeia Toast — transient inline notification. Semantic left accent +
 * Material icon. Render inside a fixed stack in product code.
 */
const CFG = {
  success: {
    icon: "check_circle",
    color: "var(--color-success-text)",
    bg: "var(--color-success-bg)"
  },
  error: {
    icon: "error",
    color: "var(--color-error-text)",
    bg: "var(--color-error-bg)"
  },
  warning: {
    icon: "warning",
    color: "var(--color-warning-text)",
    bg: "var(--color-warning-bg)"
  },
  info: {
    icon: "info",
    color: "var(--color-info-text)",
    bg: "var(--color-info-bg)"
  }
};
function Toast({
  tone = "info",
  title,
  message,
  onClose,
  style = {}
}) {
  const c = CFG[tone] || CFG.info;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      minWidth: "300px",
      maxWidth: "420px",
      padding: "12px 14px",
      background: "var(--surface-card)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-lg)",
      borderLeft: `3px solid ${c.color}`,
      fontFamily: "var(--font-body)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: "22px",
      color: c.color,
      flexShrink: 0
    }
  }, c.icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "13px",
      fontWeight: 700,
      color: "var(--text-strong)"
    }
  }, title), message && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "13px",
      color: "var(--text-secondary)",
      marginTop: title ? "2px" : 0
    }
  }, message)), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Fechar",
    style: {
      background: "transparent",
      border: "none",
      cursor: "pointer",
      color: "var(--text-muted)",
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: "18px"
    }
  }, "close")));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Colmeia Button — primary action control.
 * Variants: primary (brand orange), secondary (outline), ghost, danger.
 * Flat, 8px radius, 0.5px tracking on the label.
 */
function Button({
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
    sm: {
      padding: "6px 12px",
      fontSize: "13px",
      height: "32px",
      gap: "6px"
    },
    md: {
      padding: "9px 16px",
      fontSize: "14px",
      height: "40px",
      gap: "8px"
    },
    lg: {
      padding: "12px 20px",
      fontSize: "15px",
      height: "46px",
      gap: "8px"
    }
  };
  const variants = {
    primary: {
      background: "var(--brand-primary)",
      color: "var(--brand-on-primary)",
      border: "1px solid var(--brand-primary)"
    },
    secondary: {
      background: "var(--surface-card)",
      color: "var(--text-body)",
      border: "1px solid var(--border-input)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid transparent"
    },
    danger: {
      background: "var(--color-error-text)",
      color: "#fff",
      border: "1px solid var(--color-error-text)"
    }
  };
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  const isDisabled = disabled || loading;
  const [hover, setHover] = React.useState(false);
  const hoverBg = {
    primary: "var(--brand-primary-hover)",
    secondary: "var(--surface-app)",
    ghost: "var(--surface-nav-hover)",
    danger: "var(--color-error-strong)"
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: isDisabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
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
      ...(hover && !isDisabled ? {
        background: hoverBg,
        borderColor: hover && variant === "secondary" ? "var(--border-structural)" : hoverBg
      } : {}),
      ...style
    }
  }, rest), loading && /*#__PURE__*/React.createElement("span", {
    style: {
      width: "15px",
      height: "15px",
      border: "2px solid currentColor",
      borderTopColor: "transparent",
      borderRadius: "50%",
      animation: "colmeia-spin 0.7s linear infinite",
      display: "inline-block"
    }
  }), !loading && iconLeft, children, !loading && iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ConfirmDialog.jsx
try { (() => {
/**
 * Colmeia ConfirmDialog — confirmation modal for destructive or
 * irreversible actions. Mirrors the "Confirmar Exclusão" flow.
 */
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  message,
  highlight,
  note = "Esta ação não poderá ser desfeita.",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  tone = "danger",
  loading = false
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Modal, {
    open: open,
    onClose: onClose,
    title: title,
    width: 460,
    closeOnBackdrop: !loading,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: "secondary",
      onClick: onClose,
      disabled: loading
    }, cancelText), /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: tone === "danger" ? "danger" : "primary",
      onClick: onConfirm,
      loading: loading
    }, confirmText))
  }, message && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 12px",
      color: "var(--text-body)"
    }
  }, message), highlight && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 12px",
      fontWeight: 700,
      fontSize: "16px",
      color: "var(--brand-primary)",
      wordBreak: "break-word"
    }
  }, "\u201C", highlight, "\u201D"), note && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "13px",
      color: "var(--text-secondary)"
    }
  }, note));
}
Object.assign(__ds_scope, { ConfirmDialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ConfirmDialog.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Colmeia Checkbox — square check with brand-orange fill when checked.
 */
function Checkbox({
  checked = false,
  onChange,
  disabled = false,
  label,
  indeterminate = false,
  style = {},
  ...rest
}) {
  const box = /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "18px",
      height: "18px",
      borderRadius: "var(--radius-sm)",
      border: checked || indeterminate ? "1px solid var(--brand-primary)" : "1px solid var(--border-input)",
      background: checked || indeterminate ? "var(--brand-primary)" : "var(--surface-card)",
      transition: "background var(--duration-fast), border-color var(--duration-fast)",
      flexShrink: 0
    }
  }, (checked || indeterminate) && /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: "16px",
      color: "#fff",
      fontWeight: 700
    }
  }, indeterminate ? "remove" : "check"));
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-body)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.checked),
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), box, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "13px",
      color: "var(--text-body)"
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Colmeia IconButton — square/round icon-only control.
 * Pass a Material Symbols glyph name via `icon`, or arbitrary children.
 * Default neutral charcoal, hovers toward the brand orange (or danger).
 */
function IconButton({
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
    sm: {
      box: 28,
      glyph: 18
    },
    md: {
      box: 36,
      glyph: 22
    },
    lg: {
      box: 44,
      glyph: 26
    }
  };
  const s = sizes[size] || sizes.md;
  const [hover, setHover] = React.useState(false);
  const hoverColor = tone === "danger" ? "var(--color-error-text)" : "var(--brand-primary)";
  const baseColor = "var(--text-body)";
  const variants = {
    bare: {
      background: hover && !disabled ? "var(--surface-nav-hover)" : "transparent",
      border: "1px solid transparent"
    },
    outline: {
      background: hover && !disabled ? "var(--surface-app)" : "var(--surface-card)",
      border: "1px solid var(--border-input)"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
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
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: `${s.glyph}px`
    }
  }, icon) : children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Colmeia Input — labelled text field with optional leading icon,
 * helper text, and error state. 8px radius, brand-orange focus ring.
 */
function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon = null,
  iconRight = null,
  error = "",
  helper = "",
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || React.useId();
  const hasError = Boolean(error);
  const borderColor = hasError ? "var(--color-error-text)" : focus ? "var(--brand-primary)" : "var(--border-input)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      fontFamily: "var(--font-body)",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--text-body)",
      letterSpacing: "0.3px"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      height: "40px",
      padding: "0 12px",
      background: disabled ? "var(--surface-app)" : "var(--surface-card)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius-lg)",
      boxShadow: focus && !hasError ? "0 0 0 3px var(--brand-primary-wash)" : "none",
      transition: "border-color var(--duration-base), box-shadow var(--duration-base)"
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: "20px",
      color: "var(--text-secondary)"
    }
  }, icon), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-body)",
      fontSize: "14px",
      color: "var(--text-strong)",
      minWidth: 0
    }
  }, rest)), iconRight), (error || helper) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "11px",
      color: hasError ? "var(--color-error-text)" : "var(--text-secondary)"
    }
  }, error || helper));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Colmeia Select — labelled native select styled to match Input.
 * `options` is an array of { value, label } or strings.
 */
function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  error = "",
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const selectId = id || React.useId();
  const hasError = Boolean(error);
  const norm = options.map(o => typeof o === "string" ? {
    value: o,
    label: o
  } : o);
  const borderColor = hasError ? "var(--color-error-text)" : focus ? "var(--brand-primary)" : "var(--border-input)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      fontFamily: "var(--font-body)",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: selectId,
    style: {
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--text-body)",
      letterSpacing: "0.3px"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: selectId,
    value: value,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: "none",
      WebkitAppearance: "none",
      width: "100%",
      height: "40px",
      padding: "0 36px 0 12px",
      background: disabled ? "var(--surface-app)" : "var(--surface-card)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius-lg)",
      boxShadow: focus && !hasError ? "0 0 0 3px var(--brand-primary-wash)" : "none",
      fontFamily: "var(--font-body)",
      fontSize: "14px",
      color: value ? "var(--text-strong)" : "var(--text-muted)",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "border-color var(--duration-base), box-shadow var(--duration-base)",
      outline: "none"
    }
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder), norm.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value,
    style: {
      color: "var(--text-strong)"
    }
  }, o.label))), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      position: "absolute",
      right: "10px",
      fontSize: "20px",
      color: "var(--text-secondary)",
      pointerEvents: "none"
    }
  }, "keyboard_arrow_down")), error && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "11px",
      color: "var(--color-error-text)"
    }
  }, error));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Colmeia Switch — pill toggle. Brand orange when on.
 * Matches the "liberar para agência" toggle in Meus Roteiros.
 */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  label,
  size = "md",
  style = {},
  ...rest
}) {
  const dims = {
    sm: {
      w: 32,
      h: 18,
      knob: 14
    },
    md: {
      w: 36,
      h: 20,
      knob: 16
    }
  }[size] || {
    w: 36,
    h: 20,
    knob: 16
  };
  const toggle = /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      position: "relative",
      width: `${dims.w}px`,
      height: `${dims.h}px`,
      borderRadius: "var(--radius-full)",
      border: "none",
      padding: 0,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      background: checked ? "var(--brand-primary)" : "var(--color-gray-300)",
      transition: "background var(--duration-base) var(--ease-standard)",
      flexShrink: 0
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: "2px",
      left: "2px",
      width: `${dims.knob}px`,
      height: `${dims.knob}px`,
      borderRadius: "50%",
      background: "#fff",
      boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
      transform: checked ? `translateX(${dims.w - dims.knob - 4}px)` : "translateX(0)",
      transition: "transform var(--duration-base) var(--ease-standard)"
    }
  }));
  if (!label) return toggle;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "var(--font-body)",
      ...style
    }
  }, toggle, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "13px",
      color: "var(--text-body)"
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Sidebar.jsx
try { (() => {
/**
 * Colmeia Sidebar — fixed left navigation on the light grey surface.
 * Items are { icon, label, href, active, badge } or section headers
 * ({ section: "RELATÓRIOS" }). Supports a collapsed (icon-only) mode.
 */
function Sidebar({
  logoSrc,
  logoMarkSrc,
  items = [],
  collapsed = false,
  onToggle,
  footer,
  width = 256,
  collapsedWidth = 80
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
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
      transition: "width var(--duration-slow) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "25px",
      margin: "8px 0 40px",
      display: "flex",
      justifyContent: collapsed ? "center" : "flex-start"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: collapsed ? logoMarkSrc || logoSrc : logoSrc,
    alt: "Colmeia",
    style: {
      height: "25px",
      width: "auto",
      objectFit: "contain"
    }
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      flex: 1
    }
  }, items.map((it, i) => it.section ? collapsed ? /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      height: "1px",
      background: "var(--border-subtle)",
      margin: "8px 4px"
    }
  }) : /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: "11px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.6px",
      color: "var(--text-secondary)",
      padding: "12px 8px 4px"
    }
  }, it.section) : /*#__PURE__*/React.createElement(NavItem, {
    key: i,
    item: it,
    collapsed: collapsed
  }))), onToggle && /*#__PURE__*/React.createElement("button", {
    onClick: onToggle,
    style: {
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
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: "20px",
      transform: collapsed ? "rotate(180deg)" : "none"
    }
  }, "chevron_left"), !collapsed && "Ver menos"), footer);
}
function NavItem({
  item,
  collapsed
}) {
  const [hover, setHover] = React.useState(false);
  const active = item.active;
  const bg = active ? "var(--surface-nav-hover)" : hover ? "var(--surface-nav-hover)" : "transparent";
  const color = active || hover ? "var(--text-strong)" : "var(--text-secondary)";
  return /*#__PURE__*/React.createElement("a", {
    href: item.href || "#",
    onClick: item.onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    title: collapsed ? item.label : undefined,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "space-between",
      gap: "10px",
      padding: "7px 8px",
      borderRadius: "var(--radius-lg)",
      background: bg,
      color,
      textDecoration: "none",
      transition: "background var(--duration-base), color var(--duration-base)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      minWidth: 0
    }
  }, item.icon && /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: "20px",
      color: "inherit"
    }
  }, item.icon), !collapsed && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "14px",
      fontWeight: 500,
      letterSpacing: "0.5px",
      whiteSpace: "nowrap"
    }
  }, item.label)), !collapsed && item.badge && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "10px",
      fontWeight: 700,
      color: "var(--brand-primary)",
      background: "var(--brand-primary-wash)",
      padding: "1px 6px",
      borderRadius: "var(--radius-full)"
    }
  }, item.badge));
}
Object.assign(__ds_scope, { Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Sidebar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/**
 * Colmeia Tabs — underline tab strip. `tabs` is [{ key, label, icon? }].
 * Active tab carries the brand-orange underline + label.
 */
function Tabs({
  tabs = [],
  value,
  onChange,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "4px",
      borderBottom: "1px solid var(--border-subtle)",
      fontFamily: "var(--font-brand)",
      ...style
    }
  }, tabs.map(t => {
    const active = t.key === value;
    return /*#__PURE__*/React.createElement(TabButton, {
      key: t.key,
      tab: t,
      active: active,
      onClick: () => onChange && onChange(t.key)
    });
  }));
}
function TabButton({
  tab,
  active,
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
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
      transition: "color var(--duration-base), border-color var(--duration-base)"
    }
  }, tab.icon && /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: "19px"
    }
  }, tab.icon), tab.label, tab.count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "11px",
      fontWeight: 700,
      color: active ? "var(--brand-primary)" : "var(--text-muted)",
      background: active ? "var(--brand-primary-wash)" : "var(--surface-panel)",
      padding: "1px 7px",
      borderRadius: "var(--radius-full)"
    }
  }, tab.count));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Topbar.jsx
try { (() => {
/**
 * Colmeia Topbar — white bar with breadcrumb trail on the left and the
 * user greeting, avatar and logout on the right.
 * breadcrumb: [{ label, href? }]
 */
function Topbar({
  breadcrumb = [],
  userName,
  userPhoto,
  onLogout,
  right
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "72px",
      padding: "0 24px",
      background: "var(--surface-card)",
      borderBottom: "1px solid var(--border-structural)",
      boxSizing: "border-box",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      fontSize: "12px",
      letterSpacing: "0.5px",
      minWidth: 0
    }
  }, breadcrumb.map((b, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      margin: "0 8px",
      color: "var(--text-muted)"
    }
  }, "/"), b.href && i < breadcrumb.length - 1 ? /*#__PURE__*/React.createElement("a", {
    href: b.href,
    style: {
      color: "var(--text-secondary)",
      textDecoration: "none"
    }
  }, b.label) : /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-body)",
      fontWeight: i === breadcrumb.length - 1 ? 600 : 400
    }
  }, b.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "24px"
    }
  }, right, userName && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "12px",
      color: "var(--text-secondary)"
    }
  }, "Ol\xE1, ", userName), /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    src: userPhoto,
    name: userName,
    size: "lg"
  }), onLogout && /*#__PURE__*/React.createElement("button", {
    onClick: onLogout,
    "aria-label": "Sair",
    title: "Sair",
    style: {
      display: "inline-flex",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      color: "var(--text-body)",
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: "24px"
    }
  }, "logout"))));
}
Object.assign(__ds_scope, { Topbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Topbar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/colmeia-app/AppShell.jsx
try { (() => {
/* global React */
// Colmeia app shell — fixed sidebar + topbar + scrollable content + footer.
// Uses DS Sidebar/Topbar from the bundle namespace.

const {
  Sidebar,
  Topbar
} = window.ColmeiaDesignSystem_6ed06a;
function AppShell({
  route,
  onNavigate,
  breadcrumb,
  userName,
  children
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const items = [{
    icon: "home",
    label: "Home",
    key: "home"
  }, {
    icon: "pin_drop",
    label: "Meus roteiros",
    key: "roteiros"
  }, {
    icon: "table_rows",
    label: "Relatório P1A",
    key: "relatorio"
  }, {
    icon: "add_box",
    label: "Criar roteiro",
    key: "criar"
  }, {
    section: "BANCO DE ATIVOS"
  }, {
    icon: "find_in_page",
    label: "Dashboard",
    key: "home"
  }, {
    icon: "difference",
    label: "Consulta endereço",
    key: "consulta"
  }, {
    section: "ADMINISTRAÇÃO"
  }, {
    icon: "group",
    label: "Usuários",
    key: "usuarios"
  }, {
    icon: "inventory_2",
    label: "Inventários",
    key: "inventarios"
  }].map(it => it.section ? it : {
    ...it,
    href: "#",
    active: route === it.key,
    onClick: e => {
      e.preventDefault();
      onNavigate(it.key);
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      background: "var(--surface-canvas)",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    logoSrc: "../../assets/logo-colmeia-full.png",
    logoMarkSrc: "../../assets/logo-colmeia-mark.png",
    items: items,
    collapsed: collapsed,
    onToggle: () => setCollapsed(c => !c)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Topbar, {
    breadcrumb: breadcrumb,
    userName: userName,
    onLogout: () => {}
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflow: "auto",
      background: "var(--surface-canvas)",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, children), /*#__PURE__*/React.createElement("footer", {
    style: {
      borderTop: "1px solid var(--border-structural)",
      padding: "16px",
      textAlign: "center",
      fontSize: "10px",
      fontStyle: "italic",
      letterSpacing: "0.5px",
      color: "var(--text-muted)",
      background: "var(--surface-card)"
    }
  }, "\xA9 2026 Colmeia. All rights are reserved to Be Mediatech OOH."))));
}
window.AppShell = AppShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/colmeia-app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/colmeia-app/HomeDashboard.jsx
try { (() => {
/* global React */
// Home Dashboard — consolidated OOH indicators (health score, KPIs, rankings, pipeline).

const {
  Select,
  Button,
  Badge
} = window.ColmeiaDesignSystem_6ed06a;
function HealthGauge({
  score
}) {
  const s = Math.max(0, Math.min(100, score));
  const ring = s >= 75 ? "var(--color-success-dot)" : s >= 50 ? "var(--color-warning-dot)" : "var(--color-error-text)";
  const label = s >= 75 ? "Saudável" : s >= 50 ? "Atenção" : "Crítico";
  const r = 54,
    c = 2 * Math.PI * r,
    off = c - s / 100 * c;
  return /*#__PURE__*/React.createElement("svg", {
    width: "140",
    height: "140",
    viewBox: "0 0 140 140"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "70",
    cy: "70",
    r: r,
    fill: "none",
    stroke: "var(--color-gray-200)",
    strokeWidth: "10"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "70",
    cy: "70",
    r: r,
    fill: "none",
    stroke: ring,
    strokeWidth: "10",
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: off,
    transform: "rotate(-90 70 70)",
    style: {
      transition: "stroke-dashoffset 0.8s ease"
    }
  }), /*#__PURE__*/React.createElement("text", {
    x: "70",
    y: "66",
    textAnchor: "middle",
    fill: "var(--text-strong)",
    fontSize: "30",
    fontWeight: "700",
    fontFamily: "var(--font-brand)"
  }, s), /*#__PURE__*/React.createElement("text", {
    x: "70",
    y: "86",
    textAnchor: "middle",
    fill: "var(--text-secondary)",
    fontSize: "11",
    fontWeight: "500"
  }, label));
}
function DimBar({
  label,
  score
}) {
  const color = score >= 75 ? "var(--color-success-dot)" : score >= 50 ? "var(--color-warning-dot)" : "var(--color-error-text)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-secondary)",
      fontWeight: 500
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-strong)",
      fontWeight: 700
    }
  }, score)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 7,
      background: "var(--surface-panel)",
      borderRadius: "var(--radius-full)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: `${score}%`,
      background: color,
      borderRadius: "var(--radius-full)",
      transition: "width 0.6s ease"
    }
  })));
}
function Card({
  title,
  children,
  action
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-xl)",
      padding: 18
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.6px",
      color: "var(--text-secondary)"
    }
  }, title), action), children);
}
function Kpi({
  label,
  value,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-xl)",
      padding: 16,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      height: 3,
      width: "100%",
      background: "var(--brand-primary)"
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: "0.6px",
      color: "var(--text-secondary)",
      fontWeight: 700
    }
  }, label), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "10px 0 0",
      fontSize: 30,
      fontWeight: 700,
      lineHeight: 1,
      color: "var(--text-strong)",
      fontFamily: "var(--font-brand)"
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      borderTop: "1px solid var(--border-subtle)",
      paddingTop: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      color: "var(--text-secondary)"
    }
  }, sub)));
}
function Rank({
  items,
  color
}) {
  const max = Math.max(...items.map(i => i.v), 1);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 9
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: it.n,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "var(--text-muted)",
      width: 14
    }
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-body)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, it.n), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text-strong)",
      marginLeft: 8
    }
  }, it.v.toLocaleString("pt-BR"))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: "var(--surface-panel)",
      borderRadius: "var(--radius-full)",
      marginTop: 4,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: `${it.v / max * 100}%`,
      background: color,
      borderRadius: "var(--radius-full)"
    }
  }))))));
}
function HomeDashboard() {
  const [periodo, setPeriodo] = React.useState("30d");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 24px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--font-brand)",
      fontSize: 20,
      fontWeight: 700,
      color: "var(--text-strong)"
    }
  }, "Dashboard Colmeia"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: 12,
      color: "var(--text-secondary)"
    }
  }, "Vis\xE3o consolidada de ativos, roteiros e performance OOH")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 150
    }
  }, /*#__PURE__*/React.createElement(Select, {
    value: "",
    placeholder: "Pra\xE7a: Todas",
    options: ["São Paulo", "Rio de Janeiro"]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 130
    }
  }, /*#__PURE__*/React.createElement(Select, {
    value: periodo,
    onChange: e => setPeriodo(e.target.value),
    options: [{
      value: "7d",
      label: "7 dias"
    }, {
      value: "30d",
      label: "30 dias"
    }, {
      value: "90d",
      label: "90 dias"
    }]
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary"
  }, "Atualizar"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(280px, 1fr) 2fr",
      gap: 16,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Health Score",
    action: /*#__PURE__*/React.createElement(Badge, {
      tone: "success",
      size: "sm"
    }, "v2.1")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(HealthGauge, {
    score: 78
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      marginTop: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(DimBar, {
    label: "Cobertura",
    score: 82
  }), /*#__PURE__*/React.createElement(DimBar, {
    label: "Diversidade",
    score: 71
  }), /*#__PURE__*/React.createElement(DimBar, {
    label: "Qualidade",
    score: 88
  }), /*#__PURE__*/React.createElement(DimBar, {
    label: "Capacidade",
    score: 64
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 12,
      alignContent: "start"
    }
  }, /*#__PURE__*/React.createElement(Kpi, {
    label: "Pontos Ativos",
    value: "12,4k",
    sub: "M\xE9dia 8.240 passantes/pto"
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "Pra\xE7as Cobertas",
    value: "318",
    sub: "64,2% Vias P\xFAblicas"
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "Exibidores Ativos",
    value: "96",
    sub: "35,8% Indoor"
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "Roteiros Totais",
    value: "1.284",
    sub: "3 em processamento"
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "Finalizados",
    value: "1.197",
    sub: "142 no per\xEDodo"
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "Impactos OOH",
    value: "48,6M",
    sub: "GRP: 312"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Top Pra\xE7as"
  }, /*#__PURE__*/React.createElement(Rank, {
    color: "var(--brand-primary)",
    items: [{
      n: "São Paulo",
      v: 3820
    }, {
      n: "Rio de Janeiro",
      v: 2410
    }, {
      n: "Belo Horizonte",
      v: 1560
    }, {
      n: "Curitiba",
      v: 1180
    }, {
      n: "Porto Alegre",
      v: 980
    }]
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Top Exibidores"
  }, /*#__PURE__*/React.createElement(Rank, {
    color: "var(--color-ink-700)",
    items: [{
      n: "Eletromidia",
      v: 2940
    }, {
      n: "Otima",
      v: 2110
    }, {
      n: "JCDecaux",
      v: 1730
    }, {
      n: "Clear Channel",
      v: 1280
    }, {
      n: "Helloo",
      v: 760
    }]
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Pipeline de Roteiros"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 8,
      marginBottom: 12
    }
  }, [{
    v: "1.284",
    l: "Total"
  }, {
    v: "3",
    l: "Processando"
  }, {
    v: "1.197",
    l: "Finalizados"
  }].map(b => /*#__PURE__*/React.createElement("div", {
    key: b.l,
    style: {
      background: "var(--surface-panel)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "10px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 18,
      fontWeight: 700,
      color: "var(--text-strong)"
    }
  }, b.v), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: 9,
      textTransform: "uppercase",
      color: "var(--text-muted)",
      fontWeight: 600
    }
  }, b.l)))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 8px",
      fontSize: 10,
      fontWeight: 700,
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Recentes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, [{
    n: "Campanha Verão — SP",
    d: "12/03",
    p: false
  }, {
    n: "Lançamento Filial RJ",
    d: "10/03",
    p: true
  }, {
    n: "Black Friday Nacional",
    d: "08/03",
    p: false
  }].map(r => /*#__PURE__*/React.createElement("div", {
    key: r.n,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 12,
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      padding: "5px 8px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      flexShrink: 0,
      background: r.p ? "var(--color-warning-dot)" : "var(--color-success-dot)",
      animation: r.p ? "colmeia-pulse 1.5s infinite" : "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      color: "var(--text-body)"
    }
  }, r.n), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "var(--text-muted)"
    }
  }, r.d)))))));
}
window.HomeDashboard = HomeDashboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/colmeia-app/HomeDashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/colmeia-app/MeusRoteiros.jsx
try { (() => {
/* global React */
// Meus Roteiros — the signature table/dashboard screen.

const {
  DataTable,
  Pagination,
  StatusBadge,
  Switch,
  IconButton,
  Input,
  ConfirmDialog,
  Spinner
} = window.ColmeiaDesignSystem_6ed06a;
const SEED = [{
  id: 48217,
  nome: "Campanha Verão — São Paulo Capital",
  data: "12/03/2026 14:20",
  status: "FINALIZADO",
  proc: false,
  sem: 4,
  lib: true,
  ag: "Be180"
}, {
  id: 48198,
  nome: "Lançamento Filial — Rio de Janeiro",
  data: "10/03/2026 09:05",
  status: "EM_ANALISE",
  proc: true,
  sem: 2,
  lib: false,
  ag: "—"
}, {
  id: 48155,
  nome: "Black Friday Nacional 2026",
  data: "08/03/2026 17:42",
  status: "EM_ANALISE",
  proc: false,
  sem: 6,
  lib: true,
  ag: "MullenLowe"
}, {
  id: 48120,
  nome: "Institucional — Belo Horizonte",
  data: "01/03/2026 11:30",
  status: "PARA_CORRIGIR",
  proc: false,
  sem: 1,
  lib: false,
  ag: "—"
}, {
  id: 48097,
  nome: "Outdoor Litoral — Santos / Guarujá",
  data: "27/02/2026 16:14",
  status: "FINALIZADO",
  proc: false,
  sem: 3,
  lib: true,
  ag: "Be180"
}, {
  id: 48066,
  nome: "Mobiliário Urbano — Curitiba",
  data: "22/02/2026 08:50",
  status: "REJEITADO",
  proc: false,
  sem: 2,
  lib: false,
  ag: "—"
}, {
  id: 48041,
  nome: "Painel LED — Av. Paulista",
  data: "18/02/2026 13:22",
  status: "FINALIZADO",
  proc: false,
  sem: 8,
  lib: true,
  ag: "DM9"
}];
function MeusRoteiros() {
  const [rows, setRows] = React.useState(SEED);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [del, setDel] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);
  const hasProcessing = rows.some(r => r.proc);
  const filtered = rows.filter(r => r.nome.toLowerCase().includes(search.toLowerCase()));
  const setLib = (id, v) => setRows(rs => rs.map(r => r.id === id ? {
    ...r,
    lib: v
  } : r));
  const setStatus = (id, v) => setRows(rs => rs.map(r => r.id === id ? {
    ...r,
    status: v
  } : r));
  const confirmDelete = () => {
    setDeleting(true);
    setTimeout(() => {
      setRows(rs => rs.filter(r => r.id !== del.id));
      setDeleting(false);
      setDel(null);
    }, 900);
  };
  const STATUS_OPTS = ["FINALIZADO", "EM_ANALISE", "PARA_CORRIGIR", "REJEITADO", "LIBERADO"];
  const columns = [{
    key: "nome",
    header: "Nome",
    render: r => /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-block",
        maxWidth: 320,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, r.nome)
  }, {
    key: "data",
    header: "Data de criação",
    render: r => /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: "var(--text-body)"
      }
    }, r.data)
  }, {
    key: "status",
    header: "Status",
    align: "center",
    render: r => /*#__PURE__*/React.createElement(StatusSelect, {
      value: r.status,
      options: STATUS_OPTS,
      onChange: v => setStatus(r.id, v)
    })
  }, {
    key: "proc",
    header: "Processamento",
    render: r => r.proc ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Spinner, {
      size: 14,
      color: "var(--color-warning-dot)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: "var(--color-warning-text)",
        fontWeight: 500
      }
    }, "Processando")) : /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "material-symbols-outlined",
      style: {
        fontSize: 18,
        color: "var(--text-body)"
      }
    }, "check_circle"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: "var(--text-body)",
        fontWeight: 500
      }
    }, "Finalizado"))
  }, {
    key: "sem",
    header: "Período",
    render: r => `${r.sem} ${r.sem === 1 ? "semana" : "semanas"}`
  }, {
    key: "lib",
    header: "Agência",
    align: "center",
    render: r => /*#__PURE__*/React.createElement(Switch, {
      checked: r.lib,
      onChange: v => setLib(r.id, v)
    })
  }, {
    key: "acoes",
    header: "",
    align: "right",
    render: r => /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        gap: 4,
        justifyContent: "flex-end"
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      icon: "pin_drop",
      label: "Ver no mapa"
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "difference",
      label: "Visualizar resultados"
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "delete",
      tone: "danger",
      label: "Excluir roteiro",
      onClick: () => setDel(r)
    }))
  }];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "20px 24px 12px",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--font-brand)",
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: "0.8px",
      textTransform: "uppercase",
      color: "var(--text-strong)"
    }
  }, "Meus roteiros"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, hasProcessing && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontSize: 12,
      color: "var(--color-warning-text)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "var(--color-warning-dot)",
      animation: "colmeia-pulse 1.5s ease-in-out infinite"
    }
  }), "Atualizando automaticamente"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 360
    }
  }, /*#__PURE__*/React.createElement(Input, {
    icon: "search",
    placeholder: "Buscar por nome do roteiro...",
    value: search,
    onChange: e => setSearch(e.target.value),
    iconRight: search ? /*#__PURE__*/React.createElement("span", {
      className: "material-symbols-outlined",
      style: {
        fontSize: 18,
        color: "var(--text-muted)",
        cursor: "pointer"
      },
      onClick: () => setSearch("")
    }, "close") : null
  })))), /*#__PURE__*/React.createElement(DataTable, {
    columns: columns,
    rows: filtered,
    rowKey: r => r.id,
    loading: loading,
    emptyMessage: search ? "Nenhum roteiro encontrado com esse termo" : "Nenhum roteiro encontrado"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      padding: "16px",
      borderTop: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(Pagination, {
    currentPage: page,
    totalPages: 42,
    onPageChange: setPage
  })), /*#__PURE__*/React.createElement(ConfirmDialog, {
    open: !!del,
    onClose: () => !deleting && setDel(null),
    onConfirm: confirmDelete,
    title: "Confirmar Exclus\xE3o",
    message: "Tem certeza que deseja excluir o roteiro:",
    highlight: del?.nome,
    confirmText: "Excluir Roteiro",
    loading: deleting
  }));
}

// Status shown as a compact, color-coded select (internal-user behavior).
function StatusSelect({
  value,
  options,
  onChange
}) {
  const LABELS = {
    FINALIZADO: "Finalizado",
    EM_ANALISE: "Em análise",
    PARA_CORRIGIR: "Para corrigir",
    REJEITADO: "Rejeitado",
    LIBERADO: "Liberado"
  };
  const TONE = {
    FINALIZADO: ["var(--color-success-text)"],
    EM_ANALISE: ["var(--color-warning-text)"],
    PARA_CORRIGIR: ["var(--color-error-text)"],
    REJEITADO: ["var(--color-neutral-text)"],
    LIBERADO: ["var(--brand-primary)"]
  };
  const color = (TONE[value] || ["var(--text-body)"])[0];
  return /*#__PURE__*/React.createElement("select", {
    value: value,
    onChange: e => onChange(e.target.value),
    style: {
      appearance: "none",
      WebkitAppearance: "none",
      border: `1px solid ${color}55`,
      color,
      background: "transparent",
      borderRadius: "var(--radius-md)",
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: "0.3px",
      padding: "3px 22px 3px 10px",
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 6px center"
    }
  }, options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o,
    style: {
      color: "var(--text-strong)"
    }
  }, LABELS[o] || o)));
}
window.MeusRoteiros = MeusRoteiros;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/colmeia-app/MeusRoteiros.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.Pagination = __ds_scope.Pagination;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.ConfirmDialog = __ds_scope.ConfirmDialog;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Spinner = __ds_scope.Spinner;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Sidebar = __ds_scope.Sidebar;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Topbar = __ds_scope.Topbar;

})();
