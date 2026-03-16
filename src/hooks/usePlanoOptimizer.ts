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
  valorLiquido_vl?: number;
  totalFinal_vl?: number;
  totalNegociado_vl?: number;
  valorTotal_vl?: number;
  cpmView_vl?: number;
}

interface HexagonoAnalise extends Hexagono {
  eficienciaScore: number;
  eficienciaPercentual: number;
  ranking: number;
  fluxoPorPonto: number;
  investimentoEstimado: number;
  custoPorPonto: number;
  eficienciaFinanceira: number;
  scorePriorizacao: number;
  sugestao: 'manter' | 'remover' | 'adicionar' | 'potencial';
}

interface SugestaoRealocacao {
  tipo: 'remover' | 'adicionar';
  hexagono: HexagonoAnalise;
  pontosSugeridos: number;
  justificativa: string;
  impactoFluxo: number;
  impactoInvestimento: number;
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
    investimentoTotal: number;
    eficienciaFinanceiraAtual: number;
    dadosFinanceirosDisponiveis: boolean;
  };
  planoOtimizado: {
    sugestoes: SugestaoRealocacao[];
    ganhoFluxoEstimado: number;
    ganhoPercentual: number;
    pontosRealocados: number;
    economiaEstimada: number; // em moeda (R$) quando houver base financeira
    variacaoInvestimento: number;
    eficienciaFinanceiraOtimizada: number;
    usaFinanceiro: boolean;
    restricoesAplicadas: {
      semAumentoInvestimento: boolean;
      maxRealocacaoPorGrupo: number;
    };
  };
  hexagonosAnalisados: HexagonoAnalise[];
}

export function usePlanoOptimizer(hexagonos: Hexagono[]) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const MAX_HEX_PARA_ACAO = 3;
  const MAX_ADICOES_POR_GRUPO = 1;

  // Calcular análise completa - versão simplificada e segura
  const analise: AnaliseCompleta | null = useMemo(() => {
    if (!hexagonos || hexagonos.length === 0) {
      return null;
    }

    try {
      // 1. ANÁLISE BÁSICA DO PLANO
      const totalPontos = hexagonos.reduce((sum, h) => sum + (h.count_vl || 0), 0);
      const fluxoTotal = hexagonos.reduce((sum, h) => sum + h.calculatedFluxoEstimado_vl, 0);
      const fluxoMedio = hexagonos.length > 0 ? fluxoTotal / hexagonos.length : 0;

      const investimentoTotal = hexagonos.reduce(
        (sum, h) => sum + getInvestimentoEstimado(h),
        0
      );
      const dadosFinanceirosDisponiveis = investimentoTotal > 0;
      const eficienciaFinanceiraAtual = investimentoTotal > 0 ? fluxoTotal / investimentoTotal : 0;

      // 2. CALCULAR EFICIÊNCIA V2 (alcance + financeiro opcional)
      const hexagonosComAnalise: HexagonoAnalise[] = hexagonos.map((hex) => {
        const investimentoEstimado = getInvestimentoEstimado(hex);
        const eficienciaScore = fluxoMedio > 0 ? hex.calculatedFluxoEstimado_vl / fluxoMedio : 0;
        const eficienciaPercentual = eficienciaScore * 100;
        const pontosHex = Math.max(1, hex.count_vl || 0);
        const fluxoPorPonto = hex.calculatedFluxoEstimado_vl / pontosHex;
        const custoPorPonto = investimentoEstimado > 0 ? investimentoEstimado / pontosHex : 0;
        const eficienciaFinanceira = investimentoEstimado > 0 ? hex.calculatedFluxoEstimado_vl / investimentoEstimado : 0;
        const scorePriorizacao = investimentoEstimado > 0 ? eficienciaFinanceira : fluxoPorPonto;

        return {
          ...hex,
          eficienciaScore,
          eficienciaPercentual,
          fluxoPorPonto,
          investimentoEstimado,
          custoPorPonto,
          eficienciaFinanceira,
          scorePriorizacao,
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

      // 4. IDENTIFICAR PERFORMANCE
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

      // 5. GERAR SUGESTÕES V2
      const sugestoes: SugestaoRealocacao[] = [];

      // Remover: piores score de priorização, com pelo menos 1 ponto
      const hexagonosParaRemover = hexagonosComAnalise
        .filter(h => h.count_vl > 0)
        .sort((a, b) => a.scorePriorizacao - b.scorePriorizacao)
        .slice(0, MAX_HEX_PARA_ACAO);

      let pontosDisponiveis = 0;
      hexagonosParaRemover.forEach(hex => {
        hex.sugestao = 'remover';
        const pontosRemovidos = Math.max(1, Math.floor((hex.count_vl || 0) * 0.5));
        pontosDisponiveis += pontosRemovidos;
        sugestoes.push({
          tipo: 'remover',
          hexagono: hex,
          pontosSugeridos: pontosRemovidos,
          justificativa: `Baixo rendimento (${formatNumber(hex.scorePriorizacao)} de score)`,
          impactoFluxo: -(hex.fluxoPorPonto * pontosRemovidos),
          impactoInvestimento: -(hex.custoPorPonto * pontosRemovidos)
        });
      });

      // Adicionar: melhores score, respeitando conservacao de pontos
      const removidosSet = new Set(hexagonosParaRemover.map(h => h.hexagon_pk));
      const hexagonosParaAdicionar = hexagonosComAnalise
        .filter(h => !removidosSet.has(h.hexagon_pk))
        .sort((a, b) => b.scorePriorizacao - a.scorePriorizacao)
        .slice(0, MAX_HEX_PARA_ACAO);

      const adicoesPorGrupo = new Map<string, number>();
      hexagonosParaAdicionar.forEach((hex) => {
        const grupo = hex.grupo_st || '__sem_grupo__';
        const adicoesNoGrupo = adicoesPorGrupo.get(grupo) || 0;
        if (adicoesNoGrupo >= MAX_ADICOES_POR_GRUPO) return;
        if (pontosDisponiveis > 0) {
          hex.sugestao = 'adicionar';
          const limitePorCota = Math.max(1, MAX_ADICOES_POR_GRUPO - adicoesNoGrupo);
          const pontosAAdicionar = Math.min(2, pontosDisponiveis, limitePorCota);
          if (pontosAAdicionar <= 0) return;
          pontosDisponiveis -= pontosAAdicionar;
          adicoesPorGrupo.set(grupo, adicoesNoGrupo + pontosAAdicionar);
          sugestoes.push({
            tipo: 'adicionar',
            hexagono: hex,
            pontosSugeridos: pontosAAdicionar,
            justificativa: `Alto rendimento (${formatNumber(hex.scorePriorizacao)} de score)`,
            impactoFluxo: hex.fluxoPorPonto * pontosAAdicionar,
            impactoInvestimento: hex.custoPorPonto * pontosAAdicionar
          });
        }
      });

      // 6. IMPACTOS CONSOLIDADOS
      const ganhoFluxoEstimado = sugestoes.reduce((sum, s) => sum + s.impactoFluxo, 0);
      const ganhoPercentual = fluxoTotal > 0 ? (ganhoFluxoEstimado / fluxoTotal) * 100 : 0;
      const variacaoInvestimentoBruta = sugestoes.reduce((sum, s) => sum + s.impactoInvestimento, 0);
      const pontosRealocados = sugestoes
        .filter(s => s.tipo === 'remover')
        .reduce((sum, s) => sum + s.pontosSugeridos, 0);

      // Restrição orçamentária: não permitir aumento de investimento
      let variacaoInvestimento = variacaoInvestimentoBruta;
      if (dadosFinanceirosDisponiveis && variacaoInvestimento > 0) {
        variacaoInvestimento = 0;
      }
      const economiaEstimada = variacaoInvestimento < 0 ? Math.abs(variacaoInvestimento) : 0;
      const fluxoOtimizado = fluxoTotal + ganhoFluxoEstimado;
      const investimentoOtimizado = Math.max(0, investimentoTotal + variacaoInvestimento);
      const eficienciaFinanceiraOtimizada = investimentoOtimizado > 0 ? fluxoOtimizado / investimentoOtimizado : 0;

      console.log('🔍 [DEBUG] Análise simplificada:', {
        totalHexagonos: hexagonos.length,
        sugestoes: sugestoes.length,
        ganhoPercentual: ganhoPercentual.toFixed(1) + '%',
        usaFinanceiro: dadosFinanceirosDisponiveis,
        variacaoInvestimentoBruta: variacaoInvestimentoBruta.toFixed(2),
        variacaoInvestimentoAplicada: variacaoInvestimento.toFixed(2)
      });

      return {
        planoAtual: {
          totalPontos,
          totalHexagonos: hexagonos.length,
          fluxoTotal,
          fluxoMedio,
          eficienciaMedia,
          hexagonosBaixaPerformance: hexagonosBaixaPerformance.length,
          hexagonosAltaPerformance: hexagonosAltaPerformance.length,
          investimentoTotal,
          eficienciaFinanceiraAtual,
          dadosFinanceirosDisponiveis
        },
        planoOtimizado: {
          sugestoes,
          ganhoFluxoEstimado,
          ganhoPercentual,
          pontosRealocados,
          economiaEstimada,
          variacaoInvestimento,
          eficienciaFinanceiraOtimizada,
          usaFinanceiro: dadosFinanceirosDisponiveis,
          restricoesAplicadas: {
            semAumentoInvestimento: dadosFinanceirosDisponiveis,
            maxRealocacaoPorGrupo: MAX_ADICOES_POR_GRUPO
          }
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

function getInvestimentoEstimado(hex: Hexagono): number {
  const candidatos = [
    hex.totalFinal_vl,
    hex.valorLiquido_vl,
    hex.totalNegociado_vl,
    hex.valorTotal_vl
  ];
  for (const valor of candidatos) {
    if (typeof valor === 'number' && Number.isFinite(valor) && valor > 0) {
      return valor;
    }
  }
  return 0;
}
