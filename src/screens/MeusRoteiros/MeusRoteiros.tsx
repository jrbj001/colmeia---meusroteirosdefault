import React, { useState } from "react";
import { Avatar } from "../../components/Avatar";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { ExitToApp } from "../../icons/ExitToApp";
import { StyleOutlined7 } from "../../icons/StyleOutlined7";
import { Difference4 } from "../../icons/Difference4";
import { Delete4 } from "../../icons/Delete4";
import { Pagination } from "./sections/Pagination";

const dados = [
  {
    nome: "J2448_DM9_IFOOD_CARNAVAL_2025",
    data: "12/01/25",
    tipo: "SIMULADO",
    periodo: "4 SEMANAS",
  },
  {
    nome: "J2356_DM9_IFOOD_PASCOA_2025",
    data: "20/02/25",
    tipo: "FINAL",
    periodo: "12 SEMANAS",
  },
  {
    nome: "J2356_DM9_IFOOD_PASCOA_2025",
    data: "30/03/25",
    tipo: "FINAL",
    periodo: "6 SEMANAS",
  },
  {
    nome: "J1867_GUT_AVON_DIADASMAES_2025",
    data: "11/04/25",
    tipo: "SIMULADO",
    periodo: "2 SEMANAS",
  },
  {
    nome: "J0987_GUT_NATURA_DIADOSNAMORADOS_2025",
    data: "09/05/25",
    tipo: "SIMULADO",
    periodo: "5 SEMANAS",
  },
];

export const MeusRoteiros: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-white flex font-sans">
        <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
        <div
          className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? "left-20" : "left-64"}`}
        />
        <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? "ml-20" : "ml-64"}`}>
          <Topbar menuReduzido={menuReduzido} />
          <div
            className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`}
          />
          <div className="w-full overflow-x-auto pt-20">
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
                  {dados.map((item, idx) => (
                    <tr
                      key={idx}
                      className={`${idx % 2 === 0 ? "bg-[#f7f7f7]" : "bg-white"} hover:bg-[#ececec] transition-colors duration-200`}
                    >
                      <td className="text-[#222] text-sm font-normal px-6 py-4 whitespace-nowrap font-sans">{item.nome}</td>
                      <td className="text-[#222] text-sm font-normal px-6 py-4 whitespace-nowrap font-sans">{item.data}</td>
                      <td className="text-[#222] text-sm font-normal px-6 py-4 whitespace-nowrap font-sans">{item.tipo}</td>
                      <td className="text-[#222] text-sm font-normal px-6 py-4 whitespace-nowrap font-sans">{item.periodo}</td>
                      <td className="text-[#222] text-xs px-6 py-4 whitespace-nowrap text-right flex items-center gap-4 justify-end font-sans">
                        <StyleOutlined7 className="w-6 h-6 transition-transform duration-200 hover:scale-110 hover:text-[#FF9800] cursor-pointer text-[#3A3A3A]" />
                        <Difference4 className="w-6 h-6 transition-transform duration-200 hover:scale-110 hover:text-[#FF9800] cursor-pointer text-[#3A3A3A]" />
                        <Delete4 className="w-6 h-6 transition-transform duration-200 hover:scale-110 hover:text-[#FF9800] cursor-pointer text-[#3A3A3A]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`fixed z-20 bg-white py-4 border-t border-[#e5e5e5] flex justify-center transition-all duration-300 ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`}
        style={{ bottom: '56px' }}
      >
        <Pagination currentPage={1} totalPages={10} onPageChange={() => {}} />
      </div>
      <footer className="w-full border-t border-[#c1c1c1] p-4 text-center text-[10px] italic text-[#b0b0b0] tracking-wide fixed bottom-0 left-0 bg-white z-10 font-sans">
        <div className="w-full h-[1px] bg-[#c1c1c1] absolute top-0 left-0" />
        © 2025 Colmeia. All rights are reserved to Be Mediatech OOH.
      </footer>
    </>
  );
};
