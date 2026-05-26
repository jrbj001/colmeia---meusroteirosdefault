import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../config/axios';
import { usePermissions } from '../../../hooks';
import { Sidebar } from '../../../components/Sidebar/Sidebar';
import { Topbar } from '../../../components/Topbar/Topbar';

/* ── Ordenação ─────────────────────────────────────────────────────────────
   Coluna "perfil" usa ordem hierárquica fixa do sistema, em vez de alfabética. */
type SortKey =
  | 'usuario_nome'
  | 'usuario_email'
  | 'perfil_nome'
  | 'vinculo'
  | 'usuario_ativo'
  | 'ultimoAcesso_dh';

type SortDir = 'asc' | 'desc';

const PERFIL_ORDEM: Record<string, number> = {
  'admin': 1,
  'editor': 2,
  'visualizador': 3,
  'analista bi': 4,
  'exibidor': 5,
};

function ordemPerfil(nome: string | null | undefined): number {
  if (!nome) return 99;
  return PERFIL_ORDEM[nome.toLowerCase()] ?? 50;
}

interface Usuario {
  usuario_pk: number;
  usuario_nome: string;
  usuario_email: string | null;
  usuario_telefone: string | null;
  usuario_ativo: boolean;
  perfil_pk: number;
  perfil_nome: string;
  perfil_descricao: string;
  empresa_pk: number | null;
  exibidor_fk: number | null;
  primeiroAcesso_dh: string | null;
  ultimoAcesso_dh: string | null;
}

interface Perfil {
  perfil_pk: number;
  perfil_nome: string;
  perfil_descricao: string;
}

interface Agencia {
  id_agencia: number;
  nome_agencia: string;
}

interface ExibidorItem {
  exibidor_pk: number;
  nome_st: string;
  nome_fantasia_st: string | null;
  dominio_st: string | null;
}

const PERFIL_COLOR: Record<string, { bg: string; color: string }> = {
  admin:        { bg: '#fee2e2', color: '#b91c1c' },
  editor:       { bg: '#dbeafe', color: '#1d4ed8' },
  visualizador: { bg: '#dcfce7', color: '#15803d' },
  'analista bi':{ bg: '#ede9fe', color: '#6d28d9' },
  exibidor:     { bg: '#ffedd5', color: '#c2410c' },
};

const PerfilBadge: React.FC<{ nome: string }> = ({ nome }) => {
  const cfg = PERFIL_COLOR[nome.toLowerCase()] ?? { bg: '#f3f4f6', color: '#374151' };
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {nome}
    </span>
  );
};

function formatarAcesso(dh: string | null): { label: string; relativo: string | null } {
  if (!dh) return { label: 'Nunca acessou', relativo: null };
  const d = new Date(dh);
  if (Number.isNaN(d.getTime())) return { label: 'Nunca acessou', relativo: null };
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const label = `${dd}/${mm}/${yy}`;
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  let relativo: string;
  if (diffDays <= 0) relativo = 'hoje';
  else if (diffDays === 1) relativo = 'ontem';
  else if (diffDays < 30) relativo = `há ${diffDays} dias`;
  else if (diffDays < 365) relativo = `há ${Math.floor(diffDays / 30)} mês(es)`;
  else relativo = `há ${Math.floor(diffDays / 365)} ano(s)`;
  return { label, relativo };
}

const AcessoBadge: React.FC<{ dh: string | null }> = ({ dh }) => {
  if (!dh) {
    return (
      <span
        className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
        title="Este usuário ainda não fez login no sistema"
      >
        Nunca acessou
      </span>
    );
  }
  const { label, relativo } = formatarAcesso(dh);
  return (
    <div className="flex flex-col">
      <span
        className="inline-block w-fit px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
      >
        ✓ {label}
      </span>
      {relativo && <span className="text-[10px] text-[#9ca3af] mt-0.5">{relativo}</span>}
    </div>
  );
};

const MetricaInline: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-baseline gap-2">
    <span className="text-[11px] uppercase tracking-wide text-[#6b7280]">{label}</span>
    <span className="text-lg font-bold" style={{ color }}>{value}</span>
  </div>
);

interface SortableThProps {
  col: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (col: SortKey) => void;
  children: React.ReactNode;
}

const SortableTh: React.FC<SortableThProps> = ({ col, current, dir, onSort, children }) => {
  const isActive = current === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider select-none cursor-pointer transition-colors ${
        isActive ? 'text-[#ff4600]' : 'text-[#6b7280] hover:text-[#3a3a3a]'
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className="text-[9px] leading-none w-2 inline-block text-center">
          {isActive ? (dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </span>
    </th>
  );
};

const Skeleton: React.FC = () => (
  <div className="animate-pulse space-y-3 p-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex gap-4">
        <div className="h-4 bg-gray-100 rounded w-1/4" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-16" />
        <div className="h-4 bg-gray-100 rounded w-16" />
        <div className="h-4 bg-gray-100 rounded w-12" />
      </div>
    ))}
  </div>
);

export const AdminUsuarios: React.FC = () => {
  usePermissions();
  const [menuReduzido, setMenuReduzido] = useState(false);

  const [usuarios, setUsuarios]         = useState<Usuario[]>([]);
  const [perfis, setPerfis]             = useState<Perfil[]>([]);
  const [agencias, setAgencias]         = useState<Agencia[]>([]);
  const [exibidores, setExibidores]         = useState<ExibidorItem[]>([]);
  const [loadingExibidores, setLoadingExibidores] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [modoEdicao, setModoEdicao]     = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);

  const [formData, setFormData] = useState({
    nome_st: '',
    email_st: '',
    telefone_st: '',
    perfil_pk: 0,
    empresa_pk: null as number | null,
    exibidor_fk: null as number | null,
  });

  /* Ordenação — default: perfil hierárquico + nome */
  const [sortKey, setSortKey] = useState<SortKey>('perfil_nome');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  useEffect(() => { carregarDados(); }, [searchTerm, filtroPerfil, mostrarInativos]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const usuariosResponse = await api.get('/usuarios', {
        params: {
          page: 1, limit: 100,
          search: searchTerm,
          perfil: filtroPerfil,
          incluirInativos: mostrarInativos ? '1' : '0',
        }
      });
      setUsuarios(usuariosResponse.data.usuarios || []);

      if (perfis.length === 0) {
        const perfisResponse = await api.get('/perfis');
        setPerfis(perfisResponse.data.perfis || []);
      }
      if (agencias.length === 0) {
        const agenciasResponse = await api.get('/referencia?action=agencia');
        const agenciasData = Array.isArray(agenciasResponse.data)
          ? agenciasResponse.data
          : Array.isArray(agenciasResponse.data?.agencias)
            ? agenciasResponse.data.agencias : [];
        setAgencias(agenciasData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarExibidores = async () => {
    setLoadingExibidores(true);
    try {
      const exibRes = await api.get('/referencia?action=exibidor-cadastro');
      setExibidores(exibRes.data?.data || []);
    } catch (err: any) {
      console.error('[exibidor-cadastro]', err?.response?.data || err?.message);
      setExibidores([]);
    } finally {
      setLoadingExibidores(false);
    }
  };

  const abrirModalCriar = () => {
    setModoEdicao(false);
    setUsuarioSelecionado(null);
    setFormData({
      nome_st: '', email_st: '', telefone_st: '',
      perfil_pk: perfis.length > 0 ? perfis[0].perfil_pk : 0,
      empresa_pk: null, exibidor_fk: null,
    });
    carregarExibidores();
    setShowModal(true);
  };

  const abrirModalEditar = (usuario: Usuario) => {
    setModoEdicao(true);
    setUsuarioSelecionado(usuario);
    setFormData({
      nome_st: usuario.usuario_nome,
      email_st: usuario.usuario_email || '',
      telefone_st: usuario.usuario_telefone || '',
      perfil_pk: usuario.perfil_pk,
      empresa_pk: usuario.empresa_pk ?? null,
      exibidor_fk: usuario.exibidor_fk ?? null,
    });
    carregarExibidores();
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modoEdicao && usuarioSelecionado) {
        await api.put(`/usuarios?id=${usuarioSelecionado.usuario_pk}`, formData);
      } else {
        await api.post('/usuarios', formData);
      }
      setShowModal(false);
      carregarDados();
    } catch (error: any) {
      window.alert(error.response?.data?.error || 'Erro ao salvar usuário');
    }
  };

  const desativarUsuario = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja desativar este usuário?')) return;
    try {
      await api.delete(`/usuarios?id=${id}`);
      carregarDados();
    } catch (error: any) {
      window.alert(error.response?.data?.error || 'Erro ao desativar usuário');
    }
  };

  const reativarUsuario = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja reativar este usuário?')) return;
    try {
      await api.patch(`/usuarios?id=${id}`);
      carregarDados();
    } catch (error: any) {
      window.alert(error.response?.data?.error || 'Erro ao reativar usuário');
    }
  };

  const agenciasSeguras = Array.isArray(agencias) ? agencias : [];

  const perfilSelecionado = perfis.find(p => p.perfil_pk === formData.perfil_pk);
  const isExibidorPerfil = perfilSelecionado?.perfil_nome?.toLowerCase().includes('exibidor') ?? false;

  /* Ordenação aplicada client-side sobre o array de usuários */
  const usuariosOrdenados = useMemo(() => {
    const arr = [...usuarios];
    const dir = sortDir === 'asc' ? 1 : -1;

    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'usuario_nome':
          cmp = (a.usuario_nome || '').localeCompare(b.usuario_nome || '', 'pt-BR');
          break;
        case 'usuario_email':
          cmp = (a.usuario_email || '').localeCompare(b.usuario_email || '', 'pt-BR');
          break;
        case 'perfil_nome': {
          const oA = ordemPerfil(a.perfil_nome);
          const oB = ordemPerfil(b.perfil_nome);
          cmp = oA - oB;
          if (cmp === 0) {
            cmp = (a.usuario_nome || '').localeCompare(b.usuario_nome || '', 'pt-BR');
          }
          break;
        }
        case 'vinculo': {
          const labelVinculo = (u: Usuario) =>
            u.exibidor_fk ? `1-Exibidor #${u.exibidor_fk}` : u.empresa_pk ? `2-Agência #${u.empresa_pk}` : '3-Be';
          cmp = labelVinculo(a).localeCompare(labelVinculo(b), 'pt-BR');
          break;
        }
        case 'usuario_ativo':
          cmp = (a.usuario_ativo ? 1 : 0) - (b.usuario_ativo ? 1 : 0);
          break;
        case 'ultimoAcesso_dh': {
          // Nunca acessou (NULL) vai para o final em ASC, início em DESC
          const tA = a.ultimoAcesso_dh ? new Date(a.ultimoAcesso_dh).getTime() : -Infinity;
          const tB = b.ultimoAcesso_dh ? new Date(b.ultimoAcesso_dh).getTime() : -Infinity;
          cmp = tA - tB;
          break;
        }
      }
      return cmp * dir;
    });

    return arr;
  }, [usuarios, sortKey, sortDir]);

  const stats = useMemo(() => ({
    total:    usuarios.length,
    ativos:   usuarios.filter(u => u.usuario_ativo).length,
    inativos: usuarios.filter(u => !u.usuario_ativo).length,
    exibidores: usuarios.filter(u => u.perfil_nome?.toLowerCase().includes('exibidor')).length,
    jaAcessaram: usuarios.filter(u => !!u.ultimoAcesso_dh).length,
    nuncaAcessaram: usuarios.filter(u => !u.ultimoAcesso_dh).length,
  }), [usuarios]);

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
              { label: 'Administração' },
              { label: 'Gerenciar Usuários' },
            ],
          }}
        />
        <div
          className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${
            menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'
          }`}
        />

        <div className="flex-1 pt-20 pb-10 px-6 overflow-auto">

          {/* Cabeçalho compacto */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-baseline gap-3">
              <h1 className="text-xl font-bold text-[#222] tracking-tight">
                Gerenciar Usuários
              </h1>
              <span className="text-sm text-[#9ca3af]">
                {stats.total} {stats.total === 1 ? 'usuário' : 'usuários'}
              </span>
            </div>
            <button
              onClick={abrirModalCriar}
              className="bg-[#ff4600] hover:bg-[#e33d00] active:scale-95 text-white font-medium text-sm h-9 px-4 rounded-lg transition-all"
            >
              + Novo Usuário
            </button>
          </div>

          {/* Métricas — strip horizontal lean */}
          <div className="flex flex-wrap gap-6 mb-4 pb-4 border-b border-[#f0f0f0]">
            <MetricaInline label="Total" value={stats.total} color="#0a52e6" />
            <MetricaInline label="Ativos" value={stats.ativos} color="#15803d" />
            <MetricaInline label="Inativos" value={stats.inativos} color="#6b7280" />
            <MetricaInline label="Exibidores" value={stats.exibidores} color="#ff4600" />
            <MetricaInline label="Já acessaram" value={stats.jaAcessaram} color="#15803d" />
            <MetricaInline label="Nunca acessaram" value={stats.nuncaAcessaram} color="#92400e" />
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[260px] max-w-[420px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 h-9 text-sm border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#ff4600] focus:border-transparent outline-none"
              />
            </div>
            <select
              value={filtroPerfil}
              onChange={(e) => setFiltroPerfil(e.target.value)}
              className="border border-[#d1d5db] rounded-lg px-3 h-9 text-sm focus:ring-2 focus:ring-[#ff4600] outline-none bg-white"
            >
              <option value="">Todos os perfis</option>
              {perfis.map(p => (
                <option key={p.perfil_pk} value={p.perfil_nome}>{p.perfil_nome}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-[#3a3a3a] cursor-pointer select-none ml-auto">
              <input
                type="checkbox"
                checked={mostrarInativos}
                onChange={(e) => setMostrarInativos(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-[#ff4600]"
              />
              Mostrar inativos
            </label>
          </div>

          {/* Tabela — largura total */}
          <div className="rounded-lg border border-[#e5e7eb] overflow-hidden bg-white">
            {loading ? (
              <Skeleton />
            ) : usuariosOrdenados.length === 0 ? (
              <div className="py-16 text-center text-[#6b7280] text-sm">
                Nenhum usuário encontrado.
              </div>
            ) : (
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[22%]" />
                  <col className="w-[10%]" />
                  <col className="w-[16%]" />
                  <col className="w-[8%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                    <SortableTh col="usuario_nome" current={sortKey} dir={sortDir} onSort={handleSort}>Usuário</SortableTh>
                    <SortableTh col="usuario_email" current={sortKey} dir={sortDir} onSort={handleSort}>E-mail</SortableTh>
                    <SortableTh col="perfil_nome" current={sortKey} dir={sortDir} onSort={handleSort}>Perfil</SortableTh>
                    <SortableTh col="vinculo" current={sortKey} dir={sortDir} onSort={handleSort}>Vínculo</SortableTh>
                    <SortableTh col="usuario_ativo" current={sortKey} dir={sortDir} onSort={handleSort}>Status</SortableTh>
                    <SortableTh col="ultimoAcesso_dh" current={sortKey} dir={sortDir} onSort={handleSort}>Último acesso</SortableTh>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6]">
                  {usuariosOrdenados.map((usuario) => (
                    <tr key={usuario.usuario_pk} className="hover:bg-[#fafafa] transition-colors">
                      <td className="px-4 py-2.5 truncate">
                        <span className="text-sm font-medium text-[#111827]">{usuario.usuario_nome}</span>
                      </td>
                      <td className="px-4 py-2.5 truncate">
                        <span className="text-sm text-[#6b7280]">{usuario.usuario_email || '—'}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <PerfilBadge nome={usuario.perfil_nome} />
                      </td>
                      <td className="px-4 py-2.5 truncate">
                        <span className="text-sm text-[#6b7280]">
                          {usuario.exibidor_fk
                            ? <span className="text-[#c2410c] font-medium">Exibidor #{usuario.exibidor_fk}</span>
                            : usuario.empresa_pk
                              ? agenciasSeguras.find(a => a.id_agencia === usuario.empresa_pk)?.nome_agencia || `Agência #${usuario.empresa_pk}`
                              : <span className="text-[#9ca3af] italic">Be (interno)</span>
                          }
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={usuario.usuario_ativo
                            ? { backgroundColor: '#dcfce7', color: '#15803d' }
                            : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                          }
                        >
                          {usuario.usuario_ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <AcessoBadge dh={usuario.ultimoAcesso_dh} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {usuario.usuario_ativo ? (
                          <span className="inline-flex gap-3">
                            <button
                              onClick={() => abrirModalEditar(usuario)}
                              className="text-sm text-[#ff4600] hover:text-[#c2410c] font-medium"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => desativarUsuario(usuario.usuario_pk)}
                              className="text-sm text-red-500 hover:text-red-700 font-medium"
                            >
                              Desativar
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => reativarUsuario(usuario.usuario_pk)}
                            className="text-sm text-green-600 hover:text-green-800 font-medium"
                          >
                            Reativar
                          </button>
                        )}
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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

      {/* Modal Criar / Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
              <h2 className="text-lg font-bold text-[#111827]">
                {modoEdicao ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#9ca3af] hover:text-[#374151] text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

                {/* Nome */}
                <div>
                  <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wide mb-1">Nome *</label>
                  <input
                    type="text" required
                    value={formData.nome_st}
                    onChange={(e) => setFormData({ ...formData, nome_st: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#ff4600] focus:border-transparent outline-none"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wide mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.email_st}
                    onChange={(e) => setFormData({ ...formData, email_st: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#ff4600] focus:border-transparent outline-none"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wide mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={formData.telefone_st}
                    onChange={(e) => setFormData({ ...formData, telefone_st: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#ff4600] focus:border-transparent outline-none"
                  />
                </div>

                {/* Perfil */}
                <div>
                  <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wide mb-1">Perfil *</label>
                  <select
                    required
                    value={formData.perfil_pk}
                    onChange={(e) => setFormData({
                      ...formData,
                      perfil_pk: parseInt(e.target.value),
                      empresa_pk: null,
                      exibidor_fk: null,
                    })}
                    className="w-full px-3 py-2 text-sm border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#ff4600] focus:border-transparent outline-none"
                  >
                    <option value="">Selecione um perfil</option>
                    {perfis.map(p => (
                      <option key={p.perfil_pk} value={p.perfil_pk}>
                        {p.perfil_nome} — {p.perfil_descricao}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Agência — só para não-exibidores */}
                {!isExibidorPerfil && (
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wide mb-1">Agência</label>
                    <select
                      value={formData.empresa_pk ?? ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        empresa_pk: e.target.value ? parseInt(e.target.value) : null,
                      })}
                      className="w-full px-3 py-2 text-sm border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#ff4600] focus:border-transparent outline-none"
                    >
                      <option value="">Nenhuma (usuário interno Be)</option>
                      {agenciasSeguras.map((ag) => (
                        <option key={ag.id_agencia} value={ag.id_agencia}>{ag.nome_agencia}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#9ca3af] mt-1">Vincule a uma agência para acesso externo.</p>
                  </div>
                )}

                {/* Exibidor — só para perfil Exibidor */}
                {isExibidorPerfil && (
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wide mb-1">Exibidor *</label>
                    {loadingExibidores ? (
                      <div className="w-full px-3 py-2.5 border border-[#d1d5db] bg-[#f9fafb] rounded-lg text-sm text-[#9ca3af] flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4 text-[#ff4600]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        Carregando exibidores...
                      </div>
                    ) : exibidores.length === 0 ? (
                      <div className="w-full px-3 py-2.5 border border-amber-200 bg-amber-50 rounded-lg text-sm text-amber-700">
                        Nenhum exibidor cadastrado. Cadastre primeiro em Gestão de Exibidores.
                      </div>
                    ) : (
                      <select
                        required
                        value={formData.exibidor_fk ?? ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          exibidor_fk: e.target.value ? parseInt(e.target.value) : null,
                          empresa_pk: null,
                        })}
                        className="w-full px-3 py-2 text-sm border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#ff4600] focus:border-transparent outline-none"
                      >
                        <option value="">Selecione o exibidor</option>
                        {exibidores.map((ex) => (
                          <option key={ex.exibidor_pk} value={ex.exibidor_pk}>
                            {ex.nome_fantasia_st || ex.nome_st}
                            {ex.dominio_st ? ` — ${ex.dominio_st}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-[11px] text-[#9ca3af] mt-1">Vincula o usuário ao portal do exibidor.</p>
                  </div>
                )}
              </div>

              {/* Footer modal */}
              <div className="px-6 py-4 border-t border-[#f3f4f6] flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-[#d1d5db] hover:bg-[#f9fafb] text-[#374151] font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#ff4600] hover:bg-[#e33d00] text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  {modoEdicao ? 'Salvar alterações' : 'Criar usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
