import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "../Logo";
import { AddBox } from "../../icons/AddBox";
import { ArrowForwardIos } from "../../icons/ArrowForwardIos";
import { FindInPage } from "../../icons/FindInPage";
import { PinDrop } from "../../icons/PinDrop";
import { Difference4 } from "../../icons/Difference4";
import { KeyboardArrowDown } from "../../icons/KeyboardArrowDown";
import { usePermissions } from "../../hooks";

interface SidebarProps {
  menuReduzido: boolean;
  setMenuReduzido: (value: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ menuReduzido, setMenuReduzido }) => {
  const location = useLocation();
  const { isAdmin } = usePermissions();
  const [bancoAtivosAberto, setBancoAtivosAberto] = useState(false);
  const [adminAberto, setAdminAberto] = useState(false);
  
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

    // Abrir submenu de admin automaticamente
    const rotasAdmin = ['/admin/usuarios', '/admin/perfis'];
    if (rotasAdmin.some(rota => location.pathname.startsWith(rota))) {
      setAdminAberto(true);
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
        {/* Call to Action - Administração (visível para todos) */}
        {!menuReduzido && (
          <Link to="/admin/usuarios" className="block mb-6">
            <div className="bg-gradient-to-r from-[#ff4600] to-[#ff6b35] rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-white font-bold text-base">
                  Administração
                </span>
              </div>
              <p className="text-white text-xs opacity-90">
                Gerencie usuários e permissões
              </p>
            </div>
          </Link>
        )}

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

        {/* Administração - Apenas para Admin */}
        {isAdmin && !menuReduzido && (
          <div className="w-full mt-8">
            <button
              onClick={() => setAdminAberto(!adminAberto)}
              className={`w-full flex items-center justify-between gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
                location.pathname.startsWith("/admin") ? "bg-[#ededed] text-[#222]" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-bold text-sm text-[#757575] group-hover:text-[#222] transition-colors duration-200">
                  Administração
                </span>
              </div>
              <KeyboardArrowDown
                className={`w-5 h-5 transition-all duration-200 ${
                  adminAberto 
                    ? "transform rotate-180 text-[#222]" 
                    : "text-[#757575] group-hover:text-[#222]"
                }`}
              />
            </button>
            
            {/* Submenu Admin */}
            {adminAberto && (
              <div className="ml-4 mt-2 space-y-0.5">
                <Link to="/admin/usuarios" className="block">
                  <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                    location.pathname === "/admin/usuarios"
                      ? "text-[#ff4600] font-medium"
                      : "text-[#3a3a3a] hover:bg-[#ededed]"
                  }`}>
                    Gerenciar Usuários
                  </div>
                </Link>
                <Link to="/admin/perfis" className="block">
                  <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                    location.pathname === "/admin/perfis"
                      ? "text-[#ff4600] font-medium"
                      : "text-[#3a3a3a] hover:bg-[#ededed]"
                  }`}>
                    Gerenciar Perfis
                  </div>
                </Link>
              </div>
            )}
          </div>
        )}
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