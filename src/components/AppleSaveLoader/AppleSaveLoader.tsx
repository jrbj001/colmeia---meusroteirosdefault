import React, { useEffect, useState } from "react";

interface LoadingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  detail?: string;
}

interface AppleSaveLoaderProps {
  isOpen: boolean;
  steps: LoadingStep[];
  currentProgress: number; // 0-100
  title?: string;
}

export const AppleSaveLoader: React.FC<AppleSaveLoaderProps> = ({
  isOpen,
  steps,
  currentProgress,
  title = "Salvando Roteiro"
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Animação suave do progresso
  useEffect(() => {
    const timer = setTimeout(() => {
      if (displayProgress < currentProgress) {
        setDisplayProgress(prev => Math.min(prev + 1, currentProgress));
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [displayProgress, currentProgress]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-lg w-full mx-4 transform transition-all duration-300 scale-100">
        {/* Título */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {title}
          </h2>
          <p className="text-sm text-gray-500">
            Por favor, aguarde enquanto processamos seu roteiro
          </p>
        </div>

        {/* Progresso Circular */}
        <div className="flex justify-center mb-8">
          <div className="relative w-32 h-32">
            {/* Círculo de fundo */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#e5e7eb"
                strokeWidth="8"
                fill="none"
              />
              {/* Círculo de progresso */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="url(#gradient)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - displayProgress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-300 ease-out"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Porcentagem */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">
                {displayProgress}%
              </span>
            </div>
          </div>
        </div>

        {/* Lista de Etapas */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-300 ${
                step.status === 'processing'
                  ? 'bg-blue-50 border border-blue-200'
                  : step.status === 'completed'
                  ? 'bg-green-50 border border-green-200'
                  : step.status === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              {/* Ícone de Status */}
              <div className="flex-shrink-0 mt-0.5">
                {step.status === 'pending' && (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white"></div>
                )}
                {step.status === 'processing' && (
                  <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                )}
                {step.status === 'completed' && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {step.status === 'error' && (
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  step.status === 'processing'
                    ? 'text-blue-900'
                    : step.status === 'completed'
                    ? 'text-green-900'
                    : step.status === 'error'
                    ? 'text-red-900'
                    : 'text-gray-500'
                }`}>
                  {step.label}
                </p>
                {step.detail && (
                  <p className="text-xs text-gray-500 mt-1">
                    {step.detail}
                  </p>
                )}
              </div>

              {/* Indicador numérico */}
              <div className="flex-shrink-0">
                <span className={`text-xs font-medium ${
                  step.status === 'completed'
                    ? 'text-green-600'
                    : step.status === 'error'
                    ? 'text-red-600'
                    : 'text-gray-400'
                }`}>
                  {index + 1}/{steps.length}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Barra de progresso linear (redundante mas bonita) */}
        <div className="mt-6">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${displayProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Dica */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400 italic">
            Não feche esta janela durante o processamento
          </p>
        </div>
      </div>
    </div>
  );
};
