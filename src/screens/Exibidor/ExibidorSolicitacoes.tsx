import React, { useEffect, useState } from 'react';
import api from '../../config/axios';
import { ExibidorShell } from './components/ExibidorShell';

interface Solicitacao {
  lote_pk: number;
  arquivo_st: string;
  status_st: string;
  totalRegistros_vl: number;
  dataCriacao_dh: string;
}

interface Comentario {
  comentario_pk: number;
  autor_st: string;
  mensagem_st: string;
  dataCriacao_dh: string;
}

interface ItemResumo {
  item_pk: number;
  codigo_ativo_st: string;
  ambiente_st: string | null;
  formato_midia_st: string | null;
  tipo_midia_st: string | null;
  status_st: string;
  erroValidacao_st: string | null;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  APROVADO:      { label: 'Aprovado',      color: '#15803d', bg: '#dcfce7', dot: '#16a34a' },
  EM_ANALISE:    { label: 'Em análise',    color: '#b45309', bg: '#fef3c7', dot: '#d97706' },
  PARA_CORRIGIR: { label: 'Para corrigir', color: '#b91c1c', bg: '#fee2e2', dot: '#dc2626' },
  REJEITADO:     { label: 'Rejeitado',     color: '#374151', bg: '#f3f4f6', dot: '#6b7280' },
};

const StatusBadge: React.FC<{ status: string; small?: boolean }> = ({ status, small }) => {
  const cfg = STATUS_CFG[status] ?? { label: status, color: '#374151', bg: '#f3f4f6', dot: '#6b7280' };
  return (
    <span
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <span style={{ backgroundColor: cfg.dot }} className="w-1.5 h-1.5 rounded-full flex-shrink-0" />
      {cfg.label}
    </span>
  );
};

const dataFmt = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

const horaFmt = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const n = (v?: number) => new Intl.NumberFormat('pt-BR').format(v || 0);

export const ExibidorSolicitacoes: React.FC = () => {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [selected, setSelected]         = useState<number | null>(null);
  const [selectedSol, setSelectedSol]   = useState<Solicitacao | null>(null);
  const [comentarios, setComentarios]   = useState<Comentario[]>([]);
  const [itens, setItens]               = useState<ItemResumo[]>([]);
  const [mensagem, setMensagem]         = useState('');
  const [enviando, setEnviando]         = useState(false);
  const [itensAbertos, setItensAbertos] = useState(true);

  const loadSolicitacoes = async () => {
    const response = await api.get('/exibidor-inventario', { params: { mode: 'solicitacoes' } });
    const lista: Solicitacao[] = response.data?.data || [];
    setSolicitacoes(lista);
    if (lista.length > 0 && selected === null) {
      selecionar(lista[0].lote_pk, lista[0]);
    }
  };

  const loadDetalhe = async (lotePk: number) => {
    const response = await api.get('/exibidor-inventario', {
      params: { mode: 'solicitacao-detalhe', lote_pk: lotePk },
    });
    setComentarios(response.data?.comentarios || []);
    setItens(response.data?.itens || []);
  };

  useEffect(() => {
    loadSolicitacoes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selecionar = async (lotePk: number, sol?: Solicitacao) => {
    setSelected(lotePk);
    setSelectedSol(sol ?? solicitacoes.find((s) => s.lote_pk === lotePk) ?? null);
    await loadDetalhe(lotePk);
  };

  const enviarMensagem = async () => {
    if (!selected || !mensagem.trim()) return;
    setEnviando(true);
    try {
      await api.post('/exibidor-inventario', {
        op: 'comentario',
        lote_pk: selected,
        autor: 'Exibidor',
        mensagem,
      });
      setMensagem('');
      await loadDetalhe(selected);
    } finally {
      setEnviando(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') enviarMensagem();
  };

  return (
    <ExibidorShell
      title="Suas solicitações"
      subtitle="Acompanhe o status de cada envio e interaja com a equipe BE180."
      breadcrumb={[{ label: 'Home', path: '/' }, { label: 'Solicitações' }]}
    >
      <div className="flex gap-6 h-[calc(100vh-180px)] min-h-[560px]">

        {/* ── Painel esquerdo: lista de lotes ─────────────────────────── */}
        <aside className="w-72 flex-shrink-0 flex flex-col border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">Envios</p>
          </div>

          <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {solicitacoes.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-gray-400">
                Nenhuma solicitação ainda.
              </li>
            )}
            {solicitacoes.map((sol) => {
              const ativo = selected === sol.lote_pk;
              return (
                <li key={sol.lote_pk}>
                  <button
                    type="button"
                    onClick={() => selecionar(sol.lote_pk, sol)}
                    className={`w-full text-left px-4 py-3.5 transition-colors ${
                      ativo ? 'bg-orange-50 border-l-2 border-[#ff4600]' : 'hover:bg-gray-50 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 font-medium mb-0.5">
                          Lote #{String(sol.lote_pk).padStart(2, '0')}
                        </p>
                        <p className={`text-sm font-semibold truncate ${ativo ? 'text-gray-900' : 'text-gray-700'}`}>
                          {sol.arquivo_st}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {dataFmt(sol.dataCriacao_dh)}
                          {sol.totalRegistros_vl ? ` · ${n(sol.totalRegistros_vl)} itens` : ''}
                        </p>
                      </div>
                      <StatusBadge status={sol.status_st} small />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* ── Painel direito: detalhe ──────────────────────────────────── */}
        <section className="flex-1 min-w-0 flex flex-col border border-gray-200 rounded-xl overflow-hidden">

          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">Selecione um envio para ver os detalhes</p>
              <p className="text-xs text-gray-400">Os pontos importados e os comentários da BE180 aparecerão aqui.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">

              {/* cabeçalho do detalhe */}
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
                    Lote #{String(selected).padStart(2, '0')}
                  </p>
                  <p className="text-base font-semibold text-gray-900 truncate">
                    {selectedSol?.arquivo_st}
                  </p>
                </div>
                {selectedSol && <StatusBadge status={selectedSol.status_st} />}
              </div>

              {/* pontos importados (collapsible) */}
              <div className="border-b border-gray-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setItensAbertos((v) => !v)}
                  className="w-full flex items-center justify-between px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Pontos importados
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {itens.length}
                    </span>
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${itensAbertos ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {itensAbertos && (
                  <div className="max-h-52 overflow-auto border-t border-gray-100">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-6 py-2 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Código</th>
                          <th className="text-left px-4 py-2 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Ambiente</th>
                          <th className="text-left px-4 py-2 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Formato</th>
                          <th className="text-left px-4 py-2 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Tipo</th>
                          <th className="text-left px-4 py-2 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {itens.map((item) => (
                          <tr key={item.item_pk} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-2.5 font-mono text-gray-700">{item.codigo_ativo_st}</td>
                            <td className="px-4 py-2.5 text-gray-600">{item.ambiente_st || '—'}</td>
                            <td className="px-4 py-2.5 text-gray-600">{item.formato_midia_st || '—'}</td>
                            <td className="px-4 py-2.5 text-gray-600">{item.tipo_midia_st || '—'}</td>
                            <td className="px-4 py-2.5">
                              <StatusBadge status={item.status_st} small />
                              {item.erroValidacao_st && (
                                <p className="text-[10px] text-red-500 mt-0.5">{item.erroValidacao_st}</p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* comentários */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {comentarios.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">Sem comentários ainda.</p>
                    <p className="text-xs text-gray-400">A equipe BE180 vai interagir aqui após a análise.</p>
                  </div>
                ) : (
                  comentarios.map((comentario) => {
                    const isExibidor = comentario.autor_st === 'Exibidor';
                    return (
                      <div key={comentario.comentario_pk} className={`flex gap-3 ${isExibidor ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isExibidor ? 'bg-[#ff4600] text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {comentario.autor_st.slice(0, 1).toUpperCase()}
                        </div>
                        <div className={`max-w-[75%] ${isExibidor ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                            isExibidor
                              ? 'bg-[#ff4600] text-white rounded-tr-sm'
                              : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                          }`}>
                            {comentario.mensagem_st}
                          </div>
                          <p className="text-[10px] text-gray-400 px-1">
                            {comentario.autor_st} · {horaFmt(comentario.dataCriacao_dh)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* input de mensagem */}
              <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 focus-within:border-gray-400 transition-colors">
                  <input
                    type="text"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                    placeholder="Envie uma mensagem para a equipe BE180..."
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    onKeyDown={handleKey}
                    disabled={enviando}
                  />
                  <button
                    type="button"
                    onClick={enviarMensagem}
                    disabled={enviando || !mensagem.trim()}
                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#ff4600] hover:bg-[#e33d00] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                    </svg>
                  </button>
                </div>
              </div>

            </div>
          )}
        </section>
      </div>
    </ExibidorShell>
  );
};
