import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "../Logo";
import { AddBox } from "../../icons/AddBox";
import { ArrowForwardIos } from "../../icons/ArrowForwardIos";
import { FindInPage } from "../../icons/FindInPage";
import { PinDrop } from "../../icons/PinDrop";

interface SidebarProps {
  menuReduzido: boolean;
  setMenuReduzido: (value: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ menuReduzido, setMenuReduzido }) => {
  const location = useLocation();
  
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
        
        <div className="flex items-center gap-2.5 group hover:bg-[#ededed] hover:text-[#222] rounded-lg px-2 py-1 transition-colors duration-200 cursor-pointer">
          <FindInPage className="w-5 h-5 text-[#757575] group-hover:text-[#222] transition-colors duration-200" color="#757575" />
          {!menuReduzido && (
            <span className="font-medium text-sm text-[#757575] tracking-[0.50px] group-hover:text-[#222] transition-colors duration-200">
              Banco de ativos
            </span>
          )}
        </div>
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