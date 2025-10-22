import { useState, useMemo } from 'react';

interface Hexagono {
  hexagon_pk: number;
  hex_centroid_lat: number;
  hex_centroid_lon: number;
  calculatedFluxoEstimado_vl: number;
  fluxoEstimado_vl: number;
  count_vl: number;
  groupCount_vl: number;
  geometry_8: string;
  planoMidia_pk: number;
  grupo_st: string;
}

interface HexagonoAnalise extends Hexagono {
  eficienciaScore: number;
  eficienciaPercentual: number;
  ranking: number;
  fluxoPorPonto: number;
  sugestao: 'manter' | 'remover' | 'adicionar' | 'potencial';
}

interface SugestaoRealocacao {
  tipo: 'remover' | 'adicionar';
  hexagono: HexagonoAnalise;
  pontosSugeridos: number;
  justificativa: string;
  impactoFluxo: number;
}

interface AnaliseCompleta {
  planoAtual: {
    totalPontos: number;
    totalHexagonos: number;
    fluxoTotal: number;
    fluxoMedio: number;
    eficienciaMedia: number;
    hexagonosBaixaPerformance: number;
    hexagonosAltaPerformance: number;
  };
  planoOtimizado: {
    sugestoes: SugestaoRealocacao[];
    ganhoFluxoEstimado: number;
    ganhoPercentual: number;
    pontosRealocados: number;
    economiaEstimada: number;
  };
  hexagonosAnalisados: HexagonoAnalise[];
}

export function usePlanoOptimizer(hexagonos: Hexagono[]) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Calcular análise completa - versão simplificada e segura
  const analise: AnaliseCompleta | null = useMemo(() => {
    if (!hexagonos || hexagonos.length === 0) {
      return null;
    }

    try {
      // 1. ANÁLISE BÁSICA DO PLANO
      const totalPontos = hexagonos.reduce((sum, h) => sum + (h.count_vl || 0), 0);
      const fluxoTotal = hexagonos.reduce((sum, h) => sum + h.calculatedFluxoEstimado_vl, 0);
      const fluxoMedio = fluxoTotal / hexagonos.length;

      // 2. CALCULAR EFICIÊNCIA SIMPLES
      const hexagonosComAnalise: HexagonoAnalise[] = hexagonos.map((hex) => {
        const eficienciaScore = hex.calculatedFluxoEstimado_vl / fluxoMedio;
        const eficienciaPercentual = eficienciaScore * 100;
        const fluxoPorPonto = hex.count_vl > 0 ? hex.calculatedFluxoEstimado_vl / hex.count_vl : 0;

        return {
          ...hex,
          eficienciaScore,
          eficienciaPercentual,
          fluxoPorPonto,
          ranking: 0,
          sugestao: 'manter' as const
        };
      });

      // 3. CALCULAR RANKING SIMPLES
      const hexagonosOrdenados = [...hexagonosComAnalise].sort(
        (a, b) => b.calculatedFluxoEstimado_vl - a.calculatedFluxoEstimado_vl
      );
      hexagonosOrdenados.forEach((hex, idx) => {
        hex.ranking = idx + 1;
      });

      // 4. IDENTIFICAR PERFORMANCE (versão simplificada)
      const eficiencias = hexagonosComAnalise.map(h => h.eficienciaPercentual).sort((a, b) => a - b);
      const percentil25 = eficiencias[Math.floor(eficiencias.length * 0.25)];
      const percentil75 = eficiencias[Math.floor(eficiencias.length * 0.75)];

      const hexagonosBaixaPerformance = hexagonosComAnalise.filter(
        h => h.eficienciaPercentual <= percentil25
      );
      const hexagonosAltaPerformance = hexagonosComAnalise.filter(
        h => h.eficienciaPercentual >= percentil75
      );

      const eficienciaMedia = hexagonosComAnalise.reduce(
        (sum, h) => sum + h.eficienciaPercentual, 0
      ) / hexagonosComAnalise.length;

      // 5. GERAR SUGESTÕES SIMPLES
      const sugestoes: SugestaoRealocacao[] = [];

      // Remover hexágonos com menor fluxo por ponto
      const hexagonosParaRemover = hexagonosComAnalise
        .filter(h => h.count_vl > 0)
        .sort((a, b) => a.fluxoPorPonto - b.fluxoPorPonto)
        .slice(0, 3); // Top 3 piores

      hexagonosParaRemover.forEach(hex => {
        hex.sugestao = 'remover';
        sugestoes.push({
          tipo: 'remover',
          hexagono: hex,
          pontosSugeridos: hex.count_vl,
          justificativa: `Menor fluxo por ponto (${formatNumber(hex.fluxoPorPonto)} pessoas/ponto)`,
          impactoFluxo: -hex.calculatedFluxoEstimado_vl
        });
      });

      // Adicionar pontos nos hexágonos com maior fluxo por ponto
      const pontosDisponiveis = sugestoes.reduce((sum, s) => sum + s.pontosSugeridos, 0);
      const hexagonosParaAdicionar = hexagonosComAnalise
        .filter(h => h.count_vl < 3)
        .sort((a, b) => b.fluxoPorPonto - a.fluxoPorPonto)
        .slice(0, 3); // Top 3 melhores

      hexagonosParaAdicionar.forEach((hex, idx) => {
        if (pontosDisponiveis > 0 && idx < sugestoes.length) {
          hex.sugestao = 'adicionar';
          const pontosAAdicionar = Math.min(2, pontosDisponiveis);
          sugestoes.push({
            tipo: 'adicionar',
            hexagono: hex,
            pontosSugeridos: pontosAAdicionar,
            justificativa: `Maior fluxo por ponto (${formatNumber(hex.fluxoPorPonto)} pessoas/ponto)`,
            impactoFluxo: hex.calculatedFluxoEstimado_vl * (pontosAAdicionar / (hex.count_vl + 1))
          });
        }
      });

      // 6. CALCULAR GANHOS SIMPLES
      const fluxoRemovido = sugestoes
        .filter(s => s.tipo === 'remover')
        .reduce((sum, s) => sum + Math.abs(s.impactoFluxo), 0);

      const fluxoAdicionado = sugestoes
        .filter(s => s.tipo === 'adicionar')
        .reduce((sum, s) => sum + s.impactoFluxo, 0);

      const ganhoFluxoEstimado = fluxoAdicionado - fluxoRemovido;
      const ganhoPercentual = (ganhoFluxoEstimado / fluxoTotal) * 100;

      const pontosRealocados = sugestoes
        .filter(s => s.tipo === 'remover')
        .reduce((sum, s) => sum + s.pontosSugeridos, 0);

      const economiaEstimada = (fluxoRemovido / fluxoTotal) * 100;

      console.log('🔍 [DEBUG] Análise simplificada:', {
        totalHexagonos: hexagonos.length,
        sugestoes: sugestoes.length,
        ganhoPercentual: ganhoPercentual.toFixed(1) + '%'
      });

      return {
        planoAtual: {
          totalPontos,
          totalHexagonos: hexagonos.length,
          fluxoTotal,
          fluxoMedio,
          eficienciaMedia,
          hexagonosBaixaPerformance: hexagonosBaixaPerformance.length,
          hexagonosAltaPerformance: hexagonosAltaPerformance.length
        },
        planoOtimizado: {
          sugestoes,
          ganhoFluxoEstimado,
          ganhoPercentual,
          pontosRealocados,
          economiaEstimada
        },
        hexagonosAnalisados: hexagonosComAnalise
      };

    } catch (error) {
      console.error('❌ [usePlanoOptimizer] Erro na análise:', error);
      return null;
    }
  }, [hexagonos]);

  const analisar = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 500);
  };

  return {
    analise,
    isAnalyzing,
    analisar,
    temDados: hexagonos && hexagonos.length > 0
  };
}

// Helper para formatar números
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toFixed(0);
}
