import React, { useEffect, useState } from 'react';
import api from '../../config/axios';
import { ExibidorShell } from './components/ExibidorShell';

interface DashboardData {
  totalPontos_vl?: number;
  pracas_vl?: number;
  viasPublicas_vl?: number;
  indoor_vl?: number;
  emAnalise_vl?: number;
  revisaoPendente_vl?: number;
  ultimaAtualizacao_dh?: string | null;
}

const formatarData = (iso?: string | null) => {
  if (!iso) return 'Sem atualização';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Sem atualização';
  return date.toLocaleDateString('pt-BR');
};

export const ExibidorDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await api.get('/exibidor-inventario', { params: { mode: 'dashboard' } });
        if (mounted) setData(response.data?.data || {});
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const cardClass = 'rounded-2xl border border-[#0050df] bg-[#0a52e6] text-white p-6 min-h-[120px]';
  const lightCardClass = 'rounded-2xl border border-[#a8c2ef] bg-white p-5';

  return (
    <ExibidorShell
      title="Dashboard"
      subtitle="Resumo da base de inventário do exibidor e status das solicitações recentes."
      breadcrumb={[{ label: 'Home', path: '/' }, { label: 'Exibidor' }, { label: 'Dashboard' }]}
    >
      {loading ? (
        <div className="text-[#666]">Carregando indicadores...</div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-bold text-[#3a3a3a] uppercase mb-3">Total</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={cardClass}>
                <p className="text-xs uppercase opacity-85">Total de pontos na base</p>
                <p className="text-4xl font-bold mt-3">{Number(data.totalPontos_vl || 0).toLocaleString('pt-BR')}</p>
              </div>
              <div className={cardClass}>
                <p className="text-xs uppercase opacity-85">Praças</p>
                <p className="text-4xl font-bold mt-3">{Number(data.pracas_vl || 0).toLocaleString('pt-BR')}</p>
              </div>
              <div className={cardClass}>
                <p className="text-xs uppercase opacity-85">Última atualização</p>
                <p className="text-4xl font-bold mt-3">{formatarData(data.ultimaAtualizacao_dh)}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-[#3a3a3a] uppercase mb-3">Pontos de mídia</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={lightCardClass}>
                <p className="text-xs uppercase text-[#666]">Vias públicas</p>
                <p className="text-4xl text-[#0a52e6] font-bold mt-2">{Number(data.viasPublicas_vl || 0).toLocaleString('pt-BR')}</p>
              </div>
              <div className={lightCardClass}>
                <p className="text-xs uppercase text-[#666]">Indoor</p>
                <p className="text-4xl text-[#0a52e6] font-bold mt-2">{Number(data.indoor_vl || 0).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-[#3a3a3a] uppercase mb-3">Status de solicitação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={lightCardClass}>
                <p className="text-xs uppercase text-[#666]">Em análise</p>
                <p className="text-4xl text-[#0a52e6] font-bold mt-2">{Number(data.emAnalise_vl || 0)}</p>
              </div>
              <div className={lightCardClass}>
                <p className="text-xs uppercase text-[#666]">Revisão pendente</p>
                <p className="text-4xl text-[#0a52e6] font-bold mt-2">{Number(data.revisaoPendente_vl || 0)}</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </ExibidorShell>
  );
};
