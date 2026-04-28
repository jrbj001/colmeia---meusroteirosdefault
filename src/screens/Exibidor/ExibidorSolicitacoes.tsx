import React, { useEffect, useState } from 'react';
import api from '../../config/axios';
import { ExibidorShell } from './components/ExibidorShell';

interface Solicitacao {
  lote_pk: number;
  arquivo_st: string;
  status_st: string;
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

export const ExibidorSolicitacoes: React.FC = () => {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [itens, setItens] = useState<ItemResumo[]>([]);
  const [mensagem, setMensagem] = useState('');

  const loadSolicitacoes = async () => {
    const response = await api.get('/exibidor-inventario', { params: { mode: 'solicitacoes' } });
    setSolicitacoes(response.data?.data || []);
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
  }, []);

  const selecionar = async (lotePk: number) => {
    setSelected(lotePk);
    await loadDetalhe(lotePk);
  };

  const enviarMensagem = async () => {
    if (!selected || !mensagem.trim()) return;
    await api.post('/exibidor-inventario', {
      op: 'comentario',
      lote_pk: selected,
      autor: 'Exibidor',
      mensagem,
    });
    setMensagem('');
    await loadDetalhe(selected);
  };

  const enfileirarPlaces = async () => {
    if (!selected) return;
    await api.post('/exibidor-inventario', {
      op: 'queue-places',
      lote_pk: selected,
    });
    await loadDetalhe(selected);
  };

  return (
    <ExibidorShell
      title="Suas solicitações"
      subtitle="Acompanhe os status de importação e interaja com a equipe de validação."
      breadcrumb={[{ label: 'Home', path: '/' }, { label: 'Solicitações' }]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <section className="border border-[#ddd] rounded-xl overflow-hidden h-fit">
          <div className="px-4 py-3 bg-[#f4f4f4] font-semibold text-[#3a3a3a]">Solicitações</div>
          <ul className="divide-y divide-[#eee]">
            {solicitacoes.map((sol) => (
              <li key={sol.lote_pk}>
                <button
                  type="button"
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selected === sol.lote_pk ? 'bg-[#fff1eb]' : 'hover:bg-[#fafafa]'
                  }`}
                  onClick={() => selecionar(sol.lote_pk)}
                >
                  <p className="text-xs text-[#666]">Solicitação {String(sol.lote_pk).padStart(2, '0')}</p>
                  <p className="font-semibold text-[#222] truncate">{sol.arquivo_st}</p>
                  <p className="text-xs text-[#666] mt-1">
                    {new Date(sol.dataCriacao_dh).toLocaleDateString('pt-BR')} · {sol.status_st}
                  </p>
                </button>
              </li>
            ))}
            {solicitacoes.length === 0 ? (
              <li className="px-4 py-8 text-center text-[#666] text-sm">Nenhuma solicitação disponível.</li>
            ) : null}
          </ul>
        </section>

        <section className="border border-[#ddd] rounded-xl overflow-hidden min-h-[480px]">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-[#666]">
              Selecione uma solicitação para visualizar detalhes.
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-[#eee]">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-[#3a3a3a]">Solicitação {String(selected).padStart(2, '0')}</h3>
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 border border-[#ddd] rounded-lg hover:bg-[#fafafa]"
                    onClick={enfileirarPlaces}
                  >
                    Enfileirar enriquecimento Places
                  </button>
                </div>
              </div>

              <div className="p-4 border-b border-[#eee]">
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-[#3a3a3a]">
                    Ver pontos importados ({itens.length})
                  </summary>
                  <div className="mt-3 max-h-[240px] overflow-auto border border-[#eee] rounded-lg">
                    <table className="min-w-full text-xs">
                      <thead className="bg-[#f4f4f4]">
                        <tr>
                          <th className="px-2 py-1 text-left">Código</th>
                          <th className="px-2 py-1 text-left">Ambiente</th>
                          <th className="px-2 py-1 text-left">Formato</th>
                          <th className="px-2 py-1 text-left">Tipo</th>
                          <th className="px-2 py-1 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map((item) => (
                          <tr key={item.item_pk} className="border-t border-[#eee]">
                            <td className="px-2 py-1">{item.codigo_ativo_st}</td>
                            <td className="px-2 py-1">{item.ambiente_st || '-'}</td>
                            <td className="px-2 py-1">{item.formato_midia_st || '-'}</td>
                            <td className="px-2 py-1">{item.tipo_midia_st || '-'}</td>
                            <td className="px-2 py-1">
                              {item.status_st}
                              {item.erroValidacao_st ? ` (${item.erroValidacao_st})` : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>

              <div className="flex-1 p-4 space-y-4 overflow-auto">
                {comentarios.map((comentario) => (
                  <div key={comentario.comentario_pk} className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#ddd] flex items-center justify-center text-xs font-semibold">
                      {comentario.autor_st.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#222]">
                        {comentario.autor_st}{' '}
                        <span className="text-[#666] text-xs font-normal">
                          {new Date(comentario.dataCriacao_dh).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </p>
                      <p className="text-sm text-[#3a3a3a]">{comentario.mensagem_st}</p>
                    </div>
                  </div>
                ))}
                {comentarios.length === 0 ? (
                  <p className="text-sm text-[#666]">Sem comentários para esta solicitação.</p>
                ) : null}
              </div>

              <div className="p-4 border-t border-[#eee] flex gap-3">
                <input
                  type="text"
                  className="w-full border border-[#ddd] rounded-full px-4 py-2"
                  placeholder="Digite sua mensagem aqui"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                />
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-[#ff4600] text-white font-bold"
                  onClick={enviarMensagem}
                >
                  ↑
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </ExibidorShell>
  );
};
