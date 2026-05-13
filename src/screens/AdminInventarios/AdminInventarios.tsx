import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../config/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { Topbar } from '../../components/Topbar/Topbar';
import { LoteAnalise, LoteListItem, LoteStatus } from './types';
import { StatusBadge } from './components/StatusBadge';
import { PainelAnalise } from './components/PainelAnalise';

const STATUS_FILTROS: Array<{ id: '' | LoteStatus; label: string }> = [
  { id: '',              label: 'Todos' },
  { id: 'EM_ANALISE',    label: 'Em análise' },
  { id: 'PARA_CORRIGIR', label: 'Para corrigir' },
  { id: 'APROVADO',      label: 'Aprovados' },
  { id: 'REJEITADO',     label: 'Rejeitados' },
];

const fmt = (n?: number | null) => (n === null || n === undefined ? '—' : new Intl.NumberFormat('pt-BR').format(n));
const dataFmt = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

export const AdminInventarios: React.FC = () => {
  const { user } = useAuth();
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [lotes, setLotes] = useState<LoteListItem[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<'' | LoteStatus>('EM_ANALISE');
  const [loadingLista, setLoadingLista] = useState(true);

  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [analise, setAnalise] = useState<LoteAnalise | null>(null);
  const [loadingAnalise, setLoadingAnalise] = useState(false);
  const [acaoEmCurso, setAcaoEmCurso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const carregarLista = useCallback(async (status: '' | LoteStatus) => {
    setLoadingLista(true);
    try {
      const params: Record<string, string | number> = { mode: 'lista' };
      if (status) params.status = status;
      const resp = await api.get('/admin-inventario-analise', { params });
      const data: LoteListItem[] = resp.data?.data || [];
      setLotes(data);
    } finally {
      setLoadingLista(false);
    }
  }, []);

  const carregarAnalise = useCallback(async (lotePk: number) => {
    setLoadingAnalise(true);
    setErro(null);
    try {
      const resp = await api.get('/admin-inventario-analise', { params: { mode: 'analise', lote_pk: lotePk } });
      setAnalise(resp.data);
    } catch (e: any) {
      setErro(e?.response?.data?.error || 'Falha ao carregar análise');
      setAnalise(null);
    } finally {
      setLoadingAnalise(false);
    }
  }, []);

  useEffect(() => { carregarLista(filtroStatus); }, [carregarLista, filtroStatus]);

  useEffect(() => {
    if (selecionado === null && lotes.length > 0) {
      setSelecionado(lotes[0].lote_pk);
      carregarAnalise(lotes[0].lote_pk);
    }
  }, [lotes, selecionado, carregarAnalise]);

  const lotesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return lotes;
    return lotes.filter((l) => {
      const haystack = [l.lote_pk, l.exibidor_fantasia_st, l.exibidor_nome_st, l.arquivo_st, l.uploadedBy_st]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(termo);
    });
  }, [lotes, busca]);

  const onComentar = useCallback(async (mensagem: string) => {
    if (!selecionado) return;
    setAcaoEmCurso(true);
    try {
      await api.post('/admin-inventario-analise', {
        op: 'comentario',
        lote_pk: selecionado,
        autor: user?.name || 'BE180',
        mensagem,
      });
      await carregarAnalise(selecionado);
    } finally {
      setAcaoEmCurso(false);
    }
  }, [selecionado, user, carregarAnalise]);

  const decidir = useCallback(async (op: 'aprovar-lote' | 'rejeitar-lote' | 'pedir-correcao', mensagem: string) => {
    if (!selecionado) return;
    setAcaoEmCurso(true);
    try {
      // Em "pedir-correcao" enviamos o plano detalhado (diagnósticos) para que
      // ele seja anexado automaticamente ao chat e o exibidor receba tudo o
      // que precisa ajustar.
      const diagnosticos = op === 'pedir-correcao' ? (analise?.veredito.diagnosticos ?? []) : undefined;
      await api.post('/admin-inventario-analise', {
        op,
        lote_pk: selecionado,
        autor: user?.name || 'BE180',
        mensagem,
        diagnosticos,
      });
      await Promise.all([carregarLista(filtroStatus), carregarAnalise(selecionado)]);
    } catch (e: any) {
      setErro(e?.response?.data?.error || 'Falha ao registrar decisão');
    } finally {
      setAcaoEmCurso(false);
    }
  }, [selecionado, user, carregarLista, carregarAnalise, filtroStatus, analise]);

  const loteAtual = lotes.find((l) => l.lote_pk === selecionado) ?? null;
  const exibidorAtual = loteAtual ? (loteAtual.exibidor_fantasia_st || loteAtual.exibidor_nome_st) : null;

  return (
    <div className="min-h-screen bg-[#fafafa] flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? 'left-20' : 'left-64'}`} />
      <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? 'ml-20' : 'ml-64'} flex flex-col`}>
        <Topbar
          menuReduzido={menuReduzido}
          breadcrumb={{
            items: [
              { label: 'Home', path: '/' },
              { label: 'Administração' },
              { label: 'Inventários de exibidores' },
            ],
          }}
        />
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`} />

        <div className="flex-1 pt-24 pb-32 overflow-auto">
          <div className="w-full px-10 xl:px-14 2xl:px-20">
            {/* ── Cabeçalho ────────────────────────────────────────────── */}
            <header className="mb-10">
              <h1 className="text-4xl font-light text-[#1a1a1a] tracking-tight">
                Inventários de exibidores
              </h1>
              <p className="text-[15px] text-[#6a6a6a] mt-3 max-w-2xl leading-relaxed">
                Análise de qualidade dos envios. Revise cada lote, dê feedback e decida se aprova,
                pede correção ou rejeita. Apenas após aprovação os pontos passam a integrar o banco de ativos.
              </p>
            </header>

            {erro && (
              <div className="mb-8 px-5 py-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
                {erro}
              </div>
            )}

            {/* ── Toolbar: filtro de status + seletor de lote ──────────── */}
            <div className="mb-10 flex flex-col gap-4">
              {/* abas de status */}
              <div className="flex items-center gap-1 border-b border-gray-200">
                {STATUS_FILTROS.map((f) => {
                  const ativo = filtroStatus === f.id;
                  const qtd = f.id === '' ? lotes.length : lotes.filter((l) => l.status_st === f.id).length;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFiltroStatus(f.id)}
                      className={`px-4 py-3 text-sm transition-colors -mb-px border-b-2 ${
                        ativo
                          ? 'border-[#ff4600] text-[#1a1a1a] font-semibold'
                          : 'border-transparent text-[#6a6a6a] hover:text-[#1a1a1a]'
                      }`}
                    >
                      {f.label}
                      {qtd > 0 && (
                        <span className={`ml-2 text-[11px] font-semibold ${ativo ? 'text-[#ff4600]' : 'text-gray-400'}`}>
                          {qtd}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* seletor do lote */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSeletorAberto((v) => !v)}
                  className={`w-full flex items-center justify-between gap-3 px-5 py-4 rounded-xl bg-white border transition-colors text-left ${
                    seletorAberto ? 'border-[#ff4600] ring-4 ring-orange-50' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {loteAtual ? (
                      <>
                        <div className="px-3 py-1.5 rounded-md bg-gray-100 text-[11px] font-mono font-bold text-gray-600 flex-shrink-0">
                          #{String(loteAtual.lote_pk).padStart(2, '0')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-[#1a1a1a] truncate">
                            {exibidorAtual || `Exibidor ${loteAtual.exibidor_fk}`}
                          </p>
                          <p className="text-[12px] text-[#6a6a6a] truncate">
                            {loteAtual.arquivo_st} · {dataFmt(loteAtual.dataCriacao_dh)} · {fmt(loteAtual.itensAtivos_vl)} itens
                          </p>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">
                        {loadingLista ? 'Carregando lotes…' : 'Selecione um lote'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {loteAtual && <StatusBadge status={loteAtual.status_st} />}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${seletorAberto ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {seletorAberto && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[480px]">
                    <div className="p-3 border-b border-gray-100">
                      <input
                        type="text"
                        autoFocus
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar exibidor, arquivo, usuário..."
                        className="w-full h-10 px-4 text-sm rounded-lg bg-gray-50 border border-gray-200 outline-none focus:bg-white focus:border-gray-400"
                      />
                    </div>
                    <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
                      {lotesFiltrados.length === 0 ? (
                        <li className="px-5 py-8 text-center text-sm text-gray-400">Nenhum lote encontrado.</li>
                      ) : (
                        lotesFiltrados.map((l) => {
                          const ativo = selecionado === l.lote_pk;
                          const exib = l.exibidor_fantasia_st || l.exibidor_nome_st || `#${l.exibidor_fk}`;
                          return (
                            <li key={l.lote_pk}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelecionado(l.lote_pk);
                                  carregarAnalise(l.lote_pk);
                                  setSeletorAberto(false);
                                  setBusca('');
                                }}
                                className={`w-full px-5 py-3.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-4 ${
                                  ativo ? 'bg-orange-50' : ''
                                }`}
                              >
                                <div className="px-2.5 py-1 rounded bg-gray-100 text-[10px] font-mono font-bold text-gray-600 flex-shrink-0">
                                  #{String(l.lote_pk).padStart(2, '0')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-[#1a1a1a] truncate">{exib}</p>
                                  <p className="text-[11px] text-gray-500 truncate">
                                    {l.arquivo_st} · {dataFmt(l.dataCriacao_dh)} · {fmt(l.itensAtivos_vl)} itens
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <Pill label="Geo" pct={l.qualidade.geo_pct} modo="ok" />
                                  <Pill label="De-para" pct={l.qualidade.depara_pct} modo="ok" />
                                  <StatusBadge status={l.status_st} small />
                                </div>
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* ── Conteúdo: análise ────────────────────────────────────── */}
            {!selecionado || loadingAnalise || !analise ? (
              <div className="flex items-center justify-center py-32 text-sm text-gray-400">
                {loadingAnalise ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-[#ff4600] rounded-full animate-spin" />
                    Carregando análise…
                  </div>
                ) : 'Selecione um lote para ver a análise.'}
              </div>
            ) : (
              <PainelAnalise
                analise={analise}
                acaoEmCurso={acaoEmCurso}
                onComentar={onComentar}
                onAprovar={(m) => decidir('aprovar-lote', m)}
                onPedirCorrecao={(m) => decidir('pedir-correcao', m)}
                onRejeitar={(m) => decidir('rejeitar-lote', m)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Pill: React.FC<{ label: string; pct: number; modo: 'ok' | 'alerta' }> = ({ label, pct, modo }) => {
  let cor = '#dc2626';
  let bg = '#fee2e2';
  if (modo === 'ok') {
    if (pct >= 95) { cor = '#15803d'; bg = '#dcfce7'; }
    else if (pct >= 70) { cor = '#b45309'; bg = '#fef3c7'; }
  } else {
    if (pct === 0) { cor = '#15803d'; bg = '#dcfce7'; }
    else if (pct <= 5) { cor = '#b45309'; bg = '#fef3c7'; }
  }
  return (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap" style={{ color: cor, backgroundColor: bg }}>
      {label} {pct.toFixed(0)}%
    </span>
  );
};
