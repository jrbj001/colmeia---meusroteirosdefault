import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "../Logo";
import { AddBox } from "../../icons/AddBox";
import { ArrowForwardIos } from "../../icons/ArrowForwardIos";
import { FindInPage } from "../../icons/FindInPage";
import { PinDrop } from "../../icons/PinDrop";
import { Difference4 } from "../../icons/Difference4";
import { KeyboardArrowDown } from "../../icons/KeyboardArrowDown";

interface SidebarProps {
  menuReduzido: boolean;
  setMenuReduzido: (value: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ menuReduzido, setMenuReduzido }) => {
  const location = useLocation();
  const [bancoAtivosAberto, setBancoAtivosAberto] = useState(false);
  
  // Verificar se estamos em alguma rota do banco de ativos para abrir o submenu automaticamente
  useEffect(() => {
    const rotasBancoAtivos = [
      '/banco-de-ativos',
      '/banco-de-ativos/relatorio-por-praca',
      '/banco-de-ativos/relatorio-por-exibidor',
      '/banco-de-ativos/cadastrar/grupo-midia',
      '/banco-de-ativos/cadastrar/tipo-midia',
      '/banco-de-ativos/cadastrar/exibidor',
      '/banco-de-ativos/importar/arquivo'
    ];
    
    if (rotasBancoAtivos.some(rota => location.pathname.startsWith(rota))) {
      setBancoAtivosAberto(true);
    }
  }, [location.pathname]);
  
  return (
    <div
      className={`fixed top-0 left-0 bg-[#f8f8f8] border-r border-[#c1c1c1] p-4 transition-all duration-300
        ${menuReduzido ? "w-20" : "w-64"}
        flex flex-col items-center md:items-start h-screen z-20`}
    >
      <div className={`flex items-center gap-2.5 mb-8 w-full justify-center md:justify-start`}>
        <Logo className={menuReduzido ? "mx-auto mt-2 mb-12" : "mt-2 mb-12"} short={menuReduzido} />
      </div>

      <nav className={`space-y-4 w-full ${menuReduzido ? "flex flex-col items-center" : ""}`}>
        <Link to="/" className="block">
          <div className={`flex items-center gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
            location.pathname === "/" ? "bg-[#ededed] text-[#222]" : ""
          }`}>
            <PinDrop className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" />
            {!menuReduzido && (
              <span className="font-medium text-sm text-[#757575] tracking-[0.50px] group-hover:text-[#222] transition-colors duration-200 underline">
                Meus roteiros
              </span>
            )}
          </div>
        </Link>
        
        <Link to="/criar-roteiro" className="block">
          <div className={`flex items-center gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
            location.pathname === "/criar-roteiro" ? "bg-[#ededed] text-[#222]" : ""
          }`}>
            <AddBox className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" color="#757575" />
            {!menuReduzido && (
              <span className="font-medium text-sm text-[#757575] tracking-[0.50px] group-hover:text-[#222] transition-colors duration-200">
                Criar roteiro
              </span>
            )}
          </div>
        </Link>
        
        {/* Banco de ativos com submenu */}
        {!menuReduzido ? (
          <div className="w-full">
            <button
              onClick={() => setBancoAtivosAberto(!bancoAtivosAberto)}
              className={`w-full flex items-center justify-between gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
                location.pathname.startsWith("/banco-de-ativos") ? "bg-[#ededed] text-[#222]" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FindInPage className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" color="#757575" />
                <span className="font-bold text-sm text-[#757575] group-hover:text-[#222] transition-colors duration-200">
                  Banco de ativos
                </span>
              </div>
              <KeyboardArrowDown
                className={`w-5 h-5 transition-all duration-200 ${
                  bancoAtivosAberto 
                    ? "transform rotate-180 text-[#222]" 
                    : "text-[#757575] group-hover:text-[#222]"
                }`}
              />
            </button>
            
            {/* Submenu */}
            {bancoAtivosAberto && (
              <div className="ml-4 mt-2 space-y-4">
                {/* Dashboard */}
                <div>
                  <Link to="/banco-de-ativos" className="block">
                    <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                      location.pathname === "/banco-de-ativos"
                        ? "text-[#ff4600] font-medium"
                        : "text-[#3a3a3a] hover:bg-[#ededed]"
                    }`}>
                      Dashboard
                    </div>
                  </Link>
                </div>

                {/* RELATÓRIOS */}
                <div>
                  <div className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-2 px-2">
                    RELATÓRIOS
                  </div>
                  <div className="space-y-0.5">
                    <Link to="/banco-de-ativos/relatorio-por-praca" className="block">
                      <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                        location.pathname === "/banco-de-ativos/relatorio-por-praca"
                          ? "text-[#ff4600] font-medium"
                          : "text-[#3a3a3a] hover:bg-[#ededed]"
                      }`}>
                        Por praça
                      </div>
                    </Link>
                    <Link to="/banco-de-ativos/relatorio-por-exibidor" className="block">
                      <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                        location.pathname === "/banco-de-ativos/relatorio-por-exibidor"
                          ? "text-[#ff4600] font-medium"
                          : "text-[#3a3a3a] hover:bg-[#ededed]"
                      }`}>
                        Por exibidor
                      </div>
                    </Link>
                  </div>
                </div>

                {/* CADASTRAR */}
                <div>
                  <div className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-2 px-2">
                    CADASTRAR
                  </div>
                  <div className="space-y-0.5">
                    <Link to="/banco-de-ativos/cadastrar/grupo-midia" className="block">
                      <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                        location.pathname === "/banco-de-ativos/cadastrar/grupo-midia"
                          ? "text-[#ff4600] font-medium"
                          : "text-[#3a3a3a] hover:bg-[#ededed]"
                      }`}>
                        Grupo de mídia
                      </div>
                    </Link>
                    <Link to="/banco-de-ativos/cadastrar/tipo-midia" className="block">
                      <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                        location.pathname === "/banco-de-ativos/cadastrar/tipo-midia"
                          ? "text-[#ff4600] font-medium"
                          : "text-[#3a3a3a] hover:bg-[#ededed]"
                      }`}>
                        Tipo de mídia
                      </div>
                    </Link>
                    <Link to="/banco-de-ativos/cadastrar/exibidor" className="block">
                      <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                        location.pathname === "/banco-de-ativos/cadastrar/exibidor"
                          ? "text-[#ff4600] font-medium"
                          : "text-[#3a3a3a] hover:bg-[#ededed]"
                      }`}>
                        Exibidor
                      </div>
                    </Link>
                  </div>
                </div>

                {/* IMPORTAR */}
                <div>
                  <div className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-2 px-2">
                    IMPORTAR
                  </div>
                  <div className="space-y-0.5">
                    <Link to="/banco-de-ativos/importar/arquivo" className="block">
                      <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                        location.pathname === "/banco-de-ativos/importar/arquivo"
                          ? "text-[#ff4600] font-medium"
                          : "text-[#3a3a3a] hover:bg-[#ededed]"
                      }`}>
                        Importar arquivo
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link to="/banco-de-ativos" className="block">
            <div className={`flex items-center gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
              location.pathname.startsWith("/banco-de-ativos") ? "bg-[#ededed] text-[#222]" : ""
            }`}>
              <FindInPage className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" color="#757575" />
            </div>
          </Link>
        )}

        <Link to="/consulta-endereco" className="block">
          <div className={`flex items-center gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
            location.pathname === "/consulta-endereco" ? "bg-[#ededed] text-[#222]" : ""
          }`}>
            <Difference4 className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" color="#757575" />
            {!menuReduzido && (
              <span className="font-medium text-sm text-[#757575] tracking-[0.50px] group-hover:text-[#222] transition-colors duration-200">
                Consulta endereço
              </span>
            )}
          </div>
        </Link>
      </nav>

      <div className="absolute bottom-16 left-0 w-full flex items-center justify-center">
        <button
          onClick={() => setMenuReduzido(!menuReduzido)}
          className="flex items-center gap-2 text-sm text-[#757575] tracking-[0.50px] focus:outline-none border-none shadow-none bg-transparent hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer"
        >
          {menuReduzido ? "Ver mais" : "Ver menos"}
          <ArrowForwardIos
            className={`w-5 h-5 transform transition-transform duration-300 ${menuReduzido ? "rotate-180" : ""} group-hover:text-[#222] text-[#757575]`}
          />
        </button>
      </div>
    </div>
  );
}; 