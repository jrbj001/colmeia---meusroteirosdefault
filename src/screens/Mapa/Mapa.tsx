import React from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { Pagination } from "../MeusRoteiros/sections/Pagination";

export const Mapa: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = React.useState(false);

  return (
    <div className="min-h-screen bg-white flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? "left-20" : "left-64"}`} />
      <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? "ml-20" : "ml-64"} flex flex-col`}>
        <Topbar menuReduzido={menuReduzido} />
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`} />
        <div className="w-full overflow-x-auto pt-20 flex-1 overflow-auto">
          <h1 className="text-lg font-bold text-[#222] tracking-wide mb-4 uppercase font-sans mt-12 pl-6">
            Meus roteiros
          </h1>
          <div className="w-full flex flex-row gap-8 mt-8 px-8 flex-1 min-h-[500px]" style={{height: 'calc(100vh - 220px)'}}>
            {/* Coluna dos filtros */}
            <div className="flex flex-col flex-1 max-w-[420px] justify-start">
              <table className="w-full border-separate border-spacing-0 font-sans mb-6">
                <thead>
                  <tr className="bg-[#393939] h-10">
                    <th className="text-white text-xs font-bold uppercase text-left px-6 py-2 tracking-wider font-sans">Nome</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-[#222] text-sm font-bold px-6 py-4 whitespace-nowrap font-sans border-b border-[#c1c1c1]">
                      J2448_DM9_IFOOD_CARNAVAL_2025 <span className="ml-2">→</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mb-6 text-[#222] text-base">Selecione a praça e a semana do roteiro para visualizar o mapa em html.</p>
              <div className="mb-4">
                <label className="block text-[#222] mb-2 font-semibold">Praça</label>
                <select className="w-full border border-[#c1c1c1] rounded px-4 py-2 text-[#b0b0b0] bg-[#f7f7f7] text-base" disabled>
                  <option>Ex.: São Paulo</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-[#222] mb-2 font-semibold">Semana</label>
                <select className="w-full border border-[#c1c1c1] rounded px-4 py-2 text-[#b0b0b0] bg-[#f7f7f7] text-base" disabled>
                  <option>Ex.: São Paulo</option>
                </select>
              </div>
              <button className="w-full bg-[#b0b0b0] text-white font-semibold py-2 rounded cursor-not-allowed text-base" disabled>Gerar mapa</button>
            </div>
            {/* Coluna do mapa */}
            <div className="flex-1 flex items-stretch justify-end">
              <div className="w-full h-full bg-[#ececec] rounded-lg flex items-end justify-end relative overflow-hidden" style={{minHeight: 0}}>
                {/* Placeholder do mapa */}
                <button className="absolute bottom-4 right-4 bg-[#b0b0b0] text-white font-semibold py-2 px-4 rounded cursor-not-allowed opacity-80 text-base" disabled>Download mapa html</button>
              </div>
            </div>
          </div>
        </div>
        <div className={`fixed bottom-0 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`}>
          <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
          <div className="w-full bg-white py-4 border-t border-[#e5e5e5] flex justify-center pointer-events-auto">
            <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />
          </div>
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