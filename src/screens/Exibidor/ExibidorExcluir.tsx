import React, { useEffect, useState } from 'react';
import api from '../../config/axios';
import { ExibidorShell } from './components/ExibidorShell';
import { AvisoFluxoAtualizacao } from './components/AvisoFluxoAtualizacao';

interface ItemInventario {
  item_pk: number;
  codigo_ativo_st: string;
  ambiente_st: string | null;
  formato_midia_st: string | null;
  tipo_midia_st: string | null;
  status_st: string;
}

export const ExibidorExcluir: React.FC = () => {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);

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

  useEffect(() => {
    load();
  }, []);

  const toggle = (itemPk: number) => {
    setSelected((prev) => (prev.includes(itemPk) ? prev.filter((id) => id !== itemPk) : [...prev, itemPk]));
  };

  const excluirSelecionados = async () => {
    if (selected.length === 0) return;
    setConfirming(true);
    try {
      await api.post('/exibidor-inventario', { op: 'delete-items', item_pks: selected });
      setSelected([]);
      await load(search);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <ExibidorShell
      title="Excluir pontos enviados"
      subtitle="Remove pontos da fila de envio do exibidor. O legado BE180 não pode ser excluído por aqui."
      breadcrumb={[
        { label: 'Home', path: '/' },
        { label: 'Atualizar inventário' },
        { label: 'Excluir pontos enviados' },
      ]}
    >
      <div className="space-y-6">
        <AvisoFluxoAtualizacao descricao="As exclusões feitas aqui afetam apenas pontos que ainda não foram consolidados ou que precisam ser removidos do envio." />

        <section className="bg-[#fafafa] border border-[#ddd] rounded-xl p-4">
          <label className="block text-sm font-semibold text-[#3a3a3a] mb-2">Buscar pelo código do ponto ativo</label>
          <div className="flex gap-3">
            <input
              type="text"
              className="w-full border border-[#d1d1d1] rounded-lg px-4 py-2"
              placeholder="Ex: 65737363A"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className="h-[42px] px-6 rounded-lg bg-[#ff4600] text-white font-semibold"
              onClick={() => load(search)}
            >
              Consultar
            </button>
          </div>
        </section>

        <section className="border border-[#ddd] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[#f4f4f4] text-sm text-[#666] flex items-center justify-between">
            <span>{loading ? 'Carregando...' : `${items.length} registro(s)`}</span>
            <button
              type="button"
              disabled={selected.length === 0 || confirming}
              className="px-4 py-2 rounded-lg bg-[#ff4600] text-white text-sm font-semibold disabled:opacity-40"
              onClick={excluirSelecionados}
            >
              {confirming ? 'Excluindo...' : `Excluir ponto (${selected.length})`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f0f0f0]">
                <tr>
                  <th className="px-3 py-2" />
                  <th className="px-3 py-2 text-left">Código do ponto</th>
                  <th className="px-3 py-2 text-left">Ambiente</th>
                  <th className="px-3 py-2 text-left">Formato</th>
                  <th className="px-3 py-2 text-left">Tipo mídia</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.item_pk} className="border-t border-[#eee]">
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selected.includes(item.item_pk)}
                        onChange={() => toggle(item.item_pk)}
                      />
                    </td>
                    <td className="px-3 py-2">{item.codigo_ativo_st}</td>
                    <td className="px-3 py-2">{item.ambiente_st || '-'}</td>
                    <td className="px-3 py-2">{item.formato_midia_st || '-'}</td>
                    <td className="px-3 py-2">{item.tipo_midia_st || '-'}</td>
                    <td className="px-3 py-2">{item.status_st}</td>
                  </tr>
                ))}
                {!loading && items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-[#666]">
                      Nenhum item encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ExibidorShell>
  );
};
