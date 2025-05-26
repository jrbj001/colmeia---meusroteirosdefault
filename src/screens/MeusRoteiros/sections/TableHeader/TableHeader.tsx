import React from "react";

export const TableHeader = (): JSX.Element => {
  return (
    <div className="absolute w-[1258px] h-7 top-[189px] left-[262px]">
      <div className="relative w-[1250px] h-7 bg-[#3a3a3a]">
        <div className="absolute top-2 left-[625px] [font-family:'Neue_Montreal-Bold',Helvetica] font-bold text-white text-[10px] tracking-[0.50px] leading-[12.0px] whitespace-nowrap">
          DATA DE CRIAÇÃO
        </div>

        <div className="absolute top-2 left-[746px] [font-family:'Neue_Montreal-Bold',Helvetica] font-bold text-white text-[10px] tracking-[0.50px] leading-[12.0px] whitespace-nowrap">
          TIPO DE ROTEIRO
        </div>

        <div className="absolute top-2 left-[867px] [font-family:'Neue_Montreal-Bold',Helvetica] font-bold text-white text-[10px] tracking-[0.50px] leading-[12.0px] whitespace-nowrap">
          PERÍODO DA CAMPANHA
        </div>

        <div className="absolute top-2 left-[68px] [font-family:'Neue_Montreal-Bold',Helvetica] font-bold text-white text-[10px] tracking-[0.50px] leading-[12.0px] whitespace-nowrap">
          NOME
        </div>
      </div>
    </div>
  );
};
