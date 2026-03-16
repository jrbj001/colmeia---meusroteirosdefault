import React from 'react';

interface HexagonoAnalise {
  hexagon_pk: number;
  hex_centroid_lat: number;
  hex_centroid_lon: number;
  calculatedFluxoEstimado_vl: number;
  count_vl: number;
  grupo_st?: string;
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
    investimentoTotal: number;
    eficienciaFinanceiraAtual: number;
    dadosFinanceirosDisponiveis: boolean;
  };
  planoOtimizado: {
    sugestoes: SugestaoRealocacao[];
    ganhoFluxoEstimado: number;
    ganhoPercentual: number;
    pontosRealocados: number;
    economiaEstimada: number;
    variacaoInvestimento: number;
    eficienciaFinanceiraOtimizada: number;
    restricoesAplicadas: {
      semAumentoInvestimento: boolean;
      maxRealocacaoPorGrupo: number;
    };
  };
}

interface PontoContexto {
  planoMidia_pk: number;
  latitude_vl: number;
  longitude_vl: number;
  grupo_st?: string;
  nome_st?: string;
  tipo_st?: string;
  formato_st?: string;
  cidade_st?: string;
  estado_st?: string;
  bairro_st?: string;
  [key: string]: any;
}

interface SuggestionsModalProps {
  analise: AnaliseCompleta | null;
  isOpen: boolean;
  onClose: () => void;
  pontosContexto?: PontoContexto[];
  onSelectPoint?: (planoMidiaPk: number) => void;
}

type FiltroTipo = 'todos' | 'adicionar' | 'remover';

function formatCompact(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(num);
}

function getExibidor(ponto: PontoContexto | null): string {
  if (!ponto) return 'Não informado';
  return (
    ponto.exibidor_st ||
    ponto.exibidor ||
    ponto.operadora_st ||
    ponto.operadora ||
    ponto.owner_st ||
    'Não informado'
  );
}

function getEndereco(ponto: PontoContexto | null): string {
  if (!ponto) return 'Endereço não informado';
  const rua = ponto.logradouro_st || ponto.logradouro || ponto.endereco_st || ponto.endereco;
  const bairro = ponto.bairro_st || ponto.bairro;
  const cidade = ponto.cidade_st || ponto.cidade;
  const uf = ponto.estado_st || ponto.estado;
  return [rua, bairro, [cidade, uf].filter(Boolean).join('/')].filter(Boolean).join(' · ') || 'Endereço não informado';
}

function distanciaQuadratica(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = lat1 - lat2;
  const dLon = lon1 - lon2;
  return dLat * dLat + dLon * dLon;
}

function obterPontoReferencia(
  sugestao: SugestaoRealocacao,
  pontos: PontoContexto[]
): PontoContexto | null {
  if (!pontos.length) return null;
  const mesmoGrupo = pontos.filter(p => p.grupo_st && p.grupo_st === sugestao.hexagono.grupo_st);
  const candidatos = mesmoGrupo.length > 0 ? mesmoGrupo : pontos;
  let melhor: PontoContexto | null = null;
  let melhorDist = Number.POSITIVE_INFINITY;
  for (const p of candidatos) {
    const dist = distanciaQuadratica(
      sugestao.hexagono.hex_centroid_lat,
      sugestao.hexagono.hex_centroid_lon,
      p.latitude_vl,
      p.longitude_vl
    );
    if (dist < melhorDist) {
      melhorDist = dist;
      melhor = p;
    }
  }
  return melhor;
}

export const SuggestionsModal: React.FC<SuggestionsModalProps> = ({
  analise,
  isOpen,
  onClose,
  pontosContexto = [],
  onSelectPoint
}) => {
  const [filtro, setFiltro] = React.useState<FiltroTipo>('todos');
  const [selecionada, setSelecionada] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setFiltro('todos');
      setSelecionada(0);
    }
  }, [isOpen]);

  if (!isOpen || !analise) return null;

  const sugestoesFiltradas = analise.planoOtimizado.sugestoes.filter(s => {
    if (filtro === 'todos') return true;
    return s.tipo === filtro;
  });

  const sugestaoAtiva =
    sugestoesFiltradas.length > 0 && selecionada != null
      ? sugestoesFiltradas[Math.min(selecionada, sugestoesFiltradas.length - 1)]
      : null;

  const pontoAtivo = sugestaoAtiva ? obterPontoReferencia(sugestaoAtiva, pontosContexto) : null;
  const nomePonto = pontoAtivo?.nome_st || pontoAtivo?.tipo_st || (pontoAtivo?.planoMidia_pk ? `Ponto #${pontoAtivo.planoMidia_pk}` : `Hexágono #${sugestaoAtiva?.hexagono.hexagon_pk ?? '-'}`);

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 p-4 sm:p-6" onClick={onClose}>
      <div
        className="mx-auto h-[90vh] max-w-6xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Sugestões de Otimização</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {analise.planoOtimizado.sugestoes.length} recomendações · {analise.planoOtimizado.ganhoPercentual >= 0 ? '+' : ''}{analise.planoOtimizado.ganhoPercentual.toFixed(1)}% impacto estimado
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs">
          <div className="rounded-lg border border-gray-200 p-2">
            <div className="text-gray-500">Pontos realocados</div>
            <div className="text-gray-900 font-semibold">{analise.planoOtimizado.pontosRealocados}</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-2">
            <div className="text-gray-500">Impacto incremental</div>
            <div className="text-gray-900 font-semibold">{analise.planoOtimizado.ganhoFluxoEstimado >= 0 ? '+' : ''}{formatCompact(analise.planoOtimizado.ganhoFluxoEstimado)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-2">
            <div className="text-gray-500">Variação investimento</div>
            <div className="text-gray-900 font-semibold">
              {analise.planoAtual.dadosFinanceirosDisponiveis ? (
                <>
                  {analise.planoOtimizado.variacaoInvestimento >= 0 ? '+' : '-'}
                  {formatCurrency(Math.abs(analise.planoOtimizado.variacaoInvestimento))}
                </>
              ) : 'N/A'}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-2">
            <div className="text-gray-500">Eficiência</div>
            <div className="text-gray-900 font-semibold">
              {analise.planoAtual.dadosFinanceirosDisponiveis
                ? `${analise.planoAtual.eficienciaFinanceiraAtual.toFixed(2)}→${analise.planoOtimizado.eficienciaFinanceiraOtimizada.toFixed(2)}`
                : `${analise.planoOtimizado.ganhoPercentual >= 0 ? '+' : ''}${analise.planoOtimizado.ganhoPercentual.toFixed(1)}%`}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
          {(['todos', 'adicionar', 'remover'] as FiltroTipo[]).map((op) => (
            <button
              key={op}
              onClick={() => { setFiltro(op); setSelecionada(0); }}
              className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                filtro === op
                  ? 'bg-[#ff4600] text-white border-[#ff4600]'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {op === 'todos' ? 'Todos' : op === 'adicionar' ? 'Adicionar' : 'Remover'}
            </button>
          ))}
          <div className="ml-auto text-[11px] text-gray-500">
            Orçamento sem aumento: {analise.planoOtimizado.restricoesAplicadas.semAumentoInvestimento ? 'sim' : 'não'} · Max/grupo: {analise.planoOtimizado.restricoesAplicadas.maxRealocacaoPorGrupo}
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-y-auto p-4 space-y-2 border-r border-gray-200">
            {sugestoesFiltradas.length === 0 ? (
              <div className="text-sm text-gray-500 p-4 border border-dashed border-gray-300 rounded-lg">
                Nenhuma sugestão para o filtro selecionado.
              </div>
            ) : (
              sugestoesFiltradas.map((sugestao, idx) => {
                const ponto = obterPontoReferencia(sugestao, pontosContexto);
                const nome = ponto?.nome_st || ponto?.tipo_st || (ponto?.planoMidia_pk ? `Ponto #${ponto.planoMidia_pk}` : `Hexágono #${sugestao.hexagono.hexagon_pk}`);
                const exibidor = getExibidor(ponto);
                const endereco = getEndereco(ponto);
                const impacto = sugestao.impactoFluxo;
                const isSelected = idx === selecionada;
                return (
                  <button
                    key={`${sugestao.tipo}-${sugestao.hexagono.hexagon_pk}-${idx}`}
                    onClick={() => setSelecionada(idx)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      isSelected ? 'border-[#ff4600] bg-orange-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                        sugestao.tipo === 'adicionar' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {sugestao.tipo === 'adicionar' ? 'Adicionar' : 'Remover'}
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        {impacto >= 0 ? '+' : '-'}{formatCompact(Math.abs(impacto))} impacto
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-gray-900">{nome}</div>
                    <div className="mt-1 text-xs text-gray-600">Exibidor: <span className="font-medium">{exibidor}</span></div>
                    <div className="mt-0.5 text-xs text-gray-500 line-clamp-1">{endereco}</div>
                    <div className="mt-1 text-[11px] text-gray-500 line-clamp-1">{sugestao.justificativa}</div>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-4 overflow-y-auto">
            {sugestaoAtiva ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Detalhe da recomendação</h3>
                <div className="rounded-xl border border-gray-200 p-3 space-y-2 text-xs">
                  <div>
                    <div className="text-gray-500">Nome do ponto</div>
                    <div className="text-gray-900 font-semibold">{nomePonto}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Exibidor</div>
                    <div className="text-gray-900">{getExibidor(pontoAtivo)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Impacto estimado</div>
                    <div className="text-gray-900 font-semibold">
                      {sugestaoAtiva.impactoFluxo >= 0 ? '+' : '-'}{formatCompact(Math.abs(sugestaoAtiva.impactoFluxo))}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Endereço</div>
                    <div className="text-gray-900">{getEndereco(pontoAtivo)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Tipo / Formato</div>
                    <div className="text-gray-900">{pontoAtivo?.tipo_st || 'Não informado'} · {pontoAtivo?.formato_st || 'N/D'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Coordenadas</div>
                    <div className="text-gray-900 font-mono">
                      {pontoAtivo
                        ? `${pontoAtivo.latitude_vl.toFixed(5)}, ${pontoAtivo.longitude_vl.toFixed(5)}`
                        : `${sugestaoAtiva.hexagono.hex_centroid_lat.toFixed(5)}, ${sugestaoAtiva.hexagono.hex_centroid_lon.toFixed(5)}`}
                    </div>
                  </div>
                </div>

                {pontoAtivo?.planoMidia_pk && onSelectPoint && (
                  <button
                    onClick={() => onSelectPoint(pontoAtivo.planoMidia_pk)}
                    className="w-full px-3 py-2 rounded-md bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 text-xs font-medium"
                  >
                    Ver no mapa
                  </button>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium"
                  >
                    Fechar
                  </button>
                  <button
                    className="flex-1 px-3 py-2 rounded-md bg-[#ff4600] text-white hover:bg-[#e23e00] text-xs font-semibold"
                  >
                    Aplicar sugestões
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4">
                Selecione uma recomendação para ver os detalhes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


