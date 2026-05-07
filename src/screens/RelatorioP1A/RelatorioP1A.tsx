import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { Topbar } from '../../components/Topbar/Topbar';
import api from '../../config/axios';
import { P1aReportSelector } from './components/P1aReportSelector';
import { P1aFiltersBar } from './components/P1aFilters';
import { P1aColmeiaTab } from './components/P1aColmeiaTab';
import { P1aExibidorTab } from './components/P1aExibidorTab';
import { P1aModeloTab } from './components/P1aModeloTab';
import { P1aRefreshLoader } from './components/P1aLoader';
import { exportP1aWorkbook, exportP1aEmpilhado, EmpilhadoRow } from './utils/exportXlsx';
import { formatDateBr } from './utils/formatters';
import {
  ColmeiaRow,
  DEFAULT_FILTERS,
  Dimension,
  ExibidorRow,
  ModeloRow,
  Negociacao,
  OptionsResponse,
  P1aFilters,
  P1aTab,
  RefreshRow,
} from './types';

function pksKey(pks: number[]): string {
  return [...pks].sort((a, b) => a - b).join(',');
}

function parseFiltersFromUrl(sp: URLSearchParams): P1aFilters {
  const reportPks = (sp.get('reportPks') || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  const dim = (sp.get('dim') || 'GEO').toUpperCase() as Dimension;
  const dimension: Dimension = ['GEO', 'PRACA', 'UF'].includes(dim) ? dim : 'GEO';
  return {
    reportPks,
    dimension,
    dimensionValue: sp.get('dimVal') || null,
    marca: sp.get('marca') || null,
    negociacao: ((sp.get('neg') || 'TOTAL').toUpperCase() as Negociacao) || 'TOTAL',
  };
}

function buildUrl(sp: URLSearchParams, filters: P1aFilters, tab: P1aTab): URLSearchParams {
  const next = new URLSearchParams(sp);
  if (filters.reportPks.length > 0) {
    next.set('reportPks', filters.reportPks.join(','));
  } else {
    next.delete('reportPks');
  }
  next.set('dim', filters.dimension);
  if (filters.dimensionValue) next.set('dimVal', filters.dimensionValue);
  else next.delete('dimVal');
  if (filters.marca) next.set('marca', filters.marca);
  else next.delete('marca');
  next.set('neg', filters.negociacao);
  next.set('tab', tab);
  return next;
}

export const RelatorioP1A: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<P1aFilters>(() => ({
    ...DEFAULT_FILTERS,
    ...parseFiltersFromUrl(searchParams),
  }));
  const [tab, setTab] = useState<P1aTab>(
    (searchParams.get('tab') as P1aTab) || 'colmeia',
  );

  const [optionsGlobal, setOptionsGlobal] = useState<OptionsResponse | null>(null);
  const [optionsScoped, setOptionsScoped] = useState<OptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshRows, setRefreshRows] = useState<RefreshRow[]>([]);

  const [colmeiaRows, setColmeiaRows] = useState<ColmeiaRow[]>([]);
  const [exibidorRows, setExibidorRows] = useState<ExibidorRow[]>([]);
  const [modeloRows, setModeloRows] = useState<ModeloRow[]>([]);

  const [loadingColmeia, setLoadingColmeia] = useState(false);
  const [loadingExibidor, setLoadingExibidor] = useState(false);
  const [loadingModelo, setLoadingModelo] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [exportandoEmpilhado, setExportandoEmpilhado] = useState(false);

  const selectedKey = pksKey(filters.reportPks);

  // Manter URL em sincronia com filtros + tab
  useEffect(() => {
    setSearchParams(buildUrl(searchParams, filters, tab), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, filters.dimension, filters.dimensionValue, filters.marca, filters.negociacao, tab]);

  // Carregar lista global de roteiros
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        setLoadingOptions(true);
        setErro(null);
        const resp = await api.get('/relatorio-p1a-options');
        if (!cancelado) setOptionsGlobal(resp.data);
      } catch (err: any) {
        if (!cancelado) setErro(err?.response?.data?.error || 'Erro ao carregar roteiros');
      } finally {
        if (!cancelado) setLoadingOptions(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // Refresh do stage e carga das opções escopadas + dados das abas
  useEffect(() => {
    if (filters.reportPks.length === 0) {
      setOptionsScoped(null);
      setColmeiaRows([]);
      setExibidorRows([]);
      setModeloRows([]);
      setRefreshRows([]);
      return;
    }

    let cancelado = false;
    (async () => {
      try {
        setRefreshing(true);
        setErro(null);
        const respRefresh = await api.post('/relatorio-p1a-refresh', {
          reportPks: filters.reportPks,
        });
        if (!cancelado) setRefreshRows(respRefresh.data?.rows || []);

        // Após refresh, busca opções escopadas (marcas, GEOs, etc.)
        const respOpts = await api.get(
          `/relatorio-p1a-options?reportPks=${filters.reportPks.join(',')}`,
        );
        if (!cancelado) setOptionsScoped(respOpts.data);
      } catch (err: any) {
        if (!cancelado) setErro(err?.response?.data?.error || 'Erro ao atualizar dados P1A');
      } finally {
        if (!cancelado) setRefreshing(false);
      }
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  // Carga das 3 abas após refresh / mudança de filtros
  const fetchColmeia = useCallback(async () => {
    if (filters.reportPks.length === 0 || refreshing) return;
    try {
      setLoadingColmeia(true);
      const resp = await api.post('/relatorio-p1a-colmeia', {
        reportPks: filters.reportPks,
        dimension: filters.dimension,
        dimensionValue: filters.dimensionValue,
      });
      setColmeiaRows(resp.data?.rows || []);
    } catch (err: any) {
      setErro(err?.response?.data?.error || 'Erro ao carregar aba Colmeia');
    } finally {
      setLoadingColmeia(false);
    }
  }, [filters.reportPks, filters.dimension, filters.dimensionValue, refreshing]);

  const fetchExibidor = useCallback(async () => {
    if (filters.reportPks.length === 0 || refreshing) return;
    try {
      setLoadingExibidor(true);
      const resp = await api.post('/relatorio-p1a-exibidor', {
        reportPks: filters.reportPks,
        dimension: filters.dimension,
        dimensionValue: filters.dimensionValue,
        marca: filters.marca,
        negociacao: filters.negociacao,
      });
      setExibidorRows(resp.data?.rows || []);
    } catch (err: any) {
      setErro(err?.response?.data?.error || 'Erro ao carregar aba Exibidor');
    } finally {
      setLoadingExibidor(false);
    }
  }, [
    filters.reportPks,
    filters.dimension,
    filters.dimensionValue,
    filters.marca,
    filters.negociacao,
    refreshing,
  ]);

  const fetchModelo = useCallback(async () => {
    if (filters.reportPks.length === 0 || refreshing) return;
    try {
      setLoadingModelo(true);
      const resp = await api.post('/relatorio-p1a-modelo', {
        reportPks: filters.reportPks,
        dimension: filters.dimension,
        dimensionValue: filters.dimensionValue,
        marca: filters.marca,
        negociacao: filters.negociacao,
      });
      setModeloRows(resp.data?.rows || []);
    } catch (err: any) {
      setErro(err?.response?.data?.error || 'Erro ao carregar aba Modelo P1A');
    } finally {
      setLoadingModelo(false);
    }
  }, [
    filters.reportPks,
    filters.dimension,
    filters.dimensionValue,
    filters.marca,
    filters.negociacao,
    refreshing,
  ]);

  useEffect(() => {
    fetchColmeia();
  }, [fetchColmeia]);

  useEffect(() => {
    fetchExibidor();
  }, [fetchExibidor]);

  useEffect(() => {
    fetchModelo();
  }, [fetchModelo]);

  const handleRefreshForcado = useCallback(async () => {
    if (filters.reportPks.length === 0) return;
    try {
      setRefreshing(true);
      setErro(null);
      const resp = await api.post('/relatorio-p1a-refresh', {
        reportPks: filters.reportPks,
        force: true,
      });
      setRefreshRows(resp.data?.rows || []);
      // Recarrega as 3 abas
      await Promise.all([fetchColmeia(), fetchExibidor(), fetchModelo()]);
    } catch (err: any) {
      setErro(err?.response?.data?.error || 'Erro ao forçar atualização');
    } finally {
      setRefreshing(false);
    }
  }, [filters.reportPks, fetchColmeia, fetchExibidor, fetchModelo]);

  const handleExportEmpilhado = useCallback(async () => {
    if (filters.reportPks.length === 0) return;
    try {
      setExportandoEmpilhado(true);
      setErro(null);
      const resp = await api.post('/relatorio-p1a-empilhamento', {
        reportPks: filters.reportPks,
      });
      const rows: EmpilhadoRow[] = resp.data?.rows || [];
      if (rows.length === 0) {
        setErro('Nenhum dado empilhado encontrado. Verifique se os roteiros já foram atualizados.');
        return;
      }
      exportP1aEmpilhado(rows, filters.reportPks);
    } catch (err: any) {
      setErro(err?.response?.data?.error || 'Erro ao exportar dados empilhados');
    } finally {
      setExportandoEmpilhado(false);
    }
  }, [filters.reportPks]);

  const handleExport = useCallback(async () => {
    if (filters.reportPks.length === 0) return;
    try {
      setExportando(true);
      exportP1aWorkbook({
        dimension: filters.dimension,
        dimensionValue: filters.dimensionValue,
        colmeiaRows,
        exibidorRows,
        modeloRows,
      });
    } finally {
      setExportando(false);
    }
  }, [
    filters.reportPks,
    filters.dimension,
    filters.dimensionValue,
    colmeiaRows,
    exibidorRows,
    modeloRows,
  ]);

  const optionsParaUI = useMemo<OptionsResponse | null>(() => {
    if (optionsScoped) {
      return {
        ...optionsScoped,
        reports: optionsGlobal?.reports || optionsScoped.reports || [],
      };
    }
    return optionsGlobal;
  }, [optionsGlobal, optionsScoped]);

  const lastRefreshedAt = useMemo(() => {
    if (refreshRows.length === 0) return null;
    const ts = refreshRows
      .map((r) => (r.refreshedAt_dh ? new Date(r.refreshedAt_dh).getTime() : 0))
      .filter((t) => t > 0);
    if (ts.length === 0) return null;
    return new Date(Math.max(...ts)).toISOString();
  }, [refreshRows]);

  const hasSimulatedPlans = refreshRows.some((r) => r.sourceType_st === 'colmeia');
  const stageRowsWritten = refreshRows.reduce(
    (acc, r) => acc + (Number(r.rowsWritten_vl) || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-white flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div
        className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${
          menuReduzido ? 'left-20' : 'left-64'
        }`}
      />
      <div
        className={`flex-1 transition-all duration-300 min-h-screen w-full ${
          menuReduzido ? 'ml-20' : 'ml-64'
        } flex flex-col`}
      >
        <Topbar
          menuReduzido={menuReduzido}
          breadcrumb={{
            items: [
              { label: 'Home', path: '/' },
              { label: 'Relatório P1A' },
            ],
          }}
        />
        <div
          className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${
            menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'
          }`}
        />

        <div className="flex-1 pt-24 pb-32 px-8 overflow-auto">
          <div className="max-w-[1400px] mx-auto">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-[#ff4600] uppercase tracking-wide">
                  Relatório P1A
                </h1>
                <p className="text-[#3a3a3a] mt-2 max-w-3xl">
                  Visualize o resultado consolidado de um ou mais roteiros nas três visões do
                  modelo P1A: Colmeia, Exibidor e Modelo P1A. Selecione os roteiros e ajuste
                  os filtros para comparar GEO, praça ou UF.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={handleRefreshForcado}
                  disabled={filters.reportPks.length === 0 || refreshing}
                  className="px-3 py-2 text-sm rounded-md border border-[#d9d9d9] hover:bg-[#f8f8f8] text-[#3a3a3a] disabled:opacity-50"
                >
                  {refreshing ? 'Atualizando…' : 'Atualizar'}
                </button>

                {/* Export empilhado — dados brutos do stage */}
                <button
                  type="button"
                  onClick={handleExportEmpilhado}
                  disabled={filters.reportPks.length === 0 || refreshing || exportandoEmpilhado}
                  title="Exporta todas as linhas do stage (empilhamento) com informações completas para cada roteiro selecionado"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-[#ff4600] text-[#ff4600] hover:bg-[#fff5ef] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportandoEmpilhado ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Exportando…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Exportar empilhado
                    </>
                  )}
                </button>

                {/* Export das 3 visões P1A */}
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={
                    filters.reportPks.length === 0 ||
                    exportando ||
                    refreshing ||
                    (colmeiaRows.length === 0 &&
                      exibidorRows.length === 0 &&
                      modeloRows.length === 0)
                  }
                  title="Exporta as 3 visões do relatório P1A (Colmeia, Exibidor, Modelo)"
                  className="px-3 py-2 text-sm rounded-md bg-[#ff4600] text-white hover:bg-[#e63d00] disabled:opacity-50"
                >
                  {exportando ? 'Exportando…' : 'Exportar .xlsx'}
                </button>
              </div>
            </div>

            {/* Seletor de roteiros */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#757575] uppercase tracking-wide mb-1">
                Roteiros
              </label>
              <P1aReportSelector
                reports={optionsGlobal?.reports || []}
                selected={filters.reportPks}
                onChange={(next) => setFilters((f) => ({ ...f, reportPks: next }))}
                loading={loadingOptions}
              />
            </div>

            {/* Filtros */}
            <div className="mb-4">
              <P1aFiltersBar
                filters={filters}
                options={optionsParaUI}
                onChange={setFilters}
                disabled={refreshing || filters.reportPks.length === 0}
              />
            </div>

            {/* Loader do refresh — ocupa o espaço das abas enquanto o stage é reconstruído */}
            {refreshing && filters.reportPks.length > 0 && (
              <div className="py-8">
                <P1aRefreshLoader reportCount={filters.reportPks.length} />
              </div>
            )}

            {/* Meta do último refresh (quando concluído) */}
            {!refreshing && filters.reportPks.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#757575] mb-4">
                {lastRefreshedAt && (
                  <span>
                    Stage atualizado em{' '}
                    <strong className="text-[#3a3a3a]">{formatDateBr(lastRefreshedAt)}</strong>
                  </span>
                )}
                {stageRowsWritten > 0 && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-[#ff4600]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {stageRowsWritten.toLocaleString('pt-BR')} linhas
                  </span>
                )}
                {hasSimulatedPlans && (
                  <span className="px-2 py-0.5 rounded-full bg-[#fff8e1] text-[#8a6d00] border border-[#ffd87a]">
                    Contém roteiros simulados
                  </span>
                )}
              </div>
            )}

            {erro && (
              <div className="mb-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                {erro}
              </div>
            )}

            {/* Abas + conteúdo — só aparecem quando o refresh está concluído */}
            {!refreshing && (
              <>
                <div className="border-b border-[#ededed] flex items-center gap-1 mb-4">
                  {(
                    [
                      { id: 'colmeia', label: 'Colmeia' },
                      { id: 'exibidor', label: 'Exibidor' },
                      { id: 'modelo', label: 'Modelo P1A' },
                    ] as Array<{ id: P1aTab; label: string }>
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        tab === t.id
                          ? 'text-[#ff4600] border-[#ff4600]'
                          : 'text-[#757575] border-transparent hover:text-[#3a3a3a]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {tab === 'colmeia' && (
                  <P1aColmeiaTab
                    rows={colmeiaRows}
                    dimension={filters.dimension}
                    loading={loadingColmeia}
                  />
                )}
                {tab === 'exibidor' && (
                  <P1aExibidorTab
                    rows={exibidorRows}
                    loading={loadingExibidor}
                    hasSimulatedPlans={hasSimulatedPlans}
                  />
                )}
                {tab === 'modelo' && (
                  <P1aModeloTab
                    rows={modeloRows}
                    loading={loadingModelo}
                    hasSimulatedPlans={hasSimulatedPlans}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
