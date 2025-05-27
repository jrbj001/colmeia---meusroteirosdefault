import React from "react";

export const TableHeader = (): JSX.Element => {
  return (
    <div className="w-full h-7">
      <div className="relative w-full h-7 bg-[#3a3a3a]">
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 [font-family:'Neue_Montreal-Bold',Helvetica] font-bold text-white text-[10px] tracking-[0.50px] leading-[12.0px] whitespace-nowrap">
          DATA DE CRIAÇÃO
        </div>
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 [font-family:'Neue_Montreal-Bold',Helvetica] font-bold text-white text-[10px] tracking-[0.50px] leading-[12.0px] whitespace-nowrap">
          TIPO DE ROTEIRO
        </div>
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 [font-family:'Neue_Montreal-Bold',Helvetica] font-bold text-white text-[10px] tracking-[0.50px] leading-[12.0px] whitespace-nowrap">
          PERÍODO DA CAMPANHA
        </div>
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 [font-family:'Neue_Montreal-Bold',Helvetica] font-bold text-white text-[10px] tracking-[0.50px] leading-[12.0px] whitespace-nowrap">
          NOME
        </div>
      </div>
    </div>
  );
};
