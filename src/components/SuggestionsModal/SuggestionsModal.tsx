import React from 'react';

interface HexagonoAnalise {
  hexagon_pk: number;
  hex_centroid_lat: number;
  hex_centroid_lon: number;
  calculatedFluxoEstimado_vl: number;
  count_vl: number;
  eficienciaPercentual: number;
  fluxoPorPonto: number;
  ranking: number;
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
}

interface SuggestionsModalProps {
  analise: AnaliseCompleta | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SuggestionsModal: React.FC<SuggestionsModalProps> = ({ 
  analise, 
  isOpen, 
  onClose 
}) => {
  if (!isOpen || !analise) return null;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(0);
  };

  const sugestoesRemocao = analise.planoOtimizado.sugestoes.filter(s => s.tipo === 'remover');
  const sugestoesAdicao = analise.planoOtimizado.sugestoes.filter(s => s.tipo === 'adicionar');

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 20
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: 16,
          maxWidth: 900,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
              💡 Sugestões de Otimização do Plano
            </h2>
            <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: 16 }}>
              Análise inteligente para maximizar o alcance da sua campanha
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              fontSize: 24,
              width: 40,
              height: 40,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 32, maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
          
          {/* Resumo Executivo */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderRadius: 12,
            padding: 24,
            marginBottom: 32,
            border: '1px solid #0ea5e9'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#0c4a6e', fontSize: 20 }}>
              📊 Resumo Executivo
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>Plano Atual</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#0c4a6e' }}>
                  {formatNumber(analise.planoAtual.totalPontos)} pontos
                </div>
                <div style={{ fontSize: 14, color: '#64748b' }}>
                  {analise.planoAtual.totalHexagonos} hexágonos • {formatNumber(analise.planoAtual.fluxoTotal)} pessoas
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>Potencial de Melhoria</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#059669' }}>
                  +{analise.planoOtimizado.ganhoPercentual.toFixed(1)}% de alcance
                </div>
                <div style={{ fontSize: 14, color: '#64748b' }}>
                  {analise.planoOtimizado.pontosRealocados} pontos realocados
                </div>
              </div>
            </div>
          </div>

          {/* Sugestões de Remoção */}
          {sugestoesRemocao.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#dc2626', fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                ❌ Remover Pontos (Baixa Eficiência)
              </h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {sugestoesRemocao.map((sugestao, idx) => (
                  <div key={idx} style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16
                  }}>
                    <div style={{
                      background: '#dc2626',
                      color: 'white',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: 14,
                      fontWeight: 600,
                      minWidth: 60,
                      textAlign: 'center'
                    }}>
                      -{sugestao.pontosSugeridos}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>
                        Hexágono #{sugestao.hexagono.hexagon_pk}
                      </div>
                      <div style={{ fontSize: 14, color: '#7f1d1d', marginBottom: 4 }}>
                        {sugestao.justificativa}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Fluxo atual: {formatNumber(sugestao.hexagono.calculatedFluxoEstimado_vl)} pessoas
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#dc2626' }}>
                        -{formatNumber(Math.abs(sugestao.impactoFluxo))}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>pessoas</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sugestões de Adição */}
          {sugestoesAdicao.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#059669', fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                ✅ Adicionar Pontos (Alta Eficiência)
              </h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {sugestoesAdicao.map((sugestao, idx) => (
                  <div key={idx} style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 8,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16
                  }}>
                    <div style={{
                      background: '#059669',
                      color: 'white',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: 14,
                      fontWeight: 600,
                      minWidth: 60,
                      textAlign: 'center'
                    }}>
                      +{sugestao.pontosSugeridos}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#065f46', marginBottom: 4 }}>
                        Hexágono #{sugestao.hexagono.hexagon_pk}
                      </div>
                      <div style={{ fontSize: 14, color: '#047857', marginBottom: 4 }}>
                        {sugestao.justificativa}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Fluxo atual: {formatNumber(sugestao.hexagono.calculatedFluxoEstimado_vl)} pessoas
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#059669' }}>
                        +{formatNumber(sugestao.impactoFluxo)}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>pessoas</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impacto Financeiro */}
          <div style={{
            background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
            borderRadius: 12,
            padding: 24,
            marginBottom: 32,
            border: '1px solid #f59e0b'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#92400e', fontSize: 20 }}>
              💰 Impacto Financeiro Estimado
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#92400e' }}>
                  {formatNumber(analise.planoAtual.totalPontos)}
                </div>
                <div style={{ fontSize: 14, color: '#a16207' }}>Pontos Atuais</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>
                  +{analise.planoOtimizado.ganhoPercentual.toFixed(1)}%
                </div>
                <div style={{ fontSize: 14, color: '#047857' }}>Ganho de Alcance</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0ea5e9' }}>
                  {formatNumber(analise.planoOtimizado.ganhoFluxoEstimado)}
                </div>
                <div style={{ fontSize: 14, color: '#0284c7' }}>Pessoas Adicionais</div>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              Fechar
            </button>
            <button
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Exportar Relatório
            </button>
            <button
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Aplicar Sugestões
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


