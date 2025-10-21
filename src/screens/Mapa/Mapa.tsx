import React from "react";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Topbar } from "../../components/Topbar/Topbar";
import { Pagination } from "../MeusRoteiros/sections/Pagination";
import { useSearchParams, useLocation } from "react-router-dom";
import api from "../../config/axios";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { useDebounce } from '../../hooks/useDebounce';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { MapLoadingOverlay } from '../../components/MapLoadingOverlay';

// Tipo para os dados dos hexágonos
interface Hexagono {
  hexagon_pk: number;
  hex_centroid_lat: number;
  hex_centroid_lon: number;
  calculatedFluxoEstimado_vl: number;
  fluxoEstimado_vl: number;
  rgbColorR_vl: number;
  rgbColorG_vl: number;
  rgbColorB_vl: number;
  hexColor_st: string;
  planoMidiaDesc_st: string;
  geometry_8: string; // Adicionado para armazenar o WKT do polígono
  grupoDesc_st: string;
  // Novos campos da API
  hexagon_8: string;
  planoMidia_pk: number;
  grupo_st: string;
  count_vl: number;
  groupCount_vl: number;
}

// Componente auxiliar para ajustar o centro e bounds do mapa
function AjustarMapa({ hexagonos }: { hexagonos: Hexagono[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (hexagonos.length > 0) {
      const bounds = L.latLngBounds(hexagonos.map(h => [h.hex_centroid_lat, h.hex_centroid_lon]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [hexagonos, map]);
  return null;
}

// Função para converter WKT para array de coordenadas [lat, lon]
function wktToLatLngs(wkt: string) {
  const matches = wkt.match(/\(\((.*)\)\)/);
  if (!matches) return [];
  return matches[1].split(',').map(pair => {
    const [lon, lat] = pair.trim().split(' ').map(Number);
    if (isNaN(lat) || isNaN(lon)) return undefined;
    return [lat, lon] as [number, number];
  }).filter((x): x is [number, number] => Array.isArray(x) && x.length === 2);
}



export const Mapa: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = React.useState(false);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const grupo = searchParams.get("grupo");
  const [cidades, setCidades] = React.useState<string[]>([]);
  const [cidadeSelecionada, setCidadeSelecionada] = React.useState("");
  const [nomeGrupo, setNomeGrupo] = React.useState("");
  const [semanas, setSemanas] = React.useState<{ semanaInicial_vl: number, semanaFinal_vl: number }[]>([]);
  const [semanaSelecionada, setSemanaSelecionada] = React.useState("");
  const [descPks, setDescPks] = React.useState<{ [cidade: string]: number }>({});
  const [hexagonos, setHexagonos] = React.useState<Hexagono[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingHexagonos, setLoadingHexagonos] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  
  // Loading states granulares
  const [loadingCidades, setLoadingCidades] = React.useState(false);
  const [loadingDescPks, setLoadingDescPks] = React.useState(false);
  const [loadingSemanas, setLoadingSemanas] = React.useState(false);
  
  // Estados debounced para performance
  const debouncedCidadeSelecionada = useDebounce(cidadeSelecionada, 300);
  const debouncedSemanaSelecionada = useDebounce(semanaSelecionada, 300);
  
  // Estados de cache para performance
  const [cacheCidades, setCacheCidades] = React.useState<{ [grupo: string]: string[] }>({});
  const [cacheDescPks, setCacheDescPks] = React.useState<{ [grupo: string]: { [cidade: string]: number } }>({});
  const [cacheSemanas, setCacheSemanas] = React.useState<{ [descPk: string]: { semanaInicial_vl: number, semanaFinal_vl: number }[] }>({});
  const [cacheHexagonos, setCacheHexagonos] = React.useState<{ [key: string]: Hexagono[] }>({});
  
  // Estados para feedback do usuário
  const [statusMessage, setStatusMessage] = React.useState<string>("");
  const [statusType, setStatusType] = React.useState<"info" | "success" | "warning" | "error">("info");
  const [isDebouncing, setIsDebouncing] = React.useState(false);
  const [lastSearchInfo, setLastSearchInfo] = React.useState<{
    cidade: string;
    semana: string;
    totalHexagonos: number;
    timestamp: Date;
  } | null>(null);

  // Funções auxiliares para feedback do usuário
  const showStatus = (message: string, type: "info" | "success" | "warning" | "error" = "info") => {
    setStatusMessage(message);
    setStatusType(type);
    // Auto-limpar mensagens de sucesso após 5 segundos
    if (type === "success") {
      setTimeout(() => setStatusMessage(""), 5000);
    }
  };

  const clearStatus = () => {
    setStatusMessage("");
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} segundos atrás`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutos atrás`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas atrás`;
    return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
  };

  // Funções auxiliares para popup melhorado
  const getHexagonRanking = (hex: Hexagono, allHexagons: Hexagono[]) => {
    const sortedHexagons = [...allHexagons].sort((a, b) => b.calculatedFluxoEstimado_vl - a.calculatedFluxoEstimado_vl);
    const rank = sortedHexagons.findIndex(h => h.hexagon_pk === hex.hexagon_pk) + 1;
    const total = allHexagons.length;
    const percentile = Math.round((rank / total) * 100);
    
    if (percentile <= 10) return { text: "Top 10%", color: "#10b981", emoji: "🥇" };
    if (percentile <= 25) return { text: "Top 25%", color: "#3b82f6", emoji: "🥈" };
    if (percentile <= 50) return { text: "Top 50%", color: "#f59e0b", emoji: "🥉" };
    return { text: "Abaixo da média", color: "#6b7280", emoji: "📊" };
  };

  const getFluxoVsMedia = (hex: Hexagono, allHexagons: Hexagono[]) => {
    const media = allHexagons.reduce((sum, h) => sum + h.calculatedFluxoEstimado_vl, 0) / allHexagons.length;
    const diff = ((hex.calculatedFluxoEstimado_vl - media) / media) * 100;
    
    if (diff > 20) return { text: `+${diff.toFixed(0)}%`, color: "#10b981", emoji: "📈" };
    if (diff > 0) return { text: `+${diff.toFixed(0)}%`, color: "#3b82f6", emoji: "📊" };
    if (diff > -20) return { text: `${diff.toFixed(0)}%`, color: "#f59e0b", emoji: "📉" };
    return { text: `${diff.toFixed(0)}%`, color: "#ef4444", emoji: "📉" };
  };

  const getAreaAproximada = (hex: Hexagono) => {
    // Estimativa baseada no tamanho padrão de hexágonos H3 nível 8
    // H3 nível 8 tem aproximadamente 0.74 km²
    return "~0.74 km²";
  };

  const getTipoRegiao = (hex: Hexagono) => {
    // Lógica simples baseada no fluxo para determinar tipo de região
    if (hex.calculatedFluxoEstimado_vl > 150000) return { text: "Centro comercial", emoji: "🏢" };
    if (hex.calculatedFluxoEstimado_vl > 100000) return { text: "Área comercial", emoji: "🏪" };
    if (hex.calculatedFluxoEstimado_vl > 50000) return { text: "Residencial", emoji: "🏠" };
    return { text: "Baixa densidade", emoji: "🌳" };
  };

  // Funções para métricas de eficiência
  const getEficiencia = (hex: Hexagono, allHexagons: Hexagono[]) => {
    const mediaFluxo = allHexagons.reduce((sum, h) => sum + h.calculatedFluxoEstimado_vl, 0) / allHexagons.length;
    const eficiencia = (hex.calculatedFluxoEstimado_vl / mediaFluxo) * 100;
    
    if (eficiencia > 150) return { text: "Muito Alta", color: "#10b981", emoji: "🚀" };
    if (eficiencia > 120) return { text: "Alta", color: "#3b82f6", emoji: "💰" };
    if (eficiencia > 80) return { text: "Média", color: "#f59e0b", emoji: "📊" };
    return { text: "Baixa", color: "#ef4444", emoji: "📉" };
  };

  const getCobertura = (hex: Hexagono) => {
    // Simulação baseada no fluxo - em um sistema real viria da API
    const cobertura = Math.min(95, Math.max(60, (hex.calculatedFluxoEstimado_vl / 200000) * 100));
    
    if (cobertura > 90) return { text: `${cobertura.toFixed(0)}%`, color: "#10b981", emoji: "👥" };
    if (cobertura > 75) return { text: `${cobertura.toFixed(0)}%`, color: "#3b82f6", emoji: "👥" };
    if (cobertura > 60) return { text: `${cobertura.toFixed(0)}%`, color: "#f59e0b", emoji: "👥" };
    return { text: `${cobertura.toFixed(0)}%`, color: "#ef4444", emoji: "👥" };
  };

  const getPontosDisponiveis = (hex: Hexagono) => {
    // Usar count_vl se disponível, senão simular baseado no fluxo
    const pontos = hex.count_vl || Math.floor(hex.calculatedFluxoEstimado_vl / 10000);
    
    if (pontos > 15) return { text: `${pontos} pontos`, color: "#10b981", emoji: "📍" };
    if (pontos > 8) return { text: `${pontos} pontos`, color: "#3b82f6", emoji: "📍" };
    if (pontos > 3) return { text: `${pontos} pontos`, color: "#f59e0b", emoji: "📍" };
    return { text: `${pontos} pontos`, color: "#ef4444", emoji: "📍" };
  };

  // useEffect para processar dados pré-selecionados vindos da tela de resultados
  React.useEffect(() => {
    if (location.state?.cidadePreSelecionada || location.state?.semanaPreSelecionada) {
      console.log('🗺️ [DEBUG] Dados pré-selecionados recebidos:', location.state);
      
      if (location.state.cidadePreSelecionada) {
        setCidadeSelecionada(location.state.cidadePreSelecionada);
        console.log('🗺️ [DEBUG] Cidade pré-selecionada:', location.state.cidadePreSelecionada);
      }
      
      if (location.state.semanaPreSelecionada) {
        setSemanaSelecionada(location.state.semanaPreSelecionada);
        console.log('🗺️ [DEBUG] Semana pré-selecionada:', location.state.semanaPreSelecionada);
      }
      
      // Se temos roteiroData, usar o grupo dele
      if (location.state.roteiroData?.planoMidiaGrupo_pk) {
        console.log('🗺️ [DEBUG] Usando grupo do roteiro:', location.state.roteiroData.planoMidiaGrupo_pk);
      }
    }
  }, [location.state]);

  // useEffect para detectar mudanças em tempo real e mostrar indicador de debounce
  React.useEffect(() => {
    const cidadeChanged = cidadeSelecionada !== debouncedCidadeSelecionada;
    const semanaChanged = semanaSelecionada !== debouncedSemanaSelecionada;
    
    // Só mostrar debounce se realmente há mudança E não está usando cache
    if ((cidadeChanged || semanaChanged) && !isDebouncing) {
      setIsDebouncing(true);
      showStatus("⏳ Aguardando...", "info");
    } else if (!cidadeChanged && !semanaChanged && isDebouncing) {
      // Resetar debounce quando valores estão sincronizados
      setIsDebouncing(false);
    }
  }, [cidadeSelecionada, debouncedCidadeSelecionada, semanaSelecionada, debouncedSemanaSelecionada, isDebouncing]);

  React.useEffect(() => {
    console.log("Mapa: grupo recebido:", grupo);
    
    if (grupo) {
      // Verificar cache primeiro
      if (cacheCidades[grupo]) {
        console.log("🗺️ [CACHE] Usando cidades do cache para grupo:", grupo);
        setCidades(cacheCidades[grupo]);
        setLoading(false);
        setLoadingCidades(false);
        setLoadingDescPks(false);
        setIsDebouncing(false); // Resetar debounce quando usa cache
        showStatus(`✅ Dados carregados do cache para grupo ${grupo}`, "success");
        return;
      }

      showStatus(`Carregando dados do grupo "${grupo}"...`, "info");
      setLoading(true);
      setLoadingCidades(true);
      setLoadingDescPks(true);
      setErro(null);
      clearStatus();
      
      console.log("🗺️ [PERF] Carregando dados em paralelo para grupo:", grupo);
      
      // Paralelizar chamadas independentes
      const promises = [
        api.get(`cidades?grupo=${grupo}`),
        cacheDescPks[grupo] ? Promise.resolve({ data: { descPks: cacheDescPks[grupo] } }) : api.get(`pivot-descpks?grupo=${grupo}`)
      ];
      
      Promise.all(promises)
        .then(([cidadesRes, descPksRes]) => {
          // Processar resposta de cidades
          console.log("🗺️ [CACHE] Salvando cidades no cache para grupo:", grupo);
          setCidades(cidadesRes.data.cidades);
          setCacheCidades(prev => ({ ...prev, [grupo]: cidadesRes.data.cidades }));
          setLoadingCidades(false);
          if (cidadesRes.data.nomeGrupo) setNomeGrupo(cidadesRes.data.nomeGrupo);
          
          // Processar resposta de descPks
          if (!cacheDescPks[grupo]) {
            console.log("🗺️ [CACHE] Salvando descPks no cache para grupo:", grupo);
            const descPksData = Object.fromEntries(Object.entries(descPksRes.data.descPks).map(([k, v]) => [k.trim().toUpperCase(), Number(v)]));
            setDescPks(descPksData);
            setCacheDescPks(prev => ({ ...prev, [grupo]: descPksData }));
          } else {
            console.log("🗺️ [CACHE] Usando descPks do cache para grupo:", grupo);
            setDescPks(cacheDescPks[grupo]);
          }
          setLoadingDescPks(false);
          
          if (cidadesRes.data.cidades && cidadesRes.data.cidades.length) {
            showStatus(`✅ ${cidadesRes.data.cidades.length} praça(s) encontrada(s) para o grupo "${cidadesRes.data.nomeGrupo || grupo}"`, "success");
          } else {
            showStatus(`❌ Nenhuma praça encontrada para o grupo "${cidadesRes.data.nomeGrupo || grupo}". Verifique se o grupo possui dados cadastrados.`, "error");
          }
        })
        .catch(err => {
          console.error("Mapa: erro na API cidades:", err);
          const errorMsg = err.response?.data?.error || 'Erro ao carregar cidades';
          setErro(errorMsg);
          setCidades([]);
          showStatus(`❌ Erro ao carregar dados: ${errorMsg}`, "error");
        })
        .finally(() => {
          setLoading(false);
          setLoadingCidades(false);
          setLoadingDescPks(false);
        });
    } else {
      showStatus("👋 Bem-vindo ao Mapa de Roteiros! Selecione um grupo para começar.", "info");
    }
  }, [grupo]);

  React.useEffect(() => {
    console.log("🗺️ [DEBOUNCE] cidadeSelecionada:", cidadeSelecionada, "debounced:", debouncedCidadeSelecionada);
    console.log("🗺️ [DEBOUNCE] descPks:", descPks);
    if (debouncedCidadeSelecionada && descPks[debouncedCidadeSelecionada]) {
      const descPk = descPks[debouncedCidadeSelecionada];
      
      // Verificar cache primeiro
      if (cacheSemanas[descPk]) {
        console.log("🗺️ [CACHE] Usando semanas do cache para descPk:", descPk);
        setSemanas(cacheSemanas[descPk]);
        setLoadingSemanas(false);
        setIsDebouncing(false); // Resetar debounce quando usa cache
        showStatus(`✅ Semanas carregadas do cache para ${debouncedCidadeSelecionada}`, "success");
        return;
      }

      showStatus(`📅 [DEBOUNCE] Carregando semanas disponíveis para ${debouncedCidadeSelecionada}...`, "info");
      setLoadingSemanas(true);
      console.log("🗺️ [CACHE] Carregando semanas para descPk:", descPk);
      api.get(`semanas?desc_pk=${descPk}`)
        .then(res => {
          console.log("🗺️ [CACHE] Salvando semanas no cache para descPk:", descPk);
          setSemanas(res.data.semanas);
          setCacheSemanas(prev => ({ ...prev, [descPk]: res.data.semanas }));
          if (res.data.semanas && res.data.semanas.length > 0) {
            showStatus(`✅ ${res.data.semanas.length} semana(s) encontrada(s) para ${cidadeSelecionada}`, "success");
          } else {
            showStatus(`⚠️ Nenhuma semana encontrada para ${cidadeSelecionada}. Esta praça pode não ter dados de planejamento.`, "warning");
          }
        })
        .catch(err => {
          console.error("Mapa: erro na API semanas:", err);
          setSemanas([]);
          showStatus(`❌ Erro ao carregar semanas para ${cidadeSelecionada}`, "error");
        })
        .finally(() => {
          setLoadingSemanas(false);
        });
    } else {
      setSemanas([]);
      if (cidadeSelecionada && !descPks[cidadeSelecionada]) {
        showStatus(`⚠️ Dados da praça ${cidadeSelecionada} não encontrados`, "warning");
      }
    }
  }, [debouncedCidadeSelecionada, descPks]);

  // useEffect otimizado para buscar hexágonos com debounce
  React.useEffect(() => {
    console.log("🗺️ [DEBOUNCE] cidadeSelecionada:", cidadeSelecionada, "debounced:", debouncedCidadeSelecionada);
    console.log("🗺️ [DEBOUNCE] semanaSelecionada:", semanaSelecionada, "debounced:", debouncedSemanaSelecionada);
    
    // Se não há cidade selecionada mas há grupo, limpar hexágonos
    if (!debouncedCidadeSelecionada && grupo) {
      console.log("🗺️ [DEBUG] Limpando hexágonos - nenhuma cidade selecionada");
      setHexagonos([]);
      return;
    }
    
    // Só busca se houver cidadeSelecionada e descPks[cidadeSelecionada]
    if (debouncedCidadeSelecionada && descPks[debouncedCidadeSelecionada]) {
      const descPk = descPks[debouncedCidadeSelecionada];
      const cacheKey = `${descPk}_${debouncedSemanaSelecionada || 'all'}`;
      
      // Verificar cache primeiro
      if (cacheHexagonos[cacheKey]) {
        console.log("🗺️ [CACHE] Usando hexágonos do cache para:", cacheKey);
        setHexagonos(cacheHexagonos[cacheKey]);
        setIsDebouncing(false); // Resetar debounce quando usa cache
        const semanaText = debouncedSemanaSelecionada ? `semana ${debouncedSemanaSelecionada}` : "todas as semanas";
        showStatus(`✅ Mapa carregado do cache para ${debouncedCidadeSelecionada} (${semanaText})`, "success");
        return;
      }

      const searchTerm = debouncedSemanaSelecionada ? `semana ${debouncedSemanaSelecionada}` : "todas as semanas";
      showStatus(`🗺️ [DEBOUNCE] Carregando mapa para ${debouncedCidadeSelecionada} (${searchTerm})...`, "info");
      setLoadingHexagonos(true);
      
      // Construir URL da API de forma otimizada
      const apiUrl = debouncedSemanaSelecionada 
        ? `hexagonos?desc_pk=${descPk}&semana=${debouncedSemanaSelecionada}`
        : `hexagonos?desc_pk=${descPk}`;
      
      console.log("🗺️ [PERF] Carregando hexágonos para:", cacheKey);
      api.get(apiUrl)
        .then(res => {
          const hexagonosData = res.data.hexagonos || [];
          console.log("🗺️ [CACHE] Salvando hexágonos no cache para:", cacheKey);
          setHexagonos(hexagonosData);
          setCacheHexagonos(prev => ({ ...prev, [cacheKey]: hexagonosData }));
          
          if (hexagonosData.length > 0) {
            const totalFluxo = hexagonosData.reduce((sum: number, hex: Hexagono) => sum + hex.calculatedFluxoEstimado_vl, 0);
            const fluxoMedio = totalFluxo / hexagonosData.length;
            
            const semanaText = debouncedSemanaSelecionada ? `semana ${debouncedSemanaSelecionada}` : "todas as semanas";
            showStatus(`✅ Mapa carregado: ${formatNumber(hexagonosData.length)} pontos para ${debouncedCidadeSelecionada} (${semanaText}) - Fluxo médio: ${formatNumber(fluxoMedio)}`, "success");
            
            // Salvar informações da última busca
            setLastSearchInfo({
              cidade: debouncedCidadeSelecionada,
              semana: debouncedSemanaSelecionada,
              totalHexagonos: hexagonosData.length,
              timestamp: new Date()
            });
          } else {
            const semanaText = debouncedSemanaSelecionada ? `semana ${debouncedSemanaSelecionada}` : "todas as semanas";
            showStatus(`⚠️ Nenhum ponto encontrado para ${debouncedCidadeSelecionada} (${semanaText}). Esta combinação pode não ter dados de planejamento.`, "warning");
          }
        })
        .catch(err => {
          console.error("Erro ao carregar hexágonos:", err);
          setHexagonos([]);
          const semanaText = debouncedSemanaSelecionada ? `semana ${debouncedSemanaSelecionada}` : "todas as semanas";
          showStatus(`❌ Erro ao carregar mapa para ${debouncedCidadeSelecionada} (${semanaText})`, "error");
        })
        .finally(() => {
          setLoadingHexagonos(false);
        });
    }
  }, [debouncedCidadeSelecionada, debouncedSemanaSelecionada, descPks]);

  // Calcular o range de fluxo para normalizar o tamanho dos pontos
  const minFluxo = hexagonos.length > 0 ? Math.min(...hexagonos.map(h => h.calculatedFluxoEstimado_vl)) : 0;
  const maxFluxo = hexagonos.length > 0 ? Math.max(...hexagonos.map(h => h.calculatedFluxoEstimado_vl)) : 1;
  
  function getRadius(fluxo: number) {
    // Raio mínimo 6, máximo 20
    if (maxFluxo === minFluxo) return 10;
    return 6 + 14 * ((fluxo - minFluxo) / (maxFluxo - minFluxo));
  }

  // Componente de Status para feedback do usuário
  const StatusMessage = () => {
    if (!statusMessage) return null;
    
    const bgColor = {
      info: "bg-blue-50 border-blue-200 text-blue-800",
      success: "bg-green-50 border-green-200 text-green-800",
      warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
      error: "bg-red-50 border-red-200 text-red-800"
    }[statusType];
    
    const icon = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌"
    }[statusType];
    
    return (
      <div className={`mb-4 p-3 border rounded-lg flex items-start gap-2 ${bgColor}`}>
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <p className="text-sm font-medium">{statusMessage}</p>
          {statusType === "info" && (
            <button 
              onClick={clearStatus}
              className="text-xs underline mt-1 hover:no-underline"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    );
  };

  // Componente do Mapa simples (usando um mapa básico)
  const MapaVisualizacao = () => {
    if (!hexagonos.length) {
      return (
        <div className="w-full h-full bg-white flex items-center justify-center rounded border">
          <div className="text-center p-8">
            {semanaSelecionada && !loadingHexagonos ? (
              <div className="flex flex-col items-center gap-3">
                <div className="text-6xl">🗺️</div>
                <h3 className="text-lg font-semibold text-gray-700">Nenhum ponto encontrado</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Não foram encontrados pontos para <strong>{cidadeSelecionada}</strong> na <strong>semana {semanaSelecionada}</strong>.
                </p>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Possíveis motivos:</strong><br/>
                    • Esta combinação de praça e semana não possui dados de planejamento<br/>
                    • Os dados podem estar em processamento<br/>
                    • Tente selecionar outra semana ou praça
                  </p>
                </div>
              </div>
            ) : cidadeSelecionada ? (
              <div className="flex flex-col items-center gap-3">
                <div className="text-6xl">🏙️</div>
                <h3 className="text-lg font-semibold text-gray-700">Nenhum ponto encontrado</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Não foram encontrados pontos para <strong>{cidadeSelecionada}</strong>.
                </p>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Possíveis motivos:</strong><br/>
                    • Esta praça não possui dados de planejamento cadastrados<br/>
                    • Os dados podem estar em processamento<br/>
                    • Tente selecionar outra praça
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="text-6xl">📍</div>
                <h3 className="text-lg font-semibold text-gray-700">Selecione uma praça</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Para visualizar o mapa, selecione uma praça e opcionalmente uma semana específica.
                </p>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Como usar:</strong><br/>
                    1. Selecione uma praça no filtro à esquerda<br/>
                    2. Opcionalmente, escolha uma semana específica<br/>
                    3. O mapa será carregado automaticamente
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Calcular limites do mapa
    const lats = hexagonos.map(h => h.hex_centroid_lat);
    const lons = hexagonos.map(h => h.hex_centroid_lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    return (
      <div className="w-full h-full bg-white rounded border relative overflow-hidden">
        <div className="absolute top-2 left-2 bg-white p-2 rounded shadow z-10">
          <h3 className="text-sm font-bold text-gray-700">Hexágonos Plotados</h3>
          <p className="text-xs text-gray-600">{hexagonos.length} pontos</p>
          <p className="text-xs text-gray-600">Área: {minLat.toFixed(4)}, {minLon.toFixed(4)} → {maxLat.toFixed(4)}, {maxLon.toFixed(4)}</p>
        </div>
        
        {/* Área do mapa com pontos plotados */}
        <div className="w-full h-full relative bg-gradient-to-br from-blue-50 to-green-50">
          {hexagonos.map((hex, index) => {
            // Normalizar coordenadas para o container
            const x = ((hex.hex_centroid_lon - minLon) / (maxLon - minLon)) * 100;
            const y = ((maxLat - hex.hex_centroid_lat) / (maxLat - minLat)) * 100;
            
            return (
              <div
                key={hex.hexagon_pk}
                className="absolute w-2 h-2 rounded-full transform -translate-x-1 -translate-y-1"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  backgroundColor: hex.hexColor_st || `rgb(${hex.rgbColorR_vl}, ${hex.rgbColorG_vl}, ${hex.rgbColorB_vl})`,
                }}
                title={`Hex ${hex.hexagon_pk}: Fluxo ${hex.calculatedFluxoEstimado_vl} | Lat: ${hex.hex_centroid_lat}, Lon: ${hex.hex_centroid_lon}`}
              />
            );
          })}
        </div>
        
        {/* Legenda */}
        <div className="absolute bottom-2 right-2 bg-white p-2 rounded shadow">
          <h4 className="text-xs font-bold text-gray-700 mb-1">Legenda</h4>
          <div className="text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Alto fluxo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Médio fluxo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Baixo fluxo</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Adicionar overlay/modal quando não houver seleção de praça
  const showOverlay = !cidadeSelecionada;

  return (
    <div className="min-h-screen bg-white flex font-sans">
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
      <div className={`fixed top-0 z-20 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? "left-20" : "left-64"}`} />
      <div className={`flex-1 transition-all duration-300 min-h-screen w-full ${menuReduzido ? "ml-20" : "ml-64"} flex flex-col`}>
        <Topbar 
          menuReduzido={menuReduzido} 
          breadcrumb={{
            items: [
              { label: "Home", path: "/" },
              { label: "Meus roteiros", path: "/" },
              { 
                label: nomeGrupo 
                  ? cidadeSelecionada 
                    ? `Mapa - ${nomeGrupo} > ${cidadeSelecionada}${semanaSelecionada ? ` (Semana ${semanaSelecionada})` : ''}`
                    : `Mapa - ${nomeGrupo}`
                  : "Mapa" 
              }
            ]
          }}
        />
        <div className={`fixed top-[72px] z-30 h-[1px] bg-[#c1c1c1] ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`} />
        <div className="w-full overflow-x-auto pt-20 flex-1 overflow-auto">
          <h1 className="text-lg font-bold text-[#222] tracking-wide mb-4 uppercase font-sans mt-4 pl-6">
            Meus roteiros
          </h1>
          <div className="w-full flex flex-row gap-8 mt-8 px-8 flex-1 min-h-[500px]" style={{height: 'calc(100vh - 220px)'}}>
            {/* Coluna dos filtros */}
            <div className="flex flex-col flex-1 max-w-[420px] justify-start">
              <table className="w-full border-separate border-spacing-0 font-sans mb-6">
                <thead>
                  <tr className="bg-[#393939] h-10">
                    <th className="text-white text-xs font-bold uppercase text-left px-6 py-2 tracking-wider font-sans">Nome</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-[#222] text-sm font-bold px-6 py-4 whitespace-nowrap font-sans border-b border-[#c1c1c1]">
                      {nomeGrupo || <span className="italic text-[#b0b0b0]">Carregando...</span>} <span className="ml-2">→</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mb-6 text-[#222] text-base">Selecione a praça e a semana do roteiro para visualizar o mapa em html.</p>
              
              {/* Componente de Status */}
              <StatusMessage />
              
              {erro && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
                  Erro: {erro}
                </div>
              )}
              
              {/* Remover ou desabilitar selects de cidade e semana temporariamente */}
              <div className="mb-4">
                <label className="block text-[#222] mb-2 font-semibold">
                  Praça {loading && <span className="text-blue-500">(Carregando...)</span>}
                </label>
                <select
                  className="w-full border border-[#c1c1c1] rounded px-4 py-2 text-[#b0b0b0] bg-[#f7f7f7] text-base"
                  value={cidadeSelecionada}
                  onChange={e => setCidadeSelecionada(e.target.value)}
                  disabled={!cidades.length || loading}
                >
                  <option value="">{loading ? "Carregando..." : "Ex.: São Paulo"}</option>
                  {cidades.map((cidade) => (
                    <option key={cidade} value={cidade}>{cidade}</option>
                  ))}
                </select>
                {cidades.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">{cidades.length} cidade(s) carregada(s)</p>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-[#222] mb-2 font-semibold">Semana</label>
                <select
                  className="w-full border border-[#c1c1c1] rounded px-4 py-2 text-[#b0b0b0] bg-[#f7f7f7] text-base"
                  value={semanaSelecionada}
                  onChange={e => setSemanaSelecionada(e.target.value)}
                  disabled={!semanas.length}
                >
                  <option value="">Ex.: Semana 1 - 1</option>
                  {semanas.map((semana, idx) => (
                    <option key={idx} value={semana.semanaInicial_vl}>{`Semana ${semana.semanaInicial_vl} - ${semana.semanaFinal_vl}`}</option>
                  ))}
                </select>
              </div>
              
              {/* Informações dos hexágonos */}
              {hexagonos.length > 0 && (
                (() => {
                  const totalFluxo = hexagonos.reduce((sum, hex) => sum + hex.calculatedFluxoEstimado_vl, 0);
                  const fluxoMedio = totalFluxo / hexagonos.length;
                  const maxHex = hexagonos.reduce((a, b) => (a.calculatedFluxoEstimado_vl > b.calculatedFluxoEstimado_vl ? a : b));
                  const minHex = hexagonos.reduce((a, b) => (a.calculatedFluxoEstimado_vl < b.calculatedFluxoEstimado_vl ? a : b));
                  const grupos = Array.from(new Set(hexagonos.map(h => h.grupoDesc_st))).filter(Boolean);
                  const areaCoberta = hexagonos.length * 0.36; // Aproximação: cada hexágono ~0.36 km²
                  
                  return (
                    <div className="mb-4 p-4 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">📊</span>
                        <h4 className="text-sm font-bold text-green-700">Resumo dos Dados</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2 rounded border">
                          <div className="font-semibold text-gray-700">Pontos no mapa</div>
                          <div className="text-green-600 font-bold">{formatNumber(hexagonos.length)}</div>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <div className="font-semibold text-gray-700">Área coberta</div>
                          <div className="text-blue-600 font-bold">~{formatNumber(areaCoberta)} km²</div>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <div className="font-semibold text-gray-700">Fluxo total</div>
                          <div className="text-purple-600 font-bold">{formatNumber(totalFluxo)}</div>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <div className="font-semibold text-gray-700">Fluxo médio</div>
                          <div className="text-orange-600 font-bold">{formatNumber(fluxoMedio)}</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 p-2 bg-white rounded border">
                        <div className="text-xs text-gray-600 mb-1">
                          <strong>Extremos:</strong> {formatNumber(minHex.calculatedFluxoEstimado_vl)} (mín) → {formatNumber(maxHex.calculatedFluxoEstimado_vl)} (máx)
                        </div>
                        <div className="text-xs text-gray-600">
                          <strong>Grupos:</strong> {grupos.length > 0 ? grupos.join(', ') : 'Nenhum grupo definido'}
                        </div>
                      </div>
                      
                      {lastSearchInfo && (
                        <div className="mt-2 text-xs text-gray-500 italic">
                          Última atualização: {getTimeAgo(lastSearchInfo.timestamp)}
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
              
              {/* Seção de Dicas e Ajuda */}
              <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💡</span>
                  <h4 className="text-sm font-bold text-blue-700">Dicas de Uso</h4>
                </div>
                
                <div className="space-y-2 text-xs text-blue-800">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Clique nos pontos do mapa para ver detalhes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Use o zoom para explorar áreas específicas</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Selecione uma semana para filtrar dados específicos</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>As cores indicam diferentes grupos de planejamento</span>
                  </div>
                </div>
                
                {hexagonos.length === 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800">
                      <strong>Não encontrou dados?</strong><br/>
                      • Verifique se a praça possui planejamento cadastrado<br/>
                      • Tente selecionar outra semana<br/>
                      • Entre em contato com o suporte se o problema persistir
                    </p>
                  </div>
                )}
              </div>
            </div>
            {/* Coluna do mapa */}
            <div className="flex-1 h-full w-full" style={{ minHeight: 320, background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e5e5', marginBottom: 48, position: 'relative' }}>
              {/* Overlay/modal para seleção de praça e semana */}
              {showOverlay && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'rgba(255,255,255,0.95)',
                  zIndex: 2000,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20
                }}>
                  <div style={{ textAlign: 'center', maxWidth: 400 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
                    <h3 style={{ fontSize: 24, fontWeight: 600, color: '#222', marginBottom: 12 }}>
                      Mapa de Roteiros
                    </h3>
                    <p style={{ fontSize: 16, color: '#666', marginBottom: 20, lineHeight: 1.5 }}>
                      Para visualizar o mapa, selecione uma praça no painel à esquerda e opcionalmente uma semana específica.
                    </p>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      color: 'white', 
                      padding: '12px 24px', 
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500
                    }}>
                      💡 Dica: Comece selecionando uma praça para ver os dados disponíveis
                    </div>
                  </div>
                </div>
              )}
              <MapContainer
                center={hexagonos.length > 0 ? [hexagonos[0].hex_centroid_lat, hexagonos[0].hex_centroid_lon] : [-15.7801, -47.9292]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <AjustarMapa hexagonos={hexagonos} />
                
                {/* Loading Overlay estilo Apple */}
                {loadingHexagonos && (
                  <MapLoadingOverlay message="Carregando pontos do mapa..." />
                )}
                {hexagonos.map((hex, idx) => (
                  <Polygon
                    key={"poly-" + idx}
                    positions={wktToLatLngs(hex.geometry_8)}
                    pathOptions={{
                      color: hex.hexColor_st || `rgb(${hex.rgbColorR_vl},${hex.rgbColorG_vl},${hex.rgbColorB_vl})`,
                      fillOpacity: 0.6,
                      weight: 2,
                      opacity: 0.8
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 280, maxWidth: 320 }}>
                        {/* Header com ranking */}
                        <div style={{ 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                          color: 'white', 
                          padding: '12px 16px', 
                          borderRadius: '8px 8px 0 0',
                          margin: '-10px -10px 0 -10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                                🎯 Área Estratégica
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.9 }}>
                                Hexágono #{hex.hexagon_pk}
                              </div>
                            </div>
                            <div style={{ 
                              background: 'rgba(255,255,255,0.2)', 
                              padding: '4px 8px', 
                              borderRadius: '12px',
                              fontSize: 11,
                              fontWeight: 600
                            }}>
                              {(() => {
                                const ranking = getHexagonRanking(hex, hexagonos);
                                return `${ranking.emoji} ${ranking.text}`;
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Conteúdo principal */}
                        <div style={{ padding: '16px', background: '#f8fafc' }}>
                          {/* Métricas principais */}
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              marginBottom: 8
                            }}>
                              <div>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>📊 Fluxo</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                                  {formatNumber(hex.calculatedFluxoEstimado_vl)}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>📈 vs Média</div>
                                <div style={{ 
                                  fontSize: 14, 
                                  fontWeight: 600,
                                  color: (() => {
                                    const vsMedia = getFluxoVsMedia(hex, hexagonos);
                                    return vsMedia.color;
                                  })()
                                }}>
                                  {(() => {
                                    const vsMedia = getFluxoVsMedia(hex, hexagonos);
                                    return `${vsMedia.emoji} ${vsMedia.text}`;
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Informações contextuais */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr', 
                            gap: 12,
                            marginBottom: 16
                          }}>
                            <div style={{ 
                              background: 'white', 
                              padding: 12, 
                              borderRadius: 8, 
                              border: '1px solid #e2e8f0',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: 20, marginBottom: 4 }}>
                                {(() => {
                                  const tipoRegiao = getTipoRegiao(hex);
                                  return tipoRegiao.emoji;
                                })()}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                                {(() => {
                                  const tipoRegiao = getTipoRegiao(hex);
                                  return tipoRegiao.text;
                                })()}
                              </div>
                            </div>
                            
                            <div style={{ 
                              background: 'white', 
                              padding: 12, 
                              borderRadius: 8, 
                              border: '1px solid #e2e8f0',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: 20, marginBottom: 4 }}>📏</div>
                              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                                {getAreaAproximada(hex)}
                              </div>
                            </div>
                          </div>

                          {/* Métricas de eficiência */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr 1fr', 
                            gap: 8,
                            marginBottom: 16
                          }}>
                            <div style={{ 
                              background: 'white', 
                              padding: 10, 
                              borderRadius: 8, 
                              border: '1px solid #e2e8f0',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: 16, marginBottom: 4 }}>
                                {(() => {
                                  const eficiencia = getEficiencia(hex, hexagonos);
                                  return eficiencia.emoji;
                                })()}
                              </div>
                              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>
                                Eficiência
                              </div>
                              <div style={{ 
                                fontSize: 11, 
                                fontWeight: 700,
                                color: (() => {
                                  const eficiencia = getEficiencia(hex, hexagonos);
                                  return eficiencia.color;
                                })()
                              }}>
                                {(() => {
                                  const eficiencia = getEficiencia(hex, hexagonos);
                                  return eficiencia.text;
                                })()}
                              </div>
                            </div>
                            
                            <div style={{ 
                              background: 'white', 
                              padding: 10, 
                              borderRadius: 8, 
                              border: '1px solid #e2e8f0',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: 16, marginBottom: 4 }}>
                                {(() => {
                                  const cobertura = getCobertura(hex);
                                  return cobertura.emoji;
                                })()}
                              </div>
                              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>
                                Cobertura
                              </div>
                              <div style={{ 
                                fontSize: 11, 
                                fontWeight: 700,
                                color: (() => {
                                  const cobertura = getCobertura(hex);
                                  return cobertura.color;
                                })()
                              }}>
                                {(() => {
                                  const cobertura = getCobertura(hex);
                                  return cobertura.text;
                                })()}
                              </div>
                            </div>
                            
                            <div style={{ 
                              background: 'white', 
                              padding: 10, 
                              borderRadius: 8, 
                              border: '1px solid #e2e8f0',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: 16, marginBottom: 4 }}>
                                {(() => {
                                  const pontos = getPontosDisponiveis(hex);
                                  return pontos.emoji;
                                })()}
                              </div>
                              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>
                                Pontos
                              </div>
                              <div style={{ 
                                fontSize: 11, 
                                fontWeight: 700,
                                color: (() => {
                                  const pontos = getPontosDisponiveis(hex);
                                  return pontos.color;
                                })()
                              }}>
                                {(() => {
                                  const pontos = getPontosDisponiveis(hex);
                                  return pontos.text;
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Dados de planejamento */}
                          <div style={{ 
                            background: 'white', 
                            padding: 12, 
                            borderRadius: 8, 
                            border: '1px solid #e2e8f0',
                            marginBottom: 12
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                              📋 Dados de Planejamento
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>
                              <div style={{ marginBottom: 4 }}>
                                <strong>Grupo:</strong> {hex.grupoDesc_st || 'Não definido'}
                              </div>
                              <div style={{ marginBottom: 4 }}>
                                <strong>Plano:</strong> {hex.planoMidiaDesc_st || 'Não definido'}
                              </div>
                              {hex.count_vl && (
                                <div style={{ marginBottom: 4 }}>
                                  <strong>Pontos:</strong> {formatNumber(hex.count_vl)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Coordenadas (colapsadas) */}
                          <details style={{ fontSize: 10, color: '#9ca3af' }}>
                            <summary style={{ cursor: 'pointer', marginBottom: 4 }}>
                              📍 Coordenadas (clique para expandir)
                            </summary>
                            <div style={{ marginTop: 4, padding: 8, background: '#f1f5f9', borderRadius: 4 }}>
                              <div><strong>Lat:</strong> {hex.hex_centroid_lat.toFixed(6)}</div>
                              <div><strong>Lon:</strong> {hex.hex_centroid_lon.toFixed(6)}</div>
                            </div>
                          </details>
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                ))}
                
                {/* CircleMarkers para mostrar tamanhos diferentes baseados no fluxo - SEM POPUP */}
                {hexagonos.map((hex, idx) => (
                  <CircleMarker
                    key={`circle-${hex.hexagon_pk}`}
                    center={[hex.hex_centroid_lat, hex.hex_centroid_lon]}
                    pathOptions={{ 
                      color: hex.hexColor_st || `rgb(${hex.rgbColorR_vl},${hex.rgbColorG_vl},${hex.rgbColorB_vl})`, 
                      fillOpacity: 0.7,
                      weight: 1,
                      opacity: 0.8
                    }}
                    radius={getRadius(hex.calculatedFluxoEstimado_vl)}
                    interactive={false} // Não clicável - apenas visual
                  />
                ))}
              </MapContainer>
            </div>
            {/* Legendas agrupadas no canto inferior direito */}
            {hexagonos.length > 0 && (
              <div style={{ position: 'absolute', bottom: 96, right: 64, display: 'flex', gap: 24, flexWrap: 'wrap', zIndex: 1000 }}>
                {/* Legenda do tamanho */}
                <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 140 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#222', marginBottom: 6 }}>📏 Tamanho dos Pontos</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <svg width={24} height={24} style={{ display: 'block' }}>
                      <circle cx={12} cy={12} r={6} fill="#a78bfa" stroke="#6d28d9" strokeWidth={2} />
                    </svg>
                    <span style={{ fontSize: 11, color: '#444' }}>Menor fluxo<br/><strong>{formatNumber(minFluxo)}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width={40} height={40} style={{ display: 'block' }}>
                      <circle cx={20} cy={20} r={20} fill="#a78bfa" stroke="#6d28d9" strokeWidth={2} />
                    </svg>
                    <span style={{ fontSize: 11, color: '#444' }}>Maior fluxo<br/><strong>{formatNumber(maxFluxo)}</strong></span>
                  </div>
                </div>
                
                {/* Legenda de grupos */}
                <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 140 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#222', marginBottom: 6 }}>🎨 Grupos de Planejamento</div>
                  {Array.from(new Map(hexagonos.map(h => [h.grupoDesc_st, h]))).map(([grupo, hex]) => (
                    <div key={grupo} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: '50%', background: hex.hexColor_st || `rgb(${hex.rgbColorR_vl},${hex.rgbColorG_vl},${hex.rgbColorB_vl})`, border: '2px solid #888' }}></span>
                      <span style={{ fontSize: 11, color: '#444' }}>{grupo || 'Sem grupo'}</span>
                    </div>
                  ))}
                </div>
                
                {/* Informações rápidas */}
                <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 140 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#222', marginBottom: 6 }}>ℹ️ Informações</div>
                  <div style={{ fontSize: 11, color: '#444', lineHeight: 1.4 }}>
                    <div><strong>Total:</strong> {formatNumber(hexagonos.length)} pontos</div>
                    <div><strong>Área:</strong> ~{formatNumber(hexagonos.length * 0.36)} km²</div>
                    <div><strong>Última atualização:</strong></div>
                    <div style={{ fontSize: 10, color: '#666' }}>
                      {lastSearchInfo ? getTimeAgo(lastSearchInfo.timestamp) : 'Agora'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className={`fixed bottom-0 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${menuReduzido ? 'left-20 w-[calc(100%-5rem)]' : 'left-64 w-[calc(100%-16rem)]'}`}>
          <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
          <div className="w-full bg-white py-4 border-t border-[#e5e5e5] flex justify-center pointer-events-auto">
            {/* Remover qualquer renderização do componente Pagination e divs relacionadas */}
          </div>
          <footer className="w-full border-t border-[#c1c1c1] p-4 text-center text-[10px] italic text-[#b0b0b0] tracking-wide bg-white z-10 font-sans pointer-events-auto relative">
            <div className="absolute left-0 top-0 h-full w-px bg-[#c1c1c1]" />
            <div className="w-full h-[1px] bg-[#c1c1c1] absolute top-0 left-0" />
            © 2025 Colmeia. All rights are reserved to Be Mediatech OOH.
          </footer>
        </div>
      </div>
    </div>
  );
}; 