import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { usePermissions } from '../../../hooks';
import { Navbar } from '../../../components/Navbar';

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

export const AdminUsuarios: React.FC = () => {
  usePermissions();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  
  const [formData, setFormData] = useState({
    nome_st: '',
    email_st: '',
    telefone_st: '',
    perfil_pk: 0,
    empresa_pk: null as number | null,
  });

  // Carregar usuários e perfis
  useEffect(() => {
    carregarDados();
  }, [searchTerm, filtroPerfil, mostrarInativos]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar usuários
      const usuariosResponse = await axios.get('/usuarios', {
        params: {
          page: 1,
          limit: 100,
          search: searchTerm,
          perfil: filtroPerfil,
          incluirInativos: mostrarInativos ? '1' : '0',
        }
      });
      setUsuarios(usuariosResponse.data.usuarios || []);

      // Carregar perfis e agências (apenas uma vez)
      if (perfis.length === 0) {
        const perfisResponse = await axios.get('/perfis');
        setPerfis(perfisResponse.data.perfis || []);
      }
      if (agencias.length === 0) {
        const agenciasResponse = await axios.get('/referencia?action=agencia');
        const agenciasData = Array.isArray(agenciasResponse.data)
          ? agenciasResponse.data
          : Array.isArray(agenciasResponse.data?.agencias)
            ? agenciasResponse.data.agencias
            : [];
        setAgencias(agenciasData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCriar = () => {
    setModoEdicao(false);
    setUsuarioSelecionado(null);
    setFormData({
      nome_st: '',
      email_st: '',
      telefone_st: '',
      perfil_pk: perfis.length > 0 ? perfis[0].perfil_pk : 0,
      empresa_pk: null,
    });
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
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (modoEdicao && usuarioSelecionado) {
        await axios.put(`/usuarios?id=${usuarioSelecionado.usuario_pk}`, formData);
      } else {
        await axios.post('/usuarios', formData);
      }

      setShowModal(false);
      carregarDados();
    } catch (error: any) {
      window.alert(error.response?.data?.error || 'Erro ao salvar usuário');
    }
  };

  const desativarUsuario = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja desativar este usuário?')) {
      return;
    }

    try {
      await axios.delete(`/usuarios?id=${id}`);
      carregarDados();
    } catch (error: any) {
      window.alert(error.response?.data?.error || 'Erro ao desativar usuário');
    }
  };

  const reativarUsuario = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja reativar este usuário?')) {
      return;
    }

    try {
      await axios.patch(`/usuarios?id=${id}`);
      carregarDados();
    } catch (error: any) {
      window.alert(error.response?.data?.error || 'Erro ao reativar usuário');
    }
  };

  const getBadgeColor = (perfilNome: string) => {
    switch (perfilNome) {
      case 'Admin':
        return 'bg-red-100 text-red-800';
      case 'Editor':
        return 'bg-blue-100 text-blue-800';
      case 'Visualizador':
        return 'bg-green-100 text-green-800';
      case 'Analista BI':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const agenciasSeguras = Array.isArray(agencias) ? agencias : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Usuários</h1>
          <p className="mt-2 text-gray-600">
            Adicione, edite ou desative usuários do sistema
          </p>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={filtroPerfil}
                onChange={(e) => setFiltroPerfil(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Todos os perfis</option>
                {perfis.map(perfil => (
                  <option key={perfil.perfil_pk} value={perfil.perfil_nome}>
                    {perfil.perfil_nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={abrirModalCriar}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              + Novo Usuário
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mostrarInativos}
                onChange={(e) => setMostrarInativos(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              Mostrar usuários inativos
            </label>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-orange-500 border-solid mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando usuários...</p>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum usuário encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Perfil
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agência
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usuarios.map((usuario) => (
                    <tr key={usuario.usuario_pk} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {usuario.usuario_nome}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {usuario.usuario_email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getBadgeColor(usuario.perfil_nome)}`}>
                          {usuario.perfil_nome}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {usuario.empresa_pk
                            ? agenciasSeguras.find(a => a.id_agencia === usuario.empresa_pk)?.nome_agencia || `ID ${usuario.empresa_pk}`
                            : <span className="text-gray-300">Be (interno)</span>
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          usuario.usuario_ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {usuario.usuario_ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {usuario.usuario_ativo ? (
                          <>
                            <button
                              onClick={() => abrirModalEditar(usuario)}
                              className="text-orange-600 hover:text-orange-900 mr-4"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => desativarUsuario(usuario.usuario_pk)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Desativar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => reativarUsuario(usuario.usuario_pk)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Reativar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {modoEdicao ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome_st}
                    onChange={(e) => setFormData({ ...formData, nome_st: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email_st}
                    onChange={(e) => setFormData({ ...formData, email_st: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone_st}
                    onChange={(e) => setFormData({ ...formData, telefone_st: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Perfil *
                  </label>
                  <select
                    required
                    value={formData.perfil_pk}
                    onChange={(e) => setFormData({ ...formData, perfil_pk: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Selecione um perfil</option>
                    {perfis.map(perfil => (
                      <option key={perfil.perfil_pk} value={perfil.perfil_pk}>
                        {perfil.perfil_nome} - {perfil.perfil_descricao}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agência
                  </label>
                  <select
                    value={formData.empresa_pk ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        empresa_pk: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Nenhuma (usuário interno Be)</option>
                    {agenciasSeguras.map((ag) => (
                      <option key={ag.id_agencia} value={ag.id_agencia}>
                        {ag.nome_agencia}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Vincule a uma agência para acesso externo
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {modoEdicao ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
