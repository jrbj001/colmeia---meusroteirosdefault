import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { usePermissions } from '../../../hooks';
import { Navbar } from '../../../components/Navbar';

interface Perfil {
  perfil_pk: number;
  perfil_nome: string;
  perfil_descricao: string;
  total_permissoes: number;
  total_leitura: number;
  total_escrita: number;
  total_usuarios: number;
}

interface Area {
  area_pk: number;
  codigo: string;
  nome: string;
  descricao: string;
  nivel: number;
  ordem: number;
  area_pai_nome: string | null;
  permissoes: {
    ler: boolean;
    escrever: boolean;
  };
}

export const AdminPerfis: React.FC = () => {
  const { isAdmin } = usePermissions();
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModalPermissoes, setShowModalPermissoes] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState<Perfil | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [permissoesEditadas, setPermissoesEditadas] = useState<Area[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarPerfis();
  }, []);

  const carregarPerfis = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/perfis');
      setPerfis(response.data.perfis || []);
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalPermissoes = async (perfil: Perfil) => {
    setPerfilSelecionado(perfil);
    setShowModalPermissoes(true);
    
    try {
      const response = await axios.get(`/perfis-permissoes?perfil_pk=${perfil.perfil_pk}`);
      setAreas(response.data.areas || []);
      setPermissoesEditadas(response.data.areas || []);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      alert('Erro ao carregar permissões do perfil');
    }
  };

  const togglePermissao = (areaIndex: number, tipo: 'ler' | 'escrever') => {
    const novasPermissoes = [...permissoesEditadas];
    novasPermissoes[areaIndex].permissoes[tipo] = !novasPermissoes[areaIndex].permissoes[tipo];
    
    // Se desmarcar "ler", desmarcar "escrever" também
    if (tipo === 'ler' && !novasPermissoes[areaIndex].permissoes.ler) {
      novasPermissoes[areaIndex].permissoes.escrever = false;
    }
    
    // Se marcar "escrever", marcar "ler" também
    if (tipo === 'escrever' && novasPermissoes[areaIndex].permissoes.escrever) {
      novasPermissoes[areaIndex].permissoes.ler = true;
    }
    
    setPermissoesEditadas(novasPermissoes);
  };

  const salvarPermissoes = async () => {
    if (!perfilSelecionado) return;

    setSalvando(true);
    try {
      // Preparar permissões para enviar à API
      const permissoesParaEnviar = permissoesEditadas
        .filter(area => area.permissoes.ler || area.permissoes.escrever)
        .map(area => ({
          area_pk: area.area_pk,
          ler: area.permissoes.ler,
          escrever: area.permissoes.escrever
        }));

      await axios.put(
        `/perfis-permissoes?perfil_pk=${perfilSelecionado.perfil_pk}`,
        { permissoes: permissoesParaEnviar }
      );

      alert('Permissões atualizadas com sucesso!');
      setShowModalPermissoes(false);
      carregarPerfis();
    } catch (error: any) {
      console.error('Erro ao salvar permissões:', error);
      alert(error.response?.data?.error || 'Erro ao salvar permissões');
    } finally {
      setSalvando(false);
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

  // Agrupar áreas por nível (principais e subáreas)
  const areasPrincipais = permissoesEditadas.filter(a => a.nivel === 1);
  const subareas = permissoesEditadas.filter(a => a.nivel === 2);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Perfis</h1>
          <p className="mt-2 text-gray-600">
            Visualize e edite as permissões de cada perfil
          </p>
        </div>

        {/* Lista de Perfis */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-orange-500 border-solid mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando perfis...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {perfis.map((perfil) => (
              <div key={perfil.perfil_pk} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{perfil.perfil_nome}</h3>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getBadgeColor(perfil.perfil_nome)}`}>
                        {perfil.total_usuarios} usuário(s)
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{perfil.perfil_descricao}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{perfil.total_permissoes}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{perfil.total_leitura}</div>
                    <div className="text-xs text-gray-500">Leitura</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{perfil.total_escrita}</div>
                    <div className="text-xs text-gray-500">Escrita</div>
                  </div>
                </div>

                <button
                  onClick={() => abrirModalPermissoes(perfil)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Editar Permissões
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Permissões */}
      {showModalPermissoes && perfilSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full my-8">
            <div className="p-6 border-b sticky top-0 bg-white rounded-t-lg">
              <h2 className="text-2xl font-bold text-gray-900">
                Permissões: {perfilSelecionado.perfil_nome}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {perfilSelecionado.perfil_descricao}
              </p>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {areasPrincipais.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Carregando áreas...
                </div>
              ) : (
                <div className="space-y-6">
                  {areasPrincipais.map((areaPrincipal) => {
                    const areaIndex = permissoesEditadas.findIndex(a => a.area_pk === areaPrincipal.area_pk);
                    const subAreasDaArea = subareas.filter(sub => sub.area_pai_nome === areaPrincipal.nome);

                    return (
                      <div key={areaPrincipal.area_pk} className="border rounded-lg p-4">
                        {/* Área Principal */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{areaPrincipal.nome}</h4>
                            <p className="text-sm text-gray-500">{areaPrincipal.descricao}</p>
                          </div>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={areaPrincipal.permissoes.ler}
                                onChange={() => togglePermissao(areaIndex, 'ler')}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-700">Ler</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={areaPrincipal.permissoes.escrever}
                                onChange={() => togglePermissao(areaIndex, 'escrever')}
                                className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                              />
                              <span className="text-sm font-medium text-gray-700">Escrever</span>
                            </label>
                          </div>
                        </div>

                        {/* Subáreas */}
                        {subAreasDaArea.length > 0 && (
                          <div className="pl-6 space-y-2 mt-3 border-l-2 border-gray-200">
                            {subAreasDaArea.map((subarea) => {
                              const subareaIndex = permissoesEditadas.findIndex(a => a.area_pk === subarea.area_pk);
                              return (
                                <div key={subarea.area_pk} className="flex items-center justify-between py-2">
                                  <div className="flex-1">
                                    <h5 className="text-sm font-medium text-gray-700">{subarea.nome}</h5>
                                    <p className="text-xs text-gray-500">{subarea.descricao}</p>
                                  </div>
                                  <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={subarea.permissoes.ler}
                                        onChange={() => togglePermissao(subareaIndex, 'ler')}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                      />
                                      <span className="text-xs font-medium text-gray-700">Ler</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={subarea.permissoes.escrever}
                                        onChange={() => togglePermissao(subareaIndex, 'escrever')}
                                        className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                      />
                                      <span className="text-xs font-medium text-gray-700">Escrever</span>
                                    </label>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-lg flex gap-3">
              <button
                onClick={() => setShowModalPermissoes(false)}
                disabled={salvando}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarPermissoes}
                disabled={salvando}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  'Salvar Permissões'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
