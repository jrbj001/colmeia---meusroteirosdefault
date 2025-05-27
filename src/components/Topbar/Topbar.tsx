import React from "react";
import { Avatar } from "../Avatar";
import { ExitToApp } from "../../icons/ExitToApp";

interface TopbarProps {
  menuReduzido: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ menuReduzido }) => (
  <div
    className={`fixed top-0 z-30 bg-white border-b border-[#c1c1c1] p-4 transition-all duration-300
      ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`}
  >
    <div className="flex justify-between items-center">
      <div className="text-xs text-[#3a3a3a] tracking-[0.50px]">
        Home / Meus roteiros
      </div>
      <div className="flex items-center gap-[30px]">
        <Avatar
          className="!relative"
          shape="circle"
          size="large"
          type="image"
          initials="U"
        />
        <ExitToApp className="w-6 h-6" color="#3A3A3A" />
      </div>
    </div>
    <div
      className={`fixed top-0 z-30 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? "left-20" : "left-64"}`}
    />
  </div>
); 