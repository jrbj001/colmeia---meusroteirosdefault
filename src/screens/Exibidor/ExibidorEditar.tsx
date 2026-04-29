import React, { useEffect, useMemo, useState } from 'react';
import api from '../../config/axios';
import { ExibidorShell } from './components/ExibidorShell';
import { AvisoFluxoAtualizacao } from './components/AvisoFluxoAtualizacao';

interface ItemInventario {
  item_pk: number;
  codigo_ativo_st: string;
  ambiente_st: string | null;
  formato_midia_st: string | null;
  tipo_midia_st: string | null;
  nome_fantasia_st: string | null;
  valor_tabela_vl: number | null;
  status_st: string;
}

export const ExibidorEditar: React.FC = () => {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingPk, setSavingPk] = useState<number | null>(null);
  const [edited, setEdited] = useState<Record<number, Partial<ItemInventario>>>({});

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

  const visibleItems = useMemo(() => items.slice(0, 200), [items]);

  const onChangeField = (itemPk: number, field: keyof ItemInventario, value: string) => {
    setEdited((prev) => ({
      ...prev,
      [itemPk]: {
        ...prev[itemPk],
        [field]: field === 'valor_tabela_vl' ? Number(value) : value,
      },
    }));
  };

  const salvarItem = async (itemPk: number) => {
    if (!edited[itemPk]) return;
    setSavingPk(itemPk);
    try {
      await api.put('/exibidor-inventario', {
        item_pk: itemPk,
        ...edited[itemPk],
      });
      setEdited((prev) => {
        const next = { ...prev };
        delete next[itemPk];
        return next;
      });
      await load(search);
    } finally {
      setSavingPk(null);
    }
  };

  return (
    <ExibidorShell
      title="Editar pontos enviados"
      subtitle="Apenas pontos enviados pelo exibidor podem ser editados aqui — o legado BE180 é gerenciado pela equipe da BE180."
      breadcrumb={[
        { label: 'Home', path: '/' },
        { label: 'Atualizar inventário' },
        { label: 'Editar pontos enviados' },
      ]}
    >
      <div className="space-y-6">
        <AvisoFluxoAtualizacao descricao="As edições feitas aqui voltam para análise antes de serem aplicadas no inventário consolidado." />

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
          <div className="px-4 py-3 bg-[#f4f4f4] text-sm text-[#666]">
            {loading ? 'Carregando...' : `${visibleItems.length} registro(s)`}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f0f0f0]">
                <tr>
                  <th className="px-3 py-2 text-left">Código do ponto</th>
                  <th className="px-3 py-2 text-left">Ambiente</th>
                  <th className="px-3 py-2 text-left">Formato</th>
                  <th className="px-3 py-2 text-left">Tipo mídia</th>
                  <th className="px-3 py-2 text-left">Nome fantasia</th>
                  <th className="px-3 py-2 text-left">Valor tabela</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Ação</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const patch = edited[item.item_pk] || {};
                  return (
                    <tr key={item.item_pk} className="border-t border-[#eee]">
                      <td className="px-3 py-2 whitespace-nowrap">{item.codigo_ativo_st}</td>
                      <td className="px-3 py-2">
                        <input
                          className="w-[140px] border border-[#ddd] rounded px-2 py-1"
                          value={String(patch.ambiente_st ?? item.ambiente_st ?? '')}
                          onChange={(e) => onChangeField(item.item_pk, 'ambiente_st', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-[140px] border border-[#ddd] rounded px-2 py-1"
                          value={String(patch.formato_midia_st ?? item.formato_midia_st ?? '')}
                          onChange={(e) => onChangeField(item.item_pk, 'formato_midia_st', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-[140px] border border-[#ddd] rounded px-2 py-1"
                          value={String(patch.tipo_midia_st ?? item.tipo_midia_st ?? '')}
                          onChange={(e) => onChangeField(item.item_pk, 'tipo_midia_st', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-[160px] border border-[#ddd] rounded px-2 py-1"
                          value={String(patch.nome_fantasia_st ?? item.nome_fantasia_st ?? '')}
                          onChange={(e) => onChangeField(item.item_pk, 'nome_fantasia_st', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-[120px] border border-[#ddd] rounded px-2 py-1"
                          type="number"
                          value={String(patch.valor_tabela_vl ?? item.valor_tabela_vl ?? '')}
                          onChange={(e) => onChangeField(item.item_pk, 'valor_tabela_vl', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">{item.status_st}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          disabled={savingPk === item.item_pk}
                          className="px-3 py-1 rounded bg-[#ff4600] text-white text-xs font-semibold disabled:opacity-50"
                          onClick={() => salvarItem(item.item_pk)}
                        >
                          {savingPk === item.item_pk ? 'Salvando...' : 'Salvar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[#666]">
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
