import React, { useState } from 'react';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { Topbar } from '../../components/Topbar/Topbar';
import { Search } from '../../icons/Search';
import { AddBox } from '../../icons/AddBox';
import { FindInPage } from '../../icons/FindInPage';
import { PinDrop } from '../../icons/PinDrop';
import { Difference4 } from '../../icons/Difference4';
import { KeyboardArrowDown } from '../../icons/KeyboardArrowDown';
import { ArrowForwardIos } from '../../icons/ArrowForwardIos';
import { ArrowLeft2 } from '../../icons/ArrowLeft2';
import { ArrowRight } from '../../icons/ArrowRight';
import { ExitToApp } from '../../icons/ExitToApp';
import { CheckCircle } from '../../icons/CheckCircle';
import { Delete4 } from '../../icons/Delete4';
import { X } from '../../icons/X';
import { StyleOutlined } from '../../icons/StyleOutlined';
import { StyleOutlined7 } from '../../icons/StyleOutlined7';

/* ──────────────────────────────────────────────────────────────────────────
   Design System do Colmeia — catálogo dos tokens e componentes que JÁ existem
   no app (Colmeia, Banco de Ativos, Mapas, Admin). As cores são usadas como
   valores arbitrários do Tailwind (ex.: bg-[#ff4600]); não há tema custom no
   tailwind.config.js. Extraído dos padrões reais do código.
   ────────────────────────────────────────────────────────────────────────── */

const ACCENTS = [
  { nome: 'Brand · Laranja', hex: '#ff4600', uso: 'Ação primária · Mapas · Banco de Ativos · Admin' },
  { nome: 'Brand hover', hex: '#e03e00', uso: 'Hover de botões primários' },
  { nome: 'Âmbar · Meus Roteiros', hex: '#FF9800', uso: 'Destaques em Meus Roteiros e switches' },
  { nome: 'Header escuro', hex: '#393939', uso: 'Cabeçalho de tabelas (Meus Roteiros)' },
];

const NEUTROS = [
  { nome: 'Texto forte', hex: '#1a1a1a', uso: 'Títulos e números' },
  { nome: 'Texto base', hex: '#222222', uso: 'Texto em tabelas' },
  { nome: 'Texto / menu', hex: '#3a3a3a', uso: 'Corpo e links de menu' },
  { nome: 'Secundário', hex: '#6a6a6a', uso: 'Descrições e legendas' },
  { nome: 'Muted', hex: '#757575', uso: 'Ícones e labels de menu' },
  { nome: 'Sutil', hex: '#9a9a9a', uso: 'Captions e eixos' },
  { nome: 'Placeholder', hex: '#b0b0b0', uso: 'Paginação e textos fracos' },
  { nome: 'Borda / divisor', hex: '#c1c1c1', uso: 'Linhas estruturais' },
  { nome: 'Borda input', hex: '#d9d9d9', uso: 'Bordas de campos' },
  { nome: 'Hover surface', hex: '#ededed', uso: 'Hover de itens de menu' },
  { nome: 'Zebra', hex: '#f7f7f7', uso: 'Linhas alternadas de tabela' },
  { nome: 'Fundo app', hex: '#fafafa', uso: 'Background das telas' },
];

const STATUS = [
  { nome: 'Aprovado', color: '#15803d', bg: '#dcfce7', dot: '#16a34a' },
  { nome: 'Em análise', color: '#b45309', bg: '#fef3c7', dot: '#d97706' },
  { nome: 'Para corrigir', color: '#b91c1c', bg: '#fee2e2', dot: '#dc2626' },
  { nome: 'Rejeitado', color: '#374151', bg: '#f3f4f6', dot: '#6b7280' },
];

const DENSIDADE = ['#fed7aa', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412'];

const ICN = 'w-6 h-6 text-[#3a3a3a]';
const ICN_COR = '#3a3a3a';

/* Ícones componentizados em src/icons (props variam: alguns exigem `color`). */
const ICONES_PRODUTO: { nome: string; el: React.ReactNode }[] = [
  { nome: 'Search', el: <Search className={ICN} /> },
  { nome: 'AddBox', el: <AddBox className={ICN} color={ICN_COR} /> },
  { nome: 'FindInPage', el: <FindInPage className={ICN} color={ICN_COR} /> },
  { nome: 'PinDrop', el: <PinDrop className={ICN} /> },
  { nome: 'Difference4', el: <Difference4 className={ICN} color={ICN_COR} /> },
  { nome: 'KeyboardArrowDown', el: <KeyboardArrowDown className={ICN} /> },
  { nome: 'ArrowForwardIos', el: <ArrowForwardIos className={ICN} /> },
  { nome: 'ArrowLeft2', el: <ArrowLeft2 className={ICN} color={ICN_COR} /> },
  { nome: 'ArrowRight', el: <ArrowRight className={ICN} color={ICN_COR} /> },
  { nome: 'ExitToApp', el: <ExitToApp className={ICN} color={ICN_COR} /> },
  { nome: 'CheckCircle', el: <CheckCircle className={ICN} /> },
  { nome: 'Delete4', el: <Delete4 className={ICN} /> },
  { nome: 'X', el: <X className={ICN} /> },
  { nome: 'StyleOutlined', el: <StyleOutlined className={ICN} /> },
  { nome: 'StyleOutlined7', el: <StyleOutlined7 className={ICN} /> },
];

/* Ícones inline (SVG direto na Sidebar, sem componente). */
const IconeHome = () => (
  <svg className={ICN} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10.75L12 3l9 7.75V20a1 1 0 01-1 1h-5.5a1 1 0 01-1-1v-4.5h-3V20a1 1 0 01-1 1H4a1 1 0 01-1-1v-9.25z" /></svg>
);
const IconeP1A = () => (
  <svg className={ICN} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6h13M9 5h13M3 5h2M3 11h2M3 17h2M9 11h6" /></svg>
);
const IconeAdmin = () => (
  <svg className={ICN} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconeExibidores = () => (
  <svg className={ICN} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17.25V21m6-3.75V21m-9 0h12M4 4h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
  </svg>
);
const IconeDocumentacao = () => (
  <svg className={ICN} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

/* Ordem real do menu lateral esquerdo (nova estrutura). */
const MENU_LATERAL: { label: string; icone: React.ReactNode; fonte: string }[] = [
  { label: 'Home', icone: <IconeHome />, fonte: 'SVG inline' },
  { label: 'Meus roteiros', icone: <PinDrop className={ICN} />, fonte: 'PinDrop' },
  { label: 'Relatório P1A', icone: <IconeP1A />, fonte: 'SVG inline' },
  { label: 'Criar roteiro', icone: <AddBox className={ICN} color={ICN_COR} />, fonte: 'AddBox' },
  { label: 'Banco de ativos', icone: <FindInPage className={ICN} color={ICN_COR} />, fonte: 'FindInPage' },
  { label: 'Exibidores', icone: <IconeExibidores />, fonte: 'SVG inline' },
  { label: 'Consulta endereço', icone: <Difference4 className={ICN} color={ICN_COR} />, fonte: 'Difference4' },
  { label: 'Administração', icone: <IconeAdmin />, fonte: 'SVG inline' },
  { label: 'Documentação do sistema', icone: <IconeDocumentacao />, fonte: 'SVG inline' },
];

/* ── Auxiliares ──────────────────────────────────────────────────────────── */

function GroupHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6 mt-2">
      <p className="text-[12px] font-bold tracking-[0.12em] text-[#ff4600] mb-1">{eyebrow}</p>
      <h2 className="text-2xl font-light text-[#1a1a1a]">{title}</h2>
    </div>
  );
}

function Block({ title, descricao, children }: { title: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">{title}</h3>
      {descricao && <p className="text-[13px] text-[#6a6a6a] mb-4 max-w-2xl leading-relaxed">{descricao}</p>}
      {!descricao && <div className="mb-4" />}
      {children}
    </section>
  );
}

function Swatch({ hex, nome, uso, dark }: { hex: string; nome: string; uso?: string; dark?: boolean }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="h-16 w-full" style={{ backgroundColor: hex, borderBottom: dark ? '1px solid #eee' : 'none' }} />
      <div className="px-3 py-2.5">
        <div className="text-[12px] font-medium text-[#1a1a1a]">{nome}</div>
        <div className="text-[11px] font-mono text-[#9a9a9a] mt-0.5 uppercase">{hex}</div>
        {uso && <div className="text-[11px] text-[#6a6a6a] mt-1 leading-snug">{uso}</div>}
      </div>
    </div>
  );
}

function StatusBadgeDemo({ nome, color, bg, dot }: { nome: string; color: string; bg: string; dot: string }) {
  return (
    <span style={{ color, backgroundColor: bg }} className="inline-flex items-center gap-1.5 rounded-full font-semibold px-2.5 py-1 text-xs">
      <span style={{ backgroundColor: dot }} className="w-1.5 h-1.5 rounded-full flex-shrink-0" />
      {nome}
    </span>
  );
}

function Spec({ children }: { children: React.ReactNode }) {
  return <code className="text-[11px] font-mono text-[#9a9a9a] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">{children}</code>;
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-gray-200 rounded-xl p-6">{children}</div>;
}

/* ── Tela ────────────────────────────────────────────────────────────────── */

export function DesignSystem() {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [tabUnder, setTabUnder] = useState(0);
  const [tabPill, setTabPill] = useState(0);
  const [seg, setSeg] = useState(0);
  const [sw, setSw] = useState(true);

  return (
    <div className="min-h-screen bg-[#fafafa] flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div className={`fixed top-0 z-40 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? 'left-20' : 'left-64'}`} />
      <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? 'ml-20' : 'ml-64'} flex flex-col`}>
        <Topbar
          menuReduzido={menuReduzido}
          breadcrumb={{ items: [{ label: 'Home', path: '/' }, { label: 'Administração' }, { label: 'Design System' }] }}
        />
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`} />

        <div className="flex-1 pt-24 pb-32 overflow-auto">
          <div className="w-full px-10 xl:px-14 2xl:px-20 max-w-[1180px]">

            {/* Cabeçalho */}
            <header className="mb-8">
              <p className="text-[12px] font-bold tracking-[0.12em] text-[#ff4600] mb-2">DESIGN SYSTEM</p>
              <h1 className="text-4xl font-light text-[#1a1a1a] tracking-tight">Fundamentos visuais do Colmeia</h1>
              <p className="text-[15px] text-[#6a6a6a] mt-3 max-w-3xl leading-relaxed">
                Catálogo dos tokens e componentes que já usamos hoje — Colmeia, Banco de Ativos, Mapas e Admin.
                Referência única para manter consistência. As cores são aplicadas como valores arbitrários do
                Tailwind (ex.: <Spec>bg-[#ff4600]</Spec>), sem tema customizado no <Spec>tailwind.config.js</Spec>.
              </p>
              <div className="mt-4 border border-amber-200 bg-amber-50 text-amber-900 rounded-xl px-5 py-3 text-[13px] leading-relaxed max-w-3xl">
                <strong>Dois trilhos de accent hoje:</strong> a maior parte do app (Mapas, Banco de Ativos, Admin)
                usa <Spec>#ff4600</Spec>; <strong>Meus Roteiros</strong> usa <Spec>#FF9800</Spec> e cabeçalho de
                tabela <Spec>#393939</Spec>. Documentados como variantes contextuais — uma futura unificação pode
                consolidá-los em tokens.
              </div>
            </header>

            <div className="h-px bg-gray-200 mb-8" />

            {/* ═══ FUNDAMENTOS ═══ */}
            <GroupHeader eyebrow="FUNDAMENTOS" title="Cores, tipografia e medidas" />

            <Block title="Cores · Accent" descricao="Cores de identidade e ação. Use sempre para o elemento mais importante da tela.">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ACCENTS.map((c) => <Swatch key={c.hex} {...c} />)}
              </div>
            </Block>

            <Block title="Cores · Neutros" descricao="Escala de cinzas para texto, bordas e superfícies, do #1a1a1a (forte) ao #fafafa (fundo).">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {NEUTROS.map((c) => <Swatch key={c.hex} {...c} />)}
              </div>
            </Block>

            <Block title="Cores · Status" descricao="Paleta semântica de badges de status (ex.: lotes de inventário). Texto, fundo e ponto indicador.">
              <div className="flex flex-wrap gap-6 items-start">
                {STATUS.map((s) => (
                  <div key={s.nome} className="flex flex-col gap-2">
                    <StatusBadgeDemo {...s} />
                    <span className="text-[10px] font-mono text-[#9a9a9a] uppercase">{s.color} · {s.bg}</span>
                  </div>
                ))}
              </div>
            </Block>

            <Block title="Cores · Mapas e ambiente" descricao="Escalas usadas nos mapas (Leaflet) do Banco de Ativos e do Mapa de roteiros.">
              <Panel>
                <div className="mb-6">
                  <div className="text-[12px] font-medium text-[#3a3a3a] mb-2">Densidade (choropleth) — menor → maior</div>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 max-w-md">
                    {DENSIDADE.map((h) => <div key={h} className="h-8 flex-1" style={{ backgroundColor: h }} />)}
                  </div>
                  <div className="flex gap-3 mt-1.5 flex-wrap">
                    {DENSIDADE.map((h) => <span key={h} className="text-[10px] font-mono text-[#9a9a9a]">{h}</span>)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-10 gap-y-4">
                  <div>
                    <div className="text-[12px] font-medium text-[#3a3a3a] mb-2">Ambiente</div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-[12px] text-[#3a3a3a]"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Vias Públicas <span className="text-[#9a9a9a] font-mono">#3b82f6</span></span>
                      <span className="flex items-center gap-1.5 text-[12px] text-[#3a3a3a]"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Indoor <span className="text-[#9a9a9a] font-mono">#f97316</span></span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] font-medium text-[#3a3a3a] mb-2">Tipo de mídia</div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Digital</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Estático</span>
                    </div>
                  </div>
                </div>
              </Panel>
            </Block>

            <Block title="Tipografia" descricao="Fonte do sistema (font-sans). Títulos com peso leve (font-light); corpo entre 13–15px.">
              <Panel>
                <div className="space-y-5">
                  {[
                    [<h1 key="a" className="text-4xl font-light text-[#1a1a1a] tracking-tight">Título de página</h1>, 'text-4xl · font-light · tracking-tight'],
                    [<h2 key="b" className="text-2xl font-light text-[#1a1a1a]">Título de seção</h2>, 'text-2xl · font-light'],
                    [<h3 key="c" className="text-sm font-semibold text-[#1a1a1a]">Subtítulo / rótulo de card</h3>, 'text-sm · font-semibold'],
                    [<p key="d" className="text-[15px] text-[#6a6a6a]">Texto introdutório, maior que o corpo.</p>, 'text-[15px] · #6a6a6a'],
                    [<p key="e" className="text-[13px] text-[#3a3a3a]">Corpo de texto padrão (tabelas e descrições).</p>, 'text-[13px] · #3a3a3a'],
                    [<p key="f" className="text-[11px] text-[#9a9a9a] italic">Caption / legenda de gráficos.</p>, 'text-[11px] · italic · #9a9a9a'],
                    [<p key="g" className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">Label de KPI</p>, 'text-[10px] · uppercase · tracking-wide'],
                  ].map(([el, spec], i, arr) => (
                    <div key={i} className={`flex items-baseline justify-between gap-4 ${i < arr.length - 1 ? 'border-b border-gray-100 pb-4' : ''}`}>
                      {el as React.ReactNode}
                      <Spec>{spec as string}</Spec>
                    </div>
                  ))}
                </div>
              </Panel>
            </Block>

            <Block title="Raios, espaçamento e foco" descricao="Cantos arredondados e anel de foco laranja usados em campos e superfícies.">
              <Panel>
                <div className="flex flex-wrap items-end gap-8">
                  {[['rounded', 'rounded'], ['rounded-lg', 'rounded-lg'], ['rounded-xl', 'rounded-xl'], ['rounded-2xl', 'rounded-2xl'], ['rounded-full', 'rounded-full']].map(([cls, label]) => (
                    <div key={cls} className="flex flex-col items-center gap-2">
                      <div className={`w-14 h-14 bg-[#ff4600] ${cls}`} />
                      <span className="text-[11px] font-mono text-[#9a9a9a]">{label}</span>
                    </div>
                  ))}
                  <div className="flex flex-col items-center gap-2">
                    <input className="w-40 h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#ff4600] focus:ring-1 focus:ring-[#ff4600]" placeholder="foco laranja" />
                    <span className="text-[11px] font-mono text-[#9a9a9a]">focus:ring-[#ff4600]</span>
                  </div>
                </div>
              </Panel>
            </Block>

            <div className="h-px bg-gray-200 my-8" />

            {/* ═══ COMPONENTES ═══ */}
            <GroupHeader eyebrow="COMPONENTES" title="Controles e superfícies" />

            <Block title="Botões" descricao="Primário (laranja) para a ação principal; secundário e ghost para apoio; gradiente para CTAs especiais (beta).">
              <Panel>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="px-6 py-2.5 bg-[#ff4600] text-white rounded-lg font-medium text-sm hover:bg-[#e03e00] transition-colors duration-200">Primário</button>
                  <button className="px-6 py-2.5 bg-white text-[#3a3a3a] border border-[#d9d9d9] rounded-lg font-medium text-sm hover:bg-[#f7f7f7] transition-colors duration-200">Secundário</button>
                  <button className="px-6 py-2.5 text-[#3a3a3a] rounded-lg font-medium text-sm hover:bg-[#ededed] transition-colors duration-200">Ghost</button>
                  <button className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors duration-200">Destrutivo</button>
                  <button disabled className="px-6 py-2.5 bg-[#ff4600] text-white rounded-lg font-medium text-sm opacity-50 cursor-not-allowed">Desabilitado</button>
                  <button className="bg-gradient-to-r from-[#ff4600] to-orange-500 text-white rounded-xl px-4 py-2.5 text-xs font-bold hover:from-[#e03700] hover:to-orange-400 transition-all flex items-center gap-2">
                    Otimizar <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">BETA</span>
                  </button>
                </div>
                <div className="mt-5 pt-5 border-t border-gray-100"><Spec>bg-[#ff4600] text-white rounded-lg font-medium hover:bg-[#e03e00] · disabled:opacity-50</Spec></div>
              </Panel>
            </Block>

            <Block title="Botões segmentados" descricao="Grupo de opções mutuamente exclusivas (filtros do Banco de Ativos).">
              <Panel>
                <div className="flex gap-2 max-w-md">
                  {['Todos', 'Vias Públicas', 'Indoor'].map((o, i) => (
                    <button key={o} onClick={() => setSeg(i)} className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition ${seg === i ? 'bg-[#ff4600] text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{o}</button>
                  ))}
                </div>
              </Panel>
            </Block>

            <Block title="Badges, pills e chips" descricao="Tags neutras, badges de status, chips de tipo de mídia e marcadores de novidade.">
              <Panel>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-block text-[12px] text-[#3a3a3a] bg-gray-100 border border-gray-200 rounded-full px-3 py-1">Pill neutra</span>
                  <span className="inline-block text-[12px] font-medium text-[#6a6a6a] bg-gray-100 px-2 py-0.5 rounded">badge</span>
                  <span className="inline-block text-[11px] font-medium text-[#ff4600] bg-orange-50 px-2.5 py-1 rounded-full">ativo</span>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Digital</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Estático</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">+ adicionar</span>
                  <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">– remover</span>
                  {STATUS.slice(0, 2).map((s) => <StatusBadgeDemo key={s.nome} {...s} />)}
                  <span className="inline-block border px-3 py-0.5 rounded text-xs font-semibold tracking-wide" style={{ color: '#FF9800', borderColor: '#FF980055' }}>Status (Meus Roteiros)</span>
                </div>
              </Panel>
            </Block>

            <Block title="Cards" descricao="Superfícies brancas com borda fina. Variantes: padrão, KPI, item selecionável e card de campanha.">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-[#1a1a1a]">Card padrão</h4>
                    <span className="text-[11px] font-medium text-[#6a6a6a] bg-gray-100 px-2 py-0.5 rounded">badge</span>
                  </div>
                  <p className="text-[12px] text-[#6a6a6a] leading-relaxed"><Spec>border-gray-200</Spec> + <Spec>rounded-xl</Spec></p>
                </div>
                <div className="rounded-xl border-2 border-gray-200 bg-white p-3">
                  <div className="flex items-center gap-1.5 mb-2"><span className="w-2 h-2 rounded-full bg-[#ff4600]" /><span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">Total geral</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><div className="text-lg font-bold text-gray-800">12.4k</div><div className="text-[9px] text-gray-400 uppercase">Pontos</div></div>
                    <div><div className="text-lg font-bold text-gray-800">312</div><div className="text-[9px] text-gray-400 uppercase">Cidades</div></div>
                  </div>
                </div>
                <div className="rounded-xl border-2 border-[#ff4600] bg-orange-50 p-3">
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-[#ff4600] mb-1">Cidade selecionada</div>
                  <div className="text-sm font-bold text-gray-800 truncate">São Paulo</div>
                  <div className="text-[10px] text-gray-500 mt-1">KPI card ativo (mapa)</div>
                </div>
                <div className="rounded-xl border-2 border-gray-800 bg-white px-4 py-3">
                  <div className="text-[10px] text-[#ff4600] uppercase tracking-wide font-semibold mb-0.5">Campanha</div>
                  <div className="text-sm font-bold text-gray-900 leading-tight">Roteiro Verão 2026</div>
                </div>
              </div>
            </Block>

            <Block title="Callouts e banners" descricao="Avisos contextuais. Neutro e informativo (inline); banner com ícone (mapa).">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <div className="border border-gray-200 bg-gray-50 text-[#3a3a3a] rounded-xl px-5 py-4 text-[13px] leading-relaxed">
                    <div className="font-semibold mb-1">Callout neutro</div>Mensagem de contexto sem urgência.
                  </div>
                  <div className="border border-blue-200 bg-blue-50 text-blue-900 rounded-xl px-5 py-4 text-[13px] leading-relaxed">
                    <div className="font-semibold mb-1">Callout informativo</div>Novidade ou nota técnica.
                  </div>
                </div>
                <div className="p-4 border-2 rounded-xl shadow-sm flex items-start gap-3 bg-gray-50 border-gray-300 text-gray-700">
                  <span className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm">i</span>
                  <div className="text-[13px] leading-relaxed pt-1">Banner de status (padrão do Mapa) — usado para mensagens de processamento ou ausência de dados.</div>
                </div>
              </div>
            </Block>

            <Block title="Campos de formulário" descricao="Inputs, selects e busca com ícone. Borda cinza, foco laranja, cantos rounded-lg.">
              <Panel>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div>
                    <label className="block text-[12px] font-medium text-[#6a6a6a] mb-1.5">Texto</label>
                    <input type="text" placeholder="Digite aqui" className="w-full h-10 px-3 text-sm border border-[#d9d9d9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff4600] focus:border-transparent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#6a6a6a] mb-1.5">Seleção</label>
                    <select className="w-full h-10 px-3 text-sm border border-[#d9d9d9] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#ff4600] focus:border-transparent transition-colors">
                      <option>Opção A</option><option>Opção B</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#6a6a6a] mb-1.5">Busca com ícone</label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" /></svg>
                      <input type="text" placeholder="Buscar" className="w-full h-10 pl-9 pr-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff4600] focus:border-transparent outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#6a6a6a] mb-1.5">Desabilitado</label>
                    <input type="text" disabled placeholder="Indisponível" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
                  </div>
                </div>
              </Panel>
            </Block>

            <Block title="Toggle / switch" descricao="Interruptor para liberar roteiros a agências (Meus Roteiros usa #FF9800).">
              <Panel>
                <label className="inline-flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={sw} onChange={() => setSw(!sw)} />
                  <span className="relative w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-[#FF9800] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                  <span className="text-[13px] text-[#3a3a3a]">{sw ? 'Liberado para agência' : 'Não liberado'}</span>
                </label>
              </Panel>
            </Block>

            <Block title="Tabs" descricao="Dois padrões: sublinhado (dominante) e pill/preenchido (listagens).">
              <Panel>
                <div className="mb-6">
                  <div className="border-b border-gray-200 flex items-center gap-1">
                    {['Visão geral', 'De-para', 'Praças'].map((t, i) => (
                      <button key={t} onClick={() => setTabUnder(i)} className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${tabUnder === i ? 'border-[#ff4600] text-[#1a1a1a] font-semibold' : 'border-transparent text-[#6a6a6a] hover:text-[#1a1a1a]'}`}>{t}</button>
                    ))}
                  </div>
                  <div className="text-[12px] text-[#9a9a9a] mt-2">Sublinhado · <Spec>border-b-2 border-[#ff4600]</Spec></div>
                </div>
                <div>
                  <div className="flex gap-2">
                    {['Ativos', 'Inativos'].map((t, i) => (
                      <button key={t} onClick={() => setTabPill(i)} className={`px-4 py-1.5 text-sm rounded-lg border transition ${tabPill === i ? 'bg-[#ff4600] text-white border-[#ff4600]' : 'bg-white text-[#3a3a3a] border-[#d9d9d9] hover:bg-[#f7f7f7]'}`}>{t}</button>
                    ))}
                  </div>
                  <div className="text-[12px] text-[#9a9a9a] mt-2">Pill · <Spec>bg-[#ff4600] text-white</Spec></div>
                </div>
              </Panel>
            </Block>

            <Block title="Tabelas" descricao="Variante clara (Admin/Banco) e variante de cabeçalho escuro com zebra (Meus Roteiros).">
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50 text-[#6a6a6a]"><tr>
                      <th className="text-left font-medium px-4 py-2.5 border-b border-gray-200">Coluna</th>
                      <th className="text-left font-medium px-4 py-2.5 border-b border-gray-200">Descrição</th>
                      <th className="text-left font-medium px-4 py-2.5 border-b border-gray-200">Status</th>
                    </tr></thead>
                    <tbody className="text-[#3a3a3a]">
                      {[['Linha 1', 'Conteúdo de exemplo', STATUS[0]], ['Linha 2', 'Outro exemplo', STATUS[1]]].map((r, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-2.5 font-medium">{r[0] as string}</td>
                          <td className="px-4 py-2.5">{r[1] as string}</td>
                          <td className="px-4 py-2.5"><StatusBadgeDemo {...(r[2] as typeof STATUS[number])} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-[12px] text-[#9a9a9a] mt-2">Clara · thead <Spec>bg-gray-50</Spec></div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0 font-sans">
                    <thead><tr className="bg-[#393939] h-10">
                      {['Roteiro', 'Agência', 'Status'].map((h) => <th key={h} className="text-white text-xs font-bold uppercase text-left px-6 py-2 tracking-wider">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {[0, 1].map((idx) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-[#f7f7f7]' : 'bg-white'} hover:bg-[#ececec] transition-colors`}>
                          <td className="text-[#222] text-sm px-6 py-4 whitespace-nowrap">Roteiro {idx + 1}</td>
                          <td className="text-[#222] text-sm px-6 py-4 whitespace-nowrap">Agência {idx + 1}</td>
                          <td className="px-6 py-4"><span className="inline-block border px-3 py-0.5 rounded text-xs font-semibold tracking-wide" style={{ color: '#FF9800', borderColor: '#FF980055' }}>Plano</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-[12px] text-[#9a9a9a] mt-2">Escura (Meus Roteiros) · thead <Spec>bg-[#393939]</Spec> · zebra <Spec>#f7f7f7</Spec></div>
                </div>
              </div>
            </Block>

            <Block title="Paginação" descricao="Página ativa em #3a3a3a; inativas com hover cinza.">
              <Panel>
                <div className="flex items-center justify-center gap-1 select-none">
                  <button className="w-20 h-8 flex items-center justify-center text-sm text-[#b0b0b0] hover:text-[#3a3a3a]">Anterior</button>
                  {[1, 2, 3, 4].map((p) => (
                    <button key={p} className={`w-10 h-10 mx-0.5 flex items-center justify-center text-base rounded-lg transition ${p === 1 ? 'bg-[#3a3a3a] text-white' : 'bg-white text-[#3a3a3a] hover:bg-[#b0b0b0] hover:text-[#222]'}`}>{p}</button>
                  ))}
                  <button className="w-20 h-8 flex items-center justify-center text-sm text-[#b0b0b0] hover:text-[#3a3a3a]">Próximo</button>
                </div>
              </Panel>
            </Block>

            <Block title="Modal" descricao="Overlay escuro + container branco arredondado com header e footer. Mesma estrutura em todos os modais do app.">
              <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-black/50 p-8 flex items-center justify-center">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h4 className="text-base font-bold text-[#222]">Título do modal</h4>
                    <button className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center">×</button>
                  </div>
                  <div className="px-5 py-5 text-[13px] text-[#6a6a6a] leading-relaxed">Conteúdo do modal. Overlay <Spec>bg-black/50</Spec>, container <Spec>rounded-2xl shadow-2xl</Spec>.</div>
                  <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                    <button className="px-5 py-2 border border-[#d9d9d9] rounded-lg text-sm text-[#3a3a3a] hover:bg-[#f7f7f7]">Cancelar</button>
                    <button className="px-5 py-2 bg-[#ff4600] text-white rounded-lg text-sm font-medium hover:bg-[#e03e00]">Confirmar</button>
                  </div>
                </div>
              </div>
            </Block>

            <div className="h-px bg-gray-200 my-8" />

            {/* ═══ ICONOGRAFIA ═══ */}
            <GroupHeader eyebrow="ICONOGRAFIA" title="Ícones do produto e do menu" />

            <Block title="Menu lateral esquerdo" descricao="Ícones de navegação na ordem real da Sidebar, com o estilo aplicado (muted #757575 → #222 no hover).">
              <Panel>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-w-2xl">
                  {MENU_LATERAL.map((m) => (
                    <div key={m.label} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[#ededed] transition-colors cursor-default group text-[#757575] hover:text-[#222]">
                      <span className="flex-shrink-0">{m.icone}</span>
                      <span className="font-medium text-sm tracking-[0.50px] flex-1">{m.label}</span>
                      <span className="text-[10px] font-mono text-[#b0b0b0]">{m.fonte}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6">
                  <span className="flex items-center gap-2 text-[12px] text-[#6a6a6a]"><KeyboardArrowDown className="w-5 h-5 text-[#757575]" /> Chevron de submenu</span>
                  <span className="flex items-center gap-2 text-[12px] text-[#6a6a6a]"><ArrowForwardIos className="w-5 h-5 text-[#757575]" /> Recolher menu</span>
                </div>
              </Panel>
            </Block>

            <Block title="Ícones do produto" descricao="Conjunto componentizado em src/icons, usado em botões, tabelas e ações em todo o app.">
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-3">
                {ICONES_PRODUTO.map((ic) => (
                  <div key={ic.nome} className="flex flex-col items-center gap-2 border border-gray-200 rounded-xl bg-white py-4 px-2">
                    <span className="flex items-center justify-center h-7">{ic.el}</span>
                    <span className="text-[10px] font-mono text-[#9a9a9a] text-center break-all leading-tight">{ic.nome}</span>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[#9a9a9a] mt-3">
                Tamanho padrão <Spec>w-5 h-5</Spec> (menu) ou <Spec>w-6 h-6</Spec>; cor via <Spec>text-[#757575]</Spec> /{' '}
                <Spec>currentColor</Spec> ou prop <Spec>color</Spec>.
              </p>
            </Block>

            <div className="h-px bg-gray-200 my-8" />

            {/* ═══ MAPAS & DATA VIZ ═══ */}
            <GroupHeader eyebrow="MAPAS & DATA VIZ" title="Visualizações geográficas e métricas" />

            <Block title="Painel flutuante (mapa)" descricao="Painel arrastável com efeito glass sobre o mapa, usado em Banco de Ativos e Mapa.">
              <div className="relative rounded-xl overflow-hidden border border-gray-200 h-56" style={{ background: 'linear-gradient(135deg,#eef2f6,#e2e8f0)' }}>
                <div className="absolute top-4 left-4 flex flex-col w-[280px] rounded-2xl shadow-2xl" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)' }}>
                  <div className="flex items-center justify-between px-3 py-2 rounded-t-2xl cursor-grab select-none" style={{ background: 'rgba(240,240,240,0.95)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Filtros e dados</span>
                    <span className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500">–</span>
                  </div>
                  <div className="p-3">
                    <div className="rounded-xl border-2 border-gray-200 bg-white p-3">
                      <div className="flex items-center gap-1.5 mb-2"><span className="w-2 h-2 rounded-full bg-[#ff4600]" /><span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">Total geral</span></div>
                      <div className="text-lg font-bold text-gray-800">12.4k <span className="text-[9px] text-gray-400 uppercase font-normal">pontos</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </Block>

            <Block title="Legenda de choropleth" descricao="Legenda flutuante (canto do mapa) com escala de densidade e ambiente.">
              <div className="inline-block rounded-[10px] px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
                <div className="text-[9px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Densidade de mídia</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] text-gray-400">−</span>
                  <div className="flex rounded overflow-hidden">{DENSIDADE.map((h) => <div key={h} className="w-5 h-3" style={{ backgroundColor: h }} />)}</div>
                  <span className="text-[9px] text-gray-400">+</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px] text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> VP</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Indoor</span>
                </div>
              </div>
            </Block>

            <Block title="Barras e medidores" descricao="Sem biblioteca de charts: barras em div e gauges/linhas em SVG.">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Panel>
                  <div className="text-[12px] font-medium text-[#3a3a3a] mb-3">Barra horizontal (div)</div>
                  <div className="space-y-2.5">
                    {[['Cobertura', 82, 'bg-emerald-500'], ['Frequência', 54, 'bg-amber-500'], ['Saturação', 28, 'bg-red-500']].map(([l, v, c]) => (
                      <div key={l as string}>
                        <div className="flex justify-between text-[11px] text-[#6a6a6a] mb-0.5"><span>{l as string}</span><span>{v as number}%</span></div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${c as string}`} style={{ width: `${v as number}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel>
                  <div className="text-[12px] font-medium text-[#3a3a3a] mb-3">Medidor (SVG donut)</div>
                  <div className="flex items-center justify-center">
                    <svg width={120} height={120} viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="48" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                      <circle cx="60" cy="60" r="48" fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 48 * 0.78} ${2 * Math.PI * 48}`} transform="rotate(-90 60 60)" />
                      <text x="60" y="58" textAnchor="middle" fontSize="22" fontWeight="300" fill="#222">78</text>
                      <text x="60" y="74" textAnchor="middle" fontSize="10" fill="#757575">saúde</text>
                    </svg>
                  </div>
                </Panel>
                <Panel>
                  <div className="text-[12px] font-medium text-[#3a3a3a] mb-3">Progresso (export)</div>
                  <div className="space-y-3 pt-2">
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#ff4600]" style={{ width: '64%' }} /></div>
                    <div className="text-[11px] text-[#9a9a9a]">Gerando arquivo… 64%</div>
                  </div>
                </Panel>
              </div>
            </Block>

            <div className="h-px bg-gray-200 my-8" />

            {/* ═══ FEEDBACK & NAVEGAÇÃO ═══ */}
            <GroupHeader eyebrow="FEEDBACK & NAVEGAÇÃO" title="Estados de carregamento e estrutura" />

            <Block title="Spinners" descricao="Spinner padrão Colmeia (borda cinza + topo laranja) em vários tamanhos.">
              <Panel>
                <div className="flex items-center gap-10">
                  <div className="flex flex-col items-center gap-2"><div className="w-5 h-5 border-2 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" /><span className="text-[11px] font-mono text-[#9a9a9a]">sm · 20px</span></div>
                  <div className="flex flex-col items-center gap-2"><div className="w-10 h-10 border-4 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" /><span className="text-[11px] font-mono text-[#9a9a9a]">md · 40px</span></div>
                  <div className="flex flex-col items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ff4600] animate-pulse" /><span className="text-[11px] font-mono text-[#9a9a9a]">pulse dot</span></div>
                </div>
              </Panel>
            </Block>

            <Block title="Skeleton (shimmer)" descricao="Placeholders animados durante o carregamento de tabelas (animate-shimmer).">
              <div className="overflow-hidden rounded-lg border border-gray-200">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`flex items-center gap-4 px-6 py-4 ${i % 2 === 0 ? 'bg-[#f7f7f7]' : 'bg-white'}`}>
                    <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer bg-[length:200%_100%] w-1/3" />
                    <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer bg-[length:200%_100%] w-1/4" />
                    <div className="h-6 w-20 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer bg-[length:200%_100%] ml-auto" />
                  </div>
                ))}
              </div>
            </Block>

            <Block title="Breadcrumb" descricao="Trilha de navegação no Topbar; links em hover azul, item atual em #666.">
              <Panel>
                <div className="text-xs text-[#3a3a3a] tracking-[0.50px]">
                  <span className="hover:text-blue-600 hover:underline cursor-pointer">Home</span>
                  <span className="mx-2 text-[#999]">/</span>
                  <span className="hover:text-blue-600 hover:underline cursor-pointer">Administração</span>
                  <span className="mx-2 text-[#999]">/</span>
                  <span className="text-[#666] font-medium">Design System</span>
                </div>
              </Panel>
            </Block>

            <div className="h-px bg-gray-200 my-8" />
            <p className="text-[12px] text-[#9a9a9a] pb-4">© 2026 Be Mediatech OOH — Colmeia · Design System (extraído dos padrões atuais do app)</p>

          </div>
        </div>
      </div>
    </div>
  );
}
