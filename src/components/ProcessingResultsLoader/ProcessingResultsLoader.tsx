import React, { useMemo } from "react";

interface ProcessingResultsLoaderProps {
  nomeRoteiro: string;
  tempoDecorrido: number; // em segundos
}

export const ProcessingResultsLoader: React.FC<ProcessingResultsLoaderProps> = ({
  nomeRoteiro,
  tempoDecorrido
}) => {
  // Debug: Log sempre que o componente renderizar
  console.log('🔄 ProcessingResultsLoader renderizando - tempoDecorrido:', tempoDecorrido);
  
  // Formatar tempo decorrido (Xh XXmin XXs)
  const tempoFormatado = useMemo(() => {
    const horas = Math.floor(tempoDecorrido / 3600);
    const minutos = Math.floor((tempoDecorrido % 3600) / 60);
    const segundos = tempoDecorrido % 60;
    
    let formatado = '';
    if (horas > 0) {
      formatado += `${horas}h `;
    }
    if (minutos > 0 || horas > 0) {
      formatado += `${minutos}min `;
    }
    formatado += `${segundos}s`;
    
    console.log('⏱️ Tempo formatado:', formatado, 'de', tempoDecorrido, 'segundos');
    return formatado.trim();
  }, [tempoDecorrido]);

  // ✅ Etapas do processamento com progresso mais conservador (processo leva 3-5min = 180-300s)
  const etapaAtual = useMemo(() => {
    if (tempoDecorrido < 20) {
      return {
        titulo: "Iniciando processamento",
        descricao: "Preparando ambiente Databricks e validando dados de entrada",
        progresso: Math.min((tempoDecorrido / 20) * 10, 10) // 0-10% (0-20s)
      };
    } else if (tempoDecorrido < 60) {
      return {
        titulo: "Processando pontos de mídia",
        descricao: "Carregando inventário e cruzando com dados geográficos",
        progresso: 10 + Math.min(((tempoDecorrido - 20) / 40) * 20, 20) // 10-30% (20-60s)
      };
    } else if (tempoDecorrido < 120) {
      return {
        titulo: "Calculando alcance e cobertura",
        descricao: "Processando métricas de população e audiência por praça",
        progresso: 30 + Math.min(((tempoDecorrido - 60) / 60) * 25, 25) // 30-55% (60-120s)
      };
    } else if (tempoDecorrido < 180) {
      return {
        titulo: "Gerando indicadores de performance",
        descricao: "Calculando GRP, frequência, impactos totais e cobertura proporcional",
        progresso: 55 + Math.min(((tempoDecorrido - 120) / 60) * 20, 20) // 55-75% (120-180s = 2-3min)
      };
    } else if (tempoDecorrido < 240) {
      return {
        titulo: "Consolidando resultados",
        descricao: "Agregando dados por target, semana e praça",
        progresso: 75 + Math.min(((tempoDecorrido - 180) / 60) * 15, 15) // 75-90% (180-240s = 3-4min)
      };
    } else if (tempoDecorrido < 300) {
      return {
        titulo: "Finalizando processamento",
        descricao: "Últimos ajustes e validações finais",
        progresso: 90 + Math.min(((tempoDecorrido - 240) / 60) * 5, 5) // 90-95% (240-300s = 4-5min)
      };
    } else {
      return {
        titulo: "Finalizando processamento",
        descricao: "Últimos ajustes e validações finais",
        progresso: Math.min(95 + ((tempoDecorrido - 300) / 60) * 2, 98) // 95-98% (5min+, nunca chega em 99%)
      };
    }
  }, [tempoDecorrido]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-20 px-8">
      {/* Loading spinner estilo Apple */}
      <div className="relative mb-10">
        <div className="w-16 h-16 border-[3px] border-gray-200 border-t-[#FF9800] rounded-full animate-spin"></div>
      </div>

      {/* Título principal */}
      <h2 className="text-3xl font-light text-gray-800 mb-2 tracking-tight">
        Processando Resultados
      </h2>

      {/* Nome do roteiro */}
      <p className="text-sm text-[#FF9800] font-medium mb-10 text-center max-w-2xl">
        {nomeRoteiro}
      </p>

      {/* Etapa atual com descrição */}
      <div className="mb-8 text-center max-w-xl">
        <h3 className="text-base font-medium text-gray-700 mb-2">
          {etapaAtual.titulo}
        </h3>
        <p className="text-sm text-gray-500 font-light leading-relaxed">
          {etapaAtual.descricao}
        </p>
      </div>

      {/* Barra de progresso com porcentagem */}
      <div className="w-full max-w-md mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-light">Progresso</span>
          <span className="text-xs text-gray-600 font-medium">{Math.round(etapaAtual.progresso)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-[#FF9800] to-[#ff6b00] transition-all duration-700 ease-out rounded-full"
            style={{ width: `${etapaAtual.progresso}%` }}
          />
        </div>
      </div>

      {/* Tempo decorrido */}
      <div className="text-sm text-gray-400 mb-12 font-light tracking-wide">
        {tempoFormatado}
      </div>

      {/* Card detalhado de informações */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-50/50 backdrop-blur-sm rounded-2xl p-8 max-w-2xl border border-gray-100/50 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Processamento Databricks em Andamento
            </h3>
            <div className="space-y-3 text-sm text-gray-600 font-light leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Ambiente Databricks ativo e processando seu plano de mídia</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Cruzamento de dados geográficos com pontos de mídia</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Cálculo de métricas: GRP, cobertura, frequência e impactos</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">⟳</span>
                <span>Agregação por target, semana e praça em andamento</span>
              </div>
            </div>
            
            <div className="mt-5 pt-5 border-t border-gray-200/50">
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong className="text-gray-600">Tempo estimado:</strong> 3-5 minutos · 
                Os resultados aparecerão automaticamente quando o processamento for concluído. 
                Você pode deixar esta página aberta ou navegar livremente - o processamento continua em background.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador discreto de verificação */}
      <div className="mt-10 flex items-center gap-2 text-xs text-gray-400 font-light">
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
        <span>Verificando status a cada 3 segundos</span>
      </div>
    </div>
  );
};
