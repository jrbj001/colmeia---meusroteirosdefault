import React, { useEffect, useMemo, useState } from 'react';
import api from '../../config/axios';
import { ExibidorShell } from './components/ExibidorShell';

interface ItemInventario {
  item_pk: number;
  codigo_ativo_st: string;
  praca_st: string | null;
  uf_st: string | null;
  ambiente_st: string | null;
  formato_midia_st: string | null;
  tipo_midia_st: string | null;
  tipo_ambiente_indoor_st: string | null;
  valor_tabela_vl: number | null;
  periodo_tabela_st: string | null;
  area_total_largura_vl: number | null;
  area_total_altura_vl: number | null;
  area_visual_largura_vl: number | null;
  area_visual_altura_vl: number | null;
  secundagem_st: string | null;
  numero_maximo_slots_vl: number | null;
  pixels_especificacoes_st: string | null;
  substrato_st: string | null;
  acabamento_st: string | null;
  observacoes_st: string | null;
  status_st: string;
}

type Patch = Partial<Omit<ItemInventario, 'item_pk' | 'codigo_ativo_st' | 'status_st'>>;

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  APROVADO:      { label: 'Aprovado',      color: '#15803d', bg: '#dcfce7' },
  EM_ANALISE:    { label: 'Em análise',    color: '#b45309', bg: '#fef3c7' },
  PARA_CORRIGIR: { label: 'Para corrigir', color: '#b91c1c', bg: '#fee2e2' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CFG[status] ?? { label: status, color: '#374151', bg: '#f3f4f6' };
  return (
    <span style={{ color: cfg.color, backgroundColor: cfg.bg }}
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
      {cfg.label}
    </span>
  );
};

const inputCls = 'w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors bg-white';
const labelCls = 'block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1';

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
}> = ({ label, value, onChange, type = 'text', placeholder = '—', textarea }) => (
  <div>
    <label className={labelCls}>{label}</label>
    {textarea ? (
      <textarea
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors bg-white resize-none"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <input
        type={type}
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )}
  </div>
);

export const ExibidorEditar: React.FC = () => {
  const [search, setSearch]       = useState('');
  const [items, setItems]         = useState<ItemInventario[]>([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [drawerItem, setDrawerItem] = useState<ItemInventario | null>(null);
  const [patch, setPatch]         = useState<Patch>({});

  const load = async (term = '') => {
    setLoading(true);
    try {
      const response = await api.get('/exibidor-inventario', {
        params: { mode: 'items', search: term || undefined },
      });
      setItems(response.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visibleItems = useMemo(() => items.slice(0, 200), [items]);

  const abrirDrawer = (item: ItemInventario) => {
    setDrawerItem(item);
    setPatch({});
  };

  const fecharDrawer = () => {
    setDrawerItem(null);
    setPatch({});
  };

  const set = (field: keyof Patch, value: string) => {
    const numFields: (keyof Patch)[] = [
      'valor_tabela_vl','area_total_largura_vl','area_total_altura_vl',
      'area_visual_largura_vl','area_visual_altura_vl','numero_maximo_slots_vl',
    ];
    setPatch((prev) => ({
      ...prev,
      [field]: numFields.includes(field) ? (value === '' ? null : Number(value)) : (value === '' ? null : value),
    }));
  };

  const val = (field: keyof ItemInventario): string => {
    if (field in patch) return String((patch as Record<string, unknown>)[field] ?? '');
    return String(drawerItem?.[field] ?? '');
  };

  const salvar = async () => {
    if (!drawerItem || Object.keys(patch).length === 0) return;
    setSaving(true);
    try {
      await api.put('/exibidor-inventario', { item_pk: drawerItem.item_pk, ...patch });
      fecharDrawer();
      await load(search);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') load(search);
  };

  const hasPatch = Object.keys(patch).length > 0;

  return (
    <ExibidorShell
      title="Editar pontos enviados"
      subtitle="Edite pontos do seu inventário. Após salvar, o item volta para análise da BE180."
      breadcrumb={[
        { label: 'Home', path: '/' },
        { label: 'Atualizar inventário' },
        { label: 'Editar pontos' },
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Aviso */}
        <div className="flex items-start gap-3 border border-blue-100 bg-blue-50/40 rounded-xl px-5 py-4">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800">
            Edições feitas aqui voltam para análise da BE180 antes de serem aplicadas no inventário consolidado.
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
              placeholder="Buscar por código, praça, UF, tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button type="button" onClick={() => load(search)}
            className="h-10 px-5 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition-colors">
            Buscar
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); load(''); }}
              className="h-10 px-4 rounded-lg border border-gray-200 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Limpar
            </button>
          )}
        </div>

        {/* Tabela */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs text-gray-500">
              {loading ? 'Carregando...' : (
                <><span className="font-semibold text-gray-700">{visibleItems.length}</span> ponto(s) — clique em <span className="font-medium">Editar</span> para abrir todos os campos</>
              )}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left pl-5 pr-3 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Código</th>
                  <th className="text-left px-3 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Praça / UF</th>
                  <th className="text-left px-3 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Ambiente</th>
                  <th className="text-left px-3 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Formato</th>
                  <th className="text-left px-3 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Tipo de mídia</th>
                  <th className="text-left px-3 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Valor tabela</th>
                  <th className="text-left px-3 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Status</th>
                  <th className="w-20 pr-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(8)].map((__, j) => (
                        <td key={j} className="px-3 py-4"><div className="h-3 bg-gray-100 rounded w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <p className="text-sm text-gray-500">Nenhum ponto encontrado.</p>
                    </td>
                  </tr>
                ) : (
                  visibleItems.map((item) => (
                    <tr key={item.item_pk} className="hover:bg-gray-50 transition-colors">
                      <td className="pl-5 pr-3 py-3.5 font-mono text-xs text-gray-600 whitespace-nowrap">{item.codigo_ativo_st}</td>
                      <td className="px-3 py-3.5 text-sm text-gray-600">
                        {item.praca_st || '—'}
                        {item.uf_st && <span className="text-gray-400">/{item.uf_st}</span>}
                      </td>
                      <td className="px-3 py-3.5 text-sm text-gray-600">{item.ambiente_st || '—'}</td>
                      <td className="px-3 py-3.5 text-sm text-gray-600">{item.formato_midia_st || '—'}</td>
                      <td className="px-3 py-3.5 text-sm text-gray-600">{item.tipo_midia_st || '—'}</td>
                      <td className="px-3 py-3.5 text-sm text-gray-700">
                        {item.valor_tabela_vl != null
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_tabela_vl)
                          : '—'}
                      </td>
                      <td className="px-3 py-3.5"><StatusBadge status={item.status_st} /></td>
                      <td className="pr-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => abrirDrawer(item)}
                          className="h-8 px-3 rounded-lg border border-gray-200 hover:border-[#ff4600] hover:text-[#ff4600] text-xs font-medium text-gray-600 transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Drawer de edição ──────────────────────────────────────────── */}
      {drawerItem && (
        <>
          {/* overlay */}
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={fecharDrawer} />

          {/* painel */}
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">

            {/* header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-0.5">Editando ponto</p>
                <p className="text-base font-bold text-gray-900 font-mono">{drawerItem.codigo_ativo_st}</p>
              </div>
              <button type="button" onClick={fecharDrawer}
                className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* campos */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Localização */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#ff4600] font-semibold mb-3">Localização</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Praça" value={val('praca_st')} onChange={(v) => set('praca_st', v)} placeholder="Ex: São Paulo" />
                  <Field label="UF" value={val('uf_st')} onChange={(v) => set('uf_st', v)} placeholder="SP" />
                </div>
              </div>

              {/* Classificação de mídia */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#ff4600] font-semibold mb-3">Classificação de mídia</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ambiente" value={val('ambiente_st')} onChange={(v) => set('ambiente_st', v)} placeholder="Ex: Indoor" />
                  <Field label="Formato de mídia" value={val('formato_midia_st')} onChange={(v) => set('formato_midia_st', v)} placeholder="Ex: Estático" />
                  <Field label="Tipo de mídia" value={val('tipo_midia_st')} onChange={(v) => set('tipo_midia_st', v)} placeholder="Ex: Painel" />
                  <Field label="Tipo ambiente indoor" value={val('tipo_ambiente_indoor_st')} onChange={(v) => set('tipo_ambiente_indoor_st', v)} placeholder="Ex: Shopping" />
                </div>
              </div>

              {/* Custo */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#ff4600] font-semibold mb-3">Custo</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Valor tabela (R$)" value={val('valor_tabela_vl')} onChange={(v) => set('valor_tabela_vl', v)} type="number" placeholder="0.00" />
                  <Field label="Período tabela" value={val('periodo_tabela_st')} onChange={(v) => set('periodo_tabela_st', v)} placeholder="Ex: Mensal" />
                </div>
              </div>

              {/* Medidas (estático) */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#ff4600] font-semibold mb-3">Medidas — Estático</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Área total: largura (m)" value={val('area_total_largura_vl')} onChange={(v) => set('area_total_largura_vl', v)} type="number" placeholder="0.0" />
                  <Field label="Área total: altura (m)" value={val('area_total_altura_vl')} onChange={(v) => set('area_total_altura_vl', v)} type="number" placeholder="0.0" />
                  <Field label="Área visual: largura (m)" value={val('area_visual_largura_vl')} onChange={(v) => set('area_visual_largura_vl', v)} type="number" placeholder="0.0" />
                  <Field label="Área visual: altura (m)" value={val('area_visual_altura_vl')} onChange={(v) => set('area_visual_altura_vl', v)} type="number" placeholder="0.0" />
                </div>
              </div>

              {/* Digital */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#ff4600] font-semibold mb-3">Especificações — Digital</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Secundagem" value={val('secundagem_st')} onChange={(v) => set('secundagem_st', v)} placeholder="Ex: 15" />
                  <Field label="Nº máximo de slots" value={val('numero_maximo_slots_vl')} onChange={(v) => set('numero_maximo_slots_vl', v)} type="number" placeholder="0" />
                  <div className="col-span-2">
                    <Field label="Pixels / especificações" value={val('pixels_especificacoes_st')} onChange={(v) => set('pixels_especificacoes_st', v)} placeholder="Ex: 1920x1080px Full HD" />
                  </div>
                </div>
              </div>

              {/* Material */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#ff4600] font-semibold mb-3">Material</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Substrato" value={val('substrato_st')} onChange={(v) => set('substrato_st', v)} placeholder="Ex: Lona Vinílica" />
                  <Field label="Acabamento" value={val('acabamento_st')} onChange={(v) => set('acabamento_st', v)} placeholder="Ex: Ilhós e corda" />
                </div>
              </div>

              {/* Observações */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#ff4600] font-semibold mb-3">Observações</p>
                <Field label="Observações" value={val('observacoes_st')} onChange={(v) => set('observacoes_st', v)} textarea placeholder="Informações adicionais sobre o ponto..." />
              </div>

            </div>

            {/* footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">
                {hasPatch
                  ? <span className="text-[#ff4600] font-medium">{Object.keys(patch).length} campo(s) alterado(s)</span>
                  : 'Nenhuma alteração ainda'}
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={fecharDrawer} disabled={saving}
                  className="h-10 px-5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button type="button" onClick={salvar} disabled={!hasPatch || saving}
                  className="h-10 px-6 rounded-lg bg-[#ff4600] hover:bg-[#e33d00] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </ExibidorShell>
  );
};
