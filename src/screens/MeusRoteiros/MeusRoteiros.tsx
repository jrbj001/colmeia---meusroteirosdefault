import React, { useState, useEffect, useCallback } from "react";
import { Avatar } from "../../components/Avatar";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { ExitToApp } from "../../icons/ExitToApp";
import { StyleOutlined7 } from "../../icons/StyleOutlined7";
import { Difference4 } from "../../icons/Difference4";
import { Delete4 } from "../../icons/Delete4";
import { Search } from "../../icons/Search";
import { X } from "../../icons/X";
import { Pagination } from "./sections/Pagination";
import api from "../../config/axios";
import { TableSkeleton } from "./components/TableSkeleton";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { CheckCircle } from "../../icons/CheckCircle";
import { PinDrop } from "../../icons/PinDrop/PinDrop";
import { Link, useNavigate } from "react-router-dom";
import { useRoteirosRefresh } from "../../hooks/useRoteirosRefresh";
import { useDebounce } from "../../hooks/useDebounce";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal/ConfirmDeleteModal";

// Definir a interface dos dados da view
interface Roteiro {
  planoMidiaGrupo_pk: number;
  planoMidiaGrupo_st: string;
  planoMidiaDesc_st_concat: string;
  usuarioId_st: string;
  usuarioName_st: string;
  gender_st: string;
  class_st: string;
  age_st: string;
  ibgeCode_vl: number | null;
  planoMidiaType_st: string;
  cidadeUpper_st_concat: string;
  semanasMax_vl: number;
  date_dh: string;
  inProgress_bl: number;
  inProgress_st: string;
  active_bl: number;
  active_st: string;
  delete_bl: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

export const MeusRoteiros: React.FC = () => {
  const navigate = useNavigate();
  const [menuReduzido, setMenuReduzido] = useState(false);
  const [dados, setDados] = useState<Roteiro[]>([]);
  const [paginacao, setPaginacao] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 50
  });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    roteiro: Roteiro | null;
  }>({
    isOpen: false,
    roteiro: null
  });
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Aplicar debounce ao termo de busca (300ms)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Verificar se há roteiros em processamento
  const hasProcessing = dados.some(roteiro => roteiro.inProgress_bl === 1);

  // Hook de refresh automático
  useRoteirosRefresh({
    hasProcessing,
    onRefresh: () => {
      if (isSearching && debouncedSearchTerm) {
        buscarRoteiros(debouncedSearchTerm, paginacao.currentPage);
      } else {
        carregarDados(paginacao.currentPage);
      }
    },
    interval: 5000 // 5 segundos
  });

  // Handler para o campo de busca
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Limpa a busca
  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const carregarDados = async (pagina: number) => {
    try {
      setLoading(true);
      setErro(null);
      const response = await api.get(`/roteiros?page=${pagina}`);
      console.log('Resposta da API:', response.data);
      if (response.data && response.data.data) {
        setDados(response.data.data);
        setPaginacao(response.data.pagination);
      } else {
        setErro('Formato de resposta inválido da API');
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setErro(err.response?.data?.message || 'Erro ao carregar os dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const buscarRoteiros = async (termo: string, pagina: number) => {
    try {
      setLoading(true);
      setErro(null);
      setIsSearching(true);
      const response = await api.get(`/roteiros-search?q=${encodeURIComponent(termo)}&page=${pagina}`);
      console.log('Resposta da busca:', response.data);
      if (response.data && response.data.data) {
        setDados(response.data.data);
        setPaginacao(response.data.pagination);
      } else {
        setErro('Formato de resposta inválido da API');
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados:', err);
      setErro(err.response?.data?.message || 'Erro ao buscar os dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados(1);
  }, []);

  // Effect para busca com debounce
  useEffect(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.length >= 2) {
      buscarRoteiros(debouncedSearchTerm, 1);
    } else if (debouncedSearchTerm.length === 0 && isSearching) {
      // Voltou ao estado normal, recarregar dados
      setIsSearching(false);
      carregarDados(paginacao.currentPage);
    }
  }, [debouncedSearchTerm]);

  const handlePageChange = (novaPagina: number) => {
    if (isSearching && debouncedSearchTerm) {
      // Se está buscando, paginar nos resultados da busca
      buscarRoteiros(debouncedSearchTerm, novaPagina);
    } else {
      // Paginação normal
      carregarDados(novaPagina);
    }
  };

  const handleActionRestricted = (action: string) => {
    const message = `🚧 Funcionalidade em Desenvolvimento

A ação "${action}" ainda não está disponível.

Para solicitar acesso ou reportar problemas, entre em contato com o administrador do sistema.

Email: suporte@be180.com.br`;

    alert(message);
  };

  const handleVisualizarResultados = (roteiro: Roteiro) => {
    console.log('👁️ Visualizando resultados do roteiro:', roteiro);
    // Navegar para CriarRoteiro na Aba 6 com os dados do roteiro
    navigate('/criar-roteiro', { 
      state: { 
        modoVisualizacao: true,
        roteiroData: roteiro,
        abaInicial: 6
      } 
    });
  };

  const handleOpenDeleteModal = (roteiro: Roteiro) => {
    setDeleteModal({
      isOpen: true,
      roteiro
    });
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setDeleteModal({
        isOpen: false,
        roteiro: null
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.roteiro) return;

    try {
      setIsDeleting(true);
      setErro(null);

      const response = await api.post('/roteiros-delete', {
        pk: deleteModal.roteiro.planoMidiaGrupo_pk
      });

      if (response.data.success) {
        // Fechar modal
        setDeleteModal({
          isOpen: false,
          roteiro: null
        });

        // Recarregar dados da página atual
        if (isSearching && debouncedSearchTerm) {
          await buscarRoteiros(debouncedSearchTerm, paginacao.currentPage);
        } else {
          await carregarDados(paginacao.currentPage);
        }

        // Mostrar mensagem de sucesso (opcional - você pode criar um toast component)
        console.log('✅ Roteiro excluído com sucesso');
      }
    } catch (err: any) {
      console.error('❌ Erro ao deletar roteiro:', err);
      setErro(err.response?.data?.error || 'Erro ao excluir roteiro. Tente novamente.');
      // Fechar modal em caso de erro também
      setDeleteModal({
        isOpen: false,
        roteiro: null
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-white flex font-sans">
        <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
        <div
          className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? "left-20" : "left-64"}`}
        />
        <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? "ml-20" : "ml-64"} flex flex-col`}>
          <Topbar 
            menuReduzido={menuReduzido} 
            breadcrumb={{
              items: [
                { label: "Home", path: "/" },
                { label: "Meus roteiros", path: "/" }
              ]
            }}
          />
          <div
            className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`}
          />
          <div className="w-full overflow-x-auto pt-20 flex-1 overflow-auto">
            <div className="flex items-center justify-between pr-6 mb-2">
              <h1 className="text-lg font-bold text-[#222] tracking-wide uppercase font-sans mt-4 pl-6">
                Meus roteiros
              </h1>
              <div className="flex items-center gap-4 mt-4">
                {hasProcessing && (
                  <div className="flex items-center gap-2 text-xs text-[#FF9800]">
                    <div className="w-2 h-2 bg-[#FF9800] rounded-full animate-pulse"></div>
                    <span className="font-medium">Atualizando automaticamente</span>
                  </div>
                )}
                <div className="relative w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Buscar por nome do roteiro..."
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF9800] focus:border-transparent outline-none transition-all duration-200 text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-gray-100 rounded-full p-1 transition-colors duration-200"
                      title="Limpar busca"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isSearching && searchTerm && searchTerm.length >= 2 && (
              <div className="px-6 py-2 text-sm text-gray-600 mb-2">
                {paginacao.totalItems} resultado{paginacao.totalItems !== 1 ? 's' : ''} encontrado{paginacao.totalItems !== 1 ? 's' : ''} em todo o banco
                {paginacao.totalItems === 0 && (
                  <span className="ml-2 text-gray-500">- Tente outro termo de busca</span>
                )}
              </div>
            )}

            <div className="w-full">
              <table className="w-full border-separate border-spacing-0 font-sans">
                <thead>
                  <tr className="bg-[#393939] h-10">
                    <th
                      className="text-white text-xs font-bold uppercase text-left px-6 py-2 tracking-wider font-sans cursor-pointer hover:text-[#FF9800] transition-colors duration-200"
                      tabIndex={0}
                      role="button"
                    >
                      Nome
                    </th>
                    <th
                      className="text-white text-xs font-bold uppercase text-left px-6 py-2 tracking-wider font-sans cursor-pointer hover:text-[#FF9800] transition-colors duration-200"
                      tabIndex={0}
                      role="button"
                    >
                      Data de criação
                    </th>
                    <th
                      className="text-white text-xs font-bold uppercase text-left px-6 py-2 tracking-wider font-sans cursor-pointer hover:text-[#FF9800] transition-colors duration-200"
                      tabIndex={0}
                      role="button"
                    >
                      Status do roteiro
                    </th>
                    <th
                      className="text-white text-xs font-bold uppercase text-left px-6 py-2 tracking-wider font-sans cursor-pointer hover:text-[#FF9800] transition-colors duration-200"
                      tabIndex={0}
                      role="button"
                    >
                      Período da campanha
                    </th>
                    <th className="text-white text-xs font-bold uppercase text-right px-6 py-2 tracking-wider font-sans">&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton />
                  ) : erro ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-red-500">{erro}</td>
                    </tr>
                  ) : dados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4">
                        {isSearching ? "Nenhum roteiro encontrado com esse termo" : "Nenhum roteiro encontrado"}
                      </td>
                    </tr>
                  ) : (
                    dados.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`${idx % 2 === 0 ? "bg-[#f7f7f7]" : "bg-white"} hover:bg-[#ececec] transition-colors duration-200`}
                      >
                        <td className="text-[#222] text-sm font-normal px-6 py-4 whitespace-nowrap font-sans max-w-xs truncate">{item.planoMidiaGrupo_st}</td>
                        <td className="text-[#222] text-sm font-normal px-6 py-4 whitespace-nowrap font-sans">{formatarData(item.date_dh)}</td>
                        <td className="text-[#222] text-sm font-normal px-6 py-4 whitespace-nowrap font-sans">
                          {item.inProgress_bl === 1 ? (
                            <div className="flex items-center gap-2">
                              <LoadingSpinner size="sm" />
                              <span className="text-xs text-[#FF9800] font-medium">Processando</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CheckCircle size={16} color="#3a3a3a" />
                              <span className="text-[#3a3a3a] font-medium">Finalizado</span>
                            </div>
                          )}
                        </td>
                        <td className="text-[#222] text-sm font-normal px-6 py-4 whitespace-nowrap font-sans">{item.semanasMax_vl} {item.semanasMax_vl === 1 ? 'semana' : 'semanas'}</td>
                        <td className="text-[#222] text-xs px-6 py-4 whitespace-nowrap text-right flex items-center gap-4 justify-end font-sans">
                          <Link to={`/mapa?grupo=${item.planoMidiaGrupo_pk}`}>
                            <PinDrop
                              className="w-6 h-6 transition-transform duration-200 hover:scale-110 cursor-pointer text-[#3A3A3A] hover:text-[#FF9800]"
                            />
                          </Link>
                          <button
                            onClick={() => handleVisualizarResultados(item)}
                            className="transition-transform duration-200 hover:scale-110"
                            title="Visualizar resultados"
                          >
                            <Difference4 className="w-6 h-6 hover:text-[#FF9800] cursor-pointer text-[#3A3A3A]" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(item)}
                            className="transition-transform duration-200 hover:scale-110"
                            title="Excluir roteiro"
                          >
                            <Delete4 className="w-6 h-6 hover:text-red-600 cursor-pointer text-[#3A3A3A]" />
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
        <div className={`fixed bottom-0 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`}>
          <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
          <div className="w-full bg-white py-4 border-t border-[#e5e5e5] flex justify-center pointer-events-auto">
            <Pagination 
              currentPage={paginacao.currentPage} 
              totalPages={paginacao.totalPages} 
              onPageChange={handlePageChange} 
            />
          </div>
          <footer className="w-full border-t border-[#c1c1c1] p-4 text-center text-[10px] italic text-[#b0b0b0] tracking-wide bg-white z-10 font-sans pointer-events-auto relative">
            <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
            <div className="w-full h-[1px] bg-[#c1c1c1] absolute top-0 left-0" />
            © 2025 Colmeia. All rights are reserved to Be Mediatech OOH.
          </footer>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        roteiroNome={deleteModal.roteiro?.planoMidiaGrupo_st || ""}
        isDeleting={isDeleting}
      />
    </>
  );
};
