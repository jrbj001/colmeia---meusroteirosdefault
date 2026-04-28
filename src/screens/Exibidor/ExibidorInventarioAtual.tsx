import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../config/axios';
import { ExibidorShell } from './components/ExibidorShell';

interface Stats {
  totalPontos_vl: number;
  pracas_vl: number;
  viasPublicas_vl: number;
  indoor_vl: number;
}

interface AtivoLegado {
  pk: number;
  code: string;
  latitude: number | null;
  longitude: number | null;
  cidade_st: string | null;
  estado_st: string | null;
  exibidor_st: string | null;
  tipoMidia_st: string | null;
  environment_st: string | null;
  media_format_st: string | null;
  grupo_st: string | null;
  grupoSub_st: string | null;
}

interface TipoItem { tipoMidia_st: string; qtd: number }
interface CidadeItem { cidade_st: string; estado_st: string; qtd: number }

interface ApiResponse {
  success: boolean;
  stats: Stats;
  tipos: TipoItem[];
  cidades: CidadeItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  data: AtivoLegado[];
}

const cardBlue = 'rounded-2xl border border-[#a8c2ef] bg-[#0a52e6] text-white p-5';
const cardLight = 'rounded-2xl border border-[#a8c2ef] bg-white p-5';

export const ExibidorInventarioAtual: React.FC = () => {
  const [resp, setResp] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [cidadeFiltro, setCidadeFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (p = 1) => {
    setLoading(true);
    setErro(null);
    try {
      const params: Record<string, string> = { mode: 'legado', page: String(p), limit: '100' };
      if (search.trim()) params.search = search.trim();
      if (cidadeFiltro) params.cidade = cidadeFiltro;
      if (tipoFiltro) params.tipo = tipoFiltro;
      const { data } = await api.get('/exibidor-inventario', { params });
      setResp(data);
      setPage(p);
    } catch (err: any) {
      setErro(err?.response?.data?.error || err?.message || 'Erro ao carregar inventário');
    } finally {
      setLoading(false);
    }
  }, [search, cidadeFiltro, tipoFiltro]);

  useEffect(() => { carregar(1); }, [carregar]);

  const stats = resp?.stats;
  const ativos = resp?.data || [];
  const tipos = resp?.tipos || [];
  const cidades = resp?.cidades || [];
  const pagination = resp?.pagination;

  const semDados = !loading && !erro && (stats?.totalPontos_vl || 0) === 0;

  return (
    <ExibidorShell
      title="Inventário atual"
      subtitle="Base de pontos de mídia registrados no banco de ativos da BE180 vinculados ao seu exibidor."
      breadcrumb={[
        { label: 'Home', path: '/' },
        { label: 'Exibidor' },
        { label: 'Inventário atual' },
      ]}
    >
      {loading && !resp ? (
        <div className="text-[#666]">Carregando inventário...</div>
      ) : erro ? (
        <div className="p-4 rounded-xl bg-[#fff5f5] border border-[#f4caca] text-sm text-[#7f1d1d]">
          {erro}
        </div>
      ) : semDados ? (
        <div className="border-2 border-dashed border-[#ddd] rounded-2xl p-16 text-center">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-lg font-semibold text-[#3a3a3a]">Nenhum ponto vinculado ainda</p>
          <p className="text-sm text-[#666] mt-2 max-w-md mx-auto">
            Sua empresa ainda não possui ativos linkados no banco de ativos da BE180.
            Faça o upload do seu inventário em <strong>Base de inventário → Importar pontos</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={cardBlue}>
              <p className="text-xs uppercase opacity-80">Total de pontos</p>
              <p className="text-4xl font-bold mt-2">
                {Number(stats?.totalPontos_vl || 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className={cardBlue}>
              <p className="text-xs uppercase opacity-80">Praças</p>
              <p className="text-4xl font-bold mt-2">
                {Number(stats?.pracas_vl || 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className={cardLight}>
              <p className="text-xs uppercase text-[#666]">Vias públicas</p>
              <p className="text-4xl font-bold text-[#0a52e6] mt-2">
                {Number(stats?.viasPublicas_vl || 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className={cardLight}>
              <p className="text-xs uppercase text-[#666]">Indoor</p>
              <p className="text-4xl font-bold text-[#0a52e6] mt-2">
                {Number(stats?.indoor_vl || 0).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Buscar por código, cidade ou tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && carregar(1)}
              className="h-[40px] px-3 border border-[#d9d9d9] rounded-lg w-[300px] focus:outline-none focus:ring-2 focus:ring-[#ff4600] text-sm"
            />

            {cidades.length > 0 && (
              <select
                value={cidadeFiltro}
                onChange={(e) => setCidadeFiltro(e.target.value)}
                className="h-[40px] px-3 border border-[#d9d9d9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4600]"
              >
                <option value="">Todas as cidades</option>
                {cidades.map((c) => (
                  <option key={c.cidade_st} value={c.cidade_st}>
                    {c.cidade_st}/{c.estado_st} ({c.qtd.toLocaleString('pt-BR')})
                  </option>
                ))}
              </select>
            )}

            {tipos.length > 0 && (
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="h-[40px] px-3 border border-[#d9d9d9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4600]"
              >
                <option value="">Todos os tipos</option>
                {tipos.map((t) => (
                  <option key={t.tipoMidia_st} value={t.tipoMidia_st}>
                    {t.tipoMidia_st} ({t.qtd.toLocaleString('pt-BR')})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => carregar(1)}
              disabled={loading}
              className="h-[40px] px-4 bg-[#ff4600] hover:bg-[#e33d00] text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>

            {(search || cidadeFiltro || tipoFiltro) && (
              <button
                onClick={() => { setSearch(''); setCidadeFiltro(''); setTipoFiltro(''); }}
                className="h-[40px] px-3 border border-[#d9d9d9] rounded-lg text-sm hover:bg-[#f8f8f8]"
              >
                Limpar filtros
              </button>
            )}

            {pagination && (
              <span className="text-xs text-[#888] ml-auto">
                {pagination.total.toLocaleString('pt-BR')} pontos encontrados
              </span>
            )}
          </div>

          {/* Tabela */}
          <div className="border border-[#ddd] rounded-xl overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f7f7f7]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-[#3a3a3a]">Código</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3a3a3a]">Cidade / UF</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3a3a3a]">Tipo de mídia</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3a3a3a]">Formato</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3a3a3a]">Ambiente</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3a3a3a]">Grupo</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#666]">
                      Carregando...
                    </td>
                  </tr>
                ) : ativos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#666]">
                      Nenhum resultado para os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  ativos.map((a) => (
                    <tr key={a.pk} className="border-t border-[#eee] hover:bg-[#fafafa]">
                      <td className="px-4 py-2.5 font-mono text-xs text-[#0a52e6]">{a.code}</td>
                      <td className="px-4 py-2.5">
                        {a.cidade_st || '—'}
                        {a.estado_st ? <span className="text-[#888]">/{a.estado_st}</span> : null}
                      </td>
                      <td className="px-4 py-2.5">{a.tipoMidia_st || '—'}</td>
                      <td className="px-4 py-2.5">{a.media_format_st || '—'}</td>
                      <td className="px-4 py-2.5">{a.environment_st || '—'}</td>
                      <td className="px-4 py-2.5 text-[#666]">{a.grupo_st || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#666]">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => carregar(pagination.page - 1)}
                  className="h-[36px] px-4 border border-[#d9d9d9] rounded-lg hover:bg-[#f8f8f8] disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => carregar(pagination.page + 1)}
                  className="h-[36px] px-4 border border-[#d9d9d9] rounded-lg hover:bg-[#f8f8f8] disabled:opacity-40"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </ExibidorShell>
  );
};
