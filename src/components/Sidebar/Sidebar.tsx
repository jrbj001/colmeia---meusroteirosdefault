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
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  menuReduzido: boolean;
  setMenuReduzido: (value: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ menuReduzido, setMenuReduzido }) => {
  const location = useLocation();
  const { isAdmin } = usePermissions();
  const { isAgencia, isExibidor } = useAuth();
  const [bancoAtivosAberto, setBancoAtivosAberto] = useState(false);
  const [exibidoresAberto, setExibidoresAberto] = useState(false);
  const [atualizarInventarioAberto, setAtualizarInventarioAberto] = useState(false);
  const [adminAberto, setAdminAberto] = useState(false);
  const [documentacaoAberto, setDocumentacaoAberto] = useState(false);

  // ── Matchers de rota por grupo (controlam highlight e auto-abertura) ──────
  const isBancoAtivo =
    location.pathname === '/banco-de-ativos' ||
    location.pathname.startsWith('/banco-de-ativos/relatorio-por-praca') ||
    location.pathname.startsWith('/banco-de-ativos/relatorio-por-exibidor');
  const isExibidoresAtivo =
    location.pathname.startsWith('/banco-de-ativos/cadastrar/exibidor') ||
    location.pathname.startsWith('/banco-de-ativos/exibidores') ||
    location.pathname.startsWith('/admin/inventarios-exibidor') ||
    location.pathname.startsWith('/admin/exibidores-dashboard');
  const isAdminAtivo =
    location.pathname.startsWith('/admin/usuarios') ||
    location.pathname.startsWith('/admin/perfis');
  const isDocsAtivo =
    location.pathname.startsWith('/admin/blueprint') ||
    location.pathname.startsWith('/admin/design-system') ||
    location.pathname.startsWith('/admin/mapa-do-produto');

  // Abrir o submenu correspondente automaticamente ao navegar
  useEffect(() => {
    if (isBancoAtivo) setBancoAtivosAberto(true);
    if (isExibidoresAtivo) setExibidoresAberto(true);
    if (isAdminAtivo) setAdminAberto(true);
    if (isDocsAtivo) setDocumentacaoAberto(true);

    const rotasAtualizarInventario = [
      '/exibidor/importar',
      '/exibidor/enviados',
      '/exibidor/excluir',
    ];
    if (rotasAtualizarInventario.some((rota) => location.pathname.startsWith(rota))) {
      setAtualizarInventarioAberto(true);
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
        {isExibidor ? (
          <>
            {/* Visão geral (Dashboard) */}
            <Link to="/exibidor/dashboard" className="block">
              <div className={`flex items-center gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
                location.pathname === '/exibidor/dashboard' ? 'bg-[#ededed] text-[#222]' : ''
              }`}>
                <svg className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10.75L12 3l9 7.75V20a1 1 0 01-1 1h-5.5a1 1 0 01-1-1v-4.5h-3V20a1 1 0 01-1 1H4a1 1 0 01-1-1v-9.25z" />
                </svg>
                {!menuReduzido && (
                  <span className="font-medium text-sm text-[#757575] tracking-[0.50px] group-hover:text-[#222] transition-colors duration-200">
                    Visão geral
                  </span>
                )}
              </div>
            </Link>

            {/* Meu inventário */}
            <Link to="/exibidor/inventario" className="block">
              <div className={`flex items-center gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
                location.pathname.startsWith('/exibidor/inventario') ? 'bg-[#ededed] text-[#222]' : ''
              }`}>
                <FindInPage className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" color="#757575" />
                {!menuReduzido && (
                  <span className="font-medium text-sm text-[#757575] tracking-[0.50px] group-hover:text-[#222] transition-colors duration-200">
                    Meu inventário
                  </span>
                )}
              </div>
            </Link>

            {/* Atualizar inventário (submenu) */}
            {!menuReduzido ? (
              <div className="w-full">
                <button
                  onClick={() => setAtualizarInventarioAberto(!atualizarInventarioAberto)}
                  className={`w-full flex items-center justify-between gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
                    ['/exibidor/importar', '/exibidor/enviados', '/exibidor/excluir'].some((r) => location.pathname.startsWith(r)) ? 'bg-[#ededed] text-[#222]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <AddBox className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" color="#757575" />
                    <span className="font-bold text-sm text-[#757575] group-hover:text-[#222] transition-colors duration-200">
                      Atualizar inventário
                    </span>
                  </div>
                  <KeyboardArrowDown
                    className={`w-5 h-5 transition-all duration-200 ${
                      atualizarInventarioAberto
                        ? 'transform rotate-180 text-[#222]'
                        : 'text-[#757575] group-hover:text-[#222]'
                    }`}
                  />
                </button>

                {atualizarInventarioAberto && (
                  <div className="ml-4 mt-2 space-y-0.5">
                    <Link to="/exibidor/importar" className="block">
                      <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                        location.pathname === '/exibidor/importar' ? 'text-[#ff4600] font-medium' : 'text-[#3a3a3a] hover:bg-[#ededed]'
                      }`}>
                        Importar nova base
                      </div>
                    </Link>
                    <Link to="/exibidor/excluir" className="block">
                      <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                        location.pathname === '/exibidor/excluir' ? 'text-[#ff4600] font-medium' : 'text-[#3a3a3a] hover:bg-[#ededed]'
                      }`}>
                        Excluir pontos enviados
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/exibidor/importar" className="block">
                <div className={`flex items-center gap-2.5 group hover:bg-[#ededed] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
                  ['/exibidor/importar', '/exibidor/excluir'].some((r) => location.pathname.startsWith(r)) ? 'bg-[#ededed] text-[#222]' : ''
                }`}>
                  <AddBox className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" color="#757575" />
                </div>
              </Link>
            )}

            {/* Solicitações */}
            <Link to="/exibidor/solicitacoes" className="block">
              <div className={`flex items-center gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
                location.pathname === '/exibidor/solicitacoes' ? 'bg-[#ededed] text-[#222]' : ''
              }`}>
                <PinDrop className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" />
                {!menuReduzido && (
                  <span className="font-medium text-sm text-[#757575] tracking-[0.50px] group-hover:text-[#222] transition-colors duration-200">
                    Solicitações
                  </span>
                )}
              </div>
            </Link>
          </>
        ) : (
          <>
        <Link to="/home-dashboard" className="block">
          <div className={`flex items-center gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
            location.pathname === "/" || location.pathname === "/home-dashboard" ? "bg-[#ededed] text-[#222]" : ""
          }`}>
            <svg className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10.75L12 3l9 7.75V20a1 1 0 01-1 1h-5.5a1 1 0 01-1-1v-4.5h-3V20a1 1 0 01-1 1H4a1 1 0 01-1-1v-9.25z" />
            </svg>
            {!menuReduzido && (
              <span className="font-medium text-sm text-[#757575] tracking-[0.50px] group-hover:text-[#222] transition-colors duration-200">
                Home
              </span>
            )}
          </div>
        </Link>

        <Link to="/meus-roteiros" className="block">
          <div className={`flex items-center gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
            location.pathname === "/meus-roteiros" ? "bg-[#ededed] text-[#222]" : ""
          }`}>
            <PinDrop className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" />
            {!menuReduzido && (
              <span className="font-medium text-sm text-[#757575] tracking-[0.50px] group-hover:text-[#222] transition-colors duration-200">
                Meus roteiros
              </span>
            )}
          </div>
        </Link>

        <Link to="/relatorio-p1a" className="block">
          <div className={`flex items-center gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
            location.pathname.startsWith("/relatorio-p1a") ? "bg-[#ededed] text-[#222]" : ""
          }`}>
            <svg className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6h13M9 5h13M3 5h2M3 11h2M3 17h2M9 11h6" />
            </svg>
            {!menuReduzido && (
              <span className="font-medium text-sm text-[#757575] tracking-[0.50px] group-hover:text-[#222] transition-colors duration-200">
                Relatório P1A
              </span>
            )}
          </div>
        </Link>

        {!isAgencia && (
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
        )}
        
        {/* Banco de ativos com submenu (oculto para agências) */}
        {isAgencia ? null : !menuReduzido ? (
          <div className="w-full">
            <button
              onClick={() => setBancoAtivosAberto(!bancoAtivosAberto)}
              className={`w-full flex items-center justify-between gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
                isBancoAtivo ? "bg-[#ededed] text-[#222]" : ""
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
              </div>
            )}
          </div>
        ) : (
          <Link to="/banco-de-ativos" className="block">
            <div className={`flex items-center gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
              isBancoAtivo ? "bg-[#ededed] text-[#222]" : ""
            }`}>
              <FindInPage className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" color="#757575" />
            </div>
          </Link>
        )}

        {/* Exibidores (submenu) — consolida cadastro, listagem e inventários recebidos */}
        {!isAgencia && !menuReduzido && (
          <div className="w-full">
            <button
              onClick={() => setExibidoresAberto(!exibidoresAberto)}
              className={`w-full flex items-center justify-between gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
                isExibidoresAtivo ? "bg-[#ededed] text-[#222]" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17.25V21m6-3.75V21m-9 0h12M4 4h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
                </svg>
                <span className="font-bold text-sm text-[#757575] group-hover:text-[#222] transition-colors duration-200">
                  Exibidores
                </span>
              </div>
              <KeyboardArrowDown
                className={`w-5 h-5 transition-all duration-200 ${
                  exibidoresAberto
                    ? "transform rotate-180 text-[#222]"
                    : "text-[#757575] group-hover:text-[#222]"
                }`}
              />
            </button>

            {exibidoresAberto && (
              <div className="ml-4 mt-2 space-y-0.5">
                {isAdmin && (
                  <Link to="/admin/exibidores-dashboard" className="block">
                    <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                      location.pathname.startsWith("/admin/exibidores-dashboard")
                        ? "text-[#ff4600] font-medium"
                        : "text-[#3a3a3a] hover:bg-[#ededed]"
                    }`}>
                      Dashboard
                    </div>
                  </Link>
                )}
                <Link to="/banco-de-ativos/cadastrar/exibidor" className="block">
                  <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                    location.pathname.startsWith("/banco-de-ativos/cadastrar/exibidor")
                      ? "text-[#ff4600] font-medium"
                      : "text-[#3a3a3a] hover:bg-[#ededed]"
                  }`}>
                    Gestão de exibidores
                  </div>
                </Link>
                <Link to="/banco-de-ativos/exibidores" className="block">
                  <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                    location.pathname === "/banco-de-ativos/exibidores"
                      ? "text-[#ff4600] font-medium"
                      : "text-[#3a3a3a] hover:bg-[#ededed]"
                  }`}>
                    Listar exibidores
                  </div>
                </Link>
                {isAdmin && (
                  <Link to="/admin/inventarios-exibidor" className="block">
                    <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                      location.pathname.startsWith("/admin/inventarios-exibidor")
                        ? "text-[#ff4600] font-medium"
                        : "text-[#3a3a3a] hover:bg-[#ededed]"
                    }`}>
                      Inventários recebidos
                    </div>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {!isAgencia && (
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
        )}

        {/* Administração - Apenas para Admin e não agência */}
        {isAdmin && !isAgencia && !menuReduzido && (
          <div className="w-full mt-8">
            <button
              onClick={() => setAdminAberto(!adminAberto)}
              className={`w-full flex items-center justify-between gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
                isAdminAtivo ? "bg-[#ededed] text-[#222]" : ""
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
                <Link to="/admin/pracas" className="block">
                  <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                    location.pathname.startsWith("/admin/pracas")
                      ? "text-[#ff4600] font-medium"
                      : "text-[#3a3a3a] hover:bg-[#ededed]"
                  }`}>
                    Praças canônicas
                  </div>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Documentação do sistema (submenu) — apenas admin e não agência */}
        {isAdmin && !isAgencia && !menuReduzido && (
          <div className="w-full">
            <button
              onClick={() => setDocumentacaoAberto(!documentacaoAberto)}
              className={`w-full flex items-center justify-between gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer ${
                isDocsAtivo ? "bg-[#ededed] text-[#222]" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="font-bold text-sm text-[#757575] group-hover:text-[#222] transition-colors duration-200">
                  Documentação do sistema
                </span>
              </div>
              <KeyboardArrowDown
                className={`w-5 h-5 transition-all duration-200 ${
                  documentacaoAberto
                    ? "transform rotate-180 text-[#222]"
                    : "text-[#757575] group-hover:text-[#222]"
                }`}
              />
            </button>

            {documentacaoAberto && (
              <div className="ml-4 mt-2 space-y-0.5">
                <Link to="/admin/blueprint" className="block">
                  <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                    location.pathname === "/admin/blueprint"
                      ? "text-[#ff4600] font-medium"
                      : "text-[#3a3a3a] hover:bg-[#ededed]"
                  }`}>
                    Blueprint / Diligência
                  </div>
                </Link>
                <Link to="/admin/design-system" className="block">
                  <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                    location.pathname === "/admin/design-system"
                      ? "text-[#ff4600] font-medium"
                      : "text-[#3a3a3a] hover:bg-[#ededed]"
                  }`}>
                    Design System
                  </div>
                </Link>
                <Link to="/admin/mapa-do-produto" className="block">
                  <div className={`px-2 py-1.5 rounded transition-colors duration-200 text-sm ${
                    location.pathname === "/admin/mapa-do-produto"
                      ? "text-[#ff4600] font-medium"
                      : "text-[#3a3a3a] hover:bg-[#ededed]"
                  }`}>
                    Mapa do produto
                  </div>
                </Link>
              </div>
            )}
          </div>
        )}
          </>
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