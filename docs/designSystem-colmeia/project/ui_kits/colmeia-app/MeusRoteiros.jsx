/* global React */
// Meus Roteiros — the signature table/dashboard screen.

const { DataTable, Pagination, StatusBadge, Switch, IconButton, Input, ConfirmDialog, Spinner } =
  window.ColmeiaDesignSystem_6ed06a;

const SEED = [
  { id: 48217, nome: "Campanha Verão — São Paulo Capital", data: "12/03/2026 14:20", status: "FINALIZADO", proc: false, sem: 4, lib: true, ag: "Be180" },
  { id: 48198, nome: "Lançamento Filial — Rio de Janeiro", data: "10/03/2026 09:05", status: "EM_ANALISE", proc: true, sem: 2, lib: false, ag: "—" },
  { id: 48155, nome: "Black Friday Nacional 2026", data: "08/03/2026 17:42", status: "EM_ANALISE", proc: false, sem: 6, lib: true, ag: "MullenLowe" },
  { id: 48120, nome: "Institucional — Belo Horizonte", data: "01/03/2026 11:30", status: "PARA_CORRIGIR", proc: false, sem: 1, lib: false, ag: "—" },
  { id: 48097, nome: "Outdoor Litoral — Santos / Guarujá", data: "27/02/2026 16:14", status: "FINALIZADO", proc: false, sem: 3, lib: true, ag: "Be180" },
  { id: 48066, nome: "Mobiliário Urbano — Curitiba", data: "22/02/2026 08:50", status: "REJEITADO", proc: false, sem: 2, lib: false, ag: "—" },
  { id: 48041, nome: "Painel LED — Av. Paulista", data: "18/02/2026 13:22", status: "FINALIZADO", proc: false, sem: 8, lib: true, ag: "DM9" },
];

function MeusRoteiros() {
  const [rows, setRows] = React.useState(SEED);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [del, setDel] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  const hasProcessing = rows.some((r) => r.proc);

  const filtered = rows.filter((r) => r.nome.toLowerCase().includes(search.toLowerCase()));

  const setLib = (id, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, lib: v } : r)));
  const setStatus = (id, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: v } : r)));

  const confirmDelete = () => {
    setDeleting(true);
    setTimeout(() => {
      setRows((rs) => rs.filter((r) => r.id !== del.id));
      setDeleting(false);
      setDel(null);
    }, 900);
  };

  const STATUS_OPTS = ["FINALIZADO", "EM_ANALISE", "PARA_CORRIGIR", "REJEITADO", "LIBERADO"];

  const columns = [
    { key: "nome", header: "Nome", render: (r) => <span style={{ display: "inline-block", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nome}</span> },
    { key: "data", header: "Data de criação", render: (r) => <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-body)" }}>{r.data}</span> },
    {
      key: "status", header: "Status", align: "center",
      render: (r) => <StatusSelect value={r.status} options={STATUS_OPTS} onChange={(v) => setStatus(r.id, v)} />,
    },
    {
      key: "proc", header: "Processamento",
      render: (r) =>
        r.proc ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Spinner size={14} color="var(--color-warning-dot)" />
            <span style={{ fontSize: 13, color: "var(--color-warning-text)", fontWeight: 500 }}>Processando</span>
          </span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--text-body)" }}>check_circle</span>
            <span style={{ fontSize: 13, color: "var(--text-body)", fontWeight: 500 }}>Finalizado</span>
          </span>
        ),
    },
    { key: "sem", header: "Período", render: (r) => `${r.sem} ${r.sem === 1 ? "semana" : "semanas"}` },
    {
      key: "lib", header: "Agência", align: "center",
      render: (r) => <Switch checked={r.lib} onChange={(v) => setLib(r.id, v)} />,
    },
    {
      key: "acoes", header: "", align: "right",
      render: (r) => (
        <span style={{ display: "inline-flex", gap: 4, justifyContent: "flex-end" }}>
          <IconButton icon="pin_drop" label="Ver no mapa" />
          <IconButton icon="difference" label="Visualizar resultados" />
          <IconButton icon="delete" tone="danger" label="Excluir roteiro" onClick={() => setDel(r)} />
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 12px", gap: 16 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "var(--text-strong)" }}>
          Meus roteiros
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {hasProcessing && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-warning-text)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-warning-dot)", animation: "colmeia-pulse 1.5s ease-in-out infinite" }} />
              Atualizando automaticamente
            </span>
          )}
          <div style={{ width: 360 }}>
            <Input icon="search" placeholder="Buscar por nome do roteiro..." value={search} onChange={(e) => setSearch(e.target.value)}
              iconRight={search ? <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--text-muted)", cursor: "pointer" }} onClick={() => setSearch("")}>close</span> : null} />
          </div>
        </div>
      </div>

      <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} loading={loading}
        emptyMessage={search ? "Nenhum roteiro encontrado com esse termo" : "Nenhum roteiro encontrado"} />

      <div style={{ display: "flex", justifyContent: "center", padding: "16px", borderTop: "1px solid var(--border-subtle)" }}>
        <Pagination currentPage={page} totalPages={42} onPageChange={setPage} />
      </div>

      <ConfirmDialog
        open={!!del}
        onClose={() => !deleting && setDel(null)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir o roteiro:"
        highlight={del?.nome}
        confirmText="Excluir Roteiro"
        loading={deleting}
      />
    </div>
  );
}

// Status shown as a compact, color-coded select (internal-user behavior).
function StatusSelect({ value, options, onChange }) {
  const LABELS = { FINALIZADO: "Finalizado", EM_ANALISE: "Em análise", PARA_CORRIGIR: "Para corrigir", REJEITADO: "Rejeitado", LIBERADO: "Liberado" };
  const TONE = {
    FINALIZADO: ["var(--color-success-text)"], EM_ANALISE: ["var(--color-warning-text)"],
    PARA_CORRIGIR: ["var(--color-error-text)"], REJEITADO: ["var(--color-neutral-text)"], LIBERADO: ["var(--brand-primary)"],
  };
  const color = (TONE[value] || ["var(--text-body)"])[0];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: "none", WebkitAppearance: "none",
        border: `1px solid ${color}55`, color, background: "transparent",
        borderRadius: "var(--radius-md)", fontSize: 12, fontWeight: 600, letterSpacing: "0.3px",
        padding: "3px 22px 3px 10px", cursor: "pointer", fontFamily: "var(--font-body)",
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>\")",
        backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center",
      }}
    >
      {options.map((o) => <option key={o} value={o} style={{ color: "var(--text-strong)" }}>{LABELS[o] || o}</option>)}
    </select>
  );
}

window.MeusRoteiros = MeusRoteiros;
