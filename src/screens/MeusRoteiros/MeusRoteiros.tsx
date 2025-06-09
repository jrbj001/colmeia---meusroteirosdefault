import React, { useState, useEffect } from "react";
import { Avatar } from "../../components/Avatar";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { ExitToApp } from "../../icons/ExitToApp";
import { StyleOutlined7 } from "../../icons/StyleOutlined7";
import { Difference4 } from "../../icons/Difference4";
import { Delete4 } from "../../icons/Delete4";
import { Pagination } from "./sections/Pagination";
import api from "../../config/axios";
import { LoadingColmeia } from "./components/LoadingColmeia";

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
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

export const MeusRoteiros: React.FC = () => {
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

  useEffect(() => {
    carregarDados(1);
  }, []);

  const handlePageChange = (novaPagina: number) => {
    carregarDados(novaPagina);
  };

  return (
    <>
      <div className="min-h-screen bg-white flex font-sans">
        <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
        <div
          className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? "left-20" : "left-64"}`}
        />
        <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? "ml-20" : "ml-64"} flex flex-col`}>
          <Topbar menuReduzido={menuReduzido} />
          <div
            className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`}
          />
          <div className="w-full overflow-x-auto pt-20 flex-1 overflow-auto">
            <h1 className="text-lg font-bold text-[#222] tracking-wide mb-4 uppercase font-sans mt-12 pl-6">
              Meus roteiros
            </h1>

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
                      Tipo de roteiro
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
                    <tr>
                      <td colSpan={5} className="py-16">
                        <LoadingColmeia />
                      </td>
                    </tr>
                  ) : erro ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-red-500">{erro}</td>
                    </tr>
                  ) : dados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4">Nenhum roteiro encontrado</td>
                    </tr>
                  ) : (
                    dados.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`${idx % 2 === 0 ? "bg-[#f7f7f7]" : "bg-white"} hover:bg-[#ececec] transition-colors duration-200`}
                      >
                        <td className="text-[#222] text-sm font-normal px-6 py-4 whitespace-nowrap font-sans max-w-xs truncate">{item.planoMidiaDesc_st_concat}</td>
                        <td className="text-[#222] text-sm font-normal px-6 py-4 whitespace-nowrap font-sans">{formatarData(item.date_dh)}</td>
                        <td className="text-[#222] text-sm font-normal px-6 py-4 whitespace-nowrap font-sans">{item.planoMidiaType_st}</td>
                        <td className="text-[#222] text-sm font-normal px-6 py-4 whitespace-nowrap font-sans">{item.semanasMax_vl} {item.semanasMax_vl === 1 ? 'semana' : 'semanas'}</td>
                        <td className="text-[#222] text-xs px-6 py-4 whitespace-nowrap text-right flex items-center gap-4 justify-end font-sans">
                          <StyleOutlined7 className="w-6 h-6 transition-transform duration-200 hover:scale-110 hover:text-[#FF9800] cursor-pointer text-[#3A3A3A]" />
                          <Difference4 className="w-6 h-6 transition-transform duration-200 hover:scale-110 hover:text-[#FF9800] cursor-pointer text-[#3A3A3A]" />
                          <Delete4 className="w-6 h-6 transition-transform duration-200 hover:scale-110 hover:text-[#FF9800] cursor-pointer text-[#3A3A3A]" />
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
    </>
  );
};
