import React from "react";
import { Avatar } from "../../components/Avatar";
import { AddBox } from "../../icons/AddBox";
import { ArrowForwardIos } from "../../icons/ArrowForwardIos";
import { ExitToApp } from "../../icons/ExitToApp";
import { FindInPage } from "../../icons/FindInPage";
import { PinDrop } from "../../icons/PinDrop";
import { DivWrapper } from "./sections/DivWrapper";
import { NavbarWrapper } from "./sections/NavbarWrapper";
import { Pagination } from "./sections/Pagination";
import { Row } from "./sections/Row";
import { TableHeader } from "./sections/TableHeader";
import { TableRowContainer } from "./sections/TableRowContainer";
import { TableRowContainerWrapper } from "./sections/TableRowContainerWrapper";

export const MeusRoteiros = (): JSX.Element => {
  return (
    <div
      className="bg-white flex flex-row justify-center w-full"
      data-model-id="452:1011"
    >
      <div className="bg-white overflow-hidden w-[1512px] h-[982px] relative">
        <div className="absolute w-[1250px] h-[100px] top-0 left-[262px] bg-white border-b [border-bottom-style:solid] border-[#c1c1c1]">
          <div className="inline-flex items-center gap-[30px] absolute top-[29px] left-[1108px]">
            <Avatar
              className="!relative"
              shape="circle"
              size="large"
              type="image"
            />
            <ExitToApp className="!relative !w-6 !h-6" color="#3A3A3A" />
          </div>

          <div className="absolute top-[41px] left-[67px] [font-family:'Neue_Montreal-Regular',Helvetica] font-normal text-[#3a3a3a] text-xs tracking-[0.50px] leading-[14.4px] whitespace-nowrap">
            Home / Meus roteiros
          </div>
        </div>

        <div className="absolute w-[1250px] h-[53px] top-[929px] left-[262px]">
          <div className="absolute w-[1250px] h-[53px] top-0 left-0 bg-white border-b [border-bottom-style:solid] border-[#c1c1c1] rotate-[-180.00deg]" />

          <p className="absolute top-[19px] left-[68px] [font-family:'Neue_Montreal-Italic',Helvetica] font-normal italic text-[#3a3a3a] text-[10px] tracking-[0.50px] leading-[12.0px] whitespace-nowrap">
            © 2025 Colmeia. All rights are reserved to Be Mediatech OOH.
          </p>
        </div>

        <div className="absolute w-[262px] h-[982px] top-0 left-0 bg-[#f8f8f8] border-r [border-right-style:solid] border-[#c1c1c1]">
          <div className="inline-flex items-center gap-2.5 absolute top-[37px] left-9">
            <img
              className="relative w-px h-5 object-cover"
              alt="Div"
              src="https://c.animaapp.com/SfpADyEM/img/div.svg"
            />

            <img
              className="relative w-[79px] h-5"
              alt="Be mediatech ooh"
              src="https://c.animaapp.com/SfpADyEM/img/be-mediatech-ooh-1.svg"
            />
          </div>

          <div className="inline-flex items-center gap-2.5 absolute top-[141px] left-9">
            <PinDrop className="!relative !w-5 !h-5" color="#3A3A3A" />
            <div className="inline-flex items-center gap-[5px] relative flex-[0_0_auto]">
              <div className="relative w-fit mt-[-1.00px] [font-family:'Neue_Montreal-Medium',Helvetica] font-medium text-[#3a3a3a] text-sm tracking-[0.50px] leading-[16.8px] underline whitespace-nowrap">
                Meus roteiros
              </div>
            </div>
          </div>

          <div className="top-[181px] inline-flex items-center gap-2.5 absolute left-9">
            <AddBox className="!relative !w-5 !h-5" color="#3A3A3A" />
            <div className="inline-flex items-center gap-[5px] relative flex-[0_0_auto]">
              <div className="relative w-fit mt-[-1.00px] [font-family:'Neue_Montreal-Medium',Helvetica] font-medium text-[#3a3a3a] text-sm tracking-[0.50px] leading-[16.8px] whitespace-nowrap">
                Criar roteiro
              </div>
            </div>
          </div>

          <div className="top-[221px] inline-flex items-center gap-2.5 absolute left-9">
            <FindInPage className="!relative !w-5 !h-5" color="#3A3A3A" />
            <div className="inline-flex items-center gap-[5px] relative flex-[0_0_auto]">
              <div className="relative w-fit mt-[-1.00px] [font-family:'Neue_Montreal-Medium',Helvetica] font-medium text-[#3a3a3a] text-sm tracking-[0.50px] leading-[16.8px] whitespace-nowrap">
                Banco de ativos
              </div>
            </div>
          </div>

          <div className="inline-flex items-start justify-end gap-5 absolute top-[877px] left-[41px]">
            <div className="relative w-fit mt-[-1.00px] [font-family:'Neue_Montreal-Regular',Helvetica] font-normal text-[#3a3a3a] text-sm tracking-[0.50px] leading-[16.8px] whitespace-nowrap">
              Ver menos
            </div>

            <ArrowForwardIos className="!relative !w-5 !h-5" />
          </div>
        </div>

        <Row />
        <TableRowContainer />
        <NavbarWrapper />
        <TableRowContainerWrapper />
        <DivWrapper />
        <TableHeader />
        <div className="absolute top-[146px] left-[330px] [font-family:'Neue_Montreal-Bold',Helvetica] font-bold text-[#060b27] text-base tracking-[0.50px] leading-[19.2px] whitespace-nowrap">
          MEUS ROTEIROS
        </div>

        <Pagination />
      </div>
    </div>
  );
};
