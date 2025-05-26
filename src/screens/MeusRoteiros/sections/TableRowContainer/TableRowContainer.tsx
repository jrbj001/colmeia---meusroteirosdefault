import React from "react";
import { Delete4 } from "../../../../icons/Delete4";
import { Difference4 } from "../../../../icons/Difference4";
import { StyleOutlined7 } from "../../../../icons/StyleOutlined7";

export const TableRowContainer = (): JSX.Element => {
  return (
    <div className="absolute w-[1258px] h-[70px] top-[357px] left-[262px]">
      <div className="relative w-[1250px] h-[70px] bg-[#f8f8f8]">
        <div className="absolute top-7 left-[68px] [font-family:'Neue_Montreal-Regular',Helvetica] font-normal text-[#3a3a3a] text-xs tracking-[0.50px] leading-[14.4px] whitespace-nowrap">
          J2356_DM9_IFOOD_PASCOA_2025
        </div>

        <div className="left-[625px] absolute top-7 [font-family:'Neue_Montreal-Regular',Helvetica] font-normal text-[#3a3a3a] text-xs tracking-[0.50px] leading-[14.4px] whitespace-nowrap">
          30/03/25
        </div>

        <div className="absolute top-7 left-[746px] [font-family:'Neue_Montreal-Regular',Helvetica] font-normal text-[#3a3a3a] text-xs tracking-[0.50px] leading-[14.4px] whitespace-nowrap">
          FINAL
        </div>

        <div className="left-[867px] absolute top-7 [font-family:'Neue_Montreal-Regular',Helvetica] font-normal text-[#3a3a3a] text-xs tracking-[0.50px] leading-[14.4px] whitespace-nowrap">
          6 SEMANAS
        </div>

        <div className="inline-flex items-center justify-end gap-[23px] absolute top-[23px] left-[1092px]">
          <StyleOutlined7 className="!relative !w-6 !h-6" color="#3A3A3A" />
          <Difference4 className="!relative !w-6 !h-6" color="#3A3A3A" />
          <Delete4 className="!relative !w-6 !h-6" color="#3A3A3A" />
        </div>
      </div>
    </div>
  );
};
