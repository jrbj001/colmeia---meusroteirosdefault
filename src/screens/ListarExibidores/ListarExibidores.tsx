import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { Topbar } from '../../components/Topbar/Topbar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import api from '../../config/axios';

type TabId = 'cadastrados' | 'inventario';

interface ExibidorCadastrado {
  exibidor_pk: number;
  nome_st: string;
  nome_fantasia_st: string | null;
  codigo_st: string | null;
  cnpj_st: string | null;
  cidade_st: string | null;
  estado_st: string | null;
  active_bl: boolean;
  dataCriacao_dh: string;
}

interface ExibidorInventario {
  id: string;
  name: string;
}

function formatarData(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

export const ListarExibidores: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [tab, setTab] = useState<TabId>('cadastrados');

  const [cadastrados, setCadastrados] = useState<ExibidorCadastrado[]>([]);
  const [loadingCad, setLoadingCad] = useState(false);
  const [erroCad, setErroCad] = useState<string | null>(null);

  const [inventario, setInventario] = useState<ExibidorInventario[]>([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [erroInv, setErroInv] = useState<string | null>(null);
  const [buscaInv, setBuscaInv] = useState('');
  const [buscaInvDebounced, setBuscaInvDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setBuscaInvDebounced(buscaInv.trim()), 350);
    return () => clearTimeout(t);
  }, [buscaInv]);

  const carregarCadastrados = useCallback(async () => {
    setLoadingCad(true);
    setErroCad(null);
    try {
      const { data } = await api.get('/exibidor-cadastro');
      if (data?.success && Array.isArray(data.data)) {
        setCadastrados(data.data);
      } else {
        setErroCad(data?.error || 'Resposta inválida da API.');
        setCadastrados([]);
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        'Erro ao carregar cadastrados.';
      setErroCad(String(msg));
      setCadastrados([]);
    } finally {
      setLoadingCad(false);
    }
  }, []);

  const carregarInventario = useCallback(async (search: string) => {
    setLoadingInv(true);
    setErroInv(null);
    try {
      const { data } = await api.get('/exibidores', {
        params: search ? { search } : undefined,
      });
      const lista = Array.isArray(data) ? data : [];
      setInventario(
        lista.map((row: { id?: string; name?: string }) => ({
          id: String(row.id ?? row.name ?? ''),
          name: String(row.name ?? row.id ?? ''),
        }))
      );
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Erro ao carregar inventário.';
      setErroInv(String(msg));
      setInventario([]);
    } finally {
      setLoadingInv(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'cadastrados') {
      carregarCadastrados();
    }
  }, [tab, carregarCadastrados]);

  useEffect(() => {
    if (tab === 'inventario') {
      carregarInventario(buscaInvDebounced);
    }
  }, [tab, buscaInvDebounced, carregarInventario]);

  const totalCadastrados = cadastrados.length;
  const totalInventario = inventario.length;

  const tabBtn = (id: TabId, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
        tab === id
          ? 'bg-[#ff4600] text-white border-[#ff4600]'
          : 'bg-white text-[#3a3a3a] border-[#d9d9d9] hover:bg-[#f7f7f7]'
      }`}
    >
      {label}
    </button>
  );

  const inputSearch =
    'w-full min-h-[44px] px-4 py-2 bg-white rounded-lg border border-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ff4600] focus:border-transparent text-[#3a3a3a]';

  return (
    <div className="min-h-screen bg-white flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div
        className={`fixed top-0 z-40 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? 'left-20' : 'left-64'}`}
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
              { label: 'Banco de ativos', path: '/banco-de-ativos' },
              { label: 'Listar exibidores' },
            ],
          }}
        />
        <div
          className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${
            menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'
          }`}
        />

        <div className="flex-1 pt-24 pb-32 px-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-[#ff4600] mb-2 uppercase tracking-wide">
                  Listar exibidores
                </h1>
                <p className="text-[#3a3a3a] text-base max-w-3xl">
                  Consulte os exibidores <strong>cadastrados na Colmeia</strong> (tabela{' '}
                  <code className="text-xs bg-[#f7f7f7] px-1 rounded border border-[#d9d9d9]">
                    exibidor_dm
                  </code>
                  ) e os nomes que <strong>já aparecem no inventário</strong> (origem{' '}
                  <code className="text-xs bg-[#f7f7f7] px-1 rounded border border-[#d9d9d9]">
                    bancoAtivosJoin_ft
                  </code>
                  ).
                </p>
              </div>
              <Link
                to="/banco-de-ativos/cadastrar/exibidor"
                className="shrink-0 h-[44px] px-5 inline-flex items-center justify-center rounded-lg bg-[#3a3a3a] text-white text-sm font-medium hover:bg-[#222] transition-colors"
              >
                Novo cadastro
              </Link>
            </div>

            <div className="flex flex-wrap gap-3 mb-8">
              {tabBtn('cadastrados', `Cadastrados na Colmeia (${loadingCad ? '…' : totalCadastrados})`)}
              {tabBtn('inventario', 'No inventário (banco de ativos)')}
            </div>

            {tab === 'cadastrados' && (
              <div className="border border-[#c1c1c1] rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-[#f7f7f7] border-b border-[#c1c1c1]">
                  <span className="text-sm font-semibold text-[#3a3a3a]">
                    {totalCadastrados} registro{totalCadastrados !== 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={carregarCadastrados}
                    disabled={loadingCad}
                    className="text-sm text-[#ff4600] font-medium hover:underline disabled:opacity-50"
                  >
                    Atualizar
                  </button>
                </div>
                {erroCad && (
                  <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-100">{erroCad}</div>
                )}
                {loadingCad ? (
                  <div className="flex justify-center py-16">
                    <LoadingSpinner />
                  </div>
                ) : cadastrados.length === 0 ? (
                  <div className="p-10 text-center text-[#757575] text-sm">
                    Nenhum exibidor cadastrado ainda.{' '}
                    <Link to="/banco-de-ativos/cadastrar/exibidor" className="text-[#ff4600] font-medium underline">
                      Cadastrar o primeiro
                    </Link>
                    .
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-[#fafafa] border-b border-[#c1c1c1] text-left">
                          <th className="px-4 py-3 font-semibold text-[#3a3a3a] whitespace-nowrap">ID</th>
                          <th className="px-4 py-3 font-semibold text-[#3a3a3a]">Nome</th>
                          <th className="px-4 py-3 font-semibold text-[#3a3a3a]">Fantasia</th>
                          <th className="px-4 py-3 font-semibold text-[#3a3a3a]">Código</th>
                          <th className="px-4 py-3 font-semibold text-[#3a3a3a] whitespace-nowrap">CNPJ</th>
                          <th className="px-4 py-3 font-semibold text-[#3a3a3a]">Cidade / UF</th>
                          <th className="px-4 py-3 font-semibold text-[#3a3a3a]">Ativo</th>
                          <th className="px-4 py-3 font-semibold text-[#3a3a3a] whitespace-nowrap">Criado em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cadastrados.map((row) => (
                          <tr key={row.exibidor_pk} className="border-b border-[#eee] hover:bg-[#fafafa]">
                            <td className="px-4 py-3 text-[#666]">{row.exibidor_pk}</td>
                            <td className="px-4 py-3 text-[#3a3a3a] font-medium">{row.nome_st}</td>
                            <td className="px-4 py-3 text-[#666]">{row.nome_fantasia_st || '—'}</td>
                            <td className="px-4 py-3 text-[#666]">{row.codigo_st || '—'}</td>
                            <td className="px-4 py-3 text-[#666] whitespace-nowrap">{row.cnpj_st || '—'}</td>
                            <td className="px-4 py-3 text-[#666]">
                              {[row.cidade_st, row.estado_st].filter(Boolean).join(' / ') || '—'}
                            </td>
                            <td className="px-4 py-3">{row.active_bl ? 'Sim' : 'Não'}</td>
                            <td className="px-4 py-3 text-[#666] whitespace-nowrap">
                              {formatarData(row.dataCriacao_dh)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'inventario' && (
              <div className="border border-[#c1c1c1] rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="p-4 bg-[#f7f7f7] border-b border-[#c1c1c1] space-y-3">
                  <label className="block text-sm font-semibold text-[#3a3a3a]">Buscar no inventário</label>
                  <input
                    type="text"
                    value={buscaInv}
                    onChange={(e) => setBuscaInv(e.target.value)}
                    placeholder="Filtra por parte do nome do exibidor…"
                    className={inputSearch}
                  />
                  <p className="text-xs text-[#757575]">
                    Lista até 1.000 nomes distintos do inventário. Use a busca para refinar. Para análise por
                    praça, use{' '}
                    <Link
                      to="/banco-de-ativos/relatorio-por-exibidor"
                      className="text-[#ff4600] underline font-medium"
                    >
                      Relatório por exibidor
                    </Link>
                    .
                  </p>
                </div>
                {erroInv && (
                  <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-100">{erroInv}</div>
                )}
                {loadingInv ? (
                  <div className="flex justify-center py-16">
                    <LoadingSpinner />
                  </div>
                ) : inventario.length === 0 ? (
                  <div className="p-10 text-center text-[#757575] text-sm">
                    Nenhum exibidor encontrado{buscaInvDebounced ? ' para esta busca.' : '.'}
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 text-xs text-[#757575] border-b border-[#eee]">
                      Exibindo {totalInventario} nome{totalInventario !== 1 ? 's' : ''}
                      {buscaInvDebounced ? ` (filtro: “${buscaInvDebounced}”)` : ''}
                    </div>
                    <ul className="max-h-[560px] overflow-y-auto divide-y divide-[#eee]">
                      {inventario.map((row) => (
                        <li
                          key={row.id}
                          className="px-4 py-2.5 text-[#3a3a3a] text-sm hover:bg-[#fafafa] flex justify-between gap-4"
                        >
                          <span className="font-medium">{row.name}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className={`fixed bottom-0 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${
            menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'
          }`}
        >
          <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
          <footer className="w-full border-t border-[#c1c1c1] p-4 text-center text-[10px] italic text-[#b0b0b0] tracking-wide bg-white z-10 font-sans pointer-events-auto relative">
            <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
            <div className="w-full h-[1px] bg-[#c1c1c1] absolute top-0 left-0" />
            © 2025 Colmeia. All rights are reserved to Be Mediatech OOH.
          </footer>
        </div>
      </div>
    </div>
  );
};
