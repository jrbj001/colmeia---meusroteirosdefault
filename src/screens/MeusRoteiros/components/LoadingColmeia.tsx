import React from "react";

export const LoadingColmeia: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-96">
      <img
        src="/logo_colmeia_short.png"
        alt="Carregando Colmeia"
        className="w-16 h-16 animate-spin"
        style={{ animationDuration: '1.2s' }}
      />
      <span className="mt-4 text-[#FF6600] font-semibold text-base">Carregando...</span>
    </div>
  );
}; 