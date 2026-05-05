import React, { useEffect, useState } from 'react';
import api from '../../config/axios';
import { ExibidorShell } from './components/ExibidorShell';

interface ItemInventario {
  item_pk: number;
  codigo_ativo_st: string;
  ambiente_st: string | null;
  formato_midia_st: string | null;
  tipo_midia_st: string | null;
  status_st: string;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  APROVADO:      { label: 'Aprovado',      color: '#15803d', bg: '#dcfce7' },
  EM_ANALISE:    { label: 'Em análise',    color: '#b45309', bg: '#fef3c7' },
  PARA_CORRIGIR: { label: 'Para corrigir', color: '#b91c1c', bg: '#fee2e2' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CFG[status] ?? { label: status, color: '#374151', bg: '#f3f4f6' };
  return (
    <span
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap"
    >
      {cfg.label}
    </span>
  );
};

export const ExibidorExcluir: React.FC = () => {
  const [search, setSearch]       = useState('');
  const [items, setItems]         = useState<ItemInventario[]>([]);
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async (term = '') => {
    setLoading(true);
    try {
      const response = await api.get('/exibidor-inventario', {
        params: { mode: 'items', search: term || undefined },
      });
      setItems(response.data?.data || []);
      setSelected([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleAll = () => {
    setSelected((prev) => prev.length === items.length ? [] : items.map((i) => i.item_pk));
  };

  const toggle = (pk: number) => {
    setSelected((prev) => prev.includes(pk) ? prev.filter((id) => id !== pk) : [...prev, pk]);
  };

  const confirmarExclusao = () => {
    if (selected.length === 0) return;
    setModalOpen(true);
  };

  const executarExclusao = async () => {
    setConfirming(true);
    try {
      await api.post('/exibidor-inventario', { op: 'delete-items', item_pks: selected });
      setModalOpen(false);
      await load(search);
    } finally {
      setConfirming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') load(search);
  };

  const allSelected = items.length > 0 && selected.length === items.length;
  const someSelected = selected.length > 0 && selected.length < items.length;

  return (
    <ExibidorShell
      title="Excluir pontos enviados"
      subtitle="Remove pontos do seu inventário enviado. O legado BE180 não pode ser excluído por aqui."
      breadcrumb={[
        { label: 'Home', path: '/' },
        { label: 'Atualizar inventário' },
        { label: 'Excluir pontos' },
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Aviso */}
        <div className="flex items-start gap-3 border border-amber-100 bg-amber-50/60 rounded-xl px-5 py-4">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-amber-800">
            A exclusão remove apenas pontos que você enviou. Pontos aprovados voltarão a ser revisados pela BE180.
          </p>
        </div>

        {/* Busca */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors"
              placeholder="Buscar por código, tipo ou ambiente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            type="button"
            className="h-10 px-5 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
            onClick={() => load(search)}
          >
            Buscar
          </button>
          {search && (
            <button
              type="button"
              className="h-10 px-4 rounded-lg border border-gray-200 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              onClick={() => { setSearch(''); load(''); }}
            >
              Limpar
            </button>
          )}
        </div>

        {/* Tabela */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">

          {/* barra de ações */}
          <div className="flex items-center justify-between gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs text-gray-500">
              {loading ? 'Carregando...' : (
                <>
                  <span className="font-semibold text-gray-700">{items.length}</span> ponto(s) encontrado(s)
                  {selected.length > 0 && (
                    <span className="ml-2 text-[#ff4600] font-semibold">· {selected.length} selecionado(s)</span>
                  )}
                </>
              )}
            </p>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={confirmarExclusao}
              className="inline-flex items-center gap-2 h-8 px-4 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Excluir {selected.length > 0 ? `(${selected.length})` : ''}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="w-10 pl-5 pr-2 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#ff4600] focus:ring-[#ff4600]"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Código</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Ambiente</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Formato</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Tipo de mídia</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="pl-5 pr-2 py-4"><div className="w-4 h-4 bg-gray-100 rounded" /></td>
                      {[...Array(5)].map((__, j) => (
                        <td key={j} className="px-4 py-4"><div className="h-3 bg-gray-100 rounded w-24" /></td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <p className="text-sm text-gray-500">Nenhum ponto encontrado.</p>
                      <p className="text-xs text-gray-400 mt-1">Tente buscar por outro código ou limpe o filtro.</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.item_pk}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${selected.includes(item.item_pk) ? 'bg-red-50/40' : ''}`}
                      onClick={() => toggle(item.item_pk)}
                    >
                      <td className="pl-5 pr-2 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-red-600 focus:ring-red-600"
                          checked={selected.includes(item.item_pk)}
                          onChange={() => toggle(item.item_pk)}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-mono text-sm text-gray-700">{item.codigo_ativo_st}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">{item.ambiente_st || '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">{item.formato_midia_st || '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">{item.tipo_midia_st || '—'}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={item.status_st} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Confirmar exclusão</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Você vai excluir <span className="font-semibold text-gray-800">{selected.length} ponto(s)</span>.
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={confirming}
                className="h-10 px-5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executarExclusao}
                disabled={confirming}
                className="h-10 px-5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {confirming ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ExibidorShell>
  );
};
