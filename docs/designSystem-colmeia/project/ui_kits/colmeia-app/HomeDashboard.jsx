/* global React */
// Home Dashboard — consolidated OOH indicators (health score, KPIs, rankings, pipeline).

const { Select, Button, Badge } = window.ColmeiaDesignSystem_6ed06a;

function HealthGauge({ score }) {
  const s = Math.max(0, Math.min(100, score));
  const ring = s >= 75 ? "var(--color-success-dot)" : s >= 50 ? "var(--color-warning-dot)" : "var(--color-error-text)";
  const label = s >= 75 ? "Saudável" : s >= 50 ? "Atenção" : "Crítico";
  const r = 54, c = 2 * Math.PI * r, off = c - (s / 100) * c;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--color-gray-200)" strokeWidth="10" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={ring} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 70 70)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x="70" y="66" textAnchor="middle" fill="var(--text-strong)" fontSize="30" fontWeight="700" fontFamily="var(--font-brand)">{s}</text>
      <text x="70" y="86" textAnchor="middle" fill="var(--text-secondary)" fontSize="11" fontWeight="500">{label}</text>
    </svg>
  );
}

function DimBar({ label, score }) {
  const color = score >= 75 ? "var(--color-success-dot)" : score >= 50 ? "var(--color-warning-dot)" : "var(--color-error-text)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
        <span style={{ color: "var(--text-strong)", fontWeight: 700 }}>{score}</span>
      </div>
      <div style={{ height: 7, background: "var(--surface-panel)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: "var(--radius-full)", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function Card({ title, children, action }) {
  return (
    <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-xl)", padding: 18 }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--text-secondary)" }}>{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-xl)", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ position: "absolute", top: 0, left: 0, height: 3, width: "100%", background: "var(--brand-primary)" }} />
      <p style={{ margin: "4px 0 0", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--text-secondary)", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: "10px 0 0", fontSize: 30, fontWeight: 700, lineHeight: 1, color: "var(--text-strong)", fontFamily: "var(--font-brand)" }}>{value}</p>
      <div style={{ marginTop: 14, borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>{sub}</p>
      </div>
    </div>
  );
}

function Rank({ items, color }) {
  const max = Math.max(...items.map((i) => i.v), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {items.map((it, i) => (
        <div key={it.n} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", width: 14 }}>{i + 1}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--text-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.n}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)", marginLeft: 8 }}>{it.v.toLocaleString("pt-BR")}</span>
            </div>
            <div style={{ height: 6, background: "var(--surface-panel)", borderRadius: "var(--radius-full)", marginTop: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(it.v / max) * 100}%`, background: color, borderRadius: "var(--radius-full)" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HomeDashboard() {
  const [periodo, setPeriodo] = React.useState("30d");
  return (
    <div style={{ padding: "20px 24px 32px" }}>
      {/* Header + filters */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 700, color: "var(--text-strong)" }}>Dashboard Colmeia</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>Visão consolidada de ativos, roteiros e performance OOH</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ width: 150 }}><Select value="" placeholder="Praça: Todas" options={["São Paulo", "Rio de Janeiro"]} /></div>
          <div style={{ width: 130 }}><Select value={periodo} onChange={(e) => setPeriodo(e.target.value)} options={[{ value: "7d", label: "7 dias" }, { value: "30d", label: "30 dias" }, { value: "90d", label: "90 dias" }]} /></div>
          <Button variant="secondary">Atualizar</Button>
        </div>
      </div>

      {/* Row 1: health + KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) 2fr", gap: 16, marginBottom: 16 }}>
        <Card title="Health Score" action={<Badge tone="success" size="sm">v2.1</Badge>}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <HealthGauge score={78} />
            <div style={{ width: "100%", marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <DimBar label="Cobertura" score={82} />
              <DimBar label="Diversidade" score={71} />
              <DimBar label="Qualidade" score={88} />
              <DimBar label="Capacidade" score={64} />
            </div>
          </div>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, alignContent: "start" }}>
          <Kpi label="Pontos Ativos" value="12,4k" sub="Média 8.240 passantes/pto" />
          <Kpi label="Praças Cobertas" value="318" sub="64,2% Vias Públicas" />
          <Kpi label="Exibidores Ativos" value="96" sub="35,8% Indoor" />
          <Kpi label="Roteiros Totais" value="1.284" sub="3 em processamento" />
          <Kpi label="Finalizados" value="1.197" sub="142 no período" />
          <Kpi label="Impactos OOH" value="48,6M" sub="GRP: 312" />
        </div>
      </div>

      {/* Row 2: rankings + pipeline */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <Card title="Top Praças">
          <Rank color="var(--brand-primary)" items={[
            { n: "São Paulo", v: 3820 }, { n: "Rio de Janeiro", v: 2410 }, { n: "Belo Horizonte", v: 1560 }, { n: "Curitiba", v: 1180 }, { n: "Porto Alegre", v: 980 },
          ]} />
        </Card>
        <Card title="Top Exibidores">
          <Rank color="var(--color-ink-700)" items={[
            { n: "Eletromidia", v: 2940 }, { n: "Otima", v: 2110 }, { n: "JCDecaux", v: 1730 }, { n: "Clear Channel", v: 1280 }, { n: "Helloo", v: 760 },
          ]} />
        </Card>
        <Card title="Pipeline de Roteiros">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
            {[{ v: "1.284", l: "Total" }, { v: "3", l: "Processando" }, { v: "1.197", l: "Finalizados" }].map((b) => (
              <div key={b.l} style={{ background: "var(--surface-panel)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "10px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>{b.v}</p>
                <p style={{ margin: "2px 0 0", fontSize: 9, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>{b.l}</p>
              </div>
            ))}
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>Recentes</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { n: "Campanha Verão — SP", d: "12/03", p: false },
              { n: "Lançamento Filial RJ", d: "10/03", p: true },
              { n: "Black Friday Nacional", d: "08/03", p: false },
            ].map((r) => (
              <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "5px 8px" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: r.p ? "var(--color-warning-dot)" : "var(--color-success-dot)", animation: r.p ? "colmeia-pulse 1.5s infinite" : "none" }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-body)" }}>{r.n}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{r.d}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

window.HomeDashboard = HomeDashboard;
