import React, { useState } from 'react';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { Topbar } from '../../components/Topbar/Topbar';

/* ──────────────────────────────────────────────────────────────────────────
   Dados reais extraídos do SQL Server (serv_product_be180)
   via scripts/metrics-diligencia.js em 16/06/2026.
   ────────────────────────────────────────────────────────────────────────── */
const FONTE = 'Fonte: SQL Server (serv_product_be180) · extraído em 16/06/2026';

const nf = (n: number) => n.toLocaleString('pt-BR');

const PLANOS = {
  total: 3277,
  ultimos30: 222,
  ultimos7: 36,
  meses: ['jun/25', 'jul/25', 'ago/25', 'set/25', 'out/25', 'nov/25', 'dez/25', 'jan/26', 'fev/26', 'mar/26', 'abr/26', 'mai/26', 'jun/26'],
  valores: [12, 343, 315, 244, 310, 205, 151, 156, 112, 138, 126, 243, 85],
  porTipo: [
    { label: 'Consulta', value: 2228, color: '#ff4600' },
    { label: 'Pendente', value: 835, color: '#1a1a1a' },
    { label: 'Não informado', value: 210, color: '#c1c1c1' },
    { label: 'Roteiro', value: 4, color: '#6366f1' },
  ],
};

const USUARIOS = { total: 76, internos: 76, ativos30: 12, ativos7: 9 };

const AGENCIAS = {
  total: 41,
  top: [
    { nome: 'VML', planos: 273 },
    { nome: 'DM9', planos: 215 },
    { nome: 'BE180', planos: 206 },
    { nome: 'AMBEV', planos: 119 },
    { nome: 'GUT', planos: 87 },
    { nome: 'MUTATO', planos: 66 },
    { nome: 'ZETA', planos: 57 },
    { nome: 'UM', planos: 41 },
    { nome: 'FBIZ', planos: 39 },
  ],
};

const INVENTARIO = [
  { label: 'Rejeitado', value: 5, color: '#dc2626' },
  { label: 'Em análise', value: 4, color: '#2563eb' },
  { label: 'Para corrigir', value: 1, color: '#d97706' },
];

/* ── Componentes visuais auxiliares ──────────────────────────────────────── */

function StatCard({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-6 py-5">
      <div className={`text-3xl font-light tracking-tight ${accent ? 'text-[#ff4600]' : 'text-[#1a1a1a]'}`}>
        {value}
      </div>
      <div className="text-[13px] text-[#6a6a6a] mt-1.5 leading-snug">{label}</div>
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-[#9a9a9a] italic mt-3">{children}</p>;
}

function LineChart({ labels, values, height = 260 }: { labels: string[]; values: number[]; height?: number }) {
  const w = 760;
  const padL = 38;
  const padR = 14;
  const padT = 16;
  const padB = 34;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;
  const max = Math.max(...values);
  const niceMax = Math.ceil(max / 50) * 50;
  const xStep = innerW / (values.length - 1);
  const pts = values.map((v, i) => [padL + i * xStep, padT + innerH - (v / niceMax) * innerH] as const);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${padL},${(padT + innerH).toFixed(1)} ${line} ${(padL + innerW).toFixed(1)},${(padT + innerH).toFixed(1)}`;
  const gridVals = [0, niceMax / 2, niceMax];

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ maxHeight: height }}>
      {gridVals.map((g, i) => {
        const y = padT + innerH - (g / niceMax) * innerH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={padL + innerW} y2={y} stroke="#eee" strokeWidth={1} />
            <text x={padL - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#9a9a9a">{g}</text>
          </g>
        );
      })}
      <polygon points={area} fill="#ff4600" opacity={0.08} />
      <polyline points={line} fill="none" stroke="#ff4600" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#ff4600" />
      ))}
      {labels.map((lb, i) => (
        <text key={i} x={padL + i * xStep} y={height - 12} textAnchor="middle" fontSize={10} fill="#9a9a9a">{lb}</text>
      ))}
    </svg>
  );
}

function Donut({ data, size = 200, thickness = 26 }: { data: { label: string; value: number; color: string }[]; size?: number; thickness?: number }) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {data.map((d, i) => {
            const len = (d.value / total) * circ;
            const seg = (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-acc}
              />
            );
            acc += len;
            return seg;
          })}
        </g>
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={22} fontWeight={300} fill="#1a1a1a">{nf(total)}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill="#9a9a9a">total</text>
      </svg>
      <div className="flex flex-col gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2.5 text-[13px]">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-[#3a3a3a]">{d.label}</span>
            <span className="text-[#9a9a9a]">· {nf(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HBars({ data }: { data: { nome: string; planos: number }[] }) {
  const max = Math.max(...data.map((d) => d.planos));
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.nome} className="flex items-center gap-3">
          <div className="w-16 text-[12px] text-[#6a6a6a] text-right flex-shrink-0">{d.nome}</div>
          <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
            <div className="h-full bg-[#ff4600] rounded" style={{ width: `${(d.planos / max) * 100}%` }} />
          </div>
          <div className="w-10 text-[12px] text-[#3a3a3a] font-medium flex-shrink-0">{nf(d.planos)}</div>
        </div>
      ))}
    </div>
  );
}

function Card({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-[#1a1a1a]">{title}</h3>
        {badge && <span className="text-[11px] font-medium text-[#6a6a6a] bg-gray-100 px-2 py-0.5 rounded">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function Callout({ title, children, tone = 'neutral' }: { title?: string; children: React.ReactNode; tone?: 'neutral' | 'info' }) {
  const styles = tone === 'info'
    ? 'border-blue-200 bg-blue-50 text-blue-900'
    : 'border-gray-200 bg-gray-50 text-[#3a3a3a]';
  return (
    <div className={`border rounded-xl px-5 py-4 text-[13px] leading-relaxed ${styles}`}>
      {title && <div className="font-semibold mb-1">{title}</div>}
      {children}
    </div>
  );
}

function Section({ title, count, defaultOpen, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="border-b border-gray-200 py-4 group">
      <summary className="flex items-center gap-2 cursor-pointer list-none select-none">
        <svg className="w-4 h-4 text-[#9a9a9a] transition-transform duration-200 group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-[15px] font-medium text-[#1a1a1a]">{title}</span>
        {count != null && <span className="text-[12px] text-[#9a9a9a]">({count})</span>}
      </summary>
      <div className="pl-6 pt-4">{children}</div>
    </details>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-block text-[12px] text-[#3a3a3a] bg-gray-100 border border-gray-200 rounded-full px-3 py-1">{children}</span>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[#ff4600] mt-0.5">•</span>
      <span className="text-[13px] text-[#3a3a3a] leading-relaxed">{children}</span>
    </div>
  );
}

/* ── Tela ────────────────────────────────────────────────────────────────── */

export function BlueprintDiligencia() {
  const [menuReduzido, setMenuReduzido] = useState(false);

  return (
    <div className="min-h-screen bg-[#fafafa] flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div className={`fixed top-0 z-40 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? 'left-20' : 'left-64'}`} />
      <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? 'ml-20' : 'ml-64'} flex flex-col`}>
        <Topbar
          menuReduzido={menuReduzido}
          breadcrumb={{
            items: [
              { label: 'Home', path: '/' },
              { label: 'Administração' },
              { label: 'Blueprint / Diligência' },
            ],
          }}
        />
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`} />

        <div className="flex-1 pt-24 pb-32 overflow-auto">
          <div className="w-full px-10 xl:px-14 2xl:px-20 max-w-[1180px]">

            {/* ── Cabeçalho ── */}
            <header className="mb-8">
              <p className="text-[12px] font-bold tracking-[0.12em] text-[#ff4600] mb-2">BLUEPRINT DE DILIGÊNCIA</p>
              <h1 className="text-4xl font-light text-[#1a1a1a] tracking-tight">Colmeia — Meus Roteiros</h1>
              <p className="text-[15px] text-[#6a6a6a] mt-3 max-w-3xl leading-relaxed">
                Plataforma de gestão e simulação de roteiros de mídia OOH (Out of Home) da Be Mediatech,
                em arquitetura 100% serverless, com modelo SaaS multi-tenant para agências.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Pill>React · Vercel</Pill>
                <Pill>Node.js serverless</Pill>
                <Pill>SQL Server + PostgreSQL</Pill>
                <Pill>Databricks</Pill>
                <Pill>Auth0</Pill>
              </div>
            </header>

            <div className="h-px bg-gray-200 my-8" />

            {/* ── Performance de uso ── */}
            <section>
              <p className="text-[12px] font-bold tracking-[0.12em] text-[#ff4600] mb-1">PERFORMANCE DE USO</p>
              <h2 className="text-2xl font-light text-[#1a1a1a] mb-6">Adoção e volume na plataforma</h2>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard value={nf(PLANOS.total)} label="Planos / simulações criados" accent />
                <StatCard value={nf(PLANOS.ultimos30)} label="Planos nos últimos 30 dias" />
                <StatCard value={nf(USUARIOS.ativos30)} label="Usuários ativos (30 dias)" />
                <StatCard value={nf(AGENCIAS.total)} label="Agências cadastradas" />
              </div>

              <div className="mb-6">
                <Card title="Planos criados por mês" badge="13 meses">
                  <LineChart labels={PLANOS.meses} values={PLANOS.valores} />
                  <Caption>{FONTE}</Caption>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card title="Distribuição por tipo de plano">
                  <Donut data={PLANOS.porTipo} />
                  <Caption>{FONTE}</Caption>
                </Card>
                <Card title="Top agências por nº de planos">
                  <HBars data={AGENCIAS.top} />
                  <Caption>{FONTE} · exclui planos internos sem agência</Caption>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-[#1a1a1a]">Base de usuários</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard value={nf(USUARIOS.total)} label="Usuários ativos" />
                    <StatCard value={nf(USUARIOS.internos)} label="Internos Be" />
                    <StatCard value={nf(USUARIOS.ativos7)} label="Ativos (7 dias)" />
                    <StatCard value={nf(PLANOS.ultimos7)} label="Planos (7 dias)" />
                  </div>
                  <Callout title="Multi-tenant pronto para agências">
                    A base atual é de {USUARIOS.total} usuários internos Be. O acesso SaaS por agência
                    (filtro por <strong>agencia_pk</strong> + <strong>liberadoAgencia_bl</strong>) está
                    implementado; o provisionamento de logins de agência ainda não foi iniciado.
                  </Callout>
                </div>
                <Card title="Inventário de exibidores — lotes por status" badge="novo">
                  <Donut data={INVENTARIO} size={180} thickness={24} />
                  <Caption>{FONTE} · módulo de curadoria de inventário recém-lançado</Caption>
                </Card>
              </div>

              <Callout tone="info" title="Status de negócio dos planos">
                A classificação de negócio (Teste / Cenário / Plano / Aprovado) foi lançada recentemente:
                hoje {nf(3276)} planos estão em <strong>Teste</strong> e 1 em <strong>Cenário</strong>,
                refletindo o início do uso do novo fluxo de status.
              </Callout>
            </section>

            <div className="h-px bg-gray-200 my-10" />

            {/* ── Detalhamento técnico ── */}
            <section>
              <p className="text-[12px] font-bold tracking-[0.12em] text-[#ff4600] mb-1">PRODUTO E ENGENHARIA</p>
              <h2 className="text-2xl font-light text-[#1a1a1a] mb-4">Detalhamento técnico</h2>

              <Section title="Visão do produto e capacidades" defaultOpen>
                <p className="text-[13px] text-[#6a6a6a] leading-relaxed mb-4">
                  O Colmeia permite à Be e a agências parceiras visualizar e operar planos de mídia, mapas,
                  relatórios e banco de ativos numa única aplicação. Principais capacidades:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    'Listagem, busca e gestão de roteiros (planos por grupo)',
                    'Criação de roteiros simulado e completo, com integração Databricks',
                    'Mapa interativo (Leaflet) com pontos, hexágonos H3 e inventário por cidade',
                    'Banco de ativos: dashboard, relatórios por praça/exibidor',
                    'Consulta de endereços (geocoding direto e reverso)',
                    'Curadoria de inventário de exibidores (de-para, reconciliação, aprovação)',
                    'Administração de usuários, perfis e permissões por área',
                    'Acesso SaaS: agências veem apenas roteiros liberados para si',
                  ].map((c) => <Bullet key={c}>{c}</Bullet>)}
                </div>
              </Section>

              <Section title="Módulos e funcionalidades" count={8}>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50 text-[#6a6a6a]">
                      <tr>
                        <th className="text-left font-medium px-4 py-2.5 border-b border-gray-200 w-52">Módulo</th>
                        <th className="text-left font-medium px-4 py-2.5 border-b border-gray-200">Funcionalidades principais</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#3a3a3a]">
                      {[
                        ['Meus Roteiros', 'Listagem paginada, busca, status, soft delete, liberação para agência, link p/ mapa e resultados'],
                        ['Criar Roteiro', 'Fluxo em abas (config, target, praças, envio); simulado e completo; importação OOH via Excel; Databricks'],
                        ['Mapa', 'Leaflet: cidades, semanas, hexágonos H3, pontos de mídia, inventário por cidade'],
                        ['Visualizar Resultados', 'Detalhamento do roteiro após processamento'],
                        ['Banco de Ativos', 'Dashboard, mapa, busca de pontos, relatórios por praça/exibidor (PostgreSQL)'],
                        ['Consulta Endereço', 'Geocoding reverso e direto (Google Places) com upload/download Excel'],
                        ['Inventário de Exibidores', 'Upload, análise admin, de-para de tipos, reconciliação de praças, aprovação'],
                        ['Administração', 'CRUD de usuários e perfis, permissões por área, multi-tenant por agência'],
                      ].map(([m, f]) => (
                        <tr key={m} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-2.5 font-medium align-top">{m}</td>
                          <td className="px-4 py-2.5 align-top">{f}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="Arquitetura de alto nível">
                <div className="flex flex-col gap-1.5 items-stretch">
                  {[
                    { titulo: 'Cliente', itens: ['Browser · SPA React'] },
                    { titulo: 'Vercel (serverless, regiões BR/US)', itens: ['Frontend React', 'API Node.js · ~10 routers · ~70 handlers', 'auth-middleware (JWT)'] },
                    { titulo: 'Dados e serviços', itens: ['SQL Server (core)', 'PostgreSQL (Banco de Ativos)', 'Auth0', 'Databricks', 'SharePoint', 'Google Places'] },
                  ].map((camada, i) => (
                    <React.Fragment key={camada.titulo}>
                      {i > 0 && <div className="text-center text-[#c1c1c1] text-sm">↓</div>}
                      <div className="border border-gray-200 rounded-xl px-5 py-4 bg-white">
                        <div className="text-[12px] font-semibold text-[#6a6a6a] mb-2">{camada.titulo}</div>
                        <div className="flex flex-wrap gap-2">
                          {camada.itens.map((it) => <Pill key={it}>{it}</Pill>)}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </Section>

              <Section title="Stack técnica">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50 text-[#6a6a6a]">
                      <tr>
                        <th className="text-left font-medium px-4 py-2.5 border-b border-gray-200 w-40">Camada</th>
                        <th className="text-left font-medium px-4 py-2.5 border-b border-gray-200">Tecnologia</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#3a3a3a]">
                      {[
                        ['UI', 'React 18, TypeScript, Vite, Tailwind, Leaflet, Axios'],
                        ['API', 'Node.js serverless (~10 routers, ~70 handlers), Auth0 JWT'],
                        ['Dados', 'SQL Server (core) + PostgreSQL (Banco de Ativos)'],
                        ['Processamento', 'Databricks (Python): sampleMaxAll → sampleFromMax → product_model'],
                        ['Infra', 'Vercel (regiões BR/US), Azure (SQL, Blob, Key Vault)'],
                        ['Segurança', 'HTTPS, Auth0, domínio @be180 / cadastro, multi-tenant agencia_pk + liberadoAgencia_bl'],
                      ].map(([c, t]) => (
                        <tr key={c} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-2.5 font-medium align-top">{c}</td>
                          <td className="px-4 py-2.5 align-top">{t}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="Pipeline de processamento (Databricks)">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { n: '1', nome: 'sampleMaxAll', desc: 'Amostragem estatística e espacial dos pontos; randomização e balanceamento.' },
                    { n: '2', nome: 'sampleFromMax', desc: 'Filtro por plano (planoMidia_pk), estruturação e validação dos dados.' },
                    { n: '3', nome: 'product_model', desc: 'Clustering, deflação populacional adaptativa, hexágonos H3 e mapas Folium.' },
                  ].map((e) => (
                    <div key={e.n} className="border border-gray-200 rounded-xl p-5 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-[#1a1a1a]">{e.nome}</span>
                        <span className="text-[11px] font-medium text-[#6a6a6a] bg-gray-100 px-2 py-0.5 rounded">Estágio {e.n}</span>
                      </div>
                      <p className="text-[13px] text-[#6a6a6a] leading-relaxed">{e.desc}</p>
                    </div>
                  ))}
                </div>
                <Caption>
                  Processamento pesado (amostragem, clustering, geração de hexágonos e mapas) roda no Databricks;
                  a orquestração e a entrega ao usuário ficam na API serverless.
                </Caption>
              </Section>

              <Section title="Segurança e modelo SaaS multi-tenant">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    'Autenticação Auth0 (JWT) no login e em toda chamada à API',
                    'Acesso liberado só para @be180.com.br ou e-mails cadastrados em usuario_dm',
                    'Cada roteiro pertence a uma agência (agencia_pk)',
                    'Be libera roteiros para a agência (liberadoAgencia_bl)',
                    'Agências só veem roteiros próprios e liberados; UI e API filtram',
                    'Endpoints de escrita protegidos com requireInternalUser onde aplicável',
                  ].map((c) => <Bullet key={c}>{c}</Bullet>)}
                </div>
              </Section>

              <Section title="Integrações externas" count={7}>
                <div className="flex flex-wrap gap-2">
                  {['Geofusion', 'Kantar', 'IBGE', 'Google Places', 'SharePoint', 'Auth0', 'Databricks (JDBC)'].map((i) => <Pill key={i}>{i}</Pill>)}
                </div>
              </Section>

              <Section title="Evolução v1 → v2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-xl p-5 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#1a1a1a]">Plataforma anterior</span>
                      <span className="text-[11px] font-medium text-[#6a6a6a] bg-gray-100 px-2 py-0.5 rounded">v1.0</span>
                    </div>
                    <p className="text-[13px] text-[#6a6a6a] leading-relaxed">
                      Interface em Power Apps; processamento já no Databricks; upload manual de fontes (ex.: Geofusion).
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-5 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#1a1a1a]">Plataforma atual</span>
                      <span className="text-[11px] font-medium text-[#6a6a6a] bg-gray-100 px-2 py-0.5 rounded">v2.0</span>
                    </div>
                    <p className="text-[13px] text-[#6a6a6a] leading-relaxed">
                      SPA React própria na Vercel + API Node.js serverless; Auth0; multi-tenant por agência;
                      processamento pesado mantido no Databricks.
                    </p>
                  </div>
                </div>
              </Section>
            </section>

            <div className="h-px bg-gray-200 my-8" />
            <div className="flex items-center justify-between text-[12px] text-[#9a9a9a] pb-4">
              <span>© 2026 Be Mediatech OOH — Colmeia · Blueprint de diligência</span>
              <span>{FONTE}</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
