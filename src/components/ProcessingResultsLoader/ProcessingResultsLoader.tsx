import React, { useMemo } from "react";

interface ProcessingResultsLoaderProps {
  nomeRoteiro: string;
  tempoDecorrido: number; // em segundos
}

export const ProcessingResultsLoader: React.FC<ProcessingResultsLoaderProps> = ({
  nomeRoteiro,
  tempoDecorrido
}) => {
  // Formatar tempo decorrido (MM:SS)
  const tempoFormatado = useMemo(() => {
    const minutos = Math.floor(tempoDecorrido / 60);
    const segundos = tempoDecorrido % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  }, [tempoDecorrido]);

  // Mensagens motivacionais baseadas no tempo
  const mensagem = useMemo(() => {
    if (tempoDecorrido < 30) {
      return "Iniciando processamento...";
    } else if (tempoDecorrido < 60) {
      return "Analisando dados do plano de mídia...";
    } else if (tempoDecorrido < 120) {
      return "Processando indicadores de performance...";
    } else if (tempoDecorrido < 180) {
      return "Calculando métricas de cobertura...";
    } else if (tempoDecorrido < 240) {
      return "Quase lá! Finalizando cálculos...";
    } else {
      return "Processamento em andamento no Databricks...";
    }
  }, [tempoDecorrido]);

  // Estimar progresso visual (não é exato, apenas visual)
  const progressoEstimado = useMemo(() => {
    // Assumindo que geralmente leva até 5 minutos (300s)
    const maxTempo = 300;
    const progresso = Math.min((tempoDecorrido / maxTempo) * 100, 95); // Máximo 95% para não dar falsa expectativa
    return progresso;
  }, [tempoDecorrido]);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      {/* Ícone animado */}
      <div className="relative mb-8">
        <div className="w-24 h-24 border-4 border-[#FF9800] border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FF9800] to-[#ff4600] rounded-full opacity-20 animate-pulse"></div>
        </div>
      </div>

      {/* Título */}
      <h2 className="text-2xl font-bold text-[#222] mb-2 text-center">
        Processando Resultados
      </h2>

      {/* Nome do roteiro */}
      <p className="text-lg text-[#FF9800] font-semibold mb-6 text-center max-w-2xl">
        {nomeRoteiro}
      </p>

      {/* Mensagem de status */}
      <p className="text-gray-600 mb-8 text-center max-w-xl">
        {mensagem}
      </p>

      {/* Barra de progresso visual */}
      <div className="w-full max-w-md mb-4">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#FF9800] to-[#ff4600] transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressoEstimado}%` }}
          />
        </div>
      </div>

      {/* Tempo decorrido */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Tempo decorrido: <strong>{tempoFormatado}</strong></span>
      </div>

      {/* Informações adicionais */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          O que está acontecendo?
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Seu plano de mídia está sendo processado em nosso ambiente Databricks</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Estamos calculando métricas de cobertura, frequência e impactos</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Os resultados aparecerão automaticamente quando o processamento terminar</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Você pode deixar esta página aberta ou voltar depois - o processamento continua em background</span>
          </li>
        </ul>
      </div>

      {/* Indicador de atualização automática */}
      <div className="mt-8 flex items-center gap-2 text-xs text-gray-500">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Esta página atualiza automaticamente a cada 3 segundos</span>
      </div>
    </div>
  );
};
