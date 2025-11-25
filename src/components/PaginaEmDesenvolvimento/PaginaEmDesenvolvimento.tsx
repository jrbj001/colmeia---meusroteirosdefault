import React, { useState } from "react";
import { Sidebar } from "../Sidebar/Sidebar";
import { Topbar } from "../Topbar/Topbar";

interface PaginaEmDesenvolvimentoProps {
  titulo: string;
  breadcrumbItems: Array<{ label: string; path?: string }>;
}

export const PaginaEmDesenvolvimento: React.FC<PaginaEmDesenvolvimentoProps> = ({ 
  titulo, 
  breadcrumbItems 
}) => {
  const [menuReduzido, setMenuReduzido] = useState(false);

  return (
    <div className="min-h-screen bg-white flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? "left-20" : "left-64"}`} />
      <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? "ml-20" : "ml-64"} flex flex-col`}>
        <Topbar 
          menuReduzido={menuReduzido} 
          breadcrumb={{
            items: breadcrumbItems
          }}
        />
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`} />
        
        <div className="flex-1 pt-24 pb-32 px-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <h1 className="text-3xl font-bold text-[#ff4600] mb-4 uppercase tracking-wide">
                {titulo}
              </h1>
              <p className="text-xl text-[#3a3a3a] mb-2">
                Página em desenvolvimento
              </p>
              <p className="text-base text-[#666]">
                Esta funcionalidade estará disponível em breve.
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer padrão */}
        <div className={`fixed bottom-0 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`}>
          <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
          <footer className="w-full border-t border-[#c1c1c1] p-4 text-center text-[10px] italic text-[#b0b0b0] tracking-wide bg-white z-10 font-sans pointer-events-auto relative">
            <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
            <div className="w-full h-[1px] bg-[#c1c1c1] absolute top-0 left-0" />
            © 2025 Colmeia. All rights are reserved to Be Mediatech OOH.
          </footer>
        </div>
      </div>
    </div>
  );
};

