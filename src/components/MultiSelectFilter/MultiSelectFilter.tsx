import React, { useEffect, useMemo, useRef, useState } from "react";

// ── MultiSelectFilter ────────────────────────────────────────────────────────
// Combobox multiselect que ESPELHA o input de busca da tela "Meus Roteiros",
// para se integrar sem destoar: borda gray-300, rounded-lg, py-2, text-sm,
// foco laranja #FF9800 (mesmo accent do search e dos toggles desta tela).
//
// Opções `pinned` (ex.: o próprio usuário) sobem para o topo, com destaque
// e um selo (pinnedLabel, ex.: "Você").
// ─────────────────────────────────────────────────────────────────────────────

export interface MultiSelectOption {
  value: string;
  label: string;
  pinned?: boolean;
  pinnedLabel?: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
  className?: string;
}

const ACCENT = "#FF9800";

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  options,
  selected,
  onChange,
  searchable = false,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const opcoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const arr = termo
      ? options.filter((o) => o.label.toLowerCase().includes(termo))
      : options;
    return [...arr].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return a.label.localeCompare(b.label, "pt-BR");
    });
  }, [options, busca]);

  const count = selected.length;
  const ativo = count > 0;

  const toggle = (value: string) =>
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );

  const limpar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      {/* Trigger — espelha o input de busca (gray-300, rounded-lg, py-2, foco #FF9800) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-all duration-200 ${
          open
            ? "border-transparent ring-2 ring-[#FF9800]"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <span className={`flex-1 text-left truncate ${ativo ? "text-[#222] font-medium" : "text-gray-400"}`}>
          {label}{ativo ? ` · ${count}` : ""}
        </span>
        <svg
          width="16" height="16" viewBox="0 0 20 20" fill="none"
          className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Painel */}
      {open && (
        <div className="absolute left-0 z-50 mt-1 w-full min-w-[15rem] max-w-[90vw] rounded-lg border border-gray-200 bg-white shadow-lg">
          {searchable && (
            <div className="border-b border-gray-100 p-2">
              <input
                autoFocus
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={`Buscar ${label.toLowerCase()}...`}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-[#3A3A3A] outline-none focus:ring-2 focus:ring-[#FF9800] focus:border-transparent transition-all duration-200"
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto py-1">
            {opcoesFiltradas.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-gray-400">Nenhuma opção</p>
            ) : (
              opcoesFiltradas.map((o, idx) => {
                const checked = selected.includes(o.value);
                const showDivider =
                  o.pinned && opcoesFiltradas[idx + 1] && !opcoesFiltradas[idx + 1].pinned;
                return (
                  <React.Fragment key={o.value}>
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm text-[#3A3A3A] hover:bg-gray-50 ${
                        o.pinned ? "bg-[#FF9800]/[0.08]" : ""
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggle(o.value)} className="sr-only" />
                      <span
                        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border"
                        style={checked ? { backgroundColor: ACCENT, borderColor: ACCENT } : { borderColor: "#d1d5db" }}
                      >
                        {checked && (
                          <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
                            <path d="M4 10.5 8 14.5 16 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="flex-1 truncate">{o.label}</span>
                      {o.pinned && o.pinnedLabel && (
                        <span
                          className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ color: ACCENT, borderColor: `${ACCENT}66` }}
                        >
                          {o.pinnedLabel}
                        </span>
                      )}
                    </label>
                    {showDivider && <div className="my-1 border-t border-gray-100" />}
                  </React.Fragment>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
            <span className="text-[11px] text-gray-400">
              {count > 0 ? `${count} selecionado${count > 1 ? "s" : ""}` : "Nenhum filtro"}
            </span>
            {count > 0 && (
              <button type="button" onClick={limpar} className="text-[11px] font-semibold hover:underline" style={{ color: ACCENT }}>
                Limpar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
