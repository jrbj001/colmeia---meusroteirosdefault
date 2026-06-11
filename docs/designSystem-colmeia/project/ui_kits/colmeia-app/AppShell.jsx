/* global React */
// Colmeia app shell — fixed sidebar + topbar + scrollable content + footer.
// Uses DS Sidebar/Topbar from the bundle namespace.

const { Sidebar, Topbar } = window.ColmeiaDesignSystem_6ed06a;

function AppShell({ route, onNavigate, breadcrumb, userName, children }) {
  const [collapsed, setCollapsed] = React.useState(false);

  const items = [
    { icon: "home", label: "Home", key: "home" },
    { icon: "pin_drop", label: "Meus roteiros", key: "roteiros" },
    { icon: "table_rows", label: "Relatório P1A", key: "relatorio" },
    { icon: "add_box", label: "Criar roteiro", key: "criar" },
    { section: "BANCO DE ATIVOS" },
    { icon: "find_in_page", label: "Dashboard", key: "home" },
    { icon: "difference", label: "Consulta endereço", key: "consulta" },
    { section: "ADMINISTRAÇÃO" },
    { icon: "group", label: "Usuários", key: "usuarios" },
    { icon: "inventory_2", label: "Inventários", key: "inventarios" },
  ].map((it) =>
    it.section ? it : { ...it, href: "#", active: route === it.key, onClick: (e) => { e.preventDefault(); onNavigate(it.key); } }
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--surface-canvas)", fontFamily: "var(--font-body)" }}>
      <Sidebar
        logoSrc="../../assets/logo-colmeia-full.png"
        logoMarkSrc="../../assets/logo-colmeia-mark.png"
        items={items}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar breadcrumb={breadcrumb} userName={userName} onLogout={() => {}} />
        <main style={{ flex: 1, overflow: "auto", background: "var(--surface-canvas)", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1 }}>{children}</div>
          <footer
            style={{
              borderTop: "1px solid var(--border-structural)",
              padding: "16px",
              textAlign: "center",
              fontSize: "10px",
              fontStyle: "italic",
              letterSpacing: "0.5px",
              color: "var(--text-muted)",
              background: "var(--surface-card)",
            }}
          >
            © 2026 Colmeia. All rights are reserved to Be Mediatech OOH.
          </footer>
        </main>
      </div>
    </div>
  );
}

window.AppShell = AppShell;
