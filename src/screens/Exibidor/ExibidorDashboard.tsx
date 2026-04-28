import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/axios';
import { ExibidorShell } from './components/ExibidorShell';

interface DashboardData {
  totalPontos_vl?: number;
  pracas_vl?: number;
  viasPublicas_vl?: number;
  indoor_vl?: number;
  legado_vl?: number;
  novoAprovado_vl?: number;
  novoTotal_vl?: number;
  emAnalise_vl?: number;
  revisaoPendente_vl?: number;
  ultimaAtualizacao_dh?: string | null;
}

interface Solicitacao {
  lote_pk: number;
  arquivo_st: string;
  status_st: string;
  totalRegistros_vl: number;
  dataCriacao_dh: string;
}

const n = (v?: number) => new Intl.NumberFormat('pt-BR').format(v || 0);

const compact = (v?: number) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

const dataFmt = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

const STATUS: Record<string, { label: string; color: string }> = {
  APROVADO:      { label: 'Aprovado',      color: '#16a34a' },
  EM_ANALISE:    { label: 'Em análise',    color: '#d97706' },
  PARA_CORRIGIR: { label: 'Para corrigir', color: '#dc2626' },
};

// ─── Cabeçalho de seção (título minúsculo + linha) ───────────────────────────
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
      {description && (
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      )}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

export const ExibidorDashboard: React.FC = () => {
  const [data, setData]        = useState<DashboardData>({});
  const [solicitacoes, setSol] = useState<Solicitacao[]>([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    let ok = true;
    Promise.all([
      api.get('/exibidor-inventario', { params: { mode: 'dashboard' } }),
      api.get('/exibidor-inventario', { params: { mode: 'solicitacoes' } }),
    ]).then(([d, s]) => {
      if (!ok) return;
      setData(d.data?.data || {});
      setSol((s.data?.data || []).slice(0, 8));
    }).finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, []);

  const total  = data.totalPontos_vl  || 0;
  const legado = data.legado_vl       || 0;
  const novo   = data.novoAprovado_vl || 0;
  const pracas = data.pracas_vl       || 0;
  const vp     = data.viasPublicas_vl || 0;
  const indoor = data.indoor_vl       || 0;
  const pctL   = total > 0 ? Math.round((legado / total) * 100) : 0;
  const pctN   = total > 0 ? Math.round((novo   / total) * 100) : 0;
  const pctVP  = total > 0 ? Math.round((vp     / total) * 100) : 0;
  const pctIN  = total > 0 ? Math.round((indoor / total) * 100) : 0;

  if (loading) {
    return (
      <ExibidorShell
        title="Visão geral"
        subtitle="Indicadores do seu inventário consolidado."
        breadcrumb={[{ label: 'Home', path: '/' }, { label: 'Exibidor' }, { label: 'Visão geral' }]}
      >
        <div className="space-y-12 animate-pulse">
          <div className="h-40 bg-gray-100 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
          <div className="h-72 bg-gray-100 rounded-xl" />
        </div>
      </ExibidorShell>
    );
  }

  return (
    <ExibidorShell
      title="Visão geral"
      subtitle="Indicadores do seu inventário consolidado."
      breadcrumb={[{ label: 'Home', path: '/' }, { label: 'Exibidor' }, { label: 'Visão geral' }]}
      actions={
        <Link
          to="/exibidor/importar"
          className="inline-flex items-center h-10 px-5 rounded-lg bg-[#ff4600] hover:bg-[#e33d00] text-white text-sm font-medium transition-colors"
        >
          Importar nova base
        </Link>
      }
    >
      {/* container com max-width para respiração lateral em telas grandes */}
      <div className="max-w-7xl mx-auto space-y-16">

        {/* ═══════════════════════════════════════════════════════════════
            SEÇÃO 1 — HERO: total de pontos como número grande
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
                {n(total)} pontos de mídia · base BE180 + envios aprovados
              </p>
            </div>

            <div className="flex gap-12 pb-2 ml-auto">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Praças</p>
                <p className="text-2xl font-bold text-gray-900">{n(pracas)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Última atualização</p>
                <p className="text-2xl font-bold text-gray-900">{dataFmt(data.ultimaAtualizacao_dh)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SEÇÃO 2 — Distribuição por origem (barras grandes)
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader
            eyebrow="Distribuição"
            title="Composição por origem"
            description="Como seus pontos estão divididos entre o legado BE180 e os envios aprovados."
            action={
              <Link to="/exibidor/inventario" className="text-sm text-[#ff4600] hover:underline font-medium">
                Ver inventário →
              </Link>
            }
          />

          <div className="pt-8 space-y-8">
            {/* Legado */}
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <p className="text-base font-semibold text-gray-900">Legado BE180</p>
                  <p className="text-xs text-gray-400 mt-0.5">Base consolidada já validada pela BE180</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{n(legado)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{pctL}% do total</p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-800 rounded-full transition-all duration-700" style={{ width: `${pctL}%` }} />
              </div>
            </div>

            {/* Enviados */}
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <p className="text-base font-semibold text-gray-900">Enviados (aprovados)</p>
                  <p className="text-xs text-gray-400 mt-0.5">Pontos que você enviou e foram aprovados</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{n(novo)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{pctN}% do total</p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#ff4600] rounded-full transition-all duration-700" style={{ width: `${pctN}%` }} />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SEÇÃO 3 — Distribuição por ambiente (VP × Indoor)
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader
            eyebrow="Ambiente"
            title="Vias públicas vs Indoor"
            description="Tipo de instalação dos pontos do seu inventário."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-gray-200 mt-8 border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-white p-8">
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Vias públicas</p>
              <p className="text-5xl font-bold text-gray-900 mt-4 tracking-tight">{compact(vp)}</p>
              <p className="text-sm text-gray-500 mt-2">{n(vp)} pontos · {pctVP}% do total</p>
              <div className="mt-6 h-1 bg-gray-100 rounded-full">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pctVP}%` }} />
              </div>
            </div>
            <div className="bg-white p-8">
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Indoor</p>
              <p className="text-5xl font-bold text-gray-900 mt-4 tracking-tight">{compact(indoor)}</p>
              <p className="text-sm text-gray-500 mt-2">{n(indoor)} pontos · {pctIN}% do total</p>
              <div className="mt-6 h-1 bg-gray-100 rounded-full">
                <div className="h-full bg-[#ff4600] rounded-full" style={{ width: `${pctIN}%` }} />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SEÇÃO 4 — Status das solicitações
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader
            eyebrow="Atividade"
            title="Solicitações de envio"
            description="Acompanhe o status dos lotes que você enviou."
            action={
              <Link to="/exibidor/solicitacoes" className="text-sm text-[#ff4600] hover:underline font-medium">
                Ver todas →
              </Link>
            }
          />

          {/* contadores rápidos */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200 mt-8 mb-10 border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-white p-6">
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Em análise</p>
              <p className="text-3xl font-bold text-gray-900 mt-3 tracking-tight">{data.emAnalise_vl || 0}</p>
              <p className="text-xs text-gray-400 mt-1">aguardando revisão</p>
            </div>
            <div className="bg-white p-6">
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Para corrigir</p>
              <p className="text-3xl font-bold text-gray-900 mt-3 tracking-tight">{data.revisaoPendente_vl || 0}</p>
              <p className="text-xs text-gray-400 mt-1">requerem ação sua</p>
            </div>
            <div className="bg-white p-6">
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Total enviados</p>
              <p className="text-3xl font-bold text-gray-900 mt-3 tracking-tight">{n(data.novoTotal_vl || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">pontos em todos os lotes</p>
            </div>
          </div>

          {/* lista das últimas */}
          {solicitacoes.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-xl py-16 text-center">
              <p className="text-base text-gray-500">Nenhum envio ainda.</p>
              <Link
                to="/exibidor/importar"
                className="inline-flex items-center mt-4 h-10 px-5 rounded-lg bg-[#ff4600] hover:bg-[#e33d00] text-white text-sm font-medium transition-colors"
              >
                Importar primeira base
              </Link>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Arquivo</th>
                    <th className="text-left px-6 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Data</th>
                    <th className="text-right px-6 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Itens</th>
                    <th className="text-right px-6 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {solicitacoes.map((s) => {
                    const st = STATUS[s.status_st] || { label: s.status_st, color: '#999' };
                    return (
                      <tr key={s.lote_pk} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-800 font-medium truncate max-w-xs">
                          {s.arquivo_st}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(s.dataCriacao_dh).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-700 font-medium">
                          {n(s.totalRegistros_vl)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-semibold" style={{ color: st.color }}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* respiro final */}
        <div className="h-12" />
      </div>
    </ExibidorShell>
  );
};
