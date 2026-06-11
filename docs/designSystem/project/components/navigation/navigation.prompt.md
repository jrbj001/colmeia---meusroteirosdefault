Navigation chrome — the fixed sidebar, the topbar with breadcrumbs, and an underline tab strip.

```jsx
<Sidebar
  logoSrc="assets/logo-colmeia-full.png"
  logoMarkSrc="assets/logo-colmeia-mark.png"
  collapsed={collapsed}
  onToggle={() => setCollapsed(c => !c)}
  items={[
    { icon: "home", label: "Home", href: "#", active: true },
    { icon: "pin_drop", label: "Meus roteiros", href: "#" },
    { section: "BANCO DE ATIVOS" },
    { icon: "find_in_page", label: "Dashboard", href: "#" },
  ]}
/>
<Topbar breadcrumb={[{label:"Home",href:"#"},{label:"Meus roteiros"}]} userName="Maria Souza" onLogout={logout} />
<Tabs tabs={[{key:"vp",label:"Vias públicas"},{key:"in",label:"Indoor",count:42}]} value={tab} onChange={setTab} />
```

Sidebar/Topbar/Tabs icons are Material Symbols Outlined glyph names — load that font. The Sidebar takes the logo paths as props so it stays portable.
