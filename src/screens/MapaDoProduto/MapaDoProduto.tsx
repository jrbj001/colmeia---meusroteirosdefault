import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { Topbar } from '../../components/Topbar/Topbar';

/* ─────────────────────────────────────────────────────────────────────────────
   Mapa do Produto — Colmeia
   Visão estrutural de todas as áreas, atores e rotas do produto.
   ───────────────────────────────────────────────────────────────────────────── */

type Ator = 'interno' | 'agencia' | 'exibidor' | 'admin';

interface Rota {
  label: string;
  path: string;
  descricao?: string;
  status?: 'ativo' | 'em-dev' | 'planejado';
  destaque?: boolean;
}

interface Grupo {
  id: string;
  titulo: string;
  descricao: string;
  ator: Ator[];
  icone: React.ReactNode;
  cor: string;          // borda / accent
  corBg: string;        // fundo do card
  rotas: Rota[];
}

const ATORES: Record<Ator, { label: string; cor: string; bg: string }> = {
  interno:  { label: 'Usuário BE180',   cor: '#b45309', bg: '#fef3c7' },
  agencia:  { label: 'Agência',         cor: '#1d4ed8', bg: '#dbeafe' },
  exibidor: { label: 'Exibidor',        cor: '#15803d', bg: '#dcfce7' },
  admin:    { label: 'Admin',           cor: '#7c3aed', bg: '#ede9fe' },
};

const GRUPOS: Grupo[] = [
  {
    id: 'roteiros',
    titulo: 'Roteiros',
    descricao: 'Criação e gestão de planos de mídia OOH e Indoor.',
    ator: ['interno', 'agencia'],
    icone: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    cor: '#ff4600',
    corBg: '#fff8f6',
    rotas: [
      { label: 'Home Dashboard', path: '/home-dashboard', descricao: 'Visão geral de roteiros e métricas', destaque: true },
      { label: 'Meus Roteiros', path: '/meus-roteiros', descricao: 'Lista de planos com status e filtros', destaque: true },
      { label: 'Criar Roteiro', path: '/criar-roteiro', descricao: 'Wizard 6-abas: tipo → praças → VP → Indoor → Config → Resultado' },
      { label: 'Visualizar Resultados', path: '/visualizar-resultados', descricao: 'Resultado completo com download Excel' },
      { label: 'Mapa Interativo', path: '/mapa', descricao: 'Mapa de praças com choropleth e filtros' },
    ],
  },
  {
    id: 'banco',
    titulo: 'Banco de Ativos',
    descricao: 'Inventário consolidado de pontos de mídia aprovados na Colmeia.',
    ator: ['interno'],
    icone: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
    cor: '#0891b2',
    corBg: '#f0f9ff',
    rotas: [
      { label: 'Dashboard', path: '/banco-de-ativos', descricao: 'KPIs e distribuição do inventário', destaque: true },
      { label: 'Relatório por praça', path: '/banco-de-ativos/relatorio-por-praca', descricao: 'Cobertura geográfica por cidade' },
      { label: 'Relatório por exibidor', path: '/banco-de-ativos/relatorio-por-exibidor', descricao: 'Volume e qualidade por exibidor' },
      { label: 'Consulta de endereço', path: '/consulta-endereco', descricao: 'Enriquecimento e geocodificação de endereços' },
      { label: 'Relatório P1A', path: '/relatorio-p1a', descricao: 'Análise de empilhamento de planos' },
    ],
  },
  {
    id: 'exibidores',
    titulo: 'Exibidores',
    descricao: 'Gestão do cadastro e do inventário de pontos enviados pelos exibidores.',
    ator: ['interno', 'admin', 'exibidor'],
    icone: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17.25V21m6-3.75V21m-9 0h12M4 4h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
      </svg>
    ),
    cor: '#15803d',
    corBg: '#f0fdf4',
    rotas: [
      { label: 'Gestão de exibidores', path: '/banco-de-ativos/cadastrar/exibidor', descricao: 'Cadastro, edição e status de exibidores parceiros' },
      { label: 'Listar exibidores', path: '/banco-de-ativos/exibidores', descricao: 'Visão tabular de todos os exibidores' },
      { label: 'Inventários recebidos', path: '/admin/inventarios-exibidor', descricao: 'Revisão e aprovação de lotes enviados (tela Isra)', destaque: true },
      { label: 'Dashboard exibidor', path: '/exibidor/dashboard', descricao: 'Portal do exibidor — visão do seu inventário' },
      { label: 'Meu inventário', path: '/exibidor/inventario', descricao: 'Lista de pontos enviados pelo exibidor' },
      { label: 'Importar nova base', path: '/exibidor/importar', descricao: 'Upload do template XLSX com pontos de mídia' },
      { label: 'Excluir pontos', path: '/exibidor/excluir', descricao: 'Remoção de pontos do inventário' },
      { label: 'Solicitações', path: '/exibidor/solicitacoes', descricao: 'Chat de feedback entre exibidor e BE180' },
    ],
  },
  {
    id: 'admin',
    titulo: 'Administração',
    descricao: 'Controle de acesso, usuários e permissões da plataforma.',
    ator: ['admin'],
    icone: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    cor: '#7c3aed',
    corBg: '#faf5ff',
    rotas: [
      { label: 'Gerenciar usuários', path: '/admin/usuarios', descricao: 'Criação, edição e status de usuários', destaque: true },
      { label: 'Gerenciar perfis', path: '/admin/perfis', descricao: 'Perfis e permissões de acesso' },
    ],
  },
  {
    id: 'docs',
    titulo: 'Documentação do sistema',
    descricao: 'Recursos internos de referência técnica e de produto.',
    ator: ['admin'],
    icone: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    cor: '#b45309',
    corBg: '#fffbeb',
    rotas: [
      { label: 'Blueprint / Diligência', path: '/admin/blueprint', descricao: 'Métricas de uso e visão técnica do produto', destaque: true },
      { label: 'Design System', path: '/admin/design-system', descricao: 'Tokens visuais, componentes e iconografia' },
      { label: 'Mapa do produto', path: '/admin/mapa-do-produto', descricao: 'Esta tela — estrutura completa do produto', destaque: true },
    ],
  },
];

/* ── Estatísticas rápidas ──────────────────────────────────────────────────── */
const totalRotas = GRUPOS.reduce((acc, g) => acc + g.rotas.length, 0);
const totalAtores = Object.keys(ATORES).length;

/* ── Pill de ator ─────────────────────────────────────────────────────────── */
function AtorPill({ ator }: { ator: Ator }) {
  const cfg = ATORES[ator];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
      style={{ color: cfg.cor, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

/* ── Badge de status de rota ─────────────────────────────────────────────── */
function StatusTag({ status }: { status?: Rota['status'] }) {
  if (!status || status === 'ativo') return null;
  const cfg =
    status === 'em-dev'
      ? { label: 'Em dev', color: '#1d4ed8', bg: '#dbeafe' }
      : { label: 'Planejado', color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span
      className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

/* ── Card de grupo ─────────────────────────────────────────────────────────── */
function GrupoCard({ grupo, selecionado, onSelect }: { grupo: Grupo; selecionado: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl border-2 transition-all duration-200 overflow-hidden
        ${selecionado ? 'shadow-lg scale-[1.01]' : 'hover:shadow-md hover:scale-[1.005]'}`}
      style={{
        borderColor: selecionado ? grupo.cor : '#e5e7eb',
        backgroundColor: selecionado ? grupo.corBg : '#fff',
      }}
    >
      {/* Cabeçalho */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: grupo.cor + '18', color: grupo.cor }}
          >
            {grupo.icone}
          </div>
          <div className="flex flex-wrap gap-1 justify-end">
            {grupo.ator.map((a) => <AtorPill key={a} ator={a} />)}
          </div>
        </div>
        <h3 className="text-[15px] font-semibold text-[#1a1a1a]">{grupo.titulo}</h3>
        <p className="text-[12px] text-[#757575] mt-1 leading-relaxed">{grupo.descricao}</p>
      </div>

      {/* Divisor */}
      <div className="h-px mx-6" style={{ backgroundColor: selecionado ? grupo.cor + '30' : '#f3f4f6' }} />

      {/* Lista de rotas */}
      <div className="px-6 py-4 space-y-1">
        {grupo.rotas.map((rota) => (
          <div
            key={rota.path}
            className="flex items-center gap-2 py-1"
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5"
              style={{ backgroundColor: rota.destaque ? grupo.cor : '#d1d5db' }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center flex-wrap gap-1">
                <span className={`text-[12px] ${rota.destaque ? 'font-semibold text-[#1a1a1a]' : 'text-[#3a3a3a]'}`}>
                  {rota.label}
                </span>
                <StatusTag status={rota.status} />
              </div>
              {rota.descricao && (
                <p className="text-[11px] text-[#9a9a9a] leading-snug mt-0.5">{rota.descricao}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-6 py-3 flex items-center justify-between"
        style={{ backgroundColor: selecionado ? grupo.cor + '08' : '#fafafa', borderTop: '1px solid ' + (selecionado ? grupo.cor + '20' : '#f3f4f6') }}
      >
        <span className="text-[11px] text-[#9a9a9a]">{grupo.rotas.length} tela{grupo.rotas.length !== 1 ? 's' : ''}</span>
        <span
          className="text-[11px] font-semibold"
          style={{ color: grupo.cor }}
        >
          {selecionado ? 'Selecionado' : 'Clique para detalhes →'}
        </span>
      </div>
    </div>
  );
}

/* ── Painel de detalhe ─────────────────────────────────────────────────────── */
function PainelDetalhe({ grupo }: { grupo: Grupo }) {
  return (
    <div
      className="rounded-2xl border-2 p-8 sticky top-6"
      style={{ borderColor: grupo.cor + '40', backgroundColor: grupo.corBg }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: grupo.cor, color: '#fff' }}
        >
          {grupo.icone}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#1a1a1a]">{grupo.titulo}</h2>
          <p className="text-[13px] text-[#757575] mt-0.5">{grupo.descricao}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {grupo.ator.map((a) => <AtorPill key={a} ator={a} />)}
      </div>

      <div className="space-y-3">
        {grupo.rotas.map((rota) => (
          <Link
            key={rota.path}
            to={rota.path}
            className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                backgroundColor: rota.destaque ? grupo.cor : grupo.cor + '18',
                color: rota.destaque ? '#fff' : grupo.cor,
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[13px] font-medium group-hover:text-[${grupo.cor}] transition-colors ${rota.destaque ? 'text-[#1a1a1a]' : 'text-[#3a3a3a]'}`}>
                  {rota.label}
                </span>
                <StatusTag status={rota.status} />
              </div>
              {rota.descricao && (
                <p className="text-[11px] text-[#9a9a9a] mt-0.5 leading-relaxed">{rota.descricao}</p>
              )}
              <span className="text-[10px] font-mono text-[#b0b0b0] mt-1 block">{rota.path}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Tela principal ─────────────────────────────────────────────────────────── */
export function MapaDoProduto() {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>(GRUPOS[0].id);

  const grupoAtivo = GRUPOS.find((g) => g.id === grupoSelecionado) ?? GRUPOS[0];

  return (
    <div className="min-h-screen bg-[#fafafa] flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div className={`fixed top-0 z-40 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? 'left-20' : 'left-64'}`} />
      <div className={`flex-1 transition-all duration-300 min-h-screen ${menuReduzido ? 'ml-20' : 'ml-64'}`}>
        <Topbar
          menuReduzido={menuReduzido}
          breadcrumb={{ items: [{ label: 'Home', path: '/' }, { label: 'Documentação do sistema' }, { label: 'Mapa do produto' }] }}
        />
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`} />

        <div className="pt-24 pb-32 px-10 xl:px-14 2xl:px-20 max-w-[1280px]">

          {/* ─── Cabeçalho ─────────────────────────────────────────────── */}
          <header className="mb-10">
            <p className="text-[11px] font-bold tracking-[0.18em] text-[#ff4600] mb-2 uppercase">Documentação do sistema</p>
            <h1 className="text-4xl font-light text-[#1a1a1a] tracking-tight mb-3">Mapa do produto</h1>
            <p className="text-[15px] text-[#6a6a6a] max-w-2xl leading-relaxed">
              Estrutura completa da plataforma Colmeia — todas as áreas, telas e perfis de acesso em uma visão única.
              Clique em uma área para explorar suas telas.
            </p>

            {/* Stats rápidos */}
            <div className="flex flex-wrap gap-6 mt-6">
              <div className="flex flex-col gap-0.5">
                <span className="text-3xl font-light text-[#1a1a1a]">{totalRotas}</span>
                <span className="text-[11px] uppercase tracking-[0.15em] text-[#9a9a9a] font-bold">telas mapeadas</span>
              </div>
              <div className="w-px bg-gray-200 self-stretch" />
              <div className="flex flex-col gap-0.5">
                <span className="text-3xl font-light text-[#1a1a1a]">{GRUPOS.length}</span>
                <span className="text-[11px] uppercase tracking-[0.15em] text-[#9a9a9a] font-bold">áreas</span>
              </div>
              <div className="w-px bg-gray-200 self-stretch" />
              <div className="flex flex-col gap-0.5">
                <span className="text-3xl font-light text-[#1a1a1a]">{totalAtores}</span>
                <span className="text-[11px] uppercase tracking-[0.15em] text-[#9a9a9a] font-bold">perfis de acesso</span>
              </div>
              <div className="w-px bg-gray-200 self-stretch" />
              {/* Legenda de atores */}
              <div className="flex flex-wrap items-center gap-2 self-center">
                {(Object.entries(ATORES) as [Ator, typeof ATORES[Ator]][]).map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ color: v.cor, backgroundColor: v.bg }}
                  >
                    {v.label}
                  </span>
                ))}
              </div>
            </div>
          </header>

          <div className="h-px bg-gray-200 mb-10" />

          {/* ─── Grid principal ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8 items-start">

            {/* Cards de grupos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {GRUPOS.map((grupo) => (
                <GrupoCard
                  key={grupo.id}
                  grupo={grupo}
                  selecionado={grupoSelecionado === grupo.id}
                  onSelect={() => setGrupoSelecionado(grupo.id)}
                />
              ))}
            </div>

            {/* Painel de detalhe fixo */}
            <div className="hidden xl:block">
              <PainelDetalhe grupo={grupoAtivo} />
            </div>
          </div>

          {/* Painel mobile (abaixo dos cards) */}
          <div className="xl:hidden mt-8">
            <PainelDetalhe grupo={grupoAtivo} />
          </div>

        </div>
      </div>
    </div>
  );
}
