import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../config/axios';
import { ExibidorShell } from './components/ExibidorShell';
import { DrawerDetalhePonto, PontoRef } from './components/DrawerDetalhePonto';

type Aba = 'consolidado' | 'legado' | 'exibidor';

interface LinhaConsolidado {
  row_id: string;
  pk: number;
  origem: 'legado' | 'exibidor';
  code: string;
  cidade: string | null;
  estado: string | null;
  tipo_midia: string | null;
  ambiente: string | null;
  formato: string | null;
  grupo: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface RespConsolidado {
  success: boolean;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: { legado_vl: number; exibidor_vl: number };
  data: LinhaConsolidado[];
}

const n = (v: number) => new Intl.NumberFormat('pt-BR').format(v || 0);
const compact = (v: number) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

// ─── Aba minimal (texto + sublinhado laranja quando ativo) ───────────────────
const Tab: React.FC<{
  ativo: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}> = ({ ativo, onClick, label, count }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative px-1 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-baseline gap-2 ${
      ativo ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700'
    }`}
  >
    <span>{label}</span>
    {typeof count === 'number' && (
      <span className={`text-xs ${ativo ? 'text-[#ff4600] font-semibold' : 'text-gray-300'}`}>
        {n(count)}
      </span>
    )}
    {ativo && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#ff4600]" />}
  </button>
);

// ─── Origem como texto simples ───────────────────────────────────────────────
const OrigemLabel: React.FC<{ origem: 'legado' | 'exibidor' }> = ({ origem }) => (
  <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-500">
    {origem === 'legado' ? 'BE180' : 'Enviado'}
  </span>
);

const SectionHeader: React.FC<{
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ eyebrow, title, description, action }) => (
  <div className="flex items-end justify-between gap-6 pb-5 border-b border-gray-200">
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#ff4600] font-semibold mb-2">
        {eyebrow}
      </p>
      <h2 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

export const ExibidorInventario: React.FC = () => {
  const [aba, setAba]                   = useState<Aba>('consolidado');
  const [resp, setResp]                 = useState<RespConsolidado | null>(null);
  const [loading, setLoading]           = useState(true);
  const [erro, setErro]                 = useState<string | null>(null);
  const [search, setSearch]             = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const [pontoSelecionado, setPontoSel] = useState<PontoRef | null>(null);

  const carregar = useCallback(async (p = 1) => {
    setLoading(true);
    setErro(null);
    try {
      const params: Record<string, string> = {
        mode: 'consolidado',
        page: String(p),
        limit: '100',
      };
      if (aba !== 'consolidado') params.origem = aba;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/exibidor-inventario', { params });
      setResp(data);
    } catch (err: any) {
      setErro(err?.response?.data?.error || err?.message || 'Erro ao carregar inventário');
    } finally {
      setLoading(false);
    }
  }, [aba, search]);

  useEffect(() => {
    carregar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, search]);

  const stats      = resp?.stats;
  const total      = stats ? Number(stats.legado_vl) + Number(stats.exibidor_vl) : 0;
  const linhas     = resp?.data || [];
  const pagination = resp?.pagination;
  const semDados   = useMemo(() =>
    !loading && !erro && (resp?.pagination?.total || 0) === 0,
    [loading, erro, resp]
  );

  const aplicarBusca = () => setSearch(searchInput);

  return (
    <ExibidorShell
      title="Meu inventário"
      subtitle="Pontos de mídia consolidados — base BE180 e envios aprovados."
      breadcrumb={[
        { label: 'Home', path: '/' },
        { label: 'Exibidor' },
        { label: 'Meu inventário' },
      ]}
    >
      <div className="space-y-12">

        {/* ═══════════════════════════════════════════════════════════════
            SEÇÃO 1 — Resumo
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 font-semibold mb-4">
            Inventário consolidado
          </p>
          <div className="flex items-end gap-8 flex-wrap">
            <div>
              <h1 className="text-7xl font-bold text-gray-900 tracking-tighter leading-none">
                {compact(total)}
              </h1>
              <p className="text-sm text-gray-500 mt-3">
                {n(total)} pontos · base BE180 + envios aprovados
              </p>
            </div>
            {stats && (
              <div className="flex gap-12 pb-2 ml-auto">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Legado BE180</p>
                  <p className="text-2xl font-bold text-gray-900">{n(stats.legado_vl)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Enviados</p>
                  <p className="text-2xl font-bold text-gray-900">{n(stats.exibidor_vl)}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SEÇÃO 2 — Tabela
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader
            eyebrow="Pontos"
            title="Listagem completa"
            description="Filtre por origem ou busque por código, cidade ou tipo de mídia."
            action={
              pagination && (
                <span className="text-xs text-gray-400">
                  {n(pagination.total)} ponto(s) encontrado(s)
                </span>
              )
            }
          />

          {/* Abas + busca */}
          <div className="pt-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200">
            <div className="flex items-center gap-8">
              <Tab ativo={aba === 'consolidado'} onClick={() => setAba('consolidado')} label="Consolidado" count={total} />
              <Tab ativo={aba === 'legado'}      onClick={() => setAba('legado')}      label="Legado BE180" count={stats?.legado_vl} />
              <Tab ativo={aba === 'exibidor'}    onClick={() => setAba('exibidor')}    label="Enviados por mim" count={stats?.exibidor_vl} />
            </div>

            <div className="flex items-center gap-2 pb-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar código, cidade ou tipo..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && aplicarBusca()}
                  className="h-9 pl-9 pr-3 border border-gray-200 rounded-lg w-72 focus:outline-none focus:border-gray-400 text-sm transition-colors"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              </div>
              {search && (
                <button
                  onClick={() => { setSearch(''); setSearchInput(''); }}
                  className="h-9 px-3 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Tabela 100% width */}
          <div className="mt-6">
            {erro ? (
              <div className="border border-red-100 bg-red-50/40 rounded-xl p-5 text-sm text-[#7f1d1d]">
                {erro}
              </div>
            ) : semDados ? (
              <div className="border border-dashed border-gray-200 rounded-xl py-16 text-center">
                <p className="text-base text-gray-500">Nenhum ponto encontrado</p>
                <p className="text-xs text-gray-400 mt-2">
                  Ajuste os filtros ou envie uma nova base de inventário.
                </p>
              </div>
            ) : (
              <div className="w-full">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left pl-1 pr-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold w-20">Origem</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Código</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Cidade / UF</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Tipo de mídia</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Formato</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Ambiente</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Grupo</th>
                      <th className="w-8 pr-1" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      [...Array(8)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="pl-1 pr-4 py-4"><div className="h-3 bg-gray-100 rounded w-12" /></td>
                          <td className="px-4 py-4"><div className="h-3 bg-gray-100 rounded w-24" /></td>
                          <td className="px-4 py-4"><div className="h-3 bg-gray-100 rounded w-32" /></td>
                          <td className="px-4 py-4"><div className="h-3 bg-gray-100 rounded w-28" /></td>
                          <td className="px-4 py-4"><div className="h-3 bg-gray-100 rounded w-16" /></td>
                          <td className="px-4 py-4"><div className="h-3 bg-gray-100 rounded w-16" /></td>
                          <td className="px-4 py-4"><div className="h-3 bg-gray-100 rounded w-10" /></td>
                          <td />
                        </tr>
                      ))
                    ) : (
                      linhas.map((l) => (
                        <tr
                          key={l.row_id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors group"
                          onClick={() => setPontoSel({ origem: l.origem, pk: l.pk })}
                        >
                          <td className="pl-1 pr-4 py-3.5">
                            <OrigemLabel origem={l.origem} />
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-gray-700">{l.code}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-800">
                            {l.cidade || '—'}
                            {l.estado && <span className="text-gray-400">/{l.estado}</span>}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-700">{l.tipo_midia || '—'}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-500">{l.formato || '—'}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-500">{l.ambiente || '—'}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-500">{l.grupo || '—'}</td>
                          <td className="pr-1 py-3.5 text-right">
                            <span className="text-xs text-gray-300 group-hover:text-[#ff4600] transition-colors">→</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  Página <span className="text-gray-700 font-semibold">{pagination.page}</span> de {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => carregar(pagination.page - 1)}
                    className="h-9 px-4 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Anterior
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages || loading}
                    onClick={() => carregar(pagination.page + 1)}
                    className="h-9 px-4 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="h-12" />
      </div>

      <DrawerDetalhePonto ponto={pontoSelecionado} onClose={() => setPontoSel(null)} />
    </ExibidorShell>
  );
};
