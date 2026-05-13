import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../../config/axios';
import { FiltroItens, ItemInventario, ItensResposta } from '../types';

interface Props {
  lotePk: number;
  totalAtivos: number;
  semGeo: number;
  semDePara: number;
  semCodigo: number;
  semValor: number;
  comErro: number;
}

const FILTROS: Array<{ id: FiltroItens; label: string; getCount: (p: Props) => number }> = [
  { id: '',           label: 'Todos',          getCount: (p) => p.totalAtivos },
  { id: 'sem_geo',    label: 'Sem coordenadas', getCount: (p) => p.semGeo },
  { id: 'sem_depara', label: 'Sem de-para',    getCount: (p) => p.semDePara },
  { id: 'sem_codigo', label: 'Sem código',     getCount: (p) => p.semCodigo },
  { id: 'sem_valor',  label: 'Sem valor',      getCount: (p) => p.semValor },
  { id: 'com_erro',   label: 'Com erro',       getCount: (p) => p.comErro },
];

const fmtNum = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : new Intl.NumberFormat('pt-BR').format(n);

const fmtMoney = (n: number | null | undefined) => {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n));
};

export const InventarioCompleto: React.FC<Props> = (props) => {
  const { lotePk } = props;
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<ItemInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [filtro, setFiltro] = useState<FiltroItens>('');

  // debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca.trim()), 350);
    return () => clearTimeout(t);
  }, [busca]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const resp = await api.get<ItensResposta>('/admin-inventario-analise', {
        params: { mode: 'itens', lote_pk: lotePk, page, limit, busca: buscaDebounced || undefined, filtro: filtro || undefined },
      });
      setItens(resp.data.data || []);
      setTotal(resp.data.pagination.total);
      setTotalPages(resp.data.pagination.totalPages);
    } catch (e: any) {
      setErro(e?.response?.data?.error || 'Falha ao carregar itens');
      setItens([]);
    } finally {
      setLoading(false);
    }
  }, [lotePk, page, limit, buscaDebounced, filtro]);

  useEffect(() => {
    if (aberto) carregar();
  }, [aberto, carregar]);

  // reset de página ao trocar busca/filtro
  useEffect(() => { setPage(1); }, [buscaDebounced, filtro]);

  const exportarCsv = useCallback(async () => {
    try {
      const resp = await api.get<ItensResposta>('/admin-inventario-analise', {
        params: { mode: 'itens', lote_pk: lotePk, page: 1, limit: 5000, busca: buscaDebounced || undefined, filtro: filtro || undefined },
      });
      const linhas = resp.data.data || [];
      const cab = [
        'linha', 'codigo', 'praca', 'uf', 'ambiente', 'formato', 'tipo',
        'mapped_ambiente', 'mapped_formato', 'mapped_tipo',
        'lat', 'long', 'valor', 'periodo', 'mapeado', 'status', 'erro', 'observacoes',
      ];
      const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return /[",\n;]/.test(s) ? `"${s}"` : s;
      };
      const csv = [
        cab.join(','),
        ...linhas.map((r) => [
          r.linhaArquivo_vl, r.codigo_ativo_st, r.praca_st, r.uf_st, r.ambiente_st, r.formato_midia_st, r.tipo_midia_st,
          r.mapped_ambiente_st, r.mapped_formato_st, r.mapped_tipo_st,
          r.latitude, r.longitude, r.valor_tabela_vl, r.periodo_tabela_st,
          r.mapped_bl ? 'sim' : 'não', r.status_st, r.erroValidacao_st, r.observacoes_st,
        ].map(escape).join(',')),
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario-lote-${String(lotePk).padStart(2, '0')}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErro(e?.response?.data?.error || 'Falha ao exportar CSV');
    }
  }, [lotePk, buscaDebounced, filtro]);

  const labelFiltroAtivo = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro);
    return f ? f.label : 'Todos';
  }, [filtro]);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="w-full px-6 py-5 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#ff4600] hover:bg-orange-50 transition-colors flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-[15px] font-semibold text-[#1a1a1a]">Ver inventário completo</p>
            <p className="text-[12px] text-gray-500">Abre tabela com todos os {fmtNum(props.totalAtivos)} itens enviados, com filtros, busca e exportação.</p>
          </div>
        </div>
        <span className="text-[12px] font-semibold text-[#ff4600]">Abrir →</span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header com filtros */}
      <div className="p-5 border-b border-gray-100 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-bold mb-0.5">Inventário completo</p>
            <p className="text-[14px] text-gray-600">
              Mostrando <strong>{fmtNum(itens.length)}</strong> de <strong>{fmtNum(total)}</strong> itens
              {filtro && <> · filtro: <strong>{labelFiltroAtivo}</strong></>}
              {buscaDebounced && <> · busca: <strong>"{buscaDebounced}"</strong></>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportarCsv}
              className="px-3 py-2 text-[12px] rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold"
            >
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="px-3 py-2 text-[12px] rounded-lg text-gray-500 hover:bg-gray-100"
            >
              Fechar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código, praça, UF, tipo, formato, nome..."
            className="flex-1 min-w-[300px] h-10 px-4 text-sm rounded-lg bg-gray-50 border border-gray-200 outline-none focus:bg-white focus:border-gray-400"
          />
          <div className="flex items-center gap-1 flex-wrap">
            {FILTROS.map((f) => {
              const ativo = filtro === f.id;
              const count = f.getCount(props);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltro(f.id)}
                  className={`px-3 py-2 text-[11px] rounded-lg font-semibold transition-colors ${
                    ativo
                      ? 'bg-[#ff4600] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                  <span className={`ml-1.5 ${ativo ? 'opacity-90' : 'text-gray-400'}`}>{fmtNum(count)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {erro && (
        <div className="px-5 py-4 bg-red-50 text-sm text-red-700 border-b border-red-100">
          {erro}
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-auto max-h-[640px]">
        <table className="w-full text-[12px] border-collapse">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b border-gray-200">
              {['Linha', 'Código', 'Praça / UF', 'Ambiente', 'Formato', 'Tipo (mapeado)', 'Coords', 'Valor', 'Status'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-600 uppercase tracking-wider text-[10px] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-gray-400">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
                    Carregando itens…
                  </div>
                </td>
              </tr>
            ) : itens.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-gray-400">
                  Nenhum item encontrado com esses filtros.
                </td>
              </tr>
            ) : (
              itens.map((it) => {
                const temGeo = it.latitude && it.longitude && it.latitude !== 0 && it.longitude !== 0;
                const temErro = !!(it.erroValidacao_st && it.erroValidacao_st.trim());
                return (
                  <tr key={it.item_pk} className={`hover:bg-gray-50 ${temErro ? 'bg-red-50/40' : ''}`}>
                    <td className="px-3 py-2 text-gray-500 font-mono whitespace-nowrap">{it.linhaArquivo_vl}</td>
                    <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">
                      {it.codigo_ativo_st || <span className="text-red-600 italic">vazio</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <span className="font-medium">{it.praca_st || '—'}</span>
                      {it.uf_st && <span className="ml-1.5 text-gray-400">/ {it.uf_st}</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{it.ambiente_st || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{it.formato_midia_st || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">
                      <div className="flex flex-col gap-0.5">
                        <span>{it.tipo_midia_st || '—'}</span>
                        {it.mapped_bl ? (
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            → {it.mapped_tipo_st || '—'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-semibold">sem de-para</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">
                      {temGeo ? (
                        <span className="text-gray-700">
                          {Number(it.latitude).toFixed(4)}, {Number(it.longitude).toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-red-600 italic">sem coords</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700 font-medium whitespace-nowrap">
                      {fmtMoney(it.valor_tabela_vl)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {temErro ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white bg-red-600" title={it.erroValidacao_st || ''}>
                          erro
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          it.status_st === 'APROVADO' ? 'text-emerald-700 bg-emerald-100'
                          : it.status_st === 'REJEITADO' ? 'text-red-700 bg-red-100'
                          : 'text-amber-700 bg-amber-100'
                        }`}>
                          {it.status_st === 'EM_ANALISE' ? 'análise'
                            : it.status_st === 'APROVADO' ? 'aprovado'
                            : it.status_st === 'REJEITADO' ? 'rejeitado'
                            : it.status_st.toLowerCase()}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && !loading && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-[12px]">
          <p className="text-gray-500">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong> · {fmtNum(total)} itens
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              «
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              ← anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              próxima →
            </button>
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
