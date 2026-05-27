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

type SortKey =
  | 'origem_st'
  | 'nome_st'
  | 'qtd_dominios'
  | 'qtd_usuarios'
  | 'qtd_ativos_linkados';
type SortDir = 'asc' | 'desc';

/* Cadastrado vem antes de Pendente na ordenação por status. */
const ORDEM_STATUS: Record<'CADASTRADO' | 'PENDENTE', number> = {
  CADASTRADO: 0,
  PENDENTE: 1,
};

interface SortableThProps {
  col: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
  children: React.ReactNode;
}

const SortableTh: React.FC<SortableThProps> = ({ col, current, dir, onSort, align = 'left', children }) => {
  const active = current === col;
  const arrow = !active ? '↕' : dir === 'asc' ? '↑' : '↓';
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] cursor-pointer select-none hover:bg-[#f3f4f6] ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className={`text-[9px] ${active ? 'text-[#ff4600]' : 'text-[#d1d5db]'}`}>{arrow}</span>
      </span>
    </th>
  );
};

const MetricaInline: React.FC<{ label: string; value: React.ReactNode; cor?: string }> = ({
  label,
  value,
  cor = '#222',
}) => (
  <div className="flex items-baseline gap-1.5">
    <span className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-semibold">{label}</span>
    <span className="text-sm font-bold" style={{ color: cor }}>
      {value}
    </span>
  </div>
);

export const GestaoExibidores: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [items, setItems] = useState<ExibidorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<FiltroOrigem>('TODOS');
  const [incluirSandbox, setIncluirSandbox] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('origem_st');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

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

  const handleSort = (col: SortKey) => {
    if (sortKey === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col);
      setSortDir('asc');
    }
  };

  const itensFiltrados = useMemo(() => {
    if (filtroOrigem === 'TODOS') return items;
    return items.filter((i) => i.origem_st === filtroOrigem);
  }, [items, filtroOrigem]);

  const itensOrdenados = useMemo(() => {
    const arr = [...itensFiltrados];
    const sign = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va: number | string = '';
      let vb: number | string = '';
      switch (sortKey) {
        case 'origem_st':
          va = ORDEM_STATUS[a.origem_st];
          vb = ORDEM_STATUS[b.origem_st];
          if (va === vb) return a.nome_st.localeCompare(b.nome_st, 'pt-BR');
          break;
        case 'nome_st':
          return sign * a.nome_st.localeCompare(b.nome_st, 'pt-BR');
        case 'qtd_dominios':
          va = Number(a.qtd_dominios || 0);
          vb = Number(b.qtd_dominios || 0);
          break;
        case 'qtd_usuarios':
          va = Number(a.qtd_usuarios || 0);
          vb = Number(b.qtd_usuarios || 0);
          break;
        case 'qtd_ativos_linkados':
          va = Number(a.qtd_ativos_linkados || 0);
          vb = Number(b.qtd_ativos_linkados || 0);
          break;
      }
      if (va < vb) return -1 * sign;
      if (va > vb) return 1 * sign;
      return a.nome_st.localeCompare(b.nome_st, 'pt-BR');
    });
    return arr;
  }, [itensFiltrados, sortKey, sortDir]);

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
      <div className={`fixed top-0 z-40 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? 'left-20' : 'left-64'}`} />
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

        <div className="flex-1 pt-20 pb-16 overflow-auto">
          {/* Cabeçalho compacto */}
          <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-[#f3f4f6]">
            <div className="flex items-baseline gap-3">
              <h1 className="text-base font-bold text-[#222]">Gestão de exibidores</h1>
              <span className="text-xs text-[#9ca3af]">
                {loading ? 'carregando…' : `${itensOrdenados.length} de ${items.length}`}
              </span>
            </div>
            <button
              onClick={() => setModalAberto({ tipo: 'novo' })}
              className="bg-[#ff4600] hover:bg-[#e33d00] text-white font-medium text-xs h-[34px] px-4 rounded-lg transition-colors"
            >
              + Adicionar exibidor novo
            </button>
          </div>

          {/* Métricas inline */}
          <div className="flex items-center gap-6 px-6 py-2.5 bg-[#fafafa] border-b border-[#f3f4f6]">
            <MetricaInline label="Cadastrados" value={stats.cadastrados} cor="#111827" />
            <MetricaInline label="Pendentes" value={stats.pendentes} cor="#6b7280" />
            <MetricaInline
              label="Ativos linkados"
              value={stats.totalAtivosLinkados.toLocaleString('pt-BR')}
              cor="#111827"
            />
            <MetricaInline
              label="Ativos sem dono"
              value={stats.totalAtivosPendentes.toLocaleString('pt-BR')}
              cor="#6b7280"
            />
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3 px-6 py-3 flex-wrap border-b border-[#f3f4f6]">
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && carregar()}
              className="h-[34px] px-3 text-xs border border-[#d9d9d9] rounded-lg w-[260px] focus:outline-none focus:ring-2 focus:ring-[#ff4600]"
            />
            <button
              onClick={carregar}
              className="h-[34px] px-3 text-xs border border-[#d9d9d9] rounded-lg hover:bg-[#f8f8f8]"
            >
              Buscar
            </button>

            <div className="flex border border-[#d9d9d9] rounded-lg overflow-hidden">
              {(['TODOS', 'CADASTRADO', 'PENDENTE'] as FiltroOrigem[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroOrigem(f)}
                  className={`h-[34px] px-3 text-xs font-medium ${
                    filtroOrigem === f
                      ? 'bg-[#ff4600] text-white'
                      : 'bg-white text-[#3a3a3a] hover:bg-[#f8f8f8]'
                  }`}
                >
                  {f === 'TODOS' ? 'Todos' : f === 'CADASTRADO' ? 'Cadastrados' : 'Pendentes'}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-[#3a3a3a] ml-auto">
              <input
                type="checkbox"
                checked={incluirSandbox}
                onChange={(e) => setIncluirSandbox(e.target.checked)}
                className="w-4 h-4 accent-[#ff4600]"
              />
              Mostrar sandbox
            </label>
          </div>

          {/* Tabela full-width */}
          <div className="w-full">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[38%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                  <SortableTh col="nome_st" current={sortKey} dir={sortDir} onSort={handleSort}>
                    Exibidor
                  </SortableTh>
                  <SortableTh col="origem_st" current={sortKey} dir={sortDir} onSort={handleSort}>
                    Status
                  </SortableTh>
                  <SortableTh
                    col="qtd_dominios"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="right"
                  >
                    Domínios
                  </SortableTh>
                  <SortableTh
                    col="qtd_usuarios"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="right"
                  >
                    Usuários
                  </SortableTh>
                  <SortableTh
                    col="qtd_ativos_linkados"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="right"
                  >
                    Ativos legado
                  </SortableTh>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#666]">
                      Carregando exibidores...
                    </td>
                  </tr>
                ) : itensOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#666]">
                      Nenhum exibidor encontrado.
                    </td>
                  </tr>
                ) : (
                  itensOrdenados.map((item) => (
                    <tr
                      key={`${item.origem_st}-${item.exibidor_pk ?? item.nome_st}`}
                      className="border-b border-[#f3f4f6] hover:bg-[#fafafa]"
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-[#222] truncate" title={item.nome_st}>
                          {item.nome_st}
                        </div>
                        {item.nome_fantasia_st && item.nome_fantasia_st !== item.nome_st ? (
                          <div className="text-xs text-[#666] truncate">{item.nome_fantasia_st}</div>
                        ) : null}
                        {item.cidade_st ? (
                          <div className="text-xs text-[#888]">
                            {item.cidade_st}
                            {item.estado_st ? `/${item.estado_st}` : ''}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5">
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
                      <td className="px-4 py-2.5 text-right">
                        {item.origem_st === 'CADASTRADO' ? (
                          <span className={item.qtd_dominios === 0 ? 'text-[#a8410d]' : 'text-[#222]'}>
                            {item.qtd_dominios}
                          </span>
                        ) : (
                          <span className="text-[#aaa]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {item.origem_st === 'CADASTRADO' ? (
                          item.qtd_usuarios
                        ) : (
                          <span className="text-[#aaa]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {Number(item.qtd_ativos_linkados || 0).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {item.origem_st === 'CADASTRADO' && item.exibidor_pk ? (
                          <button
                            onClick={() => setDetalheAberto(item.exibidor_pk!)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6] transition-colors"
                          >
                            Gerenciar →
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
                            className="px-2.5 py-1 rounded-md text-xs font-medium text-[#374151] border border-[#d1d5db] hover:text-[#111827] hover:border-[#6b7280] hover:bg-[#f9fafb] transition-colors"
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
            <div className="mx-6 mt-4 p-3 rounded-lg bg-[#fff5f5] border border-[#f4caca] text-sm text-[#7f1d1d]">
              {erro}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          className={`fixed bottom-0 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${
            menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'
          }`}
        >
          <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
          <footer className="w-full border-t border-[#c1c1c1] p-4 text-center text-[10px] italic text-[#b0b0b0] tracking-wide bg-white z-10 font-sans pointer-events-auto relative">
            <div className="w-full h-[1px] bg-[#c1c1c1] absolute top-0 left-0" />
            © 2025 Colmeia. All rights are reserved to Be Mediatech OOH.
          </footer>
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
