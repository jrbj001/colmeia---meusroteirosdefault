import React from "react";

export const LoadingColmeia: React.FC = () => {
  return (
    <>
      <style>{`
        @keyframes apple-fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes apple-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div className="flex flex-col items-center justify-center w-full h-96" style={{ animation: 'apple-fade-in 0.4s ease-out' }}>
        <div className="relative mb-6">
          {/* Background blur circle */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-100 to-amber-100 rounded-full blur-2xl opacity-50 animate-pulse"></div>
          
          {/* Spinner */}
          <div className="relative w-16 h-16" style={{ animation: 'apple-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}>
            <svg width="64" height="64" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="#ff4600"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="60 158"
              />
            </svg>
          </div>
          
          {/* Logo no centro */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/logo_colmeia_short.png"
              alt="Colmeia"
              className="w-8 h-8"
              style={{ animation: 'apple-pulse 2s ease-in-out infinite' }}
            />
          </div>
        </div>
        
        <span className="text-[#ff4600] font-semibold text-lg tracking-tight">Carregando...</span>
      </div>
    </>
  );
}; 