import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { Topbar } from '../../components/Topbar/Topbar';
import api from '../../config/axios';
import { ModalCadastroExibidor } from './ModalCadastroExibidor';
import { DrawerDetalheExibidor } from './DrawerDetalheExibidor';

export interface ExibidorListItem {
  exibidor_pk: number | null;
  nome_st: string;
  nome_fantasia_st: string | null;
  codigo_st: string | null;
  cnpj_st: string | null;
  cidade_st: string | null;
  estado_st: string | null;
  active_bl: boolean | null;
  sandbox_bl: number;
  origem_st: 'CADASTRADO' | 'PENDENTE';
  qtd_dominios: number;
  qtd_usuarios: number;
  qtd_ativos_linkados: number;
  tem_legado: number;
}

type FiltroOrigem = 'TODOS' | 'CADASTRADO' | 'PENDENTE';

export const GestaoExibidores: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [items, setItems] = useState<ExibidorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<FiltroOrigem>('TODOS');
  const [incluirSandbox, setIncluirSandbox] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState<
    | { tipo: 'novo' }
    | { tipo: 'do-legado'; nome_legado: string; qtd_ativos: number }
    | { tipo: 'editar'; exibidor_pk: number }
    | null
  >(null);

  const [detalheAberto, setDetalheAberto] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (incluirSandbox) params.set('incluir_sandbox', '1');
      if (search.trim()) params.set('search', search.trim());
      const { data } = await api.get(`/referencia?action=exibidor-gestao&mode=list&${params.toString()}`);
      setItems(data?.data || []);
    } catch (err: any) {
      setErro(err?.response?.data?.error || err?.message || 'Erro ao carregar exibidores');
    } finally {
      setLoading(false);
    }
  }, [search, incluirSandbox]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const itensFiltrados = useMemo(() => {
    if (filtroOrigem === 'TODOS') return items;
    return items.filter((i) => i.origem_st === filtroOrigem);
  }, [items, filtroOrigem]);

  const stats = useMemo(() => {
    const cadastrados = items.filter((i) => i.origem_st === 'CADASTRADO').length;
    const pendentes = items.filter((i) => i.origem_st === 'PENDENTE').length;
    const totalAtivosLinkados = items
      .filter((i) => i.origem_st === 'CADASTRADO')
      .reduce((acc, i) => acc + Number(i.qtd_ativos_linkados || 0), 0);
    const totalAtivosPendentes = items
      .filter((i) => i.origem_st === 'PENDENTE')
      .reduce((acc, i) => acc + Number(i.qtd_ativos_linkados || 0), 0);
    return { cadastrados, pendentes, totalAtivosLinkados, totalAtivosPendentes };
  }, [items]);

  const handleSucessoCadastro = () => {
    setModalAberto(null);
    carregar();
  };

  return (
    <div className="min-h-screen bg-white flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? 'left-20' : 'left-64'}`} />
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
              { label: 'Gestão de exibidores' },
            ],
          }}
        />
        <div
          className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${
            menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'
          }`}
        />

        <div className="flex-1 pt-24 pb-16 px-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-[#ff4600] mb-2 uppercase tracking-wide">
                  Gestão de exibidores
                </h1>
                <p className="text-[#3a3a3a] text-base leading-relaxed max-w-2xl">
                  Cadastre exibidores existentes no banco de ativos legado, complete os dados e
                  vincule domínios para liberar acesso à plataforma.
                </p>
              </div>
              <button
                onClick={() => setModalAberto({ tipo: 'novo' })}
                className="bg-[#ff4600] hover:bg-[#e33d00] text-white font-medium h-[44px] px-6 rounded-lg transition-colors"
              >
                + Adicionar exibidor novo
              </button>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <div className="rounded-xl border border-[#a8c2ef] bg-white p-4">
                <p className="text-xs uppercase text-[#666]">Cadastrados</p>
                <p className="text-2xl text-[#0a52e6] font-bold">{stats.cadastrados}</p>
              </div>
              <div className="rounded-xl border border-[#f6c69b] bg-white p-4">
                <p className="text-xs uppercase text-[#666]">Pendentes (no legado)</p>
                <p className="text-2xl text-[#ff4600] font-bold">{stats.pendentes}</p>
              </div>
              <div className="rounded-xl border border-[#a8c2ef] bg-white p-4">
                <p className="text-xs uppercase text-[#666]">Ativos linkados</p>
                <p className="text-2xl text-[#0a52e6] font-bold">
                  {stats.totalAtivosLinkados.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="rounded-xl border border-[#f6c69b] bg-white p-4">
                <p className="text-xs uppercase text-[#666]">Ativos sem dono</p>
                <p className="text-2xl text-[#ff4600] font-bold">
                  {stats.totalAtivosPendentes.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && carregar()}
                className="h-[40px] px-3 border border-[#d9d9d9] rounded-lg w-[300px] focus:outline-none focus:ring-2 focus:ring-[#ff4600]"
              />
              <button
                onClick={carregar}
                className="h-[40px] px-4 border border-[#d9d9d9] rounded-lg hover:bg-[#f8f8f8] text-sm"
              >
                Buscar
              </button>

              <div className="flex border border-[#d9d9d9] rounded-lg overflow-hidden">
                {(['TODOS', 'CADASTRADO', 'PENDENTE'] as FiltroOrigem[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltroOrigem(f)}
                    className={`h-[40px] px-4 text-sm font-medium ${
                      filtroOrigem === f
                        ? 'bg-[#ff4600] text-white'
                        : 'bg-white text-[#3a3a3a] hover:bg-[#f8f8f8]'
                    }`}
                  >
                    {f === 'TODOS' ? 'Todos' : f === 'CADASTRADO' ? 'Cadastrados' : 'Pendentes'}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-sm text-[#3a3a3a] ml-auto">
                <input
                  type="checkbox"
                  checked={incluirSandbox}
                  onChange={(e) => setIncluirSandbox(e.target.checked)}
                  className="w-4 h-4 accent-[#ff4600]"
                />
                Mostrar sandbox
              </label>
            </div>

            {/* Tabela */}
            <div className="border border-[#ddd] rounded-xl overflow-hidden bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f7f7f7] text-[#3a3a3a]">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Exibidor</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-right px-4 py-3 font-semibold">Domínios</th>
                    <th className="text-right px-4 py-3 font-semibold">Usuários</th>
                    <th className="text-right px-4 py-3 font-semibold">Ativos legado</th>
                    <th className="text-right px-4 py-3 font-semibold w-[200px]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-[#666]">
                        Carregando exibidores...
                      </td>
                    </tr>
                  ) : itensFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-[#666]">
                        Nenhum exibidor encontrado.
                      </td>
                    </tr>
                  ) : (
                    itensFiltrados.map((item) => (
                      <tr
                        key={`${item.origem_st}-${item.exibidor_pk ?? item.nome_st}`}
                        className="border-t border-[#eee] hover:bg-[#fafafa]"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#222]">{item.nome_st}</div>
                          {item.nome_fantasia_st && item.nome_fantasia_st !== item.nome_st ? (
                            <div className="text-xs text-[#666]">{item.nome_fantasia_st}</div>
                          ) : null}
                          {item.cidade_st ? (
                            <div className="text-xs text-[#888]">
                              {item.cidade_st}
                              {item.estado_st ? `/${item.estado_st}` : ''}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {item.origem_st === 'CADASTRADO' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e7f3ea] text-[#1f6b2c] text-xs font-medium">
                              ✓ Cadastrado
                              {item.sandbox_bl ? (
                                <span className="ml-1 px-1.5 py-0.5 rounded bg-[#fff5d4] text-[#7a5b00] text-[10px]">
                                  sandbox
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff0e6] text-[#a8410d] text-xs font-medium">
                              ⚠ Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.origem_st === 'CADASTRADO' ? (
                            <span className={item.qtd_dominios === 0 ? 'text-[#a8410d]' : 'text-[#222]'}>
                              {item.qtd_dominios}
                            </span>
                          ) : (
                            <span className="text-[#aaa]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.origem_st === 'CADASTRADO' ? (
                            item.qtd_usuarios
                          ) : (
                            <span className="text-[#aaa]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {Number(item.qtd_ativos_linkados || 0).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.origem_st === 'CADASTRADO' && item.exibidor_pk ? (
                            <button
                              onClick={() => setDetalheAberto(item.exibidor_pk!)}
                              className="px-3 py-1.5 rounded-lg bg-[#0a52e6] hover:bg-[#0843b8] text-white text-xs font-medium"
                            >
                              Gerenciar
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setModalAberto({
                                  tipo: 'do-legado',
                                  nome_legado: item.nome_st,
                                  qtd_ativos: item.qtd_ativos_linkados,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-[#ff4600] hover:bg-[#e33d00] text-white text-xs font-medium"
                            >
                              Cadastrar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {erro ? (
              <div className="mt-4 p-3 rounded-lg bg-[#fff5f5] border border-[#f4caca] text-sm text-[#7f1d1d]">
                {erro}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {modalAberto ? (
        <ModalCadastroExibidor
          mode={modalAberto}
          onClose={() => setModalAberto(null)}
          onSuccess={handleSucessoCadastro}
        />
      ) : null}

      {detalheAberto ? (
        <DrawerDetalheExibidor
          exibidor_pk={detalheAberto}
          onClose={() => setDetalheAberto(null)}
          onChanged={carregar}
        />
      ) : null}
    </div>
  );
};
